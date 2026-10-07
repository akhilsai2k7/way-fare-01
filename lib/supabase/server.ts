import { createClient } from '@supabase/supabase-js';

/**
 * Server client for privileged or server-side requests (Route Handlers, Server Actions, Express API).
 * Never exposes service-role keys to client browsers.
 */
export function createServerClient(accessToken?: string) {
  const supabaseUrl = (
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  ).trim();

  const supabasePublishableKey = (
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Supabase environment variables are missing.');
  }

  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });
}
