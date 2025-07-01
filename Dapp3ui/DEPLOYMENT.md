# ZK-PRET Web App - Vercel Deployment Guide

## Quick Deploy Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add Vercel deployment configuration for Web App"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import this repository
   - Framework: "Other"
   - Build Command: `npm run vercel-build`
   - Output Directory: `dist`

3. **Environment Variables**
   Copy from `.env.production`:
   - NODE_ENV=production
   - ZK_PRET_WEB_APP_HOST=0.0.0.0
   - ZK_PRET_SERVER_TYPE=http
   - ZK_PRET_SERVER_URL=https://your-zk-pret-core-engine.vercel.app
   - (Add other variables as needed)

4. **Test Endpoints**
   - `https://your-web-app.vercel.app/`
   - `https://your-web-app.vercel.app/api/v1/status`

## Architecture

This Web App connects to:
- **Backend API**: Dapp3.6-pret-test (Core Engine)
- **HTTP Server**: Dapp3.6server (Optional middleware)

## Notes

- All existing functionality preserved
- WebSocket support included
- Async job processing enabled
- CORS configured for production
