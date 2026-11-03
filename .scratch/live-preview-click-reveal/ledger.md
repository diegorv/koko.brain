# Ledger: live-preview-click-reveal

This file is the source of truth for the progress of the live-preview-click-reveal Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run live-preview-click-reveal
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
| 01 | [A click in the blank band above or below a block widget keeps it rendered](issues/01-block-widget-blank-bands-reveal-source.md) | none | in-progress | | |
| 02 | [A click right of a table, code block or math block, or in the table's empty corner, keeps it rendered](issues/02-widget-right-margin-and-table-corner.md) | 01 | todo | | |
| 03 | [A click above the first body line does not land inside the hidden frontmatter](issues/03-frontmatter-top-padding-click.md) | none | todo | | |
| 04 | [A click on a wikilink inside a table cell opens the note](issues/04-table-cell-wikilink-click.md) | none | todo | | |
| 05 | [A click on a note embed's header opens the embedded note](issues/05-note-embed-header-opens-note.md) | none | todo | | |
| 06 | [A click on a numbered list marker moves the cursor to the item, like a bullet](issues/06-ordered-marker-click-matches-bullet.md) | none | in-progress | | |

## Log

- 2026-11-03 12:19 — ledger created (6 Issues)
- 2026-11-03 12:31 — 01 — start — launched by /relay-lite:run — 82613d9a
- 2026-11-03 12:31 — 06 — start — launched by /relay-lite:run (parallel with 01) — 82613d9a
