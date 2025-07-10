import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import logger from '../config/logger';

class SupabaseService {
  private static instance: SupabaseClient;
  private static adminInstance: SupabaseClient | null = null;

  private constructor() {}

  public static getInstance(): SupabaseClient {
    if (!SupabaseService.instance) {
      if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
        logger.error('Supabase URL or Key is not defined in environment variables.');
        throw new Error('Supabase URL or Key is not defined.');
      }
      
      SupabaseService.instance = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      
      logger.info('Supabase client initialized.');
    }
    return SupabaseService.instance;
  }

  public static getAdminInstance(): SupabaseClient {
    if (!SupabaseService.adminInstance) {
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
        logger.error('Supabase URL or Service Key is not defined in environment variables.');
        throw new Error('Supabase admin client not configured. Please set SUPABASE_SERVICE_KEY environment variable.');
      }
      
      SupabaseService.adminInstance = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      
      logger.info('Supabase admin client initialized.');
    }
    return SupabaseService.adminInstance;
  }
}

export const supabase = SupabaseService.getInstance();
export const supabaseAdmin = SupabaseService.getAdminInstance(); 