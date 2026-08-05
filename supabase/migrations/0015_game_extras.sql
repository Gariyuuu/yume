alter table game_players add constraint game_players_session_profile_key unique (session_id, profile_id);

create policy "player can leave a game"
on game_players for delete
using (profile_id = auth.uid());

-- Atomic score increment for the move-dispatch Server Action (see
-- apps/web/src/app/room/[roomId]/games/actions.ts) — a plain
-- read-then-write from application code risks two concurrent scoring
-- moves (e.g. two Draw & Guess players guessing right at nearly the same
-- moment) clobbering each other. Called only via the service-role client,
-- same trust boundary as the rest of 0013_games_rls.sql.
create or replace function increment_game_score(p_session_id uuid, p_profile_id uuid, p_delta int)
returns void
language sql security invoker
set search_path = public
as $$
  update game_players
  set score = score + p_delta
  where session_id = p_session_id and profile_id = p_profile_id;
$$;
