// Plain constants so client components can use them without bundling supabase-js.
const fallbackUrl = 'https://bluvqfsilitequzmmdog.supabase.co';
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('example.supabase.co'));
