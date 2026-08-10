"""通知服务 —— 基于 SQLite 存储。

所有函数签名与返回值格式与原 JSON 版本完全一致，main.py 无需修改。
extra 在数据库中以 JSON 字符串存储，读取时反序列化；
read 在数据库中存为 INTEGER (0/1)，返回时转为 bool。
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
def _row_to_notification(row) -> Dict[str, Any]:
    """将数据库行转换为通知字典（JSON 字段已反序列化，read 转为 bool）。"""
    return {
        "id": row["id"],
        "type": row["type"],
        "title": row["title"],
        "content": row["content"],
        "read": bool(row["read"]),
        "related_id": row["related_id"],
        "extra": json.loads(row["extra"]) if row["extra"] else {},
        "created_at": row["created_at"],
    }


# ---------------------------------------------------------------------------
# 对外接口（签名不变）
# ---------------------------------------------------------------------------
def get_all_notifications() -> List[Dict[str, Any]]:
    try:
        conn = get_connection()
        cur = conn.execute("SELECT * FROM notifications ORDER BY created_at DESC")
        return [_row_to_notification(row) for row in cur.fetchall()]
    except Exception as e:
        logger.error("Error loading notifications: %s", e)
        return []


def get_unread_count() -> int:
    try:
        conn = get_connection()
        cur = conn.execute("SELECT COUNT(*) FROM notifications WHERE read = 0")
        return cur.fetchone()[0]
    except Exception as e:
        logger.error("Error counting unread notifications: %s", e)
        return 0


def create_notification(
    notification_type: str,
    title: str,
    content: str,
    related_id: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    notification = {
        "id": str(uuid.uuid4()),
        "type": notification_type,
        "title": title,
        "content": content,
        "read": False,
        "related_id": related_id,
        "extra": extra or {},
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }

    try:
        conn = get_connection()
        conn.execute(
            """
            INSERT INTO notifications
                (id, type, title, content, read, related_id, extra, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                notification["id"],
                notification_type,
                title,
                content,
                0,
                related_id,
                json.dumps(extra or {}, ensure_ascii=False),
                notification["created_at"],
            ),
        )
        conn.commit()
    except Exception as e:
        logger.error("Error creating notification: %s", e)

    return notification


def mark_as_read(notification_id: str) -> bool:
    try:
        conn = get_connection()
        cur = conn.execute(
            "UPDATE notifications SET read = 1 WHERE id = ?",
            (notification_id,),
        )
        conn.commit()
        return cur.rowcount > 0
    except Exception as e:
        logger.error("Error marking notification as read: %s", e)
        return False


def mark_all_as_read() -> int:
    try:
        conn = get_connection()
        cur = conn.execute("UPDATE notifications SET read = 1 WHERE read = 0")
        conn.commit()
        return cur.rowcount
    except Exception as e:
        logger.error("Error marking all notifications as read: %s", e)
        return 0


def delete_notification(notification_id: str) -> bool:
    try:
        conn = get_connection()
        cur = conn.execute("DELETE FROM notifications WHERE id = ?", (notification_id,))
        conn.commit()
        return cur.rowcount > 0
    except Exception as e:
        logger.error("Error deleting notification: %s", e)
        return False
