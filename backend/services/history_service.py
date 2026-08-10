import os
import json
import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))

logger = logging.getLogger(__name__)
HISTORY_FILE = os.path.join(DATA_DIR, "history.json")

def _ensure_data_file():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=2)

def get_all_history() -> List[Dict[str, Any]]:
    """获取所有历史面试记录，按时间倒序排列"""
    _ensure_data_file()
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            records = json.load(f)
            return sorted(records, key=lambda x: x.get("created_at", ""), reverse=True)
    except Exception as e:
        logger.error("Error loading history: %s", e)
        return []

def get_history_by_id(session_id: str) -> Optional[Dict[str, Any]]:
    """按 ID 查询某次面试的详细报告"""
    records = get_all_history()
    for rec in records:
        if rec.get("id") == session_id:
            return rec
    return None

def save_qa_session(
    title: str,
    kb_id: Optional[str],
    dialog_messages: List[Dict[str, Any]],
    rag_references: Optional[List[Dict[str, Any]]] = None,
    web_results: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """保存一次完整的 AI 知识库问答会话到本地 JSON 数据库"""
    _ensure_data_file()

    session_id = str(uuid.uuid4())
    user_queries = [m.get("content", "") for m in dialog_messages if m.get("role") == "user"]
    summary = user_queries[0] if user_queries else "知识库问答会话"
    if len(summary) > 30:
        summary = summary[:30] + "..."

    record = {
        "id": session_id,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "title": title or summary,
        "kb_id": kb_id,
        "summary": summary,
        "query_count": len(user_queries),
        "dialog_messages": dialog_messages,
        "rag_references": rag_references or [],
        "web_results": web_results or []
    }

    records = get_all_history()
    records.append(record)

    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    return record


def update_session(
    session_id: str,
    dialog_messages: List[Dict[str, Any]],
    rag_chunks: Optional[List[Dict[str, Any]]] = None,
    web_results: Optional[List[Dict[str, Any]]] = None,
    title: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """更新已有会话记录的 messages / rag_chunks / web_results / title。

    - 用于流式问答结束后自动持久化最新对话。
    - 若记录不存在返回 None。
    """
    records = get_all_history()
    for rec in records:
        if rec.get("id") == session_id:
            # 仅持久化非 system 消息（与历史展示一致）
            non_system_msgs = [m for m in dialog_messages if m.get("role") != "system"]
            rec["dialog_messages"] = non_system_msgs
            user_queries = [m.get("content", "") for m in non_system_msgs if m.get("role") == "user"]
            rec["query_count"] = len(user_queries)
            if user_queries:
                summary = user_queries[0]
                if len(summary) > 30:
                    summary = summary[:30] + "..."
                rec["summary"] = summary
                # 仅当原标题为空或默认值时才用首问覆盖
                if not rec.get("title") or rec.get("title") in ("AI 知识库问答会话", "知识库问答会话"):
                    rec["title"] = summary
            if rag_chunks is not None:
                rec["rag_references"] = rag_chunks
            else:
                rec["rag_references"] = rec.get("rag_references", [])
            if web_results is not None:
                rec["web_results"] = web_results
            else:
                rec["web_results"] = rec.get("web_results", [])
            if title:
                rec["title"] = title
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump(records, f, ensure_ascii=False, indent=2)
            return rec
    return None


def delete_history_by_id(session_id: str) -> bool:
    """删除指定 ID 的历史记录"""
    records = get_all_history()
    filtered = [r for r in records if r.get("id") != session_id]
    if len(filtered) < len(records):
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(filtered, f, ensure_ascii=False, indent=2)
        return True
    return False
