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
| 02 | [Guarded, status-preserving toggle](issues/02-guarded-status-preserving-toggle.md) | 01 | todo | | |
| 03 | [Task writes reach search and the QueryJS cache](issues/03-task-writes-reach-search.md) | 02 | todo | | |
| 04 | [The list stays mounted, and the rule explains itself](issues/04-mounted-list-and-rule-sentence.md) | 01 | todo | | |
| 05 | [Rows show status, dates, priority, recurrence and tags](issues/05-row-chips.md) | 02, 04 | todo | | |
| 06 | [Open means not done and not cancelled](issues/06-open-closed-rule.md) | 05 | todo | | |
| 07 | [Quick filters on status, due and priority](issues/07-quick-filters.md) | 06 | todo | | |
| 08 | [Group and sort by note, folder, due, priority or status](issues/08-group-and-sort.md) | 07 | todo | | |
| 09 | [Set status, due and priority from the row, with undo](issues/09-row-menu-edits-with-undo.md) | 03, 08 | todo | | |
| 10 | [Keyboard navigation and accessible rows](issues/10-keyboard-and-a11y.md) | 08 | todo | | |
| 11 | [Rust records task headings](issues/11-rust-task-headings.md) | none | todo | | |
| 12 | [Tasks come from the entries snapshot, and the heading rule runs in TS](issues/12-fetch-from-entries-snapshot.md) | 03, 08, 11 | todo | | |
| 13 | [Sources panel with source cards and default excludes](issues/13-sources-panel-and-excludes.md) | 12 | todo | | |
| 14 | [Property clause and "Only this / Hide this" actions](issues/14-property-clause-and-group-actions.md) | 13 | todo | | |
| 15 | [Group by note type, note property or heading](issues/15-group-by-type-property-heading.md) | 14 | todo | | |
| 16 | [The view's rules survive a restart](issues/16-persist-view-state.md) | 13 | todo | | |
| 17 | [Saved views and the "To list" migration](issues/17-saved-views-and-to-list-migration.md) | 16 | todo | | |
| 18 | [Built-in smart lists and their empty states](issues/18-smart-lists-and-empty-states.md) | 07, 17 | todo | | |
| 19 | [Task tag quick filter](issues/19-task-tag-filter.md) | 07 | todo | | |
| 20 | [Todoist sync failures are visible and read the HTTP status](issues/20-todoist-sync-errors-visible.md) | none | todo | | |
| 21 | [A Todoist send is never silently forgotten](issues/21-todoist-send-never-forgotten.md) | 20 | todo | | |
| 22 | [Todoist link survives edits, and reworded tasks show "possibly sent"](issues/22-todoist-identity-and-possibly-sent.md) | 07, 21 | todo | | |
| 23 | [Todoist state on each row and as a quick filter](issues/23-todoist-state-on-rows-and-filter.md) | 07, 10, 22 | todo | | |
| 24 | [Todoist send: full project lists, refresh, the default label and recurring due dates](issues/24-todoist-project-lists-page-and-refresh.md) | 20 | todo | | |
| 25 | [Say plainly that the Todoist token lives in the vault](issues/25-todoist-token-out-of-vault.md) | none | todo | | |
| 26 | [Task tags follow the note tag rule](issues/26-task-tags-follow-note-tag-rule.md) | 11 | todo | | |
| 27 | [Remove `get_tasks_in_section_v2` and its disk re-read](issues/27-remove-tasks-in-section-command.md) | 12 | todo | | |
| 28 | [Lifecycle clause, the archived override and value pickers](issues/28-lifecycle-clause-and-value-pickers.md) | 14 | todo | | |
| 29 | [The "modified" marker with Save, Revert and Reset](issues/29-modified-marker.md) | 17 | todo | | |
| 30 | [Todoist links follow renames, and unmatched entries are listed](issues/30-todoist-renames-and-unlinked.md) | 22 | todo | | |
| 31 | [A `#` inside a link or URL is not a task tag](issues/31-task-tag-boundary.md) | 11 | wontfix | | |

## Log

- 2026-11-06 05:51 — ledger created (31 Issues)
- 2026-11-06 05:55 — 01 — start — launched by /relay-lite:run — 25c903627
- 2026-11-06 06:19 — 01 — deliver — Rounds 1 and 2 APPROVED (claude); fix round 4cfe3c5c6 added a caret-on-line test; full suite at 4cfe3c5c6: 12954 tests passed, pnpm build ok; merged ce1f0ac3c — ce1f0ac3c
