-- Onboarding asks one question now, the landing page's three chips: never
-- danced, took some classes, or dances socially. The answer is where a member
-- starts. experience / timing / goal stay as data and are no longer asked.

create type start_point as enum ('new', 'restarting', 'social');

alter table public.profiles add column start_point start_point;

comment on column public.profiles.start_point is
  'Where the member said they are starting from, at sign-up. Picks the starting menu.';

-- The answer rides along in the sign-up metadata, like the old three did, and
-- is validated against its enum rather than cast: a stray value must not be
-- able to fail a sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, locale, experience, timing, goal, start_point)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    case when new.raw_user_meta_data ->> 'locale' in ('en', 'ko')
         then new.raw_user_meta_data ->> 'locale' else 'en' end,
    case when new.raw_user_meta_data ->> 'experience' in ('under_1_year', '1_to_3_years', 'over_3_years')
         then (new.raw_user_meta_data ->> 'experience')::public.dance_experience end,
    case when new.raw_user_meta_data ->> 'timing' in ('on1', 'on2', 'both')
         then (new.raw_user_meta_data ->> 'timing')::public.dance_timing end,
    case when new.raw_user_meta_data ->> 'goal' in ('freezing', 'disconnected', 'messy', 'repetitive')
         then (new.raw_user_meta_data ->> 'goal')::public.dance_goal end,
    case when new.raw_user_meta_data ->> 'start_point' in ('new', 'restarting', 'social')
         then (new.raw_user_meta_data ->> 'start_point')::public.start_point end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
