#!/usr/bin/env node

import dotenv from 'dotenv';
// Load MCP-specific environment
dotenv.config({ path: '.env.mcp' });

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';

// Import our existing zkPretClient (unchanged)
import { zkPretClient } from './services/zkPretClient.js';
import { logger } from './utils/logger.js';

// Define interfaces for the tools
interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

interface MCPResponse {
  success: boolean;
  tool: string;
  result: any;
  executionTime: string;
  timestamp: string;
  error?: string;
}

class ZKPretMCPServer {
  private app: express.Application;
  private server: any;
  private port: number;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.port = parseInt(process.env.MCP_SERVER_PORT || process.env.MCP_PORT || '3003', 10);
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', async (req, res) => {
      try {
        const health = await zkPretClient.healthCheck();
        res.json({
          success: true,
          status: 'healthy',
          zkPretConnected: health.connected,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // List available tools
    this.app.get('/tools', async (req, res) => {
      try {
        const tools = this.getAvailableTools();
        res.json({
          success: true,
          tools,
          count: tools.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Execute tool
    this.app.post('/tools/:toolName/execute', async (req, res) => {
      const { toolName } = req.params;
      const args = req.body;

      try {
        const result = await this.executeTool(toolName, args);
        res.json(result);
      } catch (error) {
        res.status(500).json({
          success: false,
          tool: toolName,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Batch tool execution
    this.app.post('/tools/batch', async (req, res) => {
      const { tools } = req.body;
      
      if (!Array.isArray(tools)) {
        return res.status(400).json({
          success: false,
          error: 'Tools must be an array',
          timestamp: new Date().toISOString()
        });
      }

      try {
        const results = [];
        for (const toolRequest of tools) {
          const result = await this.executeTool(toolRequest.name, toolRequest.args || {});
          results.push(result);
        }

        res.json({
          success: true,
          results,
          count: results.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  private getAvailableTools(): MCPTool[] {
    return [
      {
        name: 'get_gleif_verification',
        description: 'Perform GLEIF verification with zero-knowledge proof for a company',
        inputSchema: {
          type: 'object',
          properties: {
            companyName: {
              type: 'string',
              description: 'Legal name of the company to verify'
            },
            legalName: {
              type: 'string', 
              description: 'Alternative: Legal name of the company'
            },
            entityName: {
              type: 'string',
              description: 'Alternative: Entity name of the company'
            }
          },
          required: []
        }
      },
      {
        name: 'get_corporate_registration_verification',
        description: 'Perform Corporate Registration verification with zero-knowledge proof',
        inputSchema: {
          type: 'object',
          properties: {
            cin: {
              type: 'string',
              description: 'Corporate Identification Number (CIN) to verify'
            }
          },
          required: ['cin']
        }
      },
      {
        name: 'get_exim_verification',
        description: 'Perform EXIM (Export-Import) verification with zero-knowledge proof',
        inputSchema: {
          type: 'object',
          properties: {
            companyName: {
              type: 'string',
              description: 'Company name for EXIM verification'
            },
            legalName: {
              type: 'string',
              description: 'Alternative: Legal name of the company'
            }
          },
          required: []
        }
      },
      {
        name: 'get_composed_compliance_verification',
        description: 'Perform comprehensive composed compliance verification (GLEIF + Corporate + EXIM)',
        inputSchema: {
          type: 'object',
          properties: {
            companyName: {
              type: 'string',
              description: 'Company name for verification'
            },
            cin: {
              type: 'string',
              description: 'Corporate Identification Number'
            }
          },
          required: []
        }
      },
      {
        name: 'get_bsdi_compliance_verification',
        description: 'Perform Business Standard Data Integrity verification (Bill of Lading)',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to the data file for verification'
            },
            dataType: {
              type: 'string',
              description: 'Type of data (e.g., DCSA-BillofLading-V3)'
            }
          },
          required: ['filePath']
        }
      },
      {
        name: 'get_bpi_compliance_verification',
        description: 'Perform Business Process Integrity verification with BPMN files',
        inputSchema: {
          type: 'object',
          properties: {
            processType: {
              type: 'string',
              description: 'Process type (SCF, DVP, STABLECOIN)',
              enum: ['SCF', 'DVP', 'STABLECOIN']
            },
            expectedProcessFile: {
              type: 'string',
              description: 'Expected process BPMN file name'
            },
            actualProcessFile: {
              type: 'string',
              description: 'Actual process BPMN file name'
            }
          },
          required: ['processType']
        }
      },
      {
        name: 'get_risk_liquidity_advanced_verification',
        description: 'Perform advanced risk and liquidity verification with ACTUS',
        inputSchema: {
          type: 'object',
          properties: {
            threshold: {
              type: 'number',
              description: 'Risk threshold value'
            },
            actusUrl: {
              type: 'string',
              description: 'ACTUS server URL for calculations'
            }
          },
          required: []
        }
      },
      {
        name: 'get_risk_liquidity_basel3_verification',
        description: 'Perform Basel III compliant risk and liquidity verification',
        inputSchema: {
          type: 'object',
          properties: {
            lcrThreshold: {
              type: 'number',
              description: 'Liquidity Coverage Ratio threshold'
            },
            nsfrThreshold: {
              type: 'number', 
              description: 'Net Stable Funding Ratio threshold'
            },
            actusUrl: {
              type: 'string',
              description: 'ACTUS server URL'
            },
            configFilePath: {
              type: 'string',
              description: 'Basel III configuration file path'
            }
          },
          required: []
        }
      },
      {
        name: 'get_stablecoin_proof_of_reserves_verification',
        description: 'Perform Stablecoin Proof of Reserves risk verification',
        inputSchema: {
          type: 'object',
          properties: {
            threshold: {
              type: 'number',
              description: 'Reserve threshold value'
            },
            actusUrl: {
              type: 'string', 
              description: 'ACTUS server URL'
            }
          },
          required: []
        }
      },
      {
        name: 'health_check',
        description: 'Check the health status of ZK-PRET services',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'list_available_tools',
        description: 'List all available ZK-PRET verification tools',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ];
  }

  private async executeTool(name: string, args: any): Promise<MCPResponse> {
    try {
      logger.info(`MCP Tool Execution: ${name}`, { args });

      let result: any;
      
      switch (name) {
        case 'get_gleif_verification':
          result = await zkPretClient.executeTool('get-GLEIF-verification-with-sign', args);
          break;

        case 'get_corporate_registration_verification':
          result = await zkPretClient.executeTool('get-Corporate-Registration-verification-with-sign', args);
          break;

        case 'get_exim_verification':
          result = await zkPretClient.executeTool('get-EXIM-verification-with-sign', args);
          break;

        case 'get_composed_compliance_verification':
          result = await zkPretClient.executeTool('get-Composed-Compliance-verification-with-sign', args);
          break;

        case 'get_bsdi_compliance_verification':
          result = await zkPretClient.executeTool('get-BSDI-compliance-verification', args);
          break;

        case 'get_bpi_compliance_verification':
          result = await zkPretClient.executeTool('get-BPI-compliance-verification', args);
          break;

        case 'get_risk_liquidity_advanced_verification':
          result = await zkPretClient.executeTool('get-RiskLiquidityACTUS-Verifier-Test_adv_zk', args);
          break;

        case 'get_risk_liquidity_basel3_verification':
          result = await zkPretClient.executeTool('get-RiskLiquidityBasel3Optim-Merkle-verification-with-sign', args);
          break;

        case 'get_stablecoin_proof_of_reserves_verification':
          result = await zkPretClient.executeTool('get-StablecoinProofOfReservesRisk-verification-with-sign', args);
          break;

        case 'health_check':
          const healthResult = await zkPretClient.healthCheck();
          result = {
            success: healthResult.connected,
            result: {
              connected: healthResult.connected,
              status: healthResult.status,
              timestamp: new Date().toISOString()
            },
            executionTime: '0ms'
          };
          break;

        case 'list_available_tools':
          const tools = await zkPretClient.listTools();
          result = {
            success: true,
            result: {
              tools: tools,
              timestamp: new Date().toISOString()
            },
            executionTime: '0ms'
          };
          break;

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      // Ensure result has the expected structure
      const normalizedResult = {
        success: result.success !== undefined ? result.success : false,
        executionTime: result.executionTime || '0ms',
        result: result.result || result
      };

      return {
        success: normalizedResult.success,
        tool: name,
        result: normalizedResult.result,
        executionTime: normalizedResult.executionTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`MCP Tool Execution Failed: ${name}`, { 
        error: error instanceof Error ? error.message : String(error),
        args 
      });

      return {
        success: false,
        tool: name,
        result: null,
        executionTime: '0ms',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async start() {
    try {
      // Initialize zkPretClient
      await zkPretClient.initialize();
      
      this.server.listen(this.port, () => {
        logger.info(`ZK-PRET MCP Server started successfully on port ${this.port}`);
        logger.info(`MCP Server URL: http://localhost:${this.port}`);
        logger.info('Available endpoints:');
        logger.info('  GET  /health - Health check');
        logger.info('  GET  /tools - List available tools');
        logger.info('  POST /tools/:toolName/execute - Execute a tool');
        logger.info('  POST /tools/batch - Execute multiple tools');
      });
      
    } catch (error) {
      logger.error('Failed to start MCP server:', error);
      throw error;
    }
  }
}

// Start the MCP server
async function main() {
  try {
    const server = new ZKPretMCPServer();
    await server.start();
  } catch (error) {
    logger.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}