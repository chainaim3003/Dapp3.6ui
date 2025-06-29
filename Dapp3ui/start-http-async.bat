@echo off
echo ===============================================
echo Starting ZK-PRET WebApp - HTTP ASYNC Mode
echo ===============================================
echo.
echo Connection: HTTP (API Server Connection)
echo Execution:  ASYNC (Background Jobs)
echo Port:       3000 (Same for all modes)
echo Environment: .env.http-async
echo UI Mode:    HTTP-ASYNC
echo Target:     http://localhost:3001 (HTTP Server)
echo.
echo Features:
echo   ✅ HTTP API calls
echo   ✅ Background job processing
echo   ✅ WebSocket support
echo   ✅ Real-time updates
echo.
echo UI will detect mode and show async interface with job management
echo.
echo NOTE: Make sure ZK-PRET HTTP Server is running:
echo   cd C:\CHAINAIM3003\mcp-servers\zk-pret-http-server
echo   npm run http-server
echo.

npm run dev:http-async

pause