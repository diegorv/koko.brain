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
| 07 | [Meta-bind writes typed values, reads alias keys, works in table cells, and has accessible names](issues/07-meta-bind-typed-writes-and-alias-reads.md) | none | done | issue/07-meta-bind-typed-writes-and-alias-reads (575b84f2f) | 2026-11-04 |
| 08 | [The note action bar treats a missing `_organized` as organized, like the index](issues/08-organized-default-matches-the-index.md) | none | done | issue/08-organized-default-matches-the-index (c4c8257c7) | 2026-11-04 |
| 09 | [A broken settings.json is backed up and reported, not silently replaced by defaults](issues/09-settings-json-parse-failure-keeps-a-backup.md) | none | done | issue/09-settings-json-parse-failure-keeps-a-backup (09ec9f36) | 2026-11-04 |
| 10 | [A broken or loading `.view` says so in the note list and the navigator](issues/10-view-lens-error-and-loading-states.md) | 01, 06 | done | issue/10-view-lens-error-and-loading-states (8d36b6a98) | 2026-11-04 |
| 11 | [A type name typed in lowercase is normalized, so it never splits into two rows](issues/11-type-names-are-normalized.md) | none | done | issue/11-type-names-are-normalized (8fe42637) | 2026-11-04 |
| 12 | [Type definitions and `.view` files stay out of note lenses (except Favorites) and out of `kb.pages()`](issues/12-definitions-and-views-stay-out-of-lenses.md) | 01, 10 | done | issue/12-definitions-and-views-stay-out-of-lenses (8e2cb8608) | 2026-11-04 |
| 13 | [A `.view` lists the same rows, in the same order, in the editor and in the rail](issues/13-one-row-set-for-a-view.md) | 01, 10, 12 | done | issue/13-one-row-set-for-a-view (59a007f84) | 2026-11-04 |
| 14 | [Note rows show the relative modified time, matching the list order](issues/14-note-rows-show-relative-modified-time.md) | 12, 13 | done | issue/14-note-rows-show-relative-modified-time (0aa0cfab) | 2026-11-04 |
| 15 | [`kb.pages()` leaves out `.view` files, type definitions and system-folder notes](issues/15-kb-pages-excludes-views-and-system-notes.md) | none | done | merged into 12 (8e2cb8608) | 2026-11-04 |
| 16 | [Explicit organization makes new notes start in the Inbox](issues/16-explicit-organization-marks-new-notes.md) | 08 | done | issue/16-explicit-organization-marks-new-notes (0522d4afb) | 2026-11-04 |
| 17 | [New view asks for a name and creates the view under that name](issues/17-new-view-asks-for-a-name.md) | none | done | issue/17-new-view-asks-for-a-name (9ebd677e8) | 2026-11-04 |
| 18 | [The New view dialog takes filters](issues/18-new-view-dialog-takes-filters.md) | 17 | done | issue/18-new-view-dialog-takes-filters (24562d75) | 2026-11-04 |
| 19 | [Edit view from the view row's menu](issues/19-edit-view-from-the-row-menu.md) | 02, 04, 17, 18 | done | issue/19-edit-view-from-the-row-menu (e76c665fc) | 2026-11-04 |
| 20 | [The Views section has groups, hidden views and Move to Trash](issues/20-views-section-structure.md) | 10, 13, 17, 19 | done | issue/20-views-section-structure (9d1c8d927) | 2026-11-04 |
| 21 | [`_rail: true` pins a view or a type to the rail](issues/21-pin-views-and-types-to-the-rail.md) | 02, 10, 12, 20 | done | issue/21-pin-views-and-types-to-the-rail (2c6284f7) | 2026-11-04 |
| 22 | [`.view` is the menu format: `_rail_view`, Convert to view, New view in folders](issues/22-view-is-the-menu-format.md) | 10, 13, 17, 18, 20, 21 | done | issue/22-view-is-the-menu-format (e4b936b1) | 2026-11-04 |
| 23 | [The command palette reaches every rail item and view; a rail click shows hidden panels](issues/23-palette-reaches-every-rail-item.md) | 20, 21 | done | issue/23-palette-reaches-every-rail-item (8baa7113) | 2026-11-04 |
| 24 | [Settings > Rail: hide and reorder built-in items, Inbox badge switch](issues/24-settings-rail-page.md) | 21, 23 | done | issue/24-settings-rail-page (1c531ca4) | 2026-11-04 |
| 25 | [Meta-bind controls work in table cells, show a stored value outside the options, follow any wikilink, and have accessible names](issues/25-meta-bind-table-cells-select-links-and-labels.md) | none | done | merged into 07 (575b84f2f) | 2026-11-04 |
| 26 | [Docs, help pages and examples match everything this delivery shipped](issues/26-docs-and-help-match-the-delivery.md) | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24 | done | issue/26-docs-and-help-match-the-delivery (73cc180a5) | 2026-11-04 |
| 27 | [Two definitions of one type name resolve to the same file everywhere](issues/27-duplicate-type-definitions-pick-one-file.md) | none | done | issue/27-duplicate-type-definitions-pick-one-file (bc72cb47c) | 2026-11-04 |
| 28 | [A rail click on a pinned `_open_in_editor` view goes through `selectRailItem`, so the rule lives in one place](issues/28-one-owner-for-the-pinned-open-in-editor-rule.md) | 23 | done | issue/28-one-owner-for-the-pinned-open-in-editor-rule (5a17d7a5f) | 2026-11-04 |

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
- 2026-11-04 11:14 — 10 — start — launched by /relay-lite:run (parallel with 08, 17) — 7f0f6ff28
- 2026-11-04 11:20 — 08 — deliver — merged as c4c8257c7: action bar reads a missing _organized as organized; Rust doc comment fixed, bindings unchanged; review APPROVED (claude), 2 minors closed by running E2E (9 passed) and cargo test (1273 passed); full suite 11063 passed after rebase — c4c8257c7
- 2026-11-04 11:20 — 16 — start — launched by /relay-lite:run (parallel with 10, 17) — 475029066
- 2026-11-04 11:24 — 17 — deliver — merged as 9ebd677e8: New view opens a name dialog and creates <name>.view; 2 reviews APPROVED (claude), fix round on dialog close/saving guards; full suite 11111 passed after 2 rebases; NoteActionBar delete-to-trash test flaked once (unrelated, passes alone) — 9ebd677e8
- 2026-11-04 11:26 — 18 — start — launched by /relay-lite:run (parallel with 10, 16) — 61dd149c1
- 2026-11-04 11:26 — 18 — stopped — main checkout not clean at build start (CLAUDE.md, docs/DEV-ENVIRONMENT.md edits, since committed as a85efa004); no worktree created — a85efa004
- 2026-11-04 11:26 — 18 — start — launched by /relay-lite:run (relaunch after the dirty-checkout stop; parallel with 10, 16) — 57f641f6a
- 2026-11-04 11:36 — 10 — deliver — blocked: deliver sync rebase conflict in src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts; 2 reviews APPROVED (claude); full suite 11065 passed pre-sync; worktree kept — 724d87004
- 2026-11-04 11:38 — 10 — deliver — main session finished the deliver: rebased by hand onto main (import-only conflict with Issue 17 in type-sidebar.logic.test.ts, both sides kept; range-diff shows no logic change from the reviewed branch), full gate pnpm check 0 errors, 11134 passed, build OK; merged as 8d36b6a98 — 8d36b6a98
- 2026-11-04 11:39 — 12 — start — launched by /relay-lite:run (parallel with 16, 18) — 555275133
- 2026-11-04 11:45 — 18 — deliver — merged as 24562d75: the New view dialog takes filters; 2 reviews APPROVED (claude), 2 nits fixed (shared isUnaryOperator, alert placement); full suite 11174 passed after rebase; E2E not run by the deliver — 24562d756
- 2026-11-04 11:45 — 19 — start — launched by /relay-lite:run (parallel with 12, 16) — 781fd9b12
- 2026-11-04 11:48 — 16 — deliver — merged as 0522d4afb: Explicit organization marks new notes _organized: false on every non-periodic creation path; 2 reviews APPROVED (claude), minor fixed (kokobrain://new marks Markdown targets only); full suite 11229 passed after rebase — 0522d4afb
- 2026-11-04 11:54 — 12 — deliver — merged as 8e2cb8608: type definitions and .view files stay out of note lenses (except Favorites), calendar dots, Untyped and kb.pages() (Issue 15 folded in); review APPROVED (claude), 2 nits declined; full suite 11251 passed after rebase — 8e2cb8608
- 2026-11-04 11:54 — 13 — start — launched by /relay-lite:run (parallel with 19) — f8e15cd15
- 2026-11-04 11:55 — 15 — merged — delivered inside Issue 12 as 8e2cb8608; row and Issue file moved from wontfix (parking state) to done/resolved by hand, the CLI has no wontfix -> done transition — 8e2cb8608
- 2026-11-04 12:05 — 19 — deliver — merged as e76c665fc: Edit view in the view row menu, same dialog prefilled; 2 reviews APPROVED (claude), fix round (invalid prefilled name shown at once, missing _sidebar_label written at the top); full suite 11296 passed after rebase — e76c665fc
- 2026-11-04 12:05 — 07 — start — launched by /relay-lite:run (parallel with 13; carries Issue 25) — 539e09d24
- 2026-11-04 12:18 — 13 — deliver — merged as 59a007f84: one row set for a .view in the editor and the rail; 2 reviews APPROVED (claude), fix round added unknown _sort note and default order; full suite 11325 passed after rebase — 59a007f84
- 2026-11-04 12:18 — 14 — start — launched by /relay-lite:run (parallel with 07 and 20) — 5e6430d94
- 2026-11-04 12:18 — 20 — start — launched by /relay-lite:run (parallel with 07 and 14) — 5e6430d94
- 2026-11-04 12:21 — 20 — deliver — blocked at build: Move to Trash via deleteNoteWithConfirm (features/note-action-bar) would add rail-shell -> note-action-bar, closing a feature cycle with the existing note-action-bar -> rail-shell edge; feature-cycle.test.ts forbids it; owner must pick the fix — 42beeeaad
- 2026-11-04 12:22 — 20 — start — launched by /relay-lite:run (rebuild with the core/ prefactor; parallel with 07, 14) — b9f7ad797
- 2026-11-04 12:30 — 07 — deliver — merged as 575b84f2f: meta-bind typed writes, alias reads, table-cell widgets, out-of-options select, button open via wikilinks, accessible names (Issue 25 folded in); 2 reviews APPROVED (claude), fix kept integers beyond 2^53; full suite 11408 passed after rebase; E2E not run by the deliver — 575b84f2f
- 2026-11-04 12:30 — 25 — merged — delivered inside Issue 07 as 575b84f2f; row and Issue file moved from wontfix (parking state) to done/resolved by hand, the CLI has no wontfix -> done transition — 575b84f2f
- 2026-11-04 12:32 — 14 — deliver — merged as 0aa0cfab: note row subtitles show the relative modified time; dead NoteRow footer removed; 2 reviews APPROVED (claude), fix dropped the unread createdAt; full suite 11415 passed after rebase — 0aa0cfaba
- 2026-11-04 12:38 — 20 — deliver — blocked: deliver merge refused 3 times, main checkout had an uncommitted AppShell.svelte change (pane minSize, not from this run); review APPROVED (claude), full suite 11452 passed after rebase; branch and worktree kept — 8451a11a6
- 2026-11-04 12:41 — 20 — deliver — main session finished the deliver after the owner committed and pushed the AppShell change (a07b00354): clean rebase onto main, full gate pnpm check 0 errors, 11452 passed, build OK; merged as 9d1c8d927 — 9d1c8d927
- 2026-11-04 12:41 — 21 — start — launched by /relay-lite:run — 0154f0409
- 2026-11-04 13:09 — 21 — deliver — merged as 2c6284f7: _rail: true pins a view or type to the rail, Pin/Unpin in row menus; round 1 CHANGES_REQUESTED (feature cycle, missing toast, pin on unparseable .view), fixed, round 2 APPROVED (claude); full suite 11517 passed — 2c6284f76
- 2026-11-04 13:09 — 22 — start — launched by /relay-lite:run (parallel with 23) — 388435e3d
- 2026-11-04 13:09 — 23 — start — launched by /relay-lite:run (parallel with 22) — 388435e3d
- 2026-11-04 13:30 — 23 — deliver — merged as 8baa7113: palette Go to and Open view commands, Cmd+1/2 as commands, rail click shows hidden panels; 2 reviews APPROVED (claude), help nit fixed, duplicated _open_in_editor pin rule deferred to Issue 28; full suite 11555 passed after rebase — 8baa71135
- 2026-11-04 13:30 — ledger updated (added 27, 28)
- 2026-11-04 13:30 — 24 — start — launched by /relay-lite:run (parallel with 22) — 628726a5e
- 2026-11-04 13:42 — 22 — deliver — merged as e4b936b1: _rail_view picks the rail's view, Convert to view, New view in folders, Edit view follows _rail_view; round 1 CHANGES_REQUESTED (blocker: Edit view label colliding with another view's name moved the rail), fixed, rounds 2-3 APPROVED (claude); full suite 11606 passed after rebase; E2E not run — e4b936b1a
- 2026-11-04 13:48 — 24 — deliver — merged as 1c531ca4: Settings > Rail hides and reorders built-in items, rail Inbox badge switch; 2 reviews APPROVED (claude), fix drops the divider when every navigator item is hidden; full suite 11638 passed after rebase — 1c531ca43
- 2026-11-04 14:45 — 28 — start — launched by /relay-lite:run — 9e628229a
- 2026-11-04 14:57 — 28 — deliver — Round 1 APPROVED, round 2 APPROVED, no findings; fix round tightened AppShell.test.ts to toHaveBeenCalledExactlyOnceWith(BOARD); sync clean; squash-merged and pushed — 5a17d7a5f
- 2026-11-04 15:14 — 26 — start — launched by /relay-lite:run — e73b90fa5
- 2026-11-04 15:57 — 26 — deliver — Round 1 APPROVED, round 2 APPROVED, no findings; fix round df7b718b4 (Inbox can be hidden, unapplied type-definition keys marked, one sidebar name); sync clean; squash-merged and pushed — 73cc180a5
- 2026-11-04 15:58 — 27 — start — launched by /relay-lite:run — 88b19302b
- 2026-11-04 16:09 — 27 — deliver — Round 1 APPROVED, no findings; first definition in path order wins in both indexes; sync clean; squash-merged and pushed — bc72cb47c
