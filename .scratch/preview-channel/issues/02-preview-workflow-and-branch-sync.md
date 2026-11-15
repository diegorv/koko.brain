# 02: Preview build workflow and automatic merge of main

**What to build:** `.github/workflows/preview.yml`, which builds the `preview` branch into the fixed pre-release tag `preview` the way `nightly.yml` builds `main` into `nightly`, and which, on every push to `main`, first merges `main` into `preview` and then builds it.

**Blocked by:** 01

**Files:** .github/workflows/preview.yml,.github/workflows/nightly.yml,scripts/,src/tests/scripts/,help/documentation/19-settings.md,docs/RELEASE-CHANNELS.md

**Status:** ready-for-agent

**Gate:** `actionlint .github/workflows/preview.yml` (install with `brew install actionlint` if missing) plus the tests of any script added under `scripts/`; `pnpm check` + `pnpm vitest run` if `src/tests/` changes.

- [ ] Triggers: `push` to `main` (same `paths` filter as `nightly.yml`), `push` to `preview` (for feature branches merged by hand), and `workflow_dispatch`. Concurrency group `preview`, never cancelled. Guard job as in `nightly.yml` (canonical repo; skip release-flow commits on `main`).
- [ ] Sync job, only for pushes to `main`: checks out `preview` with full history, `git merge --no-ff origin/main` with a fixed bot identity and a subject naming the main sha, and pushes `preview`. On a conflict it aborts the merge, fails the job, and writes a `::error::` naming the conflicting files and the commands to resolve it by hand (`git checkout preview && git merge origin/main`). It never force-pushes, rebases or resets `preview`. When `origin/main` is already in `preview`, it skips the push.
- [ ] Build job runs after the sync job in the same workflow run (a `GITHUB_TOKEN` push does not start a new run), on the `preview` head the sync job pushed, or on the pushed `preview` head for a direct push. It copies `nightly.yml`'s build steps with: version from `resolveVersion(..., channel: 'preview')` and `COMMIT_COUNT=$(git rev-list --count "${BASE_VERSION}..HEAD")`, `KOKO_RELEASE_CHANNEL: preview`, tag `preview`, release name `Preview Build (<sha>)`, its own Rust cache key `macos-preview-aarch64`, pre-release flag, checksums, stale-asset pruning, and the `latest.json` check against `releases/download/preview/latest.json`.
- [ ] The release body says the build is `main` plus features under test, lists the branches merged into `preview` that are not in `main` (`git log --merges --first-parent origin/main..HEAD` subjects), and repeats the nightly body's warning and checksum instructions.
- [ ] `nightly.yml` is unchanged, or changes only to share a step with `preview.yml` (for example a composite action), with no change in what nightly builds or publishes.
- [ ] `help/documentation/19-settings.md`, Update section: one paragraph on where preview builds come from (the `preview` branch, rebuilt on every push to `main` and to `preview`).
- [ ] `docs/RELEASE-CHANNELS.md` describes the Preview channel (its branch, workflow, tag and version order Stable < Nightly < Preview) and replaces the "One-way update rule" text that says the updater never downgrades and going back needs a manual reinstall: the in-app "Install <channel> (downgrade)" button moves any build to a lower channel, and the Releases page download stays the fallback.

## Notes

- Decisions and constraints: `.scratch/preview-channel/spec.md` (automatic merge, `GITHUB_TOKEN` pushes start no new run, the branch only grows).
- The workflow cannot be run before it is on `main`. After delivery the main session, with the owner's go: creates `preview` from `origin/main`, merges `origin/mvp-claude` into it with `--no-ff`, pushes it (the first preview build starts), and checks that `releases/download/preview/latest.json` serves a `-preview.` version.
- The repository's workflow permissions must allow `contents: write` for the sync and build jobs, as `nightly.yml` already uses.
