-- Restoring a room_versions snapshot means delete-all-objects-then-
-- reinsert-the-snapshot, which the client can't do atomically over
-- plain PostgREST calls (no multi-statement transactions). Wrapping it
-- in a single function gives that atomicity for free, while staying
-- `security invoker` so it's still subject to the same RLS the caller
-- would get doing this by hand — restoring is only actually possible for
-- an owner/moderator, because the room_objects DELETE policy
-- (0002_rls.sql) only allows deleting other members' objects for those
-- roles.
create or replace function restore_room_version(p_room_id uuid, p_version_id uuid)
returns void
language plpgsql security invoker
set search_path = public
as $$
declare
  v_snapshot jsonb;
begin
  select snapshot into v_snapshot
  from room_versions
  where id = p_version_id and room_id = p_room_id;

  if v_snapshot is null then
    raise exception 'version not found';
  end if;

  delete from room_objects where room_id = p_room_id;

  insert into room_objects (
    id, room_id, type, asset_url, x, y, width, height, rotation, z_index,
    locked, owner_id, interaction_permissions, data, updated_by
  )
  select
    (obj->>'id')::uuid,
    p_room_id,
    (obj->>'type')::room_object_type,
    obj->>'asset_url',
    (obj->>'x')::double precision,
    (obj->>'y')::double precision,
    (obj->>'width')::double precision,
    (obj->>'height')::double precision,
    (obj->>'rotation')::double precision,
    (obj->>'z_index')::int,
    (obj->>'locked')::boolean,
    (obj->>'owner_id')::uuid,
    coalesce(obj->'interaction_permissions', '{"move": "member", "edit": "owner", "delete": "owner"}'),
    obj->'data',
    auth.uid()
  from jsonb_array_elements(v_snapshot) as obj;
end;
$$;
