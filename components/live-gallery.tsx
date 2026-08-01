'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type MediaItem = {
  id: string;
  file_url: string;
  uploader_name: string | null;
  created_at: string;
};

export default function LiveGallery({ eventId, initialMedia }: { eventId: string; initialMedia: MediaItem[] }) {
  const [media, setMedia] = useState(initialMedia);

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
    );

    const channel = supabase
      .channel(`gallery-${eventId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'media', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const nextMedia = payload.new as MediaItem;
          setMedia((current) => (current.some((item) => item.id === nextMedia.id) ? current : [nextMedia, ...current]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {media.map((item) => (
        <div key={item.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
          {item.file_url?.includes('.mp4') ? (
            <video className="h-48 w-full object-cover" controls src={item.file_url} />
          ) : (
            <img className="h-48 w-full object-cover" src={item.file_url} alt="Uploaded media" />
          )}
          <div className="p-3 text-sm text-slate-400">{item.uploader_name || 'Guest'}</div>
        </div>
      ))}
    </div>
  );
}
