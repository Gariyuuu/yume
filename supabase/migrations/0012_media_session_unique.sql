-- One media session per room per provider (YouTube session and Spotify
-- session coexist, but each provider shouldn't have two rows racing for
-- "current" state) — same reasoning as room_drawings' unique constraint
-- in 0008_drawing_functions.sql.
alter table media_sessions add constraint media_sessions_room_provider_key unique (room_id, provider);
