# 19: A test pins that a failed queryjs run still on screen keeps its charts

**Status:** ready-for-agent

Priority: P3 (test gap from Issue 08's review)

**What to build:** A test only, no app change. When a queryjs run throws, the catch path in `execute` destroys the run's Chart.js charts only when its container is already detached (`if (!container.isConnected) destroyChartsIn(container);`, `src/lib/plugins/queryjs/queryjs-block-widget.ts:248`). No test pins the guard: Issue 08's round-2 reviewer changed the line to call `destroyChartsIn(container)` unconditionally and the whole widget test file stayed green (`.scratch/ui-responsiveness/work/08/review-2.md`, finding 1, kept in git history). A failed run still on screen would then lose the charts it drew before it threw, because Chart.js `destroy()` clears the canvas.

Add a test in `src/tests/lib/plugins/queryjs/queryjs-block-widget.test.ts`: a run on an attached container creates a tracked chart and then throws; assert the chart's `destroy` was not called and the structured error is rendered. Keep the existing detached-container test (charts destroyed) green. Check that the new test fails with the guard removed (mutation check), then restore it.

**Blocked by:** 12

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** src/lib/plugins/queryjs/queryjs-block-widget.ts:240-252, src/tests/lib/plugins/queryjs/queryjs-block-widget.test.ts

- [ ] New test: a failed run on an attached container keeps its chart (`destroy` not called) and shows the error
- [ ] The test fails when line 248 calls `destroyChartsIn(container)` unconditionally (record the mutation check in Notes)
- [ ] The detached-container case still destroys the charts; the widget test file stays green

## Notes

- Blocked by 12 only because 12 edits the same widget and test file; the test does not depend on 12's behavior.
- A `test:` commit, not `fix:`, so no `Test-Exempt` trailer is needed.
