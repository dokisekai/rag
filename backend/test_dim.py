import sys
sys.path.append("/Users/xiuxiuxiu/Documents/rag/backend")
from main import rag_service
kb = list(rag_service.kbs.values())[0]
print("KB embedding dimension:", kb.get("emb_dim"))
