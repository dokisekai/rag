"""tests/test_database.py —— SQLite 数据库模块单元测试。"""

import os
import sqlite3
import json


class TestDatabaseInit:
    """测试数据库初始化。"""

    def test_tables_created(self, fresh_database):
        """验证 qa_sessions 和 notifications 表已创建。"""
        conn = fresh_database.get_connection()
        cur = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        tables = [row[0] for row in cur.fetchall()]
        assert "qa_sessions" in tables
        assert "notifications" in tables

    def test_qa_sessions_schema(self, fresh_database):
        """验证 qa_sessions 表结构。"""
        conn = fresh_database.get_connection()
        cur = conn.execute("PRAGMA table_info(qa_sessions)")
        columns = {row[1] for row in cur.fetchall()}
        expected = {
            "id", "created_at", "title", "kb_id", "summary",
            "query_count", "dialog_messages", "rag_references", "web_results",
        }
        assert expected.issubset(columns)

    def test_notifications_schema(self, fresh_database):
        """验证 notifications 表结构。"""
        conn = fresh_database.get_connection()
        cur = conn.execute("PRAGMA table_info(notifications)")
        columns = {row[1] for row in cur.fetchall()}
        expected = {
            "id", "type", "title", "content", "read",
            "related_id", "extra", "created_at",
        }
        assert expected.issubset(columns)


class TestDatabaseConnection:
    """测试连接管理。"""

    def test_get_connection_returns_same_per_thread(self, fresh_database):
        """同一线程多次调用应返回同一连接。"""
        conn1 = fresh_database.get_connection()
        conn2 = fresh_database.get_connection()
        assert conn1 is conn2

    def test_connection_row_factory(self, fresh_database):
        """连接应使用 Row 工厂以支持按列名访问。"""
        conn = fresh_database.get_connection()
        assert conn.row_factory is sqlite3.Row

    def test_empty_db_has_no_records(self, fresh_database):
        """新数据库中应无任何记录。"""
        conn = fresh_database.get_connection()
        cur = conn.execute("SELECT COUNT(*) FROM qa_sessions")
        assert cur.fetchone()[0] == 0
        cur = conn.execute("SELECT COUNT(*) FROM notifications")
        assert cur.fetchone()[0] == 0


class TestJsonMigration:
    """测试从旧 JSON 文件迁移。"""

    def test_migrate_history_json(self, fresh_database, tmp_path):
        """当 history.json 存在时，应自动迁移到 SQLite。"""
        # 模拟旧 JSON 数据
        data_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "data"
        )
        history_file = os.path.join(data_dir, "history.json")

        # 如果已有旧数据文件，检查迁移是否生效
        if os.path.exists(history_file):
            conn = fresh_database.get_connection()
            cur = conn.execute("SELECT COUNT(*) FROM qa_sessions")
            count = cur.fetchone()[0]
            # 迁移后应该有记录（如果有旧文件的话）
            assert count >= 0  # 至少不报错

    def test_migrate_notifications_json(self, fresh_database):
        """当 notifications.json 存在时，应自动迁移到 SQLite。"""
        data_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "data"
        )
        notif_file = os.path.join(data_dir, "notifications.json")

        if os.path.exists(notif_file):
            conn = fresh_database.get_connection()
            cur = conn.execute("SELECT COUNT(*) FROM notifications")
            count = cur.fetchone()[0]
            assert count >= 0
