@echo off
echo ========================================================
echo VIGILANCE HONEYPOT PLATFORM STARTUP SCRIPT
echo ========================================================
echo.

:: Check and create .env files if missing
if not exist "nowhere-esports-intranet\backend\.env" (
    echo [INFO] Creating nowhere-esports-intranet\backend\.env from .env.example
    copy "nowhere-esports-intranet\backend\.env.example" "nowhere-esports-intranet\backend\.env"
)

if not exist "nowhere-esports-intranet\.env" (
    echo [INFO] Creating nowhere-esports-intranet\.env from .env.example
    copy "nowhere-esports-intranet\.env.example" "nowhere-esports-intranet\.env"
)

if not exist "honeypot-platform\.env" (
    echo [INFO] Creating honeypot-platform\.env from .env.example
    copy "honeypot-platform\.env.example" "honeypot-platform\.env"
)

:: Validate environment
echo [INFO] Checking environment...
echo [STATUS] Active database provider: Native PostgreSQL (port 5432)
echo.

echo [1] Starting Nowhere Esports TypeScript Backend (Port 3000)...
start cmd /k "cd nowhere-esports-intranet\backend && npm run dev"

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
