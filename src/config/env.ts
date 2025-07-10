import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

// Define schema for environment variables
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('localhost'),
  API_VERSION: z.string().default('v1'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),

  // Supabase
  SUPABASE_URL: z.string(),
  SUPABASE_KEY: z.string(),
  SUPABASE_SERVICE_KEY: z.string().optional(),

  // Authentication
  JWT_SECRET: z.string(),
  TOKEN_EXPIRES_IN: z.string().default('1d'),
  AUTH_SERVICE_URL: z.string().default('http://localhost:3001/api/v1'),

  // External APIs
  WEATHER_API_KEY: z.string().optional(),
  OPENCAGE_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),

  // ML Service
  ML_SERVICE_URL: z.string().default('http://localhost:5000'),
  USE_EXTERNAL_ML_SERVICE: z.string().transform(val => val === 'true').default('false'),
  
  // Roboflow API
  ROBOFLOW_API_KEY: z.string().optional(),
  ROBOFLOW_MODEL_ID: z.string().optional(),
  ROBOFLOW_VERSION_NUMBER: z.string().default('1'),

  // Caching
  REDIS_URL: z.string().optional(),
  CACHE_TTL: z.string().transform(Number).default('3600'),

  // Storage
  STORAGE_BUCKET: z.string().default('sk8-spot-images'),
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE_PATH: z.string().default('logs/app.log'),

  // Miscellaneous
  TZ: z.string().default('UTC'),
});

// Parse environment variables
const envParse = envSchema.safeParse(process.env);

if (!envParse.success) {
  console.error('❌ Invalid environment variables:', envParse.error.format());
  throw new Error('Invalid environment variables');
}

export const env = envParse.data; 