@echo off
setlocal
cd /d "%~dp0"

where php >nul 2>&1
if errorlevel 1 (
    echo ERROR: PHP not found. Install PHP and add to PATH.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm not found. Install Node.js LTS.
    pause
    exit /b 1
)

if not exist "node_modules\" (
  echo Running npm install...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

REM Gemini API key. Create services\api\gemini_key.txt with one line.
if exist "%~dp0services\api\gemini_key.txt" (
  for /f "usebackq delims=" %%A in ("%~dp0services\api\gemini_key.txt") do (
    set "GEMINI_API_KEY=%%A"
    goto :gem_key_done
  )
)
:gem_key_done
if defined GEMINI_API_KEY set "AI_PROVIDER=gemini"

echo Starting API server...
start "CNCI-API" cmd /k pushd "%~dp0services\api" ^&^& php -S 127.0.0.1:8080 -t public public/router.php
timeout /t 2 /nobreak >nul

echo Starting web app...
start "CNCI-WEB" cmd /k pushd "%~dp0" ^&^& call npm.cmd run dev:web

timeout /t 5 /nobreak >nul
start "" http://localhost:5188

echo.
echo Browser should open. If not, open: http://localhost:5188
echo Login: admin@cnci.local  /  admin1234
echo Keep the two new windows open. You may close this one.
echo.
pause
