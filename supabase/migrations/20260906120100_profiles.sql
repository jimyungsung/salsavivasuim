-- Accounts, and the one function that decides who may watch what.

create type member_role as enum ('member', 'admin');
create type member_plan as enum ('free', 'paid');

-- The onboarding answers, exactly as the register screen asks them. All three
-- are optional — the screen offers "Skip the questions" and means it.
create type dance_experience as enum ('under_1_year', '1_to_3_years', 'over_3_years');
create type dance_timing     as enum ('on1', 'on2', 'both');
create type dance_goal       as enum ('freezing', 'disconnected', 'messy', 'repetitive');

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale       text not null default 'en' check (locale in ('en', 'ko')),

  -- What the register screen asks. Steers which program the masterplan puts
  -- first; none of it is a gate on anything.
  experience dance_experience,
  timing     dance_timing,
  goal       dance_goal,

  -- Where the member is training, once they or we have decided. Distinct from
  -- experience: a dancer of three years can still be starting at 'beginner' in
  -- an area they have never worked on.
  level level_key,

  -- Bluetooth speakers run 150-300 ms behind the picture. Calibrated once by
  -- the member, then applied to the counts overlay and the click track.
  audio_offset_ms integer not null default 0
    check (audio_offset_ms between -1000 and 1000),

  plan member_plan not null default 'free',
  role member_role not null default 'member',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- A profile row exists for every account, created with it rather than lazily,
-- so nothing downstream has to handle a signed-in user with no profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The onboarding answers ride along in the sign-up metadata, because they are
  -- given before the account exists. Each is validated against its enum rather
  -- than cast blindly: a stray value must not be able to fail a sign-up.
  insert into public.profiles (id, display_name, locale, experience, timing, goal)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    case when new.raw_user_meta_data ->> 'locale' in ('en', 'ko')
         then new.raw_user_meta_data ->> 'locale' else 'en' end,
    case when new.raw_user_meta_data ->> 'experience' in ('under_1_year', '1_to_3_years', 'over_3_years')
         then (new.raw_user_meta_data ->> 'experience')::dance_experience end,
    case when new.raw_user_meta_data ->> 'timing' in ('on1', 'on2', 'both')
         then (new.raw_user_meta_data ->> 'timing')::dance_timing end,
    case when new.raw_user_meta_data ->> 'goal' in ('freezing', 'disconnected', 'messy', 'repetitive')
         then (new.raw_user_meta_data ->> 'goal')::dance_goal end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------ access ----

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- The entitlement check, and the only one.
--
-- Everything is free today, so this asks three questions: is anyone signed in,
-- is the video actually playable, and is the material published. When the paid
-- tier arrives it grows one clause — `and (p.is_free or profile.plan = 'paid')`
-- — and nothing else in the codebase changes. Every RLS policy and every signed
-- playback URL goes through here, so this stays the only place that decides.
create or replace function public.can_access(p_video uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when public.is_admin() then true
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

comment on function public.can_access(uuid) is
  'The paywall lands here and nowhere else. Today: signed in, published, ready.';
