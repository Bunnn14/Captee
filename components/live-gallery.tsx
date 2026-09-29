'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ImageOff, Trash2 } from 'lucide-react';
import type { MediaItem } from '@/lib/media';
import { useLiveMedia } from '@/lib/use-live-media';
import { getOwnedUploads, OWNED_UPLOADS_EVENT, removeOwnedUpload } from '@/lib/guest-uploads';
import MediaTile from '@/components/media-tile';
import MediaLightbox from '@/components/media-lightbox';
import ConfirmDialog from '@/components/confirm-dialog';

type LiveGalleryProps = {
  eventId: string;
  eventSlug: string;
  initialMedia: MediaItem[];
};

export default function LiveGallery({ eventId, eventSlug, initialMedia }: LiveGalleryProps) {
  const { media, removeLocal } = useLiveMedia(eventSlug, initialMedia);
  const [owned, setOwned] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<MediaItem | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    setOwned(getOwnedUploads(eventId));
    const onChange = () => setOwned(getOwnedUploads(eventId));
    window.addEventListener(OWNED_UPLOADS_EVENT, onChange);
    return () => window.removeEventListener(OWNED_UPLOADS_EVENT, onChange);
  }, [eventId]);

  const mine = useMemo(() => media.filter((item) => owned[item.id]), [media, owned]);
  const visible = filter === 'mine' ? mine : media;
  const viewingIndex = viewingId ? visible.findIndex((item) => item.id === viewingId) : -1;

  useEffect(() => {
    if (filter === 'mine' && mine.length === 0) setFilter('all');
  }, [filter, mine.length]);

  const closeViewer = useCallback(() => setViewingId(null), []);
  const showIndex = useCallback((index: number) => setViewingId(visible[index]?.id ?? null), [visible]);

  async function confirmRemoval() {
    if (!pendingRemoval) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      const response = await fetch(`/api/media/${pendingRemoval.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: owned[pendingRemoval.id] }),
      });
      if (!response.ok && response.status !== 404) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Could not remove this upload.');
      }
      removeOwnedUpload(eventId, pendingRemoval.id);
      removeLocal(pendingRemoval.id);
      if (viewingId === pendingRemoval.id) setViewingId(null);
      setPendingRemoval(null);
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : 'Could not remove this upload.');
    } finally {
      setRemoving(false);
    }
  }

  const removeButton = (item: MediaItem, large = false) =>
    owned[item.id] ? (
      <button
        type="button"
        className={large ? 'btn-secondary py-2 text-rose-300' : 'icon-btn text-rose-300 hover:text-rose-200'}
        onClick={() => {
          setRemoveError(null);
          setPendingRemoval(item);
        }}
        aria-label="Remove my upload"
        title="Remove my upload"
      >
        <Trash2 size={16} />
        {large ? 'Remove' : null}
      </button>
    ) : null;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Live gallery</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live
          </span>
        </div>
        {mine.length ? (
          <div className="inline-flex rounded-full border border-white/10 bg-black/30 p-1 text-sm">
            {(['all', 'mine'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full px-3 py-1 transition ${filter === value ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                {value === 'all' ? `All (${media.length})` : `Your uploads (${mine.length})`}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">{media.length} item(s)</p>
        )}
      </div>

      {visible.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((item) => (
            <MediaTile
              key={item.id}
              item={item}
              onOpen={() => setViewingId(item.id)}
              badge={owned[item.id] ? <span className="rounded-full bg-violet-500/90 px-2 py-0.5 text-[11px] font-medium text-white">You</span> : null}
              actions={removeButton(item)}
            />
          ))}
        </div>
      ) : (
        <div className="card-inset flex flex-col items-center gap-2 px-6 py-14 text-center text-zinc-400">
          <ImageOff size={28} className="text-zinc-600" />
          <p className="font-medium text-zinc-300">No uploads yet</p>
          <p className="text-sm">Photos and videos appear here the moment guests share them.</p>
        </div>
      )}

      {viewingIndex !== -1 ? (
        <MediaLightbox items={visible} index={viewingIndex} onIndexChange={showIndex} onClose={closeViewer} actions={(item) => removeButton(item, true)} />
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingRemoval)}
        title="Remove this upload?"
        description="It will be deleted from the live gallery and the venue slideshow. This can't be undone."
        confirmLabel="Remove"
        tone="danger"
        busy={removing}
        onConfirm={confirmRemoval}
        onCancel={() => setPendingRemoval(null)}
      >
        {removeError ? <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-200">{removeError}</p> : null}
      </ConfirmDialog>
    </div>
  );
}
