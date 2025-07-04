// Simple logging configuration for cleaner output
import { logger } from './logger.js';

// Override console.log for cleaner startup messages
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;

// Clean startup messages
export function initializeCleanLogging() {
  // Override console methods for cleaner output
  console.log = (...args) => {
    const message = args.join(' ');
    
    // Filter out verbose messages
    if (message.includes('ModeManager initialized') ||
        message.includes('Async job management') ||
        message.includes('Health monitoring started') ||
        message.includes('initialization complete')) {
      return; // Skip these verbose messages
    }
    
    // Show only essential startup info
    if (message.includes('HTTP server detected')) {
      originalConsoleLog('🔗 Connected to HTTP server');
      return;
    }
    
    if (message.includes('ZK-PRET started successfully')) {
      const portMatch = message.match(/localhost:(\d+)/);
      const modeMatch = message.match(/\((\w+) mode\)/);
      const port = portMatch ? portMatch[1] : '3000';
      const mode = modeMatch ? modeMatch[1] : 'http';
      originalConsoleLog(`✅ ZK-PRET ready: http://localhost:${port} (${mode} mode)`);
      return;
    }
    
    // For other messages, use original
    originalConsoleLog(...args);
  };
  
  console.info = (...args) => {
    // Only show errors and warnings in info
    if (args[0] && typeof args[0] === 'string' && args[0].includes('error')) {
      originalConsoleInfo(...args);
    }
  };
}

// Restore original logging
export function restoreOriginalLogging() {
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
}
