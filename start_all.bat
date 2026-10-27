@echo off
chcp 65001 >nul
title EduPulse — All-in-One Launcher
echo ====================================================================
echo   KHỞI CHẠY HỆ THỐNG TOÀN DIỆN EDUPULSE (ALL-IN-ONE)
echo ====================================================================
echo.

cd /d "%~dp0"

:: Tìm Python có sẵn trên hệ thống (py -3.11, py, python)
set "PY="
py -3.11 --version >nul 2>&1
if not errorlevel 1 (
    set "PY=py -3.11"
) else (
    py --version >nul 2>&1
    if not errorlevel 1 (
        set "PY=py"
    ) else (
        python --version >nul 2>&1
        if not errorlevel 1 (
            set "PY=python"
        ) else (
            echo [LỖI] Không tìm thấy Python trên hệ thống!
            echo Vui lòng cài đặt Python (từ python.org) và tích chọn "Add Python to PATH".
            pause
            exit /b 1
        )
    )
)

%PY% start.py %*

if errorlevel 1 (
    echo.
    echo [THÔNG BÁO] Tiến trình đã dừng lại hoặc gặp sự cố.
    pause
)

