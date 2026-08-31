@echo off
chcp 65001 >nul
title KOISU - YouTube and TikTok Video Converter

echo ===================================================
echo     KOISU - YouTube and TikTok Video Converter
echo ===================================================
echo.

echo [1/3] Checking Node.js dependencies...
if not exist node_modules (
    call npm install
)

echo.
echo [2/3] Updating yt-dlp and TikTok browser transport...
python -m pip install --upgrade yt-dlp curl_cffi

echo.
echo [3/3] Starting KOISU at http://localhost:3000 ...
echo.

start http://localhost:3000
call npm run dev
pause
