# Ledger: view-unification

This file is the source of truth for the progress of the view-unification Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run view-unification
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
| 03 | [Every `.view` write goes through one tab-aware, serialized writer](issues/03-one-tab-aware-view-writer.md) | none | todo | | |
| 04 | [A rail toolbar edit writes only its key and refuses a conflict](issues/04-rail-toolbar-writes-one-key.md) | 03 | todo | | |
| 05 | [The collection editor's toolbar writes only its key](issues/05-editor-toolbar-writes-one-key.md) | 04 | todo | | |
| 06 | [A watcher batch with `.md` and `.view` updates both](issues/06-watcher-mixed-batch.md) | none | done | main (fbeb22e92) | 2026-11-05 |
| 08 | [The `_rail_view` mark is validated against the file](issues/08-rail-view-mark-from-file.md) | none | todo | | |
| 11 | [A restored table does not show a false "0 results"](issues/11-no-false-zero-results.md) | none | done | main (300f97937) | 2026-11-05 |
| 12 | [`.view` leaves the FTS5 and semantic tables](issues/12-view-leaves-search-tables.md) | none | todo | | |
| 14 | [A view's index entry carries only its YAML keys](issues/14-view-entry-only-yaml-keys.md) | none | todo | | |
| 15 | [A view is never a link target](issues/15-view-never-link-target.md) | 14, 16 | todo | | |
| 16 | [A meta-bind button can open a view](issues/16-meta-bind-open-view-action.md) | none | todo | | |
| 17 | [Suggestions, graph, people rows and Favorites drop views](issues/17-readers-drop-views.md) | none | done | main (3c7f1b9a8) | 2026-11-05 |
| 19 | [A filter citing `archived` takes control in a view](issues/19-filter-citing-archived.md) | none | todo | | |
| 20 | [Inline `collection` blocks follow the row rule](issues/20-inline-block-row-rule.md) | 19 | todo | | |
| 22 | [New table, and Show in Views](issues/22-new-table-and-show-in-views.md) | 03, 12, 14, 15, 20 | todo | | |
| 23 | [Retire `.collection` files](issues/23-retire-collection-files.md) | 22 | todo | | |
| 24 | [Low-severity view bugs and stale docs from the review](issues/24-view-low-findings.md) | 23 | todo | | |
| 25 | [A case-only rename is refused on a case-insensitive volume](issues/25-case-only-rename.md) | none | todo | | |
| 26 | [The rail does not show a false empty list before the entries land](issues/26-rail-no-false-empty-list.md) | none | todo | | |

## Log

- 2026-11-05 16:44 — ledger created (17 Issues)
- 2026-11-05 17:16 — 06 — deliver — done by hand in the owner's session on main, not through relay; opus review, no fix for this Issue beyond a corrected comment; manual check in the app still the owner's — fbeb22e92
- 2026-11-05 17:16 — 17 — deliver — done by hand in the owner's session on main, not through relay; opus review, one doc comment corrected; dropped from 22's Blocked by — 3c7f1b9a8
- 2026-11-05 17:16 — 11 — deliver — done by hand in the owner's session on main, not through relay; reproduced, then opus review found a false "0 results" after a vault switch, reproduced and fixed — 300f97937
- 2026-11-05 17:30 — ledger updated (added 26)
