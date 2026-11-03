VERDICT: APPROVED

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | minor: help doc says the cache is keyed by content hash | resolved | `help/documentation/13-queryjs.md:36` now says the cache is keyed by the note and the script text, and that a block in two notes renders once per note. |
| 2 | minor: Run/retry handlers and a failed in-flight run leak charts | resolved | `queryjs-block-widget.ts:189` (Run) and `:294` (retry) call `destroyChartsIn(container)` before `replaceChildren()`. `:248` destroys charts in the `execute` catch when the container is detached. Probe: removing the retry call makes "destroys the charts of a failed run when the user clicks Run again" fail. Removing the catch call makes "destroys the charts of a run that failed after its widget was destroyed" fail. Both probes were reverted. |
| 3 | nit: `runningContainers` steals the class JSDoc | resolved | The `const` now sits at `:36-37`, above the class JSDoc, which attaches to `export class QueryjsBlockWidget` again. |
| 4 | nit: ADR 0010 "Cache by widget identity" rationale reads as current | resolved | `docs/adr/0010-queryjs-kb-api-caching.md:65` now ends with "(Superseded by the 2026-11-03 amendment: results are keyed by note path plus script text.)". |
| 5 | nit: no widget test for manual Run not marking auto-run | resolved | New test "clicking Run in manual mode runs the block without marking the file as auto-run" is in the describe block whose `beforeEach` sets manual mode. It waits for the rendered `ran` paragraph and asserts `hasAutoRun('/vault/note.md') === false`. |

## Acceptance criteria re-checked

- [met] Failing first: dropping a cached result calls `destroy()` on the charts it created — the store and widget `destroy` tests from round 1 are unchanged and pass. The fix adds two tests for uncached failed runs, and each fails under its mutation probe.
- [met] The `autoRunQueries` matrix tests stay green (CLAUDE.md live-preview rule 10; manual mode never marks `autoRunOnFirstOpen`) — `queryjs-block-widget.test.ts` and `queryjs-session.store.test.ts` pass. The Run handler still has no `markAutoRun` call, and the new manual-Run test pins that invariant.
- [met] ADR 0010 amendment written and dated, and CLAUDE.md live-preview rules 9 and 10 updated (they describe the cache as `Map<contentHash, HTMLElement>` keyed by `hasResult(jsContent)`) — the amendment is unchanged, and the stale alternative's rationale is now marked superseded (`docs/adr/0010-queryjs-kb-api-caching.md:65`).

## Findings

1. nit — `src/lib/plugins/queryjs/queryjs-block-widget.ts:248`: no test pins the `!container.isConnected` guard. Probe: changing the line to call `destroyChartsIn(container)` unconditionally leaves the whole widget test file green. A failed run still on screen would then lose the charts it drew before it threw (Chart.js `destroy()` clears the canvas). Fix: add a test where a run fails on an attached container with a tracked chart, and assert that `destroy` was not called.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/plugins/queryjs/ src/tests/lib/architecture/`: exit 0, 18 files, 590 passed, 1 todo.
- Three mutation probes on `queryjs-block-widget.ts` (drop the retry destroy, drop the catch destroy, make the catch destroy unconditional). The first two fail the new tests. The third passes, which is finding 1. All three were reverted with `git checkout`, and the worktree is clean.
- No test was deleted or weakened. The diff since the round-1 review touches only the widget, its test, the help doc, ADR 0010 and the review file. The layer baseline is unchanged.
- The full suite and `pnpm build` were not run: deliver runs them.
