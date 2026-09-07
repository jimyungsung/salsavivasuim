# SUIM — working notes

Solo salsa training platform. **The plan lives in [docs/BUILD-PLAN.md](docs/BUILD-PLAN.md)** —
read it before starting anything structural; it carries the phase order, the
schema, and the player specification.

Currently in **Phase 1**. The Supabase project is **Salsaviva Suim**
(`incumqqgmueyovtzvenl`, ap-northeast-2 / Seoul): all six migrations are applied
and the catalogue is seeded — 7 areas, 37 programs, 9 sessions, 55 videos, none
with footage. Sign-up and sign-in are built and the screens are live against it,
but the email round trip has not been exercised: the magic link needs the
redirect allowlist set and real SMTP wired. The catalogue is the one screen
ported; the rest of the prototype still serves from `public/prototype/`.

`lib/supabase/config.ts` still guards every call, so the app renders without
`.env.local` rather than crashing. Keep that until the env vars are a deployment
requirement.

## Vocabulary

**Area** (Improvisation) → **program / module** (Improvisation 01) → **session**
(nine of them, 15–22 min) → **video**.

The method is six steps, and they run in this order:

    WATCH → UNDERSTAND → TRAIN → DRILL → TRANSFORM → IMPROVISE

**A session is an ordered list of videos, each tagged with one step. It is not
six videos, one per step.** A session may have no UNDERSTAND video, or two TRAIN
videos, or three IMPROVISE ones. The steps are the vocabulary — what a video is
*for* — not a set of slots. Never write `of 6`, never index a video by its step,
never assume a step is present: read `session.videos`, and use `videosOfStep()`,
`stepsPresent()` and `videoCount()` from `lib/content.ts`.

Only `train` and `drill` are drillable — the others explain, transform or
improvise, none of which you repeat on a loop. In the database that is a
generated column, so it always follows the step.

**Levels** are `all · beginner · intermediate · advanced · pro`, and the scale is
deliberately not a ladder: a level describes the material, not the dancer, so a
session can sit in two at once and session 05 can be gentler than session 04.

## Layout

    app/                  the Next.js app (App Router)
      layout.tsx          reads the language cookie, loads the design system
      page.tsx            / → redirects to the un-ported landing page
      globals.css         the design system — canonical copy
      masterplan/         the catalogue, the first screen ported
    components/AppNav.tsx the signed-in nav, rendered by every app screen
    lib/content.ts        the catalogue as typed data — the seam that becomes
                          Supabase queries in P1
    lib/lang.tsx          the EN/KO switch
    public/prototype/     the original static prototype, still serving the
                          screens that have not been ported
    docs/BUILD-PLAN.md    the plan
    supabase/migrations/  the schema, RLS and the entitlement function
    supabase/seed.sql     the catalogue, generated from lib/content.ts
    lib/supabase/         browser, server and middleware clients
    app/(auth)/           register and sign in

## Conventions

- **Bilingual by construction.** Every content string is `{ en, ko }` — the shape
  of the `jsonb` columns in the P1 schema. Read it with `T()` from `useLang()`,
  never `value.en`. Page copy that is not content goes in a `Copy<K>` object at
  the top of the screen that uses it, both languages side by side.
- **The design system is plain CSS, and it stays that way.** No Tailwind, no
  CSS-in-JS. Shared rules live in `app/globals.css`; a screen's own rules live
  next to it and are scoped under one wrapper class (`.mp` for the masterplan) so
  they cannot leak into screens ported later.
- **Nav items are sections, not pages.** "Masterplan" stays current for the
  catalogue, a module and a session, because drilling in never leaves that
  section. Screens below the top level show one `.crumb` back link naming the
  screen above them. Never add a nav item pointing at `#`.
- **Only Improvisation 01 navigates.** The other 36 programs give the catalogue
  realistic depth but are not links — they would all land on the same module,
  which reads as a broken link.
- **The prototype under `public/prototype/` is frozen.** Its `assets/app.css` is
  a dead copy; edit `app/globals.css` instead. Delete a prototype screen when its
  replacement lands, and update the links pointing at it.

## Access

RLS is the only thing that decides access — never a check in the interface, and
never the `suim-member` flag in localStorage. Every gate goes through
`private.can_access(video_id)`, which is also where the paid tier will land;
today it asks only whether you are signed in and the material is published.

The helpers live in the **`private` schema on purpose**: PostgREST exposes only
`public`, so a `SECURITY DEFINER` function there would be callable as
`/rest/v1/rpc/...`. `anon` and `authenticated` still hold EXECUTE on them,
because an RLS policy expression runs as the querying role. Put any new
definer-style helper in `private` too, and keep `get_advisors` clean.

`profiles.plan` and `profiles.role` are deliberately not self-updatable.

The catalogue is public to anyone, signed in or not — that is the marketing
surface. What is gated is `videos`, because a video row carries its playback ids.

## Two things not to get wrong later

- **Minutes practised is wall-clock, not media time.** Four minutes of footage at
  0.5× is eight minutes of practice.
- **The player takes a playlist, not a video.** A session is its videos in order;
  a drill is a different set of entries. Building it any other way means
  rebuilding it — and a playlist is the shape that survives sessions of different
  lengths.

## Running it

```bash
npm run dev
```

<http://localhost:4478> — `/` lands on the prototype flow, `/masterplan` is the
ported screen. `npm run typecheck` before committing.

## Still to decide

Five open questions at the end of `docs/BUILD-PLAN.md` §9. The live ones are the
video host, whether Korea is a launch market (decides Kakao login), and when
filming starts.
