@echo off
chcp 65001 >nul
echo Checking port 4000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000') do (
  echo Killing PID %%a
  taskkill /PID %%a /F
  timeout /t 2 /nobreak >nul
)
echo Done. You can now run: npm run dev
