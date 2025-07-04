@echo off
echo Starting ZK-PRET Web Application...
cd /d "C:\SATHYA\CHAINAIM3003\mcp-servers\21ALT\Dapp2.1ui\zk-pret-dapp2.1"

echo Building application...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo Build failed! Please check for TypeScript errors.
    pause
    exit /b 1
)

echo Starting server...
call npm start
