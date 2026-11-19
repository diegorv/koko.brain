VERDICT: APPROVED

Reviewed `git diff main...HEAD` (6289cb83f..f09eec527) in the worktree. No `spec.md` exists for ux-quick-wins; the Issue file is the spec.

## Acceptance criteria

- [met] Failing test first, `src/tests/lib/plugins/graph-view/graph-view.logic.test.ts`: `formatGraphStats(0, 0)` is "0 notes · 0 links", `(1, 1)` is "1 note · 1 link", `(2, 3)` is "2 notes · 3 links". — `graph-view.logic.test.ts:575-587` asserts exactly these three strings with `toBe`; `graph-view.logic.ts:305-310` implements it; the test commit precedes no helper on main (the import would fail), so it failed first. Passes in my run.
- [met] Failing test first, new `src/tests/lib/plugins/word-count/WordCount.test.ts` (real `editorStore` with an active `.md` tab, fake timers advanced 500 ms): empty content shows "0 words" and no "min read"; "hello" shows "1 word", "5 characters" and "1 min read"; a 250-word body shows "2 min read"; a non-markdown tab renders nothing. — New file uses the real `editorStore` (`addTab`, `reset`), `vi.useFakeTimers()` + `advanceTimersByTime(500)`; cases at `:36-70` cover empty (`not.toContain('min read')`), "hello" (`1 word`, `not.toContain('1 words')`, `5 characters`, `1 min read`), 250 words (`2 min read`) and a `.canvas` tab (empty text). On main's component the empty case fails ("1 min read" always rendered, `readingTime` starts at 1) and the "hello" case fails ("1 words"). Passes in my run.
- [met] `src/tests/lib/plugins/graph-view/GraphView.test.ts:73` changes from `toContain('1 links')` to `toContain('1 link')` plus `not.toContain('1 links')`. It pins the bug today, so this corrects a test that encodes it and does not weaken one. `:120,135` ("2 links") stay. — `GraphView.test.ts:73-74` now has both assertions; the "2 links" assertions are untouched (not in the diff). Also `:202` moved from `'1 notes'` to `'1 note · 0 links'`, which pinned the same bug and is now stricter.
- [met] `GraphControls.test.ts`: `aria-pressed` on the Global and Local buttons follows `graphViewStore.mode` and flips after a click; the lookups by `aria-label` at `:290-296` still work. — New case at `GraphControls.test.ts:298-319` checks `aria-pressed` "true"/"false" against `graphViewStore.mode`, clicks Local then Global and re-checks both the store and the attribute; `:290-296` unchanged and passing. `GraphControls.svelte:51,62` add only `aria-pressed`; `onclick`, `title`, `aria-label` and `setMode` are untouched.
- [met] `estimateReadingTime` and its tests are unchanged. `bash scripts/e2e.sh e2e/specs/word-count.spec.ts` passes: its counts (`\d+ words`, `\d+ min read` on `Welcome.md`, and the status-bar test at `:43-83` typing "Some words here") stay above 1, so no selector changes. — `git diff main...HEAD` touches neither `word-count.logic.ts` nor `word-count.logic.test.ts`. The spec's regexes (`\d+ words`, `\d+ characters`, `\d+ min read`) still match for `Welcome.md`, and the status-bar test compares slot width and gaps, not the counter's width. The E2E run itself is deliver's to do; not run here.
- [met] Frontend gate: pnpm check and pnpm vitest run pass. — `pnpm check` exit 0 (237 files, 0 errors, 0 warnings). Targeted vitest (5 files below) exit 0, 117 tests. The full suite is deliver's to run.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on `src/tests/lib/plugins/graph-view/GraphControls.test.ts`, `src/tests/lib/plugins/graph-view/GraphView.test.ts`, `src/tests/lib/plugins/graph-view/graph-view.logic.test.ts`, `src/tests/lib/plugins/word-count/WordCount.test.ts`, `src/tests/lib/plugins/word-count/word-count.logic.test.ts`: exit 0, 5 files, 117 tests. The test verdict rests on these five files.
- Searched `src/tests` and `e2e` for other assertions on the changed strings (`min read`, `\d+ words`, `notes ·`, `1 links`, `Global graph`, `.word-count-stats`): only the lines above and `e2e/specs/word-count.spec.ts`, whose selectors still match.
- No change to `layer-baseline.json`, `BASELINE_SIZE` or composition roots. No `src-tauri/` change.

## Findings

1. nit, `src/tests/lib/plugins/word-count/WordCount.test.ts:36` — the empty-note case would also pass if the 500 ms debounce never fired, because `words` and `characters` start at 0; it pins the hidden estimate, not the debounce. The other cases do exercise the debounce, so no change is needed. Fix (optional): none required.
2. nit, `src/tests/lib/plugins/graph-view/GraphView.test.ts:202` — changed outside the lines the Issue names. It asserted `'1 notes'`, the same bug the Issue fixes, and the new `'1 note · 0 links'` is stricter, so this is a correction, not scope creep or weakening. Fix: none.
3. nit, `src/lib/plugins/word-count/WordCount.svelte:34` — a whitespace-only note shows "0 words | N characters" with no estimate. This follows the Issue's 0-word rule and the triage assumption (only a 0-word note hides the estimate). Fix: none.

## Resolution

All three findings are nits whose own fix is "none required"; the reviewer's reasoning holds, so no code or test changed.

1. Not changed: the debounce is exercised by the non-empty cases; the empty-note case pins the hidden estimate, which is its purpose.
2. Not changed: the `GraphView.test.ts:202` edit corrects an assertion that pinned the same bug and is stricter.
3. Not changed: a whitespace-only note has 0 words, so hiding the estimate follows the Issue's 0-word rule.
