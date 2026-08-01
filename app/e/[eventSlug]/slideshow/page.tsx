"use client";

import { useEffect, useState } from 'react';
import { getSupabaseAdmin } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

function getSiteUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
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

export default function SlideshowPage({ params }: { params: { eventSlug: string } }) {
  const [event, setEvent] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    async function loadData() {
      const eventData = await getEventBySlug(params.eventSlug);
      if (!eventData) return;
      setEvent(eventData);
      const mediaData = await getMedia(eventData.id);
      setMedia(mediaData);
    }
    loadData();
  }, [params.eventSlug]);

  useEffect(() => {
    if (!media.length) return;
    const timer = setInterval(() => setCurrentIndex((value) => (value + 1) % media.length), 4000);
    return () => clearInterval(timer);
  }, [media]);

  if (!event) {
    return <main className="flex min-h-screen items-center justify-center text-slate-300">Event not found.</main>;
  }

  const currentMedia = media[currentIndex];

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <section className="flex flex-1 items-center justify-center bg-slate-950 p-8">
        {currentMedia ? (
          currentMedia.file_url?.includes('.mp4') ? (
            <video className="h-[80vh] w-full rounded-3xl object-contain" autoPlay loop controls src={currentMedia.file_url} />
          ) : (
            <img className="h-[80vh] w-full rounded-3xl object-contain" src={currentMedia.file_url} alt="Slideshow media" />
          )
        ) : (
          <div className="text-center text-slate-400">
            <h1 className="text-3xl font-semibold">Waiting for the first upload…</h1>
            <p className="mt-2">The live venue display will start as soon as guests share photos or videos.</p>
          </div>
        )}
      </section>
      <footer className="flex items-center justify-between border-t border-slate-800 bg-black/90 px-6 py-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Live slideshow</p>
          <p className="mt-1 text-lg font-medium">{event.title}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
          <QRCodeSVG value={`${getSiteUrl()}/e/${event.slug}`} size={72} includeMargin />
        </div>
      </footer>
    </main>
  );
}
