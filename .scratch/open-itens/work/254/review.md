VERDICT: APPROVED

## Acceptance criteria

- [met] The tab-strip test passes three runs in a row (`bash scripts/e2e.sh e2e/specs/tabs.spec.ts`, three times), and the delivery says whether the cause was the app's scroll or layout rounding, with the evidence. — Reviewer ran `bash scripts/e2e.sh e2e/specs/tabs.spec.ts --retries=0` three times in a row: 5 passed each run, exit 0 each time (retries disabled, so no run passed on a retry). Cause is layout rounding, recorded with evidence in `.scratch/open-itens/work/254/discovery.md` (Part 1) and in the comment at `e2e/specs/tabs.spec.ts:59-61`. Independent reviewer probe (temporary, reverted): at DPR 1 the active tab overhangs the strip's right edge by exactly 0.1875 px with scrollLeft 886 and max 890 (not clamped); writing `scrollLeft = 884.1875` reads back 884, so Chromium truncates fractional scroll offsets. `EditorTabs.svelte:37-41` only calls `scrollIntoView({ block: 'nearest', inline: 'nearest' })` and does no rounding. Deliver's squash message must carry the cause and evidence (the Issue asks "the delivery says").
- [met] If the cause was the app: a test that fails before the scroll fix shows the active tab fully inside the strip after it. — Not applicable: the cause is browser layout rounding (probe above), and the branch changes no app code (`git diff main...HEAD --stat -- src/lib src-tauri` is empty).
- [met] `AutoOrganizeRuleRow.test.ts` still asserts the same behavior (the previous count hides while the typed filter is not counted, then the new count shows) and no longer waits on real time. — `AutoOrganizeRuleRow.test.ts:1003-1015`: same two assertions (`matchCount()` null after typing, then `'Matches 1 note now'`); `vi.waitFor` replaced by `vi.runOnlyPendingTimers()` + `flushSync()` with `setTimeout`/`clearTimeout` faked before mount. The count is a synchronous `$derived` (`AutoOrganizeRuleRow.svelte:97`, `countMatchingNotes` is a plain function at `auto-organize.logic.ts:147`), so the 300 ms debounce at `AutoOrganizeRuleRow.svelte:92-96` is the only delay and there is no promise to drive. Reviewer probe (temporary, reverted): with the `vi.runOnlyPendingTimers()` line removed the test fails (`expected null to be 'Matches 1 note now'`), so it cannot pass without the debounce firing. No timeout raised, no skip.
- [met] `pnpm vitest run src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts` passes alone, and the full suite passes on the first run. — Reviewer ran the file alone: 91/91 passed, exit 0. The full suite is deliver's to run; the targeted tests of the changed files pass.

## Findings

None.

## Checks run by the reviewer

- `pnpm check`: 0 errors, 0 warnings, exit 0.
- `pnpm vitest run src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts`: 91 passed, exit 0.
- `bash scripts/e2e.sh e2e/specs/tabs.spec.ts --retries=0`, three runs: 5 passed each, exit 0 each.
- Probes (both reverted, worktree clean afterwards): scrollLeft snapping and tab overhang measurement in `tabs.spec.ts`; removal of the timer flush in `AutoOrganizeRuleRow.test.ts`.

The test verdict rests on `src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts` and `e2e/specs/tabs.spec.ts`, the only two test files the branch changes; no app code changed.

## Scope

The diff touches only the two test files named in the Issue and the workflow's discovery record. The `afterEach(vi.useRealTimers)` in the `match count` describe keeps the faked timers from leaking into later describes.
