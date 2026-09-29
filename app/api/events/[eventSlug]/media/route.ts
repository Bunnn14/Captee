import { NextResponse } from 'next/server';
import { getEventBySlug, getMedia } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { eventSlug: string } }) {
  const event = await getEventBySlug(params.eventSlug);
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const media = await getMedia(event.id);
  return NextResponse.json({ media }, { headers: { 'Cache-Control': 'no-store' } });
}
