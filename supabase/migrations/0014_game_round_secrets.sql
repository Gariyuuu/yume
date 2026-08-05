-- Draw & Guess needs one player (the drawer) to know a secret the others
-- must not see, for as long as the round is active. game_sessions.state
-- is readable by every room member via RLS (0013_games_rls.sql), so
-- anything in it is visible to guessers too — there's no per-row,
-- per-reader visibility in Postgres RLS, only per-row. The fix is to
-- never put the secret in a client-readable row at all: this table has
-- RLS enabled with zero policies for anon/authenticated, so only the
-- service-role client (apps/web/src/lib/supabase/service-role.ts) can
-- ever read or write it. Trivia doesn't need this — every player answers
-- the same question at the same time, so the correct answer just stays
-- out of `state` until the reveal phase, which every player sees at once.
create table if not exists game_round_secrets (
  session_id uuid primary key references game_sessions(id) on delete cascade,
  secret jsonb not null,
  updated_at timestamptz not null default now()
);

alter table game_round_secrets enable row level security;
