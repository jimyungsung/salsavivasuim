# Salsa viva — SUIM landing page

Landing page for **SUIM**, a practice-first solo salsa training platform.
Built from `Suim_Concept_and_Content_Playbook.docx` and `Suim_Concept_and_PRD.docx`.

## The flow

    index.html → register.html → masterplan.html → plan.html → session.html
    landing      sign up         pick a module     the module   the videos

- `index.html` — the public landing page. Every CTA goes to `register.html`.
- `register.html` — account plus the two onboarding questions.
- `masterplan.html` — **what you see right after registering.** The catalogue,
  split into seven sections as tabs (Improvisation, Move Better, Shine Language,
  Musicality, Choreo Lab, Partnerwork, Guest Labs). Each tab swaps the panel
  below for that section's modules, numbered in the order they are meant to be
  taken. Pick one.
- `plan.html` — one module (Improvisation 01) as nine selectable sessions
  grouped by week, with a nine-session ribbon along the bottom of the header so
  the whole shape is visible without scrolling.
- `session.html?s=1…9` — one session: the player, its six videos, the six-step
  bar, and the module's other sessions in the sidebar.
- `program.html` — the module *explainer* (promise, method, full plan, coach).
  Reads like a sales page, so it sits off to the side: linked from the plan as
  "About this module", and a candidate to fold into the landing page later.

## Vocabulary

**Section** (Improvisation) → **module** (Improvisation 01) → **session** (nine
of them, 15–22 min each) → **video** (six per session, one per step).

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
- **No accounts.** The register form submits nothing; both buttons just go to
  the plan.
- **Progress is hard-coded** in `assets/program-data.js` (`STATE`) to someone who
  just subscribed: session 1 in progress, 2 of its 5 videos done. Change `STATE`
  to see the pages in a different position.
- **Every session shares one video stack.** The six steps are the same in every
  session, so the videos list is generated per step rather than authored nine
  times over.
- **Only Improvisation 01 is built out.** The other 23 modules exist so each
  section has something in it; every open one leads to the same module page.
- **Pricing** ($16 monthly, $140 annual) is the indicative test range from the
  PRD, not confirmed pricing.
