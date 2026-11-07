# Ledger: mods-extension-points

This file is the source of truth for the progress of the [mods-extension-points](spec.md) Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run mods-extension-points
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
| 01 | [`ctx.watch`, `ctx.onNoteSaved`, vault path methods and a raw pack](issues/01-raw-pack-and-watch.md) | none | done | issue/01-raw-pack-and-watch (1a344f35a) | 2026-11-07 |
| 02 | [`ctx.labs`, opt-in palette rows and a lazy run view](issues/02-labs-and-palette-opt-in.md) | none | done | issue/02-labs-and-palette-opt-in (a1ba666fd) | 2026-11-07 |
| 03 | [Right click on note rows and folders, with `run.target`](issues/03-right-click-menus.md) | 02 | in-progress | | |
| 04 | [`ctx.ui.pick`](issues/04-ui-pick.md) | none | in-progress | | |

## Log

- 2026-11-07 10:06 — ledger created (4 Issues)
- 2026-11-07 10:09 — 01 — start — launched by /relay-lite:run — 86b9c6c34
- 2026-11-07 10:43 — 01 — deliver — Blocked: authentic review.md and review-2.md records are missing from the issue branch; after-review refused delivery. No merge or implementation push; full suite not run; worktree retained. — c66d49b73
- 2026-11-07 10:47 — 01 — start — launched by /relay-lite:run — f3561cf19
- 2026-11-07 10:53 — 01 — deliver — Blocked before review: build agent reports developer instructions prohibit writing required discovery.md. Implementation and targeted checks reported complete; worktree and commits retained; no review or delivery. — de485af58
- 2026-11-07 10:58 — 01 — deliver — Merged by the owner's decision without discovery.md or review files (the model refused to write them); round 1 fixed the fs:allow-stat major, round 2 APPROVED in the journal; full suite passed; sync rebased, merge merged. — 1a344f35a
- 2026-11-07 11:00 — 02 — start — launched by /relay-lite:run — 41e239758
- 2026-11-07 11:33 — 02 — deliver — Blocked: merge permission denied because delivery removes the issue worktree. Round 1 APPROVED by Claude with no findings; full suite passed (576 files, 13904 tests passed). No implementation merge or push; branch and worktree preserved pending explicit removal authorization. — 1b762941c
- 2026-11-07 15:21 — 02 — deliver — Review round 1 APPROVED with no findings; full suite passed (576 files, 13904 tests); sync rebased, merge merged after the owner authorized removing the worktree, which auto mode had denied. — a1ba666fd
- 2026-11-07 15:24 — 03 — start — launched by /relay-lite:run — 93e5ffb6d
- 2026-11-07 15:26 — 04 — start — launched by /relay-lite:run — a130be70a
