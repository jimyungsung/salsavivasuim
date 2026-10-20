-- A front view for an exercise. The main clip is filmed from behind (follow
-- along); a second clip, filmed from the front, can be linked to it, and the
-- player switches between them. The front clip is an ordinary row in
-- `videos` — uploaded, encoded, signed and gated like any other — that points
-- at its exercise with view_of. It is not an exercise of its own: pickers and
-- the member library leave out rows with a view_of.

alter table public.videos
  add column view_of uuid references public.videos (id) on delete set null,
  add constraint videos_view_not_itself check (view_of <> id);

-- One front view per exercise.
create unique index videos_one_view_per_exercise on public.videos (view_of) where view_of is not null;

comment on column public.videos.view_of is
  'Set on a front-view clip: the exercise it is the other angle of. Its publish follows that exercise.';

-- A view is published exactly when its exercise is, so members never get a
-- button for a front view they cannot play, and publishing a week (which
-- opens its exercises) opens their front views with them.
create or replace function private.view_follows_exercise()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.view_of is not null then
    new.publish := (select v.publish from public.videos v where v.id = new.view_of);
  end if;
  return new;
end;
$$;

create or replace function private.exercise_carries_view()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.videos set publish = new.publish
  where view_of = new.id and publish is distinct from new.publish;
  return null;
end;
$$;

revoke execute on function private.view_follows_exercise(), private.exercise_carries_view() from public;

create trigger videos_view_follows_exercise
  before insert or update on public.videos
  for each row execute function private.view_follows_exercise();

create trigger videos_exercise_carries_view
  after update of publish on public.videos
  for each row execute function private.exercise_carries_view();
