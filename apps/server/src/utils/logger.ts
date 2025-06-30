import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: logFormat
    }),
    
    // File transport for error logs only
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: logFormat
    })
  ]
});

// Helper function to log errors with context
export const logError = (error: unknown, context?: string): void => {
  const errorMessage = context ? `${context}: ${error}` : String(error);
  
  
  if (error instanceof Error) {
    console.error(error);
    logger.error(errorMessage, { stack: error.stack });
  } else {
    console.info(errorMessage);
    logger.error(errorMessage);
  }
};

// Helper function to log info messages
export const logInfo = (message: string, meta?: any): void => {
  logger.info(message, meta);
};

// Helper function to log warnings
export const logWarning = (message: string, meta?: any): void => {
  logger.warn(message, meta);
};

// Helper function to log debug messages
export const logDebug = (message: string, meta?: any): void => {
  logger.debug(message, meta);
};

export default logger; 