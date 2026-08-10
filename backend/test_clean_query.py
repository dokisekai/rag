import re
from services.search_service import web_search_service

class DummyLLM:
    """模拟测试 LLM 关键词提取"""
    def chat_completion(self, messages, temperature=0.1):
        user_msg = messages[-1]["content"]
        if "Java" in user_msg:
            return "Java 线程池 核心参数"
        if "DeepSeek" in user_msg:
            return "DeepSeek R1 架构特点"
        return "Python asyncio 并发"

test_queries = [
    '写一个 Java 线程池核心参数代码示例',
    '请问 DeepSeek R1 架构特点有哪些？',
    '请帮我查一下 Python 中如何用 asyncio 实现高并发网络请求'
]

dummy_llm = DummyLLM()

print("=== 1. 测试 LLM 提炼模式 ===")
for q in test_queries:
    kw_llm = web_search_service.extract_keywords(q, llm_service=dummy_llm)
    print(f"原始问题: {q}")
    print(f"LLM 提炼: {kw_llm}")
    res = web_search_service.search(q, top_k=3, llm_service=dummy_llm)
    for r in res:
        print(f"  -> [{r['source']}] [{r['domain']}] {r['title']}")
    print("-" * 50)

print("\n=== 2. 测试 离线规则降级模式 ===")
for q in test_queries:
    kw_fallback = web_search_service.extract_keywords(q, llm_service=None)
    print(f"原始问题: {q}")
    print(f"规则降级: {kw_fallback}")
    res = web_search_service.search(q, top_k=3, llm_service=None)
    for r in res:
        print(f"  -> [{r['source']}] [{r['domain']}] {r['title']}")
    print("-" * 50)

