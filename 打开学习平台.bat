@echo off
chcp 65001 >nul 2>&1
title 初中英语7年级下册 - 学习平台
echo.
echo   ============================================
echo      📚 初中英语7年级下册 学习平台
echo   ============================================
echo.
echo   ✅ 正在启动学习平台...
echo   💡 提示：直接用浏览器打开，无需服务器！
echo   📂 永久可用，随时双击即可学习
echo.
echo   ============================================
echo.

start "" "%~dp0index.html"

echo.
echo   🚀 已在浏览器中打开！
echo   ⏳ 本窗口5秒后自动关闭...
echo.

timeout /t 5 /nobreak >nul 2>&1
exit
