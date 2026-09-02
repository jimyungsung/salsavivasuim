# Salsa viva — SUIM landing page

Landing page for **SUIM**, a practice-first solo salsa training platform.
Built from `Suim_Concept_and_Content_Playbook.docx` and `Suim_Concept_and_PRD.docx`.

## The flow

    index.html  →  register.html  →  plan.html  →  session.html
    landing        sign up           full plan     the videos

- `index.html` — the public landing page. Every CTA goes to `register.html`.
- `register.html` — account plus the two onboarding questions.
- `plan.html` — **what you see right after registering.** The whole program as
  nine selectable session cards, grouped by week, with where to pick up.
- `session.html?s=1…9` — one session: the player, and the five videos in it.
  Click any video in the list, page with previous/next, and roll straight into
  the next session or back to the plan.
- `program.html` — the program *explainer* (promise, method, full plan, coach).
  Reads like a sales page, so it sits off to the side: linked from the plan as
  "About this program", and a candidate to fold into the landing page later.

## Contents

`index.html` and `program.html` are single self-contained files — inline CSS,
inline JS, photos as base64 — so either can be shared on its own. The app pages
(`register`, `plan`, `session`) share `assets/`:

- `assets/app.css` — the design system
- `assets/app.js` — language switch, link helpers, player toggles
- `assets/program-data.js` — the nine sessions, three weeks and five unit types

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
- **Every session shares one unit stack.** The playbook prescribes the same five
  assets per session, so the videos list is generated per type rather than
  authored nine times.
- **Pricing** ($16 monthly, $140 annual) is the indicative test range from the
  PRD, not confirmed pricing.
