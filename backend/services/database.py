"""SQLite 数据库管理模块。

提供线程安全的连接、表初始化以及从旧 JSON 文件自动迁移数据的能力。
仅依赖 Python 标准库（sqlite3 / threading / json），无需额外安装第三方包。
"""

import os
import json
import sqlite3
import threading
import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 路径解析
# ---------------------------------------------------------------------------
# backend 根目录（services 的上一级）
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
# data 目录（与原 JSON 文件存储位置一致）
_DATA_DIR = os.path.join(_BACKEND_DIR, "data")

# 数据库文件路径，可通过环境变量 DATABASE_PATH 覆盖
DATABASE_PATH = os.getenv("DATABASE_PATH", "data/app.db")

# 若为相对路径，则相对于 backend 根目录解析
if not os.path.isabs(DATABASE_PATH):
    DATABASE_PATH = os.path.join(_BACKEND_DIR, DATABASE_PATH)

# 确保数据库所在目录存在
_db_dir = os.path.dirname(DATABASE_PATH)
if _db_dir and not os.path.exists(_db_dir):
    os.makedirs(_db_dir, exist_ok=True)

# ---------------------------------------------------------------------------
# 线程安全的连接管理
# ---------------------------------------------------------------------------
_local = threading.local()


def _create_connection() -> sqlite3.Connection:
    """创建一个新的 SQLite 连接。"""
    conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # WAL 模式提升并发读写性能
    try:
        conn.execute("PRAGMA journal_mode=WAL")
    except sqlite3.DatabaseError:
        pass
    return conn


def get_connection() -> sqlite3.Connection:
    """获取当前线程专属的 SQLite 连接（线程安全）。

    使用 threading.local 保证每个线程持有独立的连接对象，
    避免多线程共享同一连接导致的竞态问题。
    """
    conn = getattr(_local, "conn", None)
    if conn is None:
        conn = _create_connection()
        _local.conn = conn
    return conn


# ---------------------------------------------------------------------------
# 建表
# ---------------------------------------------------------------------------
def _init_db() -> None:
    """创建所需的数据库表（如不存在）。"""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS qa_sessions (
            id              TEXT PRIMARY KEY,
            created_at      TEXT,
            title           TEXT,
            kb_id           TEXT,
            summary         TEXT,
            query_count     INTEGER,
            dialog_messages TEXT,
            rag_references  TEXT,
            web_results     TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS notifications (
            id          TEXT PRIMARY KEY,
            type        TEXT,
            title       TEXT,
            content     TEXT,
            read        INTEGER,
            related_id  TEXT,
            extra       TEXT,
            created_at  TEXT
        )
        """
    )
    conn.commit()


# ---------------------------------------------------------------------------
# 从旧 JSON 文件迁移数据
# ---------------------------------------------------------------------------
def _migrate_from_json() -> None:
    """当 SQLite 为空且旧 JSON 文件存在时，自动迁移历史数据。"""
    conn = get_connection()
    cur = conn.cursor()

    # ---- qa_sessions ----
    cur.execute("SELECT COUNT(*) FROM qa_sessions")
    if cur.fetchone()[0] == 0:
        history_file = os.path.join(_DATA_DIR, "history.json")
        if os.path.exists(history_file):
            try:
                with open(history_file, "r", encoding="utf-8") as fh:
                    records: List[Dict[str, Any]] = json.load(fh)
                for rec in records:
                    dialog_messages = rec.get("dialog_messages") or []
                    rag_references = rec.get("rag_references") or []
                    web_results = rec.get("web_results") or []
                    cur.execute(
                        """
                        INSERT OR IGNORE INTO qa_sessions
                            (id, created_at, title, kb_id, summary, query_count,
                             dialog_messages, rag_references, web_results)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            rec.get("id"),
                            rec.get("created_at"),
                            rec.get("title"),
                            rec.get("kb_id"),
                            rec.get("summary"),
                            rec.get("query_count", 0),
                            json.dumps(dialog_messages, ensure_ascii=False),
                            json.dumps(rag_references, ensure_ascii=False),
                            json.dumps(web_results, ensure_ascii=False),
                        ),
                    )
                conn.commit()
                logger.info("从 history.json 迁移了 %d 条记录", len(records))
            except Exception as exc:  # noqa: BLE001
                logger.error("迁移 history.json 失败: %s", exc)

    # ---- notifications ----
    cur.execute("SELECT COUNT(*) FROM notifications")
    if cur.fetchone()[0] == 0:
        notif_file = os.path.join(_DATA_DIR, "notifications.json")
        if os.path.exists(notif_file):
            try:
                with open(notif_file, "r", encoding="utf-8") as fh:
                    notifications: List[Dict[str, Any]] = json.load(fh)
                for n in notifications:
                    extra = n.get("extra") or {}
                    cur.execute(
                        """
                        INSERT OR IGNORE INTO notifications
                            (id, type, title, content, read, related_id, extra, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            n.get("id"),
                            n.get("type"),
                            n.get("title"),
                            n.get("content"),
                            1 if n.get("read") else 0,
                            n.get("related_id"),
                            json.dumps(extra, ensure_ascii=False),
                            n.get("created_at"),
                        ),
                    )
                conn.commit()
                logger.info("从 notifications.json 迁移了 %d 条记录", len(notifications))
            except Exception as exc:  # noqa: BLE001
                logger.error("迁移 notifications.json 失败: %s", exc)


# ---------------------------------------------------------------------------
# 模块加载时自动初始化
# ---------------------------------------------------------------------------
_init_db()
_migrate_from_json()
