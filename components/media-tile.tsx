'use client';

import { Play } from 'lucide-react';
import { isVideo, type MediaItem } from '@/lib/media';

type MediaTileProps = {
  item: MediaItem;
  onOpen: () => void;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
};

export default function MediaTile({ item, onOpen, badge, actions }: MediaTileProps) {
  const video = isVideo(item.file_url);

  return (
    <article className="group relative animate-fade-in overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900/60">
      <button type="button" onClick={onOpen} className="relative block aspect-square w-full overflow-hidden bg-black/40" aria-label="View full size">
        {video ? (
          // `#t=0.1` makes mobile browsers render the first frame as a poster.
          <video className="h-full w-full object-cover" src={`${item.file_url}#t=0.1`} preload="metadata" muted playsInline />
        ) : (
          <img
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            src={item.file_url}
            alt={`Upload by ${item.uploader_name || 'Guest'}`}
            loading="lazy"
          />
        )}
        {video ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur">
              <Play size={20} className="ml-0.5" fill="currentColor" />
            </span>
          </span>
        ) : null}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
        <span className="absolute bottom-2 left-3 right-3 truncate text-left text-xs font-medium text-white/90">{item.uploader_name || 'Guest'}</span>
      </button>
      {badge ? <div className="pointer-events-none absolute left-2 top-2">{badge}</div> : null}
      {actions ? <div className="absolute right-2 top-2 flex gap-1.5">{actions}</div> : null}
    </article>
  );
}
