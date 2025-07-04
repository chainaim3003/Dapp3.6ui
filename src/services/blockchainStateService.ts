import { logger } from '../utils/logger.js';
import type { BlockchainState, StateChange, StateComparison, ToolExecutionResult } from '../types/index.js';

class BlockchainStateService {
  /**
   * Mock function to simulate querying current blockchain state
   * In a real implementation, this would connect to the MINA blockchain
   * and query the GLEIFEnhancedVerifierSmartContractWithSign state
   */
  async getCurrentState(): Promise<BlockchainState> {
    try {
      logger.info('Querying current blockchain state...');
      
      // Simulate blockchain state query
      // In production, this would call the smart contract's getContractStats() method
      await this.simulateBlockchainDelay();
      
      // Return mock current state
      const currentState: BlockchainState = {
        isGLEIFCompliant: false,
        totalVerifications: Math.floor(Math.random() * 50) + 10, // Random between 10-59
        smartContractActive: true,
        riskMitigationBase: 0,
        complianceMapRoot: '0x' + Math.random().toString(16).substring(2, 18).padStart(16, '0'),
        complianceActionState: '0x' + Math.random().toString(16).substring(2, 18).padStart(16, '0'),
        admin: '0xB62qk...' + Math.random().toString(16).substring(2, 10),
        lastUpdateTimestamp: new Date().toISOString()
      };
      
      logger.info('Current blockchain state retrieved', { 
        isGLEIFCompliant: currentState.isGLEIFCompliant,
        totalVerifications: currentState.totalVerifications
      });
      
      return currentState;
    } catch (error) {
      logger.error('Failed to query current blockchain state', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw new Error('Failed to query blockchain state');
    }
  }

  /**
   * Mock function to simulate querying blockchain state after GLEIF verification
   * In a real implementation, this would query the updated contract state
   */
  async getPostExecutionState(beforeState: BlockchainState): Promise<BlockchainState> {
    try {
      logger.info('Querying post-execution blockchain state...');
      
      // Simulate blockchain state query delay
      await this.simulateBlockchainDelay();
      
      // Simulate the state changes that would occur after GLEIF verification
      const afterState: BlockchainState = {
        ...beforeState,
        isGLEIFCompliant: true, // This would change to true after successful verification
        totalVerifications: beforeState.totalVerifications + 1, // Increment verification count
        complianceActionState: '0x' + Math.random().toString(16).substring(2, 18).padStart(16, '0'), // New action state
        lastUpdateTimestamp: new Date().toISOString()
      };
      
      logger.info('Post-execution blockchain state retrieved', { 
        isGLEIFCompliant: afterState.isGLEIFCompliant,
        totalVerifications: afterState.totalVerifications
      });
      
      return afterState;
    } catch (error) {
      logger.error('Failed to query post-execution blockchain state', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw new Error('Failed to query post-execution blockchain state');
    }
  }

  /**
   * Compare two blockchain states and identify changes
   */
  compareStates(before: BlockchainState, after: BlockchainState): StateComparison {
    const changes: StateChange[] = [];
    
    // Compare each field
    const fields: (keyof BlockchainState)[] = [
      'isGLEIFCompliant',
      'totalVerifications', 
      'smartContractActive',
      'riskMitigationBase',
      'complianceMapRoot',
      'complianceActionState',
      'admin',
      'lastUpdateTimestamp'
    ];
    
    for (const field of fields) {
      const beforeValue = before[field];
      const afterValue = after[field];
      const changed = beforeValue !== afterValue;
      
      let type: 'boolean' | 'number' | 'string' = 'string';
      if (typeof beforeValue === 'boolean') type = 'boolean';
      else if (typeof beforeValue === 'number') type = 'number';
      
      changes.push({
        field,
        before: beforeValue,
        after: afterValue,
        changed,
        type
      });
    }
    
    const hasChanges = changes.some(change => change.changed);
    
    const comparison: StateComparison = {
      before,
      after,
      changes,
      hasChanges,
      timestamp: new Date().toISOString()
    };
    
    logger.info('State comparison completed', { 
      hasChanges,
      changedFields: changes.filter(c => c.changed).map(c => c.field)
    });
    
    return comparison;
  }

  /**
   * Execute GLEIF verification with state tracking
   */
  async executeWithStateTracking(
    toolName: string,
    parameters: any,
    executeTool: (toolName: string, parameters: any) => Promise<ToolExecutionResult>
  ): Promise<{ result: ToolExecutionResult; stateComparison: StateComparison }> {
    try {
      logger.info('Starting GLEIF verification with state tracking', { toolName });
      
      // Get state before execution
      const beforeState = await this.getCurrentState();
      
      // Execute the actual tool
      const result = await executeTool(toolName, parameters);
      
      // Get state after execution (only if execution was successful)
      const afterState = result.success 
        ? await this.getPostExecutionState(beforeState)
        : beforeState; // If failed, state remains the same
      
      // Compare states
      const stateComparison = this.compareStates(beforeState, afterState);
      
      logger.info('GLEIF verification with state tracking completed', { 
        success: result.success,
        hasStateChanges: stateComparison.hasChanges
      });
      
      return {
        result,
        stateComparison
      };
    } catch (error) {
      logger.error('GLEIF verification with state tracking failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Format state for display in UI
   */
  formatStateForDisplay(state: BlockchainState): Record<string, any> {
    return {
      'GLEIF Compliant': state.isGLEIFCompliant ? 'Yes' : 'No',
      'Total Verifications': state.totalVerifications.toString(),
      'Contract Active': state.smartContractActive ? 'Yes' : 'No',
      'Risk Mitigation Base': state.riskMitigationBase.toString(),
      'Compliance Map Root': this.truncateHash(state.complianceMapRoot),
      'Compliance Action State': this.truncateHash(state.complianceActionState),
      'Admin Address': this.truncateAddress(state.admin),
      'Last Update': state.lastUpdateTimestamp ? 
        new Date(state.lastUpdateTimestamp).toLocaleString() : 'N/A'
    };
  }

  /**
   * Helper function to truncate long hashes for display
   */
  private truncateHash(hash: string): string {
    if (hash.length <= 10) return hash;
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  }

  /**
   * Helper function to truncate addresses for display
   */
  private truncateAddress(address: string): string {
    if (address.length <= 12) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 4)}`;
  }

  /**
   * Simulate blockchain query delay for realistic UX
   */
  private async simulateBlockchainDelay(): Promise<void> {
    const delay = Math.random() * 1000 + 500; // 500-1500ms delay
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

export const blockchainStateService = new BlockchainStateService();