-- Phase 1 reference schema. See docs/phase-1/03-data-model.md for rationale.
-- No RLS here — see 0002_rls.sql and docs/phase-1/04-security-rls.md.

create type room_role as enum ('owner', 'moderator', 'member', 'guest');
create type presence_status as enum ('online', 'away', 'busy', 'studying', 'offline');
create type room_object_type as enum (
  'furniture', 'rug', 'plant', 'lamp', 'poster', 'frame', 'window',
  'background', 'gif', 'sticker', 'image', 'text', 'sticky_note',
  'embed', 'drawing', 'decorative'
);
create type media_provider as enum ('youtube', 'spotify');
create type game_type as enum ('draw_and_guess', 'trivia', 'tic_tac_toe', 'connect_four');
create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  custom_avatar jsonb,
  status presence_status not null default 'offline',
  is_guest boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists room_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_system_template boolean not null default false,
  created_by uuid references profiles(id),
  objects jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  template_id uuid references room_templates(id),
  background_url text,
  is_locked boolean not null default false,
  capacity int not null default 12,
  audio_mode text not null default 'spatial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists room_memberships (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role room_role not null default 'member',
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (room_id, profile_id)
);

create table if not exists room_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references profiles(id),
  password_hash text,
  requires_owner_approval boolean not null default false,
  max_uses int,
  use_count int not null default 0,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists room_invites_token_idx on room_invites(token);

create table if not exists room_bans (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  banned_guest_fingerprint text,
  banned_by uuid not null references profiles(id),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists asset_licenses (
  id uuid primary key default gen_random_uuid(),
  source_url text not null,
  creator text not null,
  license text not null,
  downloaded_at date not null,
  attribution_required boolean not null default false,
  attribution_text text,
  modification_notes text,
  created_at timestamptz not null default now()
);

create table if not exists room_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  asset_url text not null,
  thumbnail_url text,
  license_id uuid references asset_licenses(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists room_objects (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  type room_object_type not null,
  asset_url text,
  x double precision not null default 0,
  y double precision not null default 0,
  width double precision not null default 100,
  height double precision not null default 100,
  rotation double precision not null default 0,
  z_index int not null default 0,
  locked boolean not null default false,
  owner_id uuid references profiles(id),
  interaction_permissions jsonb not null default '{"move": "member", "edit": "owner", "delete": "owner"}',
  data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

create index if not exists room_objects_room_idx on room_objects(room_id);

create table if not exists room_versions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  snapshot jsonb not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists room_drawings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  layer_locked boolean not null default false,
  strokes jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  author_id uuid references profiles(id),
  body text,
  image_url text,
  reply_to_id uuid references room_messages(id),
  mentions uuid[] default '{}',
  deleted_at timestamptz,
  deleted_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists room_messages_room_idx on room_messages(room_id, created_at);

create table if not exists message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references room_messages(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, profile_id, emoji)
);

create table if not exists room_notes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  type text not null default 'sticky',
  content jsonb not null default '{}',
  color text,
  pinned boolean not null default false,
  locked boolean not null default false,
  edit_mode text not null default 'owner',
  owner_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists media_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  provider media_provider not null,
  control_mode text not null default 'host_only',
  current_item_id uuid,
  playback_state text not null default 'paused',
  position_ms bigint not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

create table if not exists media_queue_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references media_sessions(id) on delete cascade,
  provider media_provider not null,
  external_id text not null,
  title text,
  thumbnail_url text,
  duration_ms bigint,
  added_by uuid references profiles(id),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists spotify_connections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  spotify_user_id text not null,
  access_token text not null,
  refresh_token text not null,
  scope text not null,
  expires_at timestamptz not null,
  is_premium boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id)
);

create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  work_minutes int not null default 25,
  break_minutes int not null default 5,
  status text not null default 'idle',
  started_at timestamptz,
  ambient_audio_url text,
  do_not_disturb boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists timers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  type text not null,
  mode text not null default 'shared',
  owner_id uuid references profiles(id),
  duration_seconds int,
  target_at timestamptz,
  status text not null default 'idle',
  started_at timestamptz,
  alarm_sound text,
  created_at timestamptz not null default now()
);

create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  game_type game_type not null,
  status text not null default 'waiting',
  state jsonb not null default '{}',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists game_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  is_spectator boolean not null default false,
  is_ready boolean not null default false,
  score int not null default 0,
  connected boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (session_id, profile_id)
);

create table if not exists game_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  profile_id uuid references profiles(id),
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete set null,
  reported_by uuid not null references profiles(id),
  reported_profile_id uuid references profiles(id),
  message_id uuid references room_messages(id),
  reason text not null,
  details text,
  status report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id)
);

create table if not exists user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete set null,
  actor_id uuid references profiles(id),
  action text not null,
  target_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists subscription_entitlements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  tier text not null default 'free',
  source text,
  active boolean not null default false,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id)
);
