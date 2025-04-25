import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { StatusCodes } from 'http-status-codes';
import logger from '../config/logger';

/**
 * General API rate limiter
 * Default: 100 requests per 15 minutes
 */
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    statusCode: StatusCodes.TOO_MANY_REQUESTS,
    message: 'Too many requests from this IP, please try again later.',
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(StatusCodes.TOO_MANY_REQUESTS).json(options.message);
  },
});

/**
 * Auth endpoints rate limiter (more strict)
 * 10 requests per 10 minutes
 */
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    statusCode: StatusCodes.TOO_MANY_REQUESTS,
    message: 'Too many authentication attempts, please try again later.',
  },
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(StatusCodes.TOO_MANY_REQUESTS).json(options.message);
  },
});

/**
 * Image upload rate limiter
 * 20 requests per hour
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    statusCode: StatusCodes.TOO_MANY_REQUESTS,
    message: 'Too many upload attempts, please try again later.',
  },
  handler: (req, res, next, options) => {
    logger.warn(`Upload rate limit exceeded for IP: ${req.ip}`);
    res.status(StatusCodes.TOO_MANY_REQUESTS).json(options.message);
  },
}); 