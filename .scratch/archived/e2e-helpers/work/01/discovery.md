# Issue 01 discovery: E2E active-tab helpers

## Files that change
- `e2e/fixtures/helpers.ts:76-84` - `activeTab` / `expectTabActive`. Selector `[role="tab"][data-state="active"]` never matches: `src/lib/core/markdown-editor/EditorTabs.svelte:35-37` renders `role="tab"` + `aria-selected={index === editorStore.activeIndex}` inside the `role="tablist"` div with class `editor-tabs-bar` (:19).
- `e2e/specs/properties-cross-note.spec.ts:64-66` - local `expectActive` duplicates the helper with the right selector; replace it with `expectTabActive` (called at :88 after the A click and :120 after each switch to B).

## Plan
1. Spec first: swap `expectActive` for `expectTabActive` (old helper selector still in place). Run `bash scripts/e2e.sh e2e/specs/properties-cross-note.spec.ts --retries=0`; expect every scenario to fail at `openBothNotes` (locator never resolves). Record the failure in the Issue comments.
2. Helper: `.editor-tabs-bar [role="tab"][aria-selected="true"]`, drop `.first()` so Playwright strict mode fails loudly if two tabs ever match. JSDoc names `aria-selected` and the `editor-tabs-bar` scope. Re-run the spec: 3/3 pass.

## Why scope to `.editor-tabs-bar`
`src/lib/features/event-calendar/EventCalendarHeader.svelte:110-111` also renders `role="tab"` + `aria-selected` (Day/Week/Month switcher). With the Calendar tab open, a bare `[role="tab"][aria-selected="true"]` matches two elements, so "matches exactly one element" needs the editor tablist scope.

## Prior art
The bare selector is inlined in ~15 specs (`tabs.spec.ts:23`, `tab-pinning.spec.ts:17`, ...). Out of scope: the Issue asks for at least one spec; migrating the rest is left as is.

## Risks
- `editor-tabs-bar` is a class, not a test id; if it is renamed the helper breaks loudly (timeout), not silently.
- No unit seam: E2E helper only; verification is the E2E run (the automatic gate does not run E2E).
