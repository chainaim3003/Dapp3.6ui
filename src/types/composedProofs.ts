// Composed Proofs Type Definitions for ZK-PRET Compliance System

export interface ProofComponent {
  id: string;
  toolName: string;
  parameters: any;
  dependencies?: string[]; // IDs of other components this depends on
  optional?: boolean; // If true, failure doesn't fail the entire composition
  timeout?: number; // Custom timeout for this component
  cacheKey?: string; // Key for caching results
}

export interface CompositionTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  components: ProofComponent[];
  aggregationLogic: AggregationLogic;
  metadata?: {
    category: string;
    tags: string[];
    author?: string;
    created: string;
    updated?: string;
  };
}

export interface AggregationLogic {
  type: 'ALL_REQUIRED' | 'MAJORITY' | 'WEIGHTED' | 'CUSTOM';
  threshold?: number; // For majority or weighted
  weights?: Record<string, number>; // For weighted aggregation
  customLogic?: string; // JavaScript expression for custom logic
}

export interface ComposedProofRequest {
  templateId?: string; // Use predefined template
  customComposition?: {
    components: ProofComponent[];
    aggregationLogic: AggregationLogic;
  };
  globalParameters?: any; // Parameters applied to all components
  executionOptions?: {
    maxParallelism?: number;
    timeout?: number;
    enableCaching?: boolean;
    retryPolicy?: RetryPolicy;
  };
  requestId?: string; // For tracking long-running requests
}

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'FIXED' | 'LINEAR' | 'EXPONENTIAL';
  backoffDelay: number; // Base delay in milliseconds
  retryableErrors?: string[]; // Error types that should trigger retry
}

export interface ComposedProofResult {
  success: boolean;
  requestId: string;
  templateId?: string;
  executionId: string;
  overallVerdict: 'PASS' | 'FAIL' | 'PARTIAL' | 'ERROR';
  componentResults: ComponentResult[];
  aggregatedResult: {
    totalComponents: number;
    passedComponents: number;
    failedComponents: number;
    skippedComponents: number;
    aggregationScore?: number; // For weighted aggregations
  };
  executionMetrics: {
    startTime: string;
    endTime: string;
    totalExecutionTime: string;
    parallelExecutions: number;
    cacheHits: number;
    retries: number;
  };
  metadata?: any;
  auditTrail: AuditEntry[];
}

export interface ComponentResult {
  componentId: string;
  toolName: string;
  status: 'PASS' | 'FAIL' | 'SKIPPED' | 'ERROR' | 'TIMEOUT';
  zkProofGenerated: boolean;
  executionTime: string;
  output?: string;
  error?: string;
  dependencies?: string[];
  cacheHit?: boolean;
  retryCount?: number;
  timestamp: string;
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  componentId?: string;
  details: any;
  level: 'INFO' | 'WARN' | 'ERROR';
}

export interface ComposedProofExecution {
  id: string;
  requestId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  templateId?: string;
  components: ProofComponent[];
  progress: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    pending: number;
  };
  results: ComponentResult[];
  startTime: string;
  estimatedCompletion?: string;
  currentPhase: string;
}

export interface ProofCache {
  cacheKey: string;
  result: ComponentResult;
  timestamp: string;
  expiresAt: string;
  hits: number;
}

// Predefined template categories
export enum TemplateCategory {
  KYC_COMPLIANCE = 'kyc-compliance',
  FINANCIAL_RISK = 'financial-risk',
  BUSINESS_INTEGRITY = 'business-integrity',
  REGULATORY_COMPLIANCE = 'regulatory-compliance',
  CUSTOM = 'custom'
}

// Built-in composition templates
export interface BuiltInTemplates {
  FULL_KYC: CompositionTemplate;
  FINANCIAL_RISK_ASSESSMENT: CompositionTemplate;
  BUSINESS_INTEGRITY_CHECK: CompositionTemplate;
  COMPREHENSIVE_COMPLIANCE: CompositionTemplate;
}

// API Response types
export interface ComposedProofExecutionResponse {
  success: boolean;
  executionId: string;
  requestId: string;
  status: string;
  estimatedCompletion?: string;
  progressUrl: string;
  resultUrl: string;
}

export interface ComposedProofStatusResponse {
  executionId: string;
  status: string;
  progress: {
    percentage: number;
    currentPhase: string;
    completedComponents: string[];
    runningComponents: string[];
    failedComponents: string[];
  };
  estimatedCompletion?: string;
  partialResults?: ComponentResult[];
}

export interface TemplateListResponse {
  templates: CompositionTemplate[];
  categories: string[];
  total: number;
}

// Error types specific to composed proofs
export class ComposedProofError extends Error {
  constructor(
    message: string,
    public code: string,
    public componentId?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ComposedProofError';
  }
}

export class ComponentExecutionError extends ComposedProofError {
  constructor(
    message: string,
    componentId: string,
    public originalError?: Error,
    details?: any
  ) {
    super(message, 'COMPONENT_EXECUTION_ERROR', componentId, details);
    this.name = 'ComponentExecutionError';
  }
}

export class DependencyError extends ComposedProofError {
  constructor(
    message: string,
    componentId: string,
    public missingDependencies: string[],
    details?: any
  ) {
    super(message, 'DEPENDENCY_ERROR', componentId, details);
    this.name = 'DependencyError';
  }
}

export class AggregationError extends ComposedProofError {
  constructor(message: string, details?: any) {
    super(message, 'AGGREGATION_ERROR', undefined, details);
    this.name = 'AggregationError';
  }
}
