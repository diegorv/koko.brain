# Ledger: ui-responsiveness

This file is the source of truth for the progress of the ui-responsiveness Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run ui-responsiveness
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
| 01 | [Vault open no longer runs the full task scan and builds the tag tree in linear time](issues/01-startup-skip-task-scan-and-linear-tag-tree.md) | none | done | issue/01-startup-skip-task-scan-and-linear-tag-tree (25c5f2b9) | 2026-11-02 |
| 02 | [`get_tasks_in_section_v2` reads only notes with tasks, off the main thread](issues/02-tasks-in-section-prefilter-and-async.md) | none | done | issue/02-tasks-in-section-prefilter-and-async (839fc0b9) | 2026-11-02 |
| 03 | [The file tree stops paying deep-proxy walks: raw state, modify-only watcher skip, memoized link resolution](issues/03-file-tree-raw-state-watcher-skip-link-memo.md) | none | done | issue/03-file-tree-raw-state-watcher-skip-link-memo (a81bbcb9) | 2026-11-02 |
| 04 | [Opening a collection table applies its filters before the first render and caps the rows drawn](issues/04-collection-mount-seed-and-row-cap.md) | none | done | issue/04-collection-mount-seed-and-row-cap (94f9833e) | 2026-11-02 |
| 05 | [Instrumentation sees native main-thread stalls, IPC queue wait and Rust-side times](issues/05-native-main-thread-heartbeat-and-log-fidelity.md) | none | in-progress | | |
| 06 | [`scan_vault` leaves the main thread, and the watcher ignores `write_atomic` temp files](issues/06-scan-vault-async-and-watcher-temp-paths.md) | none | todo | | |
| 07 | [The embedder unloads after an idle open, reports its CPU cost, and reuses vectors whose text did not change](issues/07-embedder-idle-unload-rusage-and-vector-reuse.md) | none | todo | | |
| 08 | [queryjs never shows another note's result, and drops its charts when results are cleared](issues/08-queryjs-result-cache-correctness.md) | 05 | todo | | |
| 09 | [App-initiated create, rename, move and restore update the tree without a whole-vault scan](issues/09-targeted-tree-update-for-app-changes.md) | 03, 06 | todo | | |
| 10 | [Entries-bound panels stop re-running on every file-tree replacement](issues/10-narrow-file-tree-dependencies.md) | 03 | done | issue/10-narrow-file-tree-dependencies (1d5d1cca) | 2026-11-02 |
| 11 | [UI-path sync commands stop waiting on the semantic DB mutex on the main thread](issues/11-semantic-sync-commands-on-db-mutex.md) | 05 | todo | | |
| 12 | [Under `first-open`, every queryjs block in a note auto-runs on its first open, not only the first block](issues/12-queryjs-first-open-multiple-blocks.md) | 08 | todo | | |
| 13 | [queryjs blocks share one page set per index version](issues/13-queryjs-shared-page-memo.md) | 05, 08 | todo | | |
| 14 | [Each collection file gets its own `CollectionView` instance](issues/14-collection-view-remount-per-file.md) | 04 | todo | | |
| 15 | [Find why a freshly opened tab lands scrolled down and draws a second viewport](issues/15-fresh-tabs-open-scrolled-down.md) | 03 | todo | | |
| 16 | [`![[foo.png]]` resolves to the file it names, not to `foo.md`](issues/16-embed-resolution-ignores-extension.md) | 03 | todo | | |

## Log

- 2026-11-02 21:06 — ledger created (16 Issues)
- 2026-11-02 21:07 — 01 — start — launched by /relay-lite:run — 97606820
- 2026-11-02 21:19 — 01 — deliver — merged as perf: skip task scan on vault open, linear tag tree build; review round 1 APPROVED (claude) with 3 nits (1 fixed in notes, 1 deferred to Issue 02, 1 no change); full suite 438 files / 10111 tests passed + build ok after rebase; on-device timing check left for the owner — 25c5f2b9
- 2026-11-02 21:20 — 03 — start — launched by /relay-lite:run — 247ce773
- 2026-11-02 21:35 — 03 — deliver — merged as perf: raw file tree, modify-only watcher skip, memoized links; round 1 APPROVED (claude) with 3 nits (2 fixed in 1c5a4961, uncapped exists IPC left for owner), round 2 APPROVED (claude) no findings; full suite 439 files / 10131 tests passed + build ok; on-device docReplace <15 ms check left for the owner — a81bbcb9
- 2026-11-02 21:44 — 02 — start — launched by /relay-lite:run — ef10f566
- 2026-11-02 21:46 — 04 — start — launched by /relay-lite:run — 7e13ac48
- 2026-11-02 22:00 — 04 — deliver — merged as perf: seed collection filters before render, cap table rows; round 1 APPROVED (claude) with findings (mount-count test hardened, {#key activeViewIndex} resets the cap per tab; 200-row cap and copy left for owner), round 2 APPROVED (claude) with 1 nit (key merge with Issue 14); full suite 440 files / 10139 tests passed + build ok; on-device [HB] stall check left for the owner — 94f9833e
- 2026-11-02 22:04 — 02 — deliver — merged as perf: section scan reads only notes with tasks, off main; round 1 APPROVED (claude) with 4 findings (2 fixed with tests: resetTasks stale-result drop, error() only for latest call; 1 no change; 1 rejected), round 2 APPROVED (claude) no findings; two rebases, full suite 440 files / 10143 tests passed + build ok, cargo test 1223 passed; K on the real vault left for the owner — 839fc0b9
- 2026-11-02 22:04 — 05 — start — launched by /relay-lite:run — d5c4464a
- 2026-11-02 22:04 — 10 — start — launched by /relay-lite:run — d5c4464a
- 2026-11-02 22:24 — 10 — deliver — merged as perf: entries-bound panels stop re-running on file-tree swaps; round 1 APPROVED (claude) with 2 nits (JSDoc fixed, optional test hardening not applied), round 2 APPROVED (claude) no findings; two rebases, full suite 442 files / 10158 tests passed + build ok; workflow reported sha 8458806e (a concurrent live-preview-audit commit), real squash is 1d5d1cca — 1d5d1cca
