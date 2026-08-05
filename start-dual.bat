@echo off
echo 启动HUSTOJ双端口服务...
echo.
echo 用户端端口: 3000
echo 管理端端口: 3001
echo.

:: 启动用户端（端口3000）
echo 正在启动用户端...
start "HUSTOJ-用户端 (3000)" cmd /k "cd /d %~dp0 && npm run dev"
timeout /t 5 /nobreak >nul

:: 启动管理端（端口3001）
echo 正在启动管理端...
start "HUSTOJ-管理端 (3001)" cmd /k "cd /d %~dp0 && set NEXT_PRIVATE_STANDALONE_WORKER=true && set PORT=3001 && npm run dev"

echo.
echo 双端口服务启动成功！
echo 用户端: http://localhost:3000
echo 管理端: http://localhost:3001
echo.
echo 两个独立的终端窗口已打开
echo 请查看各自的日志输出
echo.
echo 按任意键退出此窗口（服务将继续运行）...
pause >nul