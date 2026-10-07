@echo off
echo ========================================================
echo VIGILANCE HONEYPOT PLATFORM STARTUP SCRIPT
echo ========================================================
echo.

:: Check and create .env files if missing
if not exist "nowhere-esports-intranet\.env" (
    echo [INFO] Creating nowhere-esports-intranet\.env from .env.example
    copy "nowhere-esports-intranet\.env.example" "nowhere-esports-intranet\.env"
)

if not exist "honeypot-platform\.env" (
    echo [INFO] Creating honeypot-platform\.env from .env.example
    copy "honeypot-platform\.env.example" "honeypot-platform\.env"
)

:: Validate nowhere-esports-intranet environment
echo [INFO] Checking nowhere-esports-intranet environment...
set USE_SUPABASE_INTRANET=false
set MONGODB_URI=
set SUPABASE_URL=
set SUPABASE_ANON_KEY=

for /f "usebackq tokens=1,2 delims==" %%i in ("nowhere-esports-intranet\.env") do (
    if "%%i"=="USE_SUPABASE" set USE_SUPABASE_INTRANET=%%j
    if "%%i"=="MONGODB_URI" set MONGODB_URI=%%j
    if "%%i"=="SUPABASE_URL" set SUPABASE_URL=%%j
    if "%%i"=="SUPABASE_ANON_KEY" set SUPABASE_ANON_KEY=%%j
)

:: Trim spaces
if not "%USE_SUPABASE_INTRANET%"=="" set USE_SUPABASE_INTRANET=%USE_SUPABASE_INTRANET: =%
if not "%MONGODB_URI%"=="" set MONGODB_URI=%MONGODB_URI: =%
if not "%SUPABASE_URL%"=="" set SUPABASE_URL=%SUPABASE_URL: =%
if not "%SUPABASE_ANON_KEY%"=="" set SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY: =%

if "%USE_SUPABASE_INTRANET%"=="true" (
    echo [STATUS] Active database provider: Supabase
    if "%SUPABASE_URL%"=="" (
        echo [WARNING] SUPABASE_URL is missing in nowhere-esports-intranet\.env!
    )
    if "%SUPABASE_ANON_KEY%"=="" (
        echo [WARNING] SUPABASE_ANON_KEY is missing in nowhere-esports-intranet\.env!
    )
) else (
    echo [STATUS] Active database provider: MongoDB
    if "%MONGODB_URI%"=="" (
        echo [WARNING] MONGODB_URI is missing in nowhere-esports-intranet\.env!
    )
)
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
