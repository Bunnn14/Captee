import { createClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://bluvqfsilitequzmmdog.supabase.co';
const fallbackAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || fallbackAnonKey;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('example.supabase.co'));

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : createClient(fallbackUrl, fallbackAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

export function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const keyToUse = serviceRoleKey || supabaseAnonKey;

  if (!hasSupabaseConfig || !keyToUse) {
    return createClient(fallbackUrl, fallbackAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return createClient(supabaseUrl, keyToUse, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
