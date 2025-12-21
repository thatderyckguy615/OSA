import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

/**
 * Creates a server-side Supabase client using the service role key.
 * This client bypasses RLS and should only be used in server-side code.
 * 
 * @returns Typed Supabase client configured with no session persistence
 */
export function createServerClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

