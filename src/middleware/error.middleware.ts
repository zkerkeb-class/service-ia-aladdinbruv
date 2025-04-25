import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import logger from '../config/logger';
import { ErrorResponse } from '../types';

/**
 * Custom Error class with status code
 */
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found error handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Resource not found - ${req.originalUrl}`, StatusCodes.NOT_FOUND);
  next(error);
};

/**
 * Global error handler
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = 'statusCode' in err ? err.statusCode : StatusCodes.INTERNAL_SERVER_ERROR;
  const status = 'status' in err ? err.status : 'error';
  
  // Log error
  if (statusCode >= 500) {
    logger.error(`Error [${req.method} ${req.originalUrl}]:`, {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      query: req.query,
      body: req.body,
    });
  } else {
    logger.warn(`Error [${req.method} ${req.originalUrl}]:`, {
      error: err.message,
      path: req.path,
      method: req.method,
    });
  }

  // Create error response
  const errorResponse: ErrorResponse = {
    status,
    statusCode,
    message: err.message || 'Something went wrong',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  };
  
  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Async handler wrapper to avoid try/catch blocks in route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 