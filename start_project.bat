@echo off
echo ========================================================
echo VIGILANCE HONEYPOT PLATFORM STARTUP SCRIPT
echo ========================================================
echo.

echo [1] Starting Nowhere Esports Backend (Port 3000)...
start cmd /k "cd nowhere-esports-intranet && node server/index.js"

echo [2] Starting VIGILANCE Frontend Dashboard (Port 5173)...
start cmd /k "cd honeypot-platform\frontend && npm run dev"

echo.
echo ========================================================
echo Servers are launching in new windows!
echo Please wait 5 seconds, then open your browser:
echo.
echo Target Site: http://localhost:3000
echo Dashboard:   http://localhost:5173
echo ========================================================
pause
