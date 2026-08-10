import os
import json
import asyncio
import re

os.environ["NO_PROXY"] = "localhost,127.0.0.1,::1"
os.environ["no_proxy"] = "localhost,127.0.0.1,::1"
try:
    import httpx
except ImportError:
    httpx = None
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, Response
from pydantic import BaseModel

from services.file_reader import get_question_modules, read_module_content
from services.llm_service import LLMService, build_system_knowledge_prompt, synthesize_rag_response_fallback
from services.tts_service import generate_speech_audio
from services.history_service import (
    get_all_history,
    get_history_by_id,
    save_qa_session,
    update_session,
    delete_history_by_id
)
from services.rag_service import RagService
from services.search_service import web_search_service
from services.skills_service import SkillsService
from services.mcp_service import MCPClient, MCPServer
from services.notification_service import (
    get_all_notifications,
    get_unread_count,
    create_notification,
    mark_as_read,
    mark_all_as_read,
    delete_notification,
)

app = FastAPI(title="AI Voice Knowledge Base Backend Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

llm_service = LLMService(
    api_key="",
    api_base="http://127.0.0.1:1234/v1",
    model="liquid/lfm2-24b-a2b",
    temperature=1.0
)

rag_service = RagService(vector_store_path="data/vector_store")
skills_service = SkillsService(data_path="data/skills")
mcp_client = MCPClient(config_path="data/mcp_servers.json")
mcp_server = MCPServer(skills_service, rag_service, search_service=web_search_service)

current_voice = "zh-CN-XiaoxiaoNeural"
# 语音播报全局开关：False 时跳过 TTS 合成，节省资源
tts_enabled = False
# 语音自动提交全局开关：True 时说话停顿 1.2 秒自动提交
auto_submit_voice = True
# 仅知识库模式全局开关：True 时禁止外部拓展与幻觉，无资料即直接回答“未找到”
strict_kb_mode = False


class ConfigModel(BaseModel):
    api_key: str = ""
    api_base: str = "http://127.0.0.1:1234/v1"
    model: str = "liquid/lfm2-24b-a2b"
    voice: str = "zh-CN-XiaoxiaoNeural"
    temperature: float = 1.0
    rag_enabled: bool = False
    kb_id: Optional[str] = None
    tts_enabled: bool = False
    auto_submit_voice: bool = True
    strict_kb_mode: bool = False
    # 联网搜索管理配置
    search_engine: str = "auto"
    search_top_k: int = 5
    search_retry_enabled: bool = True
    search_filter_portals: bool = True
    search_llm_extraction: bool = True


class StartInterviewModel(BaseModel):
    module_filename: Optional[str] = None
    rag_enabled: bool = False
    kb_id: Optional[str] = None


class FinishInterviewModel(BaseModel):
    module_title: Optional[str] = "AI 知识库问答"
    module_filename: Optional[str] = ""
    messages: List[Dict[str, Any]] = []
    rag_enabled: bool = False
    kb_id: Optional[str] = None


@app.get("/api/modules")
def list_modules():
    return get_question_modules()


@app.post("/api/config")
def save_config(cfg: ConfigModel):
    global current_voice, tts_enabled, auto_submit_voice, strict_kb_mode
    llm_service.set_config(cfg.api_key, cfg.api_base, cfg.model, cfg.temperature)
    web_search_service.set_config(
        search_engine=cfg.search_engine,
        search_top_k=cfg.search_top_k,
        search_retry_enabled=cfg.search_retry_enabled,
        search_filter_portals=cfg.search_filter_portals,
        search_llm_extraction=cfg.search_llm_extraction
    )
    if cfg.voice:
        current_voice = cfg.voice
    tts_enabled = cfg.tts_enabled
    auto_submit_voice = cfg.auto_submit_voice
    strict_kb_mode = cfg.strict_kb_mode
    return {"status": "success", "message": "配置、搜索策略与仅知识库严谨模式已成功保存"}


class LLMTestModel(BaseModel):
    api_key: Optional[str] = ""
    api_base: Optional[str] = "http://127.0.0.1:1234/v1"
    model: Optional[str] = "liquid/lfm2-24b-a2b"


@app.post("/api/llm/test")
def test_llm_connection(req: LLMTestModel):
    """测试指定 LLM API 地址、密钥及模型联通性"""
    import time
    api_base = (req.api_base or "http://127.0.0.1:1234/v1").rstrip("/")
    api_key = req.api_key or "not-needed"
    model = req.model or "liquid/lfm2-24b-a2b"

    url = f"{api_base}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    if "127.0.0.1" in api_base or "localhost" in api_base:
        headers["Host"] = "localhost:1234"

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "hi"}],
        "max_tokens": 5,
        "temperature": 1.0
    }

    start_time = time.time()
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=8)
        latency = int((time.time() - start_time) * 1000)
        if resp.status_code == 200:
            return {
                "status": "success",
                "message": f"连接正常！模型响应成功 ({latency}ms)",
                "latency_ms": latency
            }
        else:
            return {
                "status": "error",
                "message": f"接口响应异常 (HTTP {resp.status_code}): {resp.text[:150]}"
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"无法连接 API 服务 ({api_base}): {str(e)}"
        }


@app.post("/api/llm/models")
def fetch_online_models(req: LLMTestModel):
    """动态拉取服务商或本地 LM Studio / Ollama 在线模型列表"""
    api_base = (req.api_base or "http://127.0.0.1:1234/v1").rstrip("/")
    api_key = req.api_key or "not-needed"

    url = f"{api_base}/models"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    if "127.0.0.1" in api_base or "localhost" in api_base:
        headers["Host"] = "localhost:1234"

    try:
        resp = requests.get(url, headers=headers, timeout=6)
        if resp.status_code == 200:
            data = resp.json()
            model_list = []
            if isinstance(data, dict) and "data" in data and isinstance(data["data"], list):
                for item in data["data"]:
                    if isinstance(item, dict) and "id" in item:
                        model_list.append(item["id"])
            elif isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and "id" in item:
                        model_list.append(item["id"])
                    elif isinstance(item, str):
                        model_list.append(item)
            return {
                "status": "success",
                "models": model_list
            }
        else:
            return {
                "status": "error",
                "message": f"获取在线模型失败 (HTTP {resp.status_code})"
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"连接模型列表失败: {str(e)}"
        }


@app.api_route("/api/llm-proxy/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
async def llm_proxy(
    path: str,
    request: Request,
    authorization: Optional[str] = Header(None),
):
    api_base = llm_service.api_base.rstrip("/")
    target_url = f"{api_base}/{path}"

    headers = {}
    if authorization:
        headers["Authorization"] = authorization
    elif llm_service.api_key:
        headers["Authorization"] = f"Bearer {llm_service.api_key}"

    content_type = request.headers.get("content-type")
    if content_type:
        headers["Content-Type"] = content_type

    body = await request.body()
    processed_body = body
    has_tools = False
    request_tools = []

    if request.method == "POST" and body and content_type and "application/json" in content_type:
        try:
            payload = json.loads(body)
            modified = False

            if "tools" in payload:
                has_tools = True
                request_tools = payload.get("tools", [])

            if "tool_choice" in payload and isinstance(payload["tool_choice"], dict):
                payload["tool_choice"] = "auto"
                modified = True

            if "parallel_tool_calls" in payload:
                del payload["parallel_tool_calls"]
                modified = True

            if has_tools and request_tools and payload.get("messages"):
                msgs = payload["messages"]
                tool_names = [t.get("function", {}).get("name", "") for t in request_tools]
                tool_list_str = ", ".join(tool_names)
                first_tool = request_tools[0].get("function", {})
                first_tool_name = first_tool.get("name", "example_tool")
                first_tool_params = first_tool.get("parameters", {}).get("properties", {})
                example_args = {k: "example" for k in list(first_tool_params.keys())[:2]}

                format_guide = f"""

【IMPORTANT: TOOL CALL FORMAT】
Available tools: {tool_list_str}

You MUST respond with a tool call in this exact JSON format (no other text):
{{
  "tool_calls": [
    {{
      "id": "call_001",
      "type": "function",
      "function": {{
        "name": "{first_tool_name}",
        "arguments": "{{\\"{list(example_args.keys())[0] if example_args else 'param'}\\": \\"{list(example_args.values())[0] if example_args else 'value'}\\"}}"
      }}
    }}
  ]
}}

Put ALL your response inside the function arguments. Do NOT write any text outside the JSON."""

                last_user_idx = None
                for i in range(len(msgs) - 1, -1, -1):
                    if msgs[i].get("role") in ["user", "system"]:
                        last_user_idx = i
                        break

                if last_user_idx is not None:
                    last_msg = msgs[last_user_idx]
                    original_content = last_msg.get("content", "")
                    if "TOOL CALL FORMAT" not in original_content and "tool_calls" not in original_content.lower():
                        last_msg["content"] = original_content + format_guide
                        modified = True

            if modified:
                processed_body = json.dumps(payload).encode("utf-8")
        except (json.JSONDecodeError, TypeError):
            pass

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            resp = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=processed_body,
            )

            resp_content = resp.content
            resp_headers = dict(resp.headers)
            resp_headers.pop("content-length", None)
            resp_headers["access-control-allow-origin"] = "*"

            if (has_tools and path.endswith("chat/completions")
                    and resp.status_code == 200
                    and "application/json" in resp.headers.get("content-type", "")):
                try:
                    resp_json = json.loads(resp_content)
                    choices = resp_json.get("choices", [])
                    need_wrap = False
                    for choice in choices:
                        msg = choice.get("message", {})
                        content = msg.get("content", "")
                        tool_calls = msg.get("tool_calls", [])
                        if content and not tool_calls:
                            need_wrap = True
                            break

                    if need_wrap and request_tools:
                        finish_tool = None
                        for t in request_tools:
                            func_name = t.get("function", {}).get("name", "").lower()
                            if any(kw in func_name for kw in ["finish", "complete", "end", "done", "answer", "respond", "final"]):
                                finish_tool = t
                                break
                        if not finish_tool:
                            finish_tool = request_tools[0]

                        tool_name = finish_tool.get("function", {}).get("name", "finish")
                        for i, choice in enumerate(resp_json["choices"]):
                            msg = choice.get("message", {})
                            content = msg.get("content", "")
                            if content and not msg.get("tool_calls"):
                                wrap_arg = json.dumps({
                                    "result": content,
                                    "summary": content[:200],
                                }, ensure_ascii=False)
                                msg["tool_calls"] = [{
                                    "id": f"call_{i}_0",
                                    "type": "function",
                                    "function": {
                                        "name": tool_name,
                                        "arguments": wrap_arg,
                                    }
                                }]
                                msg["content"] = None

                        resp_content = json.dumps(resp_json).encode("utf-8")
                except (json.JSONDecodeError, TypeError, KeyError):
                    pass

            return Response(
                content=resp_content,
                status_code=resp.status_code,
                headers=resp_headers,
            )
        except httpx.ConnectError as e:
            raise HTTPException(status_code=503, detail=f"无法连接到 LLM 服务器: {str(e)}")
        except httpx.TimeoutException as e:
            raise HTTPException(status_code=504, detail=f"LLM 服务器超时: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"代理请求失败: {str(e)}")


# ---------------- RAG Knowledge Base API Endpoints ----------------

@app.post("/api/knowledge/create")
def create_empty_kb(
    name: str = Form(...),
    description: Optional[str] = Form("")
):
    name_to_use = name.strip() if name and name.strip() else "新建 AI 知识库"
    kb_id = rag_service.create_kb(name_to_use)
    if description and kb_id in rag_service.kbs:
        rag_service.kbs[kb_id]["description"] = description
        rag_service._save_kb(kb_id)
    kb_info = next((kb for kb in rag_service.list_kbs() if kb["id"] == kb_id), None)
    return {
        "status": "success",
        "kb_id": kb_id,
        "message": f"知识库 [{name_to_use}] 已成功创建",
        "kb_info": kb_info
    }


@app.post("/api/knowledge/{kb_id}/documents/upload")
async def upload_documents_to_existing_kb(
    kb_id: str,
    files: List[UploadFile] = File(...)
):
    kb_list = rag_service.list_kbs()
    exists = any(kb["id"] == kb_id for kb in kb_list)
    if not exists:
        raise HTTPException(status_code=404, detail=f"Knowledge base {kb_id} not found")

    uploaded_docs = []
    total_size = 0
    for upload in files:
        content = await upload.read()
        total_size += len(content)
        doc_id = rag_service.add_document(kb_id, upload.filename or "document.md", content)
        uploaded_docs.append({"doc_id": doc_id, "filename": upload.filename, "size": len(content)})

    rag_service.build_index(kb_id)
    kb_info = next((kb for kb in rag_service.list_kbs() if kb["id"] == kb_id), None)
    return {
        "status": "success",
        "kb_id": kb_id,
        "message": f"已成功向知识库追加 {len(uploaded_docs)} 个文档并更新向量索引",
        "kb_info": kb_info,
        "documents": uploaded_docs
    }


@app.post("/api/knowledge/upload")
async def upload_kb(
    kb_name: Optional[str] = Form("通用 AI 知识库"),
    files: List[UploadFile] = File(...)
):
    name_to_use = kb_name.strip() if (kb_name and kb_name.strip()) else "通用 AI 知识库"
    kb_id = rag_service.create_kb(name_to_use)
    total_size = 0
    uploaded_docs = []
    for upload in files:
        content = await upload.read()
        total_size += len(content)
        doc_id = rag_service.add_document(kb_id, upload.filename or "document.md", content)
        uploaded_docs.append({"doc_id": doc_id, "filename": upload.filename, "size": len(content)})
    rag_service.build_index(kb_id)
    kb_info = next((kb for kb in rag_service.list_kbs() if kb["id"] == kb_id), None)
    return {
        "kb_id": kb_id,
        "message": "知识库已创建并索引完成",
        "kb_info": kb_info,
        "documents": uploaded_docs
    }


@app.get("/api/knowledge/list")
def list_kb(page: int = 1, size: int = 20):
    all_kbs = rag_service.list_kbs()
    total = len(all_kbs)
    start = (page - 1) * size
    end = start + size
    items = all_kbs[start:end]
    return {"items": items, "total": total, "page": page, "size": size}


@app.delete("/api/knowledge/{kb_id}")
def delete_kb(kb_id: str):
    kb_list = rag_service.list_kbs()
    exists = any(kb["id"] == kb_id for kb in kb_list)
    if not exists:
        raise HTTPException(status_code=404, detail=f"Knowledge base {kb_id} not found")
    rag_service.delete_kb(kb_id)
    return {"status": "success", "message": f"KB {kb_id} 已删除"}


@app.put("/api/knowledge/{kb_id}")
def update_kb(
    kb_id: str,
    name: str = Form(...),
    description: Optional[str] = Form("")
):
    kb_list = rag_service.list_kbs()
    exists = any(kb["id"] == kb_id for kb in kb_list)
    if not exists:
        raise HTTPException(status_code=404, detail=f"Knowledge base {kb_id} not found")
    try:
        updated = rag_service.rename_kb(kb_id, name, description)
        return {"status": "success", "message": "知识库重命名成功", "kb": updated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/knowledge/reindex")
async def reindex_kb(kb_id: str = Form(...)):
    kb_list = rag_service.list_kbs()
    exists = any(kb["id"] == kb_id for kb in kb_list)
    if not exists:
        raise HTTPException(status_code=404, detail=f"Knowledge base {kb_id} not found")
    try:
        rag_service.build_index(kb_id)
        return {"status": "success", "message": f"KB {kb_id} 重新索引完成"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/knowledge/{kb_id}/search")
def search_kb(kb_id: str, query: str, top_k: int = 5, enable_rerank: bool = True, enable_rewrite: bool = False):
    result = rag_service.search_with_metadata(
        kb_id, query, top_k=top_k,
        enable_rerank=enable_rerank,
        enable_rewrite=enable_rewrite
    )
    if isinstance(result, dict):
        res_list = result.get("results") or result.get("chunks") or []
        result["results"] = res_list
        result["chunks"] = res_list
    return result


@app.get("/api/knowledge/{kb_id}/documents")
def list_kb_documents(kb_id: str):
    kb_list = rag_service.list_kbs()
    exists = any(kb["id"] == kb_id for kb in kb_list)
    if not exists:
        raise HTTPException(status_code=404, detail=f"Knowledge base {kb_id} not found")
    docs = rag_service.list_documents(kb_id)
    return {"kb_id": kb_id, "documents": docs}


@app.delete("/api/knowledge/{kb_id}/documents/{doc_id}")
def delete_kb_document(kb_id: str, doc_id: str):
    kb_list = rag_service.list_kbs()
    exists = any(kb["id"] == kb_id for kb in kb_list)
    if not exists:
        raise HTTPException(status_code=404, detail=f"Knowledge base {kb_id} not found")
    try:
        result = rag_service.remove_document(kb_id, doc_id)
        return {"status": "success", "message": f"Document {doc_id} 已删除", "detail": result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/knowledge/{kb_id}/documents/{doc_id}/preview")
def preview_kb_document(kb_id: str, doc_id: str, max_chars: int = 2000):
    kb_list = rag_service.list_kbs()
    exists = any(kb["id"] == kb_id for kb in kb_list)
    if not exists:
        raise HTTPException(status_code=404, detail=f"Knowledge base {kb_id} not found")
    preview = rag_service.get_document_preview(kb_id, doc_id, max_chars=max_chars)
    if not preview:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
    return preview


@app.get("/api/knowledge/stats")
def get_rag_stats():
    return rag_service.get_stats()


@app.get("/api/knowledge/{kb_id}/vectors")
def get_kb_vectors(kb_id: str, limit: int = 20):
    """返回知识库中切片的真实向量数据，用于前端可视化"""
    import numpy as np
    kb = rag_service.kbs.get(kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail=f"Knowledge base {kb_id} not found")
    if not kb["index"]:
        raise HTTPException(status_code=400, detail="知识库尚未构建向量索引")

    chunks = kb["chunks"]
    limit = min(limit, len(chunks))
    if limit == 0:
        return {"chunks": [], "emb_dim": kb["emb_dim"], "total_chunks": 0}

    # 重建向量（从索引中 reconstruct，避免重复调用embedding）
    try:
        vectors = []
        for i in range(limit):
            vec = kb["index"].reconstruct(i)
            vec = np.asarray(vec, dtype=np.float32)
            vectors.append({
                "chunk_index": i,
                "chunk_id": rag_service._get_chunk_field(chunks[i], "chunk_id", ""),
                "doc_id": rag_service._get_chunk_field(chunks[i], "doc_id", ""),
                "source": kb.get("documents", {}).get(
                    rag_service._get_chunk_field(chunks[i], "doc_id", ""), {}
                ).get("filename", kb.get("source_file", "")),
                "content": rag_service._get_chunk_field(chunks[i], "content", "")[:300],
                "heading_path": rag_service._get_chunk_field(chunks[i], "heading_path", ""),
                "node_type": rag_service._get_chunk_field(chunks[i], "node_type", "paragraph"),
                "vector_preview": vec[:64].tolist(),
                "vector_stats": {
                    "min": float(vec.min()),
                    "max": float(vec.max()),
                    "mean": float(vec.mean()),
                    "std": float(vec.std()),
                    "norm": float(np.linalg.norm(vec)),
                },
            })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重建向量失败: {e}")

    # 计算向量间相似度矩阵（取前 limit 个）
    sim_matrix = []
    for i in range(limit):
        v_i = kb["index"].reconstruct(i)
        row = []
        for j in range(limit):
            v_j = kb["index"].reconstruct(j)
            # 内积（向量已归一化，等价于余弦相似度）
            sim = float(np.dot(v_i, v_j))
            row.append(round(sim, 4))
        sim_matrix.append(row)

    # 维度统计：将 1536 维分成 64 个桶，统计每个桶的平均值
    dim_stats = []
    sample_vec = kb["index"].reconstruct(0)
    dim = len(sample_vec)
    bucket_size = max(dim // 64, 1)
    for b in range(64):
        start = b * bucket_size
        end = min(start + bucket_size, dim)
        bucket_vals = []
        for i in range(min(limit, 10)):  # 取前10个向量的平均值
            v = kb["index"].reconstruct(i)
            bucket_vals.extend(v[start:end].tolist())
        if bucket_vals:
            arr = np.array(bucket_vals)
            dim_stats.append({
                "bucket": b,
                "range": [start, end],
                "mean": float(arr.mean()),
                "max": float(arr.max()),
                "min": float(arr.min()),
            })

    return {
        "chunks": vectors,
        "emb_dim": dim,
        "total_chunks": len(chunks),
        "showing": limit,
        "similarity_matrix": sim_matrix,
        "dim_stats": dim_stats,
        "vector_type": "FAISS_IndexFlatIP",
        "model": "e5-base",
    }


# ---------------- Interview API Endpoints ----------------

def build_rag_context(kb_id: Optional[str], query: str, top_k: int = 8,
                      history: Optional[List[Dict[str, Any]]] = None) -> tuple[str, List[Dict[str, Any]], Dict[str, Any]]:
    if not kb_id:
        return "", [], {}
    try:
        result = rag_service.search_with_metadata(
            kb_id, query, top_k=top_k,
            enable_rerank=True,
            enable_rewrite=True,
            enable_guardrails=True,
            history=history
        )
        results = result.get("results", [])
        if not results:
            return "", [], result
        context_parts = []
        for i, r in enumerate(results, 1):
            score = r.get("rerank_score", r.get("rrf_score", 0))
            context_parts.append(f"[参考资料 {i}] (相关度: {score})\n{r['content']}")
        context_text = "\n\n".join(context_parts)
        return context_text, results, result
    except Exception as e:
        print(f"RAG search error: {e}")
        return "", [], {"error": str(e)}


@app.post("/api/interview/start")
@app.post("/api/chat/start")
async def start_interview(req: StartInterviewModel):
    content = ""
    if req.module_filename:
        content = read_module_content(req.module_filename)
    rag_chunks = []
    rag_meta = {}

    # rag_enabled 取决于前端，不再受 skills_service 限制，保证 RAG 流程始终正常触发

    if rag_enabled and req.kb_id:
        rag_text, rag_chunks, rag_meta = build_rag_context(req.kb_id, query="知识库主题概述与核心内容", top_k=8)
        if rag_text:
            content = f"【RAG 检索增强真实上下文】\n{rag_text}\n\n" + content
    system_prompt = build_system_knowledge_prompt(knowledge_base=content)
    first_messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "你好，请作为 AI 知识库专家向我问好，并告诉我你可以提供哪些帮助。"}
    ]
    ai_reply = llm_service.chat_completion(first_messages, temperature=1.0)
    audio_path = await generate_speech_audio(ai_reply, voice=current_voice) if tts_enabled else None
    return {
        "reply_text": ai_reply,
        "audio_url": f"/api/audio/download?path={audio_path}" if audio_path else None,
        "messages": first_messages + [{"role": "assistant", "content": ai_reply}],
        "rag_chunks": rag_chunks,
        "rag_meta": rag_meta
    }


@app.post("/api/interview/chat")
@app.post("/api/chat")
async def interview_chat(payload: dict):
    messages = payload.get("messages", [])
    user_answer = payload.get("user_answer", "")
    rag_enabled = payload.get("rag_enabled", False)
    kb_id = payload.get("kb_id")

    # rag_enabled 取决于前端，不再受 skills_service 限制，保证 RAG 流程始终正常触发

    if user_answer:
        messages.append({"role": "user", "content": user_answer})

    rag_chunks = []
    rag_meta = {}
    if rag_enabled and kb_id and user_answer:
        rag_text, rag_chunks, rag_meta = build_rag_context(kb_id, query=user_answer, top_k=8, history=messages)
        if rag_text:
            system_msg_found = False
            for i, msg in enumerate(messages):
                if msg.get("role") == "system":
                    original_content = msg["content"]
                    messages[i] = {
                        "role": "system",
                        "content": f"【RAG 检索增强真实上下文】\n{rag_text}\n\n=== 原始系统提示 ===\n{original_content}"
                    }
                    system_msg_found = True
                    break
            if not system_msg_found:
                messages.insert(0, {"role": "system", "content": f"【RAG 检索增强真实上下文】\n{rag_text}"})

    ai_reply = llm_service.chat_completion(messages, temperature=1.0)
    messages.append({"role": "assistant", "content": ai_reply})
    audio_path = await generate_speech_audio(ai_reply, voice=current_voice) if tts_enabled else None
    return {
        "reply_text": ai_reply,
        "audio_url": f"/api/audio/download?path={audio_path}" if audio_path else None,
        "messages": messages,
        "turn_eval": None,
        "rag_chunks": rag_chunks,
        "rag_meta": rag_meta
    }


@app.post("/api/interview/chat/stream")
@app.post("/api/chat/stream")
async def interview_chat_stream(request: Request, payload: dict):
    messages = payload.get("messages", [])
    user_answer = payload.get("user_answer", "")
    rag_enabled = payload.get("rag_enabled", False)
    kb_id = payload.get("kb_id")
    # 会话 ID：前端传入则更新已有记录，不传则流结束后自动新建一条
    session_id = payload.get("session_id")

    # rag_enabled 取决于前端，不再受 skills_service 限制，保证 RAG 流程始终正常触发

    if user_answer:
        messages.append({"role": "user", "content": user_answer})

    is_strict_kb = payload.get("strict_kb_mode", False) or strict_kb_mode
    web_search_enabled = payload.get("web_search_enabled", False)
    if is_strict_kb:
        web_search_enabled = False  # 仅知识库严谨模式下：关停外网搜索

    rag_chunks = []
    rag_meta = {}
    if rag_enabled and user_answer:
        if not kb_id:
            all_kbs = rag_service.list_kbs()
            if all_kbs:
                kb_id = all_kbs[0]["id"]
        if kb_id:
            rag_text, rag_chunks, rag_meta = build_rag_context(kb_id, query=user_answer, top_k=8, history=messages)
            
            if is_strict_kb:
                # 🛡 仅知识库严格模式
                if not rag_text or not rag_chunks:
                    strict_no_rag_instruction = (
                        "【🛡 仅知识库严谨回答模式激活】\n"
                        "⚠️ 注意：当前在知识库中未检索到任何与问题相关的资料切片。\n\n"
                        "【铁律指令】：你必须绝对严格遵守仅知识库回答原则！由于知识库查无资料，"
                        "你必须直接且仅能回答：“⚠️ 抱歉，当前知识库中未检索到与该问题相关的资料内容。”"
                        "严禁使用你的通用训练知识、猜测或补充任何外部内容！没有就是没有！"
                    )
                    messages.insert(0, {"role": "system", "content": strict_no_rag_instruction})
                else:
                    strict_instruction = (
                        "【RAG 检索增强真实上下文】\n" + rag_text + "\n\n"
                        "【🛡 仅知识库严格回答原则 (STRICT KB ONLY)】：\n"
                        "1. 你的回答必须 100% 绝对建立在上方【RAG 检索增强真实上下文】提供的资料之上。\n"
                        "2. 严禁使用你训练数据中的任何未经知识库证实的外部知识、推测或联想！严禁自由发挥与胡编乱造！没有就是没有！\n"
                        "3. 如果上述资料不足以完整回答用户提问，请仅根据资料中提到的部分作答，未提及部分明确指出：“知识库中未记载”；若完全没有提及，直接回答：“⚠️ 抱歉，当前知识库中未检索到相关资料”。\n"
                        "4. 必须在正文引用断句末尾明确标注对应的数字角标 [1] 或 [2]。"
                    )
                    system_msg_found = False
                    for i, msg in enumerate(messages):
                        if msg.get("role") == "system":
                            original_content = msg["content"]
                            messages[i] = {
                                "role": "system",
                                "content": f"{strict_instruction}\n\n=== 原始系统提示 ===\n{original_content}"
                            }
                            system_msg_found = True
                            break
                    if not system_msg_found:
                        messages.insert(0, {"role": "system", "content": strict_instruction})
            else:
                # 普通 RAG 检索增强模式
                if rag_text:
                    system_msg_found = False
                    instruction = (
                        "【RAG 检索增强真实上下文】\n" + rag_text + "\n\n"
                        "【强制引用角标指令】：\n"
                        "请结合上述知识库资料回答用户提问。必须在回答中引用了上述资料的段落末尾，明确标注对应的数字角标 [1] 或 [2] 或 [1, 2]（例如：根据线程池核心原理[1]，任务入队列...），以便用户核对来源！"
                    )
                    for i, msg in enumerate(messages):
                        if msg.get("role") == "system":
                            original_content = msg["content"]
                            messages[i] = {
                                "role": "system",
                                "content": f"{instruction}\n\n=== 原始系统提示 ===\n{original_content}"
                            }
                            system_msg_found = True
                            break
                    if not system_msg_found:
                        messages.insert(0, {"role": "system", "content": instruction})

    web_results = []
    if web_search_enabled and user_answer:
        web_text, web_results = web_search_service.build_search_context(user_answer, top_k=5, llm_service=llm_service)
        if web_text:
            system_msg_found = False
            web_instruction = (
                "【🌍 实时联网搜索上下文】\n" + web_text + "\n\n"
                "【强制引用角标指令】：\n"
                "请结合上述全网搜索资料回答用户提问。必须在回答中引用了网页资料的段落末尾，明确标注对应的数字角标 [1] 或 [2]（例如：根据最新报道[1]...），以便用户核对来源！"
            )
            for i, msg in enumerate(messages):
                if msg.get("role") == "system":
                    original_content = msg["content"]
                    messages[i] = {
                        "role": "system",
                        "content": f"{web_instruction}\n\n{original_content}"
                    }
                    system_msg_found = True
                    break
            if not system_msg_found:
                messages.insert(0, {"role": "system", "content": web_instruction})

    # 构建中间思考与检索过程步骤 (Trae / CodeBuddy / DeepSeek R1 风格)
    steps = [
        {"id": "start", "text": f"🎯 收到提问: 「{user_answer[:35]}...」", "status": "done"}
    ]

    if web_search_enabled and user_answer:
        search_target = web_search_service.extract_keywords(user_answer, llm_service=llm_service)
        if search_target:
            steps.append({"id": "keywords", "text": f"🔍 优化提取搜索核心词: 「{search_target}」", "status": "done"})
        steps.append({"id": "web_search", "text": f"🌍 动态联网检索 (获取 {len(web_results)} 条全网网页来源)", "status": "done"})

    if rag_enabled and user_answer:
        steps.append({"id": "rag_search", "text": f"📚 检索本地 FAISS 向量知识库 (关联 {len(rag_chunks)} 块知识切片)", "status": "done"})

    # 🛡️ 硬拦截：RAG 开启但知识库未检索到任何资料 → 直接返回友好提示，不走 LLM
    kb_no_result_reply = None
    if rag_enabled and user_answer and not rag_chunks:
        kb_no_result_reply = (
            "⚠️ 抱歉，当前知识库中未检索到与该问题相关的资料内容。\n\n"
            "您可以尝试：\n"
            "1. 换个关键词重新提问\n"
            "2. 检查知识库中是否包含该领域的内容\n"
            "3. 联系管理员补充相关文档资料。"
        )
        steps.append({"id": "no_result", "text": "🚫 知识库未检索到相关资料，触发硬拦截（零幻觉）", "status": "done"})
    else:
        steps.append({"id": "reasoning", "text": "🧠 大模型整合多源资料与逻辑推导生成中...", "status": "active"})

    # 🆕 首次提问时立即创建会话记录，让侧边栏马上可见（不等流结束）
    if not session_id:
        try:
            init_messages = [m for m in messages if m.get("role") != "system"]
            new_record = save_qa_session(
                title=(user_answer[:30] + "...") if user_answer and len(user_answer) > 30 else (user_answer or "AI 知识库问答会话"),
                kb_id=kb_id,
                dialog_messages=init_messages,
                rag_references=[],
                web_results=[]
            )
            session_id = new_record.get("id")
        except Exception as e:
            print(f"⚠️ 会话预创建失败: {e}")

    async def event_generator():
        # 🆕 立即通知前端：会话已创建（首个事件，让前端尽早拿到 session_id）
        if session_id:
            created_data = json.dumps({'type': 'session_created', 'session_id': session_id}, ensure_ascii=False)
            yield f"data: {created_data}\n\n"

        # 推送中间思考步骤状态
        step_data = json.dumps({
            'type': 'status_step',
            'steps': steps,
            'is_thinking': True
        }, ensure_ascii=False)
        yield f"data: {step_data}\n\n"

        if web_results:
            web_data = json.dumps({
                'type': 'web_search',
                'web_results': web_results
            }, ensure_ascii=False)
            yield f"data: {web_data}\n\n"

        if rag_chunks:
            rag_data = json.dumps({
                'type': 'rag',
                'rag_chunks': rag_chunks,
                'rag_meta': rag_meta
            }, ensure_ascii=False)
            yield f"data: {rag_data}\n\n"

        full_reply = ""
        has_llm_tokens = False
        stream_temp = 0.0 if is_strict_kb else 0.3

        # 🛡️ 硬拦截分支：知识库无资料时直接推送友好提示，绕过 LLM
        if kb_no_result_reply:
            # 按行推送，模拟流式效果，保持 UX 流畅
            for line in kb_no_result_reply.split('\n'):
                if line:
                    token_data = json.dumps({'type': 'token', 'content': line + '\n'}, ensure_ascii=False)
                    yield f"data: {token_data}\n\n"
                    full_reply += line + '\n'
                else:
                    token_data = json.dumps({'type': 'token', 'content': '\n'}, ensure_ascii=False)
                    yield f"data: {token_data}\n\n"
                    full_reply += '\n'
            has_llm_tokens = True
        else:
            try:
                for chunk in llm_service.chat_completion_stream(messages, temperature=stream_temp):
                    if await request.is_disconnected():
                        print("🛑 [Stream Aborted] 客户端手动停止回答，真实切断后台 LLM 连接并停止生成")
                        return
                    if chunk and not chunk.startswith("【无法连接") and not chunk.startswith("【API 请求异常"):
                        has_llm_tokens = True
                        full_reply += chunk
                        token_data = json.dumps({'type': 'token', 'content': chunk}, ensure_ascii=False)
                        yield f"data: {token_data}\n\n"
            except Exception as e:
                print(f"Stream error: {e}")

        def is_truncated(text: str) -> bool:
            """判断 LLM 输出是否真正在半句中途发生中断（排除 Markdown 引用与结构闭合）"""
            s = text.strip()
            if not s or len(s) < 30:
                return False
            # 完整结尾判断：包含句号、感叹号、问号、分号、方括号(引用]、圆括号)、代码块反引号、星号、分割线、换行符
            if re.search(r'[。！？；\.\!\?\]\)\}\"`\*\-\n]\s*$', s):
                return False
            return True

        # 自动续写循环：最多续写 2 次，且严格校验避免重复小节生成
        max_continuations = 2
        continuation_count = 0
        while has_llm_tokens and is_truncated(full_reply) and continuation_count < max_continuations:
            if await request.is_disconnected():
                print("🛑 [Stream Aborted] 客户端已断开，取消自动续写")
                return
            continuation_count += 1
            print(f"[Auto-Continuation {continuation_count}] 检测到真正的中途半句截断，触发续写...")
            continuation_messages = list(messages)
            continuation_messages.append({"role": "assistant", "content": full_reply})
            continuation_messages.append({
                "role": "user",
                "content": "【系统自动续写指令】：你的上一次回答在半句处中断。请紧接最后半句的末尾字符继续输出剩余内容，严禁重复前面的任何标题、段落或小节！"
            })
            continuation_text = ""
            try:
                for chunk in llm_service.chat_completion_stream(continuation_messages, temperature=1.0):
                    if await request.is_disconnected():
                        print("🛑 [Stream Aborted] 客户端手动停止回答，真实切断后台 LLM 续写连接")
                        return
                    if chunk and not chunk.startswith("【无法连接") and not chunk.startswith("【API 请求异常"):
                        # 若续写内容开头包含了已有标题（如 ### 贪吃蛇），说明 LLM 从头重写，立即终止重复生成
                        if continuation_text == "" and re.match(r'^\s*#{1,4}\s*', chunk):
                            print("⚠️ 发现 LLM 尝试重复生成小节标题，自动截断避免重复")
                            break
                        continuation_text += chunk
                        full_reply += chunk
                        token_data = json.dumps({'type': 'token', 'content': chunk}, ensure_ascii=False)
                        yield f"data: {token_data}\n\n"
            except Exception as e:
                print(f"Auto-continuation stream error: {e}")
                break
            if not continuation_text.strip():
                break

        # 如果本地/在线 LLM 服务未配置或无法连接，则由智能 RAG 降级生成引擎回答
        if not has_llm_tokens:
            full_reply = ""
            for chunk in synthesize_rag_response_fallback(user_answer, rag_chunks):
                full_reply += chunk
                token_data = json.dumps({'type': 'token', 'content': chunk}, ensure_ascii=False)
                yield f"data: {token_data}\n\n"

        messages.append({"role": "assistant", "content": full_reply})
        audio_path = await generate_speech_audio(full_reply, voice=current_voice) if tts_enabled else None
        audio_url = f"/api/audio/download?path={audio_path}" if audio_path else None

        # 自动持久化会话：更新已有记录（首次已在 stream 开始前创建）
        try:
            if session_id:
                update_session(
                    session_id=session_id,
                    dialog_messages=messages,
                    rag_chunks=rag_chunks,
                    web_results=web_results
                )
        except Exception as e:
            print(f"⚠️ 会话自动持久化失败: {e}")

        done_data = json.dumps({
            'type': 'done',
            'audio_url': audio_url,
            'turn_eval': None,
            'rag_chunks': rag_chunks,
            'web_results': web_results,
            'session_id': session_id
        }, ensure_ascii=False)
        yield f"data: {done_data}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    })


@app.post("/api/interview/finish")
@app.post("/api/chat/finish")
def finish_session(req: FinishInterviewModel):
    saved_record = save_qa_session(
        title=req.module_title or "AI 知识库问答会话",
        kb_id=req.kb_id,
        dialog_messages=[m for m in req.messages if m.get("role") != "system"]
    )
    
    create_notification(
        notification_type="qa_session",
        title=f"💡 知识库问答会话已保存",
        content=f"主题：{saved_record['title']} · 共包含 {saved_record['query_count']} 条问答交互",
        related_id=saved_record["id"],
        extra={
            "query_count": saved_record["query_count"],
            "title": saved_record["title"],
        },
    )
    
    return saved_record


@app.get("/api/interview/history")
def list_history():
    return get_all_history()


@app.get("/api/interview/history/{session_id}")
def get_history_detail(session_id: str):
    rec = get_history_by_id(session_id)
    if not rec:
        raise HTTPException(status_code=404, detail="History record not found")
    return rec


@app.delete("/api/interview/history/{session_id}")
def delete_history(session_id: str):
    success = delete_history_by_id(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"status": "success", "message": "记录已成功删除"}

@app.get("/api/history")
def list_history_all():
    """Return all interview history records."""
    return get_all_history()

@app.get("/api/history/{session_id}")
def get_history(session_id: str):
    """Return a specific history record."""
    rec = get_history_by_id(session_id)
    if not rec:
        raise HTTPException(status_code=404, detail="History record not found")
    return rec

@app.get("/api/history/latest")
def get_latest_history():
    """Return the most recent history record."""
    records = get_all_history()
    if not records:
        raise HTTPException(status_code=404, detail="No history records")
    return records[0]


@app.get("/api/notifications")
def list_notifications():
    return get_all_notifications()


@app.get("/api/notifications/unread-count")
def unread_count():
    return {"count": get_unread_count()}


@app.post("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str):
    success = mark_as_read(notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success"}


@app.post("/api/notifications/read-all")
def mark_all_notifications_read():
    count = mark_all_as_read()
    return {"status": "success", "marked_count": count}


@app.delete("/api/notifications/{notification_id}")
def delete_notification_endpoint(notification_id: str):
    success = delete_notification(notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success"}


@app.get("/api/audio/download")
def download_audio(path: str):
    if path and os.path.exists(path):
        return FileResponse(path, media_type="audio/mpeg")
    raise HTTPException(status_code=404, detail="Audio file not found")


# ---------------- Skills API Endpoints ----------------

@app.get("/api/skills")
def list_skills(category: Optional[str] = None, enabled_only: bool = False):
    return skills_service.list_skills(category=category, enabled_only=enabled_only)


@app.get("/api/skills/{skill_id}")
def get_skill_detail(skill_id: str):
    skill = skills_service.get_skill(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill


@app.post("/api/skills")
async def create_skill(payload: dict):
    name = payload.get("name", "")
    description = payload.get("description", "")
    if not name:
        raise HTTPException(status_code=400, detail="Skill name is required")
    return skills_service.create_skill(
        name=name,
        description=description,
        category=payload.get("category", "custom"),
        tools=payload.get("tools", []),
        prompts=payload.get("prompts", []),
        resources=payload.get("resources", []),
        config=payload.get("config", {}),
    )


@app.post("/api/skills/generate")
async def generate_skill(payload: dict):
    description = payload.get("description", "")
    if not description:
        raise HTTPException(status_code=400, detail="Description is required")
    try:
        return skills_service.generate_from_skill_description(description, llm_service)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/skills/{skill_id}")
async def update_skill(skill_id: str, payload: dict):
    skill = skills_service.update_skill(skill_id, **payload)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill


@app.delete("/api/skills/{skill_id}")
def delete_skill(skill_id: str):
    success = skills_service.delete_skill(skill_id)
    if not success:
        raise HTTPException(status_code=404, detail="Skill not found or built-in skill cannot be deleted")
    return {"status": "success", "message": "Skill deleted successfully"}


@app.post("/api/skills/{skill_id}/toggle")
async def toggle_skill(skill_id: str, payload: dict):
    enabled = payload.get("enabled", True)
    skill = skills_service.toggle_skill(skill_id, enabled)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill


# ---------------- MCP API Endpoints ----------------

@app.get("/api/mcp/servers")
def list_mcp_servers():
    return mcp_client.list_servers()


@app.post("/api/mcp/servers")
async def add_mcp_server(payload: dict):
    name = payload.get("name", "")
    server_type = payload.get("type", "stdio")
    if not name:
        raise HTTPException(status_code=400, detail="Server name is required")
    return mcp_client.add_server(
        name=name,
        server_type=server_type,
        command=payload.get("command", ""),
        args=payload.get("args", []),
        url=payload.get("url", ""),
    )


@app.delete("/api/mcp/servers/{server_id}")
def remove_mcp_server(server_id: str):
    success = mcp_client.remove_server(server_id)
    if not success:
        raise HTTPException(status_code=404, detail="MCP Server not found")
    return {"status": "success", "message": "MCP Server removed successfully"}


@app.post("/api/mcp/servers/{server_id}/connect")
async def connect_mcp_server(server_id: str):
    success = await mcp_client.connect_server(server_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to connect to MCP server")
    return {"status": "success", "message": "Connected successfully"}


@app.post("/api/mcp/servers/{server_id}/disconnect")
async def disconnect_mcp_server(server_id: str):
    mcp_client.disconnect_server(server_id)
    return {"status": "success", "message": "Disconnected successfully"}


@app.post("/api/mcp/servers/{server_id}/tools/{tool_name}")
async def call_mcp_tool(server_id: str, tool_name: str, payload: dict):
    try:
        arguments = payload.get("arguments", {})
        result = await mcp_client.call_tool(server_id, tool_name, arguments)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/mcp")
async def mcp_server_endpoint(payload: dict):
    return mcp_server.handle_request(payload)


@app.get("/api/mcp/sse")
async def mcp_sse_endpoint():
    from fastapi.responses import StreamingResponse
    import asyncio

    async def event_generator():
        yield "event: message\ndata: " + json.dumps({
            "jsonrpc": "2.0",
            "method": "notifications/initialized",
        }, ensure_ascii=False) + "\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
