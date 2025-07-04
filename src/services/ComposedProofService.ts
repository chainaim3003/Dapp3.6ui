import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { zkPretClient } from './zkPretClient.js';
import {
  ComposedProofRequest,
  ComposedProofResult,
  ComposedProofExecution,
  CompositionTemplate,
  ProofComponent,
  ComponentResult,
  AuditEntry,
  ProofCache,
  TemplateCategory,
  ComposedProofError,
  ComponentExecutionError,
  DependencyError,
  AggregationError,
  AggregationLogic,
  RetryPolicy
} from '../types/composedProofs.js';

class ComposedProofService {
  private executions: Map<string, ComposedProofExecution> = new Map();
  private cache: Map<string, ProofCache> = new Map();
  private templates: Map<string, CompositionTemplate> = new Map();

  constructor() {
    this.initializeBuiltInTemplates();
    this.startCacheCleanup();
  }

  private initializeBuiltInTemplates(): void {
    // Full KYC Compliance Template
    const fullKycTemplate: CompositionTemplate = {
      id: 'full-kyc-compliance',
      name: 'Full KYC Compliance',
      description: 'Comprehensive KYC verification including GLEIF, Corporate Registration, and EXIM checks',
      version: '1.0.0',
      components: [
        {
          id: 'gleif-verification',
          toolName: 'get-GLEIF-verification-with-sign',
          parameters: {},
          dependencies: [],
          optional: false,
          timeout: 60000,
          cacheKey: 'gleif-{companyName}'
        },
        {
          id: 'corporate-registration',
          toolName: 'get-Corporate-Registration-verification-with-sign',
          parameters: {},
          dependencies: ['gleif-verification'],
          optional: false,
          timeout: 60000,
          cacheKey: 'corp-reg-{cin}'
        },
        {
          id: 'exim-verification',
          toolName: 'get-EXIM-verification-with-sign',
          parameters: {},
          dependencies: ['gleif-verification'],
          optional: true,
          timeout: 60000,
          cacheKey: 'exim-{companyName}'
        }
      ],
      aggregationLogic: {
        type: 'ALL_REQUIRED',
        threshold: 2
      },
      metadata: {
        category: TemplateCategory.KYC_COMPLIANCE,
        tags: ['kyc', 'compliance', 'identity', 'verification'],
        author: 'ZK-PRET System',
        created: new Date().toISOString()
      }
    };

    // Financial Risk Assessment Template
    const financialRiskTemplate: CompositionTemplate = {
      id: 'financial-risk-assessment',
      name: 'Financial Risk Assessment',
      description: 'Comprehensive financial risk evaluation using Basel3 and ACTUS protocols',
      version: '1.0.0',
      components: [
        {
          id: 'basel3-verification',
          toolName: 'get-RiskLiquidityACTUS-Verifier-Test_Basel3_Withsign',
          parameters: {},
          dependencies: [],
          optional: false,
          timeout: 120000,
          cacheKey: 'basel3-{threshold}-{actusUrl}'
        },
        {
          id: 'advanced-risk-verification',
          toolName: 'get-RiskLiquidityACTUS-Verifier-Test_adv_zk',
          parameters: {},
          dependencies: [],
          optional: false,
          timeout: 120000,
          cacheKey: 'adv-risk-{threshold}-{actusUrl}'
        }
      ],
      aggregationLogic: {
        type: 'WEIGHTED',
        weights: {
          'basel3-verification': 0.6,
          'advanced-risk-verification': 0.4
        },
        threshold: 0.7
      },
      metadata: {
        category: TemplateCategory.FINANCIAL_RISK,
        tags: ['risk', 'basel3', 'actus', 'financial'],
        author: 'ZK-PRET System',
        created: new Date().toISOString()
      }
    };

    // Business Integrity Check Template
    const businessIntegrityTemplate: CompositionTemplate = {
      id: 'business-integrity-check',
      name: 'Business Integrity Check',
      description: 'Comprehensive business integrity verification including data and process integrity',
      version: '1.0.0',
      components: [
        {
          id: 'bsdi-verification',
          toolName: 'get-BSDI-compliance-verification',
          parameters: {},
          dependencies: [],
          optional: false,
          timeout: 90000,
          cacheKey: 'bsdi-{filePath}'
        },
        {
          id: 'bpi-verification',
          toolName: 'get-BPI-compliance-verification',
          parameters: {},
          dependencies: [],
          optional: false,
          timeout: 90000,
          cacheKey: 'bpi-{processId}'
        }
      ],
      aggregationLogic: {
        type: 'ALL_REQUIRED'
      },
      metadata: {
        category: TemplateCategory.BUSINESS_INTEGRITY,
        tags: ['integrity', 'data', 'process', 'compliance'],
        author: 'ZK-PRET System',
        created: new Date().toISOString()
      }
    };

    // Comprehensive Compliance Template
    const comprehensiveTemplate: CompositionTemplate = {
      id: 'comprehensive-compliance',
      name: 'Comprehensive Compliance',
      description: 'Full spectrum compliance check combining KYC, financial risk, and business integrity',
      version: '1.0.0',
      components: [
        {
          id: 'kyc-phase',
          toolName: 'composed-proof-execution',
          parameters: { templateId: 'full-kyc-compliance' },
          dependencies: [],
          optional: false,
          timeout: 180000
        },
        {
          id: 'risk-phase',
          toolName: 'composed-proof-execution',
          parameters: { templateId: 'financial-risk-assessment' },
          dependencies: ['kyc-phase'],
          optional: false,
          timeout: 240000
        },
        {
          id: 'integrity-phase',
          toolName: 'composed-proof-execution',
          parameters: { templateId: 'business-integrity-check' },
          dependencies: [],
          optional: false,
          timeout: 180000
        }
      ],
      aggregationLogic: {
        type: 'WEIGHTED',
        weights: {
          'kyc-phase': 0.4,
          'risk-phase': 0.35,
          'integrity-phase': 0.25
        },
        threshold: 0.8
      },
      metadata: {
        category: TemplateCategory.REGULATORY_COMPLIANCE,
        tags: ['comprehensive', 'compliance', 'kyc', 'risk', 'integrity'],
        author: 'ZK-PRET System',
        created: new Date().toISOString()
      }
    };

    // Register all built-in templates
    this.templates.set(fullKycTemplate.id, fullKycTemplate);
    this.templates.set(financialRiskTemplate.id, financialRiskTemplate);
    this.templates.set(businessIntegrityTemplate.id, businessIntegrityTemplate);
    this.templates.set(comprehensiveTemplate.id, comprehensiveTemplate);

    logger.info('Initialized built-in composition templates', {
      templates: Array.from(this.templates.keys())
    });
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = new Date();
      let cleanedCount = 0;
      
      for (const [key, cacheEntry] of this.cache.entries()) {
        if (new Date(cacheEntry.expiresAt) < now) {
          this.cache.delete(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired cache entries`);
      }
    }, 5 * 60 * 1000);
  }

  async executeComposedProof(request: ComposedProofRequest): Promise<ComposedProofResult> {
    const executionId = uuidv4();
    const requestId = request.requestId || uuidv4();
    const startTime = new Date().toISOString();
    
    logger.info('Starting composed proof execution', {
      executionId,
      requestId,
      templateId: request.templateId
    });

    let template: CompositionTemplate;
    if (request.templateId) {
      const foundTemplate = this.templates.get(request.templateId);
      if (!foundTemplate) {
        throw new ComposedProofError(
          `Template not found: ${request.templateId}`,
          'TEMPLATE_NOT_FOUND'
        );
      }
      template = foundTemplate;
    } else if (request.customComposition) {
      template = {
        id: 'custom-' + executionId,
        name: 'Custom Composition',
        description: 'User-defined composition',
        version: '1.0.0',
        components: request.customComposition.components,
        aggregationLogic: request.customComposition.aggregationLogic
      };
    } else {
      throw new ComposedProofError(
        'Either templateId or customComposition must be provided',
        'INVALID_REQUEST'
      );
    }

    const execution: ComposedProofExecution = {
      id: executionId,
      requestId,
      status: 'RUNNING',
      templateId: request.templateId,
      components: template.components,
      progress: {
        total: template.components.length,
        completed: 0,
        failed: 0,
        running: 0,
        pending: template.components.length
      },
      results: [],
      startTime,
      currentPhase: 'Initializing'
    };

    this.executions.set(executionId, execution);

    const auditTrail: AuditEntry[] = [];
    const componentResults: ComponentResult[] = [];
    
    try {
      auditTrail.push({
        timestamp: new Date().toISOString(),
        action: 'EXECUTION_STARTED',
        details: { executionId, templateId: template.id },
        level: 'INFO'
      });

      this.validateDependencies(template.components);
      
      const results = await this.executeComponents(
        template.components,
        request.globalParameters || {},
        request.executionOptions || {},
        execution,
        auditTrail
      );

      componentResults.push(...results);
      
      const aggregatedResult = this.aggregateResults(
        results,
        template.aggregationLogic
      );
      
      const endTime = new Date().toISOString();
      const totalExecutionTime = 
        new Date(endTime).getTime() - new Date(startTime).getTime();

      execution.status = 'COMPLETED';
      execution.results = results;
      execution.progress.completed = results.filter(r => r.status === 'PASS').length;
      execution.progress.failed = results.filter(r => r.status === 'FAIL' || r.status === 'ERROR').length;
      execution.progress.running = 0;
      execution.progress.pending = 0;
      execution.currentPhase = 'Completed';

      auditTrail.push({
        timestamp: new Date().toISOString(),
        action: 'EXECUTION_COMPLETED',
        details: { 
          executionId,
          overallVerdict: aggregatedResult.overallVerdict,
          executionTime: `${totalExecutionTime}ms`
        },
        level: 'INFO'
      });

      const result: ComposedProofResult = {
        success: aggregatedResult.overallVerdict === 'PASS',
        requestId,
        templateId: request.templateId,
        executionId,
        overallVerdict: aggregatedResult.overallVerdict,
        componentResults,
        aggregatedResult: {
          totalComponents: results.length,
          passedComponents: results.filter(r => r.status === 'PASS').length,
          failedComponents: results.filter(r => r.status === 'FAIL' || r.status === 'ERROR').length,
          skippedComponents: results.filter(r => r.status === 'SKIPPED').length,
          aggregationScore: aggregatedResult.score
        },
        executionMetrics: {
          startTime,
          endTime,
          totalExecutionTime: `${totalExecutionTime}ms`,
          parallelExecutions: this.countParallelExecutions(results),
          cacheHits: results.filter(r => r.cacheHit).length,
          retries: results.reduce((sum, r) => sum + (r.retryCount || 0), 0)
        },
        auditTrail
      };

      logger.info('Composed proof execution completed successfully', {
        executionId,
        overallVerdict: result.overallVerdict,
        passedComponents: result.aggregatedResult.passedComponents,
        totalComponents: result.aggregatedResult.totalComponents
      });

      return result;
      
    } catch (error) {
      execution.status = 'FAILED';
      execution.currentPhase = 'Failed';
      
      auditTrail.push({
        timestamp: new Date().toISOString(),
        action: 'EXECUTION_FAILED',
        details: { 
          executionId,
          error: error instanceof Error ? error.message : String(error)
        },
        level: 'ERROR'
      });

      logger.error('Composed proof execution failed', {
        executionId,
        error: error instanceof Error ? error.message : String(error)
      });

      const endTime = new Date().toISOString();
      const totalExecutionTime = 
        new Date(endTime).getTime() - new Date(startTime).getTime();

      const result: ComposedProofResult = {
        success: false,
        requestId,
        templateId: request.templateId,
        executionId,
        overallVerdict: 'ERROR',
        componentResults,
        aggregatedResult: {
          totalComponents: template.components.length,
          passedComponents: 0,
          failedComponents: template.components.length,
          skippedComponents: 0
        },
        executionMetrics: {
          startTime,
          endTime,
          totalExecutionTime: `${totalExecutionTime}ms`,
          parallelExecutions: 0,
          cacheHits: 0,
          retries: 0
        },
        auditTrail
      };

      return result;
    }
  }

  private validateDependencies(components: ProofComponent[]): void {
    const componentIds = new Set(components.map(c => c.id));
    
    for (const component of components) {
      if (component.dependencies) {
        for (const depId of component.dependencies) {
          if (!componentIds.has(depId)) {
            throw new DependencyError(
              `Component '${component.id}' depends on non-existent component '${depId}'`,
              component.id,
              [depId]
            );
          }
        }
      }
    }

    this.checkCircularDependencies(components);
  }

  private checkCircularDependencies(components: ProofComponent[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (componentId: string): boolean => {
      if (recursionStack.has(componentId)) {
        return true;
      }
      
      if (visited.has(componentId)) {
        return false;
      }
      
      visited.add(componentId);
      recursionStack.add(componentId);
      
      const component = components.find(c => c.id === componentId);
      if (component?.dependencies) {
        for (const depId of component.dependencies) {
          if (hasCycle(depId)) {
            return true;
          }
        }
      }
      
      recursionStack.delete(componentId);
      return false;
    };
    
    for (const component of components) {
      if (hasCycle(component.id)) {
        throw new DependencyError(
          `Circular dependency detected involving component '${component.id}'`,
          component.id,
          []
        );
      }
    }
  }

  private async executeComponents(
    components: ProofComponent[],
    globalParameters: any,
    executionOptions: any,
    execution: ComposedProofExecution,
    auditTrail: AuditEntry[]
  ): Promise<ComponentResult[]> {
    const results: ComponentResult[] = [];
    const completed = new Set<string>();
    const maxParallelism = executionOptions.maxParallelism || 3;
    const enableCaching = executionOptions.enableCaching !== false;
    
    const dependencyGraph = new Map<string, string[]>();
    const dependents = new Map<string, string[]>();
    
    for (const component of components) {
      dependencyGraph.set(component.id, component.dependencies || []);
      dependents.set(component.id, []);
    }
    
    for (const [componentId, deps] of dependencyGraph.entries()) {
      for (const depId of deps) {
        const depList = dependents.get(depId) || [];
        depList.push(componentId);
        dependents.set(depId, depList);
      }
    }
    
    const executing = new Set<string>();
    
    while (completed.size < components.length) {
      const ready = components.filter(component => {
        if (completed.has(component.id) || executing.has(component.id)) {
          return false;
        }
        
        const deps = dependencyGraph.get(component.id) || [];
        return deps.every(depId => completed.has(depId));
      });
      
      if (ready.length === 0 && executing.size === 0) {
        throw new ComposedProofError(
          'Deadlock detected: no components ready to execute',
          'DEADLOCK_DETECTED'
        );
      }
      
      const toExecute = ready.slice(0, maxParallelism - executing.size);
      
      const promises = toExecute.map(async (component) => {
        executing.add(component.id);
        execution.progress.running++;
        execution.progress.pending--;
        execution.currentPhase = `Executing ${component.id}`;
        
        try {
          const result = await this.executeComponent(
            component,
            globalParameters,
            executionOptions,
            enableCaching,
            auditTrail
          );
          
          results.push(result);
          completed.add(component.id);
          executing.delete(component.id);
          
          execution.progress.running--;
          if (result.status === 'PASS') {
            execution.progress.completed++;
          } else {
            execution.progress.failed++;
          }
          execution.results = [...results];
          
          return result;
        } catch (error) {
          executing.delete(component.id);
          execution.progress.running--;
          execution.progress.failed++;
          
          const errorResult: ComponentResult = {
            componentId: component.id,
            toolName: component.toolName,
            status: 'ERROR',
            zkProofGenerated: false,
            executionTime: '0ms',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          };
          
          results.push(errorResult);
          completed.add(component.id);
          execution.results = [...results];
          
          if (!component.optional) {
            throw new ComponentExecutionError(
              `Required component '${component.id}' failed`,
              component.id,
              error instanceof Error ? error : new Error(String(error))
            );
          }
          
          return errorResult;
        }
      });
      
      await Promise.all(promises);
    }
    
    return results;
  }

  private async executeComponent(
    component: ProofComponent,
    globalParameters: any,
    executionOptions: any,
    enableCaching: boolean,
    auditTrail: AuditEntry[]
  ): Promise<ComponentResult> {
    const startTime = Date.now();
    
    auditTrail.push({
      timestamp: new Date().toISOString(),
      action: 'COMPONENT_EXECUTION_STARTED',
      componentId: component.id,
      details: { toolName: component.toolName },
      level: 'INFO'
    });
    
    if (enableCaching && component.cacheKey) {
      const cacheKey = this.interpolateCacheKey(
        component.cacheKey,
        { ...globalParameters, ...component.parameters }
      );
      
      const cached = this.cache.get(cacheKey);
      if (cached && new Date(cached.expiresAt) > new Date()) {
        cached.hits++;
        
        auditTrail.push({
          timestamp: new Date().toISOString(),
          action: 'CACHE_HIT',
          componentId: component.id,
          details: { cacheKey },
          level: 'INFO'
        });
        
        return {
          ...cached.result,
          cacheHit: true,
          timestamp: new Date().toISOString()
        };
      }
    }
    
    const mergedParameters = {
      ...globalParameters,
      ...component.parameters
    };
    
    const retryPolicy = executionOptions.retryPolicy || {
      maxRetries: 1,
      backoffStrategy: 'FIXED',
      backoffDelay: 1000
    };
    
    let lastError: Error | null = null;
    let retryCount = 0;
    
    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateBackoffDelay(retryPolicy, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
          
          auditTrail.push({
            timestamp: new Date().toISOString(),
            action: 'COMPONENT_RETRY',
            componentId: component.id,
            details: { attempt, delay },
            level: 'WARN'
          });
        }
        
        const toolResult = await zkPretClient.executeTool(
          component.toolName,
          mergedParameters
        );
        
        const executionTime = Date.now() - startTime;
        
        const result: ComponentResult = {
          componentId: component.id,
          toolName: component.toolName,
          status: toolResult.success ? 'PASS' : 'FAIL',
          zkProofGenerated: toolResult.result?.zkProofGenerated || false,
          executionTime: `${executionTime}ms`,
          output: toolResult.result?.output,
          error: toolResult.result?.error,
          dependencies: component.dependencies,
          retryCount,
          timestamp: new Date().toISOString()
        };
        
        if (enableCaching && component.cacheKey && result.status === 'PASS') {
          const cacheKey = this.interpolateCacheKey(
            component.cacheKey,
            mergedParameters
          );
          
          const cacheEntry: ProofCache = {
            cacheKey,
            result,
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            hits: 0
          };
          
          this.cache.set(cacheKey, cacheEntry);
        }
        
        auditTrail.push({
          timestamp: new Date().toISOString(),
          action: 'COMPONENT_EXECUTION_COMPLETED',
          componentId: component.id,
          details: {
            status: result.status,
            executionTime: result.executionTime,
            retryCount
          },
          level: 'INFO'
        });
        
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        auditTrail.push({
          timestamp: new Date().toISOString(),
          action: 'COMPONENT_EXECUTION_ERROR',
          componentId: component.id,
          details: {
            attempt,
            error: lastError.message
          },
          level: 'ERROR'
        });
      }
    }
    
    throw new ComponentExecutionError(
      `Component '${component.id}' failed after ${retryPolicy.maxRetries + 1} attempts`,
      component.id,
      lastError || new Error('Unknown execution error')
    );
  }

  private interpolateCacheKey(template: string, parameters: any): string {
    return template.replace(/\{([^}]+)\}/g, (match, key) => {
      return parameters[key] || match;
    });
  }

  private calculateBackoffDelay(retryPolicy: RetryPolicy, attempt: number): number {
    switch (retryPolicy.backoffStrategy) {
      case 'FIXED':
        return retryPolicy.backoffDelay;
      case 'LINEAR':
        return retryPolicy.backoffDelay * attempt;
      case 'EXPONENTIAL':
        return retryPolicy.backoffDelay * Math.pow(2, attempt - 1);
      default:
        return retryPolicy.backoffDelay;
    }
  }

  private aggregateResults(
    results: ComponentResult[],
    aggregationLogic: AggregationLogic
  ): { overallVerdict: 'PASS' | 'FAIL' | 'PARTIAL' | 'ERROR'; score?: number } {
    const passedResults = results.filter(r => r.status === 'PASS');
    const failedResults = results.filter(r => r.status === 'FAIL' || r.status === 'ERROR');
    const totalResults = results.length;
    
    if (totalResults === 0) {
      return { overallVerdict: 'ERROR' };
    }
    
    switch (aggregationLogic.type) {
      case 'ALL_REQUIRED':
        if (passedResults.length === totalResults) {
          return { overallVerdict: 'PASS', score: 1.0 };
        } else if (failedResults.length === totalResults) {
          return { overallVerdict: 'FAIL', score: 0.0 };
        } else {
          return { overallVerdict: 'PARTIAL', score: passedResults.length / totalResults };
        }
      
      case 'MAJORITY':
        const majorityThreshold = aggregationLogic.threshold || Math.ceil(totalResults / 2);
        const score = passedResults.length / totalResults;
        
        if (passedResults.length >= majorityThreshold) {
          return { overallVerdict: 'PASS', score };
        } else {
          return { overallVerdict: 'FAIL', score };
        }
      
      case 'WEIGHTED':
        if (!aggregationLogic.weights) {
          throw new AggregationError('Weights must be provided for weighted aggregation');
        }
        
        let weightedScore = 0;
        let totalWeight = 0;
        
        for (const result of results) {
          const weight = aggregationLogic.weights[result.componentId] || 0;
          totalWeight += weight;
          
          if (result.status === 'PASS') {
            weightedScore += weight;
          }
        }
        
        const normalizedScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
        const weightedThreshold = aggregationLogic.threshold || 0.5;
        
        if (normalizedScore >= weightedThreshold) {
          return { overallVerdict: 'PASS', score: normalizedScore };
        } else {
          return { overallVerdict: 'FAIL', score: normalizedScore };
        }
      
      case 'CUSTOM':
        throw new AggregationError('Custom aggregation logic not yet implemented');
      
      default:
        throw new AggregationError(`Unknown aggregation type: ${aggregationLogic.type}`);
    }
  }

  private countParallelExecutions(results: ComponentResult[]): number {
    return Math.min(results.length, 3);
  }

  getTemplates(): CompositionTemplate[] {
    return Array.from(this.templates.values());
  }
  
  getTemplate(templateId: string): CompositionTemplate | undefined {
    return this.templates.get(templateId);
  }
  
  addTemplate(template: CompositionTemplate): void {
    this.validateTemplate(template);
    this.templates.set(template.id, template);
    
    logger.info('Added new composition template', {
      templateId: template.id,
      name: template.name
    });
  }
  
  private validateTemplate(template: CompositionTemplate): void {
    if (!template.id || !template.name || !template.components) {
      throw new ComposedProofError(
        'Template must have id, name, and components',
        'INVALID_TEMPLATE'
      );
    }
    
    this.validateDependencies(template.components);
  }
  
  getExecution(executionId: string): ComposedProofExecution | undefined {
    return this.executions.get(executionId);
  }
  
  getCacheStats(): { size: number; hits: number; entries: any[] } {
    const entries = Array.from(this.cache.values());
    return {
      size: this.cache.size,
      hits: entries.reduce((sum, entry) => sum + entry.hits, 0),
      entries: entries.map(entry => ({
        cacheKey: entry.cacheKey,
        hits: entry.hits,
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt
      }))
    };
  }
  
  clearCache(): void {
    this.cache.clear();
    logger.info('Cleared composed proof cache');
  }
}

export const composedProofService = new ComposedProofService();
