-- Practice, as one append-only log.
--
-- Streak, minutes practised, sessions this week, the resume line and the
-- activity feed are all aggregates of practice_events. Counters drift and cannot
-- be recomputed; a log can. video_progress is a rollup kept for fast reads, not
-- a second source of truth — it can be rebuilt from the log at any time.

create type practice_kind as enum ('play', 'heartbeat', 'loop', 'complete');

create table public.practice_events (
  id       bigserial primary key,
  user_id  uuid not null references auth.users (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  kind     practice_kind not null,
  at       timestamptz not null default now(),

  -- Minutes practised is WALL-CLOCK, not media time: four minutes of footage at
  -- 0.5x is eight minutes of practice, and eight is what the dancer spent. Both
  -- are recorded so the decision stays reversible, but wall_ms is what counts.
  wall_ms  integer not null default 0 check (wall_ms >= 0),
  media_ms integer not null default 0 check (media_ms >= 0),
  speed    numeric(4, 2) not null default 1 check (speed > 0)
);

create index practice_events_user_at_idx on public.practice_events (user_id, at desc);
create index practice_events_video_idx on public.practice_events (user_id, video_id, at desc);

create table public.video_progress (
  user_id          uuid not null references auth.users (id) on delete cascade,
  video_id         uuid not null references public.videos (id) on delete cascade,
  last_position_ms integer not null default 0 check (last_position_ms >= 0),
  loops            integer not null default 0 check (loops >= 0),
  wall_ms          integer not null default 0 check (wall_ms >= 0),
  completed_at     timestamptz,
  updated_at       timestamptz not null default now(),

  primary key (user_id, video_id)
);

create index video_progress_user_idx on public.video_progress (user_id, updated_at desc);

create trigger video_progress_updated_at before update on public.video_progress
  for each row execute function public.set_updated_at();

-- Saved for later: a whole session when video_id is null, otherwise one video.
create table public.saved_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  video_id   uuid references public.videos (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index saved_items_unique_idx
  on public.saved_items (user_id, session_id, coalesce(video_id, '00000000-0000-0000-0000-000000000000'::uuid));
