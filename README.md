# Salsa viva — SUIM landing page

Landing page for **SUIM**, a practice-first solo salsa training platform.
Built from `Suim_Concept_and_Content_Playbook.docx` and `Suim_Concept_and_PRD.docx`.

## The flow

    index.html → register.html → masterplan.html → plan.html → session.html
    landing      create account  the masterplan    the module   the session
                                                        ↘ program.html
                                                          module explainer

- `index.html` — the public landing page. Every CTA goes to `register.html`.
- `register.html` — account plus the two onboarding questions.
- `masterplan.html` — **what you see right after registering.** The catalogue:
  a quiet left rail of the seven training areas, and an editorial grid of the
  programs inside the selected one. Built to stay readable as the catalogue
  grows — the rail scrolls, the grid is `auto-fill`, and a status filter and
  "All programs" view keep 37 programs (and more) navigable. Area and filter
  live in the URL, so a view can be linked to.
- `masterplan-v1.html` — the previous tabbed version, kept for comparison. It is
  not linked from anywhere; reach it by URL.
- `plan.html` — one module (Improvisation 01) as a grid of sessions tagged by
  level, with a level filter. Header is deliberately spare and mirrors the
  masterplan's: crumb and resume line, then kicker, title, one paragraph and a
  derived stat. Nothing states a session count, so the module can grow or
  shrink without the copy going stale.
- `session.html?s=1…9` — one session: the player, its six videos, the six-step
  bar, and the module's other sessions in the sidebar.
- `program.html` — the module *explainer* (promise, method, full plan, coach).
  Reads like a sales page, so it sits off to the side: linked from the plan as
  "About this module", and a candidate to fold into the landing page later.

## Navigation

Every signed-in screen renders the same bar from `renderNav()` in
`assets/app.js` — **Masterplan · My training**, logo to the masterplan, language
switch and member chip — so it cannot drift. The bar only lists screens that
exist; there are no placeholder items pointing at `#`. `program.html`
is self-contained and carries a hand-matched copy of the same markup.

Screens below the top level show one back link (`.crumb`) naming the screen
above them: the module page goes back to *Masterplan*, a session and the module
explainer go back to *Improvisation 01*, and register goes back to *suim.com*.
`index.html` keeps its own logged-out marketing nav.

## Vocabulary

**Area** (Improvisation) → **program / module** (Improvisation 01) → **session**
(nine of them, 15–22 min each) → **video** (six per session, one per step).

## Levels

Sessions carry one or more of **All level · Beginner · Intermediate · Advanced ·
Pro**, and the scale is deliberately not a ladder: session 05 is All level +
Beginner while session 04 before it is All level + Intermediate. A level
describes the material, not the dancer, so a session can sit in two at once.
Tags live in `SESSION_LEVELS` in `assets/program-data.js`. Modules carry a single
level on the same scale.

The method is six steps, and every session is those six steps in order:

    WATCH → UNDERSTAND → TRAIN → DRILL → TRANSFORM → IMPROVISE

## Contents

`index.html` and `program.html` are single self-contained files — inline CSS,
inline JS, photos as base64 — so either can be shared on its own. The app pages
(`register`, `plan`, `session`) share `assets/`:

- `assets/app.css` — the design system
- `assets/app.js` — language switch, link helpers, player toggles
- `assets/program-data.js` — the seven sections and their modules, the nine
  sessions, the three weeks and the six method steps

If the design changes, the self-contained pages need the same change applied by
hand. Fonts (Archivo + Noto Sans KR) load from Google Fonts.

## Deploying

Static files, no build step. GitHub Pages serves the repository root as-is:
Settings → Pages → deploy from `main` / root. `404.html` is picked up
automatically and `.nojekyll` keeps Pages from reprocessing the folder.

## Run it locally

```bash
python3 -m http.server 4478
```

Then open <http://localhost:4478/> and click through. The app pages use ES
modules, so they need the server — opening them as `file://` will not work.

The Claude Code preview pane can also start it: `.claude/launch.json` defines a
`suim-landing` configuration on the same port.

## Notes

- **Languages:** EN / KO toggle in the nav. The choice persists in
  `localStorage`; `?lang=ko` forces Korean on load.
- **Nothing plays.** Every video is a hatched placeholder. The controls
  (speed / loop / mirror / counts / captions) only change their own state,
  though mirror does really flip the frame.
- **No accounts.** The register form submits nothing. It does set a
  `suim-member` flag in `localStorage` so the flow stays continuous — the
  landing page then says "Continue training" instead of "Start the 7-day
  reset". "Sign out" in the app footer clears it.
- **Progress is hard-coded** in `assets/program-data.js` (`STATE`) to someone who
  just subscribed: session 1 in progress, 2 of its 5 videos done. Change `STATE`
  to see the pages in a different position.
- **Every session shares one video stack.** The six steps are the same in every
  session, so the videos list is generated per step rather than authored nine
  times over.
- **Only Improvisation 01 is built out**, and it is the only card on the
  masterplan that navigates. The other 36 programs give the catalogue realistic
  depth but are not links, because they would all land on Stop Freezing.
  The arrow on a card is the signal that it goes somewhere.
- **Guest programs are not named after real people.** They are labelled by
  discipline (Body Percussion, Cuban Son Roots) rather than by an invented
  guest artist.
- **Pricing** ($16 monthly, $140 annual) is the indicative test range from the
  PRD, not confirmed pricing.
