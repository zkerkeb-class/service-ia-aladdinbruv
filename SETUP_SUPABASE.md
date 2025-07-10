# Supabase Setup Guide for SK8 Spot Service

## Issue Fixed
The collections service was failing because it was using the regular Supabase client instead of the admin client, which couldn't bypass Row Level Security (RLS) policies.

## Solution Applied
1. Updated `CollectionService` to use the admin client (`supabaseAdmin`) for all database operations
2. Added error handling for missing service key configuration

## Required Environment Variables

Create a `.env` file in the `sk8spotservice` directory with the following configuration:

```env
# Environment Configuration for SK8 Spot Service

# Server Configuration
NODE_ENV=development
PORT=3002
HOST=localhost
API_VERSION=v1
CORS_ORIGIN=*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Supabase Configuration
SUPABASE_URL=https://ajebhzphrstcoyknfqik.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZWJoenBocnN0Y295a25mcWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4OTU5MTYsImV4cCI6MjA2MDQ3MTkxNn0.LyzS6t_vtlV3b-XhG3H9makdrd1fXKIh8cOfnV0Atf0

# CRITICAL: Add your service role key here
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Authentication
JWT_SECRET=t1oPkySXSbPbWKmqnwxjnl0KuLBqcOcYjIvgJHPHfnUDlVWUxcKdDxnVEhvUjFgU
TOKEN_EXPIRES_IN=1d
AUTH_SERVICE_URL=http://localhost:3001/api/v1

# External APIs (optional)
WEATHER_API_KEY=your_weather_api_key_here
OPENCAGE_API_KEY=your_opencage_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# ML Service
ML_SERVICE_URL=http://localhost:5000
USE_EXTERNAL_ML_SERVICE=false

# Roboflow API (optional)
ROBOFLOW_API_KEY=your_roboflow_api_key_here
ROBOFLOW_MODEL_ID=your_roboflow_model_id_here
ROBOFLOW_VERSION_NUMBER=1

# Caching
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600

# Storage
STORAGE_BUCKET=sk8-spot-images
MAX_FILE_SIZE=10485760

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=logs/app.log

# Timezone
TZ=UTC
```

## How to Get Your Service Role Key

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your "sk8" project
3. Go to Settings > API
4. Copy the "service_role" secret key (NOT the public anon key)
5. Replace `your_service_role_key_here` with the actual service role key

## What This Fixes

- **Collections counting error**: The service can now count collections for users
- **RLS bypass**: Backend operations can access data without user authentication context
- **Database queries**: All collection operations will work properly

## Testing

After setting up the environment variables, restart your service and test the collections endpoint:

```bash
curl -H "Authorization: Bearer mock-development-token" \
  http://localhost:3002/api/collections
```

You should now see a successful response instead of the previous error.

## Security Note

The service role key bypasses all RLS policies, so it should only be used for trusted backend operations. Never expose it in client-side code or logs. 