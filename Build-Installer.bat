@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Dive More ERP - Windows Installer Builder
color 0B

echo ==========================================================
echo   DIVE MORE ERP ^| Windows Desktop Installer Builder
echo ==========================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Install Node.js 20 LTS or newer from https://nodejs.org/ then run this file again.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Reinstall Node.js with npm enabled.
  pause
  exit /b 1
)
for /f "tokens=1" %%V in ('node -p "process.versions.node.split('.')[0]"') do set NODE_MAJOR=%%V
if %NODE_MAJOR% LSS 20 (
  echo [ERROR] Node.js 20 or newer is required. Detected major version %NODE_MAJOR%.
  pause
  exit /b 1
)

echo Enter the central API address reachable by this computer.
echo Example on the same computer: http://127.0.0.1:8787
echo Example on a networked computer: http://192.168.1.50:8787
echo.
set /p "API_URL=Central API URL [http://127.0.0.1:8787]: "
if not defined API_URL set "API_URL=http://127.0.0.1:8787"
echo(%API_URL%| findstr /b /c:"http://" /c:"https://" >nul
if errorlevel 1 (
  echo [ERROR] The API URL must start with http:// or https://
  pause
  exit /b 1
)
set "VITE_API_URL=%API_URL%"

echo.
echo [1/3] Installing project dependencies. Internet access is required the first time...
if exist package-lock.json (
  call npm ci --no-audit --no-fund
) else (
  call npm install --no-audit --no-fund
)
if errorlevel 1 (
  echo [ERROR] Dependency installation failed. Check internet access and rerun this file.
  pause
  exit /b 1
)

echo.
echo [2/3] Running regression tests...
call npm test
if errorlevel 1 (
  echo [ERROR] Tests failed. No installer was created.
  pause
  exit /b 1
)

echo.
echo [3/3] Building the Windows NSIS installer. This may take several minutes on first run...
call npm run desktop:build
if errorlevel 1 (
  echo [ERROR] Installer build failed. Read the error above before distributing the app.
  pause
  exit /b 1
)

echo.
if exist "release\Dive-More-ERP-Setup-0.3.0.exe" (
  echo [SUCCESS] Installer created: %CD%\release\Dive-More-ERP-Setup-0.3.0.exe
  explorer "%CD%\release"
) else (
  echo [NOTICE] Build command completed. Check the release folder for the generated EXE.
  if exist release explorer "%CD%\release"
)
echo.
echo NOTE: The desktop currently uses PostgreSQL-backed authentication/health checking,
echo but all ERP business modules are not yet fully migrated to central PostgreSQL.
echo Do not use it as the authoritative live accounting system until that migration is complete.
echo.
pause
