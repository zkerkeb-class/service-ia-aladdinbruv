import { createClient } from 'redis';
import { env } from './env';
import logger from './logger';

// Create Redis client if URL is provided
const redisClient = env.REDIS_URL 
  ? createClient({ url: env.REDIS_URL }) 
  : null;

// Connect to Redis if client is available
if (redisClient) {
  redisClient.connect().catch((err) => {
    logger.error('Redis connection error:', err);
  });

  redisClient.on('connect', () => {
    logger.info('Redis client connected');
  });

  redisClient.on('error', (err) => {
    logger.error('Redis client error:', err);
  });
} else {
  logger.warn('Redis URL not provided. Caching is disabled.');
}

/**
 * Set a key-value pair in Redis cache
 * @param key Cache key
 * @param value Value to cache (will be JSON stringified)
 * @param ttl Time to live in seconds (optional, defaults to env.CACHE_TTL)
 */
export async function setCache(key: string, value: any, ttl: number = env.CACHE_TTL): Promise<void> {
  if (!redisClient) return;
  
  try {
    await redisClient.set(key, JSON.stringify(value), { EX: ttl });
  } catch (error) {
    logger.error('Redis cache set error:', error);
  }
}

/**
 * Get a value from Redis cache
 * @param key Cache key
 * @returns The cached value (JSON parsed) or null if not found
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!redisClient) return null;
  
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) as T : null;
  } catch (error) {
    logger.error('Redis cache get error:', error);
    return null;
  }
}

/**
 * Delete a key from Redis cache
 * @param key Cache key to delete
 */
export async function deleteCache(key: string): Promise<void> {
  if (!redisClient) return;
  
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error('Redis cache delete error:', error);
  }
}

/**
 * Clear Redis cache with pattern matching
 * @param pattern Pattern to match keys (e.g., 'spots:*')
 */
export async function clearCachePattern(pattern: string): Promise<void> {
  if (!redisClient) return;
  
  try {
    let cursor = 0;
    do {
      const result = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = result.cursor;
      
      if (result.keys.length > 0) {
        await redisClient.del(result.keys);
      }
    } while (cursor !== 0);
  } catch (error) {
    logger.error('Redis cache clear pattern error:', error);
  }
}

export { redisClient }; 