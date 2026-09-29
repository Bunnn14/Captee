'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Camera, Maximize, Minimize, Volume2, VolumeX } from 'lucide-react';
import { isVideo, type MediaItem } from '@/lib/media';
import { useLiveMedia } from '@/lib/use-live-media';

const IMAGE_DURATION_MS = 6000;
const POLL_INTERVAL_MS = 5000;
// If a video never starts (blocked autoplay, broken file), move on rather than freezing the screen.
const VIDEO_STALL_TIMEOUT_MS = 20000;

type Deck = { playlist: MediaItem[]; index: number; tick: number };

function oldestFirst(items: MediaItem[]) {
  return [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

type SlideshowProps = {
  eventSlug: string;
  eventTitle: string;
  initialMedia: MediaItem[];
};

export default function Slideshow({ eventSlug, eventTitle, initialMedia }: SlideshowProps) {
  const { media } = useLiveMedia(eventSlug, initialMedia, POLL_INTERVAL_MS);
  const [deck, setDeck] = useState<Deck>(() => ({ playlist: oldestFirst(initialMedia), index: 0, tick: 0 }));
  const [muted, setMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [guestUrl, setGuestUrl] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const current = deck.playlist[deck.index];
  const currentIsVideo = current ? isVideo(current.file_url) : false;
  const slideKey = current ? `${current.id}-${deck.tick}` : 'empty';

  useEffect(() => setGuestUrl(`${window.location.origin}/e/${eventSlug}`), [eventSlug]);

  const advance = useCallback((step = 1) => {
    setDeck((prev) => {
      if (!prev.playlist.length) return prev;
      const length = prev.playlist.length;
      return { ...prev, index: (prev.index + step + length) % length, tick: prev.tick + 1 };
    });
  }, []);

  // Merge polled media into the playlist without interrupting the slide on screen:
  // new uploads are queued to play next, removed ones drop out.
  useEffect(() => {
    setDeck((prev) => {
      const liveIds = new Set(media.map((item) => item.id));
      const known = new Set(prev.playlist.map((item) => item.id));
      const fresh = oldestFirst(media.filter((item) => !known.has(item.id)));
      const kept = prev.playlist.filter((item) => liveIds.has(item.id));
      if (!fresh.length && kept.length === prev.playlist.length) return prev;

      const showing = prev.playlist[prev.index];
      if (showing && liveIds.has(showing.id)) {
        const index = kept.findIndex((item) => item.id === showing.id);
        kept.splice(index + 1, 0, ...fresh);
        return { playlist: kept, index, tick: prev.tick };
      }

      // The slide on screen was deleted (or nothing was showing): continue with whatever came next.
      let index = prev.playlist.slice(0, prev.index).filter((item) => liveIds.has(item.id)).length;
      kept.splice(index, 0, ...fresh);
      if (index >= kept.length) index = 0;
      return { playlist: kept, index, tick: prev.tick + 1 };
    });
  }, [media]);

  // Photos stay up for a fixed time; videos advance on `ended` instead.
  useEffect(() => {
    if (!current || currentIsVideo) return;
    const timer = window.setTimeout(() => advance(), IMAGE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [slideKey, currentIsVideo, advance]);

  useEffect(() => {
    setVideoProgress(0);
    const video = videoRef.current;
    if (!currentIsVideo || !video) return;

    video.muted = mutedRef.current;
    video.play().catch(() => {
      // Browsers block autoplay with sound until someone interacts with the page.
      video.muted = true;
      setMuted(true);
      video.play().catch(() => undefined);
    });

    const stallTimer = window.setTimeout(() => {
      if (video.currentTime === 0) advance();
    }, VIDEO_STALL_TIMEOUT_MS);
    return () => window.clearTimeout(stallTimer);
  }, [slideKey, currentIsVideo, advance]);

  // Warm the cache so the next photo appears instantly.
  const upcoming = deck.playlist.length > 1 ? deck.playlist[(deck.index + 1) % deck.playlist.length] : null;
  useEffect(() => {
    if (upcoming && !isVideo(upcoming.file_url)) new Image().src = upcoming.file_url;
  }, [upcoming]);

  // Keep the venue screen awake while the slideshow is open.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const request = async () => {
      try {
        lock = await (navigator as any).wakeLock?.request('screen');
      } catch {}
    };
    const onVisible = () => {
      if (!document.hidden) request();
    };
    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => undefined);
    };
  }, []);

  // Fade the controls and cursor out when the mouse is idle.
  useEffect(() => {
    let timer = window.setTimeout(() => setControlsVisible(false), 3000);
    const onActivity = () => {
      setControlsVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setControlsVisible(false), 3000);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') advance(1);
      if (event.key === 'ArrowLeft') advance(-1);
      onActivity();
    };
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [advance]);

  function toggleSound() {
    const next = !muted;
    setMuted(next);
    if (videoRef.current) {
      videoRef.current.muted = next;
      videoRef.current.play().catch(() => undefined);
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else document.documentElement.requestFullscreen().catch(() => undefined);
  }

  return (
    <main className={`relative flex h-screen flex-col overflow-hidden bg-black text-white ${controlsVisible ? '' : 'cursor-none'}`}>
      {current && !currentIsVideo ? (
        <img key={`bg-${slideKey}`} src={current.file_url} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 animate-fade-in object-cover opacity-30 blur-3xl" />
      ) : null}

      <section className="relative flex min-h-0 flex-1 items-center justify-center p-6 sm:p-10">
        {current ? (
          currentIsVideo ? (
            <video
              key={slideKey}
              ref={videoRef}
              className="max-h-full max-w-full animate-slide-in rounded-3xl shadow-2xl shadow-black"
              src={current.file_url}
              muted={muted}
              playsInline
              autoPlay
              onEnded={() => advance()}
              onError={() => window.setTimeout(() => advance(), 3000)}
              onTimeUpdate={(event) => {
                const { currentTime, duration } = event.currentTarget;
                if (duration) setVideoProgress((currentTime / duration) * 100);
              }}
            />
          ) : (
            <img key={slideKey} className="max-h-full max-w-full animate-slide-in rounded-3xl object-contain shadow-2xl shadow-black" src={current.file_url} alt={`Shared by ${current.uploader_name || 'Guest'}`} />
          )
        ) : (
          <div className="flex flex-col items-center gap-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-500/15 text-violet-300">
              <Camera size={30} />
            </span>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">Waiting for the first upload…</h1>
              <p className="mt-3 text-lg text-zinc-400">Scan the code to share your photos and videos. They’ll appear here instantly.</p>
            </div>
            {guestUrl ? (
              <div className="rounded-3xl bg-white p-3">
                <QRCodeSVG value={guestUrl} size={200} />
              </div>
            ) : null}
          </div>
        )}
      </section>

      <div
        className={`absolute right-5 top-5 flex gap-2 transition-opacity duration-500 ${controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        {currentIsVideo ? (
          <button type="button" className="icon-btn h-11 w-11" onClick={toggleSound} aria-label={muted ? 'Turn sound on' : 'Mute'} title={muted ? 'Turn sound on' : 'Mute'}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        ) : null}
        <button type="button" className="icon-btn h-11 w-11" onClick={toggleFullscreen} aria-label="Toggle fullscreen" title="Fullscreen">
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>

      <footer className="relative border-t border-white/10 bg-black/60 backdrop-blur-xl">
        {current ? (
          <div className="absolute inset-x-0 top-0 h-0.5 bg-white/10">
            <div
              key={`progress-${slideKey}`}
              className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400"
              style={currentIsVideo ? { width: `${videoProgress}%` } : { animation: `captee-grow ${IMAGE_DURATION_MS}ms linear forwards` }}
            />
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-6 px-6 py-4">
          <div className="min-w-0">
            <p className="eyebrow">Live slideshow</p>
            <p className="mt-1 truncate text-xl font-semibold">{eventTitle}</p>
          </div>
          {current ? (
            <div className="hidden min-w-0 text-center sm:block">
              <p className="truncate text-lg font-medium">Shared by {current.uploader_name || 'Guest'}</p>
              <p className="text-sm text-zinc-400">
                {deck.index + 1} of {deck.playlist.length}
              </p>
            </div>
          ) : null}
          {guestUrl && current ? (
            <div className="flex shrink-0 items-center gap-3">
              <p className="hidden text-right text-sm text-zinc-300 md:block">
                Scan to add
                <br />
                your photos
              </p>
              <div className="rounded-xl bg-white p-1.5">
                <QRCodeSVG value={guestUrl} size={72} />
              </div>
            </div>
          ) : null}
        </div>
      </footer>
    </main>
  );
}
