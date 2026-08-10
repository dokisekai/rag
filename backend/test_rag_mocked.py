import sys
import os
import numpy as np
os.environ["NO_PROXY"] = "localhost,127.0.0.1,::1"
sys.path.append("/Users/xiuxiuxiu/Documents/rag/backend")

# Mock requests.post
import requests
original_post = requests.post

class MockResponse:
    def __init__(self, json_data, status_code=200):
        self.json_data = json_data
        self.status_code = status_code
    def json(self):
        return self.json_data

def mock_post(url, **kwargs):
    if "127.0.0.1:1234" in url:
        # Mock embedding response
        # Read the first vector from FAISS index directly to ensure a perfect match (score=1.0)
        from main import rag_service
        kb = list(rag_service.kbs.values())[0]
        # Reconstruct vector 0
        vec = kb["index"].reconstruct(0)
        # Normalize just in case
        vec = np.asarray(vec, dtype=np.float32)
        
        # If it's a batch request (rerank)
        if "input" in kwargs.get("json", {}) and isinstance(kwargs["json"]["input"], list):
            input_len = len(kwargs["json"]["input"])
            data = [{"embedding": vec.tolist()} for _ in range(input_len)]
            return MockResponse({"data": data})
        
        return MockResponse({"data": [{"embedding": vec.tolist()}]})
    return original_post(url, **kwargs)

requests.post = mock_post

from main import rag_service, build_rag_context

print("Testing mocked RAG flow...")
kb_id = list(rag_service.kbs.keys())[0] if rag_service.kbs else None

if kb_id:
    # 1. Test vector search directly
    print("\n--- Testing vector_search ---")
    v_results = rag_service.vector_search(kb_id, "test query", top_k=5)
    print("vector_search results (should have chunk 0 with high score):")
    for idx, score in v_results:
        print(f"Index: {idx}, Score: {score}")

    # 2. Test full hybrid search
    print("\n--- Testing search_with_metadata (Hybrid + Rerank) ---")
    # This simulates the exact call in build_rag_context
    result = rag_service.search_with_metadata(
        kb_id, "test query", top_k=5,
        enable_rerank=True, enable_rewrite=False, enable_guardrails=False
    )
    print("hybrid_search results (should have chunks with rerank_score >= 0.40):")
    for r in result.get("results", []):
        print(f"Index: {r['chunk_index']}, Rerank Score: {r.get('rerank_score')}")
    
    # 3. Test build_rag_context
    print("\n--- Testing build_rag_context ---")
    context_text, results, _ = build_rag_context(kb_id, "test query", top_k=5)
    print(f"Returned {len(results)} chunks.")
    if results:
        print("Success! Chunks were returned and passed the 0.40 threshold.")
    else:
        print("Failed! No chunks returned.")
else:
    print("No KB found.")
