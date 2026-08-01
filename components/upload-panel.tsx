'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle2, LoaderCircle, UploadCloud } from 'lucide-react';
import { hasSupabaseConfig } from '@/lib/supabase';

type UploadPanelProps = {
  eventId: string;
  eventSlug: string;
  status: 'upcoming' | 'ended' | 'live';
};

export default function UploadPanel({ eventId, eventSlug, status }: UploadPanelProps) {
  const [uploaderName, setUploaderName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canUpload = status === 'live' && !uploading && hasSupabaseConfig;

  const selectedLabel = useMemo(() => {
    if (!files.length) return 'No files selected';
    if (files.length === 1) return files[0].name;
    return `${files.length} files selected`;
  }, [files]);

  async function handleUpload() {
    if (!files.length || !canUpload) return;

    setUploading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
    );

    try {
      for (const file of files) {
        const id = `${file.name}-${file.size}-${file.lastModified}`;
        setProgress((current) => ({ ...current, [id]: 0 }));

        const fileName = `${eventId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        setProgress((current) => ({ ...current, [id]: 25 }));
        const { error: uploadError } = await supabase.storage.from('media').upload(fileName, file, {
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        });

        setProgress((current) => ({ ...current, [id]: 70 }));

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { data: publicData } = supabase.storage.from('media').getPublicUrl(fileName);
        const { error: insertError } = await supabase.from('media').insert({
          event_id: eventId,
          file_url: publicData.publicUrl,
          uploader_name: uploaderName || 'Guest',
        });

        if (insertError) {
          throw new Error(insertError.message);
        }

        setProgress((current) => ({ ...current, [id]: 100 }));
      }

      setMessage('Upload complete. Your photos and videos are now live in the gallery.');
      setFiles([]);
      window.setTimeout(() => window.location.reload(), 1100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-300">Your name (optional)</span>
          <input
            value={uploaderName}
            onChange={(event) => setUploaderName(event.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 outline-none ring-0"
            placeholder="Alex"
          />
        </label>

        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-slate-300">Upload photos or videos</span>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            className="w-full rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 px-4 py-6"
          />
        </label>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-400">
          <p>{selectedLabel}</p>
          <div className="mt-3 space-y-2">
            {files.map((file) => {
              const id = `${file.name}-${file.size}-${file.lastModified}`;
              const percent = progress[id] ?? 0;
              return (
                <div key={id}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                    <span>{file.name}</span>
                    <span>{Math.round(percent)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-cyan-500 transition-all" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {message ? (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-200">
          <CheckCircle2 size={16} /> {message}
        </div>
      ) : null}

      {error ? <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div> : null}

      {!hasSupabaseConfig ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
          Supabase is not configured yet. Add your project URL and anon key to enable real uploads.
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleUpload}
        disabled={!canUpload || !files.length}
        className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {uploading ? <LoaderCircle size={18} className="animate-spin" /> : <UploadCloud size={18} />}
        {uploading ? 'Uploading…' : 'Upload Photos & Videos'}
      </button>

      <p className="text-sm text-slate-400">
        Files are uploaded into a public Supabase Storage bucket and appear instantly in the live gallery.
      </p>
    </div>
  );
}
