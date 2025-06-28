import dotenv from 'dotenv';
dotenv.config();

import axios, { AxiosInstance } from 'axios';
import { spawn } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';
import { logger } from '../utils/logger.js';
import { modeManager } from './modeManager.js';
import type { ZKPretServerResponse, ToolExecutionResult, ServerStatus, ZKPretClientConfig } from '../types/index.js';

class ZKPretUnifiedClient {
  private httpClient?: AxiosInstance;
  private config: ZKPretClientConfig;
  private initialized: boolean = false;
  private currentMode: 'stdio' | 'http' = 'stdio';

  constructor() {
    this.config = {
      serverUrl: process.env.ZK_PRET_SERVER_URL || 'http://localhost:3001',
      timeout: parseInt(process.env.ZK_PRET_SERVER_TIMEOUT || '120000'),
      retries: 3,
      serverType: 'unified', // New unified type
      stdioPath: process.env.ZK_PRET_STDIO_PATH || '../ZK-PRET-TEST-V3',
      stdioBuildPath: process.env.ZK_PRET_STDIO_BUILD_PATH || './build/tests/with-sign',
      disableAutoFallback: process.env.ZK_PRET_DISABLE_AUTO_FALLBACK === 'true'
    };

    // Initialize HTTP client for when needed
    this.httpClient = axios.create({
      baseURL: this.config.serverUrl,
      timeout: this.config.timeout,
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'ZK-PRET-UNIFIED-APP/1.0.0' }
    });

    // Listen to mode changes
    modeManager.onModeChange((mode) => {
      this.currentMode = mode;
    });
  }

  async initialize(): Promise<void> {
    try {
      // Initialize mode manager first
      await modeManager.initialize();
      this.currentMode = modeManager.getCurrentMode();
      
      // Test the current mode
      await this.healthCheck();
      this.initialized = true;
      
      logger.info(`ZK-PRET started successfully on http://localhost:3000 (${this.currentMode} mode)`);
    } catch (error) {
      logger.warn('ZK-PRET Unified Client initialization failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async healthCheck(): Promise<{ connected: boolean; status?: any }> {
    try {
      const currentMode = modeManager.getCurrentMode();
      
      if (currentMode === 'http') {
        return await this.httpHealthCheck();
      } else {
        return await this.stdioHealthCheck();
      }
    } catch (error) {
      return { connected: false };
    }
  }

  async httpHealthCheck(): Promise<{ connected: boolean; status?: any }> {
    try {
      const response = await this.httpClient!.get('/api/v1/health');
      return { connected: true, status: response.data };
    } catch (error) {
      return { connected: false };
    }
  }

  async stdioHealthCheck(): Promise<{ connected: boolean; status?: any }> {
    try {
      console.log('=== UNIFIED STDIO HEALTH CHECK ===');
      console.log('Checking path:', this.config.stdioPath);
      
      const fs = await import('fs/promises');
      await fs.access(this.config.stdioPath!);
      console.log('✅ Main path exists');
      
      const buildPath = path.join(this.config.stdioPath!, this.config.stdioBuildPath!);
      console.log('Checking build path:', buildPath);
      await fs.access(buildPath);
      console.log('✅ Build path exists');
      
      // Check for compiled JavaScript files
      const jsFiles = [
        'GLEIFOptimMultiCompanyVerificationTestWithSign.js',
        'CorporateRegistrationOptimMultiCompanyVerificationTestWithSign.js',
        'EXIMOptimMultiCompanyVerificationTestWithSign.js'
      ];
      
      console.log('Checking for compiled JavaScript files:');
      for (const file of jsFiles) {
        const filePath = path.join(buildPath, file);
        try {
          await fs.access(filePath);
          console.log(`✅ Found: ${file}`);
        } catch {
          console.log(`❌ Missing: ${file}`);
        }
      }
      
      console.log('=========================');
      
      return {
        connected: true,
        status: { mode: 'stdio', path: this.config.stdioPath, buildPath }
      };
    } catch (error) {
      console.log('❌ STDIO Health Check Failed:', error instanceof Error ? error.message : String(error));
      return { connected: false };
    }
  }

  async listTools(): Promise<string[]> {
    try {
      const currentMode = modeManager.getCurrentMode();
      
      if (currentMode === 'http') {
        const response = await this.httpClient!.get('/api/v1/tools');
        return response.data.tools || [];
      } else {
        return this.getStdioTools();
      }
    } catch (error) {
      // Check if auto-fallback is disabled
      if (this.config.disableAutoFallback) {
        const errorMessage = `HTTP server connection failed at ${this.config.serverUrl}. ` +
          `Auto-fallback to STDIO mode is disabled. ` +
          `Please ensure the ZK-PRET HTTP server is running on the expected port. ` +
          `Original error: ${error instanceof Error ? error.message : String(error)}`;
        
        logger.error('HTTP server connection failed - no fallback allowed', {
          serverUrl: this.config.serverUrl,
          disableAutoFallback: this.config.disableAutoFallback,
          error: error instanceof Error ? error.message : String(error)
        });
        
        throw new Error(errorMessage);
      }
      
      // Legacy behavior: fallback to STDIO tools when auto-fallback is enabled
      logger.warn('HTTP server unavailable, falling back to STDIO tools', {
        serverUrl: this.config.serverUrl,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return this.getStdioTools();
    }
  }

  getStdioTools(): string[] {
    return [
      'get-GLEIF-verification-with-sign',
      'get-Corporate-Registration-verification-with-sign',
      'get-EXIM-verification-with-sign',
      'get-Composed-Compliance-verification-with-sign',
      'get-BSDI-compliance-verification',
      'get-BPI-compliance-verification',
      'get-RiskLiquidityACTUS-Verifier-Test_adv_zk',
      'get-RiskLiquidityACTUS-Verifier-Test_Basel3_Withsign',
      'get-RiskLiquidityBasel3Optim-Merkle-verification-with-sign',
      'get-RiskLiquidityAdvancedOptimMerkle-verification-with-sign',
      'get-StablecoinProofOfReservesRisk-verification-with-sign',
      'execute-composed-proof-full-kyc',
      'execute-composed-proof-financial-risk',
      'execute-composed-proof-business-integrity',
      'execute-composed-proof-comprehensive'
    ];
  }

  async executeTool(toolName: string, parameters: any = {}): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    try {
      console.log('=== UNIFIED TOOL EXECUTION START ===');
      console.log('Tool Name:', toolName);
      console.log('Parameters:', JSON.stringify(parameters, null, 2));
      console.log('Current Mode:', this.currentMode);
      
      let result;
      const currentMode = modeManager.getCurrentMode();
      
      if (currentMode === 'http') {
        console.log('Using HTTP mode execution');
        result = await this.executeHttpTool(toolName, parameters);
      } else {
        console.log('Using STDIO mode execution');
        result = await this.executeStdioTool(toolName, parameters);
      }

      const executionTime = Date.now() - startTime;
      
      console.log('=== UNIFIED TOOL EXECUTION SUCCESS ===');
      console.log('Mode Used:', currentMode);
      console.log('Execution Time:', `${executionTime}ms`);
      console.log('Result Success:', result.success);
      console.log('==============================');
      
      return {
        success: result.success,
        result: result.result || {
          status: result.success ? 'completed' : 'failed',
          zkProofGenerated: result.success,
          timestamp: new Date().toISOString(),
          output: result.output || '',
          executionMode: currentMode
        },
        executionTime: `${executionTime}ms`
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      console.log('=== UNIFIED TOOL EXECUTION FAILED ===');
      console.log('Error:', error instanceof Error ? error.message : String(error));
      console.log('Mode Attempted:', this.currentMode);
      console.log('Execution Time:', `${executionTime}ms`);
      console.log('=============================');
      
      return {
        success: false,
        result: {
          status: 'failed',
          zkProofGenerated: false,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
          executionMode: this.currentMode
        },
        executionTime: `${executionTime}ms`
      };
    }
  }

  async executeHttpTool(toolName: string, parameters: any = {}): Promise<any> {
    try {
      const response = await this.httpClient!.post('/api/v1/tools/execute', { toolName, parameters });
      return response.data;
    } catch (error) {
      // Check if auto-fallback is disabled
      if (this.config.disableAutoFallback) {
        const errorMessage = `HTTP server execution failed at ${this.config.serverUrl}. ` +
          `Auto-fallback to STDIO mode is disabled. ` +
          `Please ensure the ZK-PRET HTTP server is running and accessible. ` +
          `Original error: ${error instanceof Error ? error.message : String(error)}`;
        
        logger.error('HTTP server execution failed - no fallback allowed', {
          toolName,
          serverUrl: this.config.serverUrl,
          disableAutoFallback: this.config.disableAutoFallback,
          error: error instanceof Error ? error.message : String(error)
        });
        
        throw new Error(errorMessage);
      }
      
      // Legacy behavior: fallback to STDIO when auto-fallback is enabled
      logger.error('HTTP tool execution failed, attempting fallback to STDIO', {
        toolName,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Attempt fallback to STDIO
      await modeManager.switchMode('stdio', 'http-execution-failure');
      return await this.executeStdioTool(toolName, parameters);
    }
  }

  async executeStdioTool(toolName: string, parameters: any = {}): Promise<any> {
    // Use the same STDIO execution logic as the original zkPretClient
    const toolScriptMap: Record<string, string> = {
      'get-GLEIF-verification-with-sign': 'GLEIFOptimMultiCompanyVerificationTestWithSign.js',
      'get-Corporate-Registration-verification-with-sign': 'CorporateRegistrationOptimMultiCompanyVerificationTestWithSign.js',
      'get-EXIM-verification-with-sign': 'EXIMOptimMultiCompanyVerificationTestWithSign.js',
      'get-Composed-Compliance-verification-with-sign': 'ComposedRecursiveOptim3LevelVerificationTestWithSign.js',
      'get-BSDI-compliance-verification': 'BusinessStandardDataIntegrityVerificationTest.js',
      'get-BPI-compliance-verification': 'BusinessProcessIntegrityVerificationFileTestWithSign.js',
      'get-RiskLiquidityACTUS-Verifier-Test_adv_zk': 'RiskLiquidityACTUSVerifierTest_adv_zk_WithSign.js',
      'get-RiskLiquidityACTUS-Verifier-Test_Basel3_Withsign': 'RiskLiquidityACTUSVerifierTest_basel3_Withsign.js',
      'get-RiskLiquidityBasel3Optim-Merkle-verification-with-sign': 'RiskLiquidityBasel3OptimMerkleVerificationTestWithSign.js',
      'get-RiskLiquidityAdvancedOptimMerkle-verification-with-sign': 'RiskLiquidityAdvancedOptimMerkleVerificationTestWithSign.js',
      'get-StablecoinProofOfReservesRisk-verification-with-sign': 'StablecoinProofOfReservesRiskVerificationTestWithSign.js',
      'execute-composed-proof-full-kyc': 'ComposedRecursiveOptim3LevelVerificationTestWithSign.js',
      'execute-composed-proof-financial-risk': 'ComposedRecurrsiveSCF3LevelProofs.js',
      'execute-composed-proof-business-integrity': 'ComposedRecursive3LevelVerificationTestWithSign.js',
      'execute-composed-proof-comprehensive': 'ComposedRecursiveOptim3LevelVerificationTestWithSign.js'
    };

    const scriptFile = toolScriptMap[toolName];
    if (!scriptFile) {
      throw new Error(`Unknown tool: ${toolName}. Available tools: ${Object.keys(toolScriptMap).join(', ')}`);
    }

    console.log('=== UNIFIED STDIO TOOL EXECUTION ===');
    console.log('Tool Name:', toolName);
    console.log('Script File:', scriptFile);
    console.log('============================');
    
    return await this.executePreCompiledScript(scriptFile, parameters, toolName);
  }

  // Copy the exact same STDIO execution methods from original zkPretClient
  async executePreCompiledScript(scriptFile: string, parameters: any = {}, toolName?: string): Promise<any> {
    const compiledScriptPath = path.join(this.config.stdioPath!, this.config.stdioBuildPath!, scriptFile);
    
    console.log('🔍 Checking for pre-compiled JavaScript file...');
    console.log('Expected compiled script path:', compiledScriptPath);
    
    if (!existsSync(compiledScriptPath)) {
      console.log('❌ Pre-compiled JavaScript file not found');
      console.log('🔧 Attempting to build the project first...');
      
      const buildSuccess = await this.buildProject();
      if (!buildSuccess) {
        throw new Error(`Pre-compiled JavaScript file not found: ${compiledScriptPath}. Please run 'npm run build' in the ZK-PRET-TEST-V3 directory first.`);
      }
      
      if (!existsSync(compiledScriptPath)) {
        throw new Error(`Build completed but compiled file still not found: ${compiledScriptPath}`);
      }
    }
    
    console.log('✅ Pre-compiled JavaScript file found');
    console.log('🚀 Executing compiled JavaScript file...');
    
    return await this.executeJavaScriptFile(compiledScriptPath, parameters, toolName);
  }

  async buildProject(): Promise<boolean> {
    return new Promise((resolve) => {
      console.log('🔨 Building ZK-PRET project...');
      console.log('Working directory:', this.config.stdioPath);
      
      const buildProcess = spawn('npm', ['run', 'build'], {
        cwd: this.config.stdioPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let stdout = '';
      let stderr = '';

      buildProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        stdout += output;
        console.log('📤 BUILD-STDOUT:', output.trim());
      });

      buildProcess.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        stderr += output;
        console.log('📥 BUILD-STDERR:', output.trim());
      });

      buildProcess.on('close', (code: number | null) => {
        if (code === 0) {
          console.log('✅ Project build completed successfully');
          resolve(true);
        } else {
          console.log('❌ Project build failed with exit code:', code);
          console.log('Build STDERR:', stderr);
          console.log('Build STDOUT:', stdout);
          resolve(false);
        }
      });

      buildProcess.on('error', (error: Error) => {
        console.log('❌ Build process error:', error.message);
        resolve(false);
      });
    });
  }

  async executeJavaScriptFile(scriptPath: string, parameters: any = {}, toolName?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = this.prepareScriptArgs(parameters, toolName);
      
      console.log('=== UNIFIED JAVASCRIPT EXECUTION DEBUG ===');
      console.log('Script Path:', scriptPath);
      console.log('Working Directory:', this.config.stdioPath);
      console.log('Arguments:', args);
      console.log('Full Command:', `node ${scriptPath} ${args.join(' ')}`);
      console.log('===================================');
      
      const nodeProcess = spawn('node', [scriptPath, ...args], {
        cwd: this.config.stdioPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env,
          NODE_ENV: 'production'
        }
      });

      let stdout = '';
      let stderr = '';
      let isResolved = false;

      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          nodeProcess.kill('SIGTERM');
          console.log(`❌ EXECUTION TIMEOUT after ${this.config.timeout}ms`);
          reject(new Error(`Script execution timeout after ${this.config.timeout}ms`));
        }
      }, this.config.timeout);

      nodeProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        stdout += output;
        console.log('📤 STDOUT:', output.trim());
      });

      nodeProcess.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        stderr += output;
        console.log('📥 STDERR:', output.trim());
      });

      nodeProcess.on('close', (code: number | null) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          
          console.log('=== UNIFIED JAVASCRIPT EXECUTION COMPLETE ===');
          console.log('Exit Code:', code);
          console.log('Final STDOUT Length:', stdout.length);
          console.log('Final STDERR Length:', stderr.length);
          console.log('=====================================');
          
          if (code === 0) {
            console.log('✅ JAVASCRIPT EXECUTION SUCCESSFUL');
            
            let proofData = null;
            let zkProof = null;
            try {
              const jsonMatches = stdout.match(/\{[^}]*"proof"[^}]*\}/g);
              if (jsonMatches && jsonMatches.length > 0) {
                proofData = JSON.parse(jsonMatches[jsonMatches.length - 1]);
                zkProof = proofData.proof;
              }
            } catch (e) {
              console.log('No parseable proof data found in output');
            }
            
            resolve({
              success: true,
              result: {
                status: 'completed',
                zkProofGenerated: true,
                timestamp: new Date().toISOString(),
                output: stdout,
                stderr: stderr,
                executionStrategy: 'Unified Mode - STDIO Execution',
                ...(proofData && { proofData }),
                ...(zkProof && { zkProof }),
                executionMetrics: this.extractExecutionMetrics(stdout)
              }
            });
          } else {
            console.log(`❌ JAVASCRIPT EXECUTION FAILED with exit code ${code}`);
            reject(new Error(`Script failed with exit code ${code}: ${stderr || stdout || 'No output'}`));
          }
        }
      });

      nodeProcess.on('error', (error: Error) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          console.log('❌ JAVASCRIPT PROCESS ERROR:', error.message);
          reject(error);
        }
      });

      console.log(`🚀 JavaScript process spawned with PID: ${nodeProcess.pid}`);
    });
  }

  extractExecutionMetrics(output: string): any {
    const metrics: any = {};
    
    try {
      const timingMatches = output.match(/\b(\d+)\s*ms\b/g);
      if (timingMatches) {
        metrics.timings = timingMatches.map(t => t.replace(/\s*ms\b/, ''));
      }
      
      if (output.includes('Proof generated successfully')) {
        metrics.proofGenerated = true;
      }
      
      if (output.includes('Circuit compiled')) {
        metrics.circuitCompiled = true;
      }
      
      if (output.includes('Verification successful')) {
        metrics.verificationSuccessful = true;
      }
      
      if (output.includes('GLEIF data fetched')) {
        metrics.gleifDataFetched = true;
      }
      
      const numericMatches = output.match(/\b\d+\s*(bytes|kb|mb)\b/gi);
      if (numericMatches) {
        metrics.sizeMetrics = numericMatches;
      }
      
    } catch (error) {
      console.log('Error extracting metrics:', error);
    }
    
    return metrics;
  }

  prepareScriptArgs(parameters: any, toolName?: string): string[] {
    console.log('=== UNIFIED PREPARING SCRIPT ARGS ===');
    console.log('Tool Name:', toolName);
    console.log('Input parameters:', parameters);
    
    const args: string[] = [];
    
    switch (toolName) {
      case 'get-GLEIF-verification-with-sign':
        const companyName = parameters.companyName || parameters.legalName || parameters.entityName || 'SREE PALANI ANDAVAR AGROS PRIVATE LIMITED';
        args.push(String(companyName));
        console.log(`Added GLEIF arg 1 (company name): "${companyName}"`);
        args.push('TESTNET');
        console.log('Added GLEIF arg 2 (network type): "TESTNET"');
        break;
        
      case 'get-Corporate-Registration-verification-with-sign':
        const cin = parameters.cin;
        if (cin) {
          args.push(String(cin));
          console.log(`Added Corporate Registration arg 1 (CIN): "${cin}"`);
        } else {
          console.log('⚠️  No CIN found for Corporate Registration verification');
        }
        args.push('TESTNET');
        console.log('Added Corporate Registration arg 2 (network type): "TESTNET"');
        break;
        
      case 'get-EXIM-verification-with-sign':
        const eximCompanyName = parameters.companyName || parameters.legalName || parameters.entityName;
        if (eximCompanyName) {
          args.push(String(eximCompanyName));
          console.log(`Added EXIM arg 1 (company name): "${eximCompanyName}"`);
        } else {
          console.log('⚠️  No company name found for EXIM verification');
        }
        args.push('TESTNET');
        console.log('Added EXIM arg 2 (network type): "TESTNET"');
        break;

      // NEW: Handle BPI compliance verification
      case 'get-BPI-compliance-verification':
        // Script expects: businessProcessType, expectedBPMNFileName, actualBPMNFileName, outputFileName
        const processType = parameters.processType || 'SCF';
        const expectedFile = parameters.expectedProcessFile || 'SCF-ExpectedProcess.bpmn';
        const actualFile = parameters.actualProcessFile || 'SCF-Accepted1.bpmn';
        const outputFile = parameters.outputFileName || 'bpi-output.json';
        
        args.push(String(processType));
        console.log(`Added BPI arg 1 (processType): "${processType}"`);
        
        args.push(String(expectedFile));
        console.log(`Added BPI arg 2 (expectedFile): "${expectedFile}"`);
        
        args.push(String(actualFile));
        console.log(`Added BPI arg 3 (actualFile): "${actualFile}"`);
        
        args.push(String(outputFile));
        console.log(`Added BPI arg 4 (outputFile): "${outputFile}"`);
        break;

      // NEW: Handle BSDI compliance verification
      case 'get-BSDI-compliance-verification':
        const bsdiCompanyName = parameters.companyName || parameters.legalName || parameters.entityName;
        if (bsdiCompanyName) {
          args.push(String(bsdiCompanyName));
          console.log(`Added BSDI arg 1 (company name): "${bsdiCompanyName}"`);
        }
        args.push('TESTNET');
        console.log('Added BSDI arg 2 (network type): "TESTNET"');
        break;
        
      default:
        const fallbackCompanyName = parameters.legalName || parameters.entityName || parameters.companyName;
        if (fallbackCompanyName) {
          args.push(String(fallbackCompanyName));
          console.log(`Added fallback arg 1 (company name): "${fallbackCompanyName}"`);
        }
        args.push('TESTNET');
        console.log('Added fallback arg 2 (network type): "TESTNET"');
        break;
    }
    
    console.log('Final args array:', args);
    console.log('Command will be: node script.js', args.map(arg => `"${arg}"`).join(' '));
    console.log('=============================');
    
    return args;
  }

  getServerUrl(): string {
    const currentMode = modeManager.getCurrentMode();
    if (currentMode === 'http') {
      return this.config.serverUrl;
    } else {
      return `stdio://${this.config.stdioPath}`;
    }
  }

  async getServerStatus(): Promise<ServerStatus> {
    try {
      const currentMode = modeManager.getCurrentMode();
      const modeStatus = await modeManager.getStatus();
      
      return {
        connected: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        serverUrl: this.getServerUrl(),
        serverType: 'unified',
        mode: currentMode,
        modeStatus: modeStatus
      };
    } catch (error) {
      return {
        connected: false,
        status: 'disconnected',
        timestamp: new Date().toISOString(),
        serverUrl: this.getServerUrl(),
        serverType: 'unified',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const zkPretUnifiedClient = new ZKPretUnifiedClient();