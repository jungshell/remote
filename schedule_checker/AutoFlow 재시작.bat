@echo off
cd /d "%~dp0"

if not exist "node_modules\next" (
    echo node_modules not found. Run npm install first.
    pause
    exit /b 1
)

echo Checking port 4000...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :4000') do (
    taskkill /PID %%a /F 2>nul
    timeout /t 2 /nobreak >nul
)

echo Starting AutoFlow server...
start "AutoFlow" cmd /k "npx next dev -p 4000"

echo Opening browser in 10 sec...
timeout /t 10 /nobreak >nul
start "" "http://localhost:4000"

timeout /t 2 >nul
exit
