"""历史会话服务 —— 基于 SQLite 存储。

所有函数签名与返回值格式与原 JSON 版本完全一致，main.py 无需修改。
dialog_messages / rag_references / web_results 在数据库中以 JSON 字符串形式存储，
读取时自动反序列化为 Python 对象。
"""

import json
import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

from services.database import get_connection

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 内部工具
# ---------------------------------------------------------------------------
def _row_to_session(row) -> Dict[str, Any]:
    """将数据库行转换为与会话记录字典（JSON 字段已反序列化）。"""
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "title": row["title"],
        "kb_id": row["kb_id"],
        "summary": row["summary"],
        "query_count": row["query_count"],
        "dialog_messages": json.loads(row["dialog_messages"]) if row["dialog_messages"] else [],
        "rag_references": json.loads(row["rag_references"]) if row["rag_references"] else [],
        "web_results": json.loads(row["web_results"]) if row["web_results"] else [],
    }


# ---------------------------------------------------------------------------
# 对外接口（签名不变）
# ---------------------------------------------------------------------------
def get_all_history() -> List[Dict[str, Any]]:
    """获取所有历史面试记录，按时间倒序排列"""
    try:
        conn = get_connection()
        cur = conn.execute("SELECT * FROM qa_sessions ORDER BY created_at DESC")
        return [_row_to_session(row) for row in cur.fetchall()]
    except Exception as e:
        logger.error("Error loading history: %s", e)
        return []


def get_history_by_id(session_id: str) -> Optional[Dict[str, Any]]:
    """按 ID 查询某次面试的详细报告"""
    try:
        conn = get_connection()
        cur = conn.execute("SELECT * FROM qa_sessions WHERE id = ?", (session_id,))
        row = cur.fetchone()
        if row:
            return _row_to_session(row)
        return None
    except Exception as e:
        logger.error("Error getting history by id: %s", e)
        return None


def save_qa_session(
    title: str,
    kb_id: Optional[str],
    dialog_messages: List[Dict[str, Any]],
    rag_references: Optional[List[Dict[str, Any]]] = None,
    web_results: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """保存一次完整的 AI 知识库问答会话到本地数据库"""
    session_id = str(uuid.uuid4())

    # 仅持久化非 system 消息（与原有逻辑一致）
    non_system_msgs = [m for m in dialog_messages if m.get("role") != "system"]
    user_queries = [m.get("content", "") for m in non_system_msgs if m.get("role") == "user"]
    summary = user_queries[0] if user_queries else "知识库问答会话"
    if len(summary) > 30:
        summary = summary[:30] + "..."

    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    final_title = title or summary

    record = {
        "id": session_id,
        "created_at": created_at,
        "title": final_title,
        "kb_id": kb_id,
        "summary": summary,
        "query_count": len(user_queries),
        "dialog_messages": non_system_msgs,
        "rag_references": rag_references or [],
        "web_results": web_results or [],
    }

    try:
        conn = get_connection()
        conn.execute(
            """
            INSERT INTO qa_sessions
                (id, created_at, title, kb_id, summary, query_count,
                 dialog_messages, rag_references, web_results)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                created_at,
                final_title,
                kb_id,
                summary,
                len(user_queries),
                json.dumps(non_system_msgs, ensure_ascii=False),
                json.dumps(rag_references or [], ensure_ascii=False),
                json.dumps(web_results or [], ensure_ascii=False),
            ),
        )
        conn.commit()
    except Exception as e:
        logger.error("Error saving qa session: %s", e)

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
    try:
        conn = get_connection()
        cur = conn.execute("SELECT * FROM qa_sessions WHERE id = ?", (session_id,))
        row = cur.fetchone()
        if not row:
            return None

        rec = _row_to_session(row)

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

        conn.execute(
            """
            UPDATE qa_sessions SET
                dialog_messages = ?,
                query_count     = ?,
                summary         = ?,
                title           = ?,
                rag_references  = ?,
                web_results     = ?
            WHERE id = ?
            """,
            (
                json.dumps(rec["dialog_messages"], ensure_ascii=False),
                rec["query_count"],
                rec["summary"],
                rec["title"],
                json.dumps(rec["rag_references"], ensure_ascii=False),
                json.dumps(rec["web_results"], ensure_ascii=False),
                session_id,
            ),
        )
        conn.commit()
        return rec
    except Exception as e:
        logger.error("Error updating session: %s", e)
        return None


def delete_history_by_id(session_id: str) -> bool:
    """删除指定 ID 的历史记录"""
    try:
        conn = get_connection()
        cur = conn.execute("DELETE FROM qa_sessions WHERE id = ?", (session_id,))
        conn.commit()
        return cur.rowcount > 0
    except Exception as e:
        logger.error("Error deleting history: %s", e)
        return False
