# 02: Block fix: commits that change app code without a test

**What to build:** `scripts/commit-msg-fix-test.sh <msg-file>` (bash 3.2). It applies when the subject matches `^fix(\(.+\))?!?:` and `git diff --cached --name-only` touches `src/(lib|routes)/**.{ts,js,svelte}`, `src-tauri/src/**.rs` or `src-tauri/build.rs`. In that case it requires one of:
- a staged path under `src/tests/`, `src-tauri/tests/` or `e2e/specs/`;
- an added `#[test]`, `#[tokio::test]` or `#[cfg(test)]` line;
- a non-empty `Test-Exempt:` trailer.

It skips empty staged diffs.

Also:
- Extend `scripts/setup-hooks.sh` to link `commit-msg` too, and make it resolve the hooks dir with `git rev-parse --git-common-dir` (today it builds `$REPO_ROOT/.git/hooks`, which breaks when run from a worktree, where `.git` is a file).
- Add `scripts/check-fix-has-test.sh <rev-range>`, which applies the same rule to each non-merge commit.
- Add `.github/workflows/commit-policy.yml`. It runs on push to main and on pull_request, with no paths-ignore, `fetch-depth: 0`, concurrency per sha with no cancel, and the range `before..sha`. When `before` is all zeros, it checks only the head commit.
- `.svelte` counts as code (owner decision, 2026-11-01): TESTING.md Step 0 and CLAUDE.md rule 11 disagreed, and rule 11 wins. Update TESTING.md Step 0, item 4, so `.svelte` components no longer skip tests; a fix that cannot carry a test (CSS only, for example) uses the `Test-Exempt:` trailer.
- Add a relay-lite `rules` bullet telling deliver to add `Test-Exempt:` when it applies.

**Blocked by:** none

**Status:** resolved

**Gate:**
- `pnpm vitest run src/tests/scripts/commit-msg-fix-test.test.ts`
- `bash -n` on both scripts
- a history replay from 2026-08-01 reports exactly ca0c5754, 32129c1e, 42f9312b and 6751421b (32129c1e touches only SettingsPanel.svelte, so it is in the list because `.svelte` counts).

**Source:** scripts/setup-hooks.sh, scripts/pre-commit-dep-age.sh, src/tests/scripts/pre-commit-dep-age.test.ts (spawnSync temp-repo pattern), .github/workflows/{ci,pr,nightly}.yml, docs/TESTING.md Step 0, CLAUDE.md rule 11, .agent-relay-lite/config.json

- [x] The hook rejects a fix: commit staging only src/lib/x.ts. It accepts that commit with a src/tests file, with an added #[test] in a .rs file, or with `Test-Exempt: reason`. It rejects an empty `Test-Exempt:`
- [x] The hook ignores feat:/docs: commits, fix: commits touching only CI/lockfiles/md, and empty staged diffs
- [x] Tests run the hook in a temp git repo and cover the happy path, empty input and the error message
- [x] commit-policy.yml fails on a pushed range containing a violating commit and names its sha
- [x] Docs (COMMITS.md, CLAUDE.md, and whichever doc loses the .svelte decision) describe the trailer

## Notes

- **Measurement:** 155 of 476 fixes (32.6%) have no detectable test change. The share was 52% in March-July and 9.9% in August-October, and only 4 recent ones touch app code. So the problem is mostly solved already, and this is a cheap backstop.
- **Relay runs:** the hook runs in relay-lite worktrees (shared common hooks dir), but through the relative symlink it runs the main checkout's `scripts/` copy. No `fix:` sub-commit in the 21 recent squashes breaks the rule.
- **Limits:** it does not prove the test reproduces the bug. `--no-verify` bypasses the hook. CI on main reports after the push and does not block it.
- **Size:** S.

## Comments

- 2026-11-01, branch `issue/02-fix-commits-require-a-test`: added the commit-msg hook that rejects `fix:` commits changing app code without a test (or a `Test-Exempt:` trailer), the hook installer, the commit-policy CI workflow, and the docs. Review round 1: CHANGES_REQUESTED (range resolution failure, non-ASCII paths, worktree setup test, amend limit doc), fixed; round 2: APPROVED with no findings. Full suite: 374 files, 9106 passed, 1 todo; `pnpm build` ok.
