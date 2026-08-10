import json
import requests
import re
from typing import Dict, Any, List, Generator

_COMPAT_PARAMS = [
    "response_format", "logprobs", "top_logprobs", "seed",
    "tools", "tool_choice", "parallel_tool_calls",
    "frequency_penalty", "presence_penalty", "logit_bias",
    "functions", "function_call",
]

class LLMService:
    def __init__(
        self,
        api_key: str = "",
        api_base: str = "http://127.0.0.1:1234/v1",
        model: str = "liquid/lfm2-24b-a2b",
        temperature: float = 1.0
    ):
        self.api_key = api_key if api_key else "not-needed"
        self.api_base = api_base.rstrip("/")
        self.model = model
        self.temperature = temperature

    def set_config(self, api_key: str, api_base: str, model: str, temperature: float = 1.0):
        self.api_key = api_key if api_key else "not-needed"
        if api_base:
            self.api_base = api_base.rstrip("/")
        if model:
            self.model = model
        if temperature is not None:
            self.temperature = float(temperature)

    def prune_messages(self, messages: List[Dict[str, str]], max_history: int = 6) -> List[Dict[str, str]]:
        """保留 System Prompt 和最近 N 轮对话，防止超出本地大模型 Context Window"""
        if len(messages) <= max_history + 1:
            return messages
        system_msg = [m for m in messages if m.get("role") == "system"]
        history = [m for m in messages if m.get("role") != "system"]
        return system_msg + history[-max_history:]

    def _build_payload(self, messages, temperature, stream=False, extra=None):
        target_temp = temperature if temperature is not None else self.temperature
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": target_temp,
            "max_tokens": 16384,
        }
        if stream:
            payload["stream"] = True
        if extra:
            payload.update(extra)
        return payload

    def _build_headers(self):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        if "127.0.0.1" in self.api_base or "localhost" in self.api_base:
            headers["Host"] = "localhost:1234"
        return headers

    def _is_compat_error(self, status_code, text):
        if status_code != 400:
            return False
        keywords = [
            "json schema is missing", "response_format",
            "tool_choice", "unknown parameter",
            "not supported", "invalid"
        ]
        text_lower = text.lower()
        return any(kw in text_lower for kw in keywords)

    def _strip_compat_params(self, payload):
        stripped = dict(payload)
        for param in _COMPAT_PARAMS:
            stripped.pop(param, None)
        return stripped

    def chat_completion(self, messages: List[Dict[str, str]], temperature: float = None) -> str:
        """调用本地/云端 OpenAI 兼容格式大模型 API (同步)"""
        pruned_messages = self.prune_messages(messages)
        url = f"{self.api_base}/chat/completions"
        headers = self._build_headers()
        payload = self._build_payload(pruned_messages, temperature)

        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]

            if self._is_compat_error(resp.status_code, resp.text):
                stripped = self._strip_compat_params(payload)
                if stripped != payload:
                    resp2 = requests.post(url, headers=headers, json=stripped, timeout=30)
                    if resp2.status_code == 200:
                        data = resp2.json()
                        return data["choices"][0]["message"]["content"]
                    return f"【API 请求异常 ({resp2.status_code})】: {resp2.text}"

            return f"【API 请求异常 ({resp.status_code})】: {resp.text}"
        except Exception as e:
            return f"【无法连接本地 LLM 服务 ({self.api_base})】: {str(e)}。请确保 LM Studio / Local LLM 服务已在 1234 端口启动。"

    def chat_completion_stream(self, messages: List[Dict[str, str]], temperature: float = None) -> Generator[str, None, None]:
        """流式 SSE 方式调用大模型 API"""
        pruned_messages = self.prune_messages(messages)
        url = f"{self.api_base}/chat/completions"
        headers = self._build_headers()
        payload = self._build_payload(pruned_messages, temperature, stream=True)

        try:
            with requests.post(url, headers=headers, json=payload, stream=True, timeout=30) as resp:
                if resp.status_code == 200:
                    for line in resp.iter_lines():
                        if line:
                            line_str = line.decode('utf-8')
                            if line_str.startswith("data: "):
                                data_str = line_str[6:].strip()
                                if data_str == "[DONE]":
                                    break
                                try:
                                    chunk = json.loads(data_str)
                                    delta = chunk["choices"][0].get("delta", {})
                                    content = delta.get("content", "")
                                    reasoning = delta.get("reasoning_content", "") or delta.get("reasoning", "")
                                    if reasoning:
                                        yield f"<think>{reasoning}</think>"
                                    elif content:
                                        yield content
                                except Exception:
                                    pass
                    return

                error_text = resp.text
                if self._is_compat_error(resp.status_code, error_text):
                    stripped = self._strip_compat_params(payload)
                    if stripped != payload:
                        with requests.post(url, headers=headers, json=stripped, stream=True, timeout=30) as resp2:
                            if resp2.status_code == 200:
                                for line in resp2.iter_lines():
                                    if line:
                                        line_str = line.decode('utf-8')
                                        if line_str.startswith("data: "):
                                            data_str = line_str[6:].strip()
                                            if data_str == "[DONE]":
                                                break
                                            try:
                                                chunk = json.loads(data_str)
                                                content = chunk["choices"][0]["delta"].get("content", "")
                                                if content:
                                                    yield content
                                            except Exception:
                                                pass
                                return
                    error_text = resp2.text

            yield f"【API 请求异常 ({resp.status_code})】: {error_text}"
        except Exception as e:
            yield f"【无法连接本地 LLM 服务 ({self.api_base})】: {str(e)}"

def clean_chunk_content(content: str) -> str:
    """清洗知识切片，剔除残缺的空列表标点符号(-/1./*)与半句尾缀"""
    if not content:
        return ""
    lines = [line.rstrip() for line in content.split("\n") if line.strip()]
    valid_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped in ['-', '*', '#', '##', '###', '####', '>', '1.', '2.', '3.']:
            continue
        if line.startswith("#"):
            clean_title = line.lstrip("#").strip()
            if clean_title:
                valid_lines.append(f"**{clean_title}**")
        else:
            valid_lines.append(line)

    if not valid_lines:
        return ""

    # 剔除末尾多余的孤立列表头 (如 "- " 或 "1. ")
    while valid_lines and (valid_lines[-1].strip() in ['-', '*', '>', '1.', '2.'] or valid_lines[-1].strip().endswith('-')):
        valid_lines.pop()

    if not valid_lines:
        return ""

    # 补全末尾缺失的标点符号
    final_last = valid_lines[-1].strip()
    if final_last and not re.search(r'[。！\?；;:\n\`\|\]\)\}”’"]$', final_last) and not final_last.startswith("|"):
        valid_lines[-1] = final_last + "。"

    return "\n".join(valid_lines)


def merge_rag_chunks_seamlessly(rag_chunks: List[Dict[str, Any]]) -> str:
    """将检索到多块切片缝合为一个连贯、无分片断层、排版完整的 Markdown 文章"""
    if not rag_chunks:
        return ""

    merged_sections = []
    seen_contents = set()

    for chunk in rag_chunks:
        content = (chunk.get("content") or "").strip()
        if not content or content in seen_contents:
            continue
        seen_contents.add(content)

        cleaned = clean_chunk_content(content)
        if cleaned:
            merged_sections.append(cleaned)

    if not merged_sections:
        return ""

    # 1. 将所有切片段落连接
    full_text = "\n\n".join(merged_sections)

    # 2. 缝合由于分片导致的切片字词硬切断 (如 "4. **G1（Garbage-First）收" + "\n\n" + "集器：...")
    full_text = re.sub(r'([^\n。！\?；;:\`\|\]\)\}”’"])\n\n([^\n#\-1-9])', r'\1\2', full_text)
    return full_text


def synthesize_rag_response_fallback(query: str, rag_chunks: List[Dict[str, Any]]) -> Generator[str, None, None]:
    """当大模型未连接时，对 RAG 检索切片进行无缝缝合与连贯排版"""
    if not rag_chunks:
        yield f"您好！关于您提问的 **「{query}」**，当前知识库中未匹配到相关文档切片。\n\n💡 *提示：您可在系统「AI 能力中心」配置 DeepSeek / OpenAI / LM Studio 大模型 API 密钥，解锁全量 AI 智能对话！*"
        return

    yield f"### 💡 知识库完整解答: **「{query}」**\n\n"

    seamless_article = merge_rag_chunks_seamlessly(rag_chunks)
    if seamless_article:
        yield f"{seamless_article}\n\n"

    sources = list(set(c.get("source") for c in rag_chunks if c.get("source")))
    if sources:
        yield "#### 📖 参考资料引证出处\n"
        for s in sources:
            yield f"> 📝 引自知识文档 《{s}》\n"
        yield "\n"

    yield "---\n💡 *提示：以上解答已通过向量引擎全量缝合连贯呈现（切片已缝合）。在「AI 能力中心」配置大模型密钥后可开启全量 AI 逻辑推导。*"


def build_system_knowledge_prompt(knowledge_base: str = "") -> str:
    """构建 AI 知识库专家的 System Prompt"""
    prompt = """你是一位专业、严谨且排版优雅的 AI 知识库智能专家 (AI Knowledge Specialist)。
你的任务是根据提供的知识库参考资料，为用户解答问题。

【回答格式与完整性规范（极其重要）】：
1. **简洁精炼**：每个知识点用 1~2 句话说明核心，切勿冗长展开，确保在有限 Token 内覆盖所有要点，绝不能在最后一个知识点中途停止！
2. **完整性优先**：必须将所有检索到的知识点全部覆盖完毕后再结束，如有内容被参考资料中途截断，请结合专业知识自动补全。
3. **结构化格式输出**：使用 Markdown 格式（`###` 小标题、`**` 加粗、`-` 列表），条理清晰，禁止输出大段无格式文本。
4. **结尾完整**：回答末尾必须有一个完整的总结句或收尾段落，不得以半词或半句结束。
5. **内容引用标注（极其重要）**：当某句话用到了「RAG 检索增强真实上下文」中某条 [参考资料 N] 的具体内容、数据或观点时，必须在该句末尾用方括号角标标注引用编号，格式为 [1]、[2]，编号与 [参考资料 N] 的 N 一一对应。同一句引用了多条资料时写作 [1,3]。角标须紧贴句末标点之前，例如：「核心线程始终保持在空闲状态[1]。」只标注确实参考了该资料的语句，未参考的不要标注；没有参考资料时不要输出任何角标。"""
    if knowledge_base:
        prompt += f"\n以下是检索到的知识库参考资料（请覆盖所有要点后再结束，末尾断句请自动补全）：\n-------------------\n{knowledge_base}\n-------------------\n"
    return prompt

