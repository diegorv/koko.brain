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
| 03 | [Every `.view` write goes through one tab-aware, serialized writer](issues/03-one-tab-aware-view-writer.md) | none | done | issue/03-one-tab-aware-view-writer (3df680423) | 2026-11-05 |
| 04 | [A rail toolbar edit writes only its key and refuses a conflict](issues/04-rail-toolbar-writes-one-key.md) | 03 | done | issue/04-rail-toolbar-writes-one-key (a8745ea75) | 2026-11-05 |
| 05 | [The collection editor's toolbar writes only its key](issues/05-editor-toolbar-writes-one-key.md) | 04 | done | issue/05-editor-toolbar-writes-one-key (da3082ce2) | 2026-11-05 |
| 06 | [A watcher batch with `.md` and `.view` updates both](issues/06-watcher-mixed-batch.md) | none | done | main (fbeb22e92) | 2026-11-05 |
| 08 | [The `_rail_view` mark is validated against the file](issues/08-rail-view-mark-from-file.md) | none | done | main (f9de1011f) | 2026-11-05 |
| 11 | [A restored table does not show a false "0 results"](issues/11-no-false-zero-results.md) | none | done | main (300f97937) | 2026-11-05 |
| 12 | [`.view` leaves the FTS5 and semantic tables](issues/12-view-leaves-search-tables.md) | none | done | issue/12-view-leaves-search-tables (41815cfd6) | 2026-11-05 |
| 14 | [A view's index entry carries only its YAML keys](issues/14-view-entry-only-yaml-keys.md) | none | done | issue/14-view-entry-only-yaml-keys (7c00efcbc) | 2026-11-05 |
| 15 | [A view is never a link target](issues/15-view-never-link-target.md) | 14, 16 | done | issue/15-view-never-link-target (3eb8f454a) | 2026-11-05 |
| 16 | [A meta-bind button can open a view](issues/16-meta-bind-open-view-action.md) | none | done | issue/16-meta-bind-open-view-action (807a50bff) | 2026-11-05 |
| 17 | [Suggestions, graph, people rows and Favorites drop views](issues/17-readers-drop-views.md) | none | done | main (3c7f1b9a8) | 2026-11-05 |
| 19 | [A filter citing `archived` takes control in a view](issues/19-filter-citing-archived.md) | none | done | issue/19-filter-citing-archived (262a62b6f) | 2026-11-05 |
| 20 | [Inline `collection` blocks follow the row rule](issues/20-inline-block-row-rule.md) | 19 | done | issue/20-inline-block-row-rule (f557913be) | 2026-11-05 |
| 22 | [New table, and Show in Views](issues/22-new-table-and-show-in-views.md) | 03, 12, 14, 15, 20 | done | issue/22-new-table-and-show-in-views (3635c8ef4) | 2026-11-05 |
| 23 | [Retire `.collection` files](issues/23-retire-collection-files.md) | 22 | done | issue/23-retire-collection-files (7b71c217f) | 2026-11-05 |
| 24 | [Low-severity view bugs and stale docs from the review](issues/24-view-low-findings.md) | 23 | done | issue/24-view-low-findings (cf6fe6ef3) | 2026-11-05 |
| 25 | [A case-only rename is refused on a case-insensitive volume](issues/25-case-only-rename.md) | none | todo | | |
| 26 | [The rail does not show a false empty list before the entries land](issues/26-rail-no-false-empty-list.md) | none | done | main (812a6a975) | 2026-11-05 |
| 27 | [A rename does not recompute an open tab's file type](issues/27-rename-recomputes-tab-file-type.md) | none | todo | | |

## Log

- 2026-11-05 16:44 — ledger created (17 Issues)
- 2026-11-05 17:16 — 06 — deliver — done by hand in the owner's session on main, not through relay; opus review, no fix for this Issue beyond a corrected comment; manual check in the app still the owner's — fbeb22e92
- 2026-11-05 17:16 — 17 — deliver — done by hand in the owner's session on main, not through relay; opus review, one doc comment corrected; dropped from 22's Blocked by — 3c7f1b9a8
- 2026-11-05 17:16 — 11 — deliver — done by hand in the owner's session on main, not through relay; reproduced, then opus review found a false "0 results" after a vault switch, reproduced and fixed — 300f97937
- 2026-11-05 17:30 — ledger updated (added 26)
- 2026-11-05 17:54 — 08 — deliver — done by hand in the owner's session on main, not through relay; opus review found an unquoted [[Board]] left with no mark, reproduced and fixed; manual check in the app still the owner's — f9de1011f
- 2026-11-05 17:54 — 26 — deliver — done by hand in the owner's session on main, not through relay; navigator 0 reproduced; opus review found a leftover refresh still counted as entries landing and a header 0 beside Loading, both reproduced and fixed; manual check in the app still the owner's — 812a6a975
- 2026-11-05 17:59 — 03 — start — launched by /relay-lite:run — a548ae21e
- 2026-11-05 18:02 — 12 — start — launched by /relay-lite:run — 7ec7d2c3b
- 2026-11-05 18:23 — 12 — deliver — merged; review round 1 APPROVED (claude), one nit rejected with no code change; vitest 12769 passed, build ok, cargo 1298 passed; manual in-app rename-then-search check not run — 41815cfd6
- 2026-11-05 18:23 — 14 — start — launched by /relay-lite:run — 06526d580
- 2026-11-05 18:48 — 03 — deliver — blocked before merge: after rebase onto main the full suite failed twice on IconPicker.test.ts 'highlights the current icon saved as trash2' (5000ms timeout, passes alone 8/8); reviews APPROVED x2; worktree and branch kept, rebased — 1aee2d302
- 2026-11-05 18:58 — 14 — deliver — merged; review round 1 APPROVED (claude), two nits rejected with no code change; full suite failed once on IconPicker.test.ts timeouts, green on rerun; build ok; cargo 1306 passed, bindings unchanged — 7c00efcbc
- 2026-11-05 19:04 — 03 — deliver — merged by the main session after the IconPicker timeout fix (d500bcf64): deliver sync rebased clean, full gate green in the worktree (check 0 errors, vitest 12793 passed, build ok), deliver merge; reviews APPROVED x2 (claude) — 3df680423
- 2026-11-05 19:04 — 19 — start — launched by /relay-lite:run — 251c143af
- 2026-11-05 19:04 — 16 — start — launched by /relay-lite:run — 251c143af
- 2026-11-05 19:27 — 19 — deliver — merged; review round 1 APPROVED with one nit, fixed (formula.archived no longer counts as a citation); round 2 APPROVED, no findings (claude); vitest 12821 passed, build ok — 262a62b6f
- 2026-11-05 19:34 — 16 — deliver — merged; review round 1 APPROVED, findings fixed (example vault section, hidden-view test, toast text, case-sensitivity doc); round 2 APPROVED with one nit not applied (English bullets in the Portuguese example file) (claude); vitest 12849 passed after rebase, build ok — 807a50bff
- 2026-11-05 20:03 — 04 — start — launched by /relay-lite:run — fc17c8142
- 2026-11-05 20:03 — 15 — start — launched by /relay-lite:run — fc17c8142
- 2026-11-05 20:27 — 04 — deliver — merged; review round 1 APPROVED (claude), two nits rejected with no code change; vitest 12861 passed, build ok; E2E not run (frontend-only gate) — a8745ea75
- 2026-11-05 20:27 — 20 — start — launched by /relay-lite:run — f98004f5d
- 2026-11-05 20:35 — 15 — deliver — merged; review round 1 APPROVED with one minor deferred (QueryJS file.inlinks basename matching) and two nits fixed; round 2 APPROVED (claude); vitest 12880 passed after rebase, build ok, cargo green before rebase (no Rust change came in) — 3eb8f454a
- 2026-11-05 20:36 — 05 — start — launched by /relay-lite:run — 2b6d22d33
- 2026-11-05 20:52 — 20 — deliver — merged; review round 1 APPROVED with two test findings fixed (boot.test port case, help samples non-empty check); round 2 APPROVED, no findings (claude); E2E specs 16 passed in review; vitest 12894 passed after rebase, build ok — f557913be
- 2026-11-05 20:52 — 22 — start — launched by /relay-lite:run — 04ab2117a
- 2026-11-05 21:18 — 05 — deliver — merged; review round 1 APPROVED with 3 findings (formula add/remove now writes synced viewOrder, comment added, one accepted as is); round 2 APPROVED with one nit left (stale order entry after cancelling a formula edit) (claude); vitest 12922 passed after rebase, build ok — da3082ce2
- 2026-11-05 21:32 — 22 — deliver — merged; review round 1 APPROVED with one nit fixed (e2e mock getBacklinks skips views); round 2 APPROVED (claude); vitest 12933 passed after rebase, build ok; E2E view specs 32 passed in review (New here cases excluded, pre-existing); full cargo test not run by the workflow — 3635c8ef4
- 2026-11-05 21:33 — 23 — start — launched by /relay-lite:run — e49539a9a
- 2026-11-05 22:01 — 23 — deliver — merged; review round 1 APPROVED (claude) with one minor finding filed as Issue 27 (needs-triage); vitest 12930 passed, build ok; E2E not run by the workflow — 7b71c217f
- 2026-11-05 22:03 — ledger updated (added 27)
- 2026-11-05 22:03 — 24 — start — launched by /relay-lite:run — fad577415
- 2026-11-05 22:48 — 24 — deliver — merged; review round 1 APPROVED with findings, 3 fixed (week-start row only on calendar, _order position rule, non-mapping .view guards), 2 left (toast on refused rename, inlinks over buildResolutionCache); round 2 APPROVED (claude); vitest 12950 passed after rebase, build ok; no src-tauri change — cf6fe6ef3
