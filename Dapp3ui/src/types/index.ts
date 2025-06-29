// ZK-PRET-WEB-APP Type Definitions

// Export composed proof types
export * from './composedProofs.js';

export interface ToolExecutionRequest {
  toolName: string;
  parameters?: any;
}

export interface ToolExecutionResponse {
  success: boolean;
  toolName: string;
  parameters?: any;
  result: ToolResult;
  executionTime: string;
  timestamp: string;
  meta?: {
    webAppVersion: string;
    zkPretServerUrl: string;
    executedAt: string;
  };
}

export interface ToolResult {
  status: 'completed' | 'failed' | 'pending';
  zkProofGenerated: boolean;
  timestamp: string;
  output?: string;
  stderr?: string;
  exitCode?: number;
  error?: string;
  details?: any;
  executionMode?: 'stdio' | 'http';
}

export interface ToolExecutionResult {
  success: boolean;
  result: ToolResult;
  executionTime: string;
  serverResponse?: any;
}

export interface ZKPretServerResponse {
  success: boolean;
  toolName: string;
  parameters?: any;
  result?: ToolResult;
  executionTime?: string;
  timestamp?: string;
  meta?: any;
  message?: string;
  error?: string;
}

export interface ServerStatus {
  connected: boolean;
  status: string;
  timestamp: string;
  version?: string;
  services?: Record<string, boolean>;
  serverUrl: string;
  serverType: string;
  error?: string;
  mode?: 'stdio' | 'http';
  modeStatus?: any;
}

export interface ZKPretClientConfig {
  serverUrl: string;
  timeout: number;
  retries: number;
  serverType: 'http' | 'stdio' | 'vercel' | 'custom' | 'unified';
  stdioPath?: string;
  stdioBuildPath?: string;
  disableAutoFallback?: boolean;
}

// Blockchain State Types
export interface BlockchainState {
  isGLEIFCompliant: boolean;
  totalVerifications: number;
  smartContractActive: boolean;
  riskMitigationBase: number;
  complianceMapRoot: string;
  complianceActionState: string;
  admin: string;
  lastUpdateTimestamp?: string;
}

export interface StateChange {
  field: string;
  before: any;
  after: any;
  changed: boolean;
  type: 'boolean' | 'number' | 'string';
}

export interface StateComparison {
  before: BlockchainState;
  after: BlockchainState;
  changes: StateChange[];
  hasChanges: boolean;
  timestamp: string;
}

export interface ExecutionWithStateResult extends ToolExecutionResult {
  stateComparison?: StateComparison;
}
