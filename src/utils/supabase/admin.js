import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Admin Client - uses the service role key.
 * Only import this in server-side code (API routes, webhooks).
 * NEVER expose this to the client/browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // fallback for dev

  if (!url || !serviceKey) {
    throw new Error('Supabase admin client: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
