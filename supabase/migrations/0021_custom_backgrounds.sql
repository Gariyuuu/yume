-- Lets a user upload their own page background image (Settings ->
-- Appearance), applied in place of the default nebula SVG — see
-- components/starfield.tsx. Public bucket (like avatars) since it's
-- rendered as a plain CSS background-image URL, same reasoning as
-- 0011_storage_buckets.sql's avatars bucket.
alter table profiles add column if not exists background_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-backgrounds', 'user-backgrounds', true, 8388608, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "anyone authenticated can read user backgrounds"
on storage.objects for select
to authenticated
using (bucket_id = 'user-backgrounds');

create policy "user can manage their own background"
on storage.objects for all
to authenticated
using (bucket_id = 'user-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'user-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);
