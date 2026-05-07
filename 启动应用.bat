@echo off
chcp 65001 >nul
title 初中英语7年级下册学习平台 - 稳定服务器

echo ========================================
echo   初中英语7年级下册学习平台
echo   稳定服务器启动中...
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] 检查Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未找到Node.js，请先安装Node.js
    echo 下载地址：https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js已就绪
echo.

echo [2/3] 启动服务器...
echo 服务器将在 http://localhost:8080 运行
echo.
echo ========================================
echo   服务器已启动！
echo   请在浏览器中打开：
echo   http://localhost:8080
echo.
echo   按 Ctrl+C 可以停止服务器
echo ========================================
echo.

node server.js

if %errorlevel% neq 0 (
    echo.
    echo ⚠️  服务器意外停止，正在重新启动...
    timeout /t 2 >nul
    goto :launch
)

pause
