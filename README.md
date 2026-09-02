# Salsa viva — SUIM landing page

Landing page for **SUIM**, a practice-first solo salsa training platform.
Built from `Suim_Concept_and_Content_Playbook.docx` and `Suim_Concept_and_PRD.docx`.

## Contents

- `index.html` — the whole landing page. Single self-contained file: inline CSS,
  inline JS, photos embedded as base64. Fonts (Archivo + Noto Sans KR) load from
  Google Fonts.

## Run it locally

```bash
python3 -m http.server 4478
```

Then open <http://localhost:4478/>.

The Claude Code preview pane can also start it: `.claude/launch.json` defines a
`suim-landing` configuration on the same port.

## Notes

- **Languages:** EN / KO toggle in the nav. The choice persists in
  `localStorage`; `?lang=ko` forces Korean on load.
- **Player controls** (speed / loop / mirror / counts) are a visual prototype.
  Mirror really flips the frame; nothing streams video yet.
- **Pricing** ($16 monthly, $140 annual) is the indicative test range from the
  PRD, not confirmed pricing.
