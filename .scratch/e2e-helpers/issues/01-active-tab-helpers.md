# 01: E2E active-tab helpers match the real tab markup

**What to build:** `activeTab` and `expectTabActive` in `e2e/fixtures/helpers.ts:77-84` find the active editor tab. Today they look for `[role="tab"][data-state="active"]`, but `EditorTabs.svelte` (~L37) marks the active tab with `aria-selected`, so the locator never matches and any spec using them would fail or wait out its timeout. No spec calls them today. Fix the selector to the attribute the component actually renders (`[role="tab"][aria-selected="true"]`, confirm against the component), keep the helper names, and use `expectTabActive` in at least one existing spec that switches tabs (for example `e2e/specs/properties-cross-note.spec.ts` after each tab switch), so the helpers are exercised and cannot rot again.

**Context:** Found by the review of properties-cross-note issue 02 (`.scratch/properties-cross-note/work/02/review.md`, finding 4). Owner asked for a fix rather than deletion, 2026-10-30.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `e2e/fixtures/helpers.ts` (modify; :77-84)
- one or more `e2e/specs/*.spec.ts` that switch tabs (modify; add `expectTabActive`)

**Gate:** `bash scripts/e2e.sh` for the specs that now use the helpers (the automatic gate does not run E2E)

- [x] `activeTab` matches exactly one element, the active tab, and its JSDoc names the attribute it relies on
- [x] At least one spec calls `expectTabActive` after a tab switch and passes via `bash scripts/e2e.sh`
- [x] Shown failing first: with the old `data-state` selector the updated spec fails

## Comments

- 2026-10-30 08:10 — discovery — plan in work/01/discovery.md: scope selector to editor tablist + aria-selected, use expectTabActive in properties-cross-note spec — dd5aa81f
- 2026-10-30 08:11 — implement — red with old data-state selector (properties-cross-note spec: element(s) not found at helpers.ts:83, 1 failed 2 interrupted); green with .editor-tabs-bar [role="tab"][aria-selected="true"] (3 passed); pnpm check 0 errors — d4d446ad
- 2026-10-30 08:14 — review — APPROVED: AC 1-3 met (re-ran green 3/3, reproduced red with data-state selector, probe shows activeTab count 1 with Calendar open); 2 non-blocking findings in work/01/review.md — 0978fe7f
- 2026-10-30 08:15 — fix — review finding 1 fixed (event-calendar spec uses expectTabActive with the calendar tablist open; calendar E2E 34 passed); finding 2 deferred as out of scope — 4af52ff1
