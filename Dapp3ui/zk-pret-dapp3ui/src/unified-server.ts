import dotenv from 'dotenv';
dotenv.config(); // Load consolidated environment

// ================================================================
// 🎛️ UNIFIED SERVER DYNAMIC CONFIGURATION
// ================================================================
const OPERATION_MODE = process.env.OPERATION_MODE || 'UNIFIED';
console.log(`🎯 Unified Operation Mode: ${OPERATION_MODE}`);

// Set unified-specific configurations
if (OPERATION_MODE === 'UNIFIED') {
  process.env.ZK_PRET_WEB_APP_PORT = process.env.UNIFIED_PORT || '3000';
  process.env.ZK_PRET_PREFERRED_MODE = process.env.UNIFIED_PREFERRED_MODE || 'auto';
  process.env.ZK_PRET_HTTP_SERVER_URL = process.env.UNIFIED_HTTP_SERVER_URL || 'http://localhost:3002';
  process.env.ZK_PRET_AUTO_SWITCH_ENABLED = process.env.UNIFIED_AUTO_SWITCH_ENABLED || 'true';
  process.env.ZK_PRET_HTTP_HEALTH_CHECK_INTERVAL = process.env.UNIFIED_HTTP_HEALTH_CHECK_INTERVAL || '30000';
  process.env.ZK_PRET_RETRY_HTTP_INTERVAL = process.env.UNIFIED_RETRY_HTTP_INTERVAL || '60000';
  process.env.ZK_PRET_SHOW_MODE_INDICATOR = process.env.UNIFIED_SHOW_MODE_INDICATOR || 'true';
  process.env.ZK_PRET_ALLOW_MANUAL_MODE_SWITCH = process.env.UNIFIED_ALLOW_MANUAL_MODE_SWITCH || 'true';
  process.env.LOG_LEVEL = process.env.UNIFIED_LOG_LEVEL || 'info';
}

console.log(`🔄 Unified Port: ${process.env.ZK_PRET_WEB_APP_PORT}`);
console.log(`🎯 Preferred Mode: ${process.env.ZK_PRET_PREFERRED_MODE}`);
console.log(`⚙️ Auto Switch: ${process.env.ZK_PRET_AUTO_SWITCH_ENABLED}`);

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { logger } from './utils/logger.js';
import { zkPretUnifiedClient } from './services/zkPretUnifiedClient.js';
import { modeManager } from './services/modeManager.js';

// Import existing services for compatibility
let blockchainStateService: any = null;
try {
  const { blockchainStateService: service } = await import('./services/blockchainStateService.js');
  blockchainStateService = service;
  logger.info('Blockchain state service loaded successfully');
} catch (error) {
  logger.warn('Blockchain state service failed to load', { error: error instanceof Error ? error.message : String(error) });
}

const app = express();
const server = createServer(app);

const ZK_PRET_WEB_APP_PORT = parseInt(process.env.ZK_PRET_WEB_APP_PORT || '3000', 10);
const ZK_PRET_WEB_APP_HOST = process.env.ZK_PRET_WEB_APP_HOST || 'localhost';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Enhanced health check with mode information
app.get('/api/v1/health', async (_req, res) => {
  try {
    const unifiedStatus = await zkPretUnifiedClient.getServerStatus();
    const modeStatus = await modeManager.getStatus();
    
    res.json({
      status: unifiedStatus.connected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      mode: {
        current: modeStatus.currentMode,
        preferred: modeStatus.preferredMode,
        autoSwitch: modeStatus.autoSwitchEnabled,
        httpServerAvailable: modeStatus.httpServerAvailable,
        stdioAvailable: modeStatus.stdioAvailable
      },
      services: { 
        zkPretServer: unifiedStatus.connected,
        unifiedMode: true,
        modeManager: true
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Mode management endpoints
app.get('/api/v1/mode/status', async (_req, res) => {
  try {
    const status = await modeManager.getStatus();
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get mode status',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/mode/switch', async (req, res) => {
  try {
    const { mode } = req.body;
    
    if (!['stdio', 'http', 'auto'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mode. Must be stdio, http, or auto',
        timestamp: new Date().toISOString()
      });
    }
    
    const success = await modeManager.forceMode(mode);
    
    if (success) {
      const newStatus = await modeManager.getStatus();
      res.json({
        success: true,
        message: `Mode switched to ${mode}`,
        status: newStatus,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: `Failed to switch to ${mode} mode`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Mode switch failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/mode/detect', async (_req, res) => {
  try {
    const bestMode = await modeManager.detectBestMode();
    const switchSuccess = await modeManager.switchMode(bestMode, 'manual-detection');
    
    if (switchSuccess) {
      const status = await modeManager.getStatus();
      res.json({
        success: true,
        detectedMode: bestMode,
        switched: true,
        status,
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        success: false,
        detectedMode: bestMode,
        switched: false,
        error: 'Failed to switch to detected mode',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Mode detection failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Tools endpoints using unified client
app.get('/api/v1/tools', async (_req, res) => {
  try {
    const tools = await zkPretUnifiedClient.listTools();
    const modeStatus = await modeManager.getStatus();
    
    res.json({ 
      tools, 
      timestamp: new Date().toISOString(),
      mode: modeStatus.currentMode,
      unifiedMode: true
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list tools' });
  }
});

app.post('/api/v1/tools/execute', async (req, res) => {
  try {
    const { toolName, parameters } = req.body;
    const modeBeforeExecution = modeManager.getCurrentMode();
    
    const result = await zkPretUnifiedClient.executeTool(toolName, parameters);
    const modeAfterExecution = modeManager.getCurrentMode();
    
    res.json({
      ...result,
      timestamp: new Date().toISOString(),
      executionMode: modeAfterExecution,
      modeSwitched: modeBeforeExecution !== modeAfterExecution,
      unifiedClient: true
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Execution failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Blockchain State API Endpoints (preserved from original)
app.get('/api/v1/blockchain/state', async (_req, res) => {
  try {
    if (!blockchainStateService) {
      return res.status(503).json({ 
        error: 'Blockchain state service not available',
        message: 'Service failed to load during server startup'
      });
    }
    
    const state = await blockchainStateService.getCurrentState();
    res.json({
      state,
      formatted: blockchainStateService.formatStateForDisplay(state),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get blockchain state', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to get blockchain state' });
  }
});

// Execute with state tracking (enhanced with unified client)
app.post('/api/v1/tools/execute-with-state', async (req, res) => {
  try {
    const { toolName, parameters } = req.body;
    
    if (!blockchainStateService) {
      logger.warn('Blockchain state service not available, falling back to regular execution');
      const result = await zkPretUnifiedClient.executeTool(toolName, parameters);
      return res.json({
        ...result,
        message: 'Executed without state tracking (service unavailable)',
        timestamp: new Date().toISOString(),
        executionMode: modeManager.getCurrentMode()
      });
    }
    
    const stateTrackingTools = [
      'get-GLEIF-verification-with-sign',
      'get-Corporate-Registration-verification-with-sign',
      'get-EXIM-verification-with-sign'
    ];
    
    if (stateTrackingTools.includes(toolName)) {
      const { result, stateComparison } = await blockchainStateService.executeWithStateTracking(
        toolName,
        parameters,
        (tool: string, params: any) => zkPretUnifiedClient.executeTool(tool, params)
      );
      
      res.json({
        ...result,
        stateComparison: {
          ...stateComparison,
          beforeFormatted: blockchainStateService.formatStateForDisplay(stateComparison.before),
          afterFormatted: blockchainStateService.formatStateForDisplay(stateComparison.after)
        },
        timestamp: new Date().toISOString(),
        executionMode: modeManager.getCurrentMode()
      });
    } else {
      const result = await zkPretUnifiedClient.executeTool(toolName, parameters);
      res.json({
        ...result,
        timestamp: new Date().toISOString(),
        executionMode: modeManager.getCurrentMode()
      });
    }
  } catch (error) {
    logger.error('Execution with state tracking failed', { error: error instanceof Error ? error.message : String(error) });
    
    try {
      const { toolName, parameters } = req.body;
      const result = await zkPretUnifiedClient.executeTool(toolName, parameters);
      res.json({
        ...result,
        message: 'Fallback execution succeeded (state tracking failed)',
        timestamp: new Date().toISOString(),
        executionMode: modeManager.getCurrentMode()
      });
    } catch (fallbackError) {
      res.status(500).json({ error: 'Both state tracking and fallback execution failed' });
    }
  }
});

// Copy all other existing endpoints from original server.ts
// (File picker APIs, ACTUS config, etc. - keeping them exactly the same)

// Process Files API
app.get('/api/v1/process-files/:processType/:fileType', async (req, res) => {
  try {
    const { processType, fileType } = req.params;
    const basePath = process.env.ZK_PRET_STDIO_PATH;
    
    if (!['SCF', 'DVP', 'STABLECOIN'].includes(processType)) {
      return res.status(400).json({ error: 'Invalid process type' });
    }
    
    if (!['expected', 'actual'].includes(fileType.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid file type. Must be "expected" or "actual"' });
    }
    
    const envVar = `ZK_PRET_DATA_PROCESS_PATH_${processType}_${fileType.toUpperCase()}`;
    const relativePath = process.env[envVar];
    
    if (!relativePath || !basePath) {
      return res.status(400).json({ 
        error: 'Path not configured', 
        envVar,
        relativePath,
        basePath: !!basePath 
      });
    }
    
    const fullPath = path.join(basePath, relativePath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ 
        error: 'Directory not found', 
        path: fullPath 
      });
    }
    
    const files = fs.readdirSync(fullPath)
      .filter(f => f.endsWith('.bpmn'))
      .sort();
    
    res.json({ 
      files, 
      path: relativePath,
      processType,
      fileType,
      count: files.length
    });
    
  } catch (error) {
    logger.error('Failed to read process files', {
      error: error instanceof Error ? error.message : String(error),
      processType: req.params.processType,
      fileType: req.params.fileType
    });
    
    res.status(500).json({ 
      error: 'Failed to read directory',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// ACTUS Configuration API
app.get('/api/v1/actus-config', async (_req, res) => {
  try {
    const actusUrl = process.env.ACTUS_SERVER_URL || 'http://98.84.165.146:8083/eventsBatch';
    
    res.json({ 
      actusUrl: actusUrl,
      source: 'environment'
    });
    
  } catch (error) {
    logger.error('Failed to get ACTUS configuration', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    res.status(500).json({ 
      error: 'Failed to get ACTUS configuration',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Server status endpoint with unified mode information
app.get('/api/v1/status', async (_req, res) => {
  try {
    const modeStatus = await modeManager.getStatus();
    const serverStatus = await zkPretUnifiedClient.getServerStatus();
    
    res.json({
      server: 'ZK-PRET-UNIFIED-WEB-APP',
      version: '1.0.0',
      mode: 'unified',
      timestamp: new Date().toISOString(),
      currentMode: modeStatus.currentMode,
      preferredMode: modeStatus.preferredMode,
      autoSwitchEnabled: modeStatus.autoSwitchEnabled,
      serverConnected: serverStatus.connected,
      modeHealth: {
        httpServerAvailable: modeStatus.httpServerAvailable,
        stdioAvailable: modeStatus.stdioAvailable,
        lastModeSwitch: modeStatus.lastModeSwitch
      },
      features: {
        unifiedMode: true,
        autoModeSwitch: modeStatus.autoSwitchEnabled,
        manualModeSwitch: process.env.ZK_PRET_ALLOW_MANUAL_MODE_SWITCH !== 'false',
        modeIndicator: process.env.ZK_PRET_SHOW_MODE_INDICATOR !== 'false'
      }
    });
  } catch (error) {
    res.status(500).json({
      server: 'ZK-PRET-UNIFIED-WEB-APP',
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

const startUnifiedServer = async () => {
  try {
    // Initialize unified client and mode manager
    await zkPretUnifiedClient.initialize();
    
    server.listen(ZK_PRET_WEB_APP_PORT, ZK_PRET_WEB_APP_HOST, () => {
      logger.info(`🚀 ZK-PRET UNIFIED WEB APP started on http://${ZK_PRET_WEB_APP_HOST}:${ZK_PRET_WEB_APP_PORT}`);
      logger.info(`🔄 Mode: ${modeManager.getCurrentMode().toUpperCase()}`);
      logger.info(`⚡ Auto-switching: ${process.env.ZK_PRET_AUTO_SWITCH_ENABLED !== 'false' ? 'ENABLED' : 'DISABLED'}`);
      logger.info(`🎯 Unified Mode: STDIO + HTTP on same port`);
    });
  } catch (error) {
    logger.error('Failed to start unified server:', error);
    process.exit(1);
  }
};

startUnifiedServer();