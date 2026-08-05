-- Fix for a real bug only reproducible against a live database: creating
-- a room fails with "new row violates row-level security policy for
-- table rooms" even though the INSERT policy's WITH CHECK is provably
-- satisfied (owner_id = auth.uid()). Root cause: Postgres additionally
-- enforces the table's SELECT policy on any row an INSERT/UPDATE
-- RETURNING clause tries to return (PostgREST's `Prefer:
-- return=representation`, which supabase-js sends whenever `.select()`
-- follows `.insert()`, triggers exactly this). The existing SELECT
-- policy ("members can read their rooms") requires a matching
-- room_memberships row — which the AFTER INSERT trigger
-- (handle_new_room, 0003_room_creation.sql) creates, but that row isn't
-- visible to this same statement's RETURNING-visibility check.
--
-- The actual fix: a room's owner should always be able to see their own
-- room regardless of membership-row timing — this is a correctness fix,
-- not a security loosening (the owner can already update/delete via the
-- existing owner_id = auth.uid() policies, which is strictly more
-- privilege than read).
drop policy if exists "members can read their rooms" on rooms;

create policy "members can read their rooms"
on rooms for select
using (
  owner_id = auth.uid()
  or exists (
    select 1 from room_memberships m
    where m.room_id = rooms.id and m.profile_id = auth.uid()
  )
);
