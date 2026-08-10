# 📚 RAG 智能知识库项目 - 完整技术文档目录 (Documentation Index)

欢迎查阅 **AI 知识库 / RAG 项目** 的系统级技术文档全集。本项目文档分为 **主系统设计说明书**、**面试真题与标准回答手册** 以及 **7 份细分模块中文技术文档**。

---

## 🎯 一、面试必备必看 (Interview Preparation)

- 🏆 **[RAG_项目面试真题与标准回答手册.md](file:///Users/xiuxiuxiu/Documents/rag/docs/RAG_项目面试真题与标准回答手册.md)**
  - **核心内容**：汇总了真实模拟面试过程中的所有问题、候选人回答要点、面试官点评、硬核技术解析以及**满分标准回答话术模板**。

---

## 📄 二、主系统设计说明书 (Master Design Document)

- 📖 **[RAG_系统设计说明书.md](file:///Users/xiuxiuxiu/Documents/rag/docs/RAG_系统设计说明书.md)**
  - **核心内容**：包含项目痛点背景、系统总体架构拓扑图、数据持久化存储规范 (`data/` 目录落盘规划)、FAISS + BM25 混合检索与 RRF 算法公式、`/api/llm-proxy` Tool Call 自动修补工作流、端到端序列图（Mermaid Sequence Diagrams）以及非功能性设计。

---

## 📁 三、细分模块中文技术文档 (Subsystem Modular Docs)

| 序号 | 模块中文文档 | 涉及核心文件 / 存储路径 | 核心工作流程 (Workflow) |
| :--- | :--- | :--- | :--- |
| **00** | [00_系统总体架构与工作流程.md](file:///Users/xiuxiuxiu/Documents/rag/docs/00_系统总体架构与工作流程.md) | `main.py`, `data/` | 文档导入向量构建端到端 Workflow + 问答检索 LLM 生成端到端 Workflow |
| **01** | [01_大模型控制与代理策略.md](file:///Users/xiuxiuxiu/Documents/rag/docs/01_大模型控制与代理策略.md) | `services/llm_service.py`, `main.py` | Tool Call 格式自动截取与 Synthetic 工具包裹反向代理 Workflow + 历史裁剪 |
| **02** | [02_向量数据库与混合检索.md](file:///Users/xiuxiuxiu/Documents/rag/docs/02_向量数据库与混合检索.md) | `data/vector_store/{kb_id}/` | FAISS+BM25 并行检索与 RRF (Reciprocal Rank Fusion) 打分融合 Workflow |
| **03** | [03_文档解析与重叠切块.md](file:///Users/xiuxiuxiu/Documents/rag/docs/03_文档解析与重叠切块.md) | `services/document_parser.py` | 工厂分发提取 DocumentNode + Sliding Window Overlap 智能切块 Workflow |
| **04** | [04_实时联网搜索与质量降噪.md](file:///Users/xiuxiuxiu/Documents/rag/docs/04_实时联网搜索与质量降噪.md) | `services/search_service.py` | LLM 搜索词提炼 + Bing/Baidu 多引擎 Failover 抓取 + 三维强降噪 Workflow |
| **05** | [05_MCP协议与技能扩展.md](file:///Users/xiuxiuxiu/Documents/rag/docs/05_MCP协议与技能扩展.md) | `data/mcp_servers.json`, `data/skills/` | Standard MCP Stdio/SSE 进程生命周期 + 动态 Skills 插件路由 Workflow |
| **06** | [06_会话持久化与测试评估.md](file:///Users/xiuxiuxiu/Documents/rag/docs/06_会话持久化与测试评估.md) | `data/history.json`, `test_*.py` | 会话与引用 Chunk 增量落地 Workflow + RAG 检索效果基准测试 Evaluation Workflow |
