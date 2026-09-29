'use client';

// Remembers which media this browser uploaded (and the token needed to remove it).
type OwnedUploads = Record<string, string>;

export const OWNED_UPLOADS_EVENT = 'captee:owned-uploads-changed';
export const MEDIA_ADDED_EVENT = 'captee:media-added';
export const MEDIA_REMOVED_EVENT = 'captee:media-removed';

const memory: Record<string, OwnedUploads> = {};

function storageKey(eventId: string) {
  return `captee:uploads:${eventId}`;
}

export function getOwnedUploads(eventId: string): OwnedUploads {
  try {
    const raw = window.localStorage.getItem(storageKey(eventId));
    return raw ? (JSON.parse(raw) as OwnedUploads) : memory[eventId] || {};
  } catch {
    return memory[eventId] || {};
  }
}

function saveOwnedUploads(eventId: string, uploads: OwnedUploads) {
  memory[eventId] = uploads;
  try {
    window.localStorage.setItem(storageKey(eventId), JSON.stringify(uploads));
  } catch {
    // Storage can be unavailable (private mode); ownership then lasts only for this page view.
  }
  window.dispatchEvent(new CustomEvent(OWNED_UPLOADS_EVENT, { detail: { eventId, uploads } }));
}

export function addOwnedUpload(eventId: string, mediaId: string, token: string) {
  saveOwnedUploads(eventId, { ...getOwnedUploads(eventId), [mediaId]: token });
}

export function removeOwnedUpload(eventId: string, mediaId: string) {
  const uploads = { ...getOwnedUploads(eventId) };
  delete uploads[mediaId];
  saveOwnedUploads(eventId, uploads);
}
