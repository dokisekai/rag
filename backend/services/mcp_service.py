import os
import json
import time
import uuid
import asyncio
import subprocess
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class MCPServerConfig:
    id: str
    name: str
    type: str
    command: str = ""
    args: List[str] = field(default_factory=list)
    url: str = ""
    enabled: bool = True
    status: str = "disconnected"
    tools: List[Dict[str, Any]] = field(default_factory=list)
    resources: List[Dict[str, Any]] = field(default_factory=list)
    prompts: List[Dict[str, Any]] = field(default_factory=list)
    error: Optional[str] = None


class MCPClient:
    def __init__(self, config_path: str = "data/mcp_servers.json"):
        self.config_path = Path(config_path)
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        self.servers: Dict[str, MCPServerConfig] = {}
        self._processes: Dict[str, subprocess.Popen] = {}
        self._load_config()

    def _load_config(self):
        if self.config_path.exists():
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for server_data in data:
                    server = MCPServerConfig(**server_data)
                    self.servers[server.id] = server
            except Exception as e:
                logger.error(f"Failed to load MCP config: {e}")

    def _save_config(self):
        data = []
        for server in self.servers.values():
            data.append({
                "id": server.id,
                "name": server.name,
                "type": server.type,
                "command": server.command,
                "args": server.args,
                "url": server.url,
                "enabled": server.enabled,
                "status": server.status,
                "tools": server.tools,
                "resources": server.resources,
                "prompts": server.prompts,
                "error": server.error,
            })
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def list_servers(self) -> List[Dict[str, Any]]:
        result = []
        for server in self.servers.values():
            result.append({
                "id": server.id,
                "name": server.name,
                "type": server.type,
                "command": server.command,
                "args": server.args,
                "url": server.url,
                "enabled": server.enabled,
                "status": server.status,
                "tool_count": len(server.tools),
                "resource_count": len(server.resources),
                "prompt_count": len(server.prompts),
                "error": server.error,
            })
        return result

    def add_server(self, name: str, server_type: str, command: str = "",
                   args: Optional[List[str]] = None, url: str = "") -> Dict[str, Any]:
        server_id = uuid.uuid4().hex
        server = MCPServerConfig(
            id=server_id,
            name=name,
            type=server_type,
            command=command,
            args=args or [],
            url=url,
            enabled=True,
            status="disconnected",
        )
        self.servers[server_id] = server
        self._save_config()
        return self._to_dict(server)

    def remove_server(self, server_id: str) -> bool:
        server = self.servers.pop(server_id, None)
        if not server:
            return False
        if server_id in self._processes:
            try:
                self._processes[server_id].terminate()
            except Exception:
                pass
            del self._processes[server_id]
        self._save_config()
        return True

    async def connect_server(self, server_id: str) -> bool:
        server = self.servers.get(server_id)
        if not server:
            return False

        if server.type == "stdio":
            return await self._connect_stdio(server)
        elif server.type == "sse":
            return await self._connect_sse(server)
        else:
            server.error = f"Unsupported server type: {server.type}"
            server.status = "error"
            self._save_config()
            return False

    async def _connect_stdio(self, server: MCPServerConfig) -> bool:
        try:
            process = subprocess.Popen(
                [server.command] + server.args,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            self._processes[server.id] = process
            init_request = {
                "jsonrpc": "2.0",
                "id": str(uuid.uuid4()),
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {"name": "VoiceInterview AI", "version": "1.0.0"}
                }
            }
            process.stdin.write(json.dumps(init_request) + "\n")
            process.stdin.flush()

            import select
            ready, _, _ = select.select([process.stdout], [], [], 5)
            if ready:
                response = process.stdout.readline()
                if response:
                    try:
                        data = json.loads(response.strip())
                        if "result" in data:
                            server.status = "connected"
                            server.error = None
                            await self._list_tools(server)
                            self._save_config()
                            return True
                    except json.JSONDecodeError:
                        pass

            server.error = "Failed to initialize MCP server"
            server.status = "error"
            self._save_config()
            return False
        except Exception as e:
            server.error = str(e)
            server.status = "error"
            self._save_config()
            return False

    async def _connect_sse(self, server: MCPServerConfig) -> bool:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10) as client:
                init_request = {
                    "jsonrpc": "2.0",
                    "id": str(uuid.uuid4()),
                    "method": "initialize",
                    "params": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {},
                        "clientInfo": {"name": "VoiceInterview AI", "version": "1.0.0"}
                    }
                }
                resp = await client.post(
                    server.url,
                    json=init_request,
                    headers={"Content-Type": "application/json"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if "result" in data:
                        server.status = "connected"
                        server.error = None
                        await self._list_tools(server)
                        self._save_config()
                        return True
            server.error = "Failed to connect to SSE server"
            server.status = "error"
            self._save_config()
            return False
        except Exception as e:
            server.error = str(e)
            server.status = "error"
            self._save_config()
            return False

    async def _list_tools(self, server: MCPServerConfig):
        if server.type == "stdio" and server.id in self._processes:
            process = self._processes[server.id]
            tools_request = {
                "jsonrpc": "2.0",
                "id": str(uuid.uuid4()),
                "method": "tools/list",
                "params": {}
            }
            process.stdin.write(json.dumps(tools_request) + "\n")
            process.stdin.flush()

            import select
            ready, _, _ = select.select([process.stdout], [], [], 5)
            if ready:
                response = process.stdout.readline()
                if response:
                    try:
                        data = json.loads(response.strip())
                        if "result" in data:
                            server.tools = data["result"].get("tools", [])
                    except json.JSONDecodeError:
                        pass

    async def call_tool(self, server_id: str, tool_name: str, arguments: Dict[str, Any]) -> Any:
        server = self.servers.get(server_id)
        if not server:
            raise ValueError(f"Server {server_id} not found")

        if server.type == "stdio" and server_id in self._processes:
            process = self._processes[server_id]
            request = {
                "jsonrpc": "2.0",
                "id": str(uuid.uuid4()),
                "method": "tools/call",
                "params": {"name": tool_name, "arguments": arguments}
            }
            process.stdin.write(json.dumps(request) + "\n")
            process.stdin.flush()

            import select
            ready, _, _ = select.select([process.stdout], [], [], 30)
            if ready:
                response = process.stdout.readline()
                if response:
                    try:
                        data = json.loads(response.strip())
                        if "result" in data:
                            return data["result"]
                        elif "error" in data:
                            raise RuntimeError(data["error"].get("message", "Tool call failed"))
                    except json.JSONDecodeError:
                        pass
            raise RuntimeError("Tool call timeout")
        else:
            raise ValueError(f"Server {server_id} not connected or unsupported type")

    def disconnect_server(self, server_id: str):
        if server_id in self._processes:
            try:
                self._processes[server_id].terminate()
            except Exception:
                pass
            del self._processes[server_id]
        server = self.servers.get(server_id)
        if server:
            server.status = "disconnected"
            self._save_config()

    def _to_dict(self, server: MCPServerConfig) -> Dict[str, Any]:
        return {
            "id": server.id,
            "name": server.name,
            "type": server.type,
            "command": server.command,
            "args": server.args,
            "url": server.url,
            "enabled": server.enabled,
            "status": server.status,
            "tools": server.tools,
            "resources": server.resources,
            "prompts": server.prompts,
            "error": server.error,
            "tool_count": len(server.tools),
            "resource_count": len(server.resources),
            "prompt_count": len(server.prompts),
        }


class MCPServer:
    def __init__(self, skills_service, rag_service, search_service=None):
        self.skills_service = skills_service
        self.rag_service = rag_service
        self.search_service = search_service
        self._request_handlers: Dict[str, Callable] = {}
        self._register_handlers()

    def _register_handlers(self):
        self._request_handlers["initialize"] = self._handle_initialize
        self._request_handlers["tools/list"] = self._handle_tools_list
        self._request_handlers["tools/call"] = self._handle_tool_call
        self._request_handlers["resources/list"] = self._handle_resources_list
        self._request_handlers["prompts/list"] = self._handle_prompts_list

    def _handle_initialize(self, params: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {},
                "resources": {},
                "prompts": {},
            },
            "serverInfo": {
                "name": "VoiceInterview AI MCP Server",
                "version": "1.0.0"
            }
        }

    def _handle_tools_list(self, params: Dict[str, Any]) -> Dict[str, Any]:
        tools = [
            {
                "name": "search_knowledge_base",
                "description": "在知识库中搜索相关文档",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "kb_id": {"type": "string", "description": "知识库 ID"},
                        "query": {"type": "string", "description": "搜索查询"},
                        "top_k": {"type": "integer", "description": "返回结果数量", "default": 5}
                    },
                    "required": ["kb_id", "query"]
                }
            },
            {
                "name": "list_knowledge_bases",
                "description": "列出所有可用的知识库",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                }
            },
            {
                "name": "get_interview_evaluation",
                "description": "获取面试评估结果",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "session_id": {"type": "string", "description": "面试会话 ID"},
                    },
                    "required": ["session_id"]
                }
            },
            {
                "name": "list_skills",
                "description": "列出所有可用的 Skill",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "category": {"type": "string", "description": "技能分类", "nullable": True},
                    },
                }
            },
            {
                "name": "web_search",
                "description": "全网实时联网搜索，获取最新网页信息",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "搜索查询"},
                        "top_k": {"type": "integer", "description": "返回结果数量", "default": 5}
                    },
                    "required": ["query"]
                }
            },
        ]
        return {"tools": tools}

    def _handle_tool_call(self, params: Dict[str, Any]) -> Dict[str, Any]:
        tool_name = params.get("name", "")
        arguments = params.get("arguments", {})

        if tool_name == "search_knowledge_base":
            kb_id = arguments.get("kb_id", "")
            query = arguments.get("query", "")
            top_k = arguments.get("top_k", 5)
            result = self.rag_service.search_with_metadata(kb_id, query, top_k=top_k)
            return {"content": [{"type": "text", "text": json.dumps(result, ensure_ascii=False)}]}

        elif tool_name == "list_knowledge_bases":
            kbs = self.rag_service.list_kbs()
            return {"content": [{"type": "text", "text": json.dumps(kbs, ensure_ascii=False)}]}

        elif tool_name == "list_skills":
            category = arguments.get("category")
            skills = self.skills_service.list_skills(category=category, enabled_only=True)
            return {"content": [{"type": "text", "text": json.dumps(skills, ensure_ascii=False)}]}

        elif tool_name == "get_interview_evaluation":
            session_id = arguments.get("session_id", "")
            if not session_id:
                return {"isError": True, "content": [{"type": "text", "text": "session_id is required"}]}
            # 返回最近的历史记录作为评估参考
            return {"content": [{"type": "text", "text": f"Session {session_id} evaluation: Please use /api/interview/history/{session_id} endpoint for detailed evaluation."}]}

        elif tool_name == "web_search":
            query = arguments.get("query", "")
            top_k = arguments.get("top_k", 5)
            if self.search_service:
                results = self.search_service.search(query, top_k=top_k)
                return {"content": [{"type": "text", "text": json.dumps(results, ensure_ascii=False)}]}
            else:
                return {"content": [{"type": "text", "text": json.dumps([], ensure_ascii=False)}]}

        else:
            return {
                "isError": True,
                "content": [{"type": "text", "text": f"Unknown tool: {tool_name}"}]
            }

    def _handle_resources_list(self, params: Dict[str, Any]) -> Dict[str, Any]:
        resources = [
            {
                "uri": "knowledge://modules",
                "name": "面试题库模块列表",
                "description": "所有可用的面试考点模块",
                "mimeType": "application/json"
            },
            {
                "uri": "knowledge://skills",
                "name": "Skill 列表",
                "description": "所有已注册的 AI 技能",
                "mimeType": "application/json"
            },
        ]
        return {"resources": resources}

    def _handle_prompts_list(self, params: Dict[str, Any]) -> Dict[str, Any]:
        prompts = [
            {
                "name": "interview_simulation",
                "description": "仿真面试模式 Prompt",
                "arguments": [
                    {"name": "knowledge_base", "description": "知识库内容", "required": True},
                    {"name": "strictness", "description": "严格度等级", "required": False}
                ]
            },
            {
                "name": "tutoring_mode",
                "description": "讲解面试模式 Prompt",
                "arguments": [
                    {"name": "knowledge_base", "description": "知识库内容", "required": True},
                    {"name": "strictness", "description": "严格度等级", "required": False}
                ]
            },
        ]
        return {"prompts": prompts}

    def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        method = request.get("method", "")
        request_id = request.get("id")
        params = request.get("params", {})

        handler = self._request_handlers.get(method)
        if handler:
            try:
                result = handler(params)
                return {"jsonrpc": "2.0", "id": request_id, "result": result}
            except Exception as e:
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {"code": -32603, "message": str(e)}
                }
        else:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {"code": -32601, "message": f"Method not found: {method}"}
            }

    def handle_sse_message(self, message: str) -> Optional[Dict[str, Any]]:
        try:
            request = json.loads(message)
            return self.handle_request(request)
        except json.JSONDecodeError:
            return None
