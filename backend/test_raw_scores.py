import sys
import os
import requests
import numpy as np

os.environ["NO_PROXY"] = "localhost,127.0.0.1,::1"
sys.path.append("/Users/xiuxiuxiu/Documents/rag/backend")
from main import rag_service

kb_id = list(rag_service.kbs.keys())[0]
query = "Java 高并发线程池底层机制"

url = "http://127.0.0.1:1234/v1/embeddings"
try:
    resp = requests.post(url, json={"input": [query], "model": "text-embedding-qwen3-embedding-0.6b"}, timeout=5)
    print("Embedding API status:", resp.status_code)
    if resp.status_code == 200:
        query_vec = np.array(resp.json()["data"][0]["embedding"], dtype=np.float32).reshape(1, -1)
        import faiss
        faiss.normalize_L2(query_vec)
        kb = rag_service.kbs[kb_id]
        D, I = kb["index"].search(query_vec, 5)
        for idx, score in zip(I[0], D[0]):
            chunk = kb["chunks"][idx]
            content = chunk.get("content", "")[:100]
            print(f"RAW FAISS Index: {idx}, Score: {score}, Content: {content.replace(chr(10), ' ')}")
    else:
        print("Error from API:", resp.text)
except Exception as e:
    print(f"Embedding API error: {e}")
