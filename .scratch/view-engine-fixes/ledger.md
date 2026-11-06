# Ledger: view-engine-fixes

This file is the source of truth for the progress of the view-engine-fixes Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run view-engine-fixes
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
| 01 | [Tab-strip menu acts on the right tab, and Delete asks first](issues/01-tab-menu-right-tab-and-delete-confirm.md) | 02 | todo | | |
| 02 | [Filters report unknown methods and per-note failures](issues/02-filters-report-unknown-methods.md) | none | todo | | |
| 03 | [Columns and sort keys resolve like expressions](issues/03-columns-resolve-like-expressions.md) | 02 | todo | | |
| 04 | [DESC sort lists notes without a value last](issues/04-desc-sort-nulls-last.md) | 03 | todo | | |
| 05 | [Linear-calendar bars line up with their day columns](issues/05-linear-calendar-bar-geometry.md) | none | todo | | |
| 06 | [Calendars say how many notes have no date](issues/06-calendar-undated-count.md) | 01, 03, 11 | todo | | |
| 07 | [The Filter panel cannot write an empty or unparseable filter](issues/07-filter-panel-safe-writes.md) | 01, 02 | todo | | |
| 08 | [The rail and the editor run the file's filter; bad shapes are errors](issues/08-run-the-files-filter.md) | 04, 07, 09, 10, 15 | todo | | |
| 09 | [Rail view switcher for multi-view files](issues/09-rail-view-switcher.md) | 07 | todo | | |
| 10 | [Rule line names the limit and the sort source](issues/10-rule-line-limit-and-sort.md) | 09 | todo | | |
| 11 | [Small `.view` tab write feedback](issues/11-editor-write-feedback.md) | 07 | todo | | |
| 12 | [View writers refresh promptly and fail loudly](issues/12-view-writers-refresh-and-fail-loudly.md) | none | todo | | |
| 13 | [Properties panel matches the table's columns](issues/13-properties-panel-matches-columns.md) | 06, 11 | todo | | |
| 14 | [New here infers the type from a compound `&&` filter](issues/14-new-here-type-from-compound-filter.md) | 08 | todo | | |
| 15 | [`.view` tab keyboard and labels](issues/15-view-tab-keyboard-and-labels.md) | 13 | todo | | |
| 16 | [Inline blocks choose a view and navigate months](issues/16-inline-block-view-and-month-nav.md) | 03, 06 | todo | | |
| 17 | [Help docs speak of views, and their examples work](issues/17-help-docs-speak-of-views.md) | 03, 14 | todo | | |
| 18 | [A `.view` checker for agents](issues/18-view-checker-for-agents.md) | 02 | todo | | |

## Log

- 2026-11-06 00:10 — ledger created (18 Issues)
- 2026-11-06 06:41 — ledger updated (blocked by of 07, 08, 11)
- 2026-11-06 06:45 — ledger updated (blocked by of 06, 07, 11, 13)
