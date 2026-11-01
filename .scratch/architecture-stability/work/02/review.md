VERDICT: CHANGES_REQUESTED

# Issue 02 review


## Acceptance criteria

- [met] The hook rejects a fix: commit staging only src/lib/x.ts. It accepts that commit with a src/tests file, with an added #[test] in a .rs file, or with `Test-Exempt: reason`. It rejects an empty `Test-Exempt:` — `src/tests/scripts/commit-msg-fix-test.test.ts:53-62` (reject + message), `:75-79` (src/tests), `:87-93` (#[test], #[tokio::test(...)], #[cfg(test)]), `:102-106` (trailer), `:108-113` (empty trailer rejected); all pass. Probe: a real `git commit` with the hook installed via `setup-hooks.sh` was rejected for `fix: a` on `src/lib/x.ts`, accepted with a `Test-Exempt:` trailer written through `git commit -v`, and rejected from a linked worktree.
- [met] The hook ignores feat:/docs: commits, fix: commits touching only CI/lockfiles/md, and empty staged diffs — `commit-msg-fix-test.test.ts:120-126` (feat/docs/refactor/chore(fix)/fixup!), `:128-135` (workflow yml, pnpm-lock.yaml, Cargo.lock, .md, app.css), `:137-141` (empty index, exit 0, no output); all pass.
- [met] Tests run the hook in a temp git repo and cover the happy path, empty input and the error message — `beforeEach` at `:39-46` runs `git init` in a `mkdtemp` dir with `core.hooksPath=/dev/null`; happy path `:75-106`, empty input `:137-146`, error message `:53-62`.
- [met] commit-policy.yml fails on a pushed range containing a violating commit and names its sha — `commit-msg-fix-test.test.ts:162-176` (range with one violator: exit 1, names its sha only). I ran the workflow's `run:` block locally with `GITHUB_ACTIONS=true`: `BEFORE=6751421b^ SHA=6751421b` and `BEFORE=<40 zeros> SHA=6751421b` both exit 1 and print the sha plus an `::error::` line; `HEAD^!` exits 0. Holds for a valid range only: see finding 1 for a range git cannot resolve. The workflow has not run on GitHub.
- [met] Docs (COMMITS.md, CLAUDE.md, and whichever doc loses the .svelte decision) describe the trailer — `docs/COMMITS.md` new section "fix: commits need a test" (rule, trailer placement, example, hook + workflow); `CLAUDE.md` rule 11 (`.svelte` counts, trailer, links); `docs/TESTING.md` Step 0 item 4 (`.svelte` no longer skips, `Test-Exempt:` for CSS-only).

## Checks run by the reviewer

- `pnpm vitest run src/tests/scripts/commit-msg-fix-test.test.ts src/tests/scripts/pre-commit-dep-age.test.ts`: exit 0, 2 files, 39/39 passed. My test verdict rests on these two files (the new test file, and the existing test for the `pre-commit-dep-age.sh` hook that `setup-hooks.sh` installs). The full suite and `pnpm build` are deliver's to run.
- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `/bin/bash -n` (bash 3.2) on `commit-msg-fix-test.sh`, `check-fix-has-test.sh` and `setup-hooks.sh`: all 0.
- Gate replay: `bash scripts/check-fix-has-test.sh 2329314e..main` (last commit before 2026-08-01): exit 1, exactly 32129c1e, ca0c5754, 6751421b, 42f9312b.
- `bash scripts/check-fix-has-test.sh main..HEAD`: the branch's own 5 commits pass.
- Scope: the diff touches only the files the Issue names, plus discovery.md. No `src-tauri/` change, so no `cargo test`. The worktree is clean.

## Findings

1. **blocker** `scripts/check-fix-has-test.sh:21`: `for sha in $(git rev-list --no-merges --reverse "$RANGE")` ignores a failed `git rev-list`, because `set -e` does not apply to the word list of a `for` loop. When git cannot resolve the range, the script prints `fatal: ...`, then `0 commit(s) checked, no fix: commit without a test.`, and exits 0. Reproduced: `bash scripts/check-fix-has-test.sh deadbeef…deadbeef..HEAD` and `bash scripts/check-fix-has-test.sh nonexistent-ref` both exit 0. In CI this is a false pass in the one check that `--no-verify` cannot skip. It happens on a force push to main whose `before` is not in the clone, which `discovery.md` (Risks) and the build report both say "fails, loud". Fix: assign first so `set -e` catches the error (`shas="$(git rev-list --no-merges --reverse "$RANGE")"`, then `for sha in $shas`). Add a test that an unresolvable range exits non-zero.
2. **minor** `scripts/commit-msg-fix-test.sh:30-34`: for `git commit --amend`, the hook sees only the index diff against the commit being amended, not the full amended commit. Reproduced: amending a `fix: e` commit that already has `src/tests/x.test.ts` with one more `src/lib/x.ts` change is rejected. In the other direction, rewording a code-only commit to `fix:` with nothing staged passes; only CI catches it. Fix: document in `docs/COMMITS.md` that an amend needs the test re-staged or a `Test-Exempt:` trailer. Or, when the commit is an amend, compare against `HEAD^`, if that can be detected reliably.
3. **minor** `src/tests/scripts/commit-msg-fix-test.test.ts`: two changed behaviors have no test. One is the `scripts/setup-hooks.sh` rewrite (resolving the hooks dir with `--git-common-dir` from a linked worktree, and installing both links), which is the bug the Issue names. The other is the `GITHUB_ACTIONS` `::error::` output in `check-fix-has-test.sh:31-35`. I checked both by hand only. Fix: add a case that runs `setup-hooks.sh` from a `git worktree add` checkout and asserts both symlinks in the common `hooks/` dir. Add one that runs the range check with `GITHUB_ACTIONS=true` and asserts the `::error::` line.
4. **nit** `scripts/commit-msg-fix-test.sh:31-34`: `git diff --name-only` and `git show --name-only` quote non-ASCII paths when `core.quotePath` is on (the default). Such a path shows up as `"src/lib/caf\303\251.ts"`, so neither `CODE_RE` nor `TEST_PATH_RE` matches it: a test file with such a name is missed, and so is a code file. Fix: `git -c core.quotePath=false ...`.
5. **nit** `.github/workflows/commit-policy.yml:45`: the job runs the PR's own copy of `scripts/check-fix-has-test.sh`, so a PR can change the rule it is checked against. This is acceptable in a single-owner repo. No change needed, but it could be mentioned in the workflow's header comment next to the other limits.

## Resolution

1. Fixed in 2f54ac67. `check-fix-has-test.sh:21-24` assigns `shas="$(git rev-list ...)"` before the loop, so `set -e` stops on a failed rev-list. New tests: an unresolvable sha range and a bad ref both exit non-zero and print no "commit(s) checked". By hand, `bash scripts/check-fix-has-test.sh nonexistent-ref` now exits 128.
2. Fixed, docs path, in 6380e1bd. A commit-msg hook gets no argument or env var that says it runs for an amend, so switching to `HEAD^` cannot be done reliably. `docs/COMMITS.md:114-120` describes both directions (a code-only amend onto a tested fix is rejected; a reword to `fix:` with nothing staged passes and only CI catches it) and the ways out (stage a test change, or `Test-Exempt:`).
3. Fixed. The `::error::` annotation cases are in 2f54ac67 (one with `GITHUB_ACTIONS=true` asserting `::error::fix commit without a test: <sha> fix(b): b`, one without it asserting none). The linked-worktree `setup-hooks.sh` case is in d072db03: it asserts both symlink targets in the common `.git/hooks`. Swapping `--git-common-dir` for `--git-dir` makes it fail.
4. Fixed in 4d436bcb. `-c core.quotePath=false` on both `--name-only` calls. The new test (a fix with `src/tests/café.test.ts`) failed before the change.
5. Comment added in 6380e1bd (`commit-policy.yml:6-8`).
