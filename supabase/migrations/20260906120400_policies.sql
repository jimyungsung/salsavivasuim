-- Row-level security. RLS is the only thing that decides access — never a check
-- in the interface, and never the suim-member flag in localStorage.

alter table public.areas           enable row level security;
alter table public.programs        enable row level security;
alter table public.sessions        enable row level security;
alter table public.videos          enable row level security;
alter table public.captions        enable row level security;
alter table public.profiles        enable row level security;
alter table public.practice_events enable row level security;
alter table public.video_progress  enable row level security;
alter table public.saved_items     enable row level security;
alter table public.drills          enable row level security;
alter table public.drill_items     enable row level security;
alter table public.drill_slots     enable row level security;

-- ----------------------------------------------------- catalogue: read ----
-- The shelf is public. Anyone, signed in or not, can see what exists and what it
-- promises — that is the marketing surface, and it wants to be indexable. What
-- is gated is the footage, which is the videos table below.

create policy "areas are public"
  on public.areas for select
  using (true);

create policy "published programs are public"
  on public.programs for select
  using (status <> 'draft' or public.is_admin());

create policy "published sessions are public"
  on public.sessions for select
  using (
    public.is_admin()
    or (status <> 'draft' and exists (
      select 1 from public.programs p
      where p.id = program_id and p.status <> 'draft'
    ))
  );

-- A video row carries its playback ids, so reading one is close enough to being
-- handed the footage. This is the gate, and it defers to can_access().
create policy "videos need entitlement"
  on public.videos for select
  using (public.can_access(id));

create policy "captions follow their video"
  on public.captions for select
  using (public.can_access(video_id));

-- ---------------------------------------------------- catalogue: write ----
-- The back office, and only the back office.

create policy "admins write areas"    on public.areas    for all using (public.is_admin()) with check (public.is_admin());
create policy "admins write programs" on public.programs for all using (public.is_admin()) with check (public.is_admin());
create policy "admins write sessions" on public.sessions for all using (public.is_admin()) with check (public.is_admin());
create policy "admins write videos"   on public.videos   for all using (public.is_admin()) with check (public.is_admin());
create policy "admins write captions" on public.captions for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------ profiles ----

create policy "read own profile"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- Deliberately not updatable here: plan and role. A member who could set their
-- own role to admin would own the back office, and one who could set their own
-- plan would own the paywall. Both move only by a server-side path.
create policy "update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and plan = (select p.plan from public.profiles p where p.id = auth.uid())
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

-- ------------------------------------------------------------ practice ----
-- A member reads and writes their own practice, and nobody else's. Events are
-- append-only: no update, no delete policy, so history cannot be rewritten.

create policy "read own events"
  on public.practice_events for select
  using (user_id = auth.uid());

create policy "log own practice"
  on public.practice_events for insert
  with check (user_id = auth.uid() and public.can_access(video_id));

create policy "own progress"
  on public.video_progress for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.can_access(video_id));

create policy "own saved items"
  on public.saved_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -------------------------------------------------------------- drills ----

create policy "own drills"
  on public.drills for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own drill items"
  on public.drill_items for all
  using (exists (select 1 from public.drills d where d.id = drill_id and d.user_id = auth.uid()))
  with check (
    exists (select 1 from public.drills d where d.id = drill_id and d.user_id = auth.uid())
    -- Only the videos you repeat can go in a drill, and only ones you may watch.
    and public.can_access(video_id)
    and exists (select 1 from public.videos v where v.id = video_id and v.is_drillable)
  );

create policy "own drill slots"
  on public.drill_slots for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.drills d where d.id = drill_id and d.user_id = auth.uid())
  );
