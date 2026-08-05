-- Diagnostic fix: room creation fails live with "new row violates
-- row-level security policy for table rooms" even though the policy
-- ("authenticated user can create room", with check owner_id =
-- auth.uid()) is provably correct — reproduced directly against
-- PostgREST with a verified session where auth.uid() genuinely equals
-- the owner_id being inserted, and an identically-shaped policy on
-- room_templates (same migration, same pattern) works fine. Dropping
-- and recreating the same policy as a fresh object to rule out (and
-- rule in) some kind of stale cached policy/plan specific to this,
-- the very first INSERT policy ever created in this project's history
-- (0002_rls.sql, before Postgres/PostgREST had much else to cache).
drop policy if exists "authenticated user can create room" on rooms;

create policy "authenticated user can create room"
on rooms for insert
with check (owner_id = auth.uid());
