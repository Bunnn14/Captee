import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Clock3, CheckCircle2, Radio, ImagePlus, Link as LinkIcon, MonitorPlay } from 'lucide-react';
import { formatPhilippineTime, getEventById, getEventStatus, getMedia } from '@/lib/data';
import { hostKey } from '@/lib/tokens';
import HostGallery from '@/components/host-gallery';
import DownloadAllButton from '@/components/download-all-button';

export const dynamic = 'force-dynamic';

function getSiteUrl() {
  const headerStore = headers();
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || '';
  const proto = headerStore.get('x-forwarded-proto') || 'https';
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://captee.vercel.app';
}

export default async function DashboardPage({ params }: { params: { eventId: string } }) {
  const event = await getEventById(params.eventId);
  if (!event) notFound();
  const media = await getMedia(event.id);
  const status = getEventStatus(event);
  const guestUrl = `${getSiteUrl()}/e/${event.slug}`;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="card mb-6 overflow-hidden p-6 lg:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">Host dashboard</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{event.title}</h1>
            <p className="mt-3 text-zinc-400">Moderate uploads, share the guest link, and keep the venue slideshow running.</p>
            <div className="card-inset mt-5 flex flex-wrap items-center gap-3 px-4 py-3 text-sm text-zinc-300">
              <LinkIcon size={16} className="text-violet-300" />
              <span className="break-all">{guestUrl}</span>
            </div>
          </div>
          <div className="card-inset p-4 text-center">
            <p className="mb-2 text-sm text-zinc-400">Guest QR code</p>
            <div className="rounded-xl bg-white p-2">
              <QRCodeSVG value={guestUrl} size={128} />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="card p-6">
          <div className={`flex items-center gap-2 ${status === 'live' ? 'text-emerald-300' : 'text-violet-300'}`}>
            {status === 'upcoming' ? <Clock3 size={18} /> : status === 'ended' ? <CheckCircle2 size={18} /> : <Radio size={18} />}
            <h2 className="text-lg font-medium">{status === 'upcoming' ? 'Uploads open soon' : status === 'ended' ? 'Event ended' : 'Uploads currently live'}</h2>
          </div>
          <p className="mt-3 text-zinc-400">
            {status === 'upcoming' ? `Uploads begin at ${formatPhilippineTime(event.start_time)}` : status === 'ended' ? 'The upload window has closed.' : 'Guests can upload now.'}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="card-inset p-3">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Window</p>
              <p className="mt-2 text-sm text-zinc-200">
                {formatPhilippineTime(event.start_time)} → {formatPhilippineTime(event.end_time)}
              </p>
            </div>
            <div className="card-inset p-3">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Media</p>
              <p className="mt-2 text-sm text-zinc-200">{media.length} item(s)</p>
            </div>
            <div className="card-inset p-3">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Host</p>
              <p className="mt-2 break-all text-sm text-zinc-200">{event.host_email || 'No email provided'}</p>
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-medium">Moderation tools</h2>
          <div className="mt-4 flex flex-wrap items-start gap-3">
            <DownloadAllButton eventSlug={event.slug} eventTitle={event.title} />
            <Link href={`/e/${event.slug}/slideshow`} target="_blank" className="btn-secondary">
              <MonitorPlay size={16} /> Open slideshow
            </Link>
          </div>
          <div className="card-inset mt-5 p-4 text-sm text-zinc-400">
            <div className="flex items-center gap-2 text-violet-300">
              <ImagePlus size={16} />
              <span>Suggested workflow</span>
            </div>
            <p className="mt-2">Keep the QR visible at the venue, moderate content during the event, and export media before the 10-day cleanup window closes.</p>
          </div>
        </section>
      </div>

      <HostGallery eventSlug={event.slug} hostKey={hostKey(event.id)} initialMedia={media} />
    </main>
  );
}
