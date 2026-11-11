# Ledger: frontmatter-rules

This file is the source of truth for the progress of the frontmatter-rules Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run frontmatter-rules
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
| 01 | [Auto Move rules set properties on save](issues/01-rules-set-properties-on-save.md) | none | done | issue/01-rules-set-properties-on-save (397eaa08a) | 2026-11-10 |
| 02 | [Rule consequences in Settings](issues/02-rule-consequences-in-settings.md) | 01 | done | issue/02-rule-consequences-in-settings (a314c98e3) | 2026-11-10 |
| 03 | [The rule filter uses the view filter builder](issues/03-rule-filter-uses-view-filter-builder.md) | 02 | done | issue/03-rule-filter-uses-view-filter-builder (054ace345) | 2026-11-10 |
| 04 | [`file.inFolder` takes a vault-relative folder](issues/04-infolder-takes-vault-relative-folder.md) | none | done | issue/04-infolder-takes-vault-relative-folder (107bcf35a) | 2026-11-10 |
| 05 | [Auto Move also evaluates a note when it is moved or renamed into a folder](issues/05-auto-move-evaluates-on-move-and-rename.md) | 06 | todo | | |
| 06 | [Rename Auto Move to Auto Organize everywhere, and document filters and actions](issues/06-rename-auto-move-to-auto-organize.md) | 03 | todo | | |
| 07 | [Property actions can remove a property or add items to a list](issues/07-property-actions-remove-and-add-to-list.md) | 13 | todo | | |
| 08 | [Property values can be computed with the expression engine](issues/08-computed-property-values.md) | 07 | todo | | |
| 09 | [A rule can create a note](issues/09-rule-action-create-note.md) | 08 | todo | | |
| 10 | [A rule can run a mod action](issues/10-rule-action-run-mod-action.md) | 12 | todo | | |
| 11 | [A rule can rename the note](issues/11-rule-action-rename-note.md) | 09 | todo | | |
| 12 | [Document the two-rule pattern for values that switch back](issues/12-undo-when-note-stops-matching.md) | 11 | todo | | |
| 13 | [An object rule filter reports a condition that fails at runtime](issues/13-object-filter-reports-runtime-leaf-errors.md) | 06 | todo | | |

## Log

- 2026-11-10 19:21 — ledger created (5 Issues)
- 2026-11-10 19:22 — 04 — start — launched by /relay-lite:run — d28a43b53
- 2026-11-10 19:24 — 01 — start — launched by /relay-lite:run — 1244d2a48
- 2026-11-10 19:37 — 04 — deliver — review APPROVED round 1 (claude), 2 nits rejected with reasons; full suite 606 files / 14906 tests passed; squash merged and pushed — 107bcf35a
- 2026-11-10 19:47 — 01 — deliver — blocked: deliver sync rebase conflict in auto-move.service.ts against main (Issue 04 landed first); reviews APPROVED x2; worktree kept — f88836ee0
- 2026-11-10 21:58 — 01 — start — main session resumed blocked delivery: hand rebase onto Issue 04 (vaultPath threaded into findMatchingRules, test dd63de1ce), opus review could not refute — 397eaa08a
- 2026-11-10 21:58 — 01 — deliver — reviews APPROVED x2 (claude) + fix round; hand rebase; full suite 607 files / 14967 tests passed; squash merged and pushed — 397eaa08a
- 2026-11-10 21:58 — 02 — start — launched by /relay-lite:run — 82efbb4cf
- 2026-11-10 22:19 — 02 — deliver — reviews APPROVED x2 (claude), fix round for 5 round-1 findings; full suite 608 files / 15010 tests passed; squash merged and pushed — a314c98e3
- 2026-11-10 22:19 — 03 — start — launched by /relay-lite:run — 543bf10de
- 2026-11-10 22:20 — ledger updated (added 06)
- 2026-11-10 22:22 — ledger updated (title of 06)
- 2026-11-10 22:25 — ledger updated (title of 06)
- 2026-11-10 22:29 — ledger updated (added 07, 08, 09, 10, 11, 12)
- 2026-11-10 22:36 — ledger updated (title of 12)
- 2026-11-10 22:46 — 03 — deliver — review CHANGES_REQUESTED then APPROVED x2 (claude); fixes: expression row, shared filter shape check, docs, type-scale class; full suite 608 files / 15053 tests passed; squash merged and pushed — 054ace345
- 2026-11-10 22:54 — ledger updated (added 13; blocked by of 05, 07, 10, 11)
