# SUIM build plan — v1

From a clickable prototype to a product that plays.

Seven screens exist and none of them play a video. This is the order in which that
changes: content in a database, videos on a CDN, a back office to put them there,
and the practice player — the one thing SUIM cannot be bought without.

Drafted 6 September 2026, against the prototype at `main`
(7 screens, static, no accounts, nothing plays).
Also published as a page: <https://claude.ai/code/artifact/a9235f74-bfd5-40f1-a48e-bf3a95f23d7e>

---

## 1. The stack, decided

Four choices carry the whole build. Each has a recommendation and the alternative
worth knowing about, so none of them has to be reopened later.

| | Choice | Why |
|---|---|---|
| **App** | Next.js on Vercel | Signed playback tokens, uploads, a webhook receiver and an admin behind a role check all need a server. The design system ports as-is — `app.css` is plain CSS with no framework assumptions. Keep `index.html` as a static marketing route; self-contained is worth preserving. |
| **Database & auth** | Supabase | Postgres with row-level security, auth with Google and Kakao out of the box, storage for thumbnails. Note: the org has two active projects and the free plan caps at two — budget for Pro ($25/mo) or pause one. |
| **Video** | Cloudflare Stream | Per-minute pricing, signed URLs, a global network including Seoul, and a downloadable MP4 alongside the HLS ladder. The player needs both. Cheaper: Bunny Stream (~half the delivery cost). Richer: Mux (best analytics, most expensive). |
| **Back office** | Built in, not bolted on | The model is small and specific — area, program, session, and an ordered list of videos each tagged with one of six method steps — and the beat-grid editor is bespoke whatever you do. A headless CMS would fight the vocabulary. Three screens is the whole surface. |

**Running cost** at 100 active members practising 20 min/day: Cloudflare Stream
~$60/month delivery (~60,000 min at $1 per 1,000) plus under a dollar storage;
Supabase Pro $25; Vercel Pro $20. **~$105/month at 100 members**, scaling almost
entirely with video minutes delivered. Verify current rates before committing.

---

## 2. Phases, in order

The back office comes before the player on purpose. Filming 54 videos is the real
bottleneck, and it can't start being ingested until there's somewhere to put them —
so build the intake first and let content production run alongside the player work.

| Phase | What ships | Size | Blocks |
|---|---|---|---|
| **P0** | Set up | 3 days | Supabase project, Cloudflare account, Next.js skeleton with `app.css` ported, existing screens moved over unchanged |
| **P1** | Schema & accounts | 1–1.5 wk | Tables, RLS, sign-up / sign-in, the three onboarding questions persisted |
| **P2** | Back office | 1.5–2 wk | Catalogue CRUD, direct-to-CDN upload, beat grid editor, draft/publish. **Filming can begin.** |
| **P3** | **The player** *(core)* | 2–3 wk | Streaming, speed, frame-accurate loop, mirror, counts, wake lock, practice events |
| **P4** | Real progress | 1 wk | My training driven by practice events instead of `STATE`; streak, minutes, resume |
| **P5** | My drills for real | 1–1.5 wk | Persisted drills, week scheduling, and a drill that actually plays end to end |
| **P6** | Launch pass | 1 wk | Korean review, transactional email, analytics, OG images, terms & privacy, error states |

Sizes assume one developer working steadily. P2 and P3 are the two that reward
care; the rest is assembly.

---

## 3. Database and video hosting — Phase 1

The vocabulary already exists — **area → program → session → video**. The schema
is that hierarchy with three things that matter: a session is an *ordered list*
of videos rather than a fixed set of slots, text is bilingual JSONB, and every
video carries a beat grid.

> **A session is not six videos, one per step.** It may have no UNDERSTAND video
> at all, or two TRAIN videos, or three IMPROVISE ones. The six steps are the
> method's vocabulary — what a video is *for* — not a slot list. So `videos`
> carries a `position` that orders the session and a `step` that tags the video,
> and there is deliberately **no unique constraint on (session_id, step)** and no
> requirement that all six appear. Anything that counts "of 6" is a bug.

```
-- catalogue. every *_t column is jsonb: {"en": "...", "ko": "..."}
areas       ( id, slug, position, name_t, blurb_t )
programs    ( id, area_id, slug, position, title_t, subtitle_t, promise_t,
              level, weeks, status draft|soon|open, is_free, cover_url, published_at )
sessions    ( id, program_id, position, title_t, outcome_t, focus_t,
              levels text[], status )
-- ordered list, NOT six slots: no unique (session_id, step), no required steps
videos      ( id, session_id, step watch|understand|train|drill|transform|improvise,
              position,                       -- orders the session; unique per session
              title_t, description_t, duration_ms, angle front|back|detail,
              -- delivery
              provider, provider_uid, hls_playback_id, mp4_url, poster_url,
              status uploading|processing|ready|failed,
              -- the part that makes it a dance product
              bpm numeric, first_beat_ms int, beats_per_phrase int default 8,
              default_loop_start_ms, default_loop_end_ms,
              mirror_default bool, is_drillable bool )   -- drillable follows the step
captions    ( id, video_id, lang, vtt_url )

-- people
profiles    ( id -> auth.users, display_name, locale, audio_offset_ms,
              experience, timing, goal,        -- the three onboarding answers
              level,                           -- where they are training
              plan default 'free', role default 'member', created_at )

-- practice. one append-only log; every statistic is an aggregate of it.
practice_events ( id, user_id, video_id, kind play|heartbeat|loop|complete,
                  at, wall_ms, media_ms, speed )
video_progress  ( user_id, video_id, last_position_ms, loops, seconds, completed_at )
saved_items     ( user_id, session_id, video_id )

-- my drills
drills          ( id, user_id, name, created_at )
drill_items     ( drill_id, position, video_id )
drill_slots     ( drill_id, user_id, weekday 0-6, done_at )
```

### Three decisions inside that

- **Bilingual as JSONB, not paired columns.** One row per thing, both languages
  edited side by side in the admin, and a missing `ko` falls back to `en` while
  showing as untranslated in the list. Adding a third language later costs nothing.
- **One event log, not maintained counters.** Streak, minutes, sessions-this-week
  and the activity feed on My training are all queries over `practice_events`.
  Counters drift; a log can be recomputed. Add a materialized rollup only when
  it's actually slow.
- **An entitlement function from day one.** Everything is free now, so
  `private.can_access(video_id)` asks only whether you are signed in and the
  material is published. RLS policies call that function and nothing else. When
  you charge, you change one function — not fifty call sites. `programs.is_free`
  is already there for the free sample. It lives in a `private` schema so it is
  not reachable as a REST endpoint, while still being callable from policies.

### How video gets stored and served

- Every asset is **private on the host**. Nothing is a public URL.
- Upload goes **browser → Cloudflare directly** via a one-time upload URL your
  server mints. Files never touch Vercel, so there's no 4.5 MB body limit to fight.
- A webhook flips `videos.status` to `ready` when encoding finishes and writes back
  duration, playback ID and poster.
- On play, the server checks entitlement and mints a **signed token, ~2 hour TTL**,
  returning both the HLS URL and the MP4 URL. The player refreshes before expiry.

> **Two renditions per video is not redundancy — it's the feature.** HLS adapts to
> the network, which is right for the long explanatory videos. But an HLS seek jumps
> to a segment boundary and may rebuffer, which makes a tight loop breathe. A short
> progressive MP4 downloads whole and seeks instantly. **Rule: a video under ~150
> seconds and marked drillable plays from MP4; everything else plays from HLS.**
> Store both IDs on every row.

---

## 4. The back office — Phase 2

Three screens at `/admin`, gated by `profiles.role = 'admin'` and enforced in RLS,
not just in the UI.

**1 · Catalogue tree.** Areas, programs and sessions in one nested list. Drag to
reorder (writes `position`), click to rename inline, a status chip per row —
draft · soon · open. A new session starts empty — videos are added to it, and how
many of each step is the session's own business. Deleting is soft; nothing is
ever gone.

**2 · Session editor.** The session's videos as an ordered list down the page,
each tagged with the step it belongs to. **Add video** appends one and asks which
step it is; the list can be reordered by dragging, which is what sets `position`.
Nothing forces the six steps to be present or to appear once each — the editor
groups by step for readability and stops there. Drop a file and it uploads
straight to the CDN with a progress bar, then sits in *processing* until the
webhook lands. *Publish* is disabled while any video is still processing, and
says why.

**3 · Video editor — where the beat grid gets filled.** Title and description in
both languages, poster frame picked off the timeline, then:

- **Tap tempo** — tap along to the music, get a BPM, nudge it in 0.1 steps.
- **First beat** — scrub to the *1* and mark it. Nudge in 10 ms steps.
- **Preview** — a click track plays over the video off the derived grid. If the
  click drifts against the music by the end, the BPM is wrong. That's the whole QA test.
- **Default loop** — drag a region; it snaps to eights. This is the loop a member
  gets before they've touched anything.
- **Mirror default** — on for TRAIN (filmed facing you), off for DRILL (filmed from
  behind, already the right way round).

Roughly two minutes of work per video, 54 videos. Automatic BPM detection is wrong
often enough on live salsa recordings that correcting it costs more than tapping it.

**Publishing.** Every row is draft or published; the member app reads published rows
only. A *Preview as member* link opens the real session screen with drafts visible,
so you check the thing itself, not an admin approximation of it.

---

## 5. The practice player — Phase 3, the core

Everything else is table stakes that any platform has. This is the part people pay
for: a video you can slow down, loop on an exact eight-count, and mirror — without
the loop breathing, the pitch shifting, or the phone going to sleep mid-drill.

### Speed

- `video.playbackRate`, at the four steps the prototype already has —
  **0.5 · 0.75 · 1 · 1.25**. Widen to 0.25–2 once proven.
- Set `preservesPitch = true` explicitly, plus the `webkitPreservesPitch` alias for
  older Safari. Without it the music drops a fifth at 0.5× and becomes
  unrecognisable — which defeats the point of drilling to it.
- Below about 0.4×, time-stretched audio turns to mush even with pitch preserved.
  Mute automatically at that point and let the click track carry the time.
- **Speed persists per step, not globally.** A dancer wants DRILL at 0.75× and
  WATCH at 1×, every time, without re-setting it.

### Loop — the hard one

- An **A→B region**, set by dragging on the scrub bar or by picking a number of
  eights off the count grid. The prototype's green loop zone is already the right UI.
- **Do not drive the boundary off `timeupdate`.** It fires roughly four times a
  second, so you overshoot B by up to 250 ms and the loop audibly breathes. Use
  `requestVideoFrameCallback` (Chrome, Safari, Edge) and fall back to
  `requestAnimationFrame` on Firefox. Check every frame; when
  `currentTime >= B - oneFrame`, set `currentTime = A`.
- A seek only lands cleanly if the region is buffered — which is exactly why drill
  videos are progressive MP4 with `preload="auto"`. Don't enable looping until
  `buffered` covers the region.
- Setting `currentTime` still costs one to three frames of stall on some browsers.
  If that seam reads badly, upgrade to **two `<video>` elements ping-ponging** the
  same source: the hidden one sits pre-seeked at A, and you swap visibility at the
  boundary. Build the simple version first and only pay for this if you can see the
  flicker.
- Every lap emits a `loop` event. Loops practised is a real number in this product.

### Counts — what makes it a dance player rather than a video player

Every video carries `bpm`, `first_beat_ms` and `beats_per_phrase`. Nothing about
counts is hand-drawn; it is all derived from those three numbers:

- The **8-count overlay**, ticking 1-2-3 · 5-6-7 in salsa's own phrasing.
- **Loop lengths snap to eights.** "Loop 8 counts" becomes a real unit —
  `8 × 60 / bpm` seconds — not a hand-placed region.
- A **count-in on restart**: a 5-6-7 pickup before the loop comes back round, so you
  re-enter on time instead of catching up.
- An optional **click track**, mixed over the video with its own volume. Schedule it
  with the Web Audio clock against the beat grid — never off `timeupdate`, or it
  drifts within thirty seconds.
- The chapter ticks on the scrub bar come from the grid too, so they always land on
  a phrase.

> **Bluetooth speakers are 150–300 ms behind the picture.** People practise with one.
> If the counts overlay is locked to the video frame and the sound arrives late, the
> overlay looks wrong and users blame the app. Ship an **audio offset slider** in
> settings, calibrated once and stored on the profile.

### Mirror

- `transform: scaleX(-1)` on the frame — free, and already working in the prototype.
- Any text burned into the footage flips with it. Film without on-screen text; keep
  the caption layer outside the mirrored element.
- Defaults come from the video row, so TRAIN opens mirrored and DRILL doesn't. A
  member's manual override sticks for that video.

### Practice ergonomics

| | |
|---|---|
| **Wake Lock** | Hold a screen wake lock while a video is playing. A phone that sleeps mid-drill is the single most annoying bug this product can ship. |
| **Cast to TV** | AirPlay comes free with native controls. Chromecast needs the Cast SDK — about a day, and worth it: people practise in front of a television. |
| **Mobile** | `playsinline` plus landscape fullscreen. iOS still wants `webkitEnterFullscreen` in places. |
| **Autoplay** | Browsers allow muted autoplay only. The first tap on a session arms playback for the rest of it — so a session's videos run without a tap each. |
| **Keyboard** | Space, ←/→ five seconds, `,`/`.` single frame, `L` loop, `M` mirror, `1–4` speed. |
| **Resume** | Position written every 15 s and on `pagehide`. Reopening a video offers "resume at 1:42" rather than silently jumping. |

### What the player reports

Four events, one table: `play`, `heartbeat` every 15 seconds of real playback,
`loop` per lap, `complete` at 90% watched. My training, the streak, the resume line
and the activity feed are all aggregates of that.

> **Decide once: minutes practised is wall-clock, not media time.** Four minutes of
> footage at 0.5× is eight minutes of practice, and eight is what the dancer actually
> spent. Record both `wall_ms` and `media_ms` on the heartbeat and report wall-clock.

### Built now so it doesn't need rebuilding later

The player takes a **playlist**, not a video — a list of
`{video, loopStart, loopEnd, speed, repeats}`. A session is that list with one entry
per step; a drill from My drills is the same list with different entries. Get this
right in P3 and P5 is mostly UI.

---

## 6. Accounts — Phase 1

Everything free, no tiers — but built so that adding a paid tier later is a
configuration change rather than a refactor.

- **A link sent by email, no password**, which is what the register screen already
  promises. Then Google, and **Kakao** if Korea is a launch market — Supabase supports it natively, and in Korea it's the difference
  between signing up and not.
- A database trigger creates the `profiles` row on sign-up. The three onboarding
  questions ride along as sign-up metadata — they are answered before the account
  exists — and the trigger validates each against its enum, so a stray value can
  never fail a sign-up. They should steer which program the masterplan highlights.
- **Account screen:** name, language, change email, reset password, and delete
  account — a real hard delete of the profile and its practice rows.
- **Transactional email:** Supabase's built-in SMTP is rate-limited and lands in
  spam. Wire Resend or Postmark with your own domain *before* you invite a single
  person. Verification and reset emails failing quietly is a launch-day classic.
- Keep `suim-member` in localStorage as the logged-out marketing page's hint, but
  never as an authorisation check — RLS is the only thing that decides access.

---

## 7. Progress and drills — Phases 4 & 5

**My training on real data.** The dashboard exists and is hard-coded to `STATE`.
Phase 4 replaces that object with queries and nothing else changes visually: module
completion, minutes practised, streak, sessions this week, where you left off, what
you saved, this week's drills, recent activity. Two things to settle while you're in
there — what breaks a streak (a day with zero playback, in the member's own timezone)
and what counts a session as done (every video in it at 90% — the number varies
by session, so it has to be counted, never assumed).

**My drills, for real.** The mockup already proves the interaction. Phase 5 makes it
persist and makes it play:

- Drills and their items in the database, ordered, owned by the member under RLS.
- The library is *videos this member has actually practised* — `video_progress` where
  the step is drillable — with everything else shown locked.
- The week grid persists, and a drill dropped twice on a day runs twice.
- **Starting a drill opens the same player with a playlist** — each item at its own
  loop and speed, running one into the next with a count-in between. This is the
  payoff for building the player around a playlist in P3.
- HTML5 drag and drop doesn't fire on touch. Rebuild the dragging on pointer events
  so phones get the real interaction rather than the tap-to-add fallback.

---

## 8. Everything after, ranked

Ordered by what moves the product, not by what's easy. The top three touch the
schema, so they're worth planning for even now.

1. **Self-record, side by side** *(big)* — camera on, record yourself, play back
   beside the reference at the same speed and loop. For solo practice this is the
   single most valuable thing you can add. Record locally; never upload by default.
2. **Multi-angle** *(medium)* — front, back and a detail shot on one timeline,
   switched without losing your place in the loop. The `angle` column exists for
   this; decide before filming, because reshoots are the expensive part.
3. **Paid tier** *(small)* — Stripe, plus flipping `can_access()` to check `plan`.
   A day of work if the entitlement function went in at P1, a fortnight if it didn't.
4. **PWA and offline downloads** *(medium)* — installable, and drill videos cached
   for the studio with bad wifi. The MP4 renditions make this straightforward;
   accept that DRM-free means copyable.
5. **Practice reminders** *(small)* — email and web push against the week's scheduled
   drills. Streaks only work if something tells you the streak is about to break.
6. **Captions and full Korean** *(medium)* — WebVTT in both languages, and a
   translation pass over content entered in the back office.
7. **Search and filters across the catalogue** *(small)* — 37 programs is already
   past the point of browsing. Postgres full-text over the JSONB titles is enough.
8. **Video submission and coach feedback** *(big)* — upload a freestyle, get a
   timestamped response. Turns a course into a service, and is the strongest case
   for a premium tier later.
9. **Native app** *(big)* — only once the PWA's limits actually bite: background
   audio, real offline, App Store discovery. Not before.

---

## 9. Five calls to make

Everything above assumes an answer. These are the ones where a different answer
changes what gets built.

1. **Port to Next.js, or stay static?** *Recommended: port.* Signed tokens, uploads,
   webhooks and an admin all want a server. The marketing page stays static either way.
   — **Answered: port. Done in P0.**
2. **Which video host?** *Recommended: Cloudflare Stream* for predictable per-minute
   pricing and MP4 renditions. Bunny if the monthly bill is the binding constraint,
   Mux if you want engagement analytics without building them.
3. **Is Korea a launch market or a later one?** Decides Kakao login, whether Korean
   captions are P6 or backlog, and which CDN regions you care about.
4. **Who fills the beat grid, and when?** Two minutes per video, 54 videos for the
   first program. Best done by whoever chose the music, at upload time.
5. **When does filming start?** The real critical path, not the code. The player
   cannot be tested properly against placeholders — loop seams, beat grids and speed
   all need real footage. Even **two finished sessions early** would de-risk all of P3.
