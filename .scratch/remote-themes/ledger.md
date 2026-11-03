# Ledger: remote-themes

This file is the source of truth for the progress of the remote-themes Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run remote-themes
```

Add Issue numbers to force them; `--all` runs every available Issue in sequence; `--all --parallel` runs the ones that touch different files at the same time.

## Process

The `relay-lite:workflow` workflow, one worktree per Issue at `<repo>.worktrees/issue-NN-slug`: build (discovery + implement), review (Claude or Codex), fix and re-review while changes are requested, deliver. Only deliver runs the full suite. Formats: relay-lite's `docs/format.md`.

## Statuses

| Status | Meaning |
|---|---|
| `todo` | Not started. |
| `in-progress` | Set by `/relay-lite:run` on `base` before it launches the Issue; still there after a run means it was interrupted (the worktree and branch may exist). `/relay-lite:run` asks what to do about it only when run with no Issue numbers (`--all` too), or when it is one of the named Issues or in the "Blocked by" of one; skip records nothing (no status change, no Log line, no commit), so the question comes back on the next such run. |
| `blocked` | Nothing was delivered: the build refused the Issue or returned nothing, the suite failing, a review or re-review that returned nothing, a re-review that still requests changes, a rebase conflict in source files, a failed push. The reason is in the Log; the worktree is kept. `/relay-lite:run` asks what to do about it only when run with no Issue numbers (`--all` too), or when it is one of the named Issues or in the "Blocked by" of one; skip records nothing (no status change, no Log line, no commit), so the question comes back on the next such run. |
| `in-review` | `pr` delivery: the PR is open, not merged yet; its URL is in Branch / PR. The next run checks it and sets `done` or `todo`. relay-lite does not delete the remote branch `issue/NN-slug` when the PR is merged or closed (GitHub does on merge if the repository auto-deletes head branches); after a close, delete it or renumber the Issue before the Issue runs again, or its push is rejected. |
| `done` | Delivered, and the Issue file says `Status: resolved`. |
| `wontfix` | Closed without work. |

## Next up

An Issue can start when its status is `todo` and every Issue in its "Blocked by" is `done`. Among those, take the lowest number.

## Issues

**Branch / PR**: in `merge` delivery `issue/NN-slug (<short sha>)`, the short sha of the Issue's squash commit on `base` (the `sha` deliver returns), written by `/relay-lite:run` in its `done` commit; in `pr` delivery the PR URL while `in-review`, then `<PR URL> (<short merge sha>)` once `/relay-lite:run` finds it merged; cleared when it finds the PR closed and sets the row back to `todo` (the URL stays in the `pr closed` Log line). **Merged**: always a date (YYYY-MM-DD); in `merge` delivery the date `/relay-lite:run` wrote the row, after the squash commit; in `pr` delivery the date `/relay-lite:run` recorded the merge. Both cells stay empty on a row `/relay-lite:ledger` created as `done` from an Issue file already `Status: resolved`.

| # | Issue | Blocked by | Status | Branch / PR | Merged |
|---|---|---|---|---|---|
| 01 | [Reject non-color values in theme JSON import](issues/01-reject-non-color-values-in-theme-import.md) | none | done | issue/01-reject-non-color-values-in-theme-import (c42cfe3d) | 2026-11-03 |
| 02 | [Publish the 22 themes to koko.brain-themes](issues/02-publish-themes-to-koko-brain-themes.md) | none | done | diegorv/koko.brain-themes (99f39a5) | 2026-11-03 |
| 03 | [Install a theme from the online catalog](issues/03-install-theme-from-online-catalog.md) | 01, 02 | done | issue/03-install-theme-from-online-catalog (d982686a) | 2026-11-03 |
| 04 | [Update an installed theme in place](issues/04-update-installed-theme-in-place.md) | 03 | done | issue/04-update-installed-theme-in-place (9ee6f6a5) | 2026-11-03 |
| 05 | [Ship only two built-in themes](issues/05-ship-only-two-built-in-themes.md) | 02, 03 | done | issue/05-ship-only-two-built-in-themes (464ec60e) | 2026-11-03 |

## Log

- 2026-11-03 08:14 — ledger created (5 Issues)
- 2026-11-03 08:15 — 01 — start — launched by /relay-lite:run — 5a807375
- 2026-11-03 08:19 — 02 — deliver — main session: 22 themes, schema, index builder and CI pushed to koko.brain-themes; CI green; parity with the app's themes — ad7cc238
- 2026-11-03 08:27 — 01 — deliver — merged; reviews APPROVED x2 (claude); fix round: alpha() reuses an existing color-mix, clearer import messages; full suite green — c42cfe3d
- 2026-11-03 08:27 — 03 — start — launched by /relay-lite:run — fe24b80e
- 2026-11-03 08:48 — 03 — deliver — merged; review 1 CHANGES_REQUESTED, fix round, review 2 APPROVED (claude); full vitest + build green; cargo test not run by the workflow — d982686a
- 2026-11-03 08:49 — 04 — start — launched by /relay-lite:run — cca3863e
- 2026-11-03 08:58 — 04 — deliver — merged; reviews APPROVED x2 (claude); fix round added two tests (inactive update, duplicate-only state); full suite + build green — 9ee6f6a5
- 2026-11-03 08:58 — 05 — start — launched by /relay-lite:run — 1e9fced1
- 2026-11-03 09:15 — 05 — deliver — merged; review 1 CHANGES_REQUESTED, fix round, review 2 APPROVED (claude); full suite + build green — 464ec60e
