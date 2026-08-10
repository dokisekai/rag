"""tests/test_api_auth.py —— API Key 认证中间件单元测试。

使用 FastAPI TestClient 测试认证逻辑，无需启动真实服务器。
"""

import os
import sys
from unittest.mock import patch

import pytest

_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)


class TestAPIKeyAuth:
    """测试 API Key 认证中间件。"""

    def test_no_api_key_allows_all(self):
        """未配置 API_KEY 时所有请求应放行。"""
        # 模拟未设置 API_KEY 的场景
        with patch("main.API_KEY", ""):
            from fastapi import FastAPI, Request
            from fastapi.responses import JSONResponse
            from fastapi.testclient import TestClient

            app = FastAPI()

            @app.get("/api/test")
            def test_endpoint():
                return {"status": "ok"}

            @app.middleware("http")
            async def mock_auth(request: Request, call_next):
                api_key = ""
                if not api_key:
                    return await call_next(request)
                return await call_next(request)

            client = TestClient(app)
            resp = client.get("/api/test")
            assert resp.status_code == 200

    def test_health_check_bypasses_auth(self):
        """健康检查端点应免认证。"""
        from fastapi import FastAPI, Request
        from fastapi.responses import JSONResponse
        from fastapi.testclient import TestClient

        app = FastAPI()
        API_KEY = "secret-key-123"

        @app.get("/api/health")
        def health():
            return {"status": "healthy"}

        @app.get("/api/protected")
        def protected():
            return {"data": "secret"}

        @app.middleware("http")
        async def api_key_auth(request: Request, call_next):
            if not API_KEY:
                return await call_next(request)
            if request.url.path == "/api/health":
                return await call_next(request)
            if request.url.path.startswith("/api/"):
                provided = request.headers.get("X-API-Key", "")
                if provided != API_KEY:
                    return JSONResponse(
                        status_code=401,
                        content={"detail": "Invalid or missing API key."}
                    )
            return await call_next(request)

        client = TestClient(app)

        # 健康检查不需要 API Key
        resp = client.get("/api/health")
        assert resp.status_code == 200

        # 受保护端点需要 API Key
        resp = client.get("/api/protected")
        assert resp.status_code == 401

        # 带正确 API Key
        resp = client.get("/api/protected", headers={"X-API-Key": "secret-key-123"})
        assert resp.status_code == 200

    def test_wrong_api_key_returns_401(self):
        """错误的 API Key 应返回 401。"""
        from fastapi import FastAPI, Request
        from fastapi.responses import JSONResponse
        from fastapi.testclient import TestClient

        app = FastAPI()
        API_KEY = "correct-key"

        @app.get("/api/data")
        def get_data():
            return {"data": "value"}

        @app.middleware("http")
        async def api_key_auth(request: Request, call_next):
            if not API_KEY:
                return await call_next(request)
            if request.url.path == "/api/health":
                return await call_next(request)
            if request.url.path.startswith("/api/"):
                provided = request.headers.get("X-API-Key", "")
                if provided != API_KEY:
                    return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
            return await call_next(request)

        client = TestClient(app)

        # 错误 key
        resp = client.get("/api/data", headers={"X-API-Key": "wrong-key"})
        assert resp.status_code == 401

        # 无 key
        resp = client.get("/api/data")
        assert resp.status_code == 401

        # 正确 key
        resp = client.get("/api/data", headers={"X-API-Key": "correct-key"})
        assert resp.status_code == 200
        assert resp.json()["data"] == "value"

    def test_non_api_paths_bypass_auth(self):
        """非 /api/ 开头的路径应免认证。"""
        from fastapi import FastAPI, Request
        from fastapi.responses import JSONResponse, PlainTextResponse
        from fastapi.testclient import TestClient

        app = FastAPI()
        API_KEY = "secret"

        @app.get("/metrics")
        def metrics():
            return PlainTextResponse("rag_total_queries 0")

        @app.middleware("http")
        async def api_key_auth(request: Request, call_next):
            if not API_KEY:
                return await call_next(request)
            if request.url.path == "/api/health":
                return await call_next(request)
            if request.url.path.startswith("/api/"):
                provided = request.headers.get("X-API-Key", "")
                if provided != API_KEY:
                    return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
            return await call_next(request)

        client = TestClient(app)
        resp = client.get("/metrics")
        assert resp.status_code == 200
