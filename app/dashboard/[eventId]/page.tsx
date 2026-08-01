import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Trash2, Clock3, CheckCircle2, ImagePlus, Sparkles, Link as LinkIcon } from 'lucide-react';
import { getSupabaseAdmin } from '@/lib/supabase';

function getSiteUrl() {
  const headerStore = headers();
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || '';
  const proto = headerStore.get('x-forwarded-proto') || 'https';
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://captee.vercel.app';
}

async function getEvent(eventId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single();
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

async function deleteMediaItem(id: string, fileUrl: string) {
  'use server';
  const supabase = getSupabaseAdmin();
  const path = fileUrl.split('/').slice(-2).join('/');
  await supabase.storage.from('media').remove([path]);
  await supabase.from('media').delete().eq('id', id);
}

export default async function DashboardPage({ params }: { params: { eventId: string } }) {
  const event = await getEvent(params.eventId);
  if (!event) notFound();
  const media = await getMedia(event.id);
  const now = new Date();
  const startTime = new Date(event.start_time);
  const endTime = new Date(event.end_time);
  const status = now < startTime ? 'upcoming' : now > endTime ? 'ended' : 'live';

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 overflow-hidden rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/50 p-6 shadow-2xl shadow-cyan-950/20 lg:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
              <Sparkles size={16} /> Host dashboard
            </div>
            <h1 className="text-3xl font-semibold sm:text-4xl">{event.title}</h1>
            <p className="mt-3 text-slate-300">Moderate uploads, share the guest link, and keep the venue slideshow running.</p>
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
              <LinkIcon size={16} className="text-cyan-400" />
              <span className="break-all">{getSiteUrl()}/e/{event.slug}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-center">
            <p className="mb-2 text-sm text-slate-400">Guest QR code</p>
            <QRCodeSVG value={`${getSiteUrl()}/e/${event.slug}`} size={128} includeMargin />
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center gap-2 text-cyan-300">
            {status === 'upcoming' ? <Clock3 size={18} /> : status === 'ended' ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
            <h2 className="text-lg font-medium">{status === 'upcoming' ? 'Uploads open soon' : status === 'ended' ? 'Event ended' : 'Uploads currently live'}</h2>
          </div>
          <p className="mt-3 text-slate-300">
            {status === 'upcoming' ? `Uploads begin at ${formatPhilippineTime(event.start_time)}` : status === 'ended' ? 'The upload window has closed.' : 'Guests can upload now.'}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Window</p>
              <p className="mt-2 text-sm text-slate-200">{formatPhilippineTime(event.start_time)} → {formatPhilippineTime(event.end_time)}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Media</p>
              <p className="mt-2 text-sm text-slate-200">{media.length} item(s)</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Host</p>
              <p className="mt-2 text-sm text-slate-200">{event.host_email || 'No email provided'}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-medium">Moderation tools</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={`/api/download/${event.id}`} className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-400">
              <Download size={16} /> Download all (ZIP)
            </a>
            <Link href={`/e/${event.slug}/slideshow`} className="rounded-full border border-slate-700 px-4 py-2 font-medium text-slate-200 transition hover:border-slate-500">
              Open slideshow
            </Link>
          </div>
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
            <div className="flex items-center gap-2 text-cyan-300">
              <ImagePlus size={16} />
              <span>Suggested workflow</span>
            </div>
            <p className="mt-2">Keep the QR visible at the venue, moderate content during the event, and export media before the 10-day cleanup window closes.</p>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Live media</h2>
          <p className="text-sm text-slate-400">{media.length} item(s)</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {media.map((item: any) => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
              {item.file_url?.includes('.mp4') ? (
                <video className="h-48 w-full object-cover" controls src={item.file_url} />
              ) : (
                <img className="h-48 w-full object-cover" src={item.file_url} alt="Uploaded media" />
              )}
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-slate-100">{item.uploader_name || 'Guest'}</p>
                  <p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</p>
                </div>
                <form action={deleteMediaItem.bind(null, item.id, item.file_url)}>
                  <button className="rounded-full border border-rose-500/30 p-2 text-rose-400 transition hover:bg-rose-500/10">
                    <Trash2 size={16} />
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
