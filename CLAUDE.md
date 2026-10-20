# Everyday Salsa — working notes

Solo salsa training, a routine a day. The product is **Everyday Salsa**; the
code, the repo and the Supabase project still say SUIM, and that is fine. **The plan for this concept lives in
[docs/DAILY-PLAN.md](docs/DAILY-PLAN.md)**; the original build plan, still
right about the stack, the player and the delivery chain, is
[docs/BUILD-PLAN.md](docs/BUILD-PLAN.md). Read them before anything structural.

**Where the move stands.** The code on this branch is the daily concept end to
end, and the migration `20260928120000_daily.sql` **is applied to the live
database** (28 September 2026), with `supabase/seed.sql` run after it: one
stage, two draft menus of six routines, the quick-drills menu, and the three
Pachanga clips kept as draft exercises to tag. A JSON
copy of the old catalogue was taken before the migration; the placeholder
programs are also in git history (`supabase/seed.sql` before this branch).

The site is at [salsadrill.com](https://www.salsadrill.com) on Vercel (project
`veriveri/salsavivasuim`), `www` canonical. The Supabase project is **Salsaviva
Suim** (`incumqqgmueyovtzvenl`, ap-northeast-2 / Seoul). Functions are pinned to
Seoul (`icn1` in `vercel.json`).

What works end to end: sign-in by magic link, an admin promoted by hand, upload
straight to Cloudflare Stream from the browser (resumable, by tus), a
signature-verified webhook writing duration, poster and customer code back to
the row, signed playback, and the practice player (speed with pitch kept, a
frame-accurate loop, mirror, counts off a beat grid, wake lock, full screen).

## Vocabulary

**Stage** (Foundations, eight weeks) → **menu** (a themed week: "Shoulders &
body movement") → **routine** (one day, 10–15 min) → **exercise** (one short
clip, 2–5 min). An exercise is uploaded once, tagged, and **borrowed** by any
number of routines through `routine_items`; it belongs to none of them.

The table behind an exercise is still `videos`: the whole delivery chain
(webhook, signed playback, upload, RLS, the foreign keys from practice and
drills) keys on it. The product says exercise; the code says video.

An exercise carries **tags** (`text[]`: what it works, from `EXERCISE_TAGS` in
`lib/i18n.ts`) and a **difficulty** (`level_key`). The six method steps are
gone from the data; every exercise is something you repeat. **Levels** describe
the material, not the dancer, and are not a ladder.

**A new member starts on a week, not a choice.** Onboarding asks one
question, stored as `profiles.start_point` (the old experience/timing/goal are
kept as data, no longer asked). The first sign-in copies the starting menu
into the week (`startFirstWeek` in `lib/week-copy.ts`, called from
`/auth/callback`); `startingMenu()` in `lib/menus.ts` picks it — the first open
menu of the earliest stage — and Today shows the same menu as a one-tap card if
the copy could not happen. Done is on Today: under the greeting, and on the
card the player shows after the last exercise (`finish`); the player's `empty`
slot is how Today puts its sign-up and first-week cards where the player goes.

**Practice is logged as it happens** (BUILD-PLAN §5). The player
(`components/usePracticeLog.ts`) reports `play`, a `heartbeat` every fifteen
seconds of playback, `loop` per lap and `complete` at 90% watched, in batches to
`/api/practice` (a route, so `sendBeacon` can flush it as the page goes away).
Minutes are **wall-clock**: a heartbeat carries the time that passed, so footage
at 0.5× counts double. Rows go in as the member, so "log own practice" (own id,
`can_access`) decides. A trigger keeps `video_progress` from the log.
`practice_days(tz)` sums the caller's log per local day (security invoker, so
RLS applies); `lib/progress.ts` turns that into the streak (a day needs a
minute; the streak ends today, or yesterday until today is practised), minutes
this week and today. Today says "5 days in a row. You've practised 12 of this
week's 83 minutes"; the planner shows practised against planned.

**A member's week is My drills under the hood** (`lib/week.ts`): a `drill` is
one day — its exercises in order, each with its own loop, speed and repeats —
and a `drill_slot` is the weekday it sits on, with `done_at`. "Use this menu"
copies the menu's routines into drills, one per weekday, and remembers the
menu on `profiles.menu_id`. `drills.routine_id` says where a day came from, so
"Reset to menu" can copy again.

**The player takes a playlist** (`lib/playlist.ts`): a routine or a day are one
shape, entries of `{ video, repeats, speed }`. Anything new the player plays is
another builder, not another player. Speed is remembered once, globally, and
**the member's choice wins**: an item's own speed is only the starting point
until they have picked one. A day's page has no back link to itself (Today is
home; `Playlist.back` can be null).

## Layout

    app/
      page.tsx, LandingView.tsx, landing.css   the front door, both languages
      layout.tsx          reads the language cookie, loads the design system
      globals.css         the design system — plain CSS, no framework
      (app)/              member screens. Its layout holds the nav
        today/            home: today's routine in the player
        day/[weekday]/    any day; DayPage.tsx is shared with /today
        week/             the planner: menus, the library, the seven days
        routines/[id]/    a curated routine played as is (quick drills, previews)
        actions.ts        getPlayback(), the player's way to ask for a URL
      admin/              the back office: stages → menus → routines, and
                          exercises/ (the media library, where footage arrives)
      (auth)/             register and sign in
      api/stream/webhook  Cloudflare's callback
    components/Player.tsx the player, player.css beside it; `above`/`below`
                          slots for what a page puts around it
    lib/i18n.ts           Lang, Localized, levels, tags, weekdays
    lib/db.ts             row types and enums
    lib/menus.ts          the curated side: getMenus(), getRoutine(), getLibrary()
    lib/week.ts           the member's week: getWeek(), getCurrentMenu(), dayPlaylist()
    lib/playlist.ts       the Playlist shape, routinePlaylist(), the length sums
    lib/playback.ts       every signed URL and thumbnail is minted here
    lib/member.ts         getMember() — chrome only; never an access check
    lib/clock.ts          the member's today, hour and week start, in their time
                          zone (a cookie TimeZoneSync sets; Seoul until then).
                          Never new Date() for "today" on the server: it is UTC
    lib/safe-next.ts      the one check on a `next` return path; signInHref()
    supabase/migrations/  the schema, RLS and the entitlement function
    supabase/seed.sql     a starting catalogue for a fresh database
    public/mockups/       the three static mockups the screens were built from
    docs/                 the plans

## Conventions

- **Bilingual by construction.** Every content string is `{ en, ko }`, the
  shape of the `jsonb` columns. Read it with `T()` from `useLang()`, never
  `value.en`. Page copy that is not content goes in a `Copy<K>` object at the
  top of the screen, both languages side by side.
- **The design system is plain CSS.** Shared rules in `app/globals.css`; a
  screen's own rules beside it, scoped under one wrapper class (`.wk` for the
  planner, `.td`/`.tq` for Today, `.ld` for the landing page, `.bo` for the
  back office). The ground is white with two accents: lime for actions and active states, a warm red (`--red`) for the wordmark's dot, kickers, "today" markers and small emphasis; the nav is a light bar (64px) with the
  current section as an ink pill, and on a phone (under 900px) the links move
  to a tab bar at the bottom. `.wrap` carries `margin:auto`, so inside a flex
  column give a page's main `margin:0 auto` or it centres vertically.
- **Nav items are sections, not pages.** Today stays current for any day and a
  routine played from it; My week for the planner. Never add an item pointing
  at `#`. **Admin** appears only for admins; signed out, the chip is Sign in.
- **Every way into sign-in carries where you were.** Link with
  `signInHref(path)`, never a bare `/signin`. Pass any `next` through
  `safeNext()` — it is attacker-controlled.
- **The planner shows a day as one row** (theme, minutes, done, Play) and
  opens it to edit; Done is ticked on Today, not here. A day's theme is its
  routine's `title_t`, in both languages. Levels are never set by hand:
  `levelSpan()` works them out from the exercises' difficulty.
- **Adding is a tap, not a drag.** HTML5 drag does not fire on touch, and a
  phone in a practice room is the likely device. The planner's library has
  "Add to <day>" buttons; the arrows order a day.
- **A day is done this week, not forever.** `done_at` stays on the slot;
  `getWeek()` counts it only from this week's Monday, in the member's zone.
  A menu's routines hold one weekday each (unique index); moving one onto a
  taken day swaps the two.
- **Old addresses redirect** (`next.config.mjs`): `/masterplan`, `/programs`,
  `/sessions`, `/drills`, `/prototype` land on their successors.

## The back office

`/admin` is a sidebar and a work area under the site's own nav (English only).
The sidebar is the whole catalogue: **Media library** first (drop several
files and each becomes an exercise named after the file; rename in place;
delete, blocked while a routine uses it; tag and footage filters), then
stages → menus → routines. A routine's editor is a **picker**: the library
beside a numbered running order, a tap appends, each row has its own speed
and repeats. Footage, tags, difficulty, publish and the beat grid are edited
on the exercise. **A week is published once, from its menu** ("Publish week",
`publishWeek()`): it checks the week (`app/admin/readiness.ts`: an empty day or
an exercise without footage blocks; missing Korean or an odd length warns),
then opens the exercises, the day routines and last the menu. Every way of
opening a menu goes through it, the overview's dropdown included. Routines and
exercises are draft or open; only a menu can be "soon", which members see as a
card with nothing to start. "+ New week" lays out one routine per chosen day,
named after it; whatever you create opens straight away. The media library
edits a ticked selection together (tags, difficulty, mirror, open/draft). A menu's page is
a **week builder**: its days as rows, each day's exercises running left to
right as cards, the library (`app/admin/Picker.tsx`, shared with a routine's
page) beside them; pick a day, tap exercises to append. Titles (a menu's, a
routine's, a stage's, a day's theme) are edited in place with a pencil
(`EditableTitle.tsx`, both languages). The sidebar adds a stage ("+ New stage")
or a week inside one ("+ New week", Mon–Sat), and opens what it made.
Adds are optimistic and saved in order behind. The beat grid is set **by ear**
on the exercise (`BeatTapper.tsx`): tap tempo, first beat here, a click on the
beat to check it, loop these eight counts; the number fields stay for nudging. `LengthStrip` draws a menu's routines
sized by length, one colour, hatched until footage lands.

Scope admin classes under `.bo` and check `app/globals.css` for the name first.

`revalidateCatalogue()` in `app/admin/actions.ts` clears `/admin`, `/week` and
`/today` on every write, bluntly on purpose.

## Access

RLS is the only thing that decides access — never a check in the interface.
Every gate goes through `private.can_access(video_id)`, which now reads one
row: signed in, `videos.status = 'ready'`, `videos.publish = 'open'`. The paid
tier lands there and nowhere else. Helpers live in the `private` schema so
PostgREST cannot expose them; `anon` and `authenticated` still hold EXECUTE
because policies run as the querying role.

`profiles.plan` and `profiles.role` are not self-updatable; `menu_id` and
`menu_started_on` are. Signing out is `scope: 'local'`.

Menus and routines are public to read when not draft (the marketing surface).
What is gated is `videos`, because a row carries its playback ids. Playback is
signed in `lib/playback.ts` after an ordinary RLS select. Never use
`videos.poster_url` in the member app: it is unsigned and answers 401.

`routine_items.video_id` is ON DELETE RESTRICT: an exercise a routine still
uses cannot be deleted, so a routine members are on is never quietly
shortened. `drill_items` cascades, as members' own rows always did.

## Not built yet

- **A Progress page.** The log is there and Today and the planner read it; a
  page of its own (weeks, minutes per day, what has been practised most) is not.
- **Done is still the member's tick** (`drill_slots.done_at`), not worked out
  from the log; the "That's today" card is where it is offered.
- **Pointer-event drag** in the planner; tap-to-add is the launch.
- **Progress** and **Library** as nav sections; the bar has Today and My week.
- The name in the code and the infrastructure is still SUIM; the domain is
  salsadrill.com. Only what a member reads says Everyday Salsa.

## Running it

```bash
npm run dev
```

<http://localhost:4478>. `npm run typecheck` before committing; CI runs
typecheck and build on every pull request and push to main, with no secrets —
the app has to keep building without an environment (`lib/supabase/config.ts`
guards every call). Vercel builds a preview for every branch; review there and
merge; do not push to main.
