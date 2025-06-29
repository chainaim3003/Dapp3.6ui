@echo off
echo Starting ZK-PRET MCP Server
echo This server exposes ZK-PRET tools via HTTP API for integration
echo.
echo Using environment: .env.mcp
echo Server Type: STDIO (Direct Script Execution for MCP)
echo Protocol: HTTP API (Port 3003)
echo.
echo Endpoints:
echo   GET  http://localhost:3003/health
echo   GET  http://localhost:3003/tools
echo   POST http://localhost:3003/tools/{toolName}/execute
echo   POST http://localhost:3003/tools/batch
echo.

dotenv -e .env.mcp -- tsx src/mcp-server.ts

pause