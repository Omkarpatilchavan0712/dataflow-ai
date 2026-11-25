@echo off
echo ========================================
echo  DataFlow AI - Frontend Dev Server
echo ========================================
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo ERROR: node_modules not found!
    echo Please run: npm install
    pause
    exit /b 1
)

set NODE_PATH=C:\Users\Admin\AppData\Local\Programs\nodejs
set PATH=%NODE_PATH%;%PATH%

echo Starting Vite dev server on http://localhost:5173
echo.
node node_modules\vite\bin\vite.js --host 0.0.0.0 --port 5173
pause
