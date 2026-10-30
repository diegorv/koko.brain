# 01: E2E active-tab helpers match the real tab markup

**What to build:** `activeTab` and `expectTabActive` in `e2e/fixtures/helpers.ts:77-84` find the active editor tab. Today they look for `[role="tab"][data-state="active"]`, but `EditorTabs.svelte` (~L37) marks the active tab with `aria-selected`, so the locator never matches and any spec using them would fail or wait out its timeout. No spec calls them today. Fix the selector to the attribute the component actually renders (`[role="tab"][aria-selected="true"]`, confirm against the component), keep the helper names, and use `expectTabActive` in at least one existing spec that switches tabs (for example `e2e/specs/properties-cross-note.spec.ts` after each tab switch), so the helpers are exercised and cannot rot again.

**Context:** Found by the review of properties-cross-note issue 02 (`.scratch/properties-cross-note/work/02/review.md`, finding 4). Owner asked for a fix rather than deletion, 2026-10-30.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `e2e/fixtures/helpers.ts` (modify; :77-84)
- one or more `e2e/specs/*.spec.ts` that switch tabs (modify; add `expectTabActive`)

**Gate:** `bash scripts/e2e.sh` for the specs that now use the helpers (the automatic gate does not run E2E)

- [ ] `activeTab` matches exactly one element, the active tab, and its JSDoc names the attribute it relies on
- [ ] At least one spec calls `expectTabActive` after a tab switch and passes via `bash scripts/e2e.sh`
- [ ] Shown failing first: with the old `data-state` selector the updated spec fails
