# Ledger: typography-hierarchy

This file is the source of truth for the progress of the typography-hierarchy Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run typography-hierarchy
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
| 01 | [Font families resolve on every machine and the font picker previews each font](issues/01-font-families-resolve-everywhere.md) | none | done | issue/01-font-families-resolve-everywhere (920bd4b7) | 2026-11-04 |
| 02 | [The app chrome has a type scale, and the right sidebar follows it](issues/02-chrome-type-scale-and-right-sidebar.md) | none | done | issue/02-chrome-type-scale-and-right-sidebar (de5a0008) | 2026-11-04 |
| 03 | [The left rail and Settings follow the type scale](issues/03-left-rail-and-settings-follow-the-scale.md) | 02 | done | issue/03-left-rail-and-settings-follow-the-scale (188c1293) | 2026-11-04 |
| 04 | [Blocks inside a note scale with the editor font, and code does not jump size on reveal](issues/04-editor-blocks-scale-with-the-editor-font.md) | none | done | issue/04-editor-blocks-scale-with-the-editor-font (f6cf62d6) | 2026-11-04 |
| 05 | [Every heading level is distinct, and the font size setting is the size on screen](issues/05-every-heading-level-is-distinct.md) | none | done | issue/05-every-heading-level-is-distinct (e4c68f8e) | 2026-11-04 |
| 06 | [Small text in note blocks has an 11px floor, and the last px sizes in blocks go](issues/06-block-text-floor-and-leftover-px.md) | 04 | done | issue/06-block-text-floor-and-leftover-px (d699d841) | 2026-11-04 |

## Log

- 2026-11-04 06:46 — ledger created (5 Issues)
- 2026-11-04 07:00 — 01 — start — launched by /relay-lite:run — 63adb28f
- 2026-11-04 07:11 — 02 — start — launched by /relay-lite:run — 7cdb5a31
- 2026-11-04 07:17 — 01 — deliver — merged as fix: font families resolve everywhere, picker previews fonts; round 1 APPROVED (claude, 1 nit fixed), round 2 APPROVED (claude) no findings; full suite 462 files / 10715 tests passed + build ok; workflow blocked on a main ledger commit not yet pushed during the GitHub incident, finished by hand with deliver sync + merge — 920bd4b7
- 2026-11-04 07:41 — 02 — deliver — merged as feat: chrome type scale, right sidebar follows it; round 1 APPROVED (claude) with findings fixed in 2125446c (commands.ts Title Case change rejected), round 2 APPROVED (claude) no findings; full suite 464 files / 10748 tests passed + build ok; workflow blocked on the GitHub SSH incident at deliver sync, finished by hand (sync clean, merge, push, worktree removed) — de5a0008
- 2026-11-04 07:45 — 03 — start — launched by /relay-lite:run — 4850a2a9
- 2026-11-04 07:50 — 04 — start — launched by /relay-lite:run — f7860a08
- 2026-11-04 08:03 — 03 — deliver — merged as feat: left rail and Settings follow the type scale; round 1 APPROVED (claude) with 3 nits fixed in 03967b83, round 2 APPROVED (claude) no findings; full suite 465 files / 10760 tests passed + build ok; workflow blocked on the GitHub SSH incident at deliver sync, finished by hand (sync rebased over .scratch-only commits, merge) — 188c1293
- 2026-11-04 08:04 — 05 — start — launched by /relay-lite:run — 14463b90
- 2026-11-04 08:19 — 04 — deliver — merged as feat: note blocks scale with the editor font; round 1 APPROVED (claude), fixes for bar em sizing, day-number size, line-decoration test asserts; round 2 APPROVED (claude); owed to owner: in-app LP-PROFILE on a long note and a visual check of collection bars at 8px and 32px; workflow blocked on the GitHub SSH incident, finished by hand: rebased over Issue 03, full gate rerun green (465 files / 10822 tests + build), merge, push — f6cf62d6
- 2026-11-04 08:27 — ledger updated (added 06)
- 2026-11-04 08:28 — 05 — deliver — merged as feat: distinct heading levels and true-to-screen font size; round 1 APPROVED (claude) with 5 findings, none fixed (built-in H6 not muted, old user themes keep one heading color, mutedFg collision rare, Lavender Haze bold color #843C7E needs owner confirmation, E2E fixtures render 15px); full suite twice, rebased run 467 files / 10862 tests + build ok; E2E not run — e4c68f8e
- 2026-11-04 08:28 — 06 — start — launched by /relay-lite:run — 54732795
- 2026-11-04 11:05 — 06 — deliver — merged as d699d841 (block text 11px floor and em sizes in blocks); the row was left in-progress when its run's session ended, closed by hand after relay check merged passed — d699d841a
