# Ledger: rail-styles

This file is the source of truth for the progress of the [rail-styles](spec.md) Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run rail-styles
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
| 01 | [Labeled rail as the default at a fixed 192 px](issues/01-labeled-rail-default.md) | none | done | issue/01-labeled-rail-default (ba5a0029c) | 2026-11-06 |
| 02 | [Resizable width saved in `layout.railWidth`](issues/02-resizable-width.md) | 01 | done | issue/02-resizable-width (24c7f3eab) | 2026-11-06 |
| 03 | [Captioned and collapsed forms, the toggle and the Settings controls](issues/03-captioned-and-collapsed.md) | 02 | done | issue/03-captioned-and-collapsed (36da3137a) | 2026-11-06 |
| 05 | [Mod color from the manifest, and the docs for the rail forms](issues/05-mod-color-and-docs.md) | 03 | in-progress | | |
| 07 | [Future: icon colors customizable in Settings > Appearance](issues/07-future-custom-icon-colors.md) | 05 | todo | | |

## Log

- 2026-11-06 13:04 — ledger created (5 Issues)
- 2026-11-06 13:08 — 01 — start — launched by /relay-lite:run — 463307533
- 2026-11-06 13:32 — 01 — deliver — review round 1 APPROVED (claude), one minor finding accepted with no code change; full suite 13406 passed, build passed; E2E spec order recorded in the review file — ba5a0029c
- 2026-11-06 13:33 — 02 — start — launched by /relay-lite:run — bcd445a4a
- 2026-11-06 13:53 — 02 — deliver — round 1 APPROVED with one minor finding, fixed (only a primary press starts a resize); round 2 APPROVED; full suite 13447 passed, build passed; WebKit and the real app not verified — 24c7f3eab
- 2026-11-06 13:53 — 03 — start — launched by /relay-lite:run — 56dcaeda0
- 2026-11-06 14:21 — 03 — deliver — round 1 APPROVED with one minor and one nit, no code change; sort arrow overlap below 1440 px filed as Issue 08 (needs-triage); full suite 13656 passed, build passed; six gate specs 111 passed on the branch tip — 36da3137a
- 2026-11-06 14:21 — 05 — start — launched by /relay-lite:run — cb769e06a
