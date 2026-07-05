# EmailAuto One-Screen Builder Design

## Summary

Rebuild the **presentation layer** of the existing EmailAuto Studio (this repo) into a
**one-screen email builder** living inside a **3-step shell** (`Email HTML Create` →
`Template_ID Create` → `Auto Send`). The generation/render/validation/SendGrid engine in
`lib/` is **reused, not rewritten**. The interactive UX contract is the prototype at
`docs/EmailBuilder_UX_Prototype.html` — every state and interaction below exists there and
was validated with stakeholders.

**Vision (why):** today one campaign crosses 3 disconnected tools — (1) EmailAuto Studio
generates HTML, (2) HTML is pasted into SendGrid to get a `template_id`, (3) the id is typed
into a Google Sheet that triggers the daily 7PM auto-send. This app collapses step 1 into a
single screen and hands off to step 2 with one click. Steps 2/3 are placeholder tabs here —
they are owned by other modules (Ly), but the handoff contract is defined in this spec.

## Context: what already exists (reuse map)

| Existing module | What it does | Reused for |
|---|---|---|
| `lib/config/brands.ts` | 4 brands: persona, voice, `productSegments`, catalog (usps/review/price/url), `heroSlug`, `heroImage`, `logoImage` | Skeleton "real parts", staged products/segments, product blocks |
| `lib/briefgen.ts` | Prompt assembly (system+user), playbook rules, `validateBrief` (`_score`/`_flags`), `GenBrief` types, `segJsonKey` | Generation, quality chip, block↔field mapping |
| `lib/anthropic.ts` | `generateOptions(campaign, products, overrides?, models?, revision?)` — layered generation: shared **foundation** then per-segment **patch calls**; SSE progress; partial salvage; retries | Single-option generation, streaming fill, per-segment regenerate |
| `lib/render/email.ts` | `renderEmailHTML(brand, campaign, products, brief, segment, images, opts)` → SendGrid-module, email-safe HTML; `ProductLayout: stack\|two\|three\|hero_grid`; `moduleLayout` | Export HTML, layout options |
| `lib/render/markdown.ts` | markdown→email HTML, `{{paramurl}}`/`{{unsubscribe}}` emitted literally | Body rendering |
| `lib/cleanEmail.ts` + `app/api/sync-template` | Clean HTML + create SendGrid Dynamic Template → `d-…` id | Create Template_ID button |
| `app/api/sync-sendgrid` | Create SendGrid Design | Secondary handoff (kept, de-emphasized) |
| `app/api/scrape-usps` | USP scraping | Unchanged (left panel, later) |
| `lib/supabase*`, `requireActiveUser` | Auth + route guards | All new/changed API routes |
| `app/studio/*` (3-view wizard) | Current UI | **Replaced** as default route; kept at `/studio` during transition |

Key engine facts the UI must respect:

- One generate = **N segment variants**: `subject_lines[segKey]`, `body[segKey]` are
  per-segment; `banner`, `body.base`, `products[]`, P.S. are **shared (foundation)**.
  `segKey = segJsonKey(code) = "seg_" + code.replace(/-/g, "_")`.
- Generation is **layered**: foundation call first, then segment patch calls that are merged
  in. This maps 1:1 to the streaming fill order in S2.
- `validateBrief` already returns `_score` (0–100) and `_flags` — free data for the quality
  chip. Incomplete segments must block handoff (the old app already blocks sync).
- Images are **never generated**: `ImageOverrides {logo, hero, products{slug→url}}` are
  pasted URLs; missing images render placeholders with AI text fallback.
- Serverless route `maxDuration = 300`; many segments × large models can take minutes —
  the UI must stay responsive during generation (stream, don't block).

## Goals

- One screen: brief on the left, live email preview on the right. No wizard, no separate
  Review/Output screens.
- Full state machine S0→S3 (below) with streaming fill, cancel-keeps-partials, per-segment
  retry.
- Single creative option per run (**no A/B**) — block-level regenerate with version history
  replaces the A/B pair.
- Per-segment tabs on the preview; per-segment subject/preheader + body, shared foundation
  blocks labeled accordingly (`SEG` vs `ALL` regenerate scope).
- Layout options applied live: subject style picker, `ProductLayout`, module order
  (including drag-to-reorder "Custom flow").
- Quality score chip + blocking rules before handoff.
- Handoff: `Export HTML` (real `renderEmailHTML` output) and `Create Template_ID`
  (real `/api/sync-template`, returns `d-…`), with a session registry visible in tab 2.
- Autosave draft to `localStorage` + restore prompt.
- All UI text in **English**. UI chrome uses the Crossian tonal blue scale; brand accent
  colors appear **only inside email content**.

## Non-Goals

- A/B option pair and `validateBriefPair` contrast checking (single option only).
- The Review screen's raw prompt editing (advanced feature, later).
- Product picker / Segment picker / Send-schedule UIs — owned by other modules. This app
  **stages defaults** from brand config (see Left Panel) until those modules integrate.
- Tabs 2 & 3 real implementations (SendGrid provisioning, 7PM trigger) — other module (Ly).
  Only the placeholder pages + session template registry live here.
- Image upload to a CDN (v1 is paste-URL, matching the current app). File upload is a
  future enhancement — an uploaded `ObjectURL` cannot ship in a real email.
- Template library (sub-feature 2.1) beyond the S0 entry point stub.
- Analytics, list management, deliverability — other PICs.
- Multi-provider model picker UI (engine default models are used; env-tunable).

## The 3-step shell

Top bar (Crossian navy gradient) with 3 large tabs:

1. **Email HTML Create** — this entire app.
2. **Template_ID Create** — placeholder page: explains ownership (other module) and lists
   `template_id`s created this session (`Segment 21 → d-abc123…`), fed by real
   `sync-template` responses. `Create Template_ID` auto-navigates here on success.
3. **Auto Send** — placeholder page: explains the 7PM trigger will read template ids from
   step 2, replacing the Google Sheet.

## State machine (the core of this spec)

```
S0 EMPTY ──Generate──▶ S2 GENERATING ──all patches done──▶ S3 READY
   ▲                      │        │
   │                      │Cancel  └─ per-segment: done segments unlock immediately
   └──── restore/draft    ▼
                       PARTIAL (some done, some 'retry') ──retry tab──▶ S3
```

### S0 — Empty (first load)

Right panel shows a **half-real skeleton**, not a blank page:

| Element | State | Source |
|---|---|---|
| Banner, footer (address, Privacy, `{{unsubscribe}}`), sender name/avatar | **Real** | brand config (`heroImage`, `logoImage`, brand name) |
| Subject/preheader (inbox preview card), headline, story, bridge, offer, P.S. | **Ghost** gray bars | AI-owned, not yet generated |
| Hero product card + product tiles | **Ghost** (dashed box / desaturated) with caption "auto-filled from catalog on Generate" | catalog-owned |
| Segment tabs | Visible but **dimmed**, tooltip "Not generated yet" | staged segments |
| Centered overlay card | "Your email builds here — fill the brief, hit Generate" + secondary link **"Or start from a template →"** (stub toast: under construction) | — |
| `Export HTML`, `Create Template_ID` | **Disabled** (tooltip "Generate first") | — |
| Layout button | **Enabled** — layout changes rearrange ghost tiles live | — |
| `Generate Email` | Enabled, sole primary action | — |

Rule of thumb: **config/catalog-owned = shown real immediately; AI-owned = ghost until S2.**

### S1 — Filling the brief (live reflection)

- Changing **Brand** re-themes the skeleton instantly (accent var, logo letter, sender,
  banner/logo URLs from config) and **resets staged segments** to that brand's defaults.
- Promo fields update the accordion summary text.
- Ghost text stays ghost; no AI runs before Generate.

### S2 — Generating (streaming fill; mirrors the layered engine)

1. Click `Generate Email` → overlay card disappears; layout button disabled; button becomes
   `⏳ Generating… 0/N segments`; a `✕ Cancel` button appears next to it.
2. **Products fill instantly** (catalog data needs no AI): hero card + tiles colorize;
   toast "Products loaded from catalog".
3. **Foundation blocks** fill sequentially with a shimmer→fill animation as SSE events
   arrive: headline → bridge → offer → P.S. (order follows event arrival, not a fixed
   timer).
4. **Segment patches**: each staged segment's tab shows ⏳ while its patch runs; when its
   event arrives the tab becomes active and — if it is the currently viewed segment — the
   subject card + story block fill.
5. **Filled blocks unlock immediately** for hover/edit/regenerate; the preview is never
   modally blocked.
6. **Cancel** aborts the request (`AbortController`), keeps everything already merged,
   marks unfinished segments `retry` (tab shows `↻`), toasts
   "Cancelled — kept X/N segments". Clicking a `↻` tab re-runs only that segment's patch.
7. Errors: 429 → toast with retry-after; provider timeout → engine's partial salvage is
   treated like Cancel (finished parts kept, rest `retry`).

### S3 — Ready

- Toast "Draft ready — N/N segments · Score {score}".
- Quality chip appears in the segment bar: `Score {_score} · {warn} ⚠` (click → list of
  `_flags`). **Blocking flags** (missing subject/body for a segment, placeholder hero
  image) disable `Create Template_ID` for that segment with an explanatory tooltip.
- `Export HTML` + `Create Template_ID` enabled for segments in `done` state.
- `Generate Email` becomes `↻ Regenerate All`.
- Autosave indicator in the preview header: `Saving… → Saved · just now` on every edit.
- Draft (campaign + brief + versions + images + layout) persists to `localStorage`;
  reopening the app with a draft shows a **Restore / Discard** bar (S5, same pattern as the
  old Studio).

## Screen structure

### Left panel (~54% width)

Accordion sections (same component pattern as prototype):

1. **Brand & Theme** — brand select (4 brands from `BRAND_LIST`), theme select. Editable.
2. **Promo** — promo type, value, free-shipping threshold. Editable.
3. **Product 🔒** — locked. Shows staged summary: hero (`brand.heroSlug`, locked slot 0) +
   required catalog products, cap 6. Staging source: brand config defaults until the
   Product module integrates.
4. **Segment 🔒** — locked. Staged: `brand.productSegments.slice(0, 3)` (codes + labels
   shown as tabs on the right). Until the Segmentation module integrates.
5. **Date & hour send 🔒** — locked, informational only.

Bottom: `⚡ Generate Email` (+ `✕ Cancel` during S2), styled with the dark navy gradient.

### Right panel

Top to bottom:

1. **Preview header**: title, autosave indicator, Desktop/Mobile width toggle, Dark-inbox
   toggle, `⬇ Export HTML` (secondary button).
2. **Segment bar**: `Segment:` label + one pill per staged segment
   (`21 · Bra`, `22 · Pants`, …) + quality chip + `🧩 Layout` toggle (right-aligned).
3. **Layout panel** (collapsed by default): three groups —
   - **Subject style · 3 styles**: applies one of the generated subject/preheader options
     to the current segment (pushes a new version).
   - **Product layout**: `Stacked · 1×3` / `2 per row` / `3 per row` / `Hero + 2 per row`
     → maps directly to `ProductLayout` and re-renders tiles live.
   - **Body placement**: `Continuous body` / `Opener + products` / `Custom flow`.
     The two presets reorder modules; **Custom flow enables HTML5 drag-to-reorder** on
     the preview modules (banner and footer are locked in place).
4. **Hint strip**: one line, state-dependent (S0/S2/S3 wording).
5. **Canvas**: inbox preview card (avatar, sender, subject, preheader with `{{first_name}}`
   chip) above the 600px email card (375px in Mobile). Dark-inbox toggles canvas bg.
6. **Handoff bar**: `Create Template_ID →` (primary, full width).

### Editable block anatomy

Every AI text block gets a hover toolbar:

```
[SEG|ALL] ✏️ | ‹ 1/3 › | 🔄
```

- **Scope chip**: `SEG` (subject, story — regenerate affects this segment only) vs `ALL`
  (headline, bridge, offer, P.S. — foundation, affects every segment). Tooltip explains.
- **✏️ Edit**: contenteditable in place; blur saves as a **new version**. Edited HTML is
  sanitized to a whitelist (`p, br, strong, em, a, span.accent`) and **must preserve
  literal `{{…}}` merge tags**.
- **‹ n/m ›**: version navigation per block (per segment for SEG blocks).
- **🔄 Regenerate**: SEG → segment-patch API; ALL → foundation-block API. Result pushes a
  new version (history preserved).

Image slots (banner, hero product, tiles): hover overlay → `Change URL` (prompt, writes
`ImageOverrides`) / `Swap product` (hero card only — cycles staged catalog products and
re-fills name/price/USP/link). Product CTA href carries `?{{paramurl}}`.

## Block ↔ GenBrief mapping

| UI block | GenBrief field | Scope |
|---|---|---|
| Inbox subject/preheader | `subject_lines[segKey]` (+ generated subject options for the style picker) | per-segment |
| Headline (banner caption) | `banner.main_text` / `sub_text` / `review_quote` / `cta` | shared |
| Story | `body[segKey]` | per-segment |
| Bridge, Offer | `body.base` (split for display; recombined on export) | shared |
| P.S. | P.S. field in foundation | shared |
| Hero card + tiles | `products[]` (copy) + catalog (name/price/usps) + `ImageOverrides` (images) | shared |
| Footer | static brand footer from renderer (compliance-locked, includes `{{unsubscribe}}`) | fixed |

> Implementation note: exact field names/shapes must be confirmed against
> `lib/briefgen.ts` types at build time (the plan's first task reads them). The mapping
> above is the contract; adapt property names to the real `GenBrief`.

## API contracts (new/changed routes — all `requireActiveUser`)

```
POST /api/generate-single            (SSE)
  body: { campaign: Campaign, products: Product[] }
  events:
    { type: "products-staged" }                       // immediate
    { type: "foundation", brief: PartialGenBrief }    // shared blocks ready
    { type: "segment", code: string,                  // one per staged segment
      subject_options: {subject, preheader}[],
      body: string }
    { type: "done", brief: GenBrief,                  // merged + validateBrief applied
      score: number, flags: Flag[] }
    { type: "error", message, retriable }
  Implementation: wraps the existing layered path in lib/anthropic.ts for a single
  option (skip option B + contrast retry). maxDuration = 300.

POST /api/regenerate-segment
  body: { campaign, products, brief, code }
  returns: { subject_options, body }                  // one patch call

POST /api/regenerate-foundation
  body: { campaign, products, brief, targetKey }      // "banner" | "body_base" | "ps"
  returns: { brief: PartialGenBrief }                 // client swaps only targetKey

POST /api/sync-template   (existing, unchanged)       // → { id: "d-…" }
```

## Validation and errors

- Left panel: Generate blocked (with inline message) if staged products/segments resolve
  empty (config error).
- Editing: empty block content on blur → revert to previous version, toast.
- Merge tags: sanitizer must never encode or strip `{{first_name}}`, `{{paramurl}}`,
  `{{unsubscribe}}`; export must contain them verbatim.
- Handoff blocking: segment not `done`, or blocking `_flags`
  (missing subject/body, hero image still placeholder) → `Create Template_ID` disabled
  with tooltip listing the reason; Export allowed with a confirm dialog (matches old app's
  "blocked/confirm" behavior).
- Draft restore: invalid/corrupt localStorage → silently start at S0.
- 429 rate limit → toast "Generation rate limit — try again in {s}s".

## Architecture

Next.js 15 App Router, TypeScript, Tailwind v4 (existing stack). New code:

- `app/page.tsx` → renders the new `BuilderApp`; old Studio moves to `app/studio/page.tsx`
  (route `/studio`) untouched, as fallback during transition.
- `app/builder/BuilderApp.tsx` — shell (3 tabs) + panels wiring.
- `app/builder/state.ts` — **pure** state module: types, reducer, version stacks,
  segment states, draft (de)serialization. No React imports; directly unit-testable.
- `app/builder/components/*` — `LeftBrief`, `PreviewHeader`, `SegmentBar`, `LayoutPanel`,
  `InboxCard`, `EmailCanvas` (block components + ghost variants), `HandoffBar`,
  `EmptyOverlay`, `UnderConstruction`.
- `app/builder/sanitize.ts` — contenteditable whitelist sanitizer (pure, tested).
- `app/api/generate-single/route.ts`, `app/api/regenerate-segment/route.ts`,
  `app/api/regenerate-foundation/route.ts`.
- `lib/anthropic.ts` — small exported seams only (single-option entry, patch-one-segment
  entry); no behavior change for the old `/studio` path.

State (client) sketch:

```ts
type SegPhase = "idle" | "busy" | "done" | "retry";
type AppPhase = "empty" | "generating" | "ready";

type BlockVersions = { versions: string[]; idx: number };

type BuilderState = {
  phase: AppPhase;
  campaign: Campaign;                       // existing type from lib/config/types
  images: ImageOverrides;
  layout: { productLayout: ProductLayout; flow: "continuous"|"opener"|"custom";
            moduleOrder: EmailModuleKey[] };
  curSeg: string;
  segs: Record<string, SegPhase>;
  shared: Record<SharedKey, BlockVersions>; // headline/bridge/offer/ps
  perSeg: Record<string, Record<PerSegKey, BlockVersions>>; // subject/story by seg code
  subjectOptions: Record<string, {subject:string; preheader:string}[]>;
  brief?: GenBrief;                         // last merged brief (for export/regenerate)
  score?: number; flags: Flag[];
  templates: Record<string, string>;        // seg code -> d-… id (session)
};
```

## Testing

- **Vitest** (new devDependency, node environment) for pure modules only:
  - `app/builder/state.ts`: reducer transitions S0→S2→S3, cancel→retry, version push/nav,
    draft round-trip, corrupt-draft fallback.
  - `app/builder/sanitize.ts`: whitelist enforcement; `{{merge_tags}}` survive; script/style
    stripped.
  - Block↔brief mapping helpers: segment key building via `segJsonKey`, export payload
    contains literal merge tags.
- Gate for every task: `npx tsc --noEmit` and `npm run build` must pass (repo rule).
- Manual verification checklist (final task) mirrors the S0→S3 demo script: load → skeleton
  → brand re-theme → generate → streaming fill → cancel/retry → edit/regenerate SEG vs ALL
  → versions → layout live-apply → drag reorder → images → quality chip → export → create
  template id → tab 2 registry → restore draft after reload.

## Future enhancements

- Template library (S0 entry point already reserved).
- Image bank / upload-to-CDN for designer assets.
- Advanced prompt editing (the old Review step) behind an "Advanced" toggle.
- Reinstate A/B as an optional mode.
- Per-recipient dynamic-content tokens from the Segmentation module (Tiến).
- Tabs 2/3 real implementations + status webhooks (Ly).
