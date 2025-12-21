import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

let client: SupabaseClient<Database> | null = null;

/**
 * Creates a browser-side Supabase client using the anon key.
 * Uses singleton pattern to avoid creating multiple client instances.
 * Configured with no session persistence and realtime enabled.
 * 
 * @returns Typed Supabase client configured for browser use
 */
export function createClient(): SupabaseClient<Database> {
  if (client) {
    return client;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  }

  client = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return client;
}

