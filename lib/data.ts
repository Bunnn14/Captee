import { getSupabaseAdmin } from '@/lib/supabase';
import type { MediaItem } from '@/lib/media';

export type EventRecord = {
  id: string;
  slug: string;
  title: string;
  host_email: string | null;
  start_time: string;
  end_time: string;
};

export type EventStatus = 'upcoming' | 'live' | 'ended';

export async function getEventBySlug(eventSlug: string) {
  const { data, error } = await getSupabaseAdmin().from('events').select('*').eq('slug', eventSlug).single();
  if (error || !data) return null;
  return data as EventRecord;
}

export async function getEventById(eventId: string) {
  const { data, error } = await getSupabaseAdmin().from('events').select('*').eq('id', eventId).single();
  if (error || !data) return null;
  return data as EventRecord;
}

export async function getMedia(eventId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('media')
    .select('id, event_id, file_url, uploader_name, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []) as MediaItem[];
}

export function getEventStatus(event: EventRecord, now = new Date()): EventStatus {
  if (now < new Date(event.start_time)) return 'upcoming';
  if (now > new Date(event.end_time)) return 'ended';
  return 'live';
}

export function formatPhilippineTime(value: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
