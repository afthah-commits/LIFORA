@echo off
setlocal enabledelayedexpansion

echo =====================================================================
echo              FITPULSE AI - Personal Fitness Platform
echo                   Local Development Launcher
echo =====================================================================
echo.

:: 1. Navigate to Project Root
cd /d "%~dp0"

:: 2. Check Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found in PATH!
    echo Please install Python 3.11+ and add it to your system PATH.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version') do set PYTHON_VER=%%v
echo [OK] %PYTHON_VER% detected.

:: 3. Check Node.js and npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js / npm was not found in PATH!
    echo Please install Node.js 18+ and add it to your system PATH.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Node.js %NODE_VER% detected.

:: 4. Check PostgreSQL Availability (Docker or Local Service)
echo [INFO] Checking PostgreSQL status...
where docker >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Docker detected. Starting PostgreSQL container if needed...
    docker compose up -d db >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] PostgreSQL container started via Docker Compose.
    ) else (
        echo [INFO] Docker compose exited. Checking port 5432...
    )
) else (
    echo [INFO] Docker CLI not in PATH. Checking local Windows PostgreSQL service...
)

:: Verify port 5432 is active
netstat -ano | findstr :5432 | findstr LISTENING >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Port 5432 is not currently listening.
    echo Make sure local PostgreSQL service or Docker Desktop is running!
) else (
    echo [OK] PostgreSQL service is active on port 5432.
)

:: 5. Activate Virtual Environment if available
if exist .venv\Scripts\activate.bat (
    echo [INFO] Activating virtual environment [.venv]...
    call .venv\Scripts\activate.bat
) else if exist venv\Scripts\activate.bat (
    echo [INFO] Activating virtual environment [venv]...
    call venv\Scripts\activate.bat
)

:: 6. Run Database Migrations
echo [INFO] Applying database migrations (Alembic)...
python -m alembic upgrade head
if %errorlevel% neq 0 (
    echo [WARNING] Migration check failed. Please ensure PostgreSQL database 'fitpulse_db' exists.
) else (
    echo [OK] Database schema is up to date.
)

:: 7. Start FastAPI Backend in new window
echo [INFO] Launching FastAPI Backend...
start "FITPULSE Backend" cmd /k "title FITPULSE Backend && python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

:: 8. Start Vite Frontend in new window
echo [INFO] Launching React Vite Frontend...
start "FITPULSE Frontend" cmd /k "title FITPULSE Frontend && cd frontend && npm run dev"

:: 9. Display Launch URLs
echo.
echo =====================================================================
echo                     FITPULSE AI IS READY!
echo =====================================================================
echo.
echo  * Frontend Web App:     http://localhost:5173
echo  * Backend API Health:   http://localhost:8000/health
echo  * Interactive API Docs: http://localhost:8000/api/v1/docs
echo  * Alternative API Docs: http://localhost:8000/api/v1/redoc
echo.
echo  Default Login Credentials:
echo    Email:    user@fitpulse.ai
echo    Password: fitpulse123
echo.
echo  To stop all services cleanly, run: stop-fitpulse.bat
echo =====================================================================
echo.
pause
