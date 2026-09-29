import { createClient } from '@supabase/supabase-js';

import { hasSupabaseConfig, supabaseAnonKey, supabaseUrl } from '@/lib/supabase-config';

export { hasSupabaseConfig, supabaseAnonKey, supabaseUrl };

const fallbackUrl = 'https://bluvqfsilitequzmmdog.supabase.co';
// createClient throws on an empty key; callers check hasSupabaseConfig before relying on it.
const fallbackAnonKey = supabaseAnonKey || 'placeholder-key';

// Next.js caches fetch() by default; media lists must always be fresh.
const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: 'no-store' }) },
};

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, clientOptions)
  : createClient(fallbackUrl, fallbackAnonKey, clientOptions);

export function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const keyToUse = serviceRoleKey || supabaseAnonKey || fallbackAnonKey;

  if (!hasSupabaseConfig || !keyToUse) {
    return createClient(fallbackUrl, fallbackAnonKey, clientOptions);
  }

  return createClient(supabaseUrl, keyToUse, clientOptions);
}
