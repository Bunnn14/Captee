'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaItem } from '@/lib/media';
import { MEDIA_ADDED_EVENT, MEDIA_REMOVED_EVENT } from '@/lib/guest-uploads';

function sameList(a: MediaItem[], b: MediaItem[]) {
  return a.length === b.length && a.every((item, index) => item.id === b[index].id);
}

/**
 * Keeps an event's media list fresh by polling the media API in the background,
 * so galleries and the slideshow pick up new uploads and removals without a reload.
 */
export function useLiveMedia(eventSlug: string, initialMedia: MediaItem[], intervalMs = 5000) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const removedIds = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventSlug)}/media`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = (await response.json()) as { media: MediaItem[] };
      const next = data.media.filter((item) => !removedIds.current.has(item.id));
      setMedia((current) => (sameList(current, next) ? current : next));
    } catch {
      // Network hiccup: keep showing what we have and try again on the next tick.
    }
  }, [eventSlug]);

  const removeLocal = useCallback((mediaId: string) => {
    removedIds.current.add(mediaId);
    setMedia((current) => current.filter((item) => item.id !== mediaId));
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;

    const tick = async () => {
      if (!document.hidden) await refresh();
      if (!cancelled) timer = window.setTimeout(tick, intervalMs);
    };
    timer = window.setTimeout(tick, intervalMs);

    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh, intervalMs]);

  // Uploads and removals made on this page show up instantly, before the next poll.
  useEffect(() => {
    const onAdded = (event: Event) => {
      const item = (event as CustomEvent<MediaItem>).detail;
      setMedia((current) => (current.some((existing) => existing.id === item.id) ? current : [item, ...current]));
    };
    const onRemoved = (event: Event) => removeLocal((event as CustomEvent<{ id: string }>).detail.id);

    window.addEventListener(MEDIA_ADDED_EVENT, onAdded);
    window.addEventListener(MEDIA_REMOVED_EVENT, onRemoved);
    return () => {
      window.removeEventListener(MEDIA_ADDED_EVENT, onAdded);
      window.removeEventListener(MEDIA_REMOVED_EVENT, onRemoved);
    };
  }, [removeLocal]);

  return { media, refresh, removeLocal };
}
