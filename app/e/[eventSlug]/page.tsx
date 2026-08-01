import { headers } from 'next/headers';
import { Camera, Clock3, CheckCircle2 } from 'lucide-react';
import { getSupabaseAdmin } from '@/lib/supabase';
import LiveGallery from '@/components/live-gallery';
import UploadPanel from '@/components/upload-panel';

function getSiteUrl() {
  const headerStore = headers();
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || '';
  const proto = headerStore.get('x-forwarded-proto') || 'https';
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://captee.vercel.app';
}

async function getEventBySlug(eventSlug: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('events').select('*').eq('slug', eventSlug).single();
  if (error || !data) return null;
  return data;
}

async function getMedia(eventId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('media').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

function formatPhilippineTime(value: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default async function GuestUploadPage({ params }: { params: { eventSlug: string } }) {
  const event = await getEventBySlug(params.eventSlug);
  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="max-w-xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-slate-300 shadow-2xl shadow-cyan-950/20">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Event unavailable</p>
          <h1 className="mt-3 text-2xl font-semibold text-white">This event link could not be found.</h1>
          <p className="mt-3 text-slate-400">The QR code may point to an old or invalid event slug. Please ask the host to create the event again or share the latest link.</p>
        </div>
      </main>
    );
  }

  const media = await getMedia(event.id);
  const now = new Date();
  const startTime = new Date(event.start_time);
  const endTime = new Date(event.end_time);
  const status = now < startTime ? 'upcoming' : now > endTime ? 'ended' : 'live';

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-cyan-950/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Guest upload</p>
            <h1 className="mt-2 text-3xl font-semibold">{event.title}</h1>
            <p className="mt-3 max-w-2xl text-slate-300">No login needed. Scan the QR or open the link to add photos and videos.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
            {status === 'upcoming' ? <div className="flex items-center gap-2"><Clock3 size={16} />Uploads open soon</div> : status === 'ended' ? <div className="flex items-center gap-2"><CheckCircle2 size={16} />Event ended</div> : <div className="flex items-center gap-2"><Camera size={16} />Upload live</div>}
          </div>
        </div>

        {status === 'upcoming' ? (
          <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-cyan-200">
            Uploads are not open yet! Uploading begins at {formatPhilippineTime(event.start_time)}.
          </div>
        ) : status === 'ended' ? (
          <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-slate-300">
            Event uploads are closed. Thank you for participating!
          </div>
        ) : (
          <UploadPanel eventId={event.id} eventSlug={event.slug} status={status} />
        )}
      </section>

      <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-xl font-semibold">Live gallery</h2>
        <LiveGallery eventId={event.id} initialMedia={media} />
      </section>
    </main>
  );
}
