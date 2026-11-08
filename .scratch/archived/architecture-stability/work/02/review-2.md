VERDICT: APPROVED

# Issue 02 re-review, round 2

Fix commits reviewed: `git diff 2e84be1b..HEAD` (2f54ac67, 4d436bcb, d072db03, 6380e1bd, 412d462a).

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | `scripts/check-fix-has-test.sh:21-24` assigns `shas="$(git rev-list ...)"` before the loop, so `set -e` aborts on a failed rev-list. By hand: `bash scripts/check-fix-has-test.sh nonexistent-ref` exits 128 with git's `fatal:` and no "commit(s) checked" line. Tests `commit-msg-fix-test.test.ts:229-236` (`it.each` on a 40-hex unknown sha range and `no-such-ref`) assert non-zero exit and no summary line; they pass. |
| 2 | minor | resolved | `docs/COMMITS.md:114-119` documents both amend directions and the ways out (stage a test change, or `Test-Exempt:`). The reasoning for not comparing against `HEAD^` holds: a commit-msg hook receives only the message file path, nothing that marks an amend. |
| 3 | minor | resolved | `::error::` cases at `commit-msg-fix-test.test.ts:238-254` (with `GITHUB_ACTIONS=true` asserts `::error::fix commit without a test: <sha> fix(b): b`; without it asserts none). `runRange` now forces `GITHUB_ACTIONS: ''` by default, so the suite does not change behavior when run inside CI. Linked-worktree case at `:257-271` runs `setup-hooks.sh` from a `git worktree add` checkout and asserts both symlink targets in the common `.git/hooks`. |
| 4 | nit | resolved | `scripts/commit-msg-fix-test.sh:31,33` use `git -c core.quotePath=false`. Mutation check: in a scratch repo staging `src/lib/x.ts` + `src/tests/café.test.ts` with `fix: x`, the pre-fix hook (`git show 2e84be1b:scripts/commit-msg-fix-test.sh`) exits 1 and the current hook exits 0, so the new test at `:144-148` would fail without the fix. |
| 5 | nit | resolved | `.github/workflows/commit-policy.yml:6-8` header now notes that the job runs the checked-out copy of the script. |

## Acceptance criteria re-checked

- [met] Tests run the hook in a temp git repo and cover the happy path, empty input and the error message — all new cases reuse the `mkdtemp` + `git init` fixture (`commit-msg-fix-test.test.ts:39-46`); no prior case was removed or weakened (diff only adds tests and an env default in `runRange`); 45/45 pass across the two targeted files.
- [met] commit-policy.yml fails on a pushed range containing a violating commit and names its sha — the range check now also fails on an unresolvable range (finding 1), the `::error::` annotation naming the sha is tested (`:238-245`); replay `bash scripts/check-fix-has-test.sh 2329314e..main` exits 1 listing exactly 32129c1e, ca0c5754, 6751421b, 42f9312b. The workflow itself has still not run on GitHub.
- [met] Docs (COMMITS.md, CLAUDE.md, and whichever doc loses the .svelte decision) describe the trailer — COMMITS.md gains the amend paragraph (`:114-119`) without changing the existing trailer section; CLAUDE.md and TESTING.md are untouched by the fixes.

## Checks run by the reviewer

- `pnpm vitest run src/tests/scripts/commit-msg-fix-test.test.ts src/tests/scripts/pre-commit-dep-age.test.ts`: exit 0, 2 files, 45/45 passed. The full suite and `pnpm build` are deliver's to run.
- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `/bin/bash -n` on `check-fix-has-test.sh`, `commit-msg-fix-test.sh`, `setup-hooks.sh`: all 0.
- `bash scripts/check-fix-has-test.sh main..HEAD`: exit 0, 11 commits checked.
- Scope: the fixes touch only the two scripts, the test file, `docs/COMMITS.md`, the workflow header comment and the review file. No `src-tauri/` change, so no `cargo test`. Worktree clean.

## Findings

None open or new.
