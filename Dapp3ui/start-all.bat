@echo off
echo ===============================================
echo Starting ALL ZK-PRET Modes Simultaneously
echo ===============================================
echo.
echo This will start:
echo 1. STDIO Mode (Port 3000) - Your current working setup
echo 2. HTTP Mode (Port 3001) - HTTP API interface
echo 3. MCP Server - For Claude integration
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause
echo.

echo Installing required dependencies if not present...
npm install --silent
echo.

echo Starting all services...
npm run start:all

pause