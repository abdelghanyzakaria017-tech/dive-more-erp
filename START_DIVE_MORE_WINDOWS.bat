@echo off
REM Dive More ERP - Phase 51 starter for the office Windows PC (draft, no secrets).
REM Before first run:
REM   1) Install Node.js 24 LTS from nodejs.org
REM   2) Copy .env.example to .env in the project root and set JWT_SECRET (32+ chars),
REM      BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD, VITE_API_URL=http://<THIS-PC-LAN-IP>:8787
REM   3) Allow inbound TCP 8787 in Windows Firewall on the Private network only.
REM Do NOT expose port 8787 to the public internet without a VPN or HTTPS reverse proxy.
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install Node.js 24 LTS from https://nodejs.org then run again.
  pause
  exit /b 1
)

if not exist ".env" (
  echo [ERROR] .env was not found in this folder.
  echo Copy .env.example to .env and fill in JWT_SECRET and the bootstrap owner, then run again.
  pause
  exit /b 1
)

echo Starting Dive More API server on port 8787...
start "Dive More API Server" cmd /k "cd /d %~dp0server && npm install && npm start"

timeout /t 3 /nobreak >nul
echo Opening health check - it should show {"status":"ok",...}
start "" "http://127.0.0.1:8787/api/health"

echo Starting Dive More app (dev server)...
start "Dive More App" cmd /k "cd /d %~dp0 && npm install && npm run dev"

echo.
echo Done. If the health page does not say ok, check the API Server window for errors.
echo Reset codes (without SMTP) appear in the server console and server\data\reset-outbox.log
pause
