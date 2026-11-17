# Ledger: finders-ux

This file is the source of truth for the progress of the finders-ux Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run finders-ux
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
| 01 | [Command dialogs: input anchored at 18vh, one-line rows, 400px list, key-hint footer, no close X](issues/01-command-dialogs-anchored-dense-rows.md) | none | done | issue/01-command-dialogs-anchored-dense-rows (9479ac613) | 2026-11-17 |
| 02 | [Quick switcher offers Create while notes match (Shift+Enter), creates Folder/Note paths, and a failed create says why](issues/02-quick-switcher-create-while-matching.md) | 01 | done | issue/02-quick-switcher-create-while-matching (b459157c9) | 2026-11-17 |
| 03 | [Search result cards: note name, folder, plain-text snippets, themed highlight](issues/03-search-result-cards-name-folder-plain-snippets.md) | none | done | issue/03-search-result-cards-name-folder-plain-snippets (5d17f397d) | 2026-11-17 |
| 04 | [Search states: short query, error, disabled mode; operator hints; a11y labels; index status only in the status bar](issues/04-search-panel-states-hints-labels.md) | 03 | done | issue/04-search-panel-states-hints-labels (0de35de11) | 2026-11-17 |
| 05 | [Search keeps previous results dimmed while searching, shows "N+" at the cap, and clearing mid-search does not stick on Searching...](issues/05-search-keeps-results-while-searching.md) | 04 | done | issue/05-search-keeps-results-while-searching (7fcc9c141) | 2026-11-17 |
| 06 | [Palette: calendar Undo/Redo only when they can act, Calendar category, Recent / All commands groups](issues/06-palette-calendar-undo-recent-groups.md) | 01 | done | issue/06-palette-calendar-undo-recent-groups (90ccfc691) | 2026-11-17 |
| 07 | [Quick switcher rows: type icon, folder, Archived tag, match highlight, Recent notes heading](issues/07-quick-switcher-rows-type-icon-folder-highlight.md) | 02 | done | issue/07-quick-switcher-rows-type-icon-folder-highlight (2063e2bfe) | 2026-11-17 |
| 08 | [Tags view keeps its list and expanded tags on screen while it refreshes](issues/08-tags-view-keeps-list-while-refreshing.md) | none | done | issue/08-tags-view-keeps-list-while-refreshing (9023e5e61) | 2026-11-17 |
| 09 | [Tags header says "Showing X of Y" and the empty state explains the rare-tag filter](issues/09-tags-header-showing-x-of-y.md) | 08 | done | issue/09-tags-header-showing-x-of-y (b137b906c) | 2026-11-17 |
| 10 | [Tags rows align leaves with parents, name their chevron and colour controls, and the Tags tab shows a tag icon](issues/10-tags-rows-align-label-controls-tab-icon.md) | none | done | issue/10-tags-rows-align-label-controls-tab-icon (19f319469) | 2026-11-17 |
| 11 | [Tags view filter box matching full paths](issues/11-tags-view-filter-box.md) | 09, 10 | in-progress | | |
| 12 | [Graph controls on shadcn Switch/Select: no Close, working "All", accessible names, filter that does not trap](issues/12-graph-controls-shadcn-switch-select.md) | none | in-progress | | |
| 13 | [Local graph isolated, loading and error states with Retry](issues/13-local-graph-isolated-loading-error-states.md) | 12 | todo | | |
| 14 | [Local graph depth stepper (1 to 3)](issues/14-local-graph-depth-stepper.md) | 12, 13 | todo | | |
| 15 | [Graph labels drawn by priority, skipping overlaps](issues/15-graph-labels-priority-skip-overlaps.md) | none | todo | | |
| 16 | [Text search with tag: or path: filters before the result cap, matches nested tags, and drops stale operator results](issues/16-text-search-operators-before-cap-nested-tags.md) | 05 | done | issue/16-text-search-operators-before-cap-nested-tags (697b8a4d3) | 2026-11-17 |

## Log

- 2026-11-17 15:16 — ledger created (16 Issues)
- 2026-11-17 15:16 — 01 — start — launched by /relay-lite:run — 05f57e2c5
- 2026-11-17 15:25 — 03 — start — launched by /relay-lite:run — a09a4933e
- 2026-11-17 15:25 — 08 — start — launched by /relay-lite:run — a09a4933e
- 2026-11-17 15:42 — 01 — deliver — merged; reviews APPROVED x2 (claude); full suite 640 files / 17009 tests passed; fix round capped Command.Dialog content at 82dvh, kbd footer finding rejected — 9479ac613
- 2026-11-17 15:46 — 08 — deliver — full suite failed twice on load-flaky tests outside the Issue (codemap timeouts, TasksView.row-edit focus/menu races) while 03 ran in parallel; each passes alone; review APPROVED; worktree kept at e363ab617 — e35c65cb9
- 2026-11-17 15:56 — 03 — deliver — full suite failed twice on 5000ms timeouts outside the Issue (codemap.test.ts, AutoOrganizeRuleRow.test.ts) while 08 ran in parallel; each passes alone; review APPROVED; worktree kept at 3d059e498 — 0c3af6804
- 2026-11-17 15:56 — 08 — start — launched by /relay-lite:run (deliver rerun alone; workflow resumed, build and review cached) — b83e0121b
- 2026-11-17 16:01 — 08 — deliver — merged by hand after a solo full suite (640 files, 17007 tests passed); review APPROVED (claude), nit rejected; earlier deliver runs failed only on load-flaky tests — 9023e5e61
- 2026-11-17 16:02 — 02 — start — launched by /relay-lite:run — e2f27ea90
- 2026-11-17 16:12 — 03 — start — deliver finished by hand (re-review rounds 2-3, solo full suite) — 85f95433d
- 2026-11-17 16:12 — 03 — deliver — merged by hand; reviews APPROVED x3 (claude): round-1 nits fixed, round-2 regression (unbalanced link parens) fixed test-first; full suite 640 files / 17037 tests passed — 5d17f397d
- 2026-11-17 16:12 — 04 — start — launched by /relay-lite:run — 50157349e
- 2026-11-17 16:19 — 02 — deliver — merged; reviews APPROVED x2 (claude): fix round tightened the reuse-folder test and lists an existing note in its target folder; full suite 642 files / 17054 tests passed — b459157c9
- 2026-11-17 16:19 — 06 — start — launched by /relay-lite:run — 542efbea0
- 2026-11-17 16:36 — 06 — deliver — merged; review APPROVED (claude), 3 nits rejected with reasons; full suite 643 files / 17107 tests passed — 90ccfc691
- 2026-11-17 16:37 — 07 — start — launched by /relay-lite:run — 013e6e6a7
- 2026-11-17 16:37 — 04 — deliver — merged; reviews APPROVED x2 (claude): fix round fixed tab indentation on the ~ toggle, keyboard note rejected; full suite 643 files / 17098 tests passed — 0de35de11
- 2026-11-17 16:38 — 05 — start — launched by /relay-lite:run — 1679d7f8c
- 2026-11-17 16:57 — 07 — deliver — merged; reviews APPROVED x2 (claude): fix round trimmed a stale JSDoc consumer list; full suite 644 files / 17177 tests passed — 2063e2bfe
- 2026-11-17 16:57 — 09 — start — launched by /relay-lite:run — 5ab5c96e2
- 2026-11-17 16:59 — 05 — deliver — merged; reviews APPROVED x2 (claude): fix round made the cap flag per mode, spinner padding, Hybrid 70-result help; round-2 nit (stale Rust-hybrid text list shows N+ briefly after switching to Text) left open; full suite 644 files / 17178 tests passed — 7fcc9c141
- 2026-11-17 16:59 — 16 — start — launched by /relay-lite:run — 92559dd1e
- 2026-11-17 17:10 — 09 — deliver — merged; reviews APPROVED x2 (claude): fix round renamed the filter icon title and added the singular empty state; full suite 644 files / 17186 tests passed — b137b906c
- 2026-11-17 17:10 — 10 — start — launched by /relay-lite:run — 7bef5abcf
- 2026-11-17 17:16 — 16 — deliver — merged; reviews APPROVED x2 (claude): fix round made the tag:work zzzz test cover an empty filtered list; full suite 644 files / 17223 tests passed — 697b8a4d3
- 2026-11-17 17:16 — 12 — start — launched by /relay-lite:run — 552891df9
- 2026-11-17 17:22 — 10 — deliver — merged; review APPROVED (claude), 3 nits resolved without code change; full suite 645 files / 17227 tests passed — 19f319469
- 2026-11-17 17:22 — 11 — start — launched by /relay-lite:run — dadbc641b
