import { NextResponse } from 'next/server';
import { hasSupabaseConfig } from '@/lib/supabase';

export async function GET() {
  return NextResponse.json({
    ok: true,
    supabaseConfigured: hasSupabaseConfig,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
  });
}
