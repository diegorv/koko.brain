# Issue 02 discovery

No `spec.md` for architecture-stability. ADR 0014 only names `setup-hooks.sh` (unchanged meaning).

## Files that change

- `scripts/commit-msg-fix-test.sh` (new): the rule. Optional 2nd arg `<sha>` reads the diff from
  that commit (`git show`) instead of the index, so the range checker reuses the same code.
- `scripts/check-fix-has-test.sh` (new): `git rev-list --no-merges --reverse <range>`, runs the hook
  per commit with `git log -1 --format=%B` as the message file, prints each violating sha, exit 1.
- `scripts/setup-hooks.sh:7-21`: hooks dir from `git rev-parse --git-common-dir` (made absolute),
  loop over `pre-commit` and `commit-msg`, keep the relative `../../scripts/` symlink.
- `.github/workflows/commit-policy.yml` (new): push to main + pull_request, no paths-ignore,
  `fetch-depth: 0`, concurrency group per sha, `cancel-in-progress: false`.
- `src/tests/scripts/commit-msg-fix-test.test.ts` (new): copies the temp-repo `spawnSync` pattern
  of `src/tests/scripts/pre-commit-dep-age.test.ts:52-80`.
- `docs/TESTING.md:189` (Step 0 item 4), `docs/COMMITS.md` (trailer section), `CLAUDE.md` rule 11,
  `.agent-relay-lite/config.json` `rules`.

## Plan

1. Test file first (red), then the hook, then the range checker (tests cover both).
2. setup-hooks.sh, workflow, docs, relay rule.
3. Replay: `check-fix-has-test.sh <last commit before 2026-08-01>..main` must list exactly
   ca0c5754, 32129c1e, 42f9312b, 6751421b.

## Defaults taken

- Trailer read with `git interpret-trailers --parse` (last paragraph only, comments ignored, key
  case-insensitive); a `Test-Exempt:` line in the body that is not a trailer does not count.
- Added test attribute: an added line in a staged `.rs` diff matching `#[test]`, `#[tokio::test...`
  or `#[cfg(test)]`.
- Pull requests check `base.sha..head.sha` (no `before` there); push checks `before..sha`, or
  `sha^!` when `before` is all zeros.
- Subject = first non-comment line of the message file.

## Risks

- A force push to main whose `before` is gone from the clone makes rev-list fail (job fails, loud).
- The hook is only active after the owner reruns `bash scripts/setup-hooks.sh` in the main checkout.
