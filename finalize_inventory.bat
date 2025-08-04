@echo off
echo Meat Store Management System - Portable Setup
echo =================================================

:: Check Node.js version
echo Checking Node.js version...
node --version >nul 2>&1 || (
    echo ❌ Node.js is not installed. Please install Node.js 16+ from nodejs.org
    pause
    exit /b 1
)

:: Check MongoDB connection
echo Checking Mongo.js version...
mongo --eval "db.runCommand({ping: 1})" >nul 2>&1 || (
    echo ⚠️  MongoDB is not running. Please start MongoDB service
    echo On Windows: net start MongoDB
    echo Or run: "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe"
    pause
    exit /b 1
)

:: Navigate to project directory
cd /d "%~dp0"

:: Install dependencies if needed
echo Installing/updating dependencies...
npm install
cd client
npm install
cd ..

:: Start backend server
echo Starting backend server...
start cmd /k "npm run server"

:: Wait for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend
echo Starting frontend...
cd client
start cmd /k "npm start"
cd ..

echo ✅ Meat shop management system started successfully!
echo 🌐 Backend: http://localhost:5000
echo 🌐 Frontend: http://localhost:3000
pause
</content>
</attempt_completion>
