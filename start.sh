#!/bin/bash
set -e

echo "=== 🚀 正在启动 VoiceRag AI 知识库服务系统 (macOS) ==="

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
pip install -r requirements.txt

./venv/bin/python main.py &
BACKEND_PID=$!

# 等待后端就绪
echo "⏳ 等待后端服务就绪..."
for i in $(seq 1 15); do
    if curl -s http://127.0.0.1:8000/api/health > /dev/null 2>&1; then
        echo "✅ 后端服务已就绪"
        break
    fi
    sleep 1
done

# 2. 启动 React 前端服务
echo "🎨 [2/2] 正在启动 React AI 知识库前端服务..."
cd "$DIR/frontend"

# 清理占用 5174 端口的旧进程
lsof -ti:5174 | xargs kill -9 2>/dev/null || true

# 确保依赖已安装
if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

npm run dev &
FRONTEND_PID=$!

echo "=== ✅ 所有服务启动成功！==="
echo "请在浏览器打开前端终端提示的 URL (例如 http://localhost:5174)"
echo "按 Ctrl+C 即可关闭所有本地服务。"

cleanup() {
    echo ""
    echo "正在关闭服务..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM
wait
