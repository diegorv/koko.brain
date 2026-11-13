VERDICT: APPROVED

Reviewed `git diff main...HEAD` (168218258, d378338ed, fb5e3d042) in the worktree.

## Acceptance criteria

- [met] Failing test first, in src/tests/lib/features/canvas/canvas-tab-switch.test.ts: type into canvas A's card, advance 100 ms, `await closeTab(tabIndex(A))`, `flushSync()`, advance 3000 ms. Assert: `tabIndex(A) === -1`; `writeTextFile` was called with A's path and content containing the typed text; `ask` was not called (add `vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }))` to the file: today `ask` is unmocked, returns false through the mocked `invoke`, and a flush-only fix would pass a weaker test); `writeTextFile` was never called with the neighbour's path and the neighbour's tab content is unchanged. It fails today. — canvas-tab-switch.test.ts:51 adds the dialog mock, :104 resets `ask` per test; the test at :179-197 follows the exact steps and asserts `tabIndex(A) === -1`, exactly one write to A containing 'typed in A' (stronger than required), `ask` not called, no write to M and M's content unchanged. My probe: with main's CanvasInner.svelte restored, the test fails ("expected [] to have a length of 1 but got +0", 1 failed / 5 passed); with the branch, 6/6 pass.
- [met] Closing a canvas with no pending edit closes with no write and no prompt, as today. — canvas-tab-switch.test.ts:200-213 asserts the tab is gone, `writeTextFile` and `ask` not called; passes. The flusher returns early on `!pendingPersist` (CanvasInner.svelte:247) and `flushPendingEdits` returns true, so closeTab skips the save block for a clean tab.
- [met] Unit tests in src/tests/lib/core/editor/editor.service.test.ts (`describe('closeTab')`, set the `writeTextFile` and `ask` mocks explicitly in each test): a flusher registered for the closing path runs before the dirty check, and when it changes the tab content closeTab writes it, never calls `ask`, and removes the tab; a flusher for another path, an unregistered flusher and a pinned tab's flusher are not called; unregistering one of two flushers for the same path leaves the other registered; a throwing flusher is logged, `ask` is called with 015's failed-save prompt, Cancel keeps the tab, and the confirm answer closes it. — editor.service.test.ts:797-926 inside `describe('closeTab')` (beforeEach `vi.clearAllMocks()` at :618, so the `logError` assertions cannot leak from earlier tests). Each closeTab test sets `writeTextFile` and `ask` explicitly. Flusher-before-dirty-check: tab starts clean, flusher writes 'flushed', write is `[['/vault/board.canvas','flushed']]`, no ask, tab removed. Other-path, unregistered and pinned flushers: `flush` not called. Two flushers: first unregistered not called, second called once. Throwing flusher: `error('EDITOR', ...)` asserted, exact 015 prompt text and options, Cancel keeps the tab; confirm answer closes it. 103/103 pass.
- [met] The comment above CanvasInner's onDestroy (CanvasInner.svelte:243-245) says it covers a tab switch and a source-mode toggle, and that a close goes through the registered flusher. It no longer claims to cover quit. — CanvasInner.svelte:254-256 now reads "switches tabs or toggles source mode within the 300ms debounce window. A close goes through the flusher registered above."; "quits" removed.
- [met] Frontend gate green: pnpm check, pnpm vitest run, pnpm build. — `pnpm check` exit 0 (0 errors, 0 warnings); `pnpm build` exit 0 ("Wrote site to build"); targeted vitest files pass (below). The full suite is deliver's to run.

## Findings

1. nit — src/lib/features/canvas/CanvasInner.svelte:246-251: when the flusher throws (in practice inside `persistChanges`, after `clearTimeout(nodesChangeTimer)`), `pendingPersist` stays true with no timer armed, so after Cancel the edit lives only in the canvas state until the next node change or the instance's destroy flush; it is not lost, and a second close re-runs the flusher. Fix (optional): call `clearTimeout` after `persistChanges` succeeds, or leave as is; the throwing case is hypothetical today.

No blocker or major findings. Checked and found correct:
- closeTab (editor.service.ts:370-383) runs the flush after the pinned check and only for non-virtual tabs, re-reads dirtiness by path (`isPathDirty`) because the flush replaces the tab content, and prompts when the flush threw even on a clean tab, as the Issue requires. `writeTab` (:236-238) skips a clean tab, so a failed flush on a clean tab writes nothing, matching the test at :886.
- The registry is a `Set` per path and the unregister deletes by identity (editor.service.ts:62-75), covering the adjacent destroy/mount of a source-mode toggle or re-key.
- Layer rule: core does not import features; CanvasInner imports core. layer-rules.test.ts passes, baseline and BASELINE_SIZE unchanged.
- The flusher's `onContentChangeForPath` arms the 2 s body autosave; after the close it finds no dirty tab for the path (no-op). It also cancels a pending 500 ms frontmatter timer for other tabs, but the body save covers every dirty tab, so that only delays a save; this is pre-existing `onContentChangeForPath` behaviour, not new to this diff.
- No scope creep: rename, quit, vault switch and delete stay untouched, per the owner's 2026-11-12 decision.

## Checks run by the reviewer

- `pnpm check`: exit 0.
- `pnpm build`: exit 0.
- `pnpm vitest run src/tests/lib/features/canvas/canvas-tab-switch.test.ts src/tests/lib/core/editor/editor.service.test.ts src/tests/lib/architecture/layer-rules.test.ts`: exit 0, 3 files, 123 tests.
- `pnpm vitest run src/tests/lib/radius-scale.test.ts src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts src/tests/lib/app/boot.test.ts src/tests/lib/features/collection/collection-view-index-path-change.test.ts src/tests/lib/core/filesystem/fs.service.test.ts src/tests/lib/core/filesystem/fs.service.race-audit.test.ts` (other tests reaching the real closeTab or the canvas): exit 0, 6 files, 185 tests.
- Probe: main's CanvasInner.svelte restored, canvas-tab-switch.test.ts fails on the criterion-1 test; file restored afterwards, worktree clean.
- Not run: the full suite (deliver's step) and the targeted e2e `bash scripts/e2e.sh e2e/specs/canvas-view.spec.ts e2e/specs/editor.spec.ts`, which the Issue asks to run once before delivery.

The test verdict rests on canvas-tab-switch.test.ts, editor.service.test.ts and layer-rules.test.ts, plus the six related files above.

## Resolution

- Finding 1 (nit, accepted): the canvas flusher now calls `clearTimeout(nodesChangeTimer)` only after `persistChanges` returns, so a throwing persist leaves the 300 ms timer armed to retry the edit (CanvasInner.svelte:246-253).
