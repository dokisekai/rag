# RAG AI 知识库系统

基于 RAG (Retrieval-Augmented Generation) 架构的智能知识库问答系统，支持多格式文档导入、向量混合检索、实时联网搜索增强与大模型流式对话。

## 核心特性

- **混合检索引擎**：FAISS 向量检索 + BM25 关键词检索 + RRF 融合排序
- **多级重排**：Embedding 重排序 + 质量阈值过滤，精准召回
- **多格式文档解析**：PDF / DOCX / PPTX / Markdown / 纯文本
- **结构感知分块**：基于文档标题层级智能切块，保留上下文
- **实时联网搜索**：Bing + 百度双引擎自动降级，支持 LLM 关键词提炼
- **流式对话**：SSE 流式输出 + 自动续写截断检测
- **仅知识库模式**：零幻觉严格模式，无资料时硬拦截
- **MCP 协议支持**：可扩展外部工具与技能
- **语音能力**：TTS 语音合成 + Silero VAD 语音活动检测

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python 3.11+ / FastAPI / Uvicorn |
| 前端 | React 19 / Vite / Tailwind CSS 4 |
| 向量检索 | FAISS / NumPy |
| 文档解析 | PyMuPDF / python-docx / python-pptx |
| 语音 | edge-tts / Silero VAD / PyTorch |
| LLM | OpenAI 兼容 API (LM Studio / DeepSeek / OpenAI) |

## 快速开始

### 1. 环境准备

```bash
# 克隆仓库
git clone git@github.com:dokisekai/rag.git
cd rag

# 复制环境配置
cp .env.example .env
# 编辑 .env 填入你的 LLM API 地址和密钥
```

### 2. 启动后端

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

后端运行在 `http://127.0.0.1:8000`

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 `http://localhost:5174`

### 4. 一键启动 (macOS)

```bash
chmod +x start.sh
./start.sh
```

## Docker 部署

```bash
docker-compose up -d
```

## 配置说明

所有配置通过 `.env` 文件或环境变量管理：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| LLM_API_KEY | not-needed | LLM API 密钥 |
| LLM_API_BASE | http://127.0.0.1:1234/v1 | LLM API 地址 |
| LLM_MODEL | liquid/lfm2-24b-a2b | 模型名称 |
| EMBEDDING_API_BASE | http://127.0.0.1:1234/v1 | Embedding API 地址 |
| EMBEDDING_MODEL | text-embedding-qwen3-embedding-0.6b | Embedding 模型 |
| CORS_ORIGINS | localhost:5174,5174 | 允许的前端来源 |
| LOG_LEVEL | INFO | 日志级别 |

## API 文档

启动后端后访问 `http://127.0.0.1:8000/docs` 查看 FastAPI 自动生成的 OpenAPI 文档。

## 项目结构

```
rag/
├── backend/              # FastAPI 后端
│   ├── main.py           # 应用入口与 API 路由
│   ├── services/         # 核心服务
│   │   ├── rag_service.py       # RAG 混合检索引擎
│   │   ├── llm_service.py       # LLM 调用与流式输出
│   │   ├── search_service.py    # 联网搜索服务
│   │   ├── document_parser.py   # 多格式文档解析
│   │   ├── mcp_service.py       # MCP 协议支持
│   │   ├── skills_service.py    # 技能管理
│   │   ├── history_service.py   # 会话持久化
│   │   ├── tts_service.py       # 语音合成
│   │   └── vad_service.py       # 语音活动检测
│   └── requirements.txt
├── frontend/             # React 前端
│   └── src/
│       ├── components/   # UI 组件
│       ├── pages/        # 页面 (用户端 + 管理后台)
│       └── context/      # 全局状态
├── docs/                 # 系统设计文档
├── .env.example          # 环境变量模板
├── Dockerfile            # 后端容器镜像
├── docker-compose.yml    # 容器编排
└── start.sh              # 一键启动脚本
```

## License

MIT
