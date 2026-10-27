@echo off
chcp 65001 >nul
title EduPulse — All-in-One Launcher
echo ====================================================================
echo   KHỞI CHẠY HỆ THỐNG TOÀN DIỆN EDUPULSE (ALL-IN-ONE)
echo ====================================================================
echo.

cd /d "%~dp0"

:: Tìm Python có cài đặt dependencies (Ưu tiên Python 3.11)
set "PY="
if exist "C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe" (
    set "PY=C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe"
) else (
    py -3.11 --version >nul 2>&1
    if not errorlevel 1 (
        set "PY=py -3.11"
    ) else (
        python --version >nul 2>&1
        if not errorlevel 1 (
            set "PY=python"
        ) else (
            echo [LỖI] Không tìm thấy Python trên hệ thống!
            pause
            exit /b 1
        )
    )
)


"%PY%" start.py %*

if errorlevel 1 (
    echo.
    echo [THÔNG BÁO] Tiến trình đã dừng lại hoặc gặp sự cố.
    pause
)

