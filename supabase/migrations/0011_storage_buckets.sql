-- First real Storage usage (chat image uploads) — creates the three
-- buckets from docs/phase-1/04-security-rls.md §6, none of which existed
-- yet since nothing had needed file storage before now.
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('room-assets', 'room-assets', true),
  ('uploads', 'uploads', false)
on conflict (id) do nothing;

create policy "anyone authenticated can read avatars"
on storage.objects for select
to authenticated
using (bucket_id = 'avatars');

create policy "user can manage their own avatar"
on storage.objects for all
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "anyone authenticated can read room assets"
on storage.objects for select
to authenticated
using (bucket_id = 'room-assets');

-- Path convention: uploads/{room_id}/{filename} — matches
-- docs/phase-1/04-security-rls.md §6, so room_role() can be reused
-- directly against the first path segment.
create policy "room members can read their room's uploads"
on storage.objects for select
to authenticated
using (
  bucket_id = 'uploads'
  and room_role((storage.foldername(name))[1]::uuid, auth.uid()) is not null
);

create policy "room members can add uploads to their room"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'uploads'
  and room_role((storage.foldername(name))[1]::uuid, auth.uid()) is not null
);

create policy "uploader or moderator can delete an upload"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'uploads'
  and (
    owner = auth.uid()
    or room_role((storage.foldername(name))[1]::uuid, auth.uid()) in ('owner', 'moderator')
  )
);
