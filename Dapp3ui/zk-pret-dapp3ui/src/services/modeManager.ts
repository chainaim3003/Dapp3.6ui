import axios from 'axios';
import { logger } from '../utils/logger.js';

export interface ModeStatus {
  currentMode: 'stdio' | 'http';
  preferredMode: 'stdio' | 'http' | 'auto';
  httpServerAvailable: boolean;
  stdioAvailable: boolean;
  autoSwitchEnabled: boolean;
  lastModeSwitch?: Date;
  connectionHealth: {
    httpServer: 'connected' | 'disconnected' | 'error';
    stdio: 'available' | 'unavailable';
  };
}

export class ModeManager {
  private currentMode: 'stdio' | 'http' = 'stdio';
  private preferredMode: 'stdio' | 'http' | 'auto' = 'auto';
  private autoSwitchEnabled: boolean = true;
  private disableAutoFallback: boolean = false;
  private httpServerUrl: string;
  private healthCheckInterval?: NodeJS.Timeout;
  private lastModeSwitch?: Date;
  private modeChangeCallbacks: Array<(mode: 'stdio' | 'http') => void> = [];

  constructor() {
    this.httpServerUrl = process.env.ZK_PRET_SERVER_URL || 'http://localhost:3001';
    this.preferredMode = (process.env.ZK_PRET_PREFERRED_MODE as any) || 'auto';
    this.autoSwitchEnabled = process.env.ZK_PRET_AUTO_SWITCH_ENABLED !== 'false';
    this.disableAutoFallback = process.env.ZK_PRET_DISABLE_AUTO_FALLBACK === 'true';
    
    logger.info('ModeManager initialized', {
      mode: this.preferredMode,
      autoFallback: !this.disableAutoFallback
    });
  }

  async initialize(): Promise<void> {
    try {
      // Detect initial mode
      const bestMode = await this.detectBestMode();
      await this.switchMode(bestMode, 'initialization');
      
      // Start health monitoring if auto-switch is enabled
      if (this.autoSwitchEnabled) {
        this.startHealthMonitoring();
      }
      
      logger.info('ModeManager initialization complete', {
        activeMode: this.currentMode
      });
    } catch (error) {
      logger.error('ModeManager initialization failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Fallback to STDIO mode
      this.currentMode = 'stdio';
    }
  }

  async detectBestMode(): Promise<'stdio' | 'http'> {
    try {
      // If preferred mode is explicitly set and not auto
      if (this.preferredMode !== 'auto') {
        if (this.preferredMode === 'http') {
          const httpAvailable = await this.isHttpServerAvailable();
          if (httpAvailable) {
            return 'http';
          } else {
            logger.warn('HTTP mode preferred but server unavailable, falling back to STDIO');
            return 'stdio';
          }
        }
        return this.preferredMode;
      }

      // Auto-detection mode
      const httpAvailable = await this.isHttpServerAvailable();
      if (httpAvailable) {
        logger.info(`HTTP server detected, switching to HTTP mode`);
        return 'http';
      } else {
        logger.info('HTTP server not available, using STDIO mode');
        return 'stdio';
      }
    } catch (error) {
      logger.error('Mode detection failed, defaulting to STDIO', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 'stdio';
    }
  }

  async isHttpServerAvailable(): Promise<boolean> {
    try {
      const timeout = 5000; // 5 second timeout
      const response = await axios.get(`${this.httpServerUrl}/api/v1/health`, {
        timeout,
        validateStatus: (status) => status < 500 // Accept any status < 500
      });
      
      logger.debug('HTTP server health check successful', {
        status: response.status,
        url: this.httpServerUrl
      });
      
      return true;
    } catch (error) {
      logger.debug('HTTP server health check failed', {
        error: error instanceof Error ? error.message : String(error),
        url: this.httpServerUrl
      });
      return false;
    }
  }

  async isStdioAvailable(): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      const path = process.env.ZK_PRET_STDIO_PATH;
      
      if (!path) {
        return false;
      }
      
      await fs.access(path);
      return true;
    } catch (error) {
      logger.debug('STDIO availability check failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  async switchMode(newMode: 'stdio' | 'http', reason: string = 'manual'): Promise<boolean> {
    try {
      if (newMode === this.currentMode) {
        logger.debug('Mode switch requested but already in target mode', {
          currentMode: this.currentMode,
          requestedMode: newMode
        });
        return true;
      }

      // Validate mode availability
      if (newMode === 'http') {
        const httpAvailable = await this.isHttpServerAvailable();
        if (!httpAvailable) {
          logger.warn('Cannot switch to HTTP mode: server not available');
          return false;
        }
      } else if (newMode === 'stdio') {
        const stdioAvailable = await this.isStdioAvailable();
        if (!stdioAvailable) {
          logger.warn('Cannot switch to STDIO mode: not available');
          return false;
        }
      }

      const previousMode = this.currentMode;
      this.currentMode = newMode;
      this.lastModeSwitch = new Date();

      logger.info('Mode switched successfully', {
        mode: newMode
      });

      // Notify callbacks
      this.modeChangeCallbacks.forEach(callback => {
        try {
          callback(newMode);
        } catch (error) {
          logger.error('Mode change callback failed', {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

      return true;
    } catch (error) {
      logger.error('Mode switch failed', {
        newMode,
        reason,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      return; // Already monitoring
    }

    const interval = parseInt(process.env.ZK_PRET_HTTP_HEALTH_CHECK_INTERVAL || '30000');
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Health check failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, interval);

    logger.info('Health monitoring started', { interval });
  }

  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      logger.info('Health monitoring stopped');
    }
  }

  private async performHealthCheck(): Promise<void> {
    const httpAvailable = await this.isHttpServerAvailable();
    
    // Skip auto-switch logic if auto-fallback is disabled
    if (this.disableAutoFallback) {
      logger.debug('Auto-fallback disabled, skipping automatic mode switching', {
        currentMode: this.currentMode,
        httpAvailable,
        disableAutoFallback: this.disableAutoFallback
      });
      return;
    }
    
    // Auto-switch logic (only when auto-fallback is enabled)
    if (this.currentMode === 'stdio' && httpAvailable && this.preferredMode !== 'stdio') {
      logger.info('HTTP server became available, switching from STDIO to HTTP');
      await this.switchMode('http', 'auto-recovery');
    } else if (this.currentMode === 'http' && !httpAvailable) {
      logger.warn('HTTP server became unavailable, switching from HTTP to STDIO');
      await this.switchMode('stdio', 'auto-fallback');
    }
  }

  async getStatus(): Promise<ModeStatus> {
    const [httpAvailable, stdioAvailable] = await Promise.all([
      this.isHttpServerAvailable(),
      this.isStdioAvailable()
    ]);

    return {
      currentMode: this.currentMode,
      preferredMode: this.preferredMode,
      httpServerAvailable: httpAvailable,
      stdioAvailable: stdioAvailable,
      autoSwitchEnabled: this.autoSwitchEnabled,
      lastModeSwitch: this.lastModeSwitch,
      connectionHealth: {
        httpServer: httpAvailable ? 'connected' : 'disconnected',
        stdio: stdioAvailable ? 'available' : 'unavailable'
      }
    };
  }

  async forceMode(mode: 'stdio' | 'http' | 'auto'): Promise<boolean> {
    try {
      this.preferredMode = mode;
      
      if (mode === 'auto') {
        const bestMode = await this.detectBestMode();
        return await this.switchMode(bestMode, 'manual-auto');
      } else {
        return await this.switchMode(mode, 'manual-force');
      }
    } catch (error) {
      logger.error('Force mode failed', {
        mode,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  getCurrentMode(): 'stdio' | 'http' {
    return this.currentMode;
  }

  onModeChange(callback: (mode: 'stdio' | 'http') => void): void {
    this.modeChangeCallbacks.push(callback);
  }

  destroy(): void {
    this.stopHealthMonitoring();
    this.modeChangeCallbacks = [];
    logger.info('ModeManager destroyed');
  }
}

export const modeManager = new ModeManager();
