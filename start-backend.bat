@echo off
echo ========================================
echo  DataFlow AI - Backend Server
echo ========================================
cd /d "%~dp0backend"
if not exist ".venv\Scripts\python.exe" (
    echo ERROR: Virtual environment not found!
    echo Please run setup.bat first.
    pause
    exit /b 1
)
echo Starting FastAPI backend on http://localhost:8000
echo API docs: http://localhost:8000/api/docs
echo.
.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
