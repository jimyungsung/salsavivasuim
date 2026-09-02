# Salsa viva — SUIM landing page

Landing page for **SUIM**, a practice-first solo salsa training platform.
Built from `Suim_Concept_and_Content_Playbook.docx` and `Suim_Concept_and_PRD.docx`.

## Contents

- `index.html` — the public landing page.
- `program.html` — the member view of one program (Improvisation 01 · Stop
  Freezing): what a subscriber sees once they have access.

Each page is a single self-contained file — inline CSS, inline JS, photos
embedded as base64 — so either can be opened or shared on its own. That means
the shared styles are duplicated between them; if the design changes, change
both. Fonts (Archivo + Noto Sans KR) load from Google Fonts.

## Run it locally

```bash
python3 -m http.server 4478
```

Then open <http://localhost:4478/> for the landing page, or
<http://localhost:4478/program.html> for the member view. The "Stop Freezing"
card on the landing page links through to it.

The Claude Code preview pane can also start it: `.claude/launch.json` defines a
`suim-landing` configuration on the same port.

## Notes

- **Languages:** EN / KO toggle in the nav. The choice persists in
  `localStorage`; `?lang=ko` forces Korean on load.
- **Player controls** (speed / loop / mirror / counts / captions) are a visual
  prototype. Mirror really flips the frame; nothing streams video yet. The unit
  thumbnails on `program.html` are deliberately empty placeholders.
- **Progress state** on `program.html` is hard-coded to "just subscribed":
  session 1 in progress, 2 of 5 units done, nothing else started.
- **Pricing** ($16 monthly, $140 annual) is the indicative test range from the
  PRD, not confirmed pricing.
