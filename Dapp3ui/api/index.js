const express = require('express');
const cors = require('cors');

const app = express();

// ZK-PRET Core Server Configuration - Replace with your actual Vercel deployment URLs
const ZK_PRET_SERVER_URL = process.env.ZK_PRET_SERVER_URL || 'https://your-zkpret-server.vercel.app';
const ZK_PRET_TEST_URL = process.env.ZK_PRET_TEST_URL || 'https://your-zkpret-test.vercel.app';

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health check endpoint - check both servers
app.get('/api/v1/health', async (req, res) => {
  try {
    // Try to reach the ZK-PRET server
    const serverHealthResponse = await fetch(`${ZK_PRET_SERVER_URL}/api/v1/health`);
    const serverHealth = await serverHealthResponse.json();
    
    // Try to reach the ZK-PRET test server
    let testServerHealth = null;
    try {
      const testResponse = await fetch(`${ZK_PRET_TEST_URL}/api/v1/health`);
      testServerHealth = await testResponse.json();
    } catch (testError) {
      console.log('ZK-PRET test server not reachable');
    }
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        zkPretServer: serverHealthResponse.ok,
        zkPretTestServer: testServerHealth !== null,
        uiServer: true
      },
      serverUrls: {
        zkPretServer: ZK_PRET_SERVER_URL,
        zkPretTestServer: ZK_PRET_TEST_URL
      },
      serverHealth,
      testServerHealth
    });
  } catch (error) {
    console.error('Health check failed:', error.message);
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        zkPretServer: false,
        zkPretTestServer: false,
        uiServer: true
      },
      error: 'ZK-PRET servers unavailable',
      details: error.message
    });
  }
});

// Tools endpoint - proxy to ZK-PRET server
app.get('/api/v1/tools', async (req, res) => {
  try {
    const response = await fetch(`${ZK_PRET_SERVER_URL}/api/v1/tools`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(503).json({ 
      error: 'ZK-PRET server unavailable',
      serverUrl: ZK_PRET_SERVER_URL,
      details: error.message
    });
  }
});

// Tool execution endpoint - proxy to ZK-PRET server
app.post('/api/v1/tools/execute', async (req, res) => {
  try {
    console.log('Proxying tool execution to:', ZK_PRET_SERVER_URL);
    console.log('Request body:', req.body);
    
    const response = await fetch(`${ZK_PRET_SERVER_URL}/api/v1/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.text();
    
    if (response.ok) {
      try {
        const jsonData = JSON.parse(data);
        res.json(jsonData);
      } catch (parseError) {
        res.json({ success: true, result: data });
      }
    } else {
      res.status(response.status).json({ 
        error: 'ZK-PRET execution failed',
        status: response.status,
        response: data
      });
    }
  } catch (error) {
    console.error('Tool execution proxy error:', error);
    res.status(503).json({ 
      error: 'ZK-PRET server unavailable',
      serverUrl: ZK_PRET_SERVER_URL,
      details: error.message
    });
  }
});

// File listing endpoints - proxy to ZK-PRET server
app.get('/api/v1/process-files/:processType/:fileType', async (req, res) => {
  try {
    const { processType, fileType } = req.params;
    const response = await fetch(`${ZK_PRET_SERVER_URL}/api/v1/process-files/${processType}/${fileType}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(503).json({ 
      error: 'ZK-PRET server unavailable',
      endpoint: `/api/v1/process-files/${req.params.processType}/${req.params.fileType}`,
      details: error.message
    });
  }
});

app.get('/api/v1/bill-of-lading-files', async (req, res) => {
  try {
    const response = await fetch(`${ZK_PRET_SERVER_URL}/api/v1/bill-of-lading-files`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(503).json({ 
      error: 'ZK-PRET server unavailable',
      endpoint: '/api/v1/bill-of-lading-files',
      details: error.message
    });
  }
});

// Composed proofs endpoints - proxy to ZK-PRET test server
app.get('/api/v1/composed-proofs/templates', async (req, res) => {
  try {
    const response = await fetch(`${ZK_PRET_TEST_URL}/api/v1/composed-proofs/templates`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(503).json({ 
      error: 'ZK-PRET test server unavailable',
      endpoint: '/api/v1/composed-proofs/templates',
      details: error.message
    });
  }
});

app.post('/api/v1/composed-proofs/execute', async (req, res) => {
  try {
    const response = await fetch(`${ZK_PRET_TEST_URL}/api/v1/composed-proofs/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(503).json({ 
      error: 'ZK-PRET test server unavailable',
      endpoint: '/api/v1/composed-proofs/execute',
      details: error.message
    });
  }
});

// Configuration endpoint to show current setup
app.get('/api/v1/config', (req, res) => {
  res.json({
    deployment: 'vercel',
    timestamp: new Date().toISOString(),
    servers: {
      zkPretServer: ZK_PRET_SERVER_URL,
      zkPretTestServer: ZK_PRET_TEST_URL,
      uiServer: req.get('host')
    },
    environment: process.env.NODE_ENV || 'production'
  });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /api/v1/health',
      'GET /api/v1/tools',
      'POST /api/v1/tools/execute',
      'GET /api/v1/config'
    ],
    timestamp: new Date().toISOString()
  });
});

// Export the Express app as a Vercel serverless function
module.exports = app;
