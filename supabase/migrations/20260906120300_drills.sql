-- My drills: a member's own sequence of videos, and where it sits in their week.
--
-- A drill is a playlist, which is the same thing a session is. The player takes
-- one shape for both — that is why P5 is mostly interface work.

create table public.drills (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index drills_user_idx on public.drills (user_id, created_at desc);

create trigger drills_updated_at before update on public.drills
  for each row execute function public.set_updated_at();

create table public.drill_items (
  id       uuid primary key default gen_random_uuid(),
  drill_id uuid not null references public.drills (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  position integer not null check (position > 0),

  -- Per-item playback, so a drill can hold the same video twice at two speeds.
  -- Null means: use the video's own default.
  loop_start_ms integer check (loop_start_ms >= 0),
  loop_end_ms   integer,
  speed         numeric(4, 2) check (speed > 0),
  repeats       integer not null default 1 check (repeats > 0),

  constraint drill_items_position_unique unique (drill_id, position) deferrable initially deferred,
  constraint drill_items_loop_ordered check (
    loop_end_ms is null or loop_start_ms is null or loop_end_ms > loop_start_ms
  )
);

create index drill_items_drill_idx on public.drill_items (drill_id, position);

-- One row per scheduled run. Dropping a drill twice on a Monday makes two rows.
create table public.drill_slots (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  drill_id   uuid not null references public.drills (id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),  -- 0 = Monday
  done_at    timestamptz,
  created_at timestamptz not null default now()
);

create index drill_slots_user_idx on public.drill_slots (user_id, weekday);
