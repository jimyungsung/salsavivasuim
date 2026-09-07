-- Hardening, from the Supabase database linter.
--
-- Three things it caught, all of them worth fixing while nothing depends on the
-- current shape:
--
-- 1. is_localized() and set_updated_at() had a mutable search_path. Both are now
--    pinned to '' and fully qualified, so a role cannot shadow what they call.
--
-- 2. handle_new_user() is a trigger function, but being SECURITY DEFINER in the
--    public schema also made it callable as /rest/v1/rpc/handle_new_user. It
--    would fail there (no NEW record outside a trigger), but a definer function
--    should not be reachable at all. EXECUTE is revoked.
--
-- 3. is_admin() and can_access() were reachable the same way. They only return
--    booleans about the caller's own access, so nothing leaked — but they belong
--    behind the API rather than in front of it. They move to a `private` schema,
--    which PostgREST does not expose, and the policies follow them there.
--    Grants stay, because an RLS policy expression runs as the querying role and
--    so still needs EXECUTE.

-- ------------------------------------------------------------- 1. paths ----

create or replace function public.is_localized(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value ? 'en'
     and jsonb_typeof(value -> 'en') = 'string'
     and (not value ? 'ko' or jsonb_typeof(value -> 'ko') = 'string');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --------------------------------------------------------- 2. the trigger --

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ------------------------------------------------- 3. helpers out of sight --

create schema if not exists private;
grant usage on schema private to anon, authenticated;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- The entitlement check, and the only one. Everything is free today, so this
-- asks three questions: is anyone signed in, is the video playable, is the
-- material published. The paid tier adds one clause here and nowhere else.
create function private.can_access(p_video uuid)
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
      select 1
      from public.videos v
      join public.sessions s on s.id = v.session_id
      join public.programs p on p.id = s.program_id
      where v.id = p_video
        and v.status = 'ready'
        and s.status = 'open'
        and p.status = 'open'
    )
  end;
$$;

comment on function private.can_access(uuid) is
  'The paywall lands here and nowhere else. Today: signed in, published, ready.';

revoke execute on function private.is_admin(), private.can_access(uuid) from public;
grant execute on function private.is_admin(), private.can_access(uuid) to anon, authenticated;

-- ---------------------------------------------- the policies follow them ----

drop policy "published programs are public" on public.programs;
drop policy "published sessions are public" on public.sessions;
drop policy "videos need entitlement"       on public.videos;
drop policy "captions follow their video"   on public.captions;
drop policy "admins write areas"            on public.areas;
drop policy "admins write programs"         on public.programs;
drop policy "admins write sessions"         on public.sessions;
drop policy "admins write videos"           on public.videos;
drop policy "admins write captions"         on public.captions;
drop policy "read own profile"              on public.profiles;
drop policy "log own practice"              on public.practice_events;
drop policy "own progress"                  on public.video_progress;
drop policy "own drill items"               on public.drill_items;

create policy "published programs are public"
  on public.programs for select
  using (status <> 'draft' or private.is_admin());

create policy "published sessions are public"
  on public.sessions for select
  using (
    private.is_admin()
    or (status <> 'draft' and exists (
      select 1 from public.programs p
      where p.id = program_id and p.status <> 'draft'
    ))
  );

create policy "videos need entitlement"
  on public.videos for select
  using (private.can_access(id));

create policy "captions follow their video"
  on public.captions for select
  using (private.can_access(video_id));

create policy "admins write areas"    on public.areas    for all using (private.is_admin()) with check (private.is_admin());
create policy "admins write programs" on public.programs for all using (private.is_admin()) with check (private.is_admin());
create policy "admins write sessions" on public.sessions for all using (private.is_admin()) with check (private.is_admin());
create policy "admins write videos"   on public.videos   for all using (private.is_admin()) with check (private.is_admin());
create policy "admins write captions" on public.captions for all using (private.is_admin()) with check (private.is_admin());

create policy "read own profile"
  on public.profiles for select
  using (id = (select auth.uid()) or private.is_admin());

create policy "log own practice"
  on public.practice_events for insert
  with check (user_id = (select auth.uid()) and private.can_access(video_id));

create policy "own progress"
  on public.video_progress for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and private.can_access(video_id));

create policy "own drill items"
  on public.drill_items for all
  using (exists (select 1 from public.drills d where d.id = drill_id and d.user_id = (select auth.uid())))
  with check (
    exists (select 1 from public.drills d where d.id = drill_id and d.user_id = (select auth.uid()))
    and private.can_access(video_id)
    and exists (select 1 from public.videos v where v.id = video_id and v.is_drillable)
  );

drop function public.can_access(uuid);
drop function public.is_admin();
