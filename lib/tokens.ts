import { createHmac, timingSafeEqual } from 'crypto';

function secret() {
  return process.env.MEDIA_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'captee-dev-secret';
}

function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

/** Returned to the guest who uploaded a file so they (and only they) can remove it later. */
export function guestDeleteToken(mediaId: string) {
  return sign(`guest:${mediaId}`);
}

/** Rendered into the host dashboard so the host can remove any media for their event. */
export function hostKey(eventId: string) {
  return sign(`host:${eventId}`);
}

export function tokensMatch(expected: string, provided: unknown) {
  if (typeof provided !== 'string') return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}
