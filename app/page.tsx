import Link from 'next/link';
import { Camera, Sparkles, AlertTriangle } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin, hasSupabaseConfig } from '@/lib/supabase';

function makeSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const getParts = (value: Date, zone: string) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(value);

    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day),
      hour: Number(map.hour),
      minute: Number(map.minute),
      second: Number(map.second),
    };
  };

  const localParts = getParts(date, timeZone);
  const utcParts = getParts(date, 'UTC');
  const localMs = Date.UTC(localParts.year, localParts.month - 1, localParts.day, localParts.hour, localParts.minute, localParts.second);
  const utcMs = Date.UTC(utcParts.year, utcParts.month - 1, utcParts.day, utcParts.hour, utcParts.minute, utcParts.second);
  return Math.round((localMs - utcMs) / 60000);
}

function parseDateTimeInTimeZone(rawValue: string, timeZone = 'Asia/Manila') {
  const match = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const candidateUtc = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)));
  const offsetMinutes = getTimeZoneOffsetMinutes(candidateUtc, timeZone);
  return new Date(candidateUtc.getTime() - offsetMinutes * 60000);
}

export default function HomePage({ searchParams }: { searchParams?: { error?: string; details?: string } }) {
  const error = searchParams?.error;
  const details = searchParams?.details;

  async function createEvent(formData: FormData) {
    'use server';

    const title = String(formData.get('title') || '').trim();
    const hostEmail = String(formData.get('hostEmail') || '').trim();
    const startTimeRaw = String(formData.get('startTime') || '').trim();
    const endTimeRaw = String(formData.get('endTime') || '').trim();

    if (!title || !hostEmail || !startTimeRaw || !endTimeRaw) {
      redirect('/?error=missing-fields');
    }

    if (!hasSupabaseConfig) {
      redirect('/?error=supabase-not-configured');
    }

    const startTime = parseDateTimeInTimeZone(startTimeRaw);
    const endTime = parseDateTimeInTimeZone(endTimeRaw);
    if (!startTime || !endTime || Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      redirect('/?error=invalid-times');
    }
    if (startTime >= endTime) {
      redirect('/?error=invalid-window');
    }

    const slug = `${makeSlug(title)}-${Math.random().toString(36).slice(2, 8)}`;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('events')
      .insert({
        slug,
        title,
        host_email: hostEmail,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      })
      .select('id')
      .single();

    if (error || !data?.id) {
      const errorMessage = encodeURIComponent(error?.message || 'Unknown Supabase insert error');
      redirect(`/?error=create-failed&details=${errorMessage}`);
    }

    revalidatePath('/');
    redirect(`/dashboard/${data.id}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="space-y-6">
          <div className="chip">
            <Sparkles size={16} />
            App-less, QR-driven event memories
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
              Capture every moment at{' '}
              <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-300 bg-clip-text text-transparent">your event.</span>
            </h1>
            <p className="max-w-2xl text-lg text-zinc-400">
              Captee lets guests upload photos and videos instantly by scanning a QR code or opening a link—no login, no app install, just memories.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/e/demo-event" className="btn-primary">
              View demo guest page
            </Link>
            <Link href="/dashboard/demo" className="btn-secondary">
              Host dashboard preview
            </Link>
          </div>
        </section>

        <section className="card p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-violet-500/25 to-fuchsia-500/15 p-3 text-violet-200">
              <Camera size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Create a new event</h2>
              <p className="text-sm text-zinc-400">Set your upload window and get a QR-ready event page.</p>
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5" />
                <div>
                  <p className="font-medium">{error === 'supabase-not-configured' ? 'Supabase is not configured yet.' : error === 'missing-fields' ? 'Please fill in all fields.' : error === 'invalid-times' ? 'Please use valid start and end times.' : error === 'invalid-window' ? 'End time must be after start time.' : 'Event creation failed.'}</p>
                  {details ? <p className="mt-1 text-xs text-amber-100/80">{decodeURIComponent(details)}</p> : null}
                </div>
              </div>
            </div>
          ) : null}

          <form action={createEvent} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1.5 block text-zinc-300">Event name</span>
              <input name="title" required className="input" placeholder="Summer Party" />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-zinc-300">Host email</span>
              <input name="hostEmail" type="email" required className="input" placeholder="host@example.com" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block text-zinc-300">Start time</span>
                <input name="startTime" type="datetime-local" required className="input" />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block text-zinc-300">End time</span>
                <input name="endTime" type="datetime-local" required className="input" />
              </label>
            </div>
            <button className="btn-primary w-full py-3 text-base">
              Create event
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
