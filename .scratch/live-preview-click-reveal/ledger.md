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
| 01 | [A click in the blank band above or below a block widget keeps it rendered](issues/01-block-widget-blank-bands-reveal-source.md) | none | done | issue/01-block-widget-blank-bands-reveal-source (4e76ce0b) | 2026-11-03 |
| 02 | [A click right of a table, code block or math block, or in the table's empty corner, keeps it rendered](issues/02-widget-right-margin-and-table-corner.md) | 01 | done | issue/02-widget-right-margin-and-table-corner (f6df613a) | 2026-11-03 |
| 03 | [A click above the first body line does not land inside the hidden frontmatter](issues/03-frontmatter-top-padding-click.md) | none | done | issue/03-frontmatter-top-padding-click (52a7ae7b) | 2026-11-03 |
| 04 | [A click on a wikilink inside a table cell opens the note](issues/04-table-cell-wikilink-click.md) | none | done | issue/04-table-cell-wikilink-click (250d6eaf) | 2026-11-03 |
| 05 | [A click on a note embed's header opens the embedded note](issues/05-note-embed-header-opens-note.md) | none | done | issue/05-note-embed-header-opens-note (9caed179) | 2026-11-03 |
| 06 | [A click on a numbered list marker moves the cursor to the item, like a bullet](issues/06-ordered-marker-click-matches-bullet.md) | none | done | issue/06-ordered-marker-click-matches-bullet (905a5efd) | 2026-11-03 |
| 07 | [A click on the blank space left of a table keeps it rendered](issues/07-table-left-side-click.md) | none | done | issue/07-table-left-side-click (7e27fd64) | 2026-11-03 |
| 08 | [The space below a table is closer to the space above it](issues/08-table-bottom-padding.md) | none | done | issue/08-table-bottom-padding (6899ebf2) | 2026-11-03 |
| 09 | [Click-reveal E2E coverage for the zones the first pass left out](issues/09-click-reveal-coverage-gaps.md) | none | done | issue/09-click-reveal-coverage-gaps (5d2369cf) | 2026-11-03 |
| 10 | [A frontmatter write while scrolled down keeps the visible text in place](issues/10-frontmatter-write-keeps-scroll.md) | none | done | issue/10-frontmatter-write-keeps-scroll (325ce66f) | 2026-11-03 |
| 11 | [A block widget above the viewport that re-renders with new data keeps the visible text in place](issues/11-offscreen-block-rerender-keeps-scroll.md) | none | done | issue/11-offscreen-block-rerender-keeps-scroll (e3e862e1) | 2026-11-03 |
| 12 | [A click in the audio player wrapper's padding keeps the cursor where it was](issues/12-media-wrapper-padding-click.md) | none | wontfix | | |
| 13 | [The empty space under a document that ends with a block, and a drag into a band, keep the block rendered](issues/13-band-click-doc-end-and-drag.md) | none | done | issue/13-band-click-doc-end-and-drag (d5ed14fe) | 2026-11-03 |

## Log

- 2026-11-03 12:19 — ledger created (6 Issues)
- 2026-11-03 12:31 — 01 — start — launched by /relay-lite:run — 82613d9a
- 2026-11-03 12:31 — 06 — start — launched by /relay-lite:run (parallel with 01) — 82613d9a
- 2026-11-03 12:42 — 06 — deliver — merged as 905a5efd; OrderedListMarkerWidget.ignoreEvent() returns false; reviews round 1 APPROVED, round 2 APPROVED; full suite 457 files, 10573 passed, build ok — 905a5efd
- 2026-11-03 13:10 — 01 — deliver — merged as 4e76ce0b; band clicks remapped by core/block-band-click.ts, error box opens YAML; reviews round 1 APPROVED, round 2 APPROVED; full suite 458 files, 10592 passed, build ok; owner WebKit check open — 4e76ce0b
- 2026-11-03 13:11 — 03 — start — launched by /relay-lite:run — 7f2e2bd7
- 2026-11-03 13:42 — 03 — deliver — merged as 52a7ae7b; top-padding click goes to the first body line (frontmatterClick); reviews round 1 APPROVED, round 2 APPROVED; full suite 459 files, 10605 passed, build ok; live-preview E2E 237 passed — 52a7ae7b
- 2026-11-03 13:42 — 04 — start — launched by /relay-lite:run — a4815109
- 2026-11-03 13:56 — 04 — deliver — merged as 250d6eaf; table-cell wikilink click resolves inside the table widget; reviews round 1 APPROVED, round 2 APPROVED; full suite 459 files, 10613 passed, build ok — 250d6eaf
- 2026-11-03 13:56 — 05 — start — launched by /relay-lite:run — 86232639
- 2026-11-03 14:05 — 05 — deliver — merged as 9caed179; embed header click opens the note; reviews round 1 APPROVED, round 2 APPROVED; full suite 459 files, 10617 passed, build ok — 9caed179
- 2026-11-03 14:05 — 02 — start — launched by /relay-lite:run — db5a7275
- 2026-11-03 14:22 — 02 — deliver — merged as f6df613a; clicks right of table/code/math and in the table corner keep the widget; reviews round 1 APPROVED, round 2 APPROVED; full suite 459 files, 10623 passed, build ok — f6df613a
- 2026-11-03 14:27 — ledger updated (added 07, 08)
- 2026-11-03 14:27 — 07 — start — launched by /relay-lite:run — c6926c7e
- 2026-11-03 14:49 — 08 — start — launched by /relay-lite:run (parallel with 07) — 2f68830d
- 2026-11-03 15:11 — 08 — deliver — merged as 6899ebf2; table wrapper bottom padding 10px, +row button 6px; round 1 CHANGES_REQUESTED (button covered the last row), round 2 APPROVED; full suite 459 files, 10623 passed, build ok; owner macOS check open — 6899ebf2
- 2026-11-03 15:14 — 07 — deliver — merged as 7e27fd64; click in a block widget line's left padding keeps it rendered; reviews round 1 APPROVED, round 2 APPROVED; full suite 459 files, 10624 passed, build ok; owner macOS check open — 7e27fd64
- 2026-11-03 15:32 — ledger updated (added 09)
- 2026-11-03 15:32 — 09 — start — launched by /relay-lite:run — 4c93f2bc
- 2026-11-03 15:44 — ledger updated (added 10)
- 2026-11-03 15:44 — 10 — start — launched by /relay-lite:run (parallel with 09) — c10b352d
- 2026-11-03 15:47 — ledger updated (added 11)
- 2026-11-03 15:53 — ledger updated (blocked by of 11)
- 2026-11-03 15:55 — 11 — start — launched by /relay-lite:run (owner asked; third workflow beside 09 and 10) — 46264b0f
- 2026-11-03 16:13 — 11 — deliver — merged as e3e862e1; probes measured 0.0 px shift for collection, queryjs and note embed, no app fix, probes kept as E2E tests; reviews round 1 APPROVED, round 2 APPROVED; full suite 459 files, 10624 passed, build ok — e3e862e1
- 2026-11-03 16:25 — 10 — deliver — merged as 325ce66f; dispatchMetaBindUpdate carries view.scrollSnapshot(); properties panel and on-screen writes did not jump; reviews round 1 APPROVED, round 2 APPROVED; full suite 459 files, 10624 passed, build ok; owner macOS check open — 325ce66f
- 2026-11-03 16:55 — 09 — deliver — merged as 5d2369cf; click-reveal coverage for the report's gaps plus the review's low findings; reviews round 1 APPROVED, round 2 APPROVED; full suite 459 files, 10624 passed, build ok — 5d2369cf
- 2026-11-03 16:58 — ledger updated (added 12, 13)
- 2026-11-03 17:07 — 13 — start — launched by /relay-lite:run — 0270c3ad
- 2026-11-03 17:32 — 13 — deliver — merged as d5ed14fe; doc-end press keeps the cursor, text drag into a band stops at the block edge (bandDragHead); reviews round 1 APPROVED, round 2 APPROVED; full suite 459 files, 10634 passed, build ok — d5ed14fe
- 2026-11-06 00:31 — 12 set to wontfix by hand: migrated to .scratch/audit-2026-11-05/ by the pre-use audit (each Issue file names its new number); the CLI has no transition from todo to wontfix or done
