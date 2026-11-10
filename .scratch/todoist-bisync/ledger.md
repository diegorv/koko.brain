# Ledger: todoist-bisync

This file is the source of truth for the progress of the todoist-bisync Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run todoist-bisync
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
| 01 | [Live check of the Todoist API behaviors the sync relies on](issues/01-live-check-todoist-api.md) | none | done | | |
| 02 | [Pure task-line patch and anchor helpers](issues/02-task-line-patch-and-anchor-logic.md) | none | done | issue/02-task-line-patch-and-anchor-logic (61e9e5c1c) | 2026-11-09 |
| 03 | [Guarded writer for task lines in notes that are not open](issues/03-guarded-line-writer-closed-notes.md) | 02 | done | issue/03-guarded-line-writer-closed-notes (1dbeac3ca) | 2026-11-09 |
| 04 | [Guarded writer for task lines in notes that are open in a tab](issues/04-guarded-line-writer-open-tabs.md) | 03 | done | issue/04-guarded-line-writer-open-tabs (af9115203) | 2026-11-09 |
| 05 | [Sync settings, sync state store and a connection check](issues/05-sync-settings-state-and-connection-check.md) | none | done | issue/05-sync-settings-state-and-connection-check (e982782b8) | 2026-11-09 |
| 06 | ["Todoist: Sync now" pulls every project and its open tasks into project notes](issues/06-sync-now-pulls-projects-and-tasks.md) | 04, 05 | done | issue/06-sync-now-pulls-projects-and-tasks (12fefe60a) | 2026-11-09 |
| 07 | [Completing or reopening a task syncs both ways, recurring tasks included](issues/07-completion-syncs-both-ways.md) | 01, 06 | done | issue/07-completion-syncs-both-ways (e5583a987) | 2026-11-09 |
| 08 | [Edits made in Todoist reach the note](issues/08-todoist-edits-reach-the-note.md) | 07 | done | issue/08-todoist-edits-reach-the-note (36e7a849c) | 2026-11-10 |
| 09 | [Edits made in the note reach Todoist](issues/09-note-edits-reach-todoist.md) | 08 | done | issue/09-note-edits-reach-todoist (9abec5039) | 2026-11-10 |
| 10 | [A task written in the brain is created in Todoist](issues/10-brain-tasks-created-in-todoist.md) | 09 | done | issue/10-brain-tasks-created-in-todoist (13f3f2758) | 2026-11-10 |
| 11 | [Projects sync both ways](issues/11-projects-sync-both-ways.md) | 10 | done | issue/11-projects-sync-both-ways (c064777eb) | 2026-11-10 |
| 12 | [Sections and task moves sync both ways](issues/12-sections-and-moves-sync.md) | 11 | done | issue/12-sections-and-moves-sync (847c02d94) | 2026-11-10 |
| 13 | [A task deleted on either side is detached, never deleted on the other](issues/13-deleted-tasks-detach.md) | 07 | done | issue/13-deleted-tasks-detach (d933ffa9c) | 2026-11-09 |
| 14 | [The sync runs on its own and reports failures](issues/14-sync-runs-on-its-own.md) | 06 | done | issue/14-sync-runs-on-its-own (c548b66a7) | 2026-11-09 |
| 15 | [Retire the old send/sync path and document the two-way sync](issues/15-retire-old-send-and-document.md) | 10, 12, 13, 14 | todo | | |
| 16 | [A sync stopped by the line brake has a way past it](issues/16-line-brake-recovery.md) | 13 | todo | | |
| 17 | [Block ids, orphan anchors and dropped pending adds are handled in every sync path](issues/17-block-ids-and-orphan-anchors.md) | 10 | todo | | |

## Log

- 2026-11-09 15:48 — ledger created (15 Issues)
- 2026-11-09 15:49 — 02 — start — launched by /relay-lite:run — 0d72607a4
- 2026-11-09 16:09 — 02 — deliver — round 1 APPROVED by claude with findings, fix round (parser tag rule, space before anchor insert, CRLF, empty content, bare td-), finding 4 deferred to owner before 08; round 2 APPROVED by claude, one nit (CRLF + recurrence gives a conflict) left; full suite passed (584 files, 14278 tests) — 61e9e5c1c
- 2026-11-09 21:08 — 05 — start — launched by /relay-lite:run — 36f920e4f
- 2026-11-09 21:18 — 03 — start — launched by /relay-lite:run — fe8d80ca6
- 2026-11-09 21:46 — 05 — deliver — round 1 APPROVED by claude, fix round (vault-mismatch test opens the other vault, interval clamp returns 5 for non-numbers), syncFolder normalization and fake checked-item drop deferred; round 2 APPROVED with no findings; full suite passed (vitest 591 files, 14365 tests; cargo 1365) — e982782b8
- 2026-11-09 21:50 — 03 — deliver — round 1 APPROVED by claude with findings, fix round (same-line anchors stale, CRLF notes stale, empty batch on a missing note creates nothing, indexing rule 2 lists write_task_lines); round 2 APPROVED with no findings; full suite passed (vitest 587 files, 14307 tests; cargo 1394) — 1dbeac3ca
- 2026-11-09 21:50 — 04 — start — launched by /relay-lite:run — 7bbcbfed8
- 2026-11-09 22:08 — 04 — deliver — round 1 APPROVED by claude with findings, fix round (shared anchor id helper, a mock dropped, guard fallback test); round 2 APPROVED with no findings; full suite passed (595 files, 14424 tests) — af9115203
- 2026-11-09 22:08 — 06 — start — launched by /relay-lite:run — 77d9638af
- 2026-11-09 22:09 — ledger updated (blocked by of 14)
- 2026-11-09 22:37 — 06 — deliver — round 1 APPROVED by claude, fix round (rebuild-mode toast, sync_token not committed after a stale insert, vault-switch test, folder normalization, outline order, JSDoc), points 3 and 6 recorded for owner/Issue 07; round 2 APPROVED, one nit left (trailing backslash in syncFolder); full suite passed (597 files, 14494 tests) — 12fefe60a
- 2026-11-09 22:38 — 07 — start — launched by /relay-lite:run — c78e5afe2
- 2026-11-09 22:38 — 14 — start — launched by /relay-lite:run — c78e5afe2
- 2026-11-09 23:08 — 14 — deliver — round 1 CHANGES_REQUESTED by claude (4 findings), fix round test-first (429 refusal on queued Sync now, no fail() on vault switch, first_run_done recheck, after-save idle when sync off); round 2 APPROVED; round 3 APPROVED with no findings; full suite passed (602 files, 14557 tests) — c548b66a7
- 2026-11-09 23:14 — 07 — deliver — approved and full suite passed, but deliver sync conflicted with Issue 14 in sync-now.service.ts and its test; rebase aborted, worktree kept at 7f0fbabb4 — 132c082c0
- 2026-11-09 23:30 — 07 — deliver — finished by hand after the sync conflict with Issue 14: rebased, conflicts resolved, integration fixes (tests aligned to extended PullCounts, automatic cycles skip over-cap pushes instead of asking); opus integration review APPROVED with 2 minor (carried to Issue 10); full suite passed (603 files, 14631 tests) — e5583a987
- 2026-11-09 23:31 — 08 — start — launched by /relay-lite:run — 86fbbe3fc
- 2026-11-09 23:31 — 13 — start — launched by /relay-lite:run — 86fbbe3fc
- 2026-11-09 23:53 — 13 — deliver — round 1 APPROVED by claude with findings, fix round (moved-out-of-tree only for a known live project outside the tree, Issue 10 criterion that a detached anchor is never re-created, nit), follow-up Issue 16 opened (line-brake recovery, owner decision); round 2 APPROVED with no findings; full suite passed (604 files, 14670 tests) — d933ffa9c
- 2026-11-09 23:53 — ledger updated (added 16)
- 2026-11-09 23:54 — 08 — deliver — approved and full suite passed, but deliver sync conflicted with Issue 13 in sync-now.service.ts; rebase aborted, worktree kept — 44593a4a0
- 2026-11-10 00:04 — 08 — deliver — finished by hand after the sync conflict with Issue 13: rebased, additive conflicts resolved, integration fix (detached links no longer reach planFields) with regression tests; opus integration review APPROVED with 1 minor (carried to Issue 09); full suite passed (605 files, 14712 tests) — 36e7a849c
- 2026-11-10 00:04 — 09 — start — launched by /relay-lite:run — 6cc2e613f
- 2026-11-10 00:42 — 09 — deliver — round 1 CHANGES_REQUESTED by claude, fixes (unpushedDescription marker, single description-conflict log, 500 code points, case-insensitive tag dedupe); round 2 APPROVED, one more fix (reverted line pushed); round 3 APPROVED with no findings; full suite passed (605 files, 14751 tests) — 9abec5039
- 2026-11-10 00:42 — 10 — start — launched by /relay-lite:run — 23da5bd43
- 2026-11-10 01:34 — 10 — deliver — round 1 APPROVED by claude with findings, fix round (anchor before a trailing ^block-id, block id stripped from item_add, create-skipped logged only on manual cycles), findings 3 and 4 left as follow-ups; round 2 APPROVED with one nit on Issue 09 code (follow-up); full suite passed (606 files, 14820 tests) — 13f3f2758
- 2026-11-10 01:35 — ledger updated (added 17)
- 2026-11-10 01:35 — 11 — start — launched by /relay-lite:run — 1bbbd420f
- 2026-11-10 02:20 — 11 — deliver — round 1 APPROVED by claude with findings, fix round (project id written to an open tab, case-only rename, temp id across requests, merged tree ids, JSDoc), finding 4 (pending project_add lost on rename after a lost response) left for a follow-up; round 2 APPROVED with no findings; full suite passed (607 files, 14870 tests) — c064777eb
- 2026-11-10 02:20 — 12 — start — launched by /relay-lite:run — 89c433d0b
- 2026-11-10 03:21 — 12 — deliver — round 1 CHANGES_REQUESTED by claude, fixes (Todoist section kept for an unlinked line, level-2 headings only, empty ## skipped, terminal section_add logged on manual cycles); round 2 APPROVED, one fix (brain rename row written after Todoist creates the section); round 3 APPROVED with no findings; full suite passed (608 files, 14937 tests; cargo 1430) — 847c02d94
