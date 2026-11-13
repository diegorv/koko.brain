VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major (not a blocker) | rejection stands | Deferral holds. The Issue's prescribed fix names only `openGraphTab` / `toggleGraphTab`, and following every focus (tab-bar `switchTab`, cycling, neighbour close, session restore) needs a tracker outside the plugin's two functions, since core cannot import the plugin (ADR-0003). The branch is never worse than main. The main session must open the follow-up Issue. |
| 2 | minor | resolved | `graph-view.service.ts:35` returns early when `editorStore.activeTabPath === GRAPH_VIRTUAL_PATH`, before `captureCenterPath()`. With the graph active, `setActiveIndex` on the same index would have been a no-op, so the early return changes nothing but the center. Test `graph-view.service.test.ts:181-189` opens from A, calls again, asserts the graph is active and the center is still A. Without the guard, `captureCenterPath()` reads the graph tab (not a markdown note) and writes null, so the test would fail. `toggleGraphTab()` is unaffected: it calls `openGraphTab()` only when no graph tab exists, so the guard never fires there. |
| 3 | minor | rejection stands | Deferred to the same follow-up. `fullData` in `GraphView.svelte` is a plain `let`; a hint for a stale center needs reactive data or a path-change consumer. Rarer than the original symptom, not a regression against main. |
| 4 | nit | rejection stands | jsdom has no 2D canvas; `render()` returns before drawing. |

## Acceptance criteria re-checked

- [met] Test: opening the graph with no note tab (or from another virtual tab) leaves the center null, and switching from note A to the already open graph tab updates the center to A. — The fix touches `openGraphTab()`, so I re-checked these tests: the no-tab, Tags-tab and canvas-tab cases and the focus-from-A cases in `graph-view.service.test.ts` still pass. The guard fires only when the graph is the active tab, which none of those cases reach. The new test covers re-opening the active graph.
- [met] Frontend gate green. — `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings. Targeted vitest (below): exit 0. The fix changes no build input beyond a one-line guard; deliver runs the full `pnpm vitest run` and `pnpm build`.

## Findings

None open or new. Findings 1 and 3 stay deferred and need a follow-up `.scratch` Issue from the main session.

## Checks run (this review)

- `taskpolicy -c background pnpm check`: exit 0, 216 files, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/plugins/graph-view/ src/tests/lib/app/commands.test.ts src/tests/lib/app/global-keybindings.test.ts`: exit 0, 6 files, 175 tests passed.
- Scope: the fix diff (`324b48912..HEAD`) touches only `graph-view.service.ts`, its test file and the review file's Resolution. No test weakened or deleted, no layer-baseline change, no new composition root.
