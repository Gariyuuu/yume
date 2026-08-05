-- Phase 7 safety system. room_bans/reports/user_blocks/audit_logs/
-- notifications were all created in 0001_init.sql but never given RLS
-- policies — on Supabase that means fully open to anon/authenticated by
-- default, the exact class of bug found and fixed for a different set of
-- tables in 0006_phase4_rls.sql. Closing that gap here.

alter table room_bans enable row level security;

create policy "owner or moderator can view bans in their room"
on room_bans for select
using (room_role(room_id, auth.uid()) in ('owner', 'moderator'));
-- No insert/update/delete policy: bans are only ever written by the
-- moderate-participant Edge Function (service role), same trust boundary
-- as audit_logs below — a ban has to also force-disconnect the target
-- from the live LiveKit room, which a plain RLS insert can't do, so
-- there's no reason to allow one.

alter table reports enable row level security;

create policy "room members can file a report"
on reports for insert
with check (
  reported_by = auth.uid()
  and room_role(room_id, auth.uid()) is not null
);

create policy "reporter or owner/moderator can view a report"
on reports for select
using (
  reported_by = auth.uid()
  or room_role(room_id, auth.uid()) in ('owner', 'moderator')
);

create policy "owner or moderator can resolve a report"
on reports for update
using (room_role(room_id, auth.uid()) in ('owner', 'moderator'))
with check (room_role(room_id, auth.uid()) in ('owner', 'moderator'));

alter table user_blocks enable row level security;

-- Blocking is a personal preference, not a room-moderation power — any
-- authenticated user can block/unblock any other user, scoped to their
-- own row.
create policy "user can view their own blocks"
on user_blocks for select
using (blocker_id = auth.uid());

create policy "user can block someone"
on user_blocks for insert
with check (blocker_id = auth.uid() and blocked_id <> auth.uid());

create policy "user can unblock someone"
on user_blocks for delete
using (blocker_id = auth.uid());

-- audit_logs.target_id was left as a bare uuid in 0001_init.sql (no FK),
-- but every action that writes one today (mute/kick/ban_participant in
-- moderate-participant) always targets a profile — adding the constraint
-- so the moderation-log UI can embed a display name via PostgREST's
-- `profiles!audit_logs_target_id_fkey(display_name)` join syntax.
alter table audit_logs add constraint audit_logs_target_id_fkey foreign key (target_id) references profiles(id) on delete set null;

alter table audit_logs enable row level security;

create policy "owner or moderator can read their room's audit log"
on audit_logs for select
using (room_role(room_id, auth.uid()) in ('owner', 'moderator'));
-- No insert/update/delete policy: only Edge Functions (service role)
-- write audit log rows, per docs/phase-1/04-security-rls.md §5 — a
-- client-writable audit log isn't trustworthy as one.

alter table notifications enable row level security;

create policy "user can view their own notifications"
on notifications for select
using (profile_id = auth.uid());

create policy "user can mark their own notifications read"
on notifications for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());
-- No insert policy for clients: nothing in this phase produces
-- notifications yet (no UI reads this table either) — RLS is closed by
-- default rather than left open until a producer exists. Tracked as a
-- known gap, not faked.

-- Rate limiting (docs/phase-1/04-security-rls.md §8: "a simple
-- per-auth.uid() sliding-window counter in Postgres"). One shared table
-- and RPC, reused by: the join-room Edge Function (direct call), and
-- BEFORE INSERT triggers below for the tables guests/members write to
-- directly over PostgREST (room_messages, room_invites, reports) where
-- there's no Edge Function in the path to gate at.
create table if not exists rate_limit_counters (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);

alter table rate_limit_counters enable row level security;
-- No client policies at all: only the security-definer function below
-- (and the service-role Edge Function client) ever touch this table.

create or replace function check_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into rate_limit_counters (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set window_start = case
          when rate_limit_counters.window_start < now() - make_interval(secs => p_window_seconds)
          then now()
          else rate_limit_counters.window_start
        end,
        count = case
          when rate_limit_counters.window_start < now() - make_interval(secs => p_window_seconds)
          then 1
          else rate_limit_counters.count + 1
        end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

-- Message send rate limit, scoped to guests only per the checklist's
-- explicit "rate limits on ... message send from guests" — members are
-- trusted room participants and aren't limited here. Applied as a
-- trigger rather than an Edge Function because messages are sent via a
-- direct PostgREST insert under the Tier-2 sync design (Phase 1), not
-- through a server endpoint.
create or replace function enforce_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role room_role;
begin
  v_role := room_role(new.room_id, new.author_id);

  if v_role = 'guest' and not check_rate_limit('msg:' || new.author_id::text, 20, 60) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger room_messages_rate_limit
before insert on room_messages
for each row execute function enforce_message_rate_limit();

-- Invite creation rate limit — also a direct PostgREST insert (owner/
-- moderator via the 0002_rls.sql "manage invites" policy), no Edge
-- Function in the path.
create or replace function enforce_invite_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not check_rate_limit('invite:' || new.created_by::text, 10, 3600) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger room_invites_rate_limit
before insert on room_invites
for each row execute function enforce_invite_rate_limit();

-- Report submission rate limit — same reasoning.
create or replace function enforce_report_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not check_rate_limit('report:' || new.reported_by::text, 5, 3600) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger reports_rate_limit
before insert on reports
for each row execute function enforce_report_rate_limit();
