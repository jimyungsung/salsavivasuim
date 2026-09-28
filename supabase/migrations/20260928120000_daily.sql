-- The move to the daily-routine concept (docs/DAILY-PLAN.md).
--
-- Four words swapped and one column changed. The hierarchy keeps its shape:
--
--   areas → stages          "Foundations": eight weeks of menus
--   programs → menus        "Shoulders & body movement": a themed week
--   sessions → routines     "Footwork & timing": one day, 10–15 min
--   videos                  an exercise in the product; the table keeps its
--                           name because the whole delivery chain keys on it
--
-- The one structural change: an exercise is no longer owned by one routine.
-- routines borrow exercises through routine_items (the same shape as
-- drill_items), so "Shoulder rolls on the count" can sit on Monday and
-- Thursday and in two menus, uploaded once and beat-gridded once.
--
-- The six method steps leave the data. videos.step becomes tags (what the
-- exercise works) and difficulty (how hard it is). Every exercise is one you
-- repeat, so is_drillable goes with the step.
--
-- THIS MIGRATION DELETES. The seeded catalogue was placeholders generated from
-- lib/content.ts with no footage; it goes. Every video with an upload
-- (provider_uid set) is kept, detached, and reappears in the back office as a
-- draft exercise to tag. Members' drills are kept; their slots keep done_at.
-- Take a backup from the dashboard before applying.

-- ---------------------------------------------------- 1. placeholders out ----

delete from public.videos where provider_uid is null;

-- An exercise stands on its own now. Dropping the column takes its foreign key
-- and index with it; the real uploads keep every other column.
alter table public.videos drop column session_id;

-- The old catalogue rows: nothing points at them any more. programs.area_id is
-- ON DELETE RESTRICT, so the order matters.
delete from public.sessions;
delete from public.programs;
delete from public.areas;

-- Never wired, and the daily concept has no "save for later".
drop table public.saved_items;

-- ------------------------------------------------------------ 2. renames ----

alter table public.areas rename to stages;
alter table public.stages rename constraint areas_position_unique to stages_position_unique;
alter trigger areas_updated_at on public.stages rename to stages_updated_at;

alter table public.programs rename to menus;
alter table public.menus rename column area_id to stage_id;
alter table public.menus rename constraint programs_position_unique to menus_position_unique;
alter index public.programs_area_idx rename to menus_stage_idx;
alter index public.programs_status_idx rename to menus_status_idx;
alter trigger programs_updated_at on public.menus rename to menus_updated_at;

alter table public.sessions rename to routines;
alter table public.routines rename column program_id to menu_id;
alter table public.routines rename constraint sessions_position_unique to routines_position_unique;
alter index public.sessions_program_idx rename to routines_menu_idx;
alter trigger sessions_updated_at on public.routines rename to routines_updated_at;

-- ------------------------------------------------------------- 3. shapes ----

-- A menu is one week: `weeks` has nothing to say. A stage may sit above it, or
-- not: the "Quick drills" menu (one-exercise routines for "Got 5 minutes?")
-- belongs to no stage.
alter table public.menus drop column weeks;
alter table public.menus alter column stage_id drop not null;

-- A routine has one line under its title rather than an outcome and a focus,
-- and a weekday when it is part of a menu's week. A one-off routine has none.
alter table public.routines drop column outcome_t;
alter table public.routines drop column focus_t;
alter table public.routines
  add column blurb_t jsonb not null default '{"en": ""}'::jsonb check (public.is_localized(blurb_t)),
  add column weekday smallint check (weekday between 0 and 6);   -- 0 = Monday

comment on column public.routines.weekday is
  'Where the routine falls in its menu''s week, 0 = Monday. Null for a routine '
  'that is not a day of anything, such as a quick drill.';

-- videos: the step goes, tags and difficulty arrive, and an exercise carries
-- its own publish status now that no session lends it one. `position` ordered
-- a session; routine_items.position orders a routine.
alter table public.videos drop column is_drillable;   -- generated from step
alter table public.videos drop column step;
alter table public.videos drop column position;
alter table public.videos
  add column tags       text[]         not null default '{}',
  add column difficulty level_key      not null default 'beginner',
  add column publish    publish_status not null default 'draft';

create index videos_tags_idx    on public.videos using gin (tags);
create index videos_publish_idx on public.videos (publish) where publish = 'open';

comment on column public.videos.tags is
  'What the exercise works: shoulders, footwork, timing… The vocabulary lives in '
  'lib/db.ts (EXERCISE_TAGS), not in an enum, so a new tag is a line, not a migration.';
comment on column public.videos.difficulty is
  'How hard the exercise is. Describes the material, not the dancer.';
comment on column public.videos.publish is
  'Whether members may play it. Distinct from status, which is the encoding state.';

drop type public.method_step;

-- ------------------------------------------------------ 4. routine_items ----

-- A routine is an ORDERED LIST of exercises borrowed from the library, each
-- with a loop, a speed and a repeat count of its own (null: the exercise's
-- default). The same shape as drill_items on purpose: "Use this menu" copies
-- one into the other.
create table public.routine_items (
  id         uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  -- RESTRICT, unlike drill_items: deleting an exercise that a curated routine
  -- still uses should fail loudly in the back office, not silently shorten a
  -- routine members are on.
  video_id   uuid not null references public.videos (id) on delete restrict,
  position   integer not null check (position > 0),

  loop_start_ms integer check (loop_start_ms >= 0),
  loop_end_ms   integer,
  speed         numeric(4, 2) check (speed > 0),
  repeats       integer not null default 1 check (repeats > 0),

  constraint routine_items_position_unique unique (routine_id, position) deferrable initially deferred,
  constraint routine_items_loop_ordered check (
    loop_end_ms is null or loop_start_ms is null or loop_end_ms > loop_start_ms
  )
);

create index routine_items_routine_idx on public.routine_items (routine_id, position);
create index routine_items_video_idx   on public.routine_items (video_id);

alter table public.routine_items enable row level security;

-- ------------------------------------------------------------ 5. members ----

-- Where a member's day came from, so "Reset to menu" knows what to copy again
-- and Today can say which routine this is.
alter table public.drills
  add column routine_id uuid references public.routines (id) on delete set null;
create index drills_routine_idx on public.drills (routine_id);

-- This week's menu, and when it started: "week 3 of 8" is the menu's position
-- in its stage. No history table yet; practice_events is the history.
alter table public.profiles
  add column menu_id uuid references public.menus (id) on delete set null,
  add column menu_started_on date;
create index profiles_menu_idx on public.profiles (menu_id);

-- --------------------------------------------------------- 6. entitlement ----

-- One row to read now: an exercise carries its own publish status. The paid
-- tier still lands here and nowhere else.
create or replace function private.can_access(p_video uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then false
    when private.is_admin() then true
    else exists (
      select 1 from public.videos v
      where v.id = p_video and v.status = 'ready' and v.publish = 'open'
    )
  end;
$$;

comment on function private.can_access(uuid) is
  'The paywall lands here and nowhere else. Today: signed in, published, ready.';

-- ------------------------------------------------------------ 7. policies ----

-- The catalogue policies followed their tables through the rename; they are
-- recreated under names that say what they now guard, with the same meaning.

drop policy "areas are public"               on public.stages;
drop policy "published programs are public"  on public.menus;
drop policy "published sessions are public"  on public.routines;
drop policy "admins insert areas"    on public.stages;
drop policy "admins update areas"    on public.stages;
drop policy "admins delete areas"    on public.stages;
drop policy "admins insert programs" on public.menus;
drop policy "admins update programs" on public.menus;
drop policy "admins delete programs" on public.menus;
drop policy "admins insert sessions" on public.routines;
drop policy "admins update sessions" on public.routines;
drop policy "admins delete sessions" on public.routines;

create policy "stages are public"
  on public.stages for select
  using (true);

create policy "published menus are public"
  on public.menus for select
  using (status <> 'draft' or private.is_admin());

create policy "published routines are public"
  on public.routines for select
  using (
    private.is_admin()
    or (status <> 'draft' and exists (
      select 1 from public.menus m
      where m.id = menu_id and m.status <> 'draft'
    ))
  );

-- An item says which exercise a routine uses and how; the exercise row itself
-- is still gated by can_access(). Visible with its routine.
create policy "routine items follow their routine"
  on public.routine_items for select
  using (
    private.is_admin()
    or exists (
      select 1 from public.routines r
      join public.menus m on m.id = r.menu_id
      where r.id = routine_id and r.status <> 'draft' and m.status <> 'draft'
    )
  );

create policy "admins insert stages"   on public.stages   for insert with check (private.is_admin());
create policy "admins update stages"   on public.stages   for update using (private.is_admin()) with check (private.is_admin());
create policy "admins delete stages"   on public.stages   for delete using (private.is_admin());

create policy "admins insert menus"    on public.menus    for insert with check (private.is_admin());
create policy "admins update menus"    on public.menus    for update using (private.is_admin()) with check (private.is_admin());
create policy "admins delete menus"    on public.menus    for delete using (private.is_admin());

create policy "admins insert routines" on public.routines for insert with check (private.is_admin());
create policy "admins update routines" on public.routines for update using (private.is_admin()) with check (private.is_admin());
create policy "admins delete routines" on public.routines for delete using (private.is_admin());

create policy "admins insert routine items" on public.routine_items for insert with check (private.is_admin());
create policy "admins update routine items" on public.routine_items for update using (private.is_admin()) with check (private.is_admin());
create policy "admins delete routine items" on public.routine_items for delete using (private.is_admin());

-- Every exercise is drillable now; the clause that said otherwise goes.
drop policy "own drill items" on public.drill_items;
create policy "own drill items"
  on public.drill_items for all
  using (exists (select 1 from public.drills d where d.id = drill_id and d.user_id = (select auth.uid())))
  with check (
    exists (select 1 from public.drills d where d.id = drill_id and d.user_id = (select auth.uid()))
    and private.can_access(video_id)
  );

-- -------------------------------------------------------- 8. reordering ----

-- The same swap, over the renamed tables. Stages are ordered globally; menus
-- within a stage (a stageless menu swaps among the stageless), routines within
-- a menu, items within a routine.
create or replace function public.swap_position(
  p_table     text,
  p_id        uuid,
  p_direction text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_parent_col text;
  v_parent     uuid;
  v_pos        integer;
  v_other_id   uuid;
  v_other_pos  integer;
  v_cmp        text;
  v_sort       text;
begin
  if p_table = 'stages' then
    v_parent_col := null;                 -- ordered globally
  else
    v_parent_col := case p_table
      when 'menus'         then 'stage_id'
      when 'routines'      then 'menu_id'
      when 'routine_items' then 'routine_id'
    end;
    if v_parent_col is null then
      raise exception 'swap_position: unsupported table %', p_table;
    end if;
  end if;

  if p_direction = 'up' then
    v_cmp := '<'; v_sort := 'desc';
  elsif p_direction = 'down' then
    v_cmp := '>'; v_sort := 'asc';
  else
    raise exception 'swap_position: direction must be up or down';
  end if;

  if v_parent_col is null then
    execute format('select position from public.%I where id = $1', p_table)
       into v_pos using p_id;
    if v_pos is null then
      raise exception 'swap_position: no such row';
    end if;
    execute format(
        'select id, position from public.%I where position %s $1 order by position %s limit 1',
        p_table, v_cmp, v_sort)
       into v_other_id, v_other_pos using v_pos;
  else
    execute format('select %I, position from public.%I where id = $1', v_parent_col, p_table)
       into v_parent, v_pos using p_id;
    if v_pos is null then
      raise exception 'swap_position: no such row';
    end if;
    -- `is not distinct from`, so stageless menus (parent null) swap among
    -- themselves rather than matching nothing.
    execute format(
        'select id, position from public.%I where %I is not distinct from $1 and position %s $2 order by position %s limit 1',
        p_table, v_parent_col, v_cmp, v_sort)
       into v_other_id, v_other_pos using v_parent, v_pos;
  end if;

  if v_other_id is null then
    return;
  end if;

  execute format('update public.%I set position = $1 where id = $2', p_table)
    using v_other_pos, p_id;
  execute format('update public.%I set position = $1 where id = $2', p_table)
    using v_pos, v_other_id;
end;
$$;

revoke execute on function public.swap_position(text, uuid, text) from public, anon;
grant  execute on function public.swap_position(text, uuid, text) to authenticated;

-- ------------------------------------------------------------- 9. words ----

comment on type level_key is
  'Levels describe the material, not the dancer, and are not a ladder: a routine '
  'can carry two at once, and a later week can be gentler than an earlier one.';
