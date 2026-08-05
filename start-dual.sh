#!/bin/bash
echo "启动HUSTOJ双端口服务..."
echo ""
echo "用户端端口: 3000"
echo "管理端端口: 3001"
echo ""

# 启动用户端（端口3000）
echo "正在启动用户端..."
gnome-terminal --title="HUSTOJ-用户端 (3000)" -- bash -c "cd '$(dirname '$0')' && npm run dev; exec bash" &
sleep 5

# 启动管理端（端口3001）
echo "正在启动管理端..."
gnome-terminal --title="HUSTOJ-管理端 (3001)" -- bash -c "cd '$(dirname '$0')' && NEXT_PRIVATE_STANDALONE_WORKER=true PORT=3001 npm run dev; exec bash" &

echo ""
echo "双端口服务启动成功！"
echo "用户端: http://localhost:3000"
echo "管理端: http://localhost:3001"
echo ""
echo "两个独立的终端窗口已打开"
echo "请查看各自的日志输出"
echo ""