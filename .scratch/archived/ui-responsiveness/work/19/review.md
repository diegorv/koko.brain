VERDICT: APPROVED

## Acceptance criteria

- [met] New test: a failed run on an attached container keeps its chart (`destroy` not called) and shows the error — `src/tests/lib/plugins/queryjs/queryjs-block-widget.test.ts:530-562` ("keeps the charts of a failed run whose widget is still on screen") appends `toDOM()`'s container to `document.body` before the run settles, tracks a canvas with a `vi.fn()` destroy while `get_all_vault_entries_v2` is held, releases it, waits for `.cm-lp-qjs-error`, then asserts `destroy` not called, the canvas still in the container, the title `QueryJS error: visible boom`, and no cache entry. The error is rendered into the same container the guard checks (`execute` catch, `src/lib/plugins/queryjs/queryjs-block-widget.ts:269-274`). I ran the file: exit 0, 25/25 passed.
- [met] The test fails when line 248 calls `destroyChartsIn(container)` unconditionally (record the mutation check in Notes) — I reproduced it myself: replaced `if (!container.isConnected) destroyChartsIn(container);` (now at :273; Issue 12 moved it from :248, and the build report and discovery.md say :270, also stale) with `destroyChartsIn(container);`, ran the widget test file: exit 1, only the new test fails (1 failed, 24 passed). Restored with `git checkout`, worktree clean. The record is in `.scratch/ui-responsiveness/work/19/discovery.md:37-41`, not in the Issue's Notes (finding 1).
- [met] The detached-container case still destroys the charts; the widget test file stays green — "destroys the charts of a run that failed after its widget was destroyed" (`queryjs-block-widget.test.ts:499-528`) is untouched by the diff and passes; the whole file passes 25/25 with the guard in place. The full suite (`pnpm vitest run && pnpm build`) is deliver's to run.

## Findings

1. minor — `.scratch/ui-responsiveness/issues/19-queryjs-failed-run-keeps-attached-charts.md` (Notes): criterion 2 asks for the mutation check to be recorded in the Issue's Notes; the build put it only in `work/19/discovery.md:37-41`. Fix: deliver adds one Notes line (guard at :273 made unconditional, the new test alone fails, 1 failed / 24 passed; guard restored, 25/25).
2. nit — Issue file, "What to build" and criterion 2 cite `queryjs-block-widget.ts:248` / Source `:240-252`; after Issue 12 the guard is at `:273` (catch at `:269-274`; `discovery.md:11` says `:270`, also off). Fix: deliver can note the moved line in the Notes; no code change.
3. nit — commit `b8720737` message, Files: says `queryjs-block-widget.test.ts (533-566)`; the new test spans `530-562`. Fix: use `530-562` in deliver's squash message.
4. nit — `src/tests/lib/plugins/queryjs/queryjs-block-widget.test.ts:561`: the `invoke` mock is reset as the test's last statement, so a failing assertion above it leaks the held-entries mock into later tests. Same pattern as the two sibling held-IPC tests (in flight, detached failure), so not a regression; an `afterEach` reset in the describe would cover all three. Optional.

## Other checks

- Scope: the diff touches only the widget test file and `work/19/discovery.md`; no app code, no `layer-baseline.json` or `BASELINE_SIZE` change.
- Added lines use tabs.
- `pnpm check`: exit 0, 0 errors, 0 warnings.
- Test verdict rests on `src/tests/lib/plugins/queryjs/queryjs-block-widget.test.ts` (run by me, with the guard and with the mutation). No app source changed, so there are no other test files to run.

## Resolution

1. Fixed: the mutation check (guard at `:273` made unconditional, only the new test fails, 1 failed / 24 passed; guard restored, 25/25) is recorded in the Issue's Notes.
2. Fixed: the Issue's Notes record that the guard moved to `queryjs-block-widget.ts:273` (catch at `:269-274`) after Issue 12.
3. Fixed: deliver's squash message gives the new test as `queryjs-block-widget.test.ts (530-562)`.
4. Rejected (optional): the end-of-test `invoke` reset matches the two sibling held-IPC tests and leaks only when an assertion already failed; moving all three to an `afterEach` is a refactor of existing tests outside this Issue and would need a re-review for no behavior change.
