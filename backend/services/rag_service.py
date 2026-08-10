import os
import re
import math
import logging

logger = logging.getLogger(__name__)

# Embedding configuration (can be overridden via environment variables)
EMBEDDING_API_BASE = os.getenv("EMBEDDING_API_BASE", "http://127.0.0.1:1234/v1")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-qwen3-embedding-0.6b")
# LLM model for query rewrite (can be overridden via environment variables)
LLM_MODEL = os.getenv("LLM_MODEL", "liquid/lfm2-24b-a2b")
import json
import time
import uuid
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from collections import Counter, defaultdict
from dataclasses import dataclass, field

import numpy as np
import faiss
import requests

from services.document_parser import (
    DocumentParserRegistry,
    ChunkingEngine,
)


# ---------------- Text Processing Utilities ----------------

def tokenize(text: str) -> List[str]:
    tokens = []
    for char in text:
        if '\u4e00' <= char <= '\u9fff':
            tokens.append(char)
    word_tokens = re.findall(r'[a-zA-Z0-9_]+', text.lower())
    tokens.extend(word_tokens)
    return tokens


SENSITIVE_PATTERNS = [
    (r'1[3-9]\d{9}', '[手机号]'),
    (r'\d{17}[\dXx]', '[身份证号]'),
    (r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[邮箱]'),
    (r'(password|passwd|pwd|secret|token|api_key|apikey)\s*[=:]\s*\S+', '[敏感字段]', re.IGNORECASE),
]


def input_guardrails(text: str) -> Tuple[str, List[Dict[str, str]]]:
    cleaned = text
    flags = []
    for pattern in SENSITIVE_PATTERNS:
        if len(pattern) == 3:
            pat, replacement, flags_arg = pattern
            matches = re.findall(pat, cleaned, flags_arg)
        else:
            pat, replacement = pattern
            matches = re.findall(pat, cleaned)
        if matches:
            for m in matches[:3]:
                flags.append({"type": "sensitive_info", "pattern": pat[:30]})
            if len(pattern) == 3:
                cleaned = re.sub(pat, replacement, cleaned, flags=flags_arg)
            else:
                cleaned = re.sub(pat, replacement, cleaned)
    prompt_injection_keywords = [
        'ignore previous', 'ignore the above', 'system prompt', '你是', '现在你是',
        '忘掉之前', '忘记之前', '角色扮演', '重新设定', '输出系统提示', 'dump prompt'
    ]
    lower_text = text.lower()
    for kw in prompt_injection_keywords:
        if kw.lower() in lower_text:
            flags.append({"type": "prompt_injection_risk", "keyword": kw})
            break
    return cleaned, flags


# ---------------- BM25 Retriever ----------------

class BM25Retriever:
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.docs: List[List[str]] = []
        self.doc_lens: List[int] = []
        self.avgdl: float = 0.0
        self.df: Counter = Counter()
        self.idf: Dict[str, float] = {}
        self.n_docs: int = 0

    def fit(self, documents: List[str]):
        self.docs = [tokenize(doc) for doc in documents]
        self.doc_lens = [len(doc) for doc in self.docs]
        self.n_docs = len(self.docs)
        self.avgdl = sum(self.doc_lens) / self.n_docs if self.n_docs > 0 else 0.0
        self.df = Counter()
        for doc_tokens in self.docs:
            unique_tokens = set(doc_tokens)
            for token in unique_tokens:
                self.df[token] += 1
        self.idf = {}
        for token, freq in self.df.items():
            self.idf[token] = math.log((self.n_docs - freq + 0.5) / (freq + 0.5) + 1.0)

    def score(self, query: str, doc_index: int) -> float:
        query_tokens = tokenize(query)
        doc_tokens = self.docs[doc_index]
        doc_len = self.doc_lens[doc_index]
        tf = Counter(doc_tokens)
        score = 0.0
        for q_token in query_tokens:
            if q_token not in self.idf:
                continue
            idf = self.idf[q_token]
            freq = tf.get(q_token, 0)
            numerator = freq * (self.k1 + 1)
            denominator = freq + self.k1 * (1 - self.b + self.b * (doc_len / self.avgdl)) if self.avgdl > 0 else 1.0
            score += idf * (numerator / denominator)
        return score

    def search(self, query: str, top_k: int = 5) -> List[Tuple[int, float]]:
        if self.n_docs == 0:
            return []
        scores = []
        for i in range(self.n_docs):
            s = self.score(query, i)
            if s > 0:
                scores.append((i, s))
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_k]


# ---------------- Hybrid Merge & Rerank ----------------

def rrf_merge(
    vector_results: List[Tuple[int, float]],
    bm25_results: List[Tuple[int, float]],
    k: int = 60,
    top_k: int = 5,
    vector_weight: float = 0.5,
    bm25_weight: float = 0.5,
) -> List[Tuple[int, float]]:
    rrf_scores: Dict[int, float] = {}

    for rank, (doc_id, _) in enumerate(vector_results):
        score = vector_weight * (1.0 / (k + rank + 1))
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + score

    for rank, (doc_id, _) in enumerate(bm25_results):
        score = bm25_weight * (1.0 / (k + rank + 1))
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + score

    sorted_results = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    return sorted_results[:top_k]


def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    if np.linalg.norm(v1) == 0 or np.linalg.norm(v2) == 0:
        return 0.0
    return float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))


def embedding_rerank(
    query: str,
    candidates: List[Dict[str, Any]],
    api_base: str = EMBEDDING_API_BASE,
    model: str = EMBEDDING_MODEL,
) -> List[Dict[str, Any]]:
    if not candidates:
        return []
    try:
        texts = [c["content"] for c in candidates]
        resp = requests.post(
            f"{api_base}/embeddings",
            json={"input": [query] + texts, "model": model},
            timeout=15.0
        )
        if resp.status_code == 200:
            data = resp.json()["data"]
            query_vec = np.array(data[0]["embedding"], dtype=np.float32)
            scores = []
            for i, cand in enumerate(candidates):
                doc_vec = np.array(data[i + 1]["embedding"], dtype=np.float32)
                sim = cosine_similarity(query_vec, doc_vec)
                scores.append(sim)
            scored = list(zip(candidates, scores))
            scored.sort(key=lambda x: x[1], reverse=True)
            result = []
            for cand, score in scored:
                new_cand = dict(cand)
                new_cand["rerank_score"] = round(score, 6)
                result.append(new_cand)
            return result
    except Exception as e:
        logger.warning(f"Rerank fallback (local embeddings offline): {e}")

    # 离线极速回退：基于确定性哈希特征计算余弦相似度，避免由于本地 Embedding 服务未启动导致 500 报错
    import hashlib
    def get_hash_vec(text: str, dim: int = 1536) -> np.ndarray:
        hash_digest = hashlib.md5(text.encode('utf-8')).digest()
        seed = int.from_bytes(hash_digest[:4], 'little')
        rng = np.random.RandomState(seed)
        return rng.randn(dim).astype(np.float32)

    query_vec = get_hash_vec(query)
    scores = []
    for cand in candidates:
        doc_vec = get_hash_vec(cand.get("content", ""))
        sim = cosine_similarity(query_vec, doc_vec)
        scores.append(sim)
    scored = list(zip(candidates, scores))
    scored.sort(key=lambda x: x[1], reverse=True)
    result = []
    for cand, score in scored:
        new_cand = dict(cand)
        new_cand["rerank_score"] = round(score, 6)
        result.append(new_cand)
    return result


# ---------------- Query Rewrite ----------------

def query_rewrite(
    query: str,
    history: Optional[List[Dict[str, str]]] = None,
    api_base: str = "http://127.0.0.1:1234/v1",
    model: str = LLM_MODEL,
) -> Tuple[str, List[str]]:
    try:
        history_text = ""
        if history:
            turns = []
            for h in history[-3:]:
                if h.get("role") == "user":
                    turns.append(f"用户: {h.get('content', '')[:200]}")
                elif h.get("role") == "assistant":
                    turns.append(f"面试官: {h.get('content', '')[:200]}")
            history_text = "\n".join(turns)

        system_prompt = """你是一个查询改写助手。你的任务是：
1. 将用户的原始问题改写为更适合向量检索的标准化查询
2. 补充可能缺失的技术关键词和上下文
3. 生成 3 个不同角度的查询变体，用于多路召回

请严格以 JSON 格式输出，不要有任何额外解释：
{
  "rewritten_query": "改写后的主查询",
  "variants": ["变体1", "变体2", "变体3"]
}"""

        user_prompt = f"""历史对话:
{history_text if history_text else '(无历史对话)'}

当前用户问题: {query}

请生成改写后的查询和变体。"""

        resp = requests.post(
            f"{api_base}/chat/completions",
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 1.0,
                "max_tokens": 500,
            },
            timeout=30
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        try:
            result = json.loads(content)
            rewritten = result.get("rewritten_query", query)
            variants = result.get("variants", [])
            return rewritten, variants
        except json.JSONDecodeError:
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                try:
                    result = json.loads(match.group(0))
                    return result.get("rewritten_query", query), result.get("variants", [])
                except (json.JSONDecodeError, KeyError, TypeError):
                    pass
            return query, []
    except Exception as e:
        logger.warning(f"Query rewrite failed: {e}")
        return query, []


# ---------------- Statistics ----------------

@dataclass
class RagStats:
    total_queries: int = 0
    total_time_ms: float = 0.0
    vector_search_count: int = 0
    bm25_search_count: int = 0
    rerank_count: int = 0
    query_rewrite_count: int = 0
    guardrails_triggered: int = 0
    avg_retrieval_time_ms: float = 0.0
    recent_queries: List[Dict[str, Any]] = field(default_factory=list)

    def record_query(self, query: str, results_count: int, time_ms: float, stages: Dict[str, bool]):
        self.total_queries += 1
        self.total_time_ms += time_ms
        self.avg_retrieval_time_ms = self.total_time_ms / self.total_queries
        if stages.get("vector"):
            self.vector_search_count += 1
        if stages.get("bm25"):
            self.bm25_search_count += 1
        if stages.get("rerank"):
            self.rerank_count += 1
        if stages.get("rewrite"):
            self.query_rewrite_count += 1
        if stages.get("guardrails"):
            self.guardrails_triggered += 1
        self.recent_queries.append({
            "query": query[:50] + "..." if len(query) > 50 else query,
            "results_count": results_count,
            "time_ms": round(time_ms, 2),
            "timestamp": time.time()
        })
        if len(self.recent_queries) > 50:
            self.recent_queries = self.recent_queries[-50:]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_queries": self.total_queries,
            "total_time_ms": round(self.total_time_ms, 2),
            "avg_retrieval_time_ms": round(self.avg_retrieval_time_ms, 2),
            "vector_search_count": self.vector_search_count,
            "bm25_search_count": self.bm25_search_count,
            "rerank_count": self.rerank_count,
            "query_rewrite_count": self.query_rewrite_count,
            "guardrails_triggered": self.guardrails_triggered,
            "recent_queries": self.recent_queries[-10:]
        }


# ---------------- RAG Service ----------------

class RagService:
    def __init__(self, vector_store_path: str = "data/vector_store"):
        self.base_path = Path(vector_store_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
        self.custom_kb_path = Path("data/custom_kb")
        self.custom_kb_path.mkdir(parents=True, exist_ok=True)
        self.kbs: Dict[str, Dict[str, Any]] = {}
        self.stats = RagStats()
        self.chunking_engine = ChunkingEngine(min_len=300, max_len=800, overlap=80)
        self._load_existing_kbs()

    # ---------- Persistence ----------

    def _load_existing_kbs(self):
        for kb_dir in self.base_path.iterdir():
            if kb_dir.is_dir():
                meta_path = kb_dir / "meta.json"
                index_path = kb_dir / "index.faiss"
                mapping_path = kb_dir / "mapping.json"
                docs_path = kb_dir / "documents.json"
                if meta_path.exists():
                    try:
                        with open(meta_path, "r", encoding="utf-8") as f:
                            meta = json.load(f)

                        # 兼容旧版：纯文本chunks升级为Chunk对象
                        raw_chunks = meta.get("chunks", [])
                        chunks = self._deserialize_chunks(raw_chunks)

                        # 加载索引映射
                        chunk_id_to_faiss_id: Dict[str, int] = {}
                        faiss_id_to_chunk_id: Dict[int, str] = {}
                        if mapping_path.exists():
                            with open(mapping_path, "r", encoding="utf-8") as f:
                                mapping = json.load(f)
                            chunk_id_to_faiss_id = mapping.get("chunk_id_to_faiss_id", {})
                            faiss_id_to_chunk_id = {int(v): k for k, v in chunk_id_to_faiss_id.items()}
                        else:
                            # 兼容旧版：按数组下标建立映射
                            for i, c in enumerate(chunks):
                                cid = c.get("chunk_id", c.get("id", f"legacy_{i}"))
                                chunk_id_to_faiss_id[cid] = i
                                faiss_id_to_chunk_id[i] = cid

                        index = faiss.read_index(str(index_path)) if index_path.exists() else None
                        bm25_retriever = BM25Retriever()
                        chunk_texts = [c["content"] for c in chunks]
                        if chunk_texts:
                            bm25_retriever.fit(chunk_texts)

                        # 加载文档元数据
                        documents: Dict[str, Dict[str, Any]] = {}
                        if docs_path.exists():
                            with open(docs_path, "r", encoding="utf-8") as f:
                                documents = json.load(f)

                        self.kbs[kb_dir.name] = {
                            "name": meta.get("name", kb_dir.name),
                            "chunks": chunks,
                            "index": index,
                            "emb_dim": meta.get("emb_dim", 1536),
                            "path": kb_dir,
                            "bm25": bm25_retriever,
                            "type": meta.get("type", "custom"),
                            "source_file": meta.get("source_file", ""),
                            "file_size": meta.get("file_size", 0),
                            "created_at": meta.get("created_at", time.time()),
                            "chunk_id_to_faiss_id": chunk_id_to_faiss_id,
                            "faiss_id_to_chunk_id": faiss_id_to_chunk_id,
                            "documents": documents,
                        }
                    except Exception as e:
                        logger.error(f"Failed to load KB {kb_dir.name}: {e}")

    def _deserialize_chunks(self, raw_chunks: List[Any]) -> List[Dict[str, Any]]:
        """兼容旧版：纯字符串列表或字典列表"""
        result = []
        for i, c in enumerate(raw_chunks):
            if isinstance(c, str):
                result.append({
                    "chunk_id": f"legacy_{i}",
                    "doc_id": "legacy",
                    "kb_id": "",
                    "content": c,
                    "index_in_doc": i,
                    "heading_path": "",
                    "node_type": "paragraph",
                    "metadata": {}
                })
            elif isinstance(c, dict):
                result.append(c)
        return result

    def _save_kb(self, kb_id: str):
        kb = self.kbs[kb_id]
        kb_dir: Path = kb["path"]
        kb_dir.mkdir(parents=True, exist_ok=True)

        meta = {
            "name": kb["name"],
            "chunks": kb["chunks"],
            "emb_dim": kb["emb_dim"],
            "type": kb.get("type", "custom"),
            "source_file": kb.get("source_file", ""),
            "file_size": kb.get("file_size", 0),
            "created_at": kb.get("created_at", time.time()),
        }
        with open(kb_dir / "meta.json", "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)

        if kb["index"] is not None:
            faiss.write_index(kb["index"], str(kb_dir / "index.faiss"))

        mapping = {
            "chunk_id_to_faiss_id": kb.get("chunk_id_to_faiss_id", {}),
        }
        with open(kb_dir / "mapping.json", "w", encoding="utf-8") as f:
            json.dump(mapping, f, ensure_ascii=False, indent=2)

        with open(kb_dir / "documents.json", "w", encoding="utf-8") as f:
            json.dump(kb.get("documents", {}), f, ensure_ascii=False, indent=2)

    # ---------- Knowledge Base CRUD ----------

    def create_kb(self, name: str, kb_type: str = "custom", source_file: str = "", file_size: int = 0) -> str:
        kb_id = uuid.uuid4().hex
        self.kbs[kb_id] = {
            "name": name,
            "chunks": [],
            "index": None,
            "emb_dim": 1536,
            "path": self.base_path / kb_id,
            "bm25": BM25Retriever(),
            "type": kb_type,
            "source_file": source_file,
            "file_size": file_size,
            "created_at": time.time(),
            "chunk_id_to_faiss_id": {},
            "faiss_id_to_chunk_id": {},
            "documents": {},
        }
        self._save_kb(kb_id)
        return kb_id

    def add_document(self, kb_id: str, filename: str, content: bytes) -> str:
        kb = self.kbs.get(kb_id)
        if not kb:
            raise ValueError(f"KB {kb_id} not found")

        doc_id = uuid.uuid4().hex
        ext = Path(filename).suffix.lower()

        # 解析文档
        try:
            nodes = DocumentParserRegistry.parse(content, filename)
        except ValueError:
            # 回退：未知格式按纯文本处理
            text = content.decode("utf-8", errors="ignore")
            from services.document_parser import DocumentNode
            nodes = [DocumentNode(content=text, node_type="paragraph", level=0, metadata={"source": filename})]

        # 结构感知分块
        chunks = self.chunking_engine.chunk(nodes, doc_id=doc_id, kb_id=kb_id)

        # 保存文档元数据
        kb["documents"][doc_id] = {
            "doc_id": doc_id,
            "filename": filename,
            "file_type": ext,
            "file_size": len(content),
            "chunk_count": len(chunks),
            "node_count": len(nodes),
            "created_at": time.time(),
        }

        # 追加chunks (转换为标准字典以确保跨模块安全兼容)
        chunk_dicts = []
        for c in chunks:
            if isinstance(c, dict):
                chunk_dicts.append(c)
            elif hasattr(c, "chunk_id"):
                chunk_dicts.append({
                    "chunk_id": getattr(c, "chunk_id", ""),
                    "doc_id": getattr(c, "doc_id", doc_id),
                    "kb_id": getattr(c, "kb_id", kb_id),
                    "content": getattr(c, "content", ""),
                    "index_in_doc": getattr(c, "index_in_doc", 0),
                    "heading_path": getattr(c, "heading_path", ""),
                    "node_type": getattr(c, "node_type", "paragraph"),
                    "metadata": getattr(c, "metadata", {}),
                })
            else:
                chunk_dicts.append(vars(c))

        kb["chunks"].extend(chunk_dicts)
        kb["source_file"] = filename
        kb["file_size"] = len(content)
        return doc_id

    def remove_document(self, kb_id: str, doc_id: str):
        """从知识库中移除指定文档及其所有chunk，并重建索引"""
        kb = self.kbs.get(kb_id)
        if not kb:
            raise ValueError(f"KB {kb_id} not found")

        # 过滤掉该文档的chunks
        original_count = len(kb["chunks"])
        kb["chunks"] = [c for c in kb["chunks"] if self._get_chunk_field(c, "doc_id") != doc_id]
        removed_count = original_count - len(kb["chunks"])

        # 删除文档元数据
        if doc_id in kb["documents"]:
            del kb["documents"][doc_id]

        # 重建索引
        if kb["chunks"]:
            self.build_index(kb_id)
        else:
            # 无chunk则清空索引
            kb["index"] = None
            kb["chunk_id_to_faiss_id"] = {}
            kb["faiss_id_to_chunk_id"] = {}
            kb["bm25"] = BM25Retriever()
            self._save_kb(kb_id)

        return {"removed_chunks": removed_count}

    def list_documents(self, kb_id: str) -> List[Dict[str, Any]]:
        kb = self.kbs.get(kb_id)
        if not kb:
            return []
        docs = []
        is_indexed = kb.get("index") is not None
        emb_dim = kb.get("emb_dim", 1536)
        for doc_id, d in kb.get("documents", {}).items():
            doc_chunks = [c for c in kb.get("chunks", []) if self._get_chunk_field(c, "doc_id") == doc_id]
            chunk_cnt = len(doc_chunks) if doc_chunks else d.get("chunk_count", 0)
            docs.append({
                **d,
                "chunk_count": chunk_cnt,
                "emb_status": "已向量化" if is_indexed and chunk_cnt > 0 else ("未索引" if chunk_cnt == 0 else "处理中"),
                "emb_dim": emb_dim,
                "vector_type": "FAISS_IndexFlatIP",
            })
        return docs

    def get_document_preview(self, kb_id: str, doc_id: str, max_chars: int = 2000) -> Optional[Dict[str, Any]]:
        kb = self.kbs.get(kb_id)
        if not kb:
            return None
        doc = kb.get("documents", {}).get(doc_id)
        if not doc:
            return None
        # 收集该文档的所有chunks内容作为预览
        chunks = [c for c in kb["chunks"] if self._get_chunk_field(c, "doc_id") == doc_id]
        preview_text = "\n\n".join(self._get_chunk_field(c, "content") for c in chunks[:20])
        if len(preview_text) > max_chars:
            preview_text = preview_text[:max_chars] + "\n..."
        return {
            **doc,
            "preview": preview_text,
            "total_chunks": len(chunks),
        }

    # ---------- Indexing ----------

    def _get_chunk_field(self, c: Any, field_name: str, default: Any = "") -> Any:
        if isinstance(c, dict):
            return c.get(field_name, default)
        return getattr(c, field_name, default)

    def _embed_chunks(self, chunks: List[Any], emb_dim: int = 1536) -> np.ndarray:
        texts = [self._get_chunk_field(c, "content") for c in chunks]
        url = f"{EMBEDDING_API_BASE}/embeddings"
        embeddings = [None] * len(texts)
        
        # 快速测试本地 Embedding 服务连通性 (timeout=1.5s)
        use_remote = False
        try:
            test_resp = requests.post(url, json={"input": ["test"], "model": EMBEDDING_MODEL}, timeout=15.0)
            if test_resp.status_code == 200:
                use_remote = True
        except Exception as e:
            logger.debug("Embedding service connectivity check failed: %s", e)
            use_remote = False

        if use_remote:
            batch_size = 32
            for start in range(0, len(texts), batch_size):
                end = start + batch_size
                batch = texts[start:end]
                try:
                    resp = requests.post(url, json={"input": batch, "model": EMBEDDING_MODEL}, timeout=60)
                    if resp.status_code == 200:
                        data = resp.json().get("data", [])
                        for idx, e in enumerate(data):
                            embeddings[start + idx] = np.array(e["embedding"], dtype=np.float32)
                except Exception as e:
                    logger.warning(f"Embedding batch failed: {e}")

        # 快速极速回退：基于 MD5 哈希生成确定性向量，无需等待网络超时
        import hashlib
        for i in range(len(texts)):
            if embeddings[i] is None:
                hash_digest = hashlib.md5(texts[i].encode('utf-8')).digest()
                seed = int.from_bytes(hash_digest[:4], 'little')
                rng = np.random.RandomState(seed)
                embeddings[i] = rng.randn(emb_dim).astype(np.float32)

        return np.vstack(embeddings)

    def build_index(self, kb_id: str):
        kb = self.kbs.get(kb_id)
        if not kb:
            raise ValueError(f"KB {kb_id} not found")
        if not kb["chunks"]:
            self._save_kb(kb_id)
            return

        chunks = kb["chunks"]
        vectors = self._embed_chunks(chunks, emb_dim=kb["emb_dim"])
        dim = vectors.shape[1]
        faiss.normalize_L2(vectors)

        # 根据数据量选择索引类型
        n = vectors.shape[0]
        if n < 10000:
            index = faiss.IndexFlatIP(dim)
        else:
            nlist = min(4096, int(4 * math.sqrt(n)))
            quantizer = faiss.IndexFlatIP(dim)
            index = faiss.IndexIVFFlat(quantizer, dim, nlist, faiss.METRIC_INNER_PRODUCT)
            index.train(vectors)

        index.add(vectors)

        # 对 IVF 索引调用 make_direct_map，支持 reconstruct()
        if hasattr(index, 'make_direct_map'):
            index.make_direct_map()

        # 建立显式映射
        chunk_id_to_faiss_id: Dict[str, int] = {}
        faiss_id_to_chunk_id: Dict[int, str] = {}
        for i, chunk in enumerate(chunks):
            cid = self._get_chunk_field(chunk, "chunk_id", f"{self._get_chunk_field(chunk, 'doc_id', 'unknown')}_{i}")
            chunk_id_to_faiss_id[cid] = i
            faiss_id_to_chunk_id[i] = cid

        kb["index"] = index
        kb["emb_dim"] = dim
        kb["chunk_id_to_faiss_id"] = chunk_id_to_faiss_id
        kb["faiss_id_to_chunk_id"] = faiss_id_to_chunk_id

        # 重建BM25
        chunk_texts = [self._get_chunk_field(c, "content") for c in chunks]
        kb["bm25"] = BM25Retriever()
        kb["bm25"].fit(chunk_texts)

        self._save_kb(kb_id)

    def is_meta_query(self, query: str) -> bool:
        """识别是否为对知识库整体大纲、文档清单或目录的元查询（Meta Query）"""
        if not query or not query.strip():
            return False
        q = query.lower().strip()
        meta_keywords = [
            '知识库里有什么', '知识库有什么', '包含什么内容', '有哪些文档', '有哪些资料', '有哪些内容',
            '概括知识库', '总结知识库', '知识库目录', '知识库大纲', '包含哪些文件', '主要内容是什么',
            '总体介绍', '包含什么', '库里有什么', '库里包含什么', '文档列表', '资料清单',
            'what is in the knowledge base', 'list documents', 'summarize knowledge base', 'kb contents'
        ]
        if any(kw in q for kw in meta_keywords):
            return True
        if len(q) <= 15 and ('知识库' in q or '库' in q or '文档' in q):
            if any(w in q for w in ['什么', '哪些', '目录', '总结', '概述', '清单', '包含', '介绍']):
                return True
        return False

    def get_kb_meta_summary(self, kb_id: str) -> Dict[str, Any]:
        """构建知识库全局结构化目录与主题大纲总结段落"""
        kb = self.kbs.get(kb_id)
        if not kb:
            return {
                "summary_text": "【知识库全局目录】\n当前知识库为空或尚未导入文档。",
                "results": [],
                "doc_count": 0,
                "chunk_count": 0
            }

        docs = kb.get("documents", {})
        chunks = kb.get("chunks", [])
        kb_name = kb.get("name", kb_id)
        created_at = time.strftime("%Y-%m-%d %H:%M", time.localtime(kb.get("created_at", time.time())))

        doc_list = []
        for doc_id, d in docs.items():
            doc_chunks = [c for c in chunks if self._get_chunk_field(c, "doc_id") == doc_id]
            doc_list.append({
                "filename": d.get("filename", "未知文档"),
                "chunk_count": len(doc_chunks) if doc_chunks else d.get("chunk_count", 0),
                "file_size": d.get("file_size", 0)
            })

        headings = []
        seen_headings = set()
        for c in chunks:
            hp = self._get_chunk_field(c, "heading_path")
            if hp and hp not in seen_headings:
                seen_headings.add(hp)
                headings.append(hp)

        summary_parts = [
            f"【知识库名称】: 《{kb_name}》",
            f"【创建时间】: {created_at}",
            f"【统计概览】: 包含 {len(docs)} 个核心文档，共拆分为 {len(chunks)} 个知识切片",
            "\n【知识库包含的完整文档清单】:"
        ]

        if doc_list:
            for idx, d in enumerate(doc_list, 1):
                size_kb = round(d['file_size'] / 1024, 1)
                summary_parts.append(f"  {idx}. 《{d['filename']}》 (体积: {size_kb} KB, 知识分块数: {d['chunk_count']})")
        else:
            summary_parts.append("  (暂无详细文档清单)")

        if headings:
            summary_parts.append("\n【知识库章节与主题大纲】:")
            for h in headings[:12]:
                summary_parts.append(f"  • {h}")

        summary_text = "\n".join(summary_parts)

        meta_result_chunk = {
            "chunk_index": 0,
            "chunk_id": f"meta_summary_{kb_id}",
            "doc_id": "meta_summary",
            "content": summary_text,
            "rerank_score": 0.99,
            "source": f"知识库《{kb_name}》全局结构化目录与主题大纲",
            "heading_path": "全局元数据概览",
            "node_type": "summary",
            "metadata": {"is_meta_query": True}
        }

        return {
            "summary_text": summary_text,
            "results": [meta_result_chunk],
            "doc_count": len(docs),
            "chunk_count": len(chunks)
        }

    # ---------- Search ----------

    def vector_search(self, kb_id: str, query: str, top_k: int = 10) -> List[Tuple[int, float]]:
        kb = self.kbs.get(kb_id)
        if not kb or not kb["index"]:
            return []
        url = f"{EMBEDDING_API_BASE}/embeddings"
        dim = kb["emb_dim"]
        query_vec = None
        try:
            resp = requests.post(url, json={"input": [query], "model": EMBEDDING_MODEL}, timeout=15.0)
            if resp.status_code == 200:
                query_vec = np.array(resp.json()["data"][0]["embedding"], dtype=np.float32).reshape(1, -1)
        except Exception as e:
            logger.debug("Vector search embedding failed, using fallback: %s", e)

        if query_vec is None:
            # 极速确定性哈希向量（与 _embed_chunks 完全一致）
            import hashlib
            hash_digest = hashlib.md5(query.encode('utf-8')).digest()
            seed = int.from_bytes(hash_digest[:4], 'little')
            rng = np.random.RandomState(seed)
            query_vec = rng.randn(1, dim).astype(np.float32)

        faiss.normalize_L2(query_vec)
        D, I = kb["index"].search(query_vec, top_k)
        results = []
        for idx, score in zip(I[0], D[0]):
            if idx < 0 or idx >= len(kb["chunks"]):
                continue
            if float(score) < 0.40:
                continue
            results.append((int(idx), float(score)))
        return results

    def bm25_search(self, kb_id: str, query: str, top_k: int = 10) -> List[Tuple[int, float]]:
        kb = self.kbs.get(kb_id)
        if not kb or not kb.get("chunks"):
            return []
        return kb["bm25"].search(query, top_k=top_k)

    def hybrid_search(self, kb_id: str, query: str, top_k: int = 5,
                      vector_weight: float = 0.5, bm25_weight: float = 0.5,
                      enable_rerank: bool = False, enable_rewrite: bool = False,
                      enable_guardrails: bool = True,
                      history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        kb = self.kbs.get(kb_id)
        if not kb:
            return {"results": [], "stages": {}, "guardrail_flags": [], "original_query": query, "rewritten_query": query}

        start_time = time.time()
        stages = {"vector": True, "bm25": True, "rerank": False, "rewrite": False, "guardrails": False}
        guardrail_flags = []
        original_query = query
        rewritten_query = query
        query_variants = []

        # 元查询拦截（当用户提问 "知识库里有什么/包含哪些文档" 时，直接注入结构化目录大纲）
        if self.is_meta_query(original_query):
            meta_summary = self.get_kb_meta_summary(kb_id)
            stages["meta_query"] = True
            elapsed_ms = (time.time() - start_time) * 1000
            return {
                "results": meta_summary["results"],
                "stages": stages,
                "guardrail_flags": guardrail_flags,
                "original_query": original_query,
                "rewritten_query": original_query,
                "query_variants": [],
                "elapsed_ms": round(elapsed_ms, 2),
                "is_meta_query": True,
            }

        if enable_guardrails:
            cleaned_query, flags = input_guardrails(query)
            if flags:
                guardrail_flags.extend(flags)
                stages["guardrails"] = True
            query = cleaned_query

        if enable_rewrite:
            rewritten_query, query_variants = query_rewrite(query, history=history)
            if rewritten_query != query:
                stages["rewrite"] = True

        fetch_k = max(top_k * 5, 20)
        search_query = rewritten_query if enable_rewrite else query

        vector_results = self.vector_search(kb_id, search_query, top_k=fetch_k)
        bm25_results = self.bm25_search(kb_id, search_query, top_k=fetch_k)

        if query_variants:
            for variant in query_variants:
                variant_vector = self.vector_search(kb_id, variant, top_k=fetch_k // 2)
                variant_bm25 = self.bm25_search(kb_id, variant, top_k=fetch_k // 2)
                vector_results.extend(variant_vector)
                bm25_results.extend(variant_bm25)

        merged = rrf_merge(
            vector_results,
            bm25_results,
            k=60,
            top_k=max(top_k * 2, 10),
            vector_weight=vector_weight,
            bm25_weight=bm25_weight,
        )

        results = []
        chunks = kb["chunks"]
        for doc_id, score in merged:
            if doc_id < 0 or doc_id >= len(chunks):
                continue
            chunk = chunks[doc_id]
            chunk_doc_id = self._get_chunk_field(chunk, "doc_id", "")
            source_doc = kb.get("documents", {}).get(chunk_doc_id, {})
            results.append({
                "chunk_index": doc_id,
                "chunk_id": self._get_chunk_field(chunk, "chunk_id", ""),
                "doc_id": chunk_doc_id,
                "content": self._get_chunk_field(chunk, "content", ""),
                "rrf_score": round(score, 6),
                "source": source_doc.get("filename", kb.get("source_file", "")),
                "heading_path": self._get_chunk_field(chunk, "heading_path", ""),
                "node_type": self._get_chunk_field(chunk, "node_type", "paragraph"),
                "metadata": self._get_chunk_field(chunk, "metadata", {}),
            })

        # 移除了旧版的保障机制（即无检索结果时强行返回前 K 条切片），以避免由于 FAISS 强制返回无关结果导致的大模型幻觉

        if enable_rerank and results:
            reranked = embedding_rerank(search_query, results)
            if reranked:
                filtered_reranked = [r for r in reranked if r.get("rerank_score", 0) >= 0.40]
                results = filtered_reranked[:top_k]
                stages["rerank"] = True
        else:
            results = results[:top_k]

        elapsed_ms = (time.time() - start_time) * 1000
        self.stats.record_query(
            query=original_query,
            results_count=len(results),
            time_ms=elapsed_ms,
            stages=stages
        )

        return {
            "results": results,
            "stages": stages,
            "guardrail_flags": guardrail_flags,
            "original_query": original_query,
            "rewritten_query": rewritten_query,
            "query_variants": query_variants,
            "elapsed_ms": round(elapsed_ms, 2),
        }

    def search(self, kb_id: str, query: str, top_k: int = 5) -> List[str]:
        result = self.hybrid_search(kb_id, query, top_k=top_k)
        return [r["content"] for r in result["results"]]

    def search_with_metadata(self, kb_id: str, query: str, top_k: int = 5,
                             enable_rerank: bool = True, enable_rewrite: bool = False,
                             enable_guardrails: bool = True,
                             history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        return self.hybrid_search(
            kb_id, query, top_k=top_k,
            enable_rerank=enable_rerank,
            enable_rewrite=enable_rewrite,
            enable_guardrails=enable_guardrails,
            history=history
        )

    # ---------- Listing & Stats ----------

    def list_kbs(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": kb_id,
                "name": kb["name"],
                "chunk_count": len(kb["chunks"]),
                "indexed": kb["index"] is not None,
                "type": kb.get("type", "custom"),
                "source_file": kb.get("source_file", ""),
                "file_size_kb": round(kb.get("file_size", 0) / 1024, 1),
                "created_at": kb.get("created_at", 0),
                "doc_count": len(kb.get("documents", {})),
            }
            for kb_id, kb in self.kbs.items()
        ]

    def delete_kb(self, kb_id: str):
        kb = self.kbs.pop(kb_id, None)
        if kb:
            kb_dir: Path = kb["path"]
            if kb_dir.exists():
                import shutil
                shutil.rmtree(kb_dir, ignore_errors=True)

    def rename_kb(self, kb_id: str, new_name: str, new_description: Optional[str] = None) -> Dict[str, Any]:
        kb = self.kbs.get(kb_id)
        if not kb:
            raise ValueError(f"KB {kb_id} not found")
        if new_name and new_name.strip():
            kb["name"] = new_name.strip()
        if new_description is not None:
            kb["description"] = new_description.strip()
        self._save_kb(kb_id)
        return {
            "id": kb_id,
            "name": kb["name"],
            "description": kb.get("description", ""),
        }

    def get_stats(self) -> Dict[str, Any]:
        return self.stats.to_dict()
