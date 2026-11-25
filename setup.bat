@echo off
echo ========================================
echo  DataFlow AI - Setup Script
echo ========================================
echo.

set NODE_PATH=C:\Users\Admin\AppData\Local\Programs\nodejs
set UV_PATH=C:\Users\Admin\.local\bin
set PATH=%NODE_PATH%;%UV_PATH%;%PATH%

REM === Backend Setup ===
echo [1/4] Setting up Python backend...
cd /d "%~dp0backend"

if not exist ".env" (
    echo Creating .env from template...
    copy .env.example .env
    echo IMPORTANT: Edit backend\.env to configure your database and API keys.
)

if not exist ".venv\Scripts\python.exe" (
    echo Creating Python virtual environment...
    uv venv --python 3.11 .venv
)

echo Installing Python packages...
uv pip install -r requirements.txt --python .venv
echo Backend dependencies installed.
echo.

REM === Frontend Setup ===
echo [2/4] Setting up Frontend...
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo Installing Node.js packages (this may take a few minutes)...
    node "%NODE_PATH%\node_modules\npm\bin\npm-cli.js" install
) else (
    echo node_modules already present, checking for updates...
    node "%NODE_PATH%\node_modules\npm\bin\npm-cli.js" install
)
echo Frontend dependencies installed.
echo.

REM === Database ===
echo [3/4] Initializing database...
cd /d "%~dp0backend"
.venv\Scripts\python.exe -c "from app.core.database import create_tables; from app.models.user import User; from app.models.dataset import Dataset, Dashboard; create_tables(); print('Database tables created!')"
echo.

echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo To start DataFlow AI:
echo   1. Backend:  run start-backend.bat
echo   2. Frontend: run start-frontend.bat
echo.
echo Then open: http://localhost:5173
echo API docs:  http://localhost:8000/api/docs
echo.
echo NOTE: The app works without an OpenAI key.
echo To enable AI chat, add OPENAI_API_KEY to backend\.env
echo.
pause
