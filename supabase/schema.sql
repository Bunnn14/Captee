create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  host_email text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  file_url text not null,
  uploader_name text,
  created_at timestamptz default now()
);

alter table public.events enable row level security;
alter table public.media enable row level security;

create policy "Allow public reads for events" on public.events
for select using (true);

create policy "Allow public reads for media" on public.media
for select using (true);

create policy "Allow public inserts for media" on public.media
for insert with check (true);

create policy "Allow public inserts for events" on public.events
for insert with check (true);

create policy "Allow public updates for media" on public.media
for update using (true) with check (true);

create policy "Allow public updates for events" on public.events
for update using (true) with check (true);

create policy "Allow public deletes for media" on public.media
for delete using (true);

create policy "Allow public deletes for events" on public.events
for delete using (true);

create policy "Public read access" on storage.objects
for select using (bucket_id = 'media');

create policy "Public upload access" on storage.objects
for insert with check (bucket_id = 'media');

create policy "Public update access" on storage.objects
for update using (bucket_id = 'media');

create policy "Public delete access" on storage.objects
for delete using (bucket_id = 'media');

create or replace function public.cleanup_expired_media()
returns void
language plpgsql
as $$
declare
  event_row record;
  cutoff timestamptz;
  media_rows record;
  file_path text;
begin
  for event_row in select id, end_time from public.events loop
    cutoff := event_row.end_time + interval '10 days';
    if now() < cutoff then
      continue;
    end if;

    for media_rows in select file_url from public.media where event_id = event_row.id loop
      file_path := regexp_replace(media_rows.file_url, '^.*/', '');
      perform storage.delete_file(file_path, 'media');
    end loop;

    delete from public.media where event_id = event_row.id;
  end loop;
end;
$$;

create extension if not exists pg_cron;
select cron.schedule('cleanup-expired-media-daily', '0 3 * * *', $$select public.cleanup_expired_media();$$);
