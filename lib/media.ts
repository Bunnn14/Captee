export type MediaItem = {
  id: string;
  event_id?: string;
  file_url: string;
  uploader_name: string | null;
  created_at: string;
};

const VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|webm|ogv|ogg|3gp|mkv|avi)$/i;

function urlPath(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split('?')[0];
  }
}

export function isVideo(url: string) {
  return VIDEO_EXTENSIONS.test(urlPath(url || ''));
}

export function fileExtension(url: string) {
  const match = urlPath(url).match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : isVideo(url) ? 'mp4' : 'jpg';
}

/** Path of the object inside the `media` bucket, e.g. `<eventId>/<file>`. */
export function storagePathFromUrl(url: string) {
  const marker = '/object/public/media/';
  const index = url.indexOf(marker);
  if (index !== -1) return decodeURIComponent(url.slice(index + marker.length).split('?')[0]);
  return url.split('/').slice(-2).join('/');
}

export function sortNewestFirst(items: MediaItem[]) {
  return [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
