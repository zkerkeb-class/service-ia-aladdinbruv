process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.HOST = 'localhost';
process.env.API_VERSION = 'v1';
process.env.CORS_ORIGIN = '*';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX = '100';

// Minimal supabase + auth env for tests
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-key';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'test-service-key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

process.env.TOKEN_EXPIRES_IN = '1d';
process.env.AUTH_SERVICE_URL = 'http://localhost:3001/api/v1';
process.env.ML_SERVICE_URL = 'http://localhost:5000';
process.env.USE_EXTERNAL_ML_SERVICE = 'false';
process.env.ROBOFLOW_VERSION_NUMBER = '1';
process.env.STORAGE_BUCKET = 'sk8-spot-images';
process.env.MAX_FILE_SIZE = '10485760';
process.env.LOG_LEVEL = 'error';
process.env.LOG_FILE_PATH = 'logs/app.log';
process.env.TZ = 'UTC';


