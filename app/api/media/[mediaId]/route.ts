import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { storagePathFromUrl } from '@/lib/media';
import { guestDeleteToken, hostKey, tokensMatch } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, { params }: { params: { mediaId: string } }) {
  const body = await request.json().catch(() => ({}));
  const supabase = getSupabaseAdmin();

  const { data: item } = await supabase.from('media').select('id, event_id, file_url').eq('id', params.mediaId).single();
  if (!item) {
    return NextResponse.json({ error: 'Media not found.' }, { status: 404 });
  }

  const authorized =
    tokensMatch(guestDeleteToken(item.id), body?.token) || (item.event_id ? tokensMatch(hostKey(item.event_id), body?.hostKey) : false);
  if (!authorized) {
    return NextResponse.json({ error: 'You can only remove your own uploads.' }, { status: 403 });
  }

  const { error } = await supabase.from('media').delete().eq('id', item.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await supabase.storage.from('media').remove([storagePathFromUrl(item.file_url)]);

  return NextResponse.json({ ok: true });
}
