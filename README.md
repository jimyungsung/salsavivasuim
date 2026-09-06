# SUIM

Solo salsa training, built around practice.

The plan for what gets built next, in what order, is **[docs/BUILD-PLAN.md](docs/BUILD-PLAN.md)**.
Working notes for anyone (or anything) editing this repo are in [CLAUDE.md](CLAUDE.md).

## Where the project is

**Phase 0 is done and Phase 1 is under way.** The repo is a Next.js app, the
schema is written and validated, and sign-up and sign-in are built. The catalogue
is the one screen ported; the rest of the prototype still serves, unchanged, from
`public/prototype/`.

    app/masterplan          the catalogue — ported
    app/(auth)              register and sign in — built, not yet connected
    supabase/migrations     the schema, RLS and the entitlement function
    public/prototype/       everything else — still the original static files

The Supabase project has not been created yet, so nothing has run against a real
database: the auth screens render and say so. Nothing plays either — every video
is a placeholder until Phase 3.

## Run it

```bash
npm install
npm run dev
```

<http://localhost:4478> — `/` hands off to the prototype landing page, and
`/masterplan` is the ported screen. `npm run typecheck` and `npm run build`
before you commit. The Claude Code preview pane starts the same server:
`.claude/launch.json` defines a `suim` configuration on the same port.

## The flow

    index → register → masterplan → plan → session
    landing  account    catalogue    module  the session
                                        ↘ program
                                          module explainer

- **index** — the public landing page. Every CTA goes to register. One
  self-contained file — inline CSS and JS, photos as base64 — so it can be shared
  on its own. It is ported last, not first, to keep that property as long as
  possible.
- **register** (`/register`) — account plus the three onboarding questions, which
  travel as sign-up metadata and land in `profiles`. `/signin` is the same screen
  without the questions, and it will not create an account, so a mistyped address
  cannot become a second empty one.
- **masterplan** (`/masterplan`) — **what you see right after registering.** A
  quiet left rail of the seven training areas, and an editorial grid of the
  programs inside the selected one. Built to stay readable as the catalogue grows:
  the rail scrolls, the grid is `auto-fill`, and a status filter plus an
  "All programs" view keep 37 programs navigable. Area and filter live in the URL,
  so a view can be linked to.
- **plan** — one module (Improvisation 01) as a grid of sessions tagged by level,
  with a level filter.
- **session** (`?s=1…9`) — one session: the player, the step bar and the session's
  videos. Playback controls are icons overlaid on the video itself. Still the
  prototype, and it still assumes six videos — the real one is Phase 3.
- **training** — **My training**, the personal view: four stat tiles, where you
  left off, what you saved, the drills waiting in your week, and a feed of
  recently practised videos.
- **drills** — **My drills**, a layout mockup of a feature that does not exist
  yet. Your saved drills beside a Monday-to-Sunday column of drop zones.
- **program** — the module *explainer* (promise, method, full plan, coach). Reads
  like a sales page, so it sits off to the side.
- **masterplan-v1** — the previous tabbed catalogue, kept for comparison. Not
  linked from anywhere.

## Vocabulary

**Area** (Improvisation) → **program / module** (Improvisation 01) → **session**
(nine of them, 15–22 min each) → **video**.

The method is six steps, and they run in this order:

    WATCH → UNDERSTAND → TRAIN → DRILL → TRANSFORM → IMPROVISE

A session is an **ordered list of videos**, each tagged with one of those steps —
not six videos, one per step. A session may skip a step entirely or use one
several times: session 06 has two TRAIN videos, session 09 has no UNDERSTAND and
two IMPROVISE. The steps describe what a video is for, not how many there are.

Sessions carry one or more of **All level · Beginner · Intermediate · Advanced ·
Pro**, and the scale is deliberately not a ladder: session 05 is All level +
Beginner while session 04 before it is All level + Intermediate. A level describes
the material, not the dancer, so a session can sit in two at once.

## Navigation

Every signed-in screen renders the same bar from `components/AppNav.tsx` —
**Masterplan · My training · My drills**, logo to the masterplan, language switch
and member chip — so it cannot drift. The bar only lists screens that exist; there
are no placeholder items pointing at `#`.

The items are sections, not pages. **Masterplan** stays current for everything
beneath it — the catalogue, a module, a session, a module explainer — because
drilling in never leaves that section. Screens below the top level show one back
link (`.crumb`) naming the screen above them.

## Contents

    app/                  the Next.js app (App Router)
      globals.css         the design system — the canonical copy
      masterplan/         the catalogue
    components/AppNav.tsx the signed-in nav
    lib/content.ts        the catalogue as typed data, every string { en, ko }
    lib/lang.tsx          the EN/KO switch
    lib/supabase/         browser, server and middleware clients
    app/(auth)/           register and sign in
    supabase/migrations/  the schema, RLS and the entitlement function
    docs/BUILD-PLAN.md    the plan
    public/prototype/     the original static prototype

`lib/content.ts` is the seam: its text fields already have the shape of the
`jsonb` columns in the Phase 1 schema, so replacing it with Supabase queries does
not change the components above it.

The prototype's own `assets/app.css` is a frozen copy that serves the un-ported
screens — edit `app/globals.css` instead. The two self-contained pages (index,
program) carry their own inlined copy by design and are matched by hand.

## Notes

- **Languages:** EN / KO toggle in the nav. The choice is kept in a cookie so the
  server can set `<html lang>` before the first paint, with `localStorage` and
  `?lang=ko` still honoured. In Phase 1 the cookie is seeded from `profiles.locale`.
- **Nothing plays.** Every video is a hatched placeholder. The overlay controls
  (play, speed, loop, mirror, counts, captions, full screen) only change their own
  state, though mirror does really flip the frame and speed cycles through
  0.5× / 0.75× / 1× / 1.25×. The real thing is specified in the build plan §5.
- **Accounts are built but not connected.** Sign-up, sign-in, the callback and
  sign-out are all written; they need a Supabase project and the two
  `NEXT_PUBLIC_SUPABASE_*` values in `.env.local`. Until then the screens render
  and say plainly that accounts are not switched on.
- **My drills is a mockup.** The path works — open the dialog, filter by type,
  drag videos into the drill with the total updating, save under a name, drag the
  drill onto a day — but nothing persists. Dragging also needs a mouse: HTML5 drag
  and drop does not fire on touch, so tapping a video adds it as a fallback.
- **Progress is hard-coded** in `lib/content.ts` (`STATE`) to someone who just
  subscribed: session 1 in progress, 2 of its videos done. `RECENT`, `SAVED` and
  `PRACTISED` alongside it drive the dashboard. Change them to see the pages in a
  different position.
- **Only Improvisation 01 is built out**, and it is the only card on the
  masterplan that navigates. The other 36 programs give the catalogue realistic
  depth but are not links, because they would all land on the same module.
- **Guest programs are not named after real people.** They are labelled by
  discipline (Body Percussion, Cuban Son Roots) rather than by an invented guest.
- **Pricing** ($16 monthly, $140 annual) on the landing page is the indicative test
  range from the PRD, not confirmed pricing.

## Deploying

Vercel, from `main`. The old GitHub Pages setup served the repository root as
static files; that stops working once this branch lands, because the HTML moved
under `public/prototype/`.
