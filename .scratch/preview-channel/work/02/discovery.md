# Issue 02 discovery: Preview build workflow and automatic merge of main

## Files that change

- New `.github/workflows/preview.yml`: copy of `.github/workflows/nightly.yml` (guard `:30-79`, build `:81-283`) with a `sync` job between guard and build.
- New `scripts/preview-branch.sh` with two subcommands, so the git logic has a test seam:
  - `sync`: in a checkout of `preview` with full history, skip when `origin/main` is already an ancestor of HEAD; else `git merge --no-ff origin/main` as `github-actions[bot]` with subject `Merge main <short-sha> into preview`; on a conflict list the unmerged files, `git merge --abort`, print `::error::` with the files and the manual commands, exit 1; on success `git push origin HEAD:refs/heads/preview` (no force). Writes `sha=<preview head>` to `$GITHUB_OUTPUT` when set.
  - `merged`: subjects of `git log --merges --first-parent origin/main..HEAD`, minus the merges of main itself (second parent already an ancestor of `origin/main`: the sync merges and a hand-resolved `git merge origin/main`).
- New `src/tests/scripts/preview-branch.test.ts`: temp bare remote + clone, as `commit-msg-fix-test.test.ts` builds its scratch repo.
- `help/documentation/19-settings.md:325-350` Update section: one paragraph on where preview builds come from.
- `docs/RELEASE-CHANNELS.md`: Preview row in the table `:7-11`, intro `:3,13`, version semantics `:31-40`, replace "One-way update rule" `:50-58`, build differences `:67-77`, checksums `:81`.
- `nightly.yml` unchanged.

## Plan

1. Test `preview-branch.sh` first (merge pushed with no-ff, bot identity, subject; skip when main already merged; conflict: exit 1, `::error::` names files and commands, preview on the remote untouched, working tree clean; `merged` lists feature merges, omits main merges and non-merge commits). Then the script.
2. `preview.yml`: triggers push `[main, preview]` with nightly's paths filter (preview.yml instead of nightly.yml) + `workflow_dispatch`; concurrency `preview`, not cancelled; guard runs the release-flow checks only for a push to `main`; `sync` only for a push to `main` (contents: write); `build-macos` needs both, `if: !cancelled() && should_build == 'true' && sync.result in (success, skipped)`, checks out `needs.sync.outputs.sha || (ref == preview && github.sha) || 'preview'`. Build steps as nightly with preview names/tag/cache key; body adds the merged-branch list. actionlint.
3. Docs.

## Defaults taken

- One `paths` filter covers both branches: GitHub allows one `on.push` block per workflow. A hand merge of a feature branch changes code, so it passes the filter.
- `workflow_dispatch` builds the `preview` head and never syncs (the criterion limits sync to pushes to `main`).
- When the sync skips the push (main already merged), the build still runs on the current preview head: same version, assets overwritten, harmless, and it retries a failed earlier build.
- The guard keeps nightly's `[skip nightly]` marker check for main pushes (it is part of "guard as in nightly.yml").

## Risks

- The workflow cannot run before it is on `main` (Issue Notes); only actionlint and the script tests check it here.
- After a feature branch is squash-merged into `main`, its merge commit on `preview` still appears in the body's branch list (the merge itself is not in `main`).
