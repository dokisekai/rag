import re
import html
import base64
import requests
import logging

logger = logging.getLogger(__name__)
from typing import List, Dict, Any, Tuple

requests.packages.urllib3.disable_warnings()

class SearchService:
    def __init__(self):
        self.user_agent = (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        self.dict_domains = [
            'baike.baidu.com',
            'hanyuguoxue.com',
            'zdic.net',
            'dict.baidu.com',
            'cidian.org',
            'chidian.com',
            'biquge.com'
        ]
        # 通用品牌门户/下载入口/软件主页域名（当用户查询具体技术细分主题时过滤，避免把 Java/Redis 首页/安装指南当做技术原理解答）
        self.generic_domains = [
            'oracle.com',
            'java.com',
            'bell-sw.com',
            'downloads',
            'redis.io',
            'redis.com',
            'runoob.com/redis',
            'redis.net.cn',
            'spring.io'
        ]
        # 基础环境安装教程排除词（除非用户主动询问安装/部署）
        self.install_keywords = [
            '安装教程',
            '安装和部署',
            '安装与优化',
            '环境配置',
            '下载教程',
            '入门篇'
        ]
        # 动态可配置搜索参数
        self.search_engine = "auto"          # 'auto' (双引擎自动降级), 'bing' (仅Bing), 'baidu' (仅百度)
        self.search_top_k = 5                # 3 ~ 10 条
        self.search_retry_enabled = True    # 候选技术词二次轮询
        self.search_filter_portals = True   # 品牌门面与安装包强过滤
        self.search_llm_extraction = True   # 大模型提炼关键词开关

    def set_config(
        self,
        search_engine: str = "auto",
        search_top_k: int = 5,
        search_retry_enabled: bool = True,
        search_filter_portals: bool = True,
        search_llm_extraction: bool = True
    ):
        """动态更新搜索引擎与容错过滤配置"""
        if search_engine in ["auto", "bing", "baidu"]:
            self.search_engine = search_engine
        if search_top_k is not None:
            self.search_top_k = int(search_top_k)
        self.search_retry_enabled = search_retry_enabled
        self.search_filter_portals = search_filter_portals
        self.search_llm_extraction = search_llm_extraction

    def extract_keywords(self, query: str, llm_service: Any = None) -> str:
        """提炼口语化提问中的核心搜索关键词。
        优先通过大模型 LLM 进行智能语义提炼重写；若大模型未连接、提取失败或配置关闭，则平滑降级至规则提取模式。
        """
        if not query or not query.strip():
            return ""

        clean_q = query.strip()

        # 1. 如果大模型提炼开关被用户在设置中关闭，直接使用规则提炼
        if not self.search_llm_extraction:
            return self.clean_query(clean_q)

        # 2. 尝试使用 LLM 进行智能搜索关键词重写
        if llm_service is not None and hasattr(llm_service, "chat_completion"):
            try:
                messages = [
                    {
                        "role": "system",
                        "content": (
                            "你是一个搜索引擎精准关键词重写专家。你的任务是将用户的自然语言提问转换为 1~3 个在全网技术搜索引擎中检索精准技术原理与源码文章的搜索词，用空格分隔。\n"
                            "重写要求：\n"
                            "1. 剔除'写一个'、'请问'、'如何'、'代码示例'、'怎么做'、'帮我'、'是什么'等口语与套话。\n"
                            "2. 突出核心技术类名、具体机制或数据结构（例如：如果提问 Java 线程池，转换为 'ThreadPoolExecutor 线程池 底层原理' ；提问 Java Redis 缓存，转换为 'Redis 缓存 Java 实现 方案'；提问 Python 异步，转换为 'Python asyncio 异步并发 原理'）。\n"
                            "3. 严禁输出任何解释或多余标点，仅输出重写后的关键词。"
                        )
                    },
                    {"role": "user", "content": clean_q}
                ]
                llm_result = llm_service.chat_completion(messages, temperature=1.0)
                if (
                    llm_result
                    and not llm_result.startswith("【无法连接")
                    and not llm_result.startswith("【API 请求异常")
                ):
                    extracted = re.sub(r'[\r\n"\'`“”‘’：:,.!?，。！？]', ' ', llm_result).strip()
                    extracted = re.sub(r'\s+', ' ', extracted).strip()
                    if extracted and len(extracted) >= 2 and len(extracted) < len(clean_q) + 20:
                        print(f"🔍 [LLM 智能提炼搜索关键词]: '{clean_q}' -> '{extracted}'")
                        return extracted
            except Exception as e:
                logger.warning("LLM keyword extraction failed, falling back to rule-based: %s", e)

        # 3. 降级规则提炼
        return self.clean_query(clean_q)

    def clean_query(self, query: str) -> str:
        """规则兜底：提炼口语化提问中的核心搜索关键词"""
        if not query:
            return ""
        s = query.strip()

        stop_prefixes = [
            '请帮我查一下', '帮我查一下', '请帮我搜索', '帮我搜索', '请帮我搜一下', '帮我搜一下',
            '写一个', '请写出', '请写', '写出', '写一段', '生成一个', '实现一个',
            '请问', '请帮我', '帮我', '我想知道', '如何', '怎么', '能不能',
            '麻烦', '给我', '求一个', '查一下', '搜索一下', '搜一下', '写'
        ]
        stop_suffixes = [
            '的代码示例', '的代码', '代码示例', '代码', '示例', '例子',
            '教程', '怎么写', '如何实现', '写法', '的原理', '有哪些',
            '是怎样的', '是什么', '的方法'
        ]

        changed = True
        while changed:
            changed = False
            for p in stop_prefixes:
                if s.startswith(p):
                    s = s[len(p):].strip()
                    changed = True
                    break

        changed = True
        while changed:
            changed = False
            for sf in stop_suffixes:
                if s.endswith(sf):
                    s = s[:-len(sf)].strip()
                    changed = True
                    break

        s = re.sub(r'[？\?！\!，,。；;“”"\'`]', ' ', s)
        s = re.sub(r'\s+', ' ', s).strip()
        return s if len(s) >= 2 else query

    def decode_bing_url(self, raw_url: str) -> str:
        """解析 Bing 重定向加密 URL 得到真实全网目标链接"""
        if "bing.com/ck/a" in raw_url:
            u_match = re.search(r'u=a1([a-zA-Z0-9_-]+)', raw_url)
            if u_match:
                b64_str = u_match.group(1)
                b64_str += '=' * (-len(b64_str) % 4)
                try:
                    decoded = base64.b64decode(b64_str.replace('-', '+').replace('_', '/')).decode('utf-8', errors='ignore')
                    if decoded.startswith('http'):
                        return decoded
                except Exception as e:
                    logger.debug('Decode fallback skipped: %s', e)
        return raw_url

    def _filter_and_extract_results(self, raw_query: str, blocks: List[str], top_k: int = 5) -> List[Dict[str, Any]]:
        """对搜索结果块进行严密的主题相关性过滤与品牌广告排除"""
        core_topics = [
            kw for kw in ["线程池", "ThreadPoolExecutor", "redis", "缓存", "asyncio", "JVM", "Spring Boot", "Kafka", "MySQL", "并发", "垃圾回收", "AQS"]
            if kw.lower() in raw_query.lower()
        ]

        results = []
        for b in blocks:
            if len(results) >= top_k:
                break
            title_m = re.search(r'<h2[^>]*><a[^>]+href="([^"]+)"[^>]*>(.*?)</a></h2>', b, re.DOTALL)
            snip_m = re.search(r'<p[^>]*>(.*?)</p>', b, re.DOTALL) or re.search(r'<div class="b_caption"[^>]*>(.*?)</div>', b, re.DOTALL)
            if not title_m:
                continue

            raw_url = title_m.group(1)
            real_url = self.decode_bing_url(raw_url)

            domain_match = re.search(r'https?://([^/]+)', real_url)
            domain = domain_match.group(1) if domain_match else "web"

            # 过滤字词典/汉语拼音/通用品牌首页（由配置开关控制）
            if self.search_filter_portals and len(raw_query) >= 2:
                if any(d in real_url.lower() for d in self.dict_domains + self.generic_domains):
                    continue

            title = html.unescape(re.sub(r'<[^>]+>', '', title_m.group(2))).strip()
            snippet = html.unescape(re.sub(r'<[^>]+>', '', snip_m.group(1))).strip() if snip_m else ""
            snippet = re.sub(r'\s+', ' ', snippet)

            # 过滤基础安装/部署教程
            if self.search_filter_portals and "安装" not in raw_query and "部署" not in raw_query:
                if any(ik in title for ik in self.install_keywords):
                    continue

            # 主题强相关性过滤
            if core_topics:
                combined_text = (title + " " + snippet).lower()
                if not any(top.lower() in combined_text for top in core_topics):
                    continue

            if title and len(title) > 2:
                results.append({
                    "title": title,
                    "url": real_url,
                    "snippet": snippet,
                    "domain": domain,
                    "source": "Bing China"
                })

        return results

    def _search_bing(self, raw_query: str, search_target: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """调用 Bing 中国搜索引擎抓取结果，支持备用精准关键词轮询"""
        candidates = [search_target]

        # 如果开启了自动重试轮询，扩充精准技术候选词
        if self.search_retry_enabled:
            raw_lower = raw_query.lower()
            target_lower = search_target.lower()
            if "redis" in raw_lower and "缓存" in raw_lower and "实现" not in target_lower:
                candidates.append("Redis 缓存 Java 实现 方案")
                candidates.append("RedisTemplate 缓存 配合 Java 实例")
            elif "线程池" in raw_lower and "ThreadPoolExecutor" not in search_target:
                candidates.append("ThreadPoolExecutor 线程池 底层原理 源码")
            elif "asyncio" in raw_lower and "并发" not in target_lower:
                candidates.append("Python asyncio 异步并发 原理 教程")

        for q in candidates:
            try:
                url = f"https://cn.bing.com/search?q={requests.utils.quote(q)}"
                headers = {
                    "User-Agent": self.user_agent,
                    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                }
                resp = requests.get(url, headers=headers, verify=False, timeout=6)
                if resp.status_code == 200:
                    blocks = re.findall(r'<li class="b_algo"[^>]*>(.*?)</li>', resp.text, re.DOTALL)
                    res = self._filter_and_extract_results(raw_query, blocks, top_k=top_k)
                    if len(res) >= 2:
                        return res
            except Exception as e:
                logger.warning("Bing search error (%s): %s", q, e)

        return []

    def _search_baidu(self, search_target: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """调用百度搜索引擎（中国大陆备用引擎）抓取结果"""
        results = []
        try:
            url = f"https://www.baidu.com/s?wd={requests.utils.quote(search_target)}&ie=utf-8"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            }
            resp = requests.get(url, headers=headers, verify=False, timeout=6)
            if resp.status_code == 200:
                items = re.findall(r'<h3[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', resp.text, re.DOTALL)
                for raw_url, raw_title in items:
                    if len(results) >= top_k:
                        break
                    title = html.unescape(re.sub(r'<[^>]+>', '', raw_title)).strip()
                    if not title or len(title) <= 2:
                        continue

                    domain_match = re.search(r'https?://([^/]+)', raw_url)
                    domain = domain_match.group(1) if domain_match else "baidu.com"

                    if self.search_filter_portals and any(d in domain for d in self.dict_domains):
                        continue

                    results.append({
                        "title": title,
                        "url": raw_url,
                        "snippet": f"百度实时搜索结果: 《{title}》",
                        "domain": domain,
                        "source": "Baidu Search"
                    })
        except Exception as e:
            logger.warning("Baidu search error: %s", e)

        return results
    def search(self, query: str, top_k: int = None, llm_service: Any = None) -> List[Dict[str, Any]]:
        """执行全网智能关键词提炼与精准实时搜索，返回结构化标题、链接、摘要与域名"""
        if not query or not query.strip():
            return []

        target_top_k = top_k if top_k is not None else self.search_top_k
        search_target = self.extract_keywords(query, llm_service=llm_service)
        if not search_target:
            search_target = query.strip()

        results = []

        # 根据配置的搜索引擎模式执行
        if self.search_engine in ["auto", "bing"]:
            results = self._search_bing(query.strip(), search_target, top_k=target_top_k)

        if self.search_engine == "baidu" or (self.search_engine == "auto" and len(results) < target_top_k):
            needed = target_top_k - len(results)
            baidu_results = self._search_baidu(search_target, top_k=needed)
            existing_urls = {r["url"] for r in results}
            for br in baidu_results:
                if br["url"] not in existing_urls:
                    results.append(br)

        return results[:target_top_k]

    def build_search_context(self, query: str, top_k: int = None, llm_service: Any = None) -> Tuple[str, List[Dict[str, Any]]]:
        """构建注入大模型 System Prompt 的联网检索上下文段落"""
        results = self.search(query, top_k=top_k, llm_service=llm_service)
        if not results:
            return "", []

        context_parts = []
        for i, r in enumerate(results, 1):
            context_parts.append(
                f"[网页 {i}] 标题: 《{r['title']}》 (来源: {r['domain']})\n"
                f"摘要: {r['snippet']}\n"
                f"链接: {r['url']}"
            )
        context_text = "\n\n".join(context_parts)
        return context_text, results

web_search_service = SearchService()



