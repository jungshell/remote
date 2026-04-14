@echo off
cd /d "%~dp0"

if not exist "node_modules\next" (
    echo node_modules not found. Run npm install first.
    echo If you see TAR_ENTRY_ERROR, copy this folder to C:\dev and run npm install there.
    pause
    exit /b 1
)

echo Starting AutoFlow server...
start "AutoFlow" cmd /k "npx next dev -p 4000"

echo Opening browser in 10 sec...
timeout /t 10 /nobreak >nul
start "" "http://localhost:4000"

timeout /t 2 >nul
exit
