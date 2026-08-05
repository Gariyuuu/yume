-- RLS for the tables Phase 4 starts touching (room_versions, room_assets,
-- asset_licenses, room_notes, room_drawings). None of these had RLS
-- enabled before now — on Supabase, a table with RLS *disabled* is fully
-- open to the anon/authenticated roles (they hold table-level grants by
-- default), so these were unintentionally world-readable/writable since
-- Phase 1's schema migration. Closing that now, same pattern as
-- 0002_rls.sql/0003_room_creation.sql.

alter table room_versions enable row level security;

create policy "room members can read versions"
on room_versions for select
using (room_role(room_id, auth.uid()) is not null);

create policy "room members can create a version snapshot"
on room_versions for insert
with check (room_role(room_id, auth.uid()) is not null);

-- asset_licenses and room_assets are a shared, global catalog (not
-- room-scoped) — readable by anyone signed in, written only by the
-- service role during asset import (see ASSET_LICENSES.md), never by
-- room members directly.
alter table asset_licenses enable row level security;

create policy "authenticated users can read asset licenses"
on asset_licenses for select
to authenticated
using (true);

alter table room_assets enable row level security;

create policy "authenticated users can read active assets"
on room_assets for select
to authenticated
using (is_active);

alter table room_notes enable row level security;

create policy "room members can read notes"
on room_notes for select
using (room_role(room_id, auth.uid()) is not null);

create policy "room members can create notes"
on room_notes for insert
with check (room_role(room_id, auth.uid()) is not null);

create policy "owner-mode notes editable by their owner, shared notes by any member"
on room_notes for update
using (
  case
    when edit_mode = 'everyone' then room_role(room_id, auth.uid()) is not null
    else owner_id = auth.uid() or room_role(room_id, auth.uid()) in ('owner', 'moderator')
  end
);

create policy "note owner or moderator can delete"
on room_notes for delete
using (owner_id = auth.uid() or room_role(room_id, auth.uid()) in ('owner', 'moderator'));

alter table room_drawings enable row level security;

create policy "room members can read drawings"
on room_drawings for select
using (room_role(room_id, auth.uid()) is not null);

create policy "room members can create the room's drawing layer"
on room_drawings for insert
with check (room_role(room_id, auth.uid()) is not null);

create policy "room members can update drawings unless layer is locked"
on room_drawings for update
using (
  room_role(room_id, auth.uid()) is not null
  and (layer_locked = false or room_role(room_id, auth.uid()) in ('owner', 'moderator'))
);
