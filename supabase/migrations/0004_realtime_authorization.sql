-- Gates Realtime Broadcast/Presence channels by room membership, using
-- Supabase's Realtime Authorization feature (private channels + RLS on
-- realtime.messages). Added in Phase 3 for the presence channel
-- (room:{roomId}:presence, see docs/phase-1/05-sync-protocol.md §2), but
-- written generically off realtime.topic() so it also covers every future
-- room:{roomId}:* broadcast channel from that same doc (Tier-1 drag/draw
-- events in Phase 4, media sync in Phase 5, game moves in Phase 6) without
-- another migration — all of them follow the same `room:{roomId}:...`
-- topic convention.
--
-- Without this, any client that discovers a room's UUID could subscribe
-- to that room's presence/broadcast channel even without a
-- room_memberships row, since plain (non-private) Realtime channels are
-- not RLS-gated. Every client-side channel() call for a room:* topic must
-- pass `{ config: { private: true } }` for this to take effect.

create policy "room members can receive room realtime messages"
on realtime.messages for select
to authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and realtime.topic() like 'room:%'
  and room_role(split_part(realtime.topic(), ':', 2)::uuid, auth.uid()) is not null
);

create policy "room members can send room realtime messages"
on realtime.messages for insert
to authenticated
with check (
  realtime.messages.extension in ('broadcast', 'presence')
  and realtime.topic() like 'room:%'
  and room_role(split_part(realtime.topic(), ':', 2)::uuid, auth.uid()) is not null
);
