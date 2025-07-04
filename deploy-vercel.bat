@echo off
REM 🚀 ZK-PRET UI Vercel Deployment Script - Async Mode Only (Windows)
REM This script deploys your ZK-PRET UI to Vercel with async-only configuration

echo 🚀 ZK-PRET UI Vercel Deployment (Async Mode Only)
echo ==================================================

REM Check if vercel CLI is installed
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo 📦 Installing Vercel CLI...
    npm install -g vercel
)

REM Build the project
echo 🔨 Building project...
npm run build

REM Check build status
if %errorlevel% neq 0 (
    echo ❌ Build failed! Please fix errors and try again.
    exit /b 1
)

echo ✅ Build successful!

REM Deploy to Vercel
echo 🚀 Deploying to Vercel...
vercel --prod

REM Check deployment status
if %errorlevel% equ 0 (
    echo.
    echo 🎉 Deployment successful!
    echo.
    echo 🎯 Your ZK-PRET UI is now live with:
    echo    • ✅ Async-only mode enabled
    echo    • ✅ Real implementation (no demo mode^)
    echo    • ✅ Professional web interface
    echo    • ✅ Background job processing
    echo.
    echo 📋 Next steps:
    echo    1. Visit your deployed URL
    echo    2. Test the /api/v1/status endpoint
    echo    3. Verify 'mode.operation' shows 'ASYNC'
    echo    4. Connect to your ZK-PRET backend server
    echo.
    echo 🔗 Quick verification:
    echo    GET {your-url}/api/v1/status
    echo    Expected: "asyncEnabled": true, "realImplementation": true
) else (
    echo ❌ Deployment failed! Please check the errors above.
    exit /b 1
)

pause
