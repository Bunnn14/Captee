import { getEventBySlug, getMedia } from '@/lib/data';
import Slideshow from '@/components/slideshow';

export const dynamic = 'force-dynamic';

export default async function SlideshowPage({ params }: { params: { eventSlug: string } }) {
  const event = await getEventBySlug(params.eventSlug);
  if (!event) {
    return <main className="flex min-h-screen items-center justify-center text-zinc-400">Event not found.</main>;
  }

  const media = await getMedia(event.id);
  return <Slideshow eventSlug={event.slug} eventTitle={event.title} initialMedia={media} />;
}
