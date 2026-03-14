@echo off
title Best Life - Sistema Integrado
cls
echo ============================================================
echo   BEST LIFE - INICIANDO ECOSISTEMA
echo ============================================================
echo.

:: 1. Limpieza de procesos antiguos
echo [1/4] Limpiando procesos Node.js previos...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

:: 2. Iniciar Backend
echo [2/4] Iniciando Servidor Backend (Puerto 4000)...
start "Best Life - Backend" cmd /c "cd backend && npm run dev"
timeout /t 5 /nobreak >nul

:: 3. Iniciar Dashboard
echo [3/4] Iniciando Dashboard Admin (Puerto 3005)...
start "Best Life - Dashboard" cmd /c "cd dashboard && npm run dev -- -p 3005"
timeout /t 5 /nobreak >nul

:: 4. Iniciar Bot
echo [4/4] Iniciando Bot Corazón (WhatsApp)...
start "Best Life - Bot" cmd /c "npm start"

echo.
echo ============================================================
echo   LISTO: Todo el sistema se esta ejecutando en ventanas separadas.
echo ============================================================
echo.
echo  - Backend: http://localhost:4000/health
echo  - Dashboard: http://localhost:3005
echo.
echo NOTA: No cierres las ventanas negras mientras uses el sistema.
echo ============================================================
pause
