VERDICT: APPROVED

## Previous findings

| # | Severity | Outcome | Evidence |
|---|----------|---------|----------|
| 1 | minor | resolved | `queryjs-block-widget.ts:285-286`: `execute()`'s catch calls `queryjsSessionStore.clearStale(filePath, this.jsContent)` before rendering the error; `queryjs-session.store.svelte.ts:153-155` deletes only that key (no-op and no reassignment when the key is absent). A failing stale block now shows its error once and Run on the next draw, so rule 2 of `docs/agents/live-preview-rules.md` holds. Probe: I put back the widget from `a78dfa61` and ran `pnpm vitest run src/tests/lib/plugins/queryjs/queryjs-block-widget.test.ts -t "rerun throws"`: exit 1, the new test failed. Restored with `git checkout HEAD --`; `git status` clean. With HEAD it passes. The test uses the real stores and real `invalidateQueryjsCache()`, asserts on the rendered Run button and on `isStale`. Two store tests cover `clearStale` (this key only; absent key changes nothing). |
| 2 | minor | rejection stands | No code can do the live check; it is the main session's on the work machine after merge, and `review-ticks` sets the Issue status at delivery. |
| 3 | nit | rejection stands | Memory only (path and script strings), no behavior change; bounding it would add code with no visible effect. |
| 4 | nit | rejection stands (deferred) | Commit-body line ranges are to be corrected in deliver's squash message; nothing to change on the branch. |

## Acceptance criteria

- [met] Failing test first, reproducing the problem; it passes after the change. — Round 1 verified the hub-return test against main's widget; this round's new test also fails against the pre-fix widget (probe above, exit 1) and passes at HEAD.
- [met] Returning to a hub after editing another note shows its list without a click, with no visible slowdown elsewhere. — The fix only narrows re-runs (a failing stale block no longer re-runs per redraw); the hub-return path at `queryjs-block-widget.ts:144-147` is unchanged and its tests pass. Live slowdown check on a chart-heavy note remains for the main session after merge (previous finding 2).
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exits 0 (0 errors, 0 warnings). `queryjs-block-widget.test.ts` and `queryjs-session.store.test.ts` exit 0, 61 of 61. The full `pnpm vitest run` is deliver's to run.

## Findings

None open or new.

## Other checks

- Regressions: `clearStale` runs on every failed run, stale or not; for a non-stale key it is a no-op. A run in flight across a new invalidation that then fails drops the fresh mark too, which is the intended outcome (the block failed). No test was weakened or deleted; the diff adds tests only.
- Scope: store, widget, their two test files, the ADR 0010 amendment sentence and `review.md`'s resolution. No layer-baseline change, no composition root, no `src-tauri/` change.
