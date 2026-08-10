#!/bin/bash
echo "=== 🚀 正在启动 VoiceRAG AI 知识库服务系统 (macOS) ==="

# 获取当前脚本所在路径
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# 1. 检查 Python 依赖并启动 FastAPI 后端
echo "📦 [1/2] 正在启动 Python FastAPI 知识库后端服务 (端口 8000)..."
cd "$DIR/backend"

# 清理占用 8000 端口的旧进程
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

if [ ! -d "venv" ]; then
    echo "创建 Python 虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1

./venv/bin/python main.py &
BACKEND_PID=$!

# 2. 启动 React 前端服务
echo "🎨 [2/2] 正在启动 React AI 知识库前端服务..."
cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo "=== ✅ 所有服务启动成功！==="
echo "请在浏览器打开前端终端提示的 URL (例如 http://localhost:5174)"
echo "按 Ctrl+C 即可关闭所有本地服务。"

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
