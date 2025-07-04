#!/bin/bash

# 🚀 ZK-PRET UI Vercel Deployment Script - Async Mode Only
# This script deploys your ZK-PRET UI to Vercel with async-only configuration

echo "🚀 ZK-PRET UI Vercel Deployment (Async Mode Only)"
echo "=================================================="

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Build the project
echo "🔨 Building project..."
npm run build

# Check build status
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix errors and try again."
    exit 1
fi

echo "✅ Build successful!"

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

# Check deployment status
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deployment successful!"
    echo ""
    echo "🎯 Your ZK-PRET UI is now live with:"
    echo "   • ✅ Async-only mode enabled"
    echo "   • ✅ Real implementation (no demo mode)"
    echo "   • ✅ Professional web interface"
    echo "   • ✅ Background job processing"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Visit your deployed URL"
    echo "   2. Test the /api/v1/status endpoint"
    echo "   3. Verify 'mode.operation' shows 'ASYNC'"
    echo "   4. Connect to your ZK-PRET backend server"
    echo ""
    echo "🔗 Quick verification:"
    echo "   GET {your-url}/api/v1/status"
    echo "   Expected: \"asyncEnabled\": true, \"realImplementation\": true"
else
    echo "❌ Deployment failed! Please check the errors above."
    exit 1
fi
