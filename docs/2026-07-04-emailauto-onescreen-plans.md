# EmailAuto One-Screen Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3-view Studio wizard with a one-screen builder (left brief / right
live preview) inside a 3-step shell, reusing the existing generation/render/validation/
SendGrid engine in `lib/`. Behavior contract: `docs/2026-07-04-emailauto-onescreen-specs.md`.
Visual/interaction contract: `docs/EmailBuilder_UX_Prototype.html`.

**Architecture:** All new UI lives under `app/builder/`. Client state is a pure reducer
module (`app/builder/state.ts`) with direct unit tests; contenteditable sanitizing is a pure
module too. New API routes wrap existing `lib/anthropic.ts` layered generation for a single
option and stream SSE progress. The old Studio stays available at `/studio` until cutover.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind v4, Vitest (new,
pure modules only), existing `lib/` engine, Supabase auth guards, SendGrid client.

**Hard rules (from CLAUDE.md — do not violate):**

- Before every commit: `npx tsc --noEmit` **and** `npm run build` must pass. Stop the dev
  server before `npm run build`.
- Never touch the prompt schema in `lib/briefgen.ts` without keeping the `GenBrief` TS type
  in sync. Prompt changes go in `lib/briefgen.ts` only.
- Email HTML stays SendGrid-module format, email-safe (tables, inline styles); merge tags
  `{{paramurl}}`, `{{unsubscribe}}`, `{{first_name}}` are emitted **literally**.
- New API routes that cost money must call `requireActiveUser`.
- No `any`. No deploys (`vercel`) — owner-only.
- Subjects 42–58 chars (cap 60); `{{first_name}}` in subject **or** preheader, not both;
  `$` → `💲`, "off" → `o.f.f` in promo copy — these live in the engine; the UI must not
  mangle them when editing.

---

## File Structure

- Create `app/builder/BuilderApp.tsx`: 3-tab shell + panel wiring (client component).
- Create `app/builder/state.ts`: pure types + reducer + draft persistence helpers.
- Create `app/builder/state.test.ts`: reducer/state unit tests.
- Create `app/builder/sanitize.ts`: contenteditable whitelist sanitizer.
- Create `app/builder/sanitize.test.ts`: sanitizer unit tests.
- Create `app/builder/staging.ts`: staged products/segments from brand config (pure).
- Create `app/builder/staging.test.ts`: staging unit tests.
- Create `app/builder/api.ts`: typed client for the new SSE/JSON routes (AbortController).
- Create `app/builder/components/LeftBrief.tsx`: accordion brief panel.
- Create `app/builder/components/PreviewHeader.tsx`: title, autosave, width/dark, export.
- Create `app/builder/components/SegmentBar.tsx`: segment pills + quality chip + layout btn.
- Create `app/builder/components/LayoutPanel.tsx`: subject styles / product layout / flow.
- Create `app/builder/components/InboxCard.tsx`: subject/preheader preview block.
- Create `app/builder/components/EmailCanvas.tsx`: email card, module order, drag reorder.
- Create `app/builder/components/Block.tsx`: ghost/filled text block + hover toolbar.
- Create `app/builder/components/ProductBlocks.tsx`: hero card + tiles (catalog-driven).
- Create `app/builder/components/EmptyOverlay.tsx`: S0 overlay card.
- Create `app/builder/components/HandoffBar.tsx`: Create Template_ID.
- Create `app/builder/components/UnderConstruction.tsx`: tabs 2/3 pages (+ id registry).
- Create `app/api/generate-single/route.ts`: SSE single-option generation.
- Create `app/api/regenerate-segment/route.ts`: one segment patch.
- Create `app/api/regenerate-foundation/route.ts`: refresh one shared block.
- Modify `app/page.tsx`: render `BuilderApp`.
- Create `app/studio/page.tsx`: keep old Studio reachable at `/studio`.
- Modify `lib/anthropic.ts`: export single-option + single-patch seams (minimal diff).
- Modify `package.json`: add `vitest` devDependency + `test` script.
- Create `vitest.config.ts`: node environment, include `app/builder/**/*.test.ts`.

## Task 0: Read Before Writing

**Files:** none (read-only).

- [ ] **Step 1: Read the contracts and the engine surface**

Read, in order: `CLAUDE.md`, `docs/2026-07-04-emailauto-onescreen-specs.md`,
`docs/EmailBuilder_UX_Prototype.html` (open in a browser too — it is the interaction
contract), then skim:

- `lib/config/types.ts` (Campaign, Product, ProductSegment, ImageOverrides, OfferType)
- `lib/config/brands.ts` (BRANDS, BRAND_LIST, catalog, heroSlug, productSegments)
- `lib/briefgen.ts` (GenBrief exact shape, segJsonKey, validateBrief flags)
- `lib/anthropic.ts` (generateOptions layered path: foundation + segment patches, SSE)
- `lib/render/email.ts` (renderEmailHTML signature, ProductLayout, moduleLayout keys)
- `app/studio/StudioApp.tsx` (how campaign/products/images are assembled today; draft
  persistence pattern; how /api/generate-copy is called and streamed)
- `app/api/generate-copy/route.ts`, `app/api/sync-template/route.ts`

- [ ] **Step 2: Record findings**

Append a short "Engine findings" note at the bottom of this plan file documenting:
(a) the exact `GenBrief` field names for banner/body/ps/subject options, (b) how SSE
progress events are emitted today, (c) the internal function(s) that run one segment
patch, (d) the moduleLayout key list. Later tasks must use these real names — the spec's
mapping table is a contract to adapt, not to copy blindly.

## Task 1: Test Harness + Pure State Core

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `app/builder/state.ts`
- Create: `app/builder/state.test.ts`
- Create: `app/builder/staging.ts`
- Create: `app/builder/staging.test.ts`

- [ ] **Step 1: Add vitest (node env, pure modules only)**

Add devDependencies `vitest` and script `"test": "vitest run"`. Create `vitest.config.ts`
with `test: { environment: "node", include: ["app/builder/**/*.test.ts"] }`. Do not add
jsdom or React Testing Library — components are verified manually against the prototype.

- [ ] **Step 2: Write failing state tests**

`app/builder/state.test.ts` covers at minimum:

- initial state: `phase === "empty"`, staged segs all `"idle"`, handoff disabled derivation.
- `GENERATE_START` → phase `generating`; `FOUNDATION_READY` fills shared block versions;
  `SEGMENT_READY(code)` → seg `done`, subject options stored; all done → `DONE` → `ready`.
- `CANCEL` keeps `done` segs, marks `busy|idle` segs `retry`, phase `ready` when ≥1 done.
- version stack: `pushVersion` truncates redo tail; `navVersion(-1|+1)` clamps.
- SEG vs ALL scoping: pushing a story version for seg 21 does not touch seg 22.
- draft round-trip: `serializeDraft`/`parseDraft`; corrupt JSON → `null` (caller falls back
  to S0).

- [ ] **Step 3: Implement `state.ts` and `staging.ts`**

`state.ts`: types from the spec sketch + `reducer(state, action)` + pure helpers. No React.
`staging.ts`: `stagedSegments(brandId)` → first 3 `productSegments`;
`stagedProducts(brandId)` → hero (locked index 0) + required catalog products, cap 6 —
derived from `lib/config/brands.ts` only (no duplication of brand data).

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Gate + commit**

```bash
npx tsc --noEmit && npm run build
git add package.json package-lock.json vitest.config.ts app/builder
git commit -m "feat(builder): pure state core with tests"
```

## Task 2: Sanitizer For Inline Editing

**Files:**
- Create: `app/builder/sanitize.ts`
- Create: `app/builder/sanitize.test.ts`

- [ ] **Step 1: Write failing tests**

- allows `p, br, strong, em, a[href], span` (class limited to `accent`), strips everything
  else including `style`, `script`, event handlers.
- preserves literal `{{first_name}}`, `{{paramurl}}`, `{{unsubscribe}}` (no encoding).
- collapses empty output to `""` so the caller can revert to the previous version.

- [ ] **Step 2: Implement string-based sanitizer**

Pure TS (no DOM dependency, so it stays node-testable): tokenize tags with a conservative
regex whitelist; drop attributes except `href` on `a` and `class="accent"` on `span`;
never rewrite text content (merge tags stay verbatim).

- [ ] **Step 3: Test, gate, commit**

```bash
npm test && npx tsc --noEmit && npm run build
git add app/builder/sanitize.ts app/builder/sanitize.test.ts
git commit -m "feat(builder): whitelist sanitizer preserving merge tags"
```

## Task 3: Shell + Routes Swap

**Files:**
- Create: `app/builder/BuilderApp.tsx`
- Create: `app/builder/components/UnderConstruction.tsx`
- Modify: `app/page.tsx`
- Create: `app/studio/page.tsx`

- [ ] **Step 1: Move old Studio to `/studio`**

`app/studio/page.tsx` renders the existing `StudioApp` (it already lives in
`app/studio/StudioApp.tsx`; only the route file is new). Verify `/studio` still works.

- [ ] **Step 2: Build the 3-tab shell**

`BuilderApp.tsx`: top bar (Crossian navy gradient, tonal blue scale from the prototype's
CSS custom properties — port them into Tailwind theme vars or a small CSS module), three
tabs `1 · Email HTML Create`, `2 · Template_ID Create`, `3 · Auto Send`. Tabs 2/3 render
`UnderConstruction` (copy from spec; tab 2 receives the session template registry via
props and lists `Segment {code} → {d-id}` rows). `app/page.tsx` renders `BuilderApp`.

- [ ] **Step 3: Gate + commit**

```bash
npx tsc --noEmit && npm run build
git add app
git commit -m "feat(builder): 3-step shell, studio moved to /studio"
```

## Task 4: Left Brief Panel + S0 Skeleton Preview

**Files:**
- Create: `app/builder/components/LeftBrief.tsx`
- Create: `app/builder/components/PreviewHeader.tsx`
- Create: `app/builder/components/SegmentBar.tsx`
- Create: `app/builder/components/InboxCard.tsx`
- Create: `app/builder/components/EmailCanvas.tsx`
- Create: `app/builder/components/Block.tsx`
- Create: `app/builder/components/ProductBlocks.tsx`
- Create: `app/builder/components/EmptyOverlay.tsx`
- Create: `app/builder/components/HandoffBar.tsx`
- Modify: `app/builder/BuilderApp.tsx`

- [ ] **Step 1: Left panel**

Accordions per spec: Brand & Theme, Promo (editable — write into `campaign` via reducer);
Product/Segment/Date locked with staged summaries from `staging.ts`. Bottom bar:
`⚡ Generate Email` + hidden `✕ Cancel`. Brand change dispatches `SET_BRAND` which
re-stages segments/products and re-themes (`--accent` var + config images).

- [ ] **Step 2: S0 skeleton right panel**

Implement per spec S0 table: real banner/footer/sender from brand config; `Block`
renders ghost bars when its version stack is empty and filled HTML when not;
`ProductBlocks` ghost (dashed hero box + desaturated tiles); dimmed segment pills;
`EmptyOverlay` with the template stub link; `Export HTML`/`Create Template_ID` disabled.
Width + dark-inbox toggles work in S0. Hint strip shows the S0 wording.

- [ ] **Step 3: Manual verify against prototype S0**

```bash
npm run dev
```

Open `/` next to `docs/EmailBuilder_UX_Prototype.html`; compare S0 visually and per the
spec's S0 table (enabled/disabled matrix). Fix drift.

- [ ] **Step 4: Gate + commit**

```bash
npx tsc --noEmit && npm run build
git add app/builder
git commit -m "feat(builder): brief panel and S0 skeleton preview"
```

## Task 5: Single-Option Generation API (SSE)

**Files:**
- Modify: `lib/anthropic.ts`
- Create: `app/api/generate-single/route.ts`
- Create: `app/builder/api.ts`

- [ ] **Step 1: Expose engine seams (minimal diff)**

In `lib/anthropic.ts`, export two thin entries reusing the existing layered internals
(names per Task 0 findings): `generateSingleOption(campaign, products, onEvent)` — runs
foundation then segment patches for ONE option, invoking `onEvent` per spec event shape;
and `regenerateSegmentPatch(campaign, products, brief, code)` — one patch call. Do not
change the `/api/generate-copy` behavior (old `/studio` keeps working).

- [ ] **Step 2: SSE route**

`app/api/generate-single/route.ts`: `requireActiveUser`, `maxDuration = 300`, streams the
spec's events (`products-staged`, `foundation`, `segment`, `done` with
`validateBrief` score/flags, `error`). Respect existing env knobs (timeouts, retries,
rate limit — reuse the same helpers `generate-copy` uses).

- [ ] **Step 3: Client wiring (S2)**

`app/builder/api.ts`: `startGeneration(state, dispatch, signal)` consuming the SSE via
`fetch` + `ReadableStream`; dispatches `FOUNDATION_READY` / `SEGMENT_READY` / `DONE`;
`AbortController` for Cancel → dispatch `CANCEL`. UI behavior per spec S2: shimmer on
ghost blocks while `busy`, instant product fill, per-tab ⏳, unlocked editing on filled
blocks, retry pill re-calls `regenerate-segment` for that code.

- [ ] **Step 4: Manual verify S2 end-to-end (real AI call)**

With `ANTHROPIC_API_KEY` set locally: generate for the default BraGoddess staging; confirm
fill order (products → shared blocks → segments one by one), Cancel keeps partials, retry
completes the cancelled segment. Watch the server logs for the layered calls.

- [ ] **Step 5: Gate + commit**

```bash
npm test && npx tsc --noEmit && npm run build
git add lib/anthropic.ts app/api/generate-single app/builder/api.ts app/builder
git commit -m "feat(builder): streaming single-option generation (S2)"
```

## Task 6: S3 Editing — Blocks, Versions, Regenerate, Layout, Images

**Files:**
- Modify: `app/builder/components/Block.tsx`
- Create: `app/builder/components/LayoutPanel.tsx`
- Create: `app/api/regenerate-segment/route.ts`
- Create: `app/api/regenerate-foundation/route.ts`
- Modify: `app/builder/api.ts`, `app/builder/BuilderApp.tsx`

- [ ] **Step 1: Block toolbar**

Hover toolbar `[SEG|ALL] ✏️ ‹ n/m › 🔄` exactly per spec. Edit → contenteditable → blur →
`sanitize()` → non-empty → `pushVersion`; empty → revert + toast. Regenerate: SEG calls
`/api/regenerate-segment` (updates subject options + story for that code); ALL calls
`/api/regenerate-foundation` with `targetKey`, swaps only that block. Both push versions.
Toasts: "applied to ALL segments" vs "segment {code} only". Autosave indicator ticks on
every mutation (`Saving… → Saved · just now`), draft written via `serializeDraft`.

- [ ] **Step 2: Regenerate routes**

Both routes: `requireActiveUser`, shorter timeout (reuse patch timeout env), JSON responses
per spec contract. Foundation route may internally regenerate the full foundation and
return it — the client swaps only `targetKey` into versions.

- [ ] **Step 3: Layout panel**

Three groups per spec. Subject styles list the segment's `subject_options` (from
generation) — clicking pushes that option as a new subject version. Product layout maps to
`ProductLayout` and re-renders tiles live. Body placement presets reorder
`state.layout.moduleOrder`; Custom flow enables HTML5 drag reorder on canvas modules
(banner/footer excluded, `img`/`a` draggable=false). Layout button disabled during S2.

- [ ] **Step 4: Images + product swap**

Image hover overlays write `ImageOverrides` (URL prompt v1). Hero `Swap product` cycles
staged products (updates card + brief product reference). Segment switch re-renders
per-seg blocks from their own version stacks.

- [ ] **Step 5: Manual verify against prototype S3 + gate + commit**

Compare behaviors 1:1 with the prototype (SEG/ALL scopes, versions, styles, drag, images).

```bash
npm test && npx tsc --noEmit && npm run build
git add app/builder app/api/regenerate-segment app/api/regenerate-foundation
git commit -m "feat(builder): S3 editing, regenerate scopes, layout, images"
```

## Task 7: Quality Gate + Handoff + Restore

**Files:**
- Modify: `app/builder/components/SegmentBar.tsx`, `HandoffBar.tsx`,
  `PreviewHeader.tsx`, `BuilderApp.tsx`, `UnderConstruction.tsx`

- [ ] **Step 1: Quality chip**

Chip `Score {_score} · {n} ⚠` from the `done` event; click → panel/toast listing `_flags`.
Blocking flags (missing subject/body per segment; placeholder hero image) disable
`Create Template_ID` for that segment with tooltip. Export shows a confirm dialog when
warnings exist.

- [ ] **Step 2: Export HTML (real renderer)**

`Export HTML` builds the current segment's email via
`renderEmailHTML(brand, campaign, products, brief, segment, images, { productLayout,
moduleLayout, … })` with the block **version overrides** applied to the brief copy first
(edited HTML replaces the corresponding brief fields), downloads
`email_seg{code}.html`. Verify the file contains literal `{{paramurl}}`,
`{{unsubscribe}}`, `{{first_name}}` and table-based markup.

- [ ] **Step 3: Create Template_ID**

Button flow: build cleaned segment HTML (`cleanForTemplate` path used by
`/api/sync-template`) → POST `/api/sync-template` `{name, subject, html}` → on `d-…`
success: store in `state.templates[code]`, ✓ on the segment pill (tooltip shows id),
auto-switch to tab 2 where the registry lists it. Errors surface as toasts (422 details).

- [ ] **Step 4: Draft restore (S5)**

On mount: `parseDraft(localStorage)` → if present show Restore/Discard bar (same pattern
as old Studio's pendingRestore). Restore rehydrates full `BuilderState` (phase `ready` if
any seg done).

- [ ] **Step 5: Gate + commit**

```bash
npm test && npx tsc --noEmit && npm run build
git add app/builder
git commit -m "feat(builder): quality gate, export, template handoff, restore"
```

## Task 8: Final Verification And Polish

**Files:** modify only if verification reveals defects.

- [ ] **Step 1: Full gates**

```bash
npm test
npx tsc --noEmit
npm run build
```

Expected: all pass.

- [ ] **Step 2: Manual flow checklist (mirror of the stakeholder demo)**

Run `npm run dev`, then:

1. Load `/` → S0 skeleton: real banner/footer, ghost text, dashed products, dimmed tabs,
   disabled Export/Create, overlay card visible.
2. Switch Brand → full re-theme + staged segments swap; switch back to BraGoddess.
3. Open Layout in S0 → product layout rearranges ghost tiles.
4. Generate → products fill instantly → shared blocks stream → segment tabs ⏳→done in
   order → finished blocks editable before the run completes.
5. Generate again → Cancel mid-run → partial kept, `↻` on unfinished tab → retry works.
6. Edit a story block (SEG) → only current segment changes; regenerate headline (ALL) →
   every segment shows the new headline; version ‹›​ navigation works both scopes.
7. Subject style S2/S3 applies per segment; product layout + Custom flow drag reorder.
8. Change hero image URL; Swap product refills price/USP from catalog.
9. Quality chip lists flags; a segment with a blocking flag disables Create Template_ID.
10. Export HTML → file opens, merge tags literal, tables/inline styles present.
11. Create Template_ID (with `SENDGRID_API_KEY` set) → `d-…` returned, pill ✓, auto-jump
    to tab 2, registry row present. Without the key: error toast, no crash.
12. Reload → Restore bar → Restore returns the full S3 state; Discard → S0.
13. `/studio` still renders the old app untouched.
14. Mobile width toggle + dark inbox render correctly.

- [ ] **Step 3: Commit fixes if any**

```bash
git add app lib
git commit -m "fix(builder): polish from final verification"
```

## Self-Review

- Spec coverage: 3-tab shell, S0 skeleton (real config parts + ghosts), S1 live re-theme,
  S2 SSE streaming with cancel/partial/retry, S3 block editing with SEG/ALL scopes and
  versions, subject styles, ProductLayout + module reorder + drag, image overrides,
  quality gate from `validateBrief`, real export via `renderEmailHTML`, real
  `sync-template` handoff with session registry, draft restore — Tasks 3–7.
- Scope: no A/B, no prompt-editing screen, no Product/Segment/Schedule module UIs, no
  image upload hosting, tabs 2/3 placeholders — matching spec Non-Goals.
- Reuse over rewrite: generation, validation, rendering, cleaning, auth, SendGrid calls
  all come from existing `lib/` — new code is UI, state, sanitizer, and thin API seams.
- Placeholder scan: no unresolved TODO markers in this plan; Task 0 explicitly resolves
  the only intentional unknowns (exact GenBrief field names, SSE event emission, patch
  function seam, moduleLayout keys) before dependent tasks run.
