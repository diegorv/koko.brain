# Ledger: tasks-view-ux

This file is the source of truth for the progress of the tasks-view-ux Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run tasks-view-ux
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
| 074 | [Rust records task headings](issues/074-rust-task-headings.md) | 242 | done | issue/074-rust-task-headings (16e3db9ed) | 2026-11-12 |
| 075 | [Task tags follow the note tag rule](issues/075-task-tags-follow-note-tag-rule.md) | 074 | done | issue/075-task-tags-follow-note-tag-rule (015f8c18f) | 2026-11-12 |
| 108 | [The Tasks list stays mounted, and the rule explains itself](issues/108-mounted-list-and-rule-sentence.md) | none | done | issue/108-mounted-list-and-rule-sentence (1a9e9eeaf) | 2026-11-12 |
| 109 | [Task rows show clean text with date, priority, recurrence and tag chips](issues/109-row-chips.md) | 236 | done | issue/109-row-chips (89196031e) | 2026-11-12 |
| 110 | [Open means not done and not cancelled, and each status has its own glyph](issues/110-open-closed-rule.md) | 242 | done | issue/110-open-closed-rule (e420d69e2) | 2026-11-12 |
| 111 | [A filter row with a Status menu replaces the hide-completed eye](issues/111-quick-filters.md) | 109 | done | issue/111-quick-filters (b1550f521) | 2026-11-12 |
| 112 | [Group the Tasks list by note, folder, due, priority or status](issues/112-group-and-sort.md) | 113 | done | issue/112-group-and-sort (fd29df83c) | 2026-11-12 |
| 113 | [Keyboard navigation and accessible rows in the Tasks view](issues/113-keyboard-and-a11y.md) | 239 | done | issue/113-keyboard-and-a11y (16c5d8b73) | 2026-11-12 |
| 115 | [The Tasks heading rule runs in TS](issues/115-fetch-from-entries-snapshot.md) | 074 | done | issue/115-fetch-from-entries-snapshot (115d8d576) | 2026-11-12 |
| 116 | [The Tasks query holds sources and default excludes (the textbox still drives the heading cards)](issues/116-sources-panel-and-excludes.md) | 244, 243 | done | issue/116-sources-panel-and-excludes (4268ffc27) | 2026-11-12 |
| 117 | [Property clause and "Only this / Hide this" actions](issues/117-property-clause-and-group-actions.md) | 112, 245 | done | issue/117-property-clause-and-group-actions (2f85150c1) | 2026-11-12 |
| 118 | [Group by note type, note property or heading](issues/118-group-by-type-property-heading.md) | 117 | in-progress | | |
| 119 | [Lifecycle clause, the archived override and value pickers](issues/119-lifecycle-clause-and-value-pickers.md) | 117 | done | issue/119-lifecycle-clause-and-value-pickers (711885f97) | 2026-11-12 |
| 120 | [Task tag quick filter](issues/120-task-tag-filter.md) | none | wontfix | | |
| 121 | [Remove `get_tasks_in_section_v2` and its disk re-read](issues/121-remove-tasks-in-section-command.md) | 245 | done | issue/121-remove-tasks-in-section-command (c4e917f99) | 2026-11-12 |
| 122 | [A guarded Rust command rewrites a task line's text](issues/122-row-menu-edits-with-undo.md) | 244 | done | issue/122-row-menu-edits-with-undo (befb8f876) | 2026-11-12 |
| 123 | [The Tasks excludes and heading tags survive a restart](issues/123-persist-view-state.md) | none | wontfix | | |
| 124 | [Global excludes and saved Tasks views survive a restart, and "To list" is seeded (model, no UI)](issues/124-saved-views-and-to-list-migration.md) | 245, 117 | in-progress | | |
| 125 | [A "No date" built-in list, and a "modified" marker with Save, Revert and Reset](issues/125-smart-lists-and-empty-states.md) | 111, 247 | todo | | |
| 126 | [The "modified" marker with Save, Revert and Reset](issues/126-modified-marker.md) | none | wontfix | | |
| 129 | [Todoist sync state on each row and as a quick filter](issues/129-todoist-state-on-rows-and-filter.md) | 244 | todo | | |
| 227 | [The Tasks help says the default view lists only tasks under a #to-list heading, and that the date filter uses the note's modification date](issues/227-tasks-help-says-default-view-lists-only.md) | none | wontfix | | |
| 234 | [The Tasks list keeps your place, and a failed refresh says so](issues/234-tasks-groups-keep-their-place.md) | 110 | done | issue/234-tasks-groups-keep-their-place (d52d63db2) | 2026-11-12 |
| 235 | [A failed Tasks refresh says so](issues/235-tasks-failed-refresh-says-so.md) | none | wontfix | | |
| 236 | [A Tasks group header reads like a note](issues/236-tasks-group-header-reads-like-a-note.md) | 234 | done | issue/236-tasks-group-header-reads-like-a-note (07181df1c) | 2026-11-12 |
| 237 | [Each task status has its own glyph, and the row tests find parts by name](issues/237-tasks-status-glyphs-and-row-hooks.md) | none | wontfix | | |
| 238 | [A Due menu replaces the Tasks date pills](issues/238-tasks-due-filter-replaces-date-pills.md) | 111 | done | issue/238-tasks-due-filter-replaces-date-pills (0cc4c6a0a) | 2026-11-12 |
| 239 | [Tasks priority and tag filters, search, Reset and a narrow-pane fold](issues/239-tasks-priority-search-reset-narrow.md) | 238 | done | issue/239-tasks-priority-search-reset-narrow (f51d1e4c7) | 2026-11-12 |
| 240 | [Tasks groups collapse and stay collapsed, and long groups show 50 rows](issues/240-tasks-collapse-groups-and-row-cap.md) | 112 | done | issue/240-tasks-collapse-groups-and-row-cap (b2ca57f2a) | 2026-11-12 |
| 241 | [Change a task's status from its row, with Undo](issues/241-tasks-row-status-menu-with-undo.md) | 240 | done | issue/241-tasks-row-status-menu-with-undo (0653db349) | 2026-11-12 |
| 242 | [The Tasks section filter takes several tags](issues/242-tasks-several-section-tags.md) | 108 | done | issue/242-tasks-several-section-tags (3583a1057) | 2026-11-12 |
| 243 | [The Tasks section tags are saved per vault](issues/243-tasks-section-tags-saved-per-vault.md) | 234 | done | issue/243-tasks-section-tags-saved-per-vault (fa8578342) | 2026-11-12 |
| 244 | [Tasks come from the entries snapshot, with an overlay for the view's own writes](issues/244-tasks-from-entries-snapshot-with-write-overlay.md) | 115, 241 | done | issue/244-tasks-from-entries-snapshot-with-write-overlay (2b5a30fd3) | 2026-11-12 |
| 245 | [A Sources panel edits the Tasks query, and the section tag textbox goes](issues/245-tasks-sources-panel-and-textbox-removal.md) | 116 | done | issue/245-tasks-sources-panel-and-textbox-removal (e2479b35f) | 2026-11-12 |
| 246 | [Set due and priority from the Tasks row menu, with Undo](issues/246-tasks-row-menu-due-and-priority.md) | 122, 241 | done | issue/246-tasks-row-menu-due-and-priority (5152ec83c) | 2026-11-12 |
| 247 | [A list column picks, saves and manages Tasks views](issues/247-tasks-list-column.md) | 124 | todo | | |
| 248 | [Todoist sync reads task tags with the same rule as the Rust parser](issues/248-todoist-tags-follow-the-new-task-tag-rule.md) | 075 | done | issue/248-todoist-tags-follow-the-new-task-tag-rule (6ff6c3d55) | 2026-11-12 |

## Log

- 2026-11-12 10:09 — ledger created (36 Issues)
- 2026-11-12 10:14 — 108 — start — launched by /relay-lite:run — d0a505c94
- 2026-11-12 10:28 — 108 — deliver — review APPROVED round 1 (claude), three nits rejected with reasons, no fix round; full suite 614 files / 15601 tests passed; reviewer e2e tasks-view.spec.ts 8 passed; squash merged and pushed — 1a9e9eeaf
- 2026-11-12 10:28 — 242 — start — launched by /relay-lite:run — ca647518e
- 2026-11-12 10:47 — 242 — deliver — round 1 APPROVED by claude (1 finding fixed: e2e asserts the untagged task stays hidden; 1 nit), deliver re-review APPROVED by claude; full suite 615 files / 15625 tests, cargo 1437 passed, e2e tasks-view.spec.ts 9 passed; squash merged and pushed — 3583a1057
- 2026-11-12 10:47 — 110 — start — launched by /relay-lite:run — ed777b996
- 2026-11-12 11:02 — 110 — deliver — round 1 APPROVED by claude, one nit deferred to 111 with reason, no fix round; full suite 615 files / 15660 tests passed; reviewer e2e (tasks-view, event-calendar-tasks) 11 passed; squash merged and pushed — e420d69e2
- 2026-11-12 11:02 — 234 — start — launched by /relay-lite:run — 7d6098b1a
- 2026-11-12 11:02 — 074 — start — launched by /relay-lite:run, beside 234 (side track) — 7d6098b1a
- 2026-11-12 11:23 — 234 — deliver — round 1 APPROVED by claude (fix round: exact alert text, alert over filtered empty state; placement left for owner's visual check), deliver re-review APPROVED by claude; full suite 615 files / 15685 tests passed; squash merged and pushed — d52d63db2
- 2026-11-12 11:23 — 243 — start — launched by /relay-lite:run (open-itens 030 done) — 2aeef7a9d
- 2026-11-12 11:25 — 074 — deliver — round 1 APPROVED by claude (fix round: e2e mock closes a fence only on its opening marker, tilde-fence fixture, test rename), deliver re-review APPROVED by claude; full suite 616 files / 15667 tests passed on run 2 (run 1: unrelated AutoOrganizeRuleRow waitFor timeout); squash merged and pushed — 16e3db9ed
- 2026-11-12 11:25 — 075 — start — launched by /relay-lite:run, side track beside 243 — c3868e9fa
- 2026-11-12 11:37 — 243 — deliver — round 1 APPROVED by claude, one nit rejected (245 removes the duplicated literal), no fix round; full suite 616 files / 15736 tests passed; squash merged and pushed — fa8578342
- 2026-11-12 11:37 — 236 — start — launched by /relay-lite:run — 97ae00757
- 2026-11-12 11:51 — 236 — deliver — round 1 APPROVED by claude with no findings, no fix round; full suite 618 files / 15757 tests passed; header layout and circle geometry not checked by eye; squash merged and pushed — 07181df1c
- 2026-11-12 11:51 — 109 — start — launched by /relay-lite:run — ec03b5500
- 2026-11-12 11:55 — 075 — deliver — round 1 APPROVED by claude, 3 findings accepted with no code change (major: Todoist sync keeps the ASCII tag rule, follow-up Issue to file; minor: recurrence vs #über; nit); full suite 616 files / 15696 tests, cargo 1453 passed; e2e: tabs.spec.ts:42 fails the same on main, rest passed; index schema 6 -> 7; squash merged and pushed — 015f8c18f
- 2026-11-12 11:56 — ledger updated (added 248)
- 2026-11-12 11:56 — 115 — start — launched by /relay-lite:run, side track beside 109 — f0f868d1b
- 2026-11-12 12:10 — 109 — deliver — round 1 APPROVED by claude (fix round: the whole text-and-chips wrapper opens the note; commit line ranges), deliver re-review APPROVED by claude; full suite 618 files / 15787 tests passed on run 2 (run 1: AutoOrganizeRuleRow waitFor timeout, passes alone); chip look not checked by eye; squash merged and pushed — 89196031e
- 2026-11-12 12:10 — 115 — deliver — round 1 APPROVED by claude with a fix round, deliver re-review APPROVED by claude; full suite 619 files / 15803 tests passed on run 2 (run 1: AutoOrganizeRuleRow waitFor timeout, passes alone); squash merged and pushed — 115d8d576
- 2026-11-12 12:10 — 111 — start — launched by /relay-lite:run — 61558f7f6
- 2026-11-12 12:10 — 248 — start — launched by /relay-lite:run, side track beside 111 — 61558f7f6
- 2026-11-12 12:30 — 248 — deliver — round 1 CHANGES_REQUESTED by claude, fix round, round 2 APPROVED by claude; full suite 619 files / 15861 tests passed; squash merged and pushed — 6ff6c3d55
- 2026-11-12 12:33 — 111 — deliver — round 1 APPROVED by claude with a fix round, deliver re-review APPROVED by claude (one optional nit not applied); full suite 621 files / 15895 tests passed; squash merged and pushed — b1550f521
- 2026-11-12 12:33 — 238 — start — launched by /relay-lite:run — 8a07b5ca3
- 2026-11-12 12:34 — ledger updated (title of 124, 125; blocked by of 123, 124, 126; wontfix 123, 126)
- 2026-11-12 12:46 — 238 — deliver — round 1 APPROVED by claude with a fix round (help sentence on undated tasks, reuse today), deliver re-review APPROVED by claude; full suite 621 files / 15939 tests passed; squash merged and pushed — 0cc4c6a0a
- 2026-11-12 12:46 — 239 — start — launched by /relay-lite:run — 1f2cae2e5
- 2026-11-12 14:40 — 239 — deliver — round 1 APPROVED by claude, two nits rejected with reasons, no fix round; full suite 621 files / 16002 tests passed; narrow-split look not checked by eye; squash merged and pushed — f51d1e4c7
- 2026-11-12 14:40 — 113 — start — launched by /relay-lite:run — 78e36717c
- 2026-11-12 15:01 — 113 — deliver — round 1 APPROVED by claude with a fix round (help line), deliver re-review APPROVED by claude; one finding deferred (repeated Space/Enter); full suite 623 files / 16058 tests passed; squash merged and pushed — 16c5d8b73
- 2026-11-12 15:01 — 112 — start — launched by /relay-lite:run — a8d04ed83
- 2026-11-12 15:23 — 112 — deliver — round 1 APPROVED by claude with a fix round (refocus a row recreated in another group, help line), deliver re-review APPROVED by claude; full suite 624 files / 16083 tests passed; squash merged and pushed — fd29df83c
- 2026-11-12 15:23 — 240 — start — launched by /relay-lite:run — 5495ab2f2
- 2026-11-12 15:42 — 240 — deliver — round 1 APPROVED by claude with a fix round (no focus move after a mouse collapse), deliver re-review APPROVED by claude; one minor left (Space under Status grouping with Done collapsed sends focus to body); full suite 625 files / 16108 tests passed; squash merged and pushed — b2ca57f2a
- 2026-11-12 15:42 — 241 — start — launched by /relay-lite:run — 3da2f2a39
- 2026-11-12 16:06 — 241 — deliver — round 1 APPROVED by claude with a fix round (dismiss the previous Undo toast before a new one), deliver re-review APPROVED by claude; full suite 626 files / 16145 tests passed; squash merged and pushed — 0653db349
- 2026-11-12 16:06 — 244 — start — launched by /relay-lite:run — 378e4bcb1
- 2026-11-12 16:35 — 244 — deliver — round 1 CHANGES_REQUESTED by claude, fix round, round 2 APPROVED by claude; full suite 626 files / 16168 tests passed; squash merged and pushed — 2b5a30fd3
- 2026-11-12 16:35 — 116 — start — launched by /relay-lite:run — 86672cb3e
- 2026-11-12 16:35 — 122 — start — launched by /relay-lite:run, beside 116 (Rust command only) — 86672cb3e
- 2026-11-12 17:00 — 116 — deliver — round 1 APPROVED by claude, five nits kept with reasons, no fix round; full suite 627 files / 16256 tests passed on run 2 (run 1: AutoOrganizeRuleRow waitFor timeout, passes alone); reviewer e2e tasks-view.spec.ts 13 passed; squash merged and pushed — 4268ffc27
- 2026-11-12 17:00 — 245 — start — launched by /relay-lite:run — 2d9c3e268
- 2026-11-12 17:01 — 122 — deliver — round 1 APPROVED by claude with a fix round (new token goes before the recurrence when a block id follows), deliver re-review APPROVED by claude; full suite 629 files / 16242 tests, cargo 1466 passed; squash merged and pushed — befb8f876
- 2026-11-12 17:29 — 245 — deliver — round 1 APPROVED by claude with a fix round (focus after removing a clause, card or exclude; Remove card test; ghost remove button), deliver re-review APPROVED by claude; full suite 630 files / 16315 tests passed; squash merged and pushed — e2479b35f
- 2026-11-12 17:29 — 246 — start — launched by /relay-lite:run — 16486a353
- 2026-11-12 17:52 — 246 — deliver — round 1 APPROVED by claude with a fix round (menu close focus, refuse notes outside the vault before the dirty-tab save), deliver re-review APPROVED by claude; full suite 632 files / 16349 tests passed; squash merged and pushed — 5152ec83c
- 2026-11-12 17:52 — 117 — start — launched by /relay-lite:run — 86d743b20
- 2026-11-12 17:52 — 121 — start — launched by /relay-lite:run, beside 117 (cleanup, cargo) — 86d743b20
- 2026-11-12 18:11 — 117 — deliver — round 1 APPROVED by claude with a fix round (help bullets, aria-labels on group actions), deliver re-review APPROVED by claude; full suite 632 files / 16381 tests passed on run 2 (run 1: AutoOrganizeRuleRow flake); hover reveal not checked by eye; squash merged and pushed — 2f85150c1
- 2026-11-12 18:11 — 118 — start — launched by /relay-lite:run — 2bbbb2ca9
- 2026-11-12 18:11 — 119 — start — launched by /relay-lite:run, beside 118 and 121 — 2bbbb2ca9
- 2026-11-12 18:11 — 121 — deliver — round 1 APPROVED by claude, three nits handled in Resolution (stale lines in docs/architecture tasks.md need a follow-up; feature/ios-poc must drop the command on rebase), no fix round; full suite 631 files / 16342 tests passed on run 2 (run 1: AutoOrganizeRuleRow flake); squash merged and pushed — c4e917f99
- 2026-11-12 18:29 — 119 — deliver — round 1 CHANGES_REQUESTED by claude (heading picker suggests tags, key spellings kept, archived wording), fix round, round 2 APPROVED by claude; full suite 631 files / 16394 tests passed; squash merged and pushed — 711885f97
- 2026-11-12 18:29 — 124 — start — launched by /relay-lite:run (after 119) — 54b63dfd0
