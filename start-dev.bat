@echo off
REM TestBro Development Startup Script for Windows
REM This script starts both frontend and backend in development mode

echo 🚀 Starting TestBro Development Environment...
echo ========================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ and try again.
    pause
    exit /b 1
)

echo [SUCCESS] Node.js %node --version% detected

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed. Please install npm and try again.
    pause
    exit /b 1
)

REM Check for existing processes
echo [INFO] Checking for existing services...
netstat -an | find "3001" >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Port 3001 is already in use. Backend might already be running.
)

netstat -an | find "5173" >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Port 5173 is already in use. Frontend might already be running.
)

REM Install dependencies if needed
echo [INFO] Checking dependencies...

if not exist "testbro-backend\node_modules\" (
    echo [INFO] Installing backend dependencies...
    cd testbro-backend
    call npm install
    cd ..
    echo [SUCCESS] Backend dependencies installed
) else (
    echo [SUCCESS] Backend dependencies already installed
)

if not exist "testbro-frontend\node_modules\" (
    echo [INFO] Installing frontend dependencies...
    cd testbro-frontend
    call npm install
    cd ..
    echo [SUCCESS] Frontend dependencies installed
) else (
    echo [SUCCESS] Frontend dependencies already installed
)

REM Check environment files
echo [INFO] Checking environment configuration...

if not exist "testbro-backend\.env" (
    echo [WARNING] Backend .env file not found. Using default development configuration.
    echo [WARNING] Please configure your environment variables in testbro-backend\.env
)

if not exist "testbro-frontend\.env" (
    echo [WARNING] Frontend .env file not found. Using default development configuration.
    echo [WARNING] Please configure your environment variables in testbro-frontend\.env
)

REM Create logs directory
if not exist "logs\" mkdir logs

REM Start backend
echo [INFO] Starting backend server...
cd testbro-backend
start "TestBro Backend" cmd /k "npm run dev"
cd ..

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo [INFO] Starting frontend development server...
cd testbro-frontend
start "TestBro Frontend" cmd /k "npm run dev"
cd ..

echo.
echo ========================================
echo 🎉 TestBro Development Environment Started!
echo ========================================
echo.
echo Frontend:  http://localhost:5173
echo Backend:   http://localhost:3001
echo Health:    http://localhost:3001/health
echo.
echo Two new command windows have opened:
echo - TestBro Backend (running on port 3001)
echo - TestBro Frontend (running on port 5173)
echo.
echo Close those windows to stop the services.
echo.
pause