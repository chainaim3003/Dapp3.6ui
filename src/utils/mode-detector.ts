export class ModeDetector {
  static detectMode() {
    const mode = {
      operation: 'ASYNC', // Force async only
      environment: process.env.VERCEL ? 'vercel' : 'local',
      asyncEnabled: true, // Always true
      websockets: false, // Disabled in serverless
      realImplementation: process.env.ENABLE_DEMO_MODE !== 'true',
      timestamp: new Date().toISOString()
    };
    
    console.log('🎯 ZK-PRET Mode Detection (Async Only - Real Implementation):', mode);
    return mode;
  }
  
  static isAsyncMode() {
    return true; // Always async in production
  }
  
  static isVercelEnvironment() {
    return !!process.env.VERCEL;
  }
  
  static getServerConfig() {
    return {
      serverUrl: process.env.ZK_PRET_SERVER_URL || 'https://your-api-server.vercel.app',
      timeout: parseInt(process.env.ZK_PRET_SERVER_TIMEOUT || '1800000'),
      asyncEnabled: true,
      realImplementation: process.env.ENABLE_DEMO_MODE !== 'true'
    };
  }
  
  static validateAsyncOnlyMode() {
    const isAsyncOnly = this.isAsyncMode() && !this.isDemoMode();
    if (!isAsyncOnly) {
      throw new Error('Application must run in ASYNC mode only with real implementation');
    }
    return true;
  }
  
  static isDemoMode() {
    return process.env.ENABLE_DEMO_MODE === 'true';
  }
}
