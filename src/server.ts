import dotenv from 'dotenv';
dotenv.config(); // This line should be very early

// ================================================================
// 🎛️ DYNAMIC CONFIGURATION BASED ON OPERATION_MODE
// ================================================================
const OPERATION_MODE = process.env.OPERATION_MODE || 'HTTP';
console.log(`🎯 Operation Mode: ${OPERATION_MODE}`);

// Set dynamic configurations based on operation mode
if (OPERATION_MODE === 'HTTP') {
  process.env.ZK_PRET_WEB_APP_PORT = process.env.HTTP_PORT || '3000';
  process.env.ZK_PRET_SERVER_TYPE = process.env.HTTP_SERVER_TYPE || 'http';
  process.env.ZK_PRET_SERVER_URL = process.env.HTTP_SERVER_URL || 'http://localhost:3001';
  process.env.ZK_PRET_HTTP_SERVER_URL = process.env.HTTP_HTTP_SERVER_URL || 'http://localhost:3001';
  process.env.ZK_PRET_SERVER_TIMEOUT = process.env.HTTP_TIMEOUT || '600000';
  process.env.ZK_PRET_DISABLE_AUTO_FALLBACK = process.env.HTTP_DISABLE_AUTO_FALLBACK || 'true';
  process.env.LOG_LEVEL = process.env.HTTP_LOG_LEVEL || 'info';
} else if (OPERATION_MODE === 'STDIO') {
  process.env.ZK_PRET_WEB_APP_PORT = process.env.STDIO_PORT || '3000';
  process.env.ZK_PRET_SERVER_TYPE = process.env.STDIO_SERVER_TYPE || 'stdio';
  process.env.ZK_PRET_SERVER_URL = process.env.STDIO_SERVER_URL || 'stdio://local';
  process.env.ZK_PRET_SERVER_TIMEOUT = process.env.STDIO_TIMEOUT || '600000';
  process.env.LOG_LEVEL = process.env.STDIO_LOG_LEVEL || 'info';
} else if (OPERATION_MODE === 'UNIFIED') {
  process.env.ZK_PRET_WEB_APP_PORT = process.env.UNIFIED_PORT || '3000';
  process.env.ZK_PRET_SERVER_TYPE = process.env.UNIFIED_SERVER_TYPE || 'unified';
  process.env.ZK_PRET_PREFERRED_MODE = process.env.UNIFIED_PREFERRED_MODE || 'auto';
  process.env.ZK_PRET_HTTP_SERVER_URL = process.env.UNIFIED_HTTP_SERVER_URL || 'http://localhost:3002';
  process.env.ZK_PRET_SERVER_TIMEOUT = process.env.UNIFIED_TIMEOUT || '600000';
  process.env.ZK_PRET_AUTO_SWITCH_ENABLED = process.env.UNIFIED_AUTO_SWITCH_ENABLED || 'true';
  process.env.LOG_LEVEL = process.env.UNIFIED_LOG_LEVEL || 'info';
} else if (OPERATION_MODE === 'MCP') {
  process.env.ZK_PRET_WEB_APP_PORT = process.env.MCP_PORT || '3003';
  process.env.ZK_PRET_SERVER_TYPE = process.env.MCP_SERVER_TYPE || 'stdio';
  process.env.ZK_PRET_SERVER_TIMEOUT = process.env.MCP_TIMEOUT || '600000';
  process.env.LOG_LEVEL = process.env.MCP_LOG_LEVEL || 'info';
  process.env.NODE_ENV = process.env.MCP_NODE_ENV || 'production';
}

console.log(`🔧 Server Type: ${process.env.ZK_PRET_SERVER_TYPE}`);
console.log(`🌐 Port: ${process.env.ZK_PRET_WEB_APP_PORT}`);
console.log(`📊 Log Level: ${process.env.LOG_LEVEL}`);

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { logger } from './utils/logger.js';
import { zkPretClient } from './services/zkPretClient.js';
import { composedProofService } from './services/ComposedProofService.js';
// Import blockchain state service with error handling
let blockchainStateService: any = null;
try {
  const { blockchainStateService: service } = await import('./services/blockchainStateService.js');
  blockchainStateService = service;
  logger.info('Blockchain state service loaded successfully');
} catch (error) {
  logger.warn('Blockchain state service failed to load', { error: error instanceof Error ? error.message : String(error) });
}
import {
  ComposedProofRequest,
  ComposedProofExecutionResponse,
  ComposedProofStatusResponse,
  TemplateListResponse
} from './types/index.js';

dotenv.config();

const app = express();
const server = createServer(app);

const ZK_PRET_WEB_APP_PORT = parseInt(process.env.ZK_PRET_WEB_APP_PORT || '3000', 10);
const ZK_PRET_WEB_APP_HOST = process.env.ZK_PRET_WEB_APP_HOST || 'localhost';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/api/v1/health', async (_req, res) => {
  const zkPretStatus = await zkPretClient.healthCheck();
  res.json({
    status: zkPretStatus.connected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: { zkPretServer: zkPretStatus.connected }
  });
});

app.get('/api/v1/tools', async (_req, res) => {
  try {
    const tools = await zkPretClient.listTools();
    res.json({ tools, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list tools' });
  }
});

app.post('/api/v1/tools/execute', async (req, res) => {
  try {
    const { toolName, parameters } = req.body;
    const result = await zkPretClient.executeTool(toolName, parameters);
    res.json({
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Execution failed' });
  }
});

// Blockchain State API Endpoints

// Get current blockchain state
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

// Execute GLEIF verification with state tracking
app.post('/api/v1/tools/execute-with-state', async (req, res) => {
  try {
    const { toolName, parameters } = req.body;
    
    // Check if blockchain state service is available
    if (!blockchainStateService) {
      logger.warn('Blockchain state service not available, falling back to regular execution');
      // Fall back to regular execution without state tracking
      const result = await zkPretClient.executeTool(toolName, parameters);
      return res.json({
        ...result,
        message: 'Executed without state tracking (service unavailable)',
        timestamp: new Date().toISOString()
      });
    }
    
    // Check if this is a GLEIF-related tool that should have state tracking
    const stateTrackingTools = [
      'get-GLEIF-verification-with-sign',
      'get-Corporate-Registration-verification-with-sign',
      'get-EXIM-verification-with-sign'
    ];
    
    if (stateTrackingTools.includes(toolName)) {
      const { result, stateComparison } = await blockchainStateService.executeWithStateTracking(
        toolName,
        parameters,
        (tool: string, params: any) => zkPretClient.executeTool(tool, params)
      );
      
      res.json({
        ...result,
        stateComparison: {
          ...stateComparison,
          beforeFormatted: blockchainStateService.formatStateForDisplay(stateComparison.before),
          afterFormatted: blockchainStateService.formatStateForDisplay(stateComparison.after)
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // For non-state-tracking tools, use regular execution
      const result = await zkPretClient.executeTool(toolName, parameters);
      res.json({
        ...result,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Execution with state tracking failed', { error: error instanceof Error ? error.message : String(error) });
    
    // Try to fall back to regular execution
    try {
      const { toolName, parameters } = req.body;
      const result = await zkPretClient.executeTool(toolName, parameters);
      res.json({
        ...result,
        message: 'Fallback execution succeeded (state tracking failed)',
        timestamp: new Date().toISOString()
      });
    } catch (fallbackError) {
      res.status(500).json({ error: 'Both state tracking and fallback execution failed' });
    }
  }
});

// Composed Compliance Proof - Execute specific Node.js command
app.post('/api/v1/composed-compliance/execute', async (req, res) => {
  try {
    const { command, arguments: args, requestId } = req.body;
    
    logger.info('Received composed compliance execution request', {
      command,
      arguments: args,
      requestId
    });
    
    // Validate the command for security
    if (!command.includes('ComposedRecursiveOptim3LevelVerificationTestWithSign.js')) {
      return res.status(400).json({ 
        error: 'Invalid command - only ComposedRecursiveOptim3LevelVerificationTestWithSign.js is allowed' 
      });
    }
    
    // Import child_process to execute the Node.js command
    const { spawn } = await import('child_process');
    const path = await import('path');
    
    // Get the ZK-PRET STDIO path from environment variable
    const zkPretStdioPath = process.env.ZK_PRET_STDIO_PATH;
    const zkPretBuildPath = process.env.ZK_PRET_STDIO_BUILD_PATH || './build/tests/with-sign';
    
    if (!zkPretStdioPath) {
      return res.status(500).json({
        error: 'ZK_PRET_STDIO_PATH not configured',
        details: 'Please set ZK_PRET_STDIO_PATH in your .env file'
      });
    }
    
    // Construct the full script path using environment variables
    const scriptPath = path.join(zkPretStdioPath, zkPretBuildPath, 'ComposedRecursiveOptim3LevelVerificationTestWithSign.js');
    const fullArgs = [scriptPath, ...args];
    
    logger.info('Executing composed compliance command', {
      zkPretStdioPath,
      zkPretBuildPath,
      scriptPath,
      fullArgs
    });
    
    // Execute the command
    return new Promise((resolve) => {
      const process = spawn('node', fullArgs, {
        cwd: zkPretStdioPath, // Use ZK-PRET directory as working directory
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      // Log the actual command being executed for debugging
      logger.info('Process spawn details', {
        command: 'node',
        args: fullArgs,
        cwd: zkPretStdioPath
      });
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        logger.info('Process completed', {
          requestId,
          exitCode: code,
          stdoutLength: stdout.length,
          stderrLength: stderr.length
        });
        
        if (code === 0) {
          logger.info('Composed compliance execution completed successfully', { 
            requestId, 
            outputLength: stdout.length 
          });
          
          res.json({
            success: true,
            result: {
              success: true,
              executionId: requestId,
              output: stdout,
              exitCode: code,
              command: `node ${fullArgs.join(' ')}`,
              scriptPath: scriptPath,
              timestamp: new Date().toISOString()
            }
          });
        } else {
          logger.error('Composed compliance execution failed', { 
            requestId, 
            exitCode: code, 
            stderr,
            command: `node ${fullArgs.join(' ')}`
          });
          
          res.status(500).json({
            success: false,
            error: `Process exited with code ${code}`,
            details: stderr || 'No error details available',
            exitCode: code,
            command: `node ${fullArgs.join(' ')}`,
            scriptPath: scriptPath,
            stdout: stdout || 'No output'
          });
        }
      });
      
      process.on('error', (error) => {
        logger.error('Composed compliance process error', { 
          requestId, 
          error: error.message,
          command: `node ${fullArgs.join(' ')}`,
          scriptPath: scriptPath,
          errorCode: (error as any).code || 'UNKNOWN'
        });
        
        res.status(500).json({
          success: false,
          error: 'Process execution error',
          details: error.message,
          command: `node ${fullArgs.join(' ')}`,
          scriptPath: scriptPath,
          errorCode: (error as any).code || 'UNKNOWN'
        });
      });
    });
    
  } catch (error) {
    logger.error('Composed compliance execution failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Composed compliance execution failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Composed Proof API Endpoints

// Get all available composition templates
app.get('/api/v1/composed-proofs/templates', async (_req, res) => {
  try {
    const templates = composedProofService.getTemplates();
    const categories = [...new Set(templates.map(t => t.metadata?.category).filter(Boolean))] as string[];
    
    const response: TemplateListResponse = {
      templates,
      categories,
      total: templates.length
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Failed to get composition templates', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Get a specific template by ID
app.get('/api/v1/composed-proofs/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = composedProofService.getTemplate(templateId);
    
    if (!template) {
      return res.status(404).json({ error: `Template not found: ${templateId}` });
    }
    
    res.json(template);
  } catch (error) {
    logger.error('Failed to get template', { 
      templateId: req.params.templateId,
      error: error instanceof Error ? error.message : String(error) 
    });
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// Execute a composed proof
app.post('/api/v1/composed-proofs/execute', async (req, res) => {
  try {
    const composedProofRequest: ComposedProofRequest = req.body;
    
    // Validate request
    if (!composedProofRequest.templateId && !composedProofRequest.customComposition) {
      return res.status(400).json({ 
        error: 'Either templateId or customComposition must be provided' 
      });
    }
    
    logger.info('Received composed proof execution request', {
      templateId: composedProofRequest.templateId,
      hasCustomComposition: !!composedProofRequest.customComposition,
      requestId: composedProofRequest.requestId
    });
    
    // Start execution (this will run asynchronously)
    const executionPromise = composedProofService.executeComposedProof(composedProofRequest);
    
    // For now, we'll wait for completion, but in production you might want to 
    // return immediately and provide status endpoints for long-running operations
    const result = await executionPromise;
    
    const response: ComposedProofExecutionResponse = {
      success: result.success,
      executionId: result.executionId,
      requestId: result.requestId,
      status: result.success ? 'COMPLETED' : 'FAILED',
      progressUrl: `/api/v1/composed-proofs/status/${result.executionId}`,
      resultUrl: `/api/v1/composed-proofs/results/${result.executionId}`
    };
    
    // Return the full result for now (in production, you might return just the response above)
    res.json({
      ...response,
      result: result
    });
    
  } catch (error) {
    logger.error('Composed proof execution failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    res.status(500).json({ 
      error: 'Composed proof execution failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get execution status
app.get('/api/v1/composed-proofs/status/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const execution = composedProofService.getExecution(executionId);
    
    if (!execution) {
      return res.status(404).json({ error: `Execution not found: ${executionId}` });
    }
    
    const response: ComposedProofStatusResponse = {
      executionId: execution.id,
      status: execution.status,
      progress: {
        percentage: Math.round((execution.progress.completed + execution.progress.failed) / execution.progress.total * 100),
        currentPhase: execution.currentPhase,
        completedComponents: execution.results.filter(r => r.status === 'PASS').map(r => r.componentId),
        runningComponents: execution.components
          .filter(c => execution.progress.running > 0)
          .map(c => c.id),
        failedComponents: execution.results.filter(r => r.status === 'FAIL' || r.status === 'ERROR').map(r => r.componentId)
      },
      estimatedCompletion: execution.estimatedCompletion,
      partialResults: execution.results
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Failed to get execution status', { 
      executionId: req.params.executionId,
      error: error instanceof Error ? error.message : String(error) 
    });
    res.status(500).json({ error: 'Failed to get execution status' });
  }
});

// Get cache statistics
app.get('/api/v1/composed-proofs/cache/stats', async (_req, res) => {
  try {
    const stats = composedProofService.getCacheStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get cache stats', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

// Clear cache
app.post('/api/v1/composed-proofs/cache/clear', async (_req, res) => {
  try {
    composedProofService.clearCache();
    res.json({ success: true, message: 'Cache cleared successfully' });
  } catch (error) {
    logger.error('Failed to clear cache', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Add a new composition template
app.post('/api/v1/composed-proofs/templates', async (req, res) => {
  try {
    const template = req.body;
    composedProofService.addTemplate(template);
    res.json({ success: true, templateId: template.id });
  } catch (error) {
    logger.error('Failed to add template', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Failed to add template' });
  }
});

// Process Files API - Get available BPMN files for file picker
app.get('/api/v1/process-files/:processType/:fileType', async (req, res) => {
  try {
    const { processType, fileType } = req.params;
    const basePath = process.env.ZK_PRET_STDIO_PATH;
    
    // Validate process type and file type
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
    
    logger.info('Reading process files', {
      processType,
      fileType,
      envVar,
      relativePath,
      fullPath
    });
    
    // Check if directory exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ 
        error: 'Directory not found', 
        path: fullPath 
      });
    }
    
    const files = fs.readdirSync(fullPath)
      .filter(f => f.endsWith('.bpmn'))
      .sort(); // Sort alphabetically
    
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

// ACTUS Configuration API - Get ACTUS server URL from environment
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

// Basel III Config Files API - Get available Basel III configuration files for risk verification
app.get('/api/v1/basel3-config-files', async (_req, res) => {
  try {
    const basePath = process.env.ZK_PRET_STDIO_PATH;
    const relativePath = process.env.ZK_PRET_DATA_RISK_BASEL3_CONFIG;
    
    if (!relativePath || !basePath) {
      return res.status(400).json({ 
        error: 'Basel III config path not configured', 
        relativePath: !!relativePath,
        basePath: !!basePath 
      });
    }
    
    const fullPath = path.join(basePath, relativePath);
    
    logger.info('Reading Basel III config files', {
      relativePath,
      fullPath
    });
    
    // Check if directory exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ 
        error: 'Basel III config directory not found', 
        path: fullPath 
      });
    }
    
    const files = fs.readdirSync(fullPath)
      .filter(f => f.endsWith('.json') || f.endsWith('.xml') || f.endsWith('.config'))
      .sort(); // Sort alphabetically
    
    res.json({ 
      files, 
      path: relativePath,
      configType: 'Basel3-Config',
      count: files.length
    });
    
  } catch (error) {
    logger.error('Failed to read Basel III config files', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    res.status(500).json({ 
      error: 'Failed to read Basel III config directory',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Bill of Lading Files API - Get available bill of lading files for data integrity verification
app.get('/api/v1/bill-of-lading-files', async (_req, res) => {
  try {
    const basePath = process.env.ZK_PRET_STDIO_PATH;
    const relativePath = process.env.ZK_PRET_DATA_BILLOFLADING;
    
    if (!relativePath || !basePath) {
      return res.status(400).json({ 
        error: 'Bill of Lading path not configured', 
        relativePath: !!relativePath,
        basePath: !!basePath 
      });
    }
    
    const fullPath = path.join(basePath, relativePath);
    
    logger.info('Reading bill of lading files', {
      relativePath,
      fullPath
    });
    
    // Check if directory exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ 
        error: 'Bill of Lading directory not found', 
        path: fullPath 
      });
    }
    
    const files = fs.readdirSync(fullPath)
      .filter(f => f.endsWith('.json'))
      .sort(); // Sort alphabetically
    
    res.json({ 
      files, 
      path: relativePath,
      dataType: 'DCSA-BillofLading-V3',
      count: files.length
    });
    
  } catch (error) {
    logger.error('Failed to read bill of lading files', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    res.status(500).json({ 
      error: 'Failed to read bill of lading directory',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Risk Advanced Config Files API - Get available Advanced Risk configuration files
app.get('/api/v1/risk-advanced-config-files', async (_req, res) => {
  try {
    const basePath = process.env.ZK_PRET_STDIO_PATH;
    const relativePath = process.env.ZK_PRET_DATA_RISK_ADVANCED_CONFIG;
    
    if (!relativePath || !basePath) {
      return res.status(400).json({ 
        error: 'Risk Advanced config path not configured', 
        relativePath: !!relativePath,
        basePath: !!basePath 
      });
    }
    
    const fullPath = path.join(basePath, relativePath);
    
    logger.info('Reading Risk Advanced config files', {
      relativePath,
      fullPath
    });
    
    // Check if directory exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ 
        error: 'Risk Advanced config directory not found', 
        path: fullPath 
      });
    }
    
    const files = fs.readdirSync(fullPath)
      .filter(f => f.endsWith('.json') || f.endsWith('.xml') || f.endsWith('.config'))
      .sort(); // Sort alphabetically
    
    res.json({ 
      files, 
      path: relativePath,
      configType: 'Risk-Advanced-Config',
      count: files.length
    });
    
  } catch (error) {
    logger.error('Failed to read Risk Advanced config files', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    res.status(500).json({ 
      error: 'Failed to read Risk Advanced config directory',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Risk Advanced Execution Settings API - Get execution settings from execution-settings.json
app.get('/api/v1/risk-advanced-execution-settings', async (_req, res) => {
  try {
    const basePath = process.env.ZK_PRET_STDIO_PATH;
    const settingsPath = './src/data/RISK/Advanced/SETTINGS/execution-settings.json';
    
    if (!basePath) {
      return res.status(400).json({ 
        error: 'ZK_PRET_STDIO_PATH not configured', 
        basePath: !!basePath 
      });
    }
    
    const fullPath = path.join(basePath, settingsPath);
    
    logger.info('Reading Risk Advanced execution settings', {
      settingsPath,
      fullPath
    });
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ 
        error: 'Risk Advanced execution settings file not found', 
        path: fullPath 
      });
    }
    
    const settingsContent = fs.readFileSync(fullPath, 'utf8');
    const settings = JSON.parse(settingsContent);
    
    // Extract execution paths for the dropdown
    const executionPaths = Object.keys(settings.executionPaths || {}).map(key => ({
      id: key,
      name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: settings.executionPaths[key]?.description || '',
      expectedOutcome: settings.executionPaths[key]?.expectedOutcome || ''
    }));
    
    res.json({ 
      executionPaths,
      settingsMetadata: settings.executionSettings || {},
      path: settingsPath,
      count: executionPaths.length
    });
    
  } catch (error) {
    logger.error('Failed to read Risk Advanced execution settings', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    res.status(500).json({ 
      error: 'Failed to read Risk Advanced execution settings',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Stablecoin Jurisdictions API - Get available jurisdictions from CONFIG subdirectories
app.get('/api/v1/stablecoin-jurisdictions', async (_req, res) => {
  try {
    const basePath = process.env.ZK_PRET_STDIO_PATH;
    const relativePath = process.env.ZK_PRET_DATA_RISK_STABLECOIN_CONFIG;
    
    if (!relativePath || !basePath) {
      return res.status(400).json({ 
        error: 'Stablecoin config path not configured', 
        relativePath: !!relativePath,
        basePath: !!basePath 
      });
    }
    
    const fullPath = path.join(basePath, relativePath);
    
    logger.info('Reading stablecoin jurisdictions', {
      relativePath,
      fullPath
    });
    
    // Check if directory exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ 
        error: 'Stablecoin config directory not found', 
        path: fullPath 
      });
    }
    
    const jurisdictions = fs.readdirSync(fullPath)
      .filter(item => {
        const itemPath = path.join(fullPath, item);
        return fs.statSync(itemPath).isDirectory();
      })
      .sort(); // Sort alphabetically
    
    res.json({ 
      jurisdictions,
      path: relativePath,
      configType: 'Stablecoin-Jurisdictions',
      count: jurisdictions.length
    });
    
  } catch (error) {
    logger.error('Failed to read stablecoin jurisdictions', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    res.status(500).json({ 
      error: 'Failed to read stablecoin jurisdictions',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Stablecoin Situations API - Get available situation files for a jurisdiction
app.get('/api/v1/stablecoin-situations/:jurisdiction', async (req, res) => {
  try {
    const { jurisdiction } = req.params;
    const basePath = process.env.ZK_PRET_STDIO_PATH;
    const baseConfigPath = process.env.ZK_PRET_DATA_RISK_STABLECOIN_CONFIG;
    
    if (!baseConfigPath || !basePath) {
      return res.status(400).json({ 
        error: 'Stablecoin config path not configured', 
        baseConfigPath: !!baseConfigPath,
        basePath: !!basePath 
      });
    }
    
    const relativePath = path.join(baseConfigPath, jurisdiction);
    const fullPath = path.join(basePath, relativePath);
    
    logger.info('Reading stablecoin situations', {
      jurisdiction,
      relativePath,
      fullPath
    });
    
    // Check if directory exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ 
        error: `Stablecoin jurisdiction directory not found: ${jurisdiction}`, 
        path: fullPath 
      });
    }
    
    const situations = fs.readdirSync(fullPath)
      .filter(f => f.endsWith('.json'))
      .sort(); // Sort alphabetically
    
    res.json({ 
      situations,
      jurisdiction,
      path: relativePath,
      configType: 'Stablecoin-Situations',
      count: situations.length
    });
    
  } catch (error) {
    logger.error('Failed to read stablecoin situations', {
      error: error instanceof Error ? error.message : String(error),
      jurisdiction: req.params.jurisdiction
    });
    
    res.status(500).json({ 
      error: 'Failed to read stablecoin situations',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

const startServer = async () => {
  try {
    console.log('🚀 Starting ZK-PRET Web Application...');
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Server Type: ${process.env.ZK_PRET_SERVER_TYPE || 'http'}`);
    console.log(`📊 Log Level: ${process.env.LOG_LEVEL || 'info'}`);
    
    console.log('⚡ Initializing ZK-PRET client...');
    await zkPretClient.initialize();
    console.log('✅ ZK-PRET client initialized successfully');
    
    server.listen(ZK_PRET_WEB_APP_PORT, ZK_PRET_WEB_APP_HOST, () => {
      console.log('🎉 ZK-PRET Web App is ready!');
      console.log(`🌐 Server running at: http://${ZK_PRET_WEB_APP_HOST}:${ZK_PRET_WEB_APP_PORT}`);
      console.log('📋 Available endpoints:');
      console.log('   • GET  /api/v1/health - Health check');
      console.log('   • GET  /api/v1/tools - List available tools');
      console.log('   • POST /api/v1/tools/execute - Execute verification tools');
      console.log('   • GET  / - Web interface');
      console.log('');
      logger.info(`ZK-PRET-WEB-APP started on http://${ZK_PRET_WEB_APP_HOST}:${ZK_PRET_WEB_APP_PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start ZK-PRET Web App:', error);
    logger.error('Failed to start server', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
};

startServer();
