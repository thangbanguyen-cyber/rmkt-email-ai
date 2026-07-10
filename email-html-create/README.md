# Email HTML Create — Part 1 (Vite + React + TypeScript)

The real web app for **screen 1 (Email HTML Create)** of RMKT AI Automation,
vibe-coded from `../prototype/EmailBuilder_UX_Prototype.html`. Runs on real React;
data is the 8 tệp from `segment_mapping.csv` with the designed product images.

## Run

```bash
npm install      # first time only
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
```

Requires Node.js (LTS). Product/banner images live in `public/img/` and are served at `/img/...`.

## What Part 1 covers

Left: Domain · Send date+Theme (theme auto-recommended from the date) · Products & content
(8 tệp, 6 AI-locked products each, editable characteristics) · Promo. Right: locked preview
that unlocks on **Generate**, per-segment inbox subject + body blocks with version history,
product tiles (Change URL), layout options, Export HTML, Export design brief.

## 3 SEAMS left for other devs (search the code for "SEAM")

| # | What | Where | Current behavior | Dev replaces with |
|---|---|---|---|---|
| 1 | Template_ID create (Part 2) | `App.tsx → createTemplateId()` | Button toasts, stays on screen 1 | Hand off to the Template_ID module |
| 2 | AI generate / regenerate content | `src/lib/content.ts → generateContent()` | Template default copy | Real AI call returning the same HTML-string shape |
| 3 | AI product images | `src/data/segments.ts → CATALOG[].img` | Static repo images in `/public/img` | AI-generated / CDN image URLs per product |

The UI (versions, edit, regenerate, layout, export) already works against these contracts —
swapping a seam needs no other changes.

## Structure

```
src/
  App.tsx            all UI + state (the builder)
  data/segments.ts   catalog + 8 tệp (SEAM #3: image paths)
  lib/content.ts     content generators (SEAM #2)
  index.css          styles (ported from the prototype)
public/img/          designed product images + banner
```

## Notes

- Only **BraGoddess** is wired with real tệp data + images; the other 3 domains use sample data
  so the picker demos.
- Merge tags (`{{first_name}}`, `{{unsubscribe}}`, `{{paramurl}}`) are emitted literally and
  must stay that way through to send.
- Generation/score/handoff are mocked for the prototype; the real engine plugs into the seams.
