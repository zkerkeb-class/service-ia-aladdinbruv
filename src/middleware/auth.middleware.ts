import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import logger from '../config/logger';
import { getCache, setCache } from '../config/cache';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * Authentication middleware to protect routes
 * Validates JWT token from Authorization header
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        status: 'fail',
        message: 'Authentication required'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      status: 'fail',
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Role-based authorization middleware
 * @param roles Array of allowed roles
 */
export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          status: 'error',
          statusCode: StatusCodes.UNAUTHORIZED,
          message: 'Authentication required',
        });
        return;
      }
      
      if (!roles.includes(req.user.role)) {
        res.status(StatusCodes.FORBIDDEN).json({
          status: 'error',
          statusCode: StatusCodes.FORBIDDEN,
          message: 'Insufficient permissions to access this resource',
        });
        return;
      }
      
      next();
    } catch (error) {
      logger.error('Authorization middleware error:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Authorization error',
      });
    }
  };
};

/**
 * Blacklist a token for logout
 * @param token JWT token to blacklist
 * @returns Promise<void>
 */
export const blacklistToken = async (token: string): Promise<void> => {
  try {
    const decoded = jwt.decode(token) as {
      userId: string;
      email: string;
      role: string;
      exp?: number;
    };
    
    if (!decoded || !decoded.exp) {
      return;
    }
    
    // Calculate TTL (time until token expires)
    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;
    
    if (ttl > 0) {
      // Store in Redis cache until token expiration
      await setCache(`blacklist:${token}`, true, ttl);
    }
  } catch (error) {
    logger.error('Token blacklist error:', error);
  }
}; 