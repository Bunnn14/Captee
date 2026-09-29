'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ImagePlus, LoaderCircle, Play, RotateCcw, UploadCloud, X } from 'lucide-react';
import { hasSupabaseConfig, supabaseAnonKey, supabaseUrl } from '@/lib/supabase-config';
import { addOwnedUpload, MEDIA_ADDED_EVENT } from '@/lib/guest-uploads';
import type { MediaItem } from '@/lib/media';
import ConfirmDialog from '@/components/confirm-dialog';

type UploadPanelProps = {
  eventId: string;
  status: 'upcoming' | 'ended' | 'live';
};

type QueueStatus = 'pending' | 'uploading' | 'saving' | 'done' | 'error';

type QueueItem = {
  key: string;
  file: File;
  previewUrl: string;
  isVideo: boolean;
  status: QueueStatus;
  progress: number;
  error?: string;
};

class UploadCancelled extends Error {}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const storageHeaders = { Authorization: `Bearer ${supabaseAnonKey}`, apikey: supabaseAnonKey };

function encodePath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function publicUrl(path: string) {
  return `${supabaseUrl}/storage/v1/object/public/media/${encodePath(path)}`;
}

/** Best-effort cleanup of a file that was stored but never published. */
function removeFromStorage(path: string) {
  return fetch(`${supabaseUrl}/storage/v1/object/media`, {
    method: 'DELETE',
    headers: { ...storageHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [path] }),
  }).catch(() => undefined);
}

/** Uploads straight to Supabase Storage with XHR so we get real progress and can abort. */
function uploadToStorage(path: string, file: File, onProgress: (percent: number) => void) {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<void>((resolve, reject) => {
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/media/${encodePath(path)}`);
    Object.entries(storageHeaders).forEach(([name, value]) => xhr.setRequestHeader(name, value));
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('cache-control', 'max-age=3600');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let message = `Upload failed (${xhr.status})`;
      try {
        message = JSON.parse(xhr.responseText).message || message;
      } catch {}
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error('Network error. Check your connection and try again.'));
    xhr.onabort = () => reject(new UploadCancelled());
    xhr.send(file);
  });
  return { promise, abort: () => xhr.abort() };
}

export default function UploadPanel({ eventId, status }: UploadPanelProps) {
  const [uploaderName, setUploaderName] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const abortCurrent = useRef<(() => void) | null>(null);
  const currentKey = useRef<string | null>(null);
  const cancelled = useRef(new Set<string>());
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const canUpload = status === 'live' && hasSupabaseConfig;
  const pending = queue.filter((item) => item.status === 'pending' || item.status === 'error');
  const photoCount = pending.filter((item) => !item.isVideo).length;
  const videoCount = pending.length - photoCount;

  // Free preview blobs when the panel goes away.
  useEffect(() => () => queueRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl)), []);

  function update(key: string, patch: Partial<QueueItem>) {
    setQueue((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function addFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []).filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));
    if (!files.length) return;
    setMessage(null);
    setQueue((current) => {
      const existing = new Set(current.map((item) => item.key));
      const additions = files
        .map((file) => ({ file, key: `${file.name}-${file.size}-${file.lastModified}` }))
        .filter(({ key }) => !existing.has(key))
        .map<QueueItem>(({ file, key }) => ({
          key,
          file,
          previewUrl: URL.createObjectURL(file),
          isVideo: file.type.startsWith('video/'),
          status: 'pending',
          progress: 0,
        }));
      return [...current, ...additions];
    });
  }

  function removeItem(key: string) {
    setQueue((current) => {
      const item = current.find((entry) => entry.key === key);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return current.filter((entry) => entry.key !== key);
    });
  }

  function cancelItem(key: string) {
    cancelled.current.add(key);
    if (currentKey.current === key) abortCurrent.current?.();
    removeItem(key);
  }

  function cancelAll() {
    queueRef.current.forEach((item) => {
      if (item.status !== 'done') cancelled.current.add(item.key);
    });
    abortCurrent.current?.();
  }

  async function uploadOne(item: QueueItem) {
    const path = `${eventId}/${Date.now()}-${item.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    currentKey.current = item.key;
    update(item.key, { status: 'uploading', progress: 0, error: undefined });

    const upload = uploadToStorage(path, item.file, (percent) => update(item.key, { progress: Math.min(percent, 99) }));
    abortCurrent.current = upload.abort;
    await upload.promise;
    abortCurrent.current = null;

    // Cancelled in the instant between the file landing and it being published: clean up the orphan.
    if (cancelled.current.has(item.key)) {
      await removeFromStorage(path);
      throw new UploadCancelled();
    }

    update(item.key, { status: 'saving', progress: 99 });
    const fileUrl = publicUrl(path);
    const response = await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, fileUrl, uploaderName }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.media) {
      await removeFromStorage(path);
      throw new Error(data?.error || 'Could not save your upload.');
    }

    addOwnedUpload(eventId, data.media.id, data.deleteToken);
    window.dispatchEvent(new CustomEvent<MediaItem>(MEDIA_ADDED_EVENT, { detail: data.media }));
    update(item.key, { status: 'done', progress: 100 });
  }

  async function startUpload() {
    setConfirming(false);
    if (!canUpload || !pending.length) return;

    setUploading(true);
    setMessage(null);
    cancelled.current.clear();
    let uploaded = 0;
    let failed = 0;

    for (const item of pending) {
      if (cancelled.current.has(item.key)) continue;
      try {
        await uploadOne(item);
        uploaded += 1;
      } catch (err) {
        if (err instanceof UploadCancelled || cancelled.current.has(item.key)) {
          update(item.key, { status: 'pending', progress: 0 });
        } else {
          failed += 1;
          update(item.key, { status: 'error', progress: 0, error: err instanceof Error ? err.message : 'Upload failed.' });
        }
      }
    }

    currentKey.current = null;
    abortCurrent.current = null;
    setUploading(false);
    // Finished uploads leave the tray; cancelled and failed ones stay so they can be retried or removed.
    setQueue((current) => {
      current.filter((item) => item.status === 'done').forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return current.filter((item) => item.status !== 'done');
    });

    if (uploaded) {
      setMessage(
        `${uploaded} ${uploaded === 1 ? 'upload is' : 'uploads are'} now live in the gallery. You can remove ${uploaded === 1 ? 'it' : 'them'} from “Your uploads” anytime.` +
          (failed ? ` ${failed} failed — tap retry below.` : ''),
      );
    } else if (cancelled.current.size) {
      setMessage('Upload cancelled. Nothing was shared.');
    }
  }

  const summary = [photoCount ? `${photoCount} photo${photoCount === 1 ? '' : 's'}` : '', videoCount ? `${videoCount} video${videoCount === 1 ? '' : 's'}` : '']
    .filter(Boolean)
    .join(' and ');

  return (
    <div className="mt-6 space-y-4">
      <label className="block text-sm">
        <span className="mb-1.5 block text-zinc-300">Your name (optional)</span>
        <input value={uploaderName} onChange={(event) => setUploaderName(event.target.value)} className="input" placeholder="Alex" maxLength={60} disabled={uploading} />
      </label>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!uploading) addFiles(event.dataTransfer.files);
        }}
        className={`rounded-2xl border border-dashed p-4 transition ${dragging ? 'border-violet-400 bg-violet-500/10' : 'border-white/15 bg-black/30'}`}
      >
        <input
          ref={fileInput}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = '';
          }}
        />

        {queue.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {queue.map((item) => (
              <div key={item.key} className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/50">
                {item.isVideo ? (
                  <video src={item.previewUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                ) : (
                  <img src={item.previewUrl} alt={item.file.name} className="h-full w-full object-cover" />
                )}
                {item.isVideo ? (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white">
                    <Play size={10} fill="currentColor" />
                  </span>
                ) : null}

                {item.status === 'uploading' || item.status === 'saving' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-xs font-medium text-white">
                    {item.status === 'saving' ? <LoaderCircle size={18} className="animate-spin" /> : <span>{Math.round(item.progress)}%</span>}
                    <div className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-white/20">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all" style={{ width: `${item.progress}%` }} />
                    </div>
                  </div>
                ) : null}
                {item.status === 'done' ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-emerald-300">
                    <CheckCircle2 size={22} />
                  </div>
                ) : null}
                {item.status === 'error' ? (
                  <div className="absolute inset-x-0 bottom-0 bg-rose-600/90 px-1.5 py-1 text-[10px] leading-tight text-white" title={item.error}>
                    Failed
                  </div>
                ) : null}

                {item.status !== 'done' && item.status !== 'saving' ? (
                  <button
                    type="button"
                    onClick={() => (item.status === 'uploading' || (uploading && item.status === 'pending') ? cancelItem(item.key) : removeItem(item.key))}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-rose-500"
                    aria-label={item.status === 'uploading' ? `Cancel ${item.file.name}` : `Remove ${item.file.name}`}
                    title={item.status === 'uploading' ? 'Cancel upload' : 'Remove'}
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
            ))}
            {!uploading ? (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/15 text-xs text-zinc-400 transition hover:border-violet-400/60 hover:text-violet-200"
              >
                <ImagePlus size={20} />
                Add more
              </button>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={!canUpload}
            className="flex w-full flex-col items-center gap-2 py-8 text-center disabled:opacity-50"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
              <UploadCloud size={24} />
            </span>
            <span className="font-medium text-zinc-100">Tap to choose photos & videos</span>
            <span className="text-sm text-zinc-500">or drag and drop them here</span>
          </button>
        )}
      </div>

      {message ? (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {message}
        </div>
      ) : null}

      {!hasSupabaseConfig ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
          Supabase is not configured yet. Add your project URL and anon key to enable real uploads.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {uploading ? (
          <>
            <span className="inline-flex items-center gap-2 text-sm text-zinc-300">
              <LoaderCircle size={16} className="animate-spin text-violet-300" /> Uploading…
            </span>
            <button type="button" onClick={cancelAll} className="btn-secondary">
              <X size={16} /> Cancel upload
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setConfirming(true)} disabled={!canUpload || !pending.length} className="btn-primary px-6 py-3">
              {queue.some((item) => item.status === 'error') ? <RotateCcw size={18} /> : <UploadCloud size={18} />}
              {pending.length ? `Upload ${pending.length} ${pending.length === 1 ? 'file' : 'files'}` : 'Upload photos & videos'}
            </button>
            {queue.length ? (
              <button
                type="button"
                onClick={() => {
                  queue.forEach((item) => URL.revokeObjectURL(item.previewUrl));
                  setQueue([]);
                }}
                className="btn-secondary"
              >
                Clear
              </button>
            ) : null}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        title={`Share ${summary}?`}
        description={
          <>
            {pending.length === 1 ? 'It' : 'They'}’ll appear in the live gallery and on the venue slideshow
            {uploaderName.trim() ? (
              <>
                {' '}
                as <span className="text-zinc-200">{uploaderName.trim()}</span>
              </>
            ) : null}
            . You can still cancel while uploading, or remove {pending.length === 1 ? 'it' : 'them'} later.
          </>
        }
        confirmLabel="Yes, upload"
        cancelLabel="Go back"
        onConfirm={startUpload}
        onCancel={() => setConfirming(false)}
      >
        <div className="grid max-h-48 grid-cols-5 gap-1.5 overflow-y-auto">
          {pending.map((item) =>
            item.isVideo ? (
              <video key={item.key} src={item.previewUrl} className="aspect-square w-full rounded-lg object-cover" muted playsInline preload="metadata" />
            ) : (
              <img key={item.key} src={item.previewUrl} alt={item.file.name} className="aspect-square w-full rounded-lg object-cover" />
            ),
          )}
        </div>
        <p className="mt-2 text-xs text-zinc-500">Total {formatSize(pending.reduce((sum, item) => sum + item.file.size, 0))}</p>
      </ConfirmDialog>
    </div>
  );
}
