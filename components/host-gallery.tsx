'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageOff, Trash2 } from 'lucide-react';
import type { MediaItem } from '@/lib/media';
import { useLiveMedia } from '@/lib/use-live-media';
import MediaTile from '@/components/media-tile';
import MediaLightbox from '@/components/media-lightbox';
import ConfirmDialog from '@/components/confirm-dialog';

type HostGalleryProps = {
  eventSlug: string;
  hostKey: string;
  initialMedia: MediaItem[];
};

export default function HostGallery({ eventSlug, hostKey, initialMedia }: HostGalleryProps) {
  const router = useRouter();
  const { media, removeLocal } = useLiveMedia(eventSlug, initialMedia);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const viewingIndex = viewingId ? media.findIndex((item) => item.id === viewingId) : -1;
  const closeViewer = useCallback(() => setViewingId(null), []);
  const showIndex = useCallback((index: number) => setViewingId(media[index]?.id ?? null), [media]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/media/${pendingDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostKey }),
      });
      if (!response.ok && response.status !== 404) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Could not delete this item.');
      }
      removeLocal(pendingDelete.id);
      if (viewingId === pendingDelete.id) setViewingId(null);
      setPendingDelete(null);
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete this item.');
    } finally {
      setDeleting(false);
    }
  }

  const deleteButton = (item: MediaItem, large = false) => (
    <button
      type="button"
      className={large ? 'btn-secondary py-2 text-rose-300' : 'icon-btn text-rose-300 hover:text-rose-200'}
      onClick={() => {
        setDeleteError(null);
        setPendingDelete(item);
      }}
      aria-label="Delete"
      title="Delete"
    >
      <Trash2 size={16} />
      {large ? 'Delete' : null}
    </button>
  );

  return (
    <section className="card p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Live media</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Auto-updating
          </span>
        </div>
        <p className="text-sm text-zinc-500">{media.length} item(s)</p>
      </div>

      {media.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {media.map((item) => (
            <MediaTile key={item.id} item={item} onOpen={() => setViewingId(item.id)} actions={deleteButton(item)} />
          ))}
        </div>
      ) : (
        <div className="card-inset flex flex-col items-center gap-2 px-6 py-14 text-center text-zinc-400">
          <ImageOff size={28} className="text-zinc-600" />
          <p className="font-medium text-zinc-300">No uploads yet</p>
          <p className="text-sm">New photos and videos will appear here automatically.</p>
        </div>
      )}

      {viewingIndex !== -1 ? (
        <MediaLightbox items={media} index={viewingIndex} onIndexChange={showIndex} onClose={closeViewer} actions={(item) => deleteButton(item, true)} />
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this upload?"
        description={`Uploaded by ${pendingDelete?.uploader_name || 'Guest'}. It will be removed from the gallery, the slideshow and storage. This can't be undone.`}
        confirmLabel="Delete"
        tone="danger"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      >
        {deleteError ? <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-200">{deleteError}</p> : null}
      </ConfirmDialog>
    </section>
  );
}
