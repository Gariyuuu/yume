-- Not in the original Phase 1 schema — added for study-mode session
-- duration / streak stats (docs/phase-1/01-prd.md's study mode
-- requirements), which the Phase 1 data model doc flagged as a
-- reasonable later addition rather than guessing the shape upfront.
-- One row per completed Pomodoro work interval; room_id is nullable so a
-- streak still counts if the room is later deleted.
create table if not exists study_focus_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  room_id uuid references rooms(id) on delete set null,
  minutes int not null,
  completed_at timestamptz not null default now()
);

create index if not exists study_focus_logs_profile_idx on study_focus_logs(profile_id, completed_at);

alter table study_focus_logs enable row level security;

create policy "user can read their own focus logs"
on study_focus_logs for select
using (profile_id = auth.uid());

create policy "user can log their own focus sessions"
on study_focus_logs for insert
with check (profile_id = auth.uid());
