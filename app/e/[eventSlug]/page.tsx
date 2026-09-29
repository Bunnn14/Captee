import { Camera, Clock3, CheckCircle2 } from 'lucide-react';
import { formatPhilippineTime, getEventBySlug, getEventStatus, getMedia } from '@/lib/data';
import LiveGallery from '@/components/live-gallery';
import UploadPanel from '@/components/upload-panel';

export const dynamic = 'force-dynamic';

export default async function GuestUploadPage({ params }: { params: { eventSlug: string } }) {
  const event = await getEventBySlug(params.eventSlug);
  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="card max-w-xl p-8 text-zinc-300">
          <p className="eyebrow">Event unavailable</p>
          <h1 className="mt-3 text-2xl font-semibold text-white">This event link could not be found.</h1>
          <p className="mt-3 text-zinc-400">The QR code may point to an old or invalid event slug. Please ask the host to create the event again or share the latest link.</p>
        </div>
      </main>
    );
  }

  const media = await getMedia(event.id);
  const status = getEventStatus(event);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <section className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Guest upload</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{event.title}</h1>
            <p className="mt-3 max-w-2xl text-zinc-400">No login needed. Add your photos and videos to the shared gallery.</p>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
              status === 'live' ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/5 text-zinc-300'
            }`}
          >
            {status === 'upcoming' ? <Clock3 size={16} /> : status === 'ended' ? <CheckCircle2 size={16} /> : <Camera size={16} />}
            {status === 'upcoming' ? 'Uploads open soon' : status === 'ended' ? 'Event ended' : 'Uploads open'}
          </div>
        </div>

        {status === 'upcoming' ? (
          <div className="mt-6 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 text-violet-100">
            Uploads are not open yet! Uploading begins at {formatPhilippineTime(event.start_time)}.
          </div>
        ) : status === 'ended' ? (
          <div className="card-inset mt-6 p-4 text-zinc-300">Event uploads are closed. Thank you for participating!</div>
        ) : (
          <UploadPanel eventId={event.id} status={status} />
        )}
      </section>

      <section className="card mt-6 p-6 sm:p-8">
        <LiveGallery eventId={event.id} eventSlug={event.slug} initialMedia={media} />
      </section>
    </main>
  );
}
