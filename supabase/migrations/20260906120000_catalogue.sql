-- The catalogue: area -> program -> session -> video.
--
-- Every *_t column is jsonb of the shape {"en": "...", "ko": "..."} — the same
-- shape lib/content.ts already uses, so the app reads them unchanged. English is
-- required; a missing "ko" falls back to English and shows as untranslated in
-- the back office.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- types ----

create type publish_status as enum ('draft', 'soon', 'open');
create type level_key      as enum ('all', 'beginner', 'intermediate', 'advanced', 'pro');
create type method_step    as enum ('watch', 'understand', 'train', 'drill', 'transform', 'improvise');
create type video_status   as enum ('uploading', 'processing', 'ready', 'failed');
create type camera_angle   as enum ('front', 'back', 'detail');

comment on type level_key is
  'Levels describe the material, not the dancer, and are not a ladder: a session '
  'can carry two at once, and a later session can be gentler than an earlier one.';

comment on type method_step is
  'What a video is for. A session draws from this vocabulary; it is under no '
  'obligation to use every step, and may use one of them more than once.';

-- ------------------------------------------------------------- helpers ----

create or replace function public.is_localized(value jsonb)
returns boolean
language sql
immutable
as $$
  select value ? 'en'
     and jsonb_typeof(value -> 'en') = 'string'
     and (not value ? 'ko' or jsonb_typeof(value -> 'ko') = 'string');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------------------------------------------- tables ----

create table public.areas (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  position   integer not null,
  name_t     jsonb not null check (is_localized(name_t)),
  blurb_t    jsonb not null check (is_localized(blurb_t)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint areas_position_unique unique (position) deferrable initially deferred
);

create table public.programs (
  id           uuid primary key default gen_random_uuid(),
  area_id      uuid not null references public.areas (id) on delete restrict,
  slug         text not null unique,
  position     integer not null,
  title_t      jsonb not null check (is_localized(title_t)),
  subtitle_t   jsonb not null check (is_localized(subtitle_t)),
  promise_t    jsonb not null check (is_localized(promise_t)),
  level        level_key not null,
  weeks        integer check (weeks > 0),
  status       publish_status not null default 'draft',
  -- Everything is free today. This marks the programs that stay free once the
  -- paid tier lands, so the sample does not have to be reconstructed then.
  is_free      boolean not null default true,
  cover_url    text,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint programs_position_unique unique (area_id, position) deferrable initially deferred
);

create index programs_area_idx on public.programs (area_id, position);
create index programs_status_idx on public.programs (status) where status = 'open';

create table public.sessions (
  id         uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  position   integer not null,
  title_t    jsonb not null check (is_localized(title_t)),
  outcome_t  jsonb not null check (is_localized(outcome_t)),
  focus_t    jsonb not null check (is_localized(focus_t)),
  levels     level_key[] not null default '{}',
  status     publish_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sessions_position_unique unique (program_id, position) deferrable initially deferred
);

create index sessions_program_idx on public.sessions (program_id, position);

-- A session is an ORDERED LIST of videos, each tagged with one method step.
--
-- Deliberately absent: any unique constraint on (session_id, step), and any
-- requirement that all six steps appear. A session may have no understand video
-- at all, or two train videos, or three improvise ones. `position` is the only
-- thing that orders a session; the step is a tag describing what the video is
-- for. The back office suggests a position from step order when a video is
-- added, and that is the whole extent of the six-step assumption.
create table public.videos (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions (id) on delete cascade,
  step          method_step not null,
  position      integer not null check (position > 0),
  title_t       jsonb not null check (is_localized(title_t)),
  description_t jsonb not null default '{"en": ""}'::jsonb check (is_localized(description_t)),
  angle         camera_angle not null default 'front',
  duration_ms   integer check (duration_ms > 0),

  -- delivery. Two renditions on purpose: HLS adapts to the network, and a short
  -- progressive MP4 downloads whole so a tight loop can seek without rebuffering.
  provider        text not null default 'cloudflare',
  provider_uid    text,
  hls_playback_id text,
  mp4_url         text,
  poster_url      text,
  status          video_status not null default 'uploading',

  -- the beat grid: everything about counts is derived from these three numbers,
  -- never hand-drawn. Filled in the back office with tap tempo and a nudge.
  bpm              numeric(6, 2) check (bpm > 0),
  first_beat_ms    integer check (first_beat_ms >= 0),
  beats_per_phrase integer not null default 8 check (beats_per_phrase > 0),

  default_loop_start_ms integer check (default_loop_start_ms >= 0),
  default_loop_end_ms   integer,

  -- Train is filmed facing you, drill from behind — so the default differs per
  -- video, not per step. The back office pre-checks it for train.
  mirror_default boolean not null default false,

  -- Follows the method: train and drill are the two you repeat on a loop.
  is_drillable boolean not null generated always as (step in ('train', 'drill')) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint videos_position_unique unique (session_id, position) deferrable initially deferred,
  constraint videos_loop_ordered check (
    default_loop_end_ms is null
    or default_loop_start_ms is null
    or default_loop_end_ms > default_loop_start_ms
  ),
  -- A ready video is one the player can actually be handed.
  constraint videos_ready_is_playable check (
    status <> 'ready' or (provider_uid is not null and duration_ms is not null)
  )
);

create index videos_session_idx on public.videos (session_id, position);
create index videos_drillable_idx on public.videos (session_id) where is_drillable;
create unique index videos_provider_uid_idx on public.videos (provider_uid) where provider_uid is not null;

create table public.captions (
  id         uuid primary key default gen_random_uuid(),
  video_id   uuid not null references public.videos (id) on delete cascade,
  lang       text not null check (lang in ('en', 'ko')),
  vtt_url    text not null,
  created_at timestamptz not null default now(),

  unique (video_id, lang)
);

-- --------------------------------------------------------------- clocks ----

create trigger areas_updated_at    before update on public.areas    for each row execute function public.set_updated_at();
create trigger programs_updated_at before update on public.programs for each row execute function public.set_updated_at();
create trigger sessions_updated_at before update on public.sessions for each row execute function public.set_updated_at();
create trigger videos_updated_at   before update on public.videos   for each row execute function public.set_updated_at();
