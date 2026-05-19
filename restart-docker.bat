@echo off
REM AI UI Generator - Docker Restart Script (Batch)
REM Run as Administrator

color 0B
title Docker Recovery - AI UI Generator

echo.
echo ╔════════════════════════════════════════════╗
echo ║  AI UI Generator - Docker Restart Script   ║
echo ║  Run this as Administrator                 ║
echo ╚════════════════════════════════════════════╝
echo.

REM Check if running as admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: You must run this script as Administrator!
    echo.
    echo Right-click cmd.exe and select "Run as administrator"
    pause
    exit /b 1
)

echo [STEP 1] Stopping Docker services...
cd /d "C:\Users\merye\Downloads\ai-ui-generator-fixed\ai-ui-generator-fixed"
docker compose down --remove-orphans 2>nul
echo ✓ Containers stopped
echo.

echo [STEP 2] Starting Docker Compose services...
echo This will pull images and start all services (1-2 minutes)...
echo.
docker compose up -d

echo.
echo [STEP 3] Waiting for services to start (30 seconds)...
timeout /t 30 /nobreak

echo.
echo [STEP 4] Checking service status...
echo.
docker compose ps

echo.
echo ╔════════════════════════════════════════════╗
echo ║  ✓ Docker services should be running now  ║
echo ╚════════════════════════════════════════════╝
echo.
echo Access URLs:
echo   Frontend:   http://localhost:5173
echo   Backend:    http://localhost:8081
echo   FastAPI:    http://localhost:8000
echo   Keycloak:   http://localhost:8083
echo.
echo Credentials:
echo   Username: developpeur
echo   Password: developpeur
echo.
echo Wait 30-60 seconds for services to fully initialize before accessing!
echo.
pause
