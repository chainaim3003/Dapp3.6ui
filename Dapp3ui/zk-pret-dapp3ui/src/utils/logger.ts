import winston from 'winston';

// Simple, clean logging format
const simpleFormat = winston.format.printf(({ level, message, timestamp }) => {
  // Extract just the essential info from structured messages
  if (typeof message === 'object' && message !== null) {
    const msgObj = message as any; // Type assertion for dynamic properties
    
    // For startup messages, show only key info
    if (msgObj.activeMode) {
      return `✅ ZK-PRET ready: ${msgObj.activeMode} mode`;
    }
    if (msgObj.mode && msgObj.mode === 'http') {
      return `🔗 Connected to HTTP server`;
    }
    if (msgObj.timestamp && msgObj.autoFallback !== undefined) {
      return `🚀 Starting ZK-PRET...`;
    }
    // For other structured messages, keep them simple
    return `${level}: ${JSON.stringify(message)}`;
  }
  return `${level}: ${message}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    simpleFormat
  ),
  transports: [
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'development' ? 'info' : (process.env.LOG_LEVEL || 'warn')
    }),
  ],
});

export { logger };
