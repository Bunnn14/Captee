import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request, { params }: { params: { eventSlug: string } }) {
  const supabase = getSupabaseAdmin();
  const { data: event, error } = await supabase.from('events').select('*').eq('slug', params.eventSlug).single();

  if (error || !event) {
    return NextResponse.json({ ok: false, error: error?.message || 'not-found' });
  }

  const now = new Date();
  const startTime = new Date(event.start_time);
  const endTime = new Date(event.end_time);
  const status = now < startTime ? 'upcoming' : now > endTime ? 'ended' : 'live';

  return NextResponse.json({ ok: true, event, now: now.toISOString(), status });
}
