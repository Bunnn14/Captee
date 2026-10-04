# Captee

Captee is a zero-login, QR-driven event photo and video collection platform.

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a Supabase project and a public bucket named `media`.
3. Copy `.env.example` to `.env.local` and fill in your Supabase credentials.
4. Run the app:
   ```bash
   npm run dev
   ```

## Supabase setup

### 1) Create the database tables

Run the SQL from [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL editor.

### 2) Create the storage bucket

In Supabase Storage:
- Create a public bucket named `media`
- Keep the bucket public so guest-uploaded files can be displayed in the gallery and slideshow
- Optionally set file size limits and allow image/video uploads only

### 3) Add storage policies

Use the following policies in the Supabase SQL editor:

```sql
create policy "Public read access" on storage.objects
for select using (bucket_id = 'media');

create policy "Public upload access" on storage.objects
for insert with check (bucket_id = 'media');

create policy "Public update access" on storage.objects
for update using (bucket_id = 'media');

create policy "Public delete access" on storage.objects
for delete using (bucket_id = 'media');
```


```text
https://your-app.vercel.app/api/cron/cleanup
```

### Vercel Cron example

If you use Vercel Cron, add a route like this to your project configuration:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 3 * * *"
    }
  ]
}
```

## Upload behavior

- Guests can only upload while the event is within the configured start/end window.
- The upload panel shows live progress for each file.
- The live gallery updates as new media is inserted.
