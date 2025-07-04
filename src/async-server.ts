import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import { logger } from './utils/logger.js';
import { zkPretUnifiedClient } from './services/zkPretUnifiedClient.js';
import { ModeDetector } from './utils/mode-detector.js';

// Validate async-only mode on startup
try {
  ModeDetector.validateAsyncOnlyMode();
  logger.info('✅ Async-only mode validation passed');
} catch (error) {
  logger.error('❌ Invalid mode configuration:', error.message);
  process.exit(1);
}

// Simple UUID generator instead of importing uuid
function generateUUID() {
  return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

interface Job {
  id: string;
  toolName: string;
  parameters: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  progress?: number;
}

class AsyncJobManager {
  private jobs = new Map<string, Job>();
  private wss: WebSocketServer;
  private isAsyncEnabled: boolean;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.isAsyncEnabled = process.env.ENABLE_ASYNC_JOBS === 'true';
    logger.info(`Async job management ${this.isAsyncEnabled ? 'enabled' : 'disabled'}`);
  }

  async startJob(jobId: string, toolName: string, parameters: any): Promise<Job> {
    const job: Job = {
      id: jobId,
      toolName,
      parameters,
      status: 'pending',
      startTime: new Date()
    };

    this.jobs.set(jobId, job);
    this.broadcastJobUpdate(job);

    // Start processing in background
    this.processJob(job);

    return job;
  }

  private async processJob(job: Job) {
    try {
      job.status = 'running';
      job.progress = 0;
      this.broadcastJobUpdate(job);

      // Real progress tracking instead of simulation
      logger.info(`Starting job ${job.id}: ${job.toolName}`);
      
      // Initial setup progress
      job.progress = 10;
      this.broadcastJobUpdate(job);
      
      // Execute the actual tool with real-time progress
      const startTime = Date.now();
      const result = await zkPretUnifiedClient.executeTool(job.toolName, job.parameters);
      const executionTime = Date.now() - startTime;
      
      job.status = 'completed';
      job.result = {
        ...result,
        executionTimeMs: executionTime,
        jobId: job.id,
        completedAt: new Date().toISOString()
      };
      job.endTime = new Date();
      job.progress = 100;

      logger.info(`Job ${job.id} completed successfully in ${executionTime}ms`);

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.endTime = new Date();
      
      logger.error(`Job ${job.id} failed:`, error);
    }

    this.broadcastJobUpdate(job);
  }

  private broadcastJobUpdate(job: Job) {
    const message = JSON.stringify({
      type: 'job_update',
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
      timestamp: new Date().toISOString()
    });

    this.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  getActiveJobs(): Job[] {
    return Array.from(this.jobs.values()).filter(job => 
      job.status === 'pending' || job.status === 'running'
    );
  }

  clearCompletedJobs() {
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        this.jobs.delete(jobId);
      }
    }
  }
}

const app = express();
const server = createServer(app);

// WebSocket server setup
const wss = new WebSocketServer({ server });
const jobManager = new AsyncJobManager(wss);

const ZK_PRET_WEB_APP_PORT = parseInt(process.env.ZK_PRET_WEB_APP_PORT || '3000', 10);
const ZK_PRET_WEB_APP_HOST = process.env.ZK_PRET_WEB_APP_HOST || 'localhost';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// WebSocket connection handling
wss.on('connection', (ws) => {
  // Removed verbose connection logs for cleaner output
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      logger.debug('WebSocket message received:', data);
    } catch (error) {
      logger.error('Invalid WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    // Removed verbose close logs
  });

  // Send initial connection message
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    timestamp: new Date().toISOString()
  }));
});

// Health check endpoint with real implementation status
app.get('/api/v1/health', async (_req, res) => {
  const zkPretStatus = await zkPretUnifiedClient.getServerStatus();
  const modeInfo = ModeDetector.detectMode();
  
  res.json({
    status: zkPretStatus.connected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    mode: modeInfo,
    services: { 
      zkPretServer: zkPretStatus.connected,
      asyncJobs: process.env.ENABLE_ASYNC_JOBS === 'true',
      websockets: process.env.ENABLE_WEBSOCKETS === 'true',
      realImplementation: !ModeDetector.isDemoMode()
    },
    activeJobs: jobManager.getActiveJobs().length
  });
});

// Tools listing endpoint
app.get('/api/v1/tools', async (_req, res) => {
  try {
    const tools = await zkPretUnifiedClient.listTools();
    res.json({ 
      tools, 
      timestamp: new Date().toISOString(),
      asyncEnabled: process.env.ENABLE_ASYNC_JOBS === 'true'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list tools' });
  }
});

// Traditional sync execution endpoint
app.post('/api/v1/tools/execute', async (req, res) => {
  try {
    const { toolName, parameters } = req.body;
    const result = await zkPretUnifiedClient.executeTool(toolName, parameters);
    res.json({
      ...result,
      timestamp: new Date().toISOString(),
      mode: 'sync'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Async job management endpoints
app.post('/api/v1/jobs/start', async (req, res) => {
  if (process.env.ENABLE_ASYNC_JOBS !== 'true') {
    return res.status(400).json({ 
      error: 'Async jobs are disabled',
      message: 'Set ENABLE_ASYNC_JOBS=true to use async execution'
    });
  }

  try {
    const { jobId, toolName, parameters } = req.body;
    const actualJobId = jobId || generateUUID();
    
    const job = await jobManager.startJob(actualJobId, toolName, parameters);
    
    res.json({
      jobId: job.id,
      status: job.status,
      timestamp: job.startTime.toISOString(),
      message: 'Job started successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to start job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/v1/jobs/:jobId', (req, res) => {
  const job = jobManager.getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

app.get('/api/v1/jobs', (_req, res) => {
  const jobs = jobManager.getAllJobs();
  res.json({
    jobs,
    total: jobs.length,
    active: jobManager.getActiveJobs().length,
    timestamp: new Date().toISOString()
  });
});

app.delete('/api/v1/jobs/completed', (_req, res) => {
  jobManager.clearCompletedJobs();
  res.json({ 
    message: 'Completed jobs cleared',
    timestamp: new Date().toISOString()
  });
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
              timestamp: new Date().toISOString(),
              mode: 'async-server'
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

// Stablecoin Jurisdictions API - Fixed values as per user requirements (US and EU)
app.get('/api/v1/stablecoin-jurisdictions', async (_req, res) => {
  try {
    // Return fixed jurisdiction values as requested by user
    const jurisdictions = ['US', 'EU'];
    
    res.json({ 
      jurisdictions,
      source: 'fixed-configuration',
      count: jurisdictions.length
    });
    
  } catch (error) {
    logger.error('Failed to get stablecoin jurisdictions', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    res.status(500).json({ 
      error: 'Failed to get stablecoin jurisdictions',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Stablecoin Situations API - Load files from jurisdiction-specific directory
app.get('/api/v1/stablecoin-situations/:jurisdiction', async (req, res) => {
  try {
    const { jurisdiction } = req.params;
    const basePath = process.env.ZK_PRET_STDIO_PATH;
    const configPath = process.env.ZK_PRET_DATA_RISK_STABLECOIN_CONFIG;
    
    // Validate jurisdiction
    if (!['US', 'EU'].includes(jurisdiction)) {
      return res.status(400).json({ 
        error: 'Invalid jurisdiction. Must be US or EU',
        provided: jurisdiction
      });
    }
    
    if (!configPath || !basePath) {
      return res.status(400).json({ 
        error: 'Stablecoin config path not configured', 
        configPath: !!configPath,
        basePath: !!basePath 
      });
    }
    
    // Construct path: ${basePath}/${configPath}/${jurisdiction}
    const fullPath = path.join(basePath, configPath, jurisdiction);
    
    logger.info('Reading stablecoin situations', {
      jurisdiction,
      configPath,
      fullPath
    });
    
    // Check if directory exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ 
        error: 'Stablecoin config directory not found', 
        path: fullPath,
        jurisdiction
      });
    }
    
    const files = fs.readdirSync(fullPath)
      .filter(f => f.endsWith('.json') || f.endsWith('.xml') || f.endsWith('.config'))
      .sort();
    
    res.json({ 
      situations: files,
      jurisdiction,
      path: `${configPath}/${jurisdiction}`,
      count: files.length
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

// Enhanced status endpoint with async-only mode information
app.get('/api/v1/status', (_req, res) => {
  const modeInfo = ModeDetector.detectMode();
  const serverConfig = ModeDetector.getServerConfig();
  
  res.json({
    server: 'ZK-PRET-WEB-APP',
    version: '1.0.0',
    mode: modeInfo,
    serverConfig: serverConfig,
    asyncEnabled: true, // Always true
    websocketConnections: wss.clients.size,
    activeJobs: jobManager.getActiveJobs().length,
    totalJobs: jobManager.getAllJobs().length,
    features: {
      async_jobs: process.env.ENABLE_ASYNC_JOBS === 'true',
      websockets: process.env.ENABLE_WEBSOCKETS === 'true',
      job_persistence: process.env.ENABLE_JOB_PERSISTENCE === 'true',
      browser_notifications: process.env.ENABLE_BROWSER_NOTIFICATIONS === 'true',
      job_recovery: process.env.ENABLE_JOB_RECOVERY === 'true',
      enhanced_ui: process.env.ENABLE_ENHANCED_UI === 'true',
      polling_fallback: process.env.ENABLE_POLLING_FALLBACK === 'true',
      real_implementation: !ModeDetector.isDemoMode()
    },
    timestamp: new Date().toISOString()
  });
});

const startServer = async () => {
  try {
    console.log('🚀 Starting ZK-PRET Async Web Application (Real Implementation Only)...');
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Server Type: ASYNC HTTP (REAL IMPLEMENTATION)`);
    console.log(`🎯 Operation Mode: ${process.env.OPERATION_MODE || 'HTTP'} (ASYNC ONLY)`);
    console.log(`📊 Log Level: ${process.env.LOG_LEVEL || 'info'}`);
    console.log(`⚡ Async Jobs: ${process.env.ENABLE_ASYNC_JOBS === 'true' ? 'ENABLED' : 'DISABLED'}`);
    console.log(`🎯 Real Implementation: ${!ModeDetector.isDemoMode() ? 'YES' : 'NO'}`);
    
    // Validate configuration
    const serverConfig = ModeDetector.getServerConfig();
    console.log(`🔗 ZK-PRET Server URL: ${serverConfig.serverUrl}`);
    
    console.log('⚡ Initializing ZK-PRET unified client...');
    await zkPretUnifiedClient.initialize();
    console.log('✅ ZK-PRET unified client initialized successfully');
    
    server.listen(ZK_PRET_WEB_APP_PORT, ZK_PRET_WEB_APP_HOST, () => {
      console.log('🎉 ZK-PRET Async Web App is ready (Real Implementation)!');
      console.log(`🌐 Server running at: http://${ZK_PRET_WEB_APP_HOST}:${ZK_PRET_WEB_APP_PORT}`);
      console.log(`🔗 WebSocket server: ws://${ZK_PRET_WEB_APP_HOST}:${ZK_PRET_WEB_APP_PORT}`);
      console.log('📋 Available endpoints:');
      console.log('   • GET  /api/v1/health - Health check with mode detection');
      console.log('   • GET  /api/v1/tools - List available verification tools');
      console.log('   • POST /api/v1/tools/execute - Execute verification tools (sync)');
      console.log('   • POST /api/v1/jobs/start - Start async background job');
      console.log('   • GET  /api/v1/jobs - List all jobs');
      console.log('   • GET  /api/v1/jobs/:id - Get job status');
      console.log('   • DELETE /api/v1/jobs/completed - Clear completed jobs');
      console.log('🔥 Async Features (Real Implementation):');
      console.log('   • ✅ Background ZK proof generation');
      console.log('   • ✅ Real-time job progress tracking');
      console.log('   • ✅ Concurrent verification support');
      console.log('   • ✅ Connection to real ZK-PRET backend');
      console.log('');
      logger.info(`ZK-PRET-ASYNC-WEB-APP started on http://${ZK_PRET_WEB_APP_HOST}:${ZK_PRET_WEB_APP_PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start ZK-PRET Async Web App:', error);
    logger.error('Failed to start async server', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
};

startServer();
