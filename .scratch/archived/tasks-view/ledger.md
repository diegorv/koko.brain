# Ledger: tasks-view

This file is the source of truth for the progress of the [tasks-view](spec.md) Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run tasks-view
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
| 01 | [Clicking task text opens the note at the line](issues/01-text-click-opens-note.md) | none | done | issue/01-text-click-opens-note (ce1f0ac3c) | 2026-11-06 |
| 31 | [A `#` inside a link or URL is not a task tag](issues/31-task-tag-boundary.md) | 11 | wontfix | | |

## Log

- 2026-11-06 05:51 — ledger created (31 Issues)
- 2026-11-06 05:55 — 01 — start — launched by /relay-lite:run — 25c903627
- 2026-11-06 06:19 — 01 — deliver — Rounds 1 and 2 APPROVED (claude); fix round 4cfe3c5c6 added a caret-on-line test; full suite at 4cfe3c5c6: 12954 tests passed, pnpm build ok; merged ce1f0ac3c — ce1f0ac3c
- 2026-11-06 06:40 — ledger updated (blocked by of 12, 14, 16, 22)
- 2026-11-08 12:00 — ledger updated (moved 29 open Issues to .scratch/open-itens: 02→021, 03→114, 04→108, 05→109, 06→110, 07→111, 08→112, 09→122, 10→113, 11→074, 12→115, 13→116, 14→117, 15→118, 16→123, 17→124, 18→125, 19→120, 20→072, 21→127, 22→128, 23→129, 24→073, 25→229, 26→075, 27→121, 28→119, 29→126, 30→130)
