import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import logger from '../config/logger';
import { setCache } from '../config/cache';

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
    
    console.log('🔍 Auth middleware - Authorization header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Auth middleware - No Bearer token found');
      return res.status(StatusCodes.UNAUTHORIZED).json({
        status: 'fail',
        message: 'Authentication required'
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔍 Auth middleware - Token (first 50 chars):', token.substring(0, 50) + '...');
    console.log('🔍 Auth middleware - JWT_SECRET (first 10 chars):', env.JWT_SECRET.substring(0, 10) + '...');
    
    // Development & test mock token bypass
    if (token === 'mock-development-token' && (env.NODE_ENV === 'development' || env.NODE_ENV === 'test')) {
      console.log('🔍 Auth middleware - Using mock development token');
      req.user = {
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'user',
      };
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        sub?: string;        // JWT standard field for user ID
        userId?: string;     // Legacy field name
        email: string;
        role: string;
      };
      
      console.log('🔍 Auth middleware - Decoded token:', {
        sub: decoded.sub,
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      });
      
      // Use 'sub' field if available (JWT standard), otherwise fall back to 'userId'
      const userId = decoded.sub || decoded.userId;
      
      if (!userId) {
        console.log('❌ Auth middleware - No userId or sub field found');
        return res.status(StatusCodes.UNAUTHORIZED).json({
          status: 'fail',
          message: 'Invalid token format'
        });
      }
      
      req.user = {
        userId,
        email: decoded.email,
        role: decoded.role,
      };
      
      console.log('✅ Auth middleware - Authentication successful for user:', userId);
      next();
    } catch (jwtError: any) {
      console.error('❌ Auth middleware - JWT verification failed:', jwtError?.message || jwtError);
      return res.status(StatusCodes.UNAUTHORIZED).json({
        status: 'fail',
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('❌ Auth middleware - Unexpected error:', error);
    return res.status(StatusCodes.UNAUTHORIZED).json({
      status: 'fail',
      message: 'Authentication error'
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
      sub?: string;
      userId?: string;
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