# Ledger: sidebar-redesign

This file is the source of truth for the progress of the sidebar-redesign Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run sidebar-redesign
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
| 01 | [A note's day has one rule](issues/01-note-date-rule.md) | none | done | issue/01-note-date-rule (d2d9b50d) | 2026-10-31 |
| 02 | [Type palette and warning tokens in every theme](issues/02-type-palette-and-warning-tokens.md) | none | done | issue/02-type-palette-and-warning-tokens (f559fcc8) | 2026-10-31 |
| 03 | [Action bar: type, file name and lifecycle actions](issues/03-action-bar-lifecycle.md) | none | done | issue/03-action-bar-lifecycle (55fa9292) | 2026-10-31 |
| 04 | [Action bar: view and file actions](issues/04-action-bar-view-and-file-actions.md) | 03 | done | issue/04-action-bar-view-and-file-actions (efee8558) | 2026-10-31 |
| 05 | [Action bar: New 1:1 and New linked note](issues/05-action-bar-hub-actions.md) | 03 | done | issue/05-action-bar-hub-actions (08bdb76e) | 2026-10-31 |
| 06 | [Prefactor: one note row and one row menu](issues/06-shared-note-row-and-menu.md) | none | done | issue/06-shared-note-row-and-menu (32ad09cb) | 2026-10-31 |
| 07 | [Rail shell with the Inbox lens](issues/07-rail-shell-inbox-lens.md) | 01, 06 | done | issue/07-rail-shell-inbox-lens (a57a47c3) | 2026-10-31 |
| 08 | [New here on the note list](issues/08-new-here-on-note-list.md) | 07 | done | issue/08-new-here-on-note-list (79468376) | 2026-10-31 |
| 09 | [Favorites and Archive lenses](issues/09-favorites-and-archive-lenses.md) | 03, 08 | done | issue/09-favorites-and-archive-lenses (ab63c4a2) | 2026-11-01 |
| 10 | [Cmd+1, Cmd+2 and Cmd+Shift+B in the rail shell](issues/10-panel-shortcuts.md) | 07 | done | issue/10-panel-shortcuts (0f98b77b) | 2026-11-01 |
| 11 | [The rail shell remembers the active rail item](issues/11-rail-shell-remembers-rail-item.md) | 07 | done | issue/11-rail-shell-remembers-rail-item (66efe12c) | 2026-11-01 |
| 12 | [Types navigator and type lens](issues/12-types-navigator-type-lens.md) | 08, 11 | done | issue/12-types-navigator-type-lens (51939bd3) | 2026-11-01 |
| 13 | [View lens](issues/13-view-lens.md) | 12 | done | issue/13-view-lens (3a6e41da) | 2026-11-01 |
| 14 | [Files navigator and folder lens](issues/14-files-navigator-folder-lens.md) | 12 | done | issue/14-files-navigator-folder-lens (111768e5) | 2026-11-01 |
| 15 | [Folder operations on the Files navigator](issues/15-folder-operations.md) | 14 | done | issue/15-folder-operations (db22467e) | 2026-11-01 |
| 16 | [Drag to move and folder notes in the rail shell](issues/16-drag-and-folder-notes.md) | 15 | done | issue/16-drag-and-folder-notes (025b9282) | 2026-11-01 |
| 17 | [Calendar navigator and day lens](issues/17-calendar-navigator-day-lens.md) | 01, 12 | done | issue/17-calendar-navigator-day-lens (045297a7) | 2026-11-01 |
| 18 | [Periodic notes and Open Calendar tab in the Calendar navigator](issues/18-periodic-notes-and-calendar-tab.md) | 17 | todo | | |
| 19 | [Today lens](issues/19-today-lens.md) | 01, 08, 11 | todo | | |
| 20 | [My people on Today](issues/20-today-my-people.md) | 02, 05, 19 | todo | | |
| 21 | [Search on the rail](issues/21-search-on-the-rail.md) | 07 | todo | | |
| 22 | [Neighbourhood lens](issues/22-neighbourhood-lens.md) | 04, 07 | todo | | |
| 23 | [The rail shell becomes the default](issues/23-rail-becomes-default.md) | 09, 10, 13, 16, 18, 20, 21, 22 | todo | | |
| 24 | [Bookmarks merge into Favorites](issues/24-bookmarks-into-favorites.md) | 23 | todo | | |
| 25 | [Remove the classic shell](issues/25-remove-classic-shell.md) | 23, 24 | todo | | |

## Leftovers

## Log

- 2026-10-31 18:46 — ledger created (25 Issues)
- 2026-10-31 20:51 — 01 — start — launched by /relay-lite:run — 39ff7bd8
- 2026-10-31 21:05 — 01 — deliver — squash-merged after 2 claude review rounds (changes requested, then approved; 1 minor fixed, 1 nit declined); full suite 8454 tests and build pass — d2d9b50d
- 2026-10-31 21:05 — 02 — start — launched by /relay-lite:run — f1c2f3cd
- 2026-10-31 21:21 — 02 — deliver — squash-merged after 1 claude review round (approved, 2 minor fixed, 1 nit left for in-app check); full suite 8476 tests and build pass — f559fcc8
- 2026-10-31 21:21 — 03 — start — launched by /relay-lite:run — f5687945
- 2026-10-31 21:47 — 03 — deliver — squash-merged after 1 claude review round (approved, 2 minor and 3 nits fixed); full suite 8507 tests, build and E2E 255/255 pass — 55fa9292
- 2026-10-31 21:48 — 04 — start — launched by /relay-lite:run — 7046cb8e
- 2026-10-31 22:09 — 04 — deliver — squash-merged after 1 claude review round (approved, 3 minor and 3 nits fixed); full suite 8557 tests and build pass; full E2E not run — efee8558
- 2026-10-31 22:09 — 05 — start — launched by /relay-lite:run — 11fae8c4
- 2026-10-31 22:29 — 05 — deliver — squash-merged after 1 claude review round (approved, 3 minor and 3 nits fixed, 1 half-finding and 1 optional rejected); full suite 8599 tests and build pass; E2E not run — 08bdb76e
- 2026-10-31 23:02 — 06 — start — launched by /relay-lite:run — 6a689a17
- 2026-10-31 23:15 — 06 — deliver — squash-merged after 1 claude review round (approved, 1 minor and 2 nits fixed, helper move and region tokens deferred to the rail note list ticket); full suite 8626 tests and build pass — 32ad09cb
- 2026-10-31 23:16 — 07 — start — launched by /relay-lite:run — ea5379df
- 2026-10-31 23:42 — 07 — deliver — squash-merged after 1 claude review round (approved, 5 findings fixed, 1 deferred to 17/19/20, 1 rejected); full suite 8688 tests and build pass; only rail-shell and 3 related E2E specs ran — a57a47c3
- 2026-10-31 23:44 — 08 — start — launched by /relay-lite:run — 9baa084d
- 2026-11-01 00:00 — 08 — deliver — squash-merged after 2 claude review rounds (changes requested, then approved; 4 fixed, 2 rejected, 1 nit deferred to a theme-token Issue); full suite 8710 tests and build pass — 79468376
- 2026-11-01 00:00 — 09 — start — launched by /relay-lite:run — 0a583a5b
- 2026-11-01 00:12 — 09 — deliver — squash-merged after 1 claude review round (approved, 1 minor and 1 nit fixed); full suite 8732 tests and build pass — ab63c4a2
- 2026-11-01 00:12 — 10 — start — launched by /relay-lite:run — f3e55e2f
- 2026-11-01 00:24 — 10 — deliver — squash-merged after 1 claude review round (approved, 1 nit fixed, 1 nit left, 1 minor left for the owner: rail click with hidden panels); full suite 8744 tests and build pass — 0f98b77b
- 2026-11-01 00:24 — 11 — start — launched by /relay-lite:run — 29259473
- 2026-11-01 00:33 — 11 — deliver — squash-merged after 1 claude review round (approved, 1 minor and 1 nit fixed); full suite 8751 tests and build pass — 66efe12c
- 2026-11-01 00:33 — 12 — start — launched by /relay-lite:run — 11959a24
- 2026-11-01 01:01 — 12 — deliver — squash-merged after 2 claude review rounds (changes requested, then approved; 1 major, 1 minor, 1 nit fixed; 2 rejected; Untyped-at-0 left for the owner); full suite 8815 tests and build pass — 51939bd3
- 2026-11-01 01:01 — 13 — start — launched by /relay-lite:run — a02be04b
- 2026-11-01 01:33 — 13 — deliver — squash-merged after 1 claude review round (approved, 2 minor and 3 nits fixed, 1 minor left for the owner: view rule text vs PRD); full suite 8863 tests and build pass — 3a6e41da
- 2026-11-01 01:33 — 14 — start — launched by /relay-lite:run — 2850f8a4
- 2026-11-01 01:57 — 14 — deliver — squash-merged after 2 claude review rounds (changes requested, then approved; 1 blocker and 2 minor fixed, 1 nit rejected); full suite 8913 tests and build pass; full E2E run separately on main — 111768e5
- 2026-11-01 02:00 — 15 — start — launched by /relay-lite:run — 7fc006c6
- 2026-11-01 02:21 — 15 — deliver — squash-merged after 1 claude review round (approved, 6 findings: 3 fixed or partly fixed, 3 no change); full suite 8960 tests and build pass; full E2E run separately on main — db22467e
- 2026-11-01 02:26 — 16 — start — launched by /relay-lite:run — 25a15e42
- 2026-11-01 02:38 — 16 — deliver — squash-merged after 1 claude review round (approved, 1 minor and 1 nit fixed); full suite 8984 tests and build pass; full E2E run separately on main — 025b9282
- 2026-11-01 02:41 — 17 — start — launched by /relay-lite:run — 3cd0d29d
- 2026-11-01 02:59 — 17 — deliver — squash-merged after 1 claude review round (approved, 2 minor and 1 nit fixed); full suite 9025 tests and build pass — 045297a7
