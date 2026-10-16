-- Practice, read back. practice_events has existed since P1 and nothing wrote
-- to it; the player now does (app/api/practice). Two things read it:

-- 1. The member's practice by day, in their own time zone: streak, minutes this
--    week and "practised today" are all sums over these rows. SECURITY INVOKER
--    (the default) on purpose: it runs as the caller, so the "read own events"
--    policy applies and it can only ever see the caller's rows — which is why
--    it may live in public and be called as an RPC.
create or replace function public.practice_days(p_tz text, p_days integer default 120)
returns table (day date, wall_ms bigint, completes integer)
language sql
stable
set search_path = ''
as $$
  select (e.at at time zone p_tz)::date as day,
         sum(e.wall_ms)::bigint as wall_ms,
         count(*) filter (where e.kind = 'complete')::integer as completes
  from public.practice_events e
  where e.user_id = (select auth.uid())
    and e.at >= now() - make_interval(days => least(greatest(p_days, 1), 400))
  group by 1
  order by 1;
$$;

comment on function public.practice_days(text, integer) is
  'The caller''s practice per local day: wall-clock ms and completed exercises. Runs as the caller; RLS applies.';

-- 2. video_progress, the per-exercise rollup, kept by the log rather than by
--    the client: one insert into practice_events updates it, so it cannot
--    drift from the history it summarises. Definer, in private, because the
--    member inserts events but should not have to write the rollup too.
create or replace function private.practice_rollup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.video_progress (user_id, video_id, loops, wall_ms, completed_at)
  values (
    new.user_id,
    new.video_id,
    case when new.kind = 'loop' then 1 else 0 end,
    new.wall_ms,
    case when new.kind = 'complete' then new.at end
  )
  on conflict (user_id, video_id) do update set
    loops = public.video_progress.loops + excluded.loops,
    wall_ms = public.video_progress.wall_ms + excluded.wall_ms,
    completed_at = coalesce(public.video_progress.completed_at, excluded.completed_at);
  return new;
end;
$$;

revoke execute on function private.practice_rollup() from public;

create trigger practice_events_rollup
  after insert on public.practice_events
  for each row execute function private.practice_rollup();
