# SUIM — working notes

Solo salsa training platform. **The plan lives in [docs/BUILD-PLAN.md](docs/BUILD-PLAN.md)** —
read it before starting anything structural; it carries the phase order, the
schema, and the player specification.

**Phase 3 is done and live.** The site is at
[salsadrill.com](https://www.salsadrill.com) on Vercel (project
`veriveri/salsavivasuim`), `www` canonical with the apex redirecting to it. The
Supabase project is **Salsaviva Suim** (`incumqqgmueyovtzvenl`, ap-northeast-2 /
Seoul); eleven migrations are applied. Functions are pinned to Seoul too (`icn1`
in `vercel.json`) — in the default `iad1` every query crossed the Pacific.

What works end to end: sign-in by magic link, an admin promoted by hand, upload
straight to Cloudflare Stream from the browser (resumable, by tus, so
any size — the simple upload stopped at 200 MB), a signature-verified webhook
writing duration, poster and customer code back to the row, and the masterplan
rendering the catalogue out of the database — so what the back office publishes
is what the public shelf shows.

Ported so far: `/masterplan`, `/programs/[slug]` (a module), `/sessions/[id]`
(a session and its player), `/drills` (My drills, with `/drills/[id]/play` and
`/drills/day/[weekday]`), `/signin`, `/register`. Everything else still serves
from `public/prototype/` — the landing page at `/` by rewrite, the rest by their
own URLs.

**The player takes a playlist** (`lib/playlist.ts`): a session, a drill, or a
day of drills are all the same shape — entries of `{ video, repeats, speed }`
with a title, a back link and a next link — and `components/Player.tsx` plays
any of them. The selection is an entry index, because a drill can hold the same
video twice. `sessionPlaylist()` is pure; `drillPlaylist()` and `dayPlaylist()`
live in `lib/drills.ts`.

The player is the prototype's session screen made real: controls over the
picture, a scrub bar with the loop zone and phrase marks, the session's parts in
a strip with where each falls in the session, signed thumbnails down the side.
Speed keeps pitch and is remembered per step; the loop is checked every frame
off `requestVideoFrameCallback`, with `timeupdate` as the net for a hidden tab;
mirror flips only the picture, never the controls; a finished video hands on to
the next; a wake lock holds while playing; keyboard shortcuts per BUILD-PLAN §5.

**The phrase marks, the counts overlay and "loop eight counts" need a beat
grid** — bpm and first beat, set in the back office's video editor (the
"Beat grid" panel, folded closed until a video has one). No video has
one yet, so today the scrub bar is plain, L repeats the whole video (or the
default loop, if one is set), and there is no counts button. Fill a grid and
they appear; nothing in the player needs changing.

Footage is not all 16:9 — Pachanga 01 is filmed upright on a phone — but the
frame always is. A picture of another shape sits in the middle at its own
proportions over its poster, blurred, so the sides are soft colour rather than
black bars (the YouTube look). The poster rather than live frames: no per-frame
work, and no need to load the video with CORS, which Cloudflare grants only to
the origins a video was uploaded from — ask for it and playback fails on
localhost and preview deploys. `videos.width`/`height` (from Cloudflare on
encode, corrected by the loaded video) now only decide which way a phone turns
in full screen. Full screen takes the whole player, not the `<video>`, so
mirror and speed survive it.

Testing note: the browser pane's screenshots do not capture a playing
full-resolution video (it is hardware-composited), so the frame looks blank
there. Check `requestVideoFrameCallback`'s `presentedFrames` instead — it
counts frames actually put on screen.

**My drills is real** (BUILD-PLAN P5, minus what needs P4). A member builds a
drill from the drillable videos they can see, orders it, names it, places it
on days of the week (twice for two runs) and plays a drill or a whole day. The
"own drill items" policy is what keeps non-drillable or unwatchable videos out
of a drill; the page checks nothing itself. Placing on a day is a row of day
buttons on the drill, not a drag — drag does not fire on touch. Not yet: the
library narrowed to videos the member has *practised* (needs practice_events),
per-item loop/speed/repeats in the dialog (the columns exist and the player
honours them), and marking a slot done. **No TRAIN or DRILL video has footage
yet**, so the library is empty until one is uploaded.

**Next: practice events and real progress** (BUILD-PLAN P4) — `play`,
`heartbeat`, `loop`, `complete` into `practice_events`, then My training on real
data. Until then nobody is "in progress": the masterplan features the first
program with sessions instead, and its fake resume link is gone. Still to come
in the player: dragging the loop zone's edges, the click track, a count-in, and
the audio-offset slider. `plan.html` and `session.html` stay until training is
ported — it links to them by session number, which means nothing to a real
session id.

The name is an open question: the product is still SUIM throughout the code, but
the domain bought for it is salsadrill.com, on the reasoning that a platform
meant to carry other teachers should not be named after one of them. Renaming is
roughly eight live files — wordmark, titles, og tags, seed — and has not been
done.

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
      globals.css         the design system — canonical copy
      (app)/              the member screens. Its layout holds the nav, so the
                          bar stays put across navigation and loading.tsx
                          shows at once; the URLs do not include "(app)"
        masterplan/       the catalogue, the first screen ported
        programs/[slug]/  a module: its sessions, filtered by level
        sessions/[id]/    a session, as a playlist for the player
        sessions/actions.ts getPlayback(), the player's way to ask for a URL
        drills/           My drills: the page, its actions, and the play routes
      api/me/             who is signed in, for the prototype's nav
    components/Player.tsx the player, and player.css beside it
    lib/playlist.ts       the Playlist shape, and sessionPlaylist()
    lib/drills.ts         a member's drills, the library, drill/day playlists
    lib/playback.ts       every signed URL and thumbnail is minted here
    components/AppNav.tsx the nav, rendered once by app/(app)/layout.tsx. Server
                          half: asks who is signed in (lib/member.ts); AppNavBar
                          draws it and reads the current section off the path
    lib/member.ts         getMember() — name, initials, isAdmin, cached per
                          request. For chrome only; never an access check
    lib/safe-next.ts      the one check on a `next` return path, and
                          signInHref() for links that come back afterwards
    lib/catalogue.ts      the catalogue, read from Supabase — what /masterplan
                          renders
    lib/content.ts        the same shape as hand-written data. No longer the
                          catalogue's source: it is the fallback when Supabase
                          is unconfigured, and still holds STATE (the prototype's
                          hard-coded dancer) until practice_events lands
    lib/lang.tsx          the EN/KO switch
    public/prototype/     the original static prototype, still serving the
                          screens that have not been ported. masterplan.html,
                          register.html, drills.html and 404.html are deleted;
                          the landing page's sign-up buttons go to /register
    docs/BUILD-PLAN.md    the plan
    supabase/migrations/  the schema, RLS and the entitlement function. Applied
                          by hand (Supabase MCP / CLI), not by CI
    .github/workflows/    CI: typecheck + build
    supabase/seed.sql     the catalogue, generated from lib/content.ts
    lib/supabase/         browser, server and session-refresh clients
    proxy.ts              Next 16's middleware: keeps the session fresh
    next.config.mjs       serves the prototype landing page at / (a rewrite, so
                          the front door has the site's address; the old
                          /prototype/index.html redirects to /)
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
  screen above them. On a phone (under 900px) the links fold behind a menu
  button; the prototype's `app.js`/`app.css` carry a copy of it for
  `training.html` until that is ported. Never add a nav item pointing at `#`. **Admin** appears
  only for admins; signed out, the member chip becomes a Sign in button.
- **Every way into sign-in carries where you were.** Link with
  `signInHref(path)`, never a bare `/signin`: it becomes `?next=`, which
  survives the email link, Google, switching to register, and a failed link.
  Pass any `next` through `safeNext()` — it is attacker-controlled.
- **A card links when there is somewhere to go.** A program card links when it
  has a session this viewer can see (`Program.linkable`); a session card links
  when it has a video this viewer can see. Both counts are what RLS returned, so
  neither is a second access check — an admin sees their drafts as a preview.
- **The prototype under `public/prototype/` is frozen.** Its `assets/app.css` is
  a dead copy; edit `app/globals.css` instead. Delete a prototype screen when its
  replacement lands, and update the links pointing at it.

## The back office

`/admin` is a sidebar and a work area, under the site's own nav (Admin current,
English only, no language switch) so the rest of the site is one click away. The sidebar (`app/admin/Sidebar.tsx`,
fed by the layout) is the whole catalogue — areas, programs, sessions — with the
current branch open and a search box; every screen has breadcrumbs. A session's
levels (the set the program page files it under) are chips on its editor. A session
opens on its **running order**: `StepStrip` draws its videos in order, coloured
by method step and sized by length (hatched until footage lands), and
`StepLegend` shows how often each of the six steps is used. The same strip, small,
sits on every session row in the overview and the program page, and on a video's
page with that video outlined. One colour per step, defined once in `admin.css`
as `[data-step]` variables — reuse them rather than inventing more.

Scope admin classes under `.bo` **and** check `app/globals.css` for the name
first: it styles bare `.nav`, `.strip`, `.title`, `.frame` and others globally,
which is why the sidebar's list is `.bonav` and the strip is `.rstrip`.

## Two caches, one catalogue

The back office and the public shelf read the same rows, so a write has to clear
both. `revalidateCatalogue()` in `app/admin/actions.ts` does that, and is blunt
on purpose: a video edit revalidates `/masterplan` too, though no video appears
there. A wasted re-render costs one request; a missed one leaves the public page
quietly stale.

`lib/catalogue.ts` does not filter drafts — the `published programs are public`
policy already does, in the one place that cannot be forgotten. An admin
browsing the shelf therefore sees their own drafts, which is a preview rather
than a leak.

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

Signing out ends this device's session only (`scope: 'local'`). The default,
`global`, signs every device out — which is how testing once logged the owner
out of their own browser. The prototype's `signOut()` in `assets/app.js` posts
to `/auth/signout` too; it used to clear only the localStorage flag.

The catalogue is public to anyone, signed in or not — that is the marketing
surface. What is gated is `videos`, because a video row carries its playback ids.

Playback is signed in `lib/playback.ts` after an ordinary RLS select, so
`can_access()` has already decided before anything is signed. The client never
sees `provider_uid`. Never use `videos.poster_url` in the member app: the webhook
stores Cloudflare's *unsigned* thumbnail there, which answers 401. Use the signed
poster.

## Two things not to get wrong later

- **Minutes practised is wall-clock, not media time.** Four minutes of footage at
  0.5× is eight minutes of practice.
- **The player takes a playlist, not a video.** Done: `lib/playlist.ts`. A
  session is its videos in order; a drill is a different set of entries. Keep
  it that way — anything new the player plays is another builder, not another
  player.

## Running it

```bash
npm run dev
```

<http://localhost:4478> — `/` lands on the prototype flow, `/masterplan` is the
ported screen. `npm run typecheck` before committing; CI (`.github/workflows/ci.yml`)
runs typecheck and build on every pull request and push to main, with no
secrets — the app has to keep building without an environment. Vercel builds a
preview for every branch, so review there and merge; do not push to main.

## Still to decide

Five open questions at the end of `docs/BUILD-PLAN.md` §9. The live ones are the
video host, whether Korea is a launch market (decides Kakao login), and when
filming starts.
