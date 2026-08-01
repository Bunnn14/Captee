import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const supabase = getSupabaseAdmin();
  const now = new Date();

  const { data: events, error } = await supabase
    .from('events')
    .select('id, end_time')
    .lt('end_time', now.toISOString());

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  for (const event of events || []) {
    const cutoff = new Date(event.end_time);
    cutoff.setDate(cutoff.getDate() + 10);
    if (now < cutoff) {
      continue;
    }

    const { data: media } = await supabase.from('media').select('file_url').eq('event_id', event.id);
    const filePaths = (media || []).map((item: { file_url: string }) => item.file_url.split('/').slice(-2).join('/'));

    if (filePaths.length) {
      await supabase.storage.from('media').remove(filePaths);
    }

    await supabase.from('media').delete().eq('event_id', event.id);
  }

  return NextResponse.json({ ok: true, deletedEvents: events?.length || 0 });
}
