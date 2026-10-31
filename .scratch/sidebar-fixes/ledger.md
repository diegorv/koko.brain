# Ledger: sidebar-fixes

This file is the source of truth for the progress of the sidebar-fixes Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run sidebar-fixes
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
| 01 | [File tree operations tell the user when they fail](issues/01-file-tree-failure-toasts.md) | none | done | issue/01-file-tree-failure-toasts (2430a64f) | 2026-10-31 |
| 02 | [Remove the dead ⌘⌫ hint from the Move to Trash menu items](issues/02-remove-dead-trash-shortcut-hint.md) | none | done | issue/02-remove-dead-trash-shortcut-hint (5315485d) | 2026-10-31 |
| 03 | [A Types view lists notes in the order its Sort control shows](issues/03-types-view-sort-visible-order.md) | none | done | issue/03-types-view-sort-visible-order (4784c132) | 2026-10-31 |
| 04 | [The sidebar calendar starts the week on the configured day](issues/04-sidebar-calendar-week-start.md) | none | done | issue/04-sidebar-calendar-week-start (5cd4a497) | 2026-10-31 |
| 05 | [Sidebar calendar: today moves at midnight, month-label double-click opens nothing twice](issues/05-sidebar-calendar-today-and-month-label.md) | none | done | issue/05-sidebar-calendar-today-and-month-label (4adbe9fc) | 2026-10-31 |
| 06 | [The file tree sorts names naturally](issues/06-file-tree-natural-sort.md) | none | done | issue/06-file-tree-natural-sort (41bfc731) | 2026-10-31 |
| 07 | [Palette shortcut hint follows rebinding; Settings stops naming the removed Tags panel](issues/07-stale-shortcut-and-settings-text.md) | none | done | issue/07-stale-shortcut-and-settings-text (21dc14e5) | 2026-10-31 |
| 08 | [Help pages describe the file tree, calendar dots and view sorting as they work](issues/08-help-pages-match-behavior.md) | 03, 06 | done | issue/08-help-pages-match-behavior (fcf04a00) | 2026-10-31 |

## Leftovers

## Log

- 2026-10-31 18:46 — ledger created (8 Issues)
- 2026-10-31 18:47 — 01 — start — launched by /relay-lite:run — e5eb0476
- 2026-10-31 19:10 — 01 — deliver — squash-merged as 2430a64f after 2 claude review rounds (changes requested, then approved); full suite 8393 tests and build pass — 2430a64f
- 2026-10-31 19:31 — 02 — start — launched by /relay-lite:run — 0dea2f40
- 2026-10-31 19:38 — 02 — deliver — squash-merged after 1 claude review round (approved, 1 nit fixed, 1 rejected); full suite 8398 tests and build pass — 5315485d
- 2026-10-31 19:38 — 03 — start — launched by /relay-lite:run — 22d71c5d
- 2026-10-31 19:47 — 03 — deliver — squash-merged after 1 claude review round (approved, 1 minor fixed, 2 nits declined); full suite 8407 tests and build pass — 4784c132
- 2026-10-31 19:48 — 04 — start — launched by /relay-lite:run — 3af8bd1e
- 2026-10-31 19:55 — 04 — deliver — squash-merged after 1 claude review round (approved, 1 nit fixed, 1 needed no change); full suite 8419 tests and build pass — 5cd4a497
- 2026-10-31 19:55 — 05 — start — launched by /relay-lite:run — cd8081d1
- 2026-10-31 20:02 — 05 — deliver — squash-merged after 1 claude review round (approved, 2 findings fixed, 2 nits declined); full suite 8423 tests and build pass — 4adbe9fc
- 2026-10-31 20:02 — 06 — start — launched by /relay-lite:run — 7a8766b3
- 2026-10-31 20:13 — 06 — deliver — squash-merged after 1 claude review round (approved, 1 minor fixed, major _order startup reorder left as pre-existing, 1 nit for Issue 08); vitest 8424, build, cargo 1129 pass — 41bfc731
- 2026-10-31 20:14 — 07 — start — launched by /relay-lite:run — a3518e90
- 2026-10-31 20:24 — 07 — deliver — squash-merged after 1 claude review round (approved, 2 nits fixed, 1 out of scope); full suite 8428 tests and build pass — 21dc14e5
- 2026-10-31 20:24 — 08 — start — launched by /relay-lite:run — 1073b627
- 2026-10-31 20:30 — 08 — deliver — squash-merged after 1 claude review round (approved, 2 findings fixed); full suite 8428 tests and build pass — fcf04a00
