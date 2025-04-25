import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

// Create a Supabase client with public API key
export const supabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
);

// Create a Supabase client with service role key for admin operations if available
export const supabaseAdmin: SupabaseClient | null = env.SUPABASE_SERVICE_KEY 
  ? createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          persistSession: false,
        },
      }
    )
  : null;

// Helper function to check database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('spots').select('count', { count: 'exact' }).limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
} 