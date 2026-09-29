import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getEventById } from '@/lib/data';
import { guestDeleteToken } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

// Uploads that started just before the window closed may finish a little late.
const UPLOAD_GRACE_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const eventId = typeof body?.eventId === 'string' ? body.eventId : '';
  const fileUrl = typeof body?.fileUrl === 'string' ? body.fileUrl : '';
  const uploaderName = typeof body?.uploaderName === 'string' ? body.uploaderName.trim().slice(0, 60) : '';

  const event = eventId ? await getEventById(eventId) : null;
  if (!event) {
    return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  }

  const now = Date.now();
  if (now < new Date(event.start_time).getTime() || now > new Date(event.end_time).getTime() + UPLOAD_GRACE_MS) {
    return NextResponse.json({ error: 'Uploads are closed for this event.' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const folderUrl = supabase.storage.from('media').getPublicUrl(`${event.id}/`).data.publicUrl;
  if (!fileUrl.startsWith(folderUrl)) {
    return NextResponse.json({ error: 'Invalid file location.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('media')
    .insert({ event_id: event.id, file_url: fileUrl, uploader_name: uploaderName || 'Guest' })
    .select('id, event_id, file_url, uploader_name, created_at')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Could not save upload.' }, { status: 500 });
  }

  return NextResponse.json({ media: data, deleteToken: guestDeleteToken(data.id) });
}
