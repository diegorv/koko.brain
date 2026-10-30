# 01: Live-preview DOM tests do not depend on parse timing

**What to build:** Live-preview tests that mount an `EditorView` and count decorations pass reliably on a loaded machine. On 2026-10-29, with seven implement workflows running gates at once (load average ~35 on 10 cores), full `pnpm vitest run` failed intermittently in tests unrelated to the branch, each time with "expected 0 to be greater than 0" on a decoration count, and each passed when re-run alone:
- `keyboard-reveal.test.ts` ("table: ArrowRight reveals it on entry and renders it again on exit")
- `mermaid-field.test.ts` ("updates when document changes")
- `block-math-field.test.ts`
- `editor-extensions.test.ts`

Likely cause, already proven for one case: CodeMirror parses the initial document under a ~20 ms budget; under load the parse is cut short, decorators build from a truncated tree and the test sees no decorations. Issue 10 of live-preview-analysis fixed the heading-size tests by forcing a full parse before asserting; `pipeline-dom.test.ts` documents the same trap and uses `createMarkdownState` for it. Apply one shared approach (a test helper that builds the state with a finished parse, and for doc-change tests, finishes parsing after the dispatch) to every live-preview test that mounts a view, and confirm the cause per test before changing it.

**Context:** It handed `help-examples` issue 04 to a human after two gate failures and failed single runs in issues 03 and 05. Logs: `.claude/worktrees/test-logs/help-examples-04-deliver*.log`, `help-examples-03-deliver.log`, `help-examples-05-deliver-rebase.log`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `src/tests/lib/core/markdown-editor/test-helpers.ts` (modify; shared parse-complete helper)
- `src/tests/lib/core/markdown-editor/extensions/live-preview/**` (modify; tests that mount an `EditorView`)

**Gate:** `pnpm check` + `pnpm vitest run` on the live-preview test folder. Reproduce the flake first: run the four files under CPU load (e.g. several parallel `vitest run` processes or a `--parse budget` shim) until one fails, then show they pass under the same load after the fix.

- [ ] The cause is confirmed per test (truncated parse or something else), recorded in the commit
- [ ] Every live-preview test that mounts a view gets a finished parse through one shared helper
- [ ] Under the same artificial load that made them fail, the four tests pass 10 runs in a row

## Comments

- 2026-10-29 22:58 — discovery — cause reproduced with a 25 ms Date.now step: 12 tests in 10 files, all truncated parse — 757dbb7d
- 2026-10-29 23:03 — implement — mountMarkdownView + withFullParse in test-helpers; 7 field tests, keyboard-reveal, queryjs, editor-extensions moved onto them; markdown-editor suite 1546/1546 with and without a 25 ms Date.now step, the four named files 10/10 runs under it; pnpm check 0 errors — e2de12d2
- 2026-10-29 23:10 — review — CHANGES_REQUESTED: all 3 criteria met (main fails 6/42 under the 25 ms step, fix passes 10/10 runs and 1546/1546 suite under it); low: editor-extensions dispose leaks the mount div, nit: helper JSDoc overclaims ViewPlugin — cd51c8e3
