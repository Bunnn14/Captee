import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(_: Request, { params }: { params: { eventId: string } }) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('media').select('file_url').eq('event_id', params.eventId);
  const zip = new JSZip();
  const files = data || [];

  for (let index = 0; index < files.length; index += 1) {
    const item = files[index];
    const response = await fetch(item.file_url);
    const blob = await response.blob();
    const name = `media-${index + 1}${blob.type.includes('video') ? '.mp4' : '.jpg'}`;
    zip.file(name, blob);
  }

  const archive = await zip.generateAsync({ type: 'blob' });
  return new NextResponse(archive, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="captee-${params.eventId}.zip"`,
    },
  });
}
