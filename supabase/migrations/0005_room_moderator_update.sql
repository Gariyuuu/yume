-- Phase 3 gap found while wiring the spatial/room-wide audio toggle: the
-- only UPDATE policy on `rooms` was "owner can update room"
-- (0002_rls.sql), so a moderator toggling room-level settings (audio
-- mode today; things like locking the room later) would silently fail
-- RLS even though moderators are meant to share that authority per
-- docs/phase-1/04-security-rls.md §1. Postgres OR's multiple permissive
-- policies together, so this just adds the moderator case rather than
-- replacing the owner one.
create policy "moderator can update room"
on rooms for update
using (room_role(id, auth.uid()) = 'moderator');
