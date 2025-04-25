import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import logger from '../config/logger';

/**
 * Middleware to handle validation errors
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Check for validation errors
    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
      return next();
    }
    
    // Format errors for a better response
    const formattedErrors = errors.array().map(error => {
      // Use type assertion since the error object structure might vary between versions
      const validationError = error as any;
      return {
        field: validationError.path || validationError.param || validationError.location,
        message: validationError.msg,
        value: validationError.value,
      };
    });
    
    // Log validation errors in development
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Validation errors:', formattedErrors);
    }
    
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: 'fail',
      statusCode: StatusCodes.BAD_REQUEST,
      message: 'Validation failed',
      errors: formattedErrors,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    });
  };
}; 