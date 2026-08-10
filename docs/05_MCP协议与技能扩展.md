# 05_MCP协议与技能扩展

本文档解构 `services/mcp_service.py` 与 `services/skills_service.py` 的架构设计、工作流程（Workflow）及文件存储规范。

---

## 🔄 MCP 协议与 Skills 插件调度工作流程 (MCP Workflow)

```mermaid
flowchart TD
    LLM[LLM 输出了工具调用 Tool Call Request] --> Router{调度路由 Router}
    
    Router -- 内置系统能力 --> NativeMCPServer[MCPServer (提供 rag_search, web_search 接口)]
    Router -- 本地 Skills 插件 --> SkillSvc[SkillsService (加载 data/skills/{name}/)]
    Router -- 外部第三方节点 --> MCPClient[MCPClient (读取 data/mcp_servers.json)]
    
    subgraph SkillsExecution [Skills 插件执行流程]
        SkillSvc --> ReadManifest[校验 manifest.json 入参 Schema]
        ReadManifest --> RunScript[沙箱环境执行 script.py]
        RunScript --> SkillResult[返回插件执行结果 JSON]
    end
    
    subgraph ExternalMCP [外部 MCP 节点交互流程]
        MCPClient --> CheckType{节点模式 (Stdio / SSE)}
        CheckType -- Stdio --> PopenProc[subprocess.Popen 创建进程, 管道收发 JSON-RPC]
        CheckType -- SSE --> HTTPConn[HTTP SSE 长连接传递 JSON-RPC 2.0]
        PopenProc --> MCPResult[返回节点执行结果]
        HTTPConn --> MCPResult
    end
    
    NativeMCPServer --> Summarize[汇总 Tool Result 送回 LLM 拼接生成]
    SkillResult --> Summarize
    MCPResult --> Summarize
```

---

## 💾 存储路径规范

- **MCP 节点配置**：`data/mcp_servers.json`。
- **Skills 插件包**：`data/skills/{skill_name}/manifest.json` 与 `script.py`。
