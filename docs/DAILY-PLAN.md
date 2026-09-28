# SUIM Daily — moving the site to the daily concept

From a course catalogue to a routine a day.

Drafted 28 September 2026, against `main` with P3 done (the player is live), My
drills real, and practice events (P4) still to come. The look and feel is
settled in three static mockups under `public/mockups/`:

| Mockup | Screen |
|---|---|
| `daily-landing.html` | the landing page |
| `daily.html` | Today: the member's home, the player with today's routine in it |
| `daily-week.html` | Week: pick a weekly menu, then edit the days from a library of mini exercises |

This document is the plan for making them real without rebuilding what already
works. It follows the same rules as [BUILD-PLAN.md](BUILD-PLAN.md): decide once,
keep `main` building at every step, and let the database decide access.

---

## 1. The concept, in one table

| | Was | Becomes |
|---|---|---|
| **The unit of practice** | a session, 15–22 min, in a module of nine | a routine, 10–15 min, one per day |
| **The atom** | a video tagged with one of six method steps | an exercise: a short video with tags and a difficulty |
| **What a day holds** | whatever the member scheduled from My drills | today's routine, copied from this week's menu and editable |
| **What a week is** | not a thing; sessions are numbered | a menu: a themed set of routines, one per weekday |
| **Progression** | area → program (weeks) → session | stage → weekly menu → routine |
| **The method** | WATCH → UNDERSTAND → TRAIN → DRILL → TRANSFORM → IMPROVISE, as a tag on every video | gone from the data. Every exercise is something you repeat |
| **The library** | Train and Drill videos only, for building drills | every published exercise |
| **Home** | the masterplan (a catalogue) | Today (a routine and a Start button) |

The two things the mockups add that the site does not have: a **library of
reusable exercises** and **weekly menus** that pre-fill a member's week. Almost
everything else is a rename.

---

## 2. The data model: four words swapped, one column changed

The hierarchy keeps its shape. Only the names change, and the one tag on a video.

| Table today | Table after | Same row, different word |
|---|---|---|
| `areas` | `stages` | "Foundations", eight weeks of menus |
| `programs` | `menus` | "Shoulders & body movement": a themed week |
| `sessions` | `routines` | "Footwork & timing": one day, ~14 min |
| `videos` | `videos` (an *exercise* in the product) | one short clip, uploaded once |
| `videos.step` | `videos.tags text[]` + `videos.difficulty level_key` | what the exercise works, and how hard it is |

Keep the table name `videos`. It is the one table the whole delivery chain keys
on: the Cloudflare webhook, signed playback, the upload ticket, RLS, and the
foreign keys from `practice_events` and `drill_items`. Renaming it buys nothing
and touches everything. The *product* says "exercise"; the code can say `video`
under the hood the way it already says `*_t` for a bilingual column.

### The one structural change: exercises are a library

Today a video belongs to exactly one session (`videos.session_id not null`).
In the daily concept the same exercise ("Shoulder rolls on the count") appears on
Monday, Tuesday and Thursday, and in two different menus. That needs a join
table, the same shape `drill_items` already has:

```
routine_items ( id, routine_id, video_id, position,
                loop_start_ms, loop_end_ms, speed, repeats )   -- like drill_items
```

and `videos.session_id` goes away. An exercise stands on its own; a routine
borrows it. Think of a cookbook: today every recipe owns its ingredients, so two
recipes that both need eggs each keep their own eggs. The library is a pantry.

> **Trade-off, decided here.** Keeping the 1:N shape would leave the admin
> untouched, but the same exercise on two days would mean uploading it twice and
> filling its beat grid twice, and the planner's library could not exist for
> curated content. The join table costs one table, one editor rewritten as a
> picker, and a simpler `can_access()`. Take the join table.

### The member's week reuses My drills as it is

Look at what `drills` / `drill_items` / `drill_slots` already do: a member's own
ordered list of videos, placed on weekdays, with `done_at` per slot, per-item
speed and loop, a player that plays a whole day (`dayPlaylist()`), and RLS that
refuses a video the member may not watch. That *is* the member's week. Two rules
make it the daily concept:

- **One drill per weekday.** A member's week is up to seven drills, one slot
  each. `drills.name` is the routine's title ("Footwork & timing").
- **"Use this menu" copies.** Each of the menu's routines becomes a drill with
  its `routine_items` copied into `drill_items`, and one slot on its weekday. The
  member then edits days freely; **Reset to menu** copies again.

Two columns make that traceable:

```
drills.routine_id   uuid null references routines   -- where this day came from
profiles.menu_id    uuid null references menus      -- this week's menu
profiles.menu_started_on  date null                  -- for "week 3 of 8"
```

No `weeks` table yet. History is `practice_events`; a member is always on one
menu at a time; "week 3 of 8" is the menu's position in its stage. If members
ever need a browsable past ("what did I do in March"), a `member_weeks` table is
the growth path, and nothing here blocks it.

### Tags and difficulty

```
videos.tags        text[] not null default '{}'   -- gin index
videos.difficulty  level_key not null default 'beginner'
videos.publish     publish_status not null default 'draft'
```

`tags` is `text[]` with the vocabulary in one app-side constant
(`EXERCISE_TAGS` in `lib/db.ts`: shoulders, body, hips, footwork, timing, turns,
arms, styling, shines, musicality, warm-up), bilingual labels beside it. Not a
Postgres enum: a new tag then costs a line, not a migration. Not free text
either: the filter chips need a known list, and a typo would make a tag nobody
can filter by. An optional check constraint `tags <@ EXERCISE_TAGS` can pin it
if it ever drifts.

`difficulty` reuses `level_key`. The rule from the old model stays: it describes
the exercise, not the dancer.

`videos.publish` is new because an exercise no longer inherits a publish status
from a session. `videos.status` stays what it is: the encoding state.

### The entitlement function gets simpler

`private.can_access(video)` today joins video → session → program to check
three statuses. With standalone exercises it reads one row:

```sql
select case
  when (select auth.uid()) is null then false
  when private.is_admin() then true
  else exists (select 1 from public.videos v
               where v.id = p_video and v.status = 'ready' and v.publish = 'open')
end;
```

The paywall clause lands in the same place as before. Routines and menus keep
their own `status` for the shelf; a draft routine can already hold open
exercises (you can practise them on your own day), and an open routine cannot
be started until every exercise in it is open — checked in the app, since RLS
already hides the rest.

### What gets dropped

- `method_step` enum, `videos.step`, `videos.is_drillable` (generated from the
  step; every exercise is drillable now), `DRILLABLE_STEPS`, and the
  `is_drillable` clause in the "own drill items" policy.
- `videos.session_id` and its index; `sessions.outcome_t` / `focus_t` fold into
  one `routines.blurb_t`; `programs.weeks` (a menu is one week).
- `saved_items`: never wired, and the daily concept has no "save for later".
- `profiles.goal` is kept as data but no longer asked; the register screen asks
  one question, experience, which the landing page's three chips already are.

### The schema after the move

```
-- curated (the back office writes; the shelf is public)
stages        ( id, slug, position, name_t, blurb_t )
menus         ( id, stage_id, slug, position, title_t, subtitle_t, promise_t,
                level, status draft|soon|open, is_free, cover_url, published_at )
routines      ( id, menu_id, weekday 0-6, position, title_t, blurb_t, status )
routine_items ( id, routine_id, video_id, position,
                loop_start_ms, loop_end_ms, speed, repeats )
videos        ( id, title_t, description_t, tags text[], difficulty, publish,
                angle, duration_ms, width, height,
                provider, provider_uid, hls_playback_id, mp4_url, poster_url, status,
                bpm, first_beat_ms, beats_per_phrase,
                default_loop_start_ms, default_loop_end_ms, mirror_default )
captions      ( unchanged )

-- members
profiles      ( ... + menu_id, menu_started_on )
drills        ( id, user_id, name, routine_id, created_at )      -- a day
drill_items   ( unchanged )
drill_slots   ( unchanged: weekday, done_at )
practice_events, video_progress ( unchanged )
```

`routines.weekday` is nullable on purpose: a menu's routine has a weekday; a
one-off routine (a "Got 5 minutes?" quick drill is just a one-item routine with
no menu) does not.

---

## 3. What stays as it is

These are the bricks. None of them needs to know the concept changed.

| Brick | Why it survives |
|---|---|
| **The player** (`components/Player.tsx`, `player.css`) | It takes a playlist, not a video, and a routine is a playlist. Speed, loop, mirror, counts, wake lock, full screen, keyboard: untouched. Two small edits, in §5. |
| **Upload, webhook, signed playback** (`lib/cloudflare.ts`, `lib/playback.ts`, `app/api/stream/webhook`, `UploadField`) | All keyed on `videos.id` and `provider_uid`. Nothing else. |
| **Auth and sessions** (`app/(auth)`, `proxy.ts`, `lib/supabase/*`, `lib/safe-next.ts`) | Unchanged. |
| **RLS as the only gate**, `private.can_access()`, `private.is_admin()` | Same pattern; one function body gets shorter. |
| **The admin console** (`app/admin/*`) | The tree, breadcrumbs, sidebar search, status switch, up/down reordering, `swap_position()`, `LocalizedField`, the video editor with the beat grid: all kept. Labels change; one editor becomes a picker; one list screen is added. |
| **My drills** (`lib/drills.ts`, `app/(app)/drills/actions.ts`, the three `own …` policies) | Becomes the member's week with two columns added. `dayPlaylist()` is already "play today". |
| **Bilingual by construction**, `Copy<K>`, `useLang()`, the `*_t` columns | Unchanged. The mockups are English only; the build is not. |
| **The design system** (`app/globals.css`) | Kept; the mockups' white ground and rounder cards are a token pass, not a rewrite. |
| **Practice events** schema and the P4 plan | Unchanged, and now more valuable: streak, minutes and "Done" on a day all come from it. |
| **CI without secrets**, `lib/supabase/config.ts` guarding every call | Keep. |

---

## 4. What goes

- **`public/prototype/` entirely.** The landing page becomes a real route (§6),
  and `plan.html`, `session.html`, `training.html`, `program.html` and their
  `assets/` have no successor. The `/` rewrite and the `/prototype/index.html`
  redirect in `next.config.mjs` go with them, and so does the `prototype`
  exclusion in `proxy.ts`.
- **The catalogue screens:** `/masterplan`, `/programs/[slug]`,
  `/sessions/[id]` and their CSS. A public shelf of menus can come back later
  as `/menus` if it is wanted for search engines; it is not needed to launch.
- **`lib/content.ts` as a catalogue** (798 lines). Keep `Lang`, `Localized`,
  `t()`, `LANG_COOKIE`, `LEVEL_LABELS` in a small `lib/i18n.ts`; delete the
  static areas, the six step definitions, `stepOf()`, `videosOfStep()`,
  `stepsPresent()`, `videoCount()` and `STATE`. `lib/catalogue.ts` becomes
  `lib/menus.ts`.
- **Everything six-step:** `StepStrip`'s colours and legend, `[data-step]`
  variables in `admin.css`, `.steps` under the player, the step select in two
  editors, `METHOD_STEPS`, speed remembered per step.
- **`supabase/seed.sql`** and the 37 placeholder programs it plants. That copy
  stays in git history; the first real menus are written in the back office.

---

## 5. The screens after the move

| Route | What it is | Built from |
|---|---|---|
| `/` | the landing page | `daily-landing.html`, as a Next page under `app/(marketing)/` with its own layout (no member nav) |
| `/today` | home: greeting, streak, the player with today's routine, "Got 5 minutes?" | `daily.html`; `dayPlaylist(today)` from the member's slots |
| `/week` | this week's menu, the library, the seven days | `daily-week.html`; replaces `/drills` |
| `/day/[weekday]` | play any day | the existing `/drills/day/[weekday]`, moved |
| `/register`, `/signin` | unchanged, one onboarding question | |
| `/admin` | the tree: stages → menus → routines | relabelled |
| `/admin/exercises` | **new**: the library with tag filters, upload here | the list half of `DrillsView`'s dialog, server-rendered |
| `/admin/exercises/[id]` | the exercise editor: title, tags, difficulty, publish, beat grid | today's video editor minus the step select |
| `/admin/routines/[id]` | the routine editor: pick exercises from the library, order them, per-item speed and repeats | the picker half of `DrillsView`'s dialog |
| `/admin/menus/[id]`, `/admin/stages/[id]` | today's program and area editors, relabelled | |

**The nav** is Today · Week · Library · Progress, and the rule stands: no item
points at `#`. Library and Progress are not in the first cut, so the bar starts
with two items and grows. On a phone it becomes the bottom tab bar from the
mockups.

**The player, two edits.** The label over the picture shows the exercise's
first tag and difficulty instead of the step name. Speed is remembered once,
globally, with the per-item override that `drill_items.speed` already carries;
the per-step memory was there because WATCH wanted 1× and DRILL wanted 0.75×,
and there is no WATCH any more. The strip under the player is the playlist's
entries sized by length, one colour, the current one dark: `daily.html` shows it.

**Signed out**, `/today` and `/week` send you to sign in with `signInHref()`,
as `/drills` does today.

---

## 6. The order of work

Eight steps, each a pull request that leaves `main` building and the live site
usable. Sizes are for one developer. The rule from BUILD-PLAN §2 holds: the
back office comes before the member screens, because the first real menus have
to be written somewhere before Today has anything to show.

| # | Ships | Size | Notes |
|---|---|---|---|
| **1** | **Schema and types.** One migration: rename the three tables, add `routine_items`, `tags`, `difficulty`, `publish`, `drills.routine_id`, `profiles.menu_id`; drop `step`, `is_drillable`, `session_id`, `saved_items`; rewrite `can_access()` and the "own drill items" policy; regenerate `swap_position()`'s whitelist. `lib/db.ts` follows in the same PR. | 2 days | The seed catalogue is placeholders; see §7 for what is kept. `npm run typecheck` will fail loudly everywhere `step` was read: that list is the to-do for steps 2–5. |
| **2** | **The exercise library in the admin.** `/admin/exercises` (list, tag chips, search, upload), the exercise editor with tags / difficulty / publish. Upload moves here from the session editor. | 3 days | The beat-grid panel and `UploadField` are reused as they are. |
| **3** | **Routines and menus in the admin.** The routine editor becomes a picker over the library; the tree is relabelled; `StepStrip` becomes a one-colour length strip. | 3 days | Borrow `DrillDialog` from `DrillsView.tsx` for the picker: tap to add, arrows to order, the same video allowed twice. |
| **4** | **The reading side.** `lib/menus.ts` (stages, menus, routines with items), `lib/week.ts` (from `lib/drills.ts`: the member's week, the library of every open exercise, `useMenu()`), `routinePlaylist()` in `lib/playlist.ts`. | 2 days | `dayPlaylist()` is unchanged. |
| **5** | **`/week`.** The menu cards, "Use this menu" (copy) and "Reset to menu", the seven days, add / remove / reorder per day, the library as a panel on desktop and a bottom sheet on a phone. | 4 days | Tap-to-add and arrows first, as My drills does today. Pointer-event drag is the follow-up, not the launch. |
| **6** | **`/today`.** Greeting, streak (a placeholder until P4), the player with today's routine, the quick drills row. | 2 days | The player is embedded, not linked: the mockup shows it in the page. |
| **7** | **The front door and the clean-up.** The landing page as a route; delete `public/prototype/`, the rewrite, the old catalogue routes and `lib/content.ts`'s catalogue; the nav; redirects from `/masterplan` and `/drills` to `/today` and `/week`. | 2 days | Vercel preview first, then merge; the old URLs keep working through the redirects. |
| **8** | **Docs and seed.** `CLAUDE.md` rewritten for the new vocabulary, a short addendum in `BUILD-PLAN.md` pointing here, a `seed.sql` that plants two real menus for a fresh database. | 1 day | |

**About four weeks** before P4. Then P4 (practice events → streak, minutes,
`done_at`) is the same week it always was, and lands on `/today` rather than a
dashboard that no longer exists.

Steps 2 and 3 can be one PR if the admin is easier to review whole. Steps 5 and
6 can swap: Today is smaller and shows the concept sooner, but it shows an empty
day until Week can fill one.

---

## 7. Migrating what is in the database

What the live project holds today: the seeded catalogue (37 programs, nine
sessions of placeholder videos with no footage), a handful of real uploads
(Pachanga 01 and whatever followed), profiles, and no practice events yet.

- **Placeholder rows are deleted, not migrated.** They were generated from
  `lib/content.ts` and have no footage. The migration deletes every video with
  `provider_uid is null` before it drops `session_id`.
- **Real uploads are kept.** Every video with a `provider_uid` stays, with
  `tags = '{}'`, `difficulty = 'beginner'`, `publish = 'draft'`, and its beat
  grid, loop and mirror default intact. They reappear in `/admin/exercises`
  as drafts to tag.
- **Sessions, programs and areas** are renamed with their rows; the only ones
  worth keeping are those an upload sat in, and even those are simpler to
  re-create as menus in the back office. The migration is free to truncate
  them after the videos are detached. Say which in the PR.
- **Drills** are kept: a member's drill of real uploads is still a valid day.
  Their slots keep `done_at`.

The migration runs by hand through the Supabase MCP or CLI, as every migration
here has, in one transaction. Take a backup first from the dashboard; it is the
one migration in this project that deletes.

---

## 8. Decisions to make before step 1

Each of these changes what gets built. The recommendation is first.

1. **Rename the tables, or keep the names and change the meaning?**
   *Recommended: rename.* `alter table … rename` is one line each, foreign keys
   follow, and the code that reads them is rewritten in steps 2–5 anyway. The
   cheaper path — keep `programs` and call it a menu in the interface — is
   cheaper for a week and confusing for years.
2. **Keep stages?** *Recommended: yes.* The mockups need "week 3 of 8 ·
   Foundations" and "the road ahead". The admin tree already has the level; it
   costs nothing to keep and a lot to add later.
3. **The tag vocabulary.** The list in §2 is a proposal. It should be settled
   with whoever films, because tags are what the planner filters by and what a
   menu's theme is made of. Ten to twelve is the right size; more than that and
   the chips stop being a filter.
4. **Where "Got 5 minutes?" comes from.** *Recommended: a menu with no stage,
   named Quick drills, whose routines are one exercise each.* No new table; the
   admin edits it like any menu; `/today` reads it by slug.
5. **The name.** The mockups say "suim. daily"; the domain is salsadrill.com.
   Step 7 touches every place the wordmark appears, so it is the cheapest moment
   to decide. The rename is the eight files BUILD-PLAN already counted.
6. **Korean at launch** is still the open question from BUILD-PLAN §9, and it
   still decides Kakao login. Nothing here makes it harder: every new `*_t`
   column is bilingual by construction.

---

## 9. Two risks worth planning around

- **Filming, again.** The concept needs many short clips rather than nine long
  sessions: a first menu is 5–6 routines of 3–4 exercises, so 15–25 clips of
  2–5 minutes, each with a beat grid. That is less footage than one old module
  but more separate files. The library screen (step 2) is what makes ingesting
  them bearable; build it before filming starts, as P2 was.
- **Two products for a while.** Between step 1 and step 7 the live site is the
  old catalogue on a renamed schema. Nothing breaks (the redirects in step 7
  are what retire the old URLs), but the masterplan will show whatever the
  migration left in `menus`. Either truncate it in step 1 and accept an empty
  shelf, or keep it and accept an odd one. Truncating is simpler.
