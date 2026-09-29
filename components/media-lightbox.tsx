'use client';

import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { isVideo, type MediaItem } from '@/lib/media';

type MediaLightboxProps = {
  items: MediaItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  actions?: (item: MediaItem) => React.ReactNode;
};

export default function MediaLightbox({ items, index, onIndexChange, onClose, actions }: MediaLightboxProps) {
  const item = items[index];
  const hasMany = items.length > 1;
  const next = () => onIndexChange((index + 1) % items.length);
  const previous = () => onIndexChange((index - 1 + items.length) % items.length);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight' && hasMany) onIndexChange((index + 1) % items.length);
      if (event.key === 'ArrowLeft' && hasMany) onIndexChange((index - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, items.length, hasMany, onClose, onIndexChange]);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-40 flex animate-fade-in flex-col bg-black/95 backdrop-blur" role="dialog" aria-modal="true" aria-label="Media viewer">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{item.uploader_name || 'Guest'}</p>
          <p className="text-xs text-zinc-400">
            {new Date(item.created_at).toLocaleString()} · {index + 1} of {items.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {actions?.(item)}
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
        {isVideo(item.file_url) ? (
          <video key={item.id} className="max-h-full max-w-full rounded-2xl" src={item.file_url} controls autoPlay playsInline />
        ) : (
          <img
            key={item.id}
            className="max-h-full max-w-full animate-fade-in rounded-2xl object-contain"
            src={item.file_url}
            alt={`Upload by ${item.uploader_name || 'Guest'}`}
          />
        )}

        {hasMany ? (
          <>
            <button type="button" className="icon-btn absolute left-4 top-1/2 h-11 w-11 -translate-y-1/2" onClick={previous} aria-label="Previous">
              <ChevronLeft size={22} />
            </button>
            <button type="button" className="icon-btn absolute right-4 top-1/2 h-11 w-11 -translate-y-1/2" onClick={next} aria-label="Next">
              <ChevronRight size={22} />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
