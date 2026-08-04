-- Fixes a chicken-and-egg gap found while implementing Phase 2 room
-- creation: the room_memberships insert policy in 0002_rls.sql only lets
-- an existing owner/moderator add members, so nothing could ever insert
-- the *first* (owner) membership row for a brand new room. A
-- security-definer trigger creates it automatically, which also means
-- clients never need insert access to room_memberships for their own
-- owner row.
--
-- Also finishes room_templates RLS, left without policies in 0002_rls.sql.

create or replace function handle_new_room()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into room_memberships (room_id, profile_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_room_created
  after insert on rooms
  for each row execute function handle_new_room();

alter table room_templates enable row level security;

create policy "authenticated users can read templates"
on room_templates for select
using (auth.role() = 'authenticated');

create policy "authenticated users can create their own templates"
on room_templates for insert
with check (created_by = auth.uid());

create policy "creator can update their own custom templates"
on room_templates for update
using (created_by = auth.uid() and is_system_template = false);
