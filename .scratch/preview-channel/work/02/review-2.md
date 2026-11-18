VERDICT: APPROVED

Re-review round 2 of the fix commit 26e7c2bdd (`git diff 2f636c807..HEAD`), against `.scratch/preview-channel/work/02/review.md` and `.scratch/preview-channel/issues/02-preview-workflow-and-branch-sync.md`.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `scripts/preview-branch.sh:40-43`: the `::error::` now reads `git fetch origin && git checkout -B preview origin/preview && git merge origin/main`, then the explicit `HEAD:refs/heads/preview` push. Both recipes in `docs/RELEASE-CHANNELS.md` "The preview branch" (`:72`, `:76`) use the same checkout, and `:80` says why. `src/tests/scripts/preview-branch.test.ts:147-150` asserts the full new command, so the test is stronger, not weaker. Probe in a scratch repo with a `preview` tag on an older commit and no local branch: `git checkout -B preview origin/preview` exits 0, `HEAD` is `refs/heads/preview`, and it points at `origin/preview`, not the tag. |
| 2 | minor | resolved | `docs/RELEASE-CHANNELS.md:72`: a branch that changes `.github/workflows/` cannot ride on `preview`, because the sync pushes with `GITHUB_TOKEN`. This is the docs option the review offered. |
| 3 | nit | resolved | `preview.yml:30-33` comment no longer claims the newest pending run always syncs; `docs/RELEASE-CHANNELS.md:78` describes the lag. Sync stays limited to pushes to `main`, as the criterion says. |
| 4 | nit | rejection stands | `GITHUB-WORKFLOW.md` is not in the Issue's Files list; the round 1 review already called it a follow-up. |

## Acceptance criteria re-checked

- [met] Sync job, only for pushes to `main`: checks out `preview` with full history, `git merge --no-ff origin/main` with a fixed bot identity and a subject naming the main sha, and pushes `preview`. On a conflict it aborts the merge, fails the job, and writes a `::error::` naming the conflicting files and the commands to resolve it by hand (`git checkout preview && git merge origin/main`). It never force-pushes, rebases or resets `preview`. When `origin/main` is already in `preview`, it skips the push. — The fix changes only the `::error::` text (`scripts/preview-branch.sh:40-43`); merge, abort, `exit 1` and push are unchanged. The command now uses `git checkout -B preview origin/preview` in place of the Issue's literal `git checkout preview`. The intent holds (check out the preview branch, then merge `origin/main`), and the literal form detaches at the same-named tag (round 1 finding 1). `-B` in a manual recipe is not the workflow resetting `preview`. `preview-branch.test.ts` 7/7 pass.
- [met] `docs/RELEASE-CHANNELS.md` describes the Preview channel (its branch, workflow, tag and version order Stable < Nightly < Preview) and replaces the "One-way update rule" text that says the updater never downgrades and going back needs a manual reinstall: the in-app "Install <channel> (downgrade)" button moves any build to a lower channel, and the Releases page download stays the fallback. — The fix touches only "The preview branch" section (`:72-80`); the channel table, version order and "Moving to a lower channel" section are unchanged since round 1.

## Findings

1. **nit**, `scripts/preview-branch.sh:43`, `docs/RELEASE-CHANNELS.md:72,76`. `git checkout -B preview origin/preview` resets an existing local `preview` branch to `origin/preview`, dropping any local commits on it that were never pushed. That is rare in a recipe that starts from a fetch, and the reflog keeps the commits. Optional: add a sentence saying so, or leave it.

## Checks run by the reviewer

- `pnpm vitest run src/tests/scripts/preview-branch.test.ts`: exit 0, 7 of 7 passed. The full suite is deliver's to run.
- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `actionlint .github/workflows/preview.yml`: exit 0. `shellcheck scripts/preview-branch.sh`: exit 0.
- Scope: the fix touches only files in the Issue's Files list plus `review.md`. No layer baseline, `BASELINE_SIZE` or composition-root change. `nightly.yml` is still unchanged.
