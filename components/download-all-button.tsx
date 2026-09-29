'use client';

import { useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { fileExtension, type MediaItem } from '@/lib/media';

const CONCURRENCY = 4;

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'guest';
}

/**
 * Builds the ZIP in the browser. Server-side zipping hits serverless response-size
 * limits (4.5 MB on Vercel) and timeouts as soon as an event has a few videos.
 */
export default function DownloadAllButton({ eventSlug, eventTitle }: { eventSlug: string; eventTitle: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = status !== null;

  async function download() {
    setError(null);
    setStatus('Preparing…');
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventSlug)}/media`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load the media list.');
      const { media } = (await response.json()) as { media: MediaItem[] };
      if (!media.length) throw new Error('There is nothing to download yet.');

      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const ordered = [...media].reverse();
      let done = 0;
      let failed = 0;
      let next = 0;

      const worker = async () => {
        while (next < ordered.length) {
          const index = next++;
          const item = ordered[index];
          try {
            const fileResponse = await fetch(item.file_url);
            if (!fileResponse.ok) throw new Error();
            const name = `${String(index + 1).padStart(3, '0')}-${safeName(item.uploader_name || 'guest')}.${fileExtension(item.file_url)}`;
            zip.file(name, await fileResponse.blob(), { date: new Date(item.created_at) });
          } catch {
            failed += 1;
          }
          done += 1;
          setStatus(`Downloading ${done}/${ordered.length}…`);
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ordered.length) }, worker));
      if (failed === ordered.length) throw new Error('Could not download any files.');

      const archive = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, (meta) => setStatus(`Zipping ${Math.round(meta.percent)}%…`));
      const url = URL.createObjectURL(archive);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeName(eventTitle)}-captee.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      if (failed) setError(`${failed} file(s) could not be downloaded and were skipped.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setStatus(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={download} disabled={busy} className="btn-primary">
        {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
        {status ?? 'Download all (ZIP)'}
      </button>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
