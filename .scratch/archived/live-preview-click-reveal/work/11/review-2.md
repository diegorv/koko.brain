VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | Commit 2d7b0782 adds `scrollToTop` plus a data assertion after `expectStill` in both probes (spec lines 186-188 and 207-209): `.cm-lp-qjs-block p` toHaveCount(8) and `.cm-lp-embed-content` toContainText('Embedded line 12.'). Each one differs from the precondition the test asserts before the trigger (7 paragraphs at line 177; only `Embedded first line.` at line 197, and `Embedded line 12.` cannot appear in the short body), so a dead trigger now fails the test. The spec passes (3/3, run by me). |
| 2 | nit | rejection stands | Optional. The collection probe still asserts `Active (8)` after the wait, and an off-screen rebuild has no on-page signal without a test hook in app code, which is out of scope for a probe-only Issue. The accepted risk is recorded in the Resolution. |
| 3 | nit | rejection stands | Optional and deferred. Issue 10's spec is not on main, so there is no shared helper yet. The main session can fold the helpers in once both specs are on main. |
| 4 | nit | rejection stands | The Issue's closing status is set by deliver (`review-ticks --write`) or by the closing commit. That is workflow bookkeeping, not a code change. |

## Acceptance criteria re-checked

- [met] Each probe is kept as an E2E test that asserts the shift is under 5 px (passing, or failing first and then fixed) — The fix only appends assertions after `expectStill`. `MAX_SHIFT` and `expectStill` are unchanged. `bash scripts/e2e.sh e2e/specs/live-preview/offscreen-block-rerender-keeps-scroll.spec.ts --workers=1` exit 0, 3 passed.
- [met] If a fix lands: the block still re-renders with the new data, and a block on screen still grows or shrinks in place — No app fix landed (`git diff main...HEAD` touches nothing under `src/`). All three probes now also confirm that the new data arrived after the trigger.

## Verification

- `pnpm check`: exit 0 (213 files, 0 errors, 0 warnings).
- The fix diff (`git diff cd4debaa..HEAD`) touches only the spec (+8 lines, additions only, no assertion weakened or removed) and the Resolution section of `review.md`. No source change, no scope creep, no layer-baseline change.
- I did not run the Issue's full E2E gate (`bash scripts/e2e.sh e2e/specs/live-preview`), `pnpm vitest run` or `pnpm build`. Deliver runs those.

## Findings

None open or new.
