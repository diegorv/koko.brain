VERDICT: APPROVED

Re-review of the fixes in `git diff 02e6704e2..HEAD` (f8c82b6db): two doc comments, one logic test, follow-up Issue 20 and the Resolution section of review.md. No behaviour change in app code.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | The `replaceWikilinks` doc comment (link-updater.logic.ts:78-84) no longer claims the path form always maps exactly. It now says the form is exact only when it holds a `/`, and that a root note's `[[New.md]]` can land on a nested namesake. The new test "cannot keep a root note on itself when a nested note owns the new stem" (link-updater.logic.test.ts:215-223) pins `[[Other.md]]` and asserts through the real resolver that it goes to `/v/B/Other.md`, so a future fix has to change it. `.scratch/audit-2026-11-04/issues/20-root-note-rename-link-form.md` exists, is needs-triage, and has an owner-decision criterion. The fix the review asked for (comment, pinning test, follow-up Issue) is all there. |
| 2 | minor | resolved (doc part); optional log rejection stands | The `updateLinksAfterRename` doc comment (link-updater.service.ts:26-33) now states the tree-order vs Rust scan-order dependence for a duplicated old stem. The debug log was marked optional in the review, so skipping it is acceptable. |

## Acceptance criteria re-checked

- [met] When the new stem is unique, the output is the bare form (no regression for the common case, and the existing link-updater tests stay green). — The fix adds one test and changes no existing one (diff is +10 lines in the test file, no deletions). link-updater.logic.test.ts and link-updater.service.test.ts: 2 files, 61 tests passed (run by me).
- [met] The gate matches the change: frontend, plus cargo test if the Rust resolver changes. — The fix touches only TS comments and a TS test, no src-tauri/. `pnpm check`: 0 errors, 0 warnings. Targeted vitest files pass. The full `pnpm vitest run` + `pnpm build` are deliver's to run.

## Checks run

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/core/filesystem/link-updater.logic.test.ts src/tests/lib/core/filesystem/link-updater.service.test.ts`: exit 0, 61 passed.
- No change to layer-baseline.json, BASELINE_SIZE or composition roots. No test weakened or removed. No scope creep: the only files outside `.scratch/` are the three the findings named.

## Findings

None open or new.
