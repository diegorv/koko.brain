# Ledger: rail-shell-ux

This file is the source of truth for the progress of the rail-shell-ux Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run rail-shell-ux
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
| 01 | [A view lists `.view` files as notes, an unfiltered view lists itself](issues/01-unfiltered-view-lists-view-files.md) | none | done | issue/01-unfiltered-view-lists-view-files (11a01619) | 2026-11-04 |
| 02 | [Edits to a `.view` from the app bypass the note-change owner and force a full rebuild](issues/02-view-writes-bypass-note-change-owner.md) | none | done | issue/02-view-writes-bypass-note-change-owner (24e26aca) | 2026-11-04 |
| 03 | [The date "is" filter never matches `file.ctime` / `file.mtime`](issues/03-date-is-never-matches-file-dates.md) | none | done | issue/03-date-is-never-matches-file-dates (5416c58c) | 2026-11-04 |
| 04 | [Nested filter objects make CollectionView render zero rows](issues/04-nested-filter-objects-render-empty.md) | none | done | issue/04-nested-filter-objects-render-empty (eb7e4f27) | 2026-11-04 |
| 05 | [Date filters (before, after, on or before, on or after) match frontmatter dates](issues/05-date-filters-match-frontmatter-dates.md) | 03 | done | issue/05-date-filters-match-frontmatter-dates (9cf4b6d8) | 2026-11-04 |
| 06 | [A filter that does not parse shows an error instead of an empty (or full) list](issues/06-filter-parse-errors-are-visible.md) | 04 | done | issue/06-filter-parse-errors-are-visible (fcf78e578) | 2026-11-04 |
| 07 | [Meta-bind writes typed values, reads alias keys, works in table cells, and has accessible names](issues/07-meta-bind-typed-writes-and-alias-reads.md) | none | todo | | |
| 08 | [The note action bar treats a missing `_organized` as organized, like the index](issues/08-organized-default-matches-the-index.md) | none | in-progress | | |
| 09 | [A broken settings.json is backed up and reported, not silently replaced by defaults](issues/09-settings-json-parse-failure-keeps-a-backup.md) | none | done | issue/09-settings-json-parse-failure-keeps-a-backup (09ec9f36) | 2026-11-04 |
| 10 | [A broken or loading `.view` says so in the note list and the navigator](issues/10-view-lens-error-and-loading-states.md) | 01, 06 | todo | | |
| 11 | [A type name typed in lowercase is normalized, so it never splits into two rows](issues/11-type-names-are-normalized.md) | none | done | issue/11-type-names-are-normalized (8fe42637) | 2026-11-04 |
| 12 | [Type definitions and `.view` files stay out of note lenses (except Favorites) and out of `kb.pages()`](issues/12-definitions-and-views-stay-out-of-lenses.md) | 01, 10 | todo | | |
| 13 | [A `.view` lists the same rows, in the same order, in the editor and in the rail](issues/13-one-row-set-for-a-view.md) | 01, 10, 12 | todo | | |
| 14 | [Note rows show the relative modified time, matching the list order](issues/14-note-rows-show-relative-modified-time.md) | 12, 13 | todo | | |
| 15 | [`kb.pages()` leaves out `.view` files, type definitions and system-folder notes](issues/15-kb-pages-excludes-views-and-system-notes.md) | none | wontfix | | |
| 16 | [Explicit organization makes new notes start in the Inbox](issues/16-explicit-organization-marks-new-notes.md) | 08 | todo | | |
| 17 | [New view asks for a name and creates the view under that name](issues/17-new-view-asks-for-a-name.md) | none | in-progress | | |
| 18 | [The New view dialog takes filters](issues/18-new-view-dialog-takes-filters.md) | 17 | todo | | |
| 19 | [Edit view from the view row's menu](issues/19-edit-view-from-the-row-menu.md) | 02, 04, 17, 18 | todo | | |
| 20 | [The Views section has groups, hidden views and Move to Trash](issues/20-views-section-structure.md) | 10, 13, 17, 19 | todo | | |
| 21 | [`_rail: true` pins a view or a type to the rail](issues/21-pin-views-and-types-to-the-rail.md) | 02, 10, 12, 20 | todo | | |
| 22 | [`.view` is the menu format: `_rail_view`, Convert to view, New view in folders](issues/22-view-is-the-menu-format.md) | 10, 13, 17, 18, 20, 21 | todo | | |
| 23 | [The command palette reaches every rail item and view; a rail click shows hidden panels](issues/23-palette-reaches-every-rail-item.md) | 20, 21 | todo | | |
| 24 | [Settings > Rail: hide and reorder built-in items, Inbox badge switch](issues/24-settings-rail-page.md) | 21, 23 | todo | | |
| 25 | [Meta-bind controls work in table cells, show a stored value outside the options, follow any wikilink, and have accessible names](issues/25-meta-bind-table-cells-select-links-and-labels.md) | none | wontfix | | |
| 26 | [Docs, help pages and examples match everything this delivery shipped](issues/26-docs-and-help-match-the-delivery.md) | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24 | todo | | |

## Log

- 2026-11-04 09:07 — ledger created (26 Issues)
- 2026-11-04 09:08 — 04 — start — launched by /relay-lite:run — f8f13b58
- 2026-11-04 09:13 — 01 — start — launched by /relay-lite:run (parallel with 04) — 0b051a46
- 2026-11-04 09:13 — 03 — start — launched by /relay-lite:run (parallel with 04) — 0b051a46
- 2026-11-04 09:19 — ledger updated (title of 07, 12; blocked by of 15, 25, 26)
- 2026-11-04 09:19 — 25 — merged — merged into Issue 07 by the owner; criteria and notes moved there; row set to wontfix by hand (no CLI transition from todo) — 70cf566a
- 2026-11-04 09:19 — 15 — merged — merged into Issue 12 by the owner; criteria and notes moved there; row set to wontfix by hand (no CLI transition from todo) — 70cf566a
- 2026-11-04 09:22 — 01 — deliver — merged as 11a01619: isListableNote drops .view entries in resolveViewLens; 2 reviews APPROVED (claude); full suite 10882 passed, build OK — 11a01619
- 2026-11-04 09:22 — 02 — start — launched by /relay-lite:run (parallel with 03, 04) — 9a11a9ce
- 2026-11-04 09:24 — 03 — deliver — merged as 5416c58c: date is on file.ctime/mtime matches the local day via parseLocalDateOnly; review APPROVED (claude), minor finding (== '' matches mtime 0) rejected as out of scope; full suite 10897 passed, build OK — 5416c58c
- 2026-11-04 09:24 — 09 — start — launched by /relay-lite:run (parallel with 02, 04) — b4ceae68
- 2026-11-04 09:28 — 04 — deliver — blocked: deliver sync rebase conflict in src/tests/lib/features/rail-shell/lens.logic.test.ts (Issue 01 landed first); 3 reviews, last APPROVED; worktree kept — 52fb1026
- 2026-11-04 09:28 — 08 — start — launched by /relay-lite:run (parallel with 02, 09) — bb930bac
- 2026-11-04 09:36 — 04 — deliver — main session finished the deliver: rebased by hand onto main (kept both Issue 01 and 04 tests in lens.logic.test.ts), full gate 10918 passed + build OK, opus adversarial re-review APPROVED (minor: malformed nested and/or/not scalar throws, moved to Issue 06), merged as eb7e4f27 — eb7e4f27
- 2026-11-04 09:39 — 09 — deliver — merged as 09ec9f36: broken settings.json is backed up and reported with sticky toasts; 2 reviews APPROVED (claude), round-1 minors fixed; full suite 10927 passed, build OK — 09ec9f363
- 2026-11-04 09:39 — 05 — start — launched by /relay-lite:run (parallel with 02, 08) — 714bf7cab
- 2026-11-04 09:44 — 02 — deliver — merged as 24e26aca: .view writes go through applyNoteChange; file-icons reads .view YAML body; ADR-0009 amended; 2 reviews APPROVED (claude); full suite 10948 passed, build OK — 24e26aca2
- 2026-11-04 09:44 — 11 — start — launched by /relay-lite:run (parallel with 05, 08) — 5b14a9cde
- 2026-11-04 09:52 — 05 — deliver — merged as 9cf4b6d8: before/after date filters compare frontmatter dates by local day, only ISO strings read as dates; 2 reviews APPROVED (claude), round-1 minors fixed; full suite 10961 passed, build OK — 9cf4b6d85
- 2026-11-04 09:52 — 06 — start — launched by /relay-lite:run (parallel with 08, 11) — c0288e9b9
- 2026-11-04 09:57 — 11 — deliver — merged as 8fe42637: New/Rename type and event type use Rust type casing, metadata keyed by normalized name; 2 reviews APPROVED (claude), minor (case-only duplicate definitions split path index vs metadata) left as possible follow-up; full suite 10970 passed, build OK — 8fe426371
- 2026-11-04 09:57 — 17 — start — launched by /relay-lite:run (parallel with 06, 08) — 42ef305d3
- 2026-11-04 10:56 — 06 — start — launched by /relay-lite:run (retry after the forked session died) — 60f81ec63
- 2026-11-04 11:01 — 08 — start — launched by /relay-lite:run (parallel with 06; retry after the forked session died) — 26b67a0c1
- 2026-11-04 11:01 — 17 — start — launched by /relay-lite:run (parallel with 06; retry after the forked session died) — 26b67a0c1
- 2026-11-04 11:12 — 06 — deliver — merged as fcf78e578: filters that do not parse report an error in the editor, inline block and view lens; unknown view type rejected; formula confirm gated; 2 reviews APPROVED (claude), finding 3 fixed (ViewType), 1/2/4/5 recorded in review.md; full suite 11042 passed, build OK (resumed after a Stop) — fcf78e578
