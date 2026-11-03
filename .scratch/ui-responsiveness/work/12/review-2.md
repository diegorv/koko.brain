VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | rejection stands | Pending mark not cancelled by `invalidatePath` / `reset()`. The window is one frame (`queryjs-block-widget.ts:49-59`); the outcome is a visible ▶ Run, fixed with one click. A fix needs widget/store coupling; per the owner's simplicity rules a rare, visible, recoverable glitch does not justify it. |
| 2 | minor | rejection stands | rAF throttled in a hidden webview only widens the window in which a cache miss re-executes. Re-execution replaces the earlier result via `setResult`, so nothing leaks; the cost is an extra run. A `setTimeout` cap would land before CodeMirror's measure pass and reintroduce the original bug for late blocks. |
| 3 | nit | resolved | `src/lib/plugins/queryjs/queryjs-block-widget.ts:69` now reads `always  re-attach DOM  execute  execute (re-render)`, matching `:147` where `markAutoRunAfterRenderPass` runs only when `policy === 'first-open'`. Comment-only change. |
| 4 | nit | resolved | `help/documentation/13-queryjs.md:29` adds: every block drawn when the note opens auto-runs; a block first drawn later on scroll shows ▶ Run. This matches the code: after the rAF mark lands, `hasAutoRun(filePath)` is true and `:138-139` falls through to the run prompt. |

## Acceptance criteria

- [met] Failing first: two blocks in one file under `first-open` both auto-run on the first open — the fixes do not touch the test file or runtime code; `queryjs-block-widget.test.ts` passes on HEAD (24/24, exit 0), including "auto-runs every block built in the first render pass of a file". Round 1's red probe against main's source stands.
- [met] The full `autoRunQueries` matrix (CLAUDE.md live-preview rule 10) stays green, including "manual mode never marks `autoRunOnFirstOpen`" — the fix commit changes only a doc-comment cell and a help sentence; the widget test file passes (24/24), including the manual-never-marks and always-re-executes tests. The full suite and `pnpm build` are deliver's to run.
- [met] ADR 0010 updated if the matrix changes — the matrix behavior did not change; the doc-comment correction in the widget makes the comment match code that ADR 0010's amendment (`docs/adr/0010-queryjs-kb-api-caching.md:13-15`) already describes. No ADR change needed.

## Checks I ran

- `git diff 14925c2b..HEAD`: 3 files, the review file's Resolution, one comment line in `queryjs-block-widget.ts`, one help sentence. No test weakened or removed, no scope creep, no layer-baseline or composition-root change, nothing under `src-tauri/`.
- `pnpm check`: exit 0, 212 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/plugins/queryjs/queryjs-block-widget.test.ts`: exit 0, 24 passed.
- No test asserts the changed comment or help text (searched `src/tests` and `help`).

## Findings

None open or new.
