import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (
  (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL : '') ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_SUPABASE_URL || (import.meta as any).env.NEXT_PUBLIC_SUPABASE_URL : '') ||
  ''
).trim();

const supabasePublishableKey = (
  (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY : '') ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY || (import.meta as any).env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY : '') ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export function createBrowserClient() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase URL and Publishable Key must be configured.');
  }
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = isSupabaseConfigured ? createBrowserClient() : null;
