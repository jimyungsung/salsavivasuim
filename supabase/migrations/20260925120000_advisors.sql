-- What Supabase's performance advisor flagged, in one pass. Nothing here
-- changes who can see or do what; every policy keeps its meaning.

-- ------------------------------------------------ auth.uid() once, not per row
-- Bare auth.uid() in a policy is re-evaluated for every row; wrapped in a
-- subselect it runs once per query. The catalogue policies and the private
-- helpers already do this; these five did not.

drop policy "own drills"          on public.drills;
drop policy "own drill slots"     on public.drill_slots;
drop policy "own saved items"     on public.saved_items;
drop policy "read own events"     on public.practice_events;
drop policy "update own profile"  on public.profiles;

create policy "own drills"
  on public.drills for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own drill slots"
  on public.drill_slots for all
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.drills d where d.id = drill_id and d.user_id = (select auth.uid()))
  );

create policy "own saved items"
  on public.saved_items for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "read own events"
  on public.practice_events for select
  using (user_id = (select auth.uid()));

-- Deliberately not updatable here: plan and role. A member who could set their
-- own role to admin would own the back office, and one who could set their own
-- plan would own the paywall. Both move only by a server-side path.
create policy "update own profile"
  on public.profiles for update
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and plan = (select p.plan from public.profiles p where p.id = (select auth.uid()))
    and role = (select p.role from public.profiles p where p.id = (select auth.uid()))
  );

-- ------------------------------------------ admin writes are writes, not reads
-- "for all" made each admin policy a second SELECT policy on every catalogue
-- table, evaluated for every reader, admin or not. Split into the three writes,
-- the read policies alone decide reads — and they already let an admin see
-- drafts (programs and sessions test is_admin(); can_access() says yes to an
-- admin), so nothing an admin could read before is lost.

drop policy "admins write areas"    on public.areas;
drop policy "admins write programs" on public.programs;
drop policy "admins write sessions" on public.sessions;
drop policy "admins write videos"   on public.videos;
drop policy "admins write captions" on public.captions;

create policy "admins insert areas"    on public.areas    for insert with check (private.is_admin());
create policy "admins update areas"    on public.areas    for update using (private.is_admin()) with check (private.is_admin());
create policy "admins delete areas"    on public.areas    for delete using (private.is_admin());

create policy "admins insert programs" on public.programs for insert with check (private.is_admin());
create policy "admins update programs" on public.programs for update using (private.is_admin()) with check (private.is_admin());
create policy "admins delete programs" on public.programs for delete using (private.is_admin());

create policy "admins insert sessions" on public.sessions for insert with check (private.is_admin());
create policy "admins update sessions" on public.sessions for update using (private.is_admin()) with check (private.is_admin());
create policy "admins delete sessions" on public.sessions for delete using (private.is_admin());

create policy "admins insert videos"   on public.videos   for insert with check (private.is_admin());
create policy "admins update videos"   on public.videos   for update using (private.is_admin()) with check (private.is_admin());
create policy "admins delete videos"   on public.videos   for delete using (private.is_admin());

create policy "admins insert captions" on public.captions for insert with check (private.is_admin());
create policy "admins update captions" on public.captions for update using (private.is_admin()) with check (private.is_admin());
create policy "admins delete captions" on public.captions for delete using (private.is_admin());

-- ------------------------------------------------- foreign keys with an index
-- Deleting a video or a drill has to find every row that points at it; without
-- these that is a scan of the whole table each time.

create index drill_items_video_idx     on public.drill_items     (video_id);
create index drill_slots_drill_idx     on public.drill_slots     (drill_id);
create index practice_events_by_video  on public.practice_events (video_id);
create index saved_items_session_idx   on public.saved_items     (session_id);
create index saved_items_video_idx     on public.saved_items     (video_id);
create index video_progress_video_idx  on public.video_progress  (video_id);

-- Left alone: practice_events_user_at_idx reads as unused only because nothing
-- logs practice yet. It is the index My training will read by.
