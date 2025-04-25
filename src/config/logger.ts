import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { env } from './env';

// Ensure log directory exists
const logDir = path.dirname(env.LOG_FILE_PATH);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: 'sk8-spot-analyzer' },
  transports: [
    // Write logs to file
    new winston.transports.File({ 
      filename: env.LOG_FILE_PATH,
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    
    // Write severe error logs to separate file
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
  ],
  exitOnError: false,
});

// Add console transport in development environment
if (env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// Create a stream object for Morgan integration
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger; 