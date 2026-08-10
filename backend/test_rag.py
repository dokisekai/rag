import sys
import os
os.environ["NO_PROXY"] = "localhost,127.0.0.1,::1"
sys.path.append("/Users/xiuxiuxiu/Documents/rag/backend")
from main import rag_service

print("KBs:", rag_service.kbs.keys())
kb_id = list(rag_service.kbs.keys())[0] if rag_service.kbs else None
if kb_id:
    query = "Java 高并发线程池底层机制"
    
    print("\n--- Vector search results ---")
    try:
        v_results = rag_service.vector_search(kb_id, query, top_k=5)
        for idx, score in v_results:
            chunk = rag_service.kbs[kb_id]["chunks"][idx]
            content = chunk.get("content", "")[:100]
            print(f"Index: {idx}, Score: {score}, Content preview: {content}")
    except Exception as e:
        print(f"Vector search error: {e}")

    print("\n--- BM25 results ---")
    try:
        b_results = rag_service.bm25_search(kb_id, query, top_k=5)
        for idx, score in b_results:
            chunk = rag_service.kbs[kb_id]["chunks"][idx]
            content = chunk.get("content", "")[:100]
            print(f"Index: {idx}, Score: {score}, Content preview: {content}")
    except Exception as e:
        print(f"BM25 search error: {e}")
else:
    print("No KB found.")
