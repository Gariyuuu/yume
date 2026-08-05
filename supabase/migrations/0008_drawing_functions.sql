-- One drawing layer per room (the schema allowed multiple room_drawings
-- rows per room_id, but layer_locked and the strokes array only make
-- sense as a single per-room concept) — enforced here so the upsert
-- pattern below is well-defined.
alter table room_drawings add constraint room_drawings_room_id_key unique (room_id);

-- Appending a finished stroke needs to be atomic (read-modify-write from
-- the client risks two people finishing strokes at the same instant and
-- one clobbering the other's jsonb array write) — same reasoning as
-- restore_room_version in 0007. security invoker so the existing RLS on
-- room_drawings (0006_phase4_rls.sql) still applies: a locked layer can
-- only be appended to by an owner/moderator.
create or replace function append_drawing_stroke(p_room_id uuid, p_stroke jsonb)
returns void
language plpgsql security invoker
set search_path = public
as $$
begin
  insert into room_drawings (room_id, strokes)
  values (p_room_id, jsonb_build_array(p_stroke))
  on conflict (room_id) do update
    set strokes = room_drawings.strokes || p_stroke,
        updated_at = now();
end;
$$;

create or replace function clear_drawing_layer(p_room_id uuid)
returns void
language plpgsql security invoker
set search_path = public
as $$
begin
  update room_drawings set strokes = '[]'::jsonb, updated_at = now()
  where room_id = p_room_id;
end;
$$;
