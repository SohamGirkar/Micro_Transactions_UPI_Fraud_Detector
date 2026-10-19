@echo off
title UPI Fraud Sentinel - Dashboard

echo ==========================================
echo       UPI FRAUD SENTINEL DASHBOARD
echo ==========================================
echo.

REM Get the folder where this BAT file is located
set "ROOT=%~dp0"

echo [1/3] Starting FastAPI backend...
start "UPI Fraud Sentinel - Backend" cmd /k "cd /d "%ROOT%backend" && call .venv\Scripts\activate && echo Backend starting... && uvicorn main:app --reload --port 8000"

echo.
echo [2/3] Starting React frontend...
start "UPI Fraud Sentinel - Frontend" cmd /k "cd /d "%ROOT%frontend" && echo Frontend starting... && npm run dev"

echo.
echo [3/3] Waiting for services to start...
timeout /t 5 /nobreak >nul

echo.
echo Opening dashboard...
start "" "http://localhost:5173"

echo.
echo ==========================================
echo Backend:  http://127.0.0.1:8000
echo API Docs: http://127.0.0.1:8000/docs
echo Frontend: http://localhost:5173
echo ==========================================
echo.
echo Two terminal windows have been opened.
echo Keep them running while using the dashboard.
echo.
pause
