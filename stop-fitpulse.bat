@echo off
setlocal enabledelayedexpansion

echo =====================================================================
echo                Stopping FITPULSE AI Services
echo =====================================================================
echo.

:: 1. Terminate Backend on Port 8000
echo [INFO] Stopping FastAPI Backend (port 8000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING 2^>nul') do (
    echo Terminating PID %%a...
    taskkill /f /pid %%a >nul 2>&1
)

:: 2. Terminate Frontend on Port 5173
echo [INFO] Stopping Vite Frontend (port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING 2^>nul') do (
    echo Terminating PID %%a...
    taskkill /f /pid %%a >nul 2>&1
)

:: 3. Close Dedicated Command Windows
echo [INFO] Closing application windows...
taskkill /fi "WINDOWTITLE eq FITPULSE Backend*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq FITPULSE Frontend*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq FITPULSE-AI Backend*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq FITPULSE-AI Frontend*" /f >nul 2>&1

echo.
echo [OK] FITPULSE AI frontend and backend processes stopped.
echo Note: Database data and containers remain intact.
echo =====================================================================
echo.
pause
