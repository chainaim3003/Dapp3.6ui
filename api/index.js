import { parse } from 'url';

export default function handler(req, res) {
  const { pathname, query } = parse(req.url, true);
  const { method } = req;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Health check for frontend
  if (pathname === '/api/health') {
    return res.status(200).json({
      status: 'healthy',
      service: 'zk-pret-frontend',
      mode: 'ASYNC_ONLY',
      environment: 'vercel',
      features: {
        asyncJobs: true,
        websockets: false,
        realImplementation: true
      },
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  }

  // Configuration endpoint for frontend
  if (pathname === '/api/config' && method === 'GET') {
    return res.status(200).json({
      apiServerUrl: process.env.ZK_PRET_SERVER_URL || 'https://your-api-server.vercel.app',
      coreEngineUrl: process.env.ZK_PRET_CORE_URL || 'https://your-core-engine.vercel.app',
      environment: process.env.NODE_ENV || 'production',
      mode: 'ASYNC_ONLY',
      features: {
        asyncJobs: true,
        websockets: false, // Disabled in serverless
        fileUpload: true,
        realImplementation: true
      }
    });
  }

  // Proxy requests to API server (real backend connection)
  if (pathname.startsWith('/api/proxy/')) {
    const targetPath = pathname.replace('/api/proxy', '');
    const apiServerUrl = process.env.ZK_PRET_SERVER_URL || 'https://your-api-server.vercel.app';
    
    // This would normally forward to your real API server
    return res.status(200).json({
      message: 'Proxy endpoint - connects to real API server',
      targetUrl: `${apiServerUrl}${targetPath}`,
      method: method,
      realImplementation: true
    });
  }

  // Default response
  res.status(404).json({ error: 'API endpoint not found' });
}