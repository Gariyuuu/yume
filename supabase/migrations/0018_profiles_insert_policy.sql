-- profiles had a select policy and an update policy (0002_rls.sql) but no
-- insert policy — RLS defaults to deny, so nothing could ever create a
-- profiles row. Every first-login profile bootstrap (apps/web's
-- requireProfile(), apps/mobile's ensureProfile()) failed with
-- "new row violates row-level security policy for table profiles" the
-- moment this ran against a real database for the first time. Same
-- self-row pattern as the existing update policy.
create policy "user can create own profile"
on profiles for insert
with check (id = auth.uid());
