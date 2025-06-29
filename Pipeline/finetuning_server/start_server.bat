@echo off
echo 🧬 Protein Fine-tuning Server - Local Development
echo ==================================================

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "apis.py" (
    echo ❌ Please run this script from the finetuning_server directory
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔄 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo 📥 Installing dependencies...
pip install -r requirements.txt

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  No .env file found. Creating one from template...
    copy ".env.example" ".env"
    echo ✏️  Please edit .env file with your actual values before running in production mode
)

REM Set development mode
set DEVELOPMENT_MODE=true
set USE_DEV_API=true

echo.
echo 🚀 Starting server in development mode...
echo    This mode uses mock services and in-memory storage
echo    Perfect for testing the API without external dependencies
echo.

REM Start the server
python main.py

pause
