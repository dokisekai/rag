"""Pytest 共享夹具 —— 为所有测试提供隔离的临时数据库和已 mock 的外部依赖。"""

import os
import sys
from unittest.mock import MagicMock

import pytest

# 将 backend 目录加入 sys.path，使 services 等模块可被导入
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, _BACKEND_DIR)


# ---------------------------------------------------------------------------
# 临时数据库 & 向量存储目录
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function")
def tmp_db_path(tmp_path):
    """每个测试函数独享的临时 SQLite 数据库路径。"""
    db_file = tmp_path / "test_app.db"
    return str(db_file)


@pytest.fixture(scope="function")
def tmp_vector_store(tmp_path):
    """每个测试函数独享的临时向量存储目录。"""
    store = tmp_path / "vector_store"
    store.mkdir(parents=True, exist_ok=True)
    return str(store)


@pytest.fixture(scope="function")
def isolated_env(tmp_db_path, tmp_vector_store, monkeypatch):
    """设置环境变量，使 database / rag_service 使用临时路径。"""
    monkeypatch.setenv("DATABASE_PATH", tmp_db_path)
    monkeypatch.setenv("EMBEDDING_API_BASE", "http://127.0.0.1:1234/v1")
    monkeypatch.setenv("EMBEDDING_MODEL", "test-embedding-model")
    monkeypatch.setenv("LLM_MODEL", "test-llm-model")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173")
    monkeypatch.setenv("API_KEY", "")
    return {
        "db_path": tmp_db_path,
        "vector_store": tmp_vector_store,
    }


# ---------------------------------------------------------------------------
# 重置 database 模块（每个测试函数使用全新数据库）
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function")
def fresh_database(isolated_env):
    """重新加载 database 模块，使其使用临时数据库路径。

    在 reload 期间 mock os.path.exists 以阻止 _migrate_from_json()
    从真实 backend/data/*.json 迁移旧数据，确保测试隔离。
    """
    import importlib
    from unittest.mock import patch as _patch

    original_exists = os.path.exists

    def _fake_exists(path):
        # 阻止迁移函数找到旧 JSON 文件
        if path.endswith("history.json") or path.endswith("notifications.json"):
            return False
        return original_exists(path)

    with _patch("os.path.exists", side_effect=_fake_exists):
        import services.database as db_module
        importlib.reload(db_module)

    # 确保 thread-local 连接在 reload 后重建
    if hasattr(db_module._local, "conn"):
        delattr(db_module._local, "conn")
    return db_module


@pytest.fixture(scope="function")
def fresh_history_service(fresh_database):
    """重新加载 history_service，使其使用 fresh_database 的连接。"""
    import importlib
    import services.history_service as hs_module
    importlib.reload(hs_module)
    return hs_module


@pytest.fixture(scope="function")
def fresh_notification_service(fresh_database):
    """重新加载 notification_service，使其使用 fresh_database 的连接。"""
    import importlib
    import services.notification_service as ns_module
    importlib.reload(ns_module)
    return ns_module


# ---------------------------------------------------------------------------
# Mock Embedding 响应
# ---------------------------------------------------------------------------
@pytest.fixture
def mock_embedding_response():
    """返回一个伪造的 embedding POST handler (dim=64)。"""
    import numpy as np

    def _mock_post(url, json=None, **kwargs):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        input_texts = json.get("input", ["test"]) if json else ["test"]
        if isinstance(input_texts, str):
            input_texts = [input_texts]
        data = []
        for _ in input_texts:
            vec = np.random.randn(64).astype(np.float32)
            data.append({"embedding": vec.tolist()})
        mock_resp.json.return_value = {"data": data}
        return mock_resp

    return _mock_post
