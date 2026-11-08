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
| 05 | [Instrumentation sees native main-thread stalls, IPC queue wait and Rust-side times](issues/05-native-main-thread-heartbeat-and-log-fidelity.md) | none | done | issue/05-native-main-thread-heartbeat-and-log-fidelity (7468176d) | 2026-11-02 |
| 06 | [`scan_vault` leaves the main thread, and the watcher ignores `write_atomic` temp files](issues/06-scan-vault-async-and-watcher-temp-paths.md) | none | done | issue/06-scan-vault-async-and-watcher-temp-paths (f5f5836a) | 2026-11-02 |
| 07 | [The embedder unloads after an idle open, reports its CPU cost, and reuses vectors whose text did not change](issues/07-embedder-idle-unload-rusage-and-vector-reuse.md) | none | done | issue/07-embedder-idle-unload-rusage-and-vector-reuse (0fc25147) | 2026-11-02 |
| 08 | [queryjs never shows another note's result, and drops its charts when results are cleared](issues/08-queryjs-result-cache-correctness.md) | 05 | done | issue/08-queryjs-result-cache-correctness (73e583c8) | 2026-11-03 |
| 09 | [App-initiated create, rename, move and restore update the tree without a whole-vault scan](issues/09-targeted-tree-update-for-app-changes.md) | 03, 06 | done | issue/09-targeted-tree-update-for-app-changes (f618f44c) | 2026-11-03 |
| 10 | [Entries-bound panels stop re-running on every file-tree replacement](issues/10-narrow-file-tree-dependencies.md) | 03 | done | issue/10-narrow-file-tree-dependencies (1d5d1cca) | 2026-11-02 |
| 11 | [UI-path sync commands stop waiting on the semantic DB mutex on the main thread](issues/11-semantic-sync-commands-on-db-mutex.md) | 05 | done | issue/11-semantic-sync-commands-on-db-mutex (d365e681) | 2026-11-03 |
| 12 | [Under `first-open`, every queryjs block in a note auto-runs on its first open, not only the first block](issues/12-queryjs-first-open-multiple-blocks.md) | 08 | done | issue/12-queryjs-first-open-multiple-blocks (bbd17a64) | 2026-11-03 |
| 13 | [queryjs blocks share one page set per index version](issues/13-queryjs-shared-page-memo.md) | 05, 08 | done | issue/13-queryjs-shared-page-memo (4cf7f4d4) | 2026-11-03 |
| 14 | [Each collection file gets its own `CollectionView` instance](issues/14-collection-view-remount-per-file.md) | 04 | done | issue/14-collection-view-remount-per-file (5b149f3c) | 2026-11-03 |
| 15 | [Log the tab-switch scroll path so the fresh-tab scroll-down can be diagnosed](issues/15-fresh-tabs-open-scrolled-down.md) | 03 | done | issue/15-fresh-tabs-open-scrolled-down (05ef25ba) | 2026-11-03 |
| 16 | [`![[foo.png]]` resolves to the file it names, not to `foo.md`](issues/16-embed-resolution-ignores-extension.md) | 03 | done | issue/16-embed-resolution-ignores-extension (ad73136b) | 2026-11-03 |
| 17 | [A path-style wikilink target resolves to its exact vault-relative path first](issues/17-path-style-target-exact-vault-path.md) | 16 | done | issue/17-path-style-target-exact-vault-path (b5e7bb61) | 2026-11-03 |
| 18 | [Rust `VaultIndex` resolves a target with an extension to the file it names](issues/18-vault-index-exact-first-resolution.md) | 16, 17 | done | issue/18-vault-index-exact-first-resolution (7e7b5b02) | 2026-11-03 |
| 19 | [A test pins that a failed queryjs run still on screen keeps its charts](issues/19-queryjs-failed-run-keeps-attached-charts.md) | 12 | done | issue/19-queryjs-failed-run-keeps-attached-charts (90bcec09) | 2026-11-03 |
| 20 | [Every TS wikilink resolver caller passes the vault root](issues/20-wikilink-callers-pass-vault-root.md) | 17 | done | issue/20-wikilink-callers-pass-vault-root (652380c5) | 2026-11-03 |
| 21 | [A tab switch does not scroll to the previous tab's position before restoring its own](issues/21-tab-switch-focus-restores-old-scroll.md) | none | done | issue/21-tab-switch-focus-restores-old-scroll (deba6537) | 2026-11-03 |
| 22 | [Drop the frame-1 scroll restore on a tab switch if the logs show it never moves the scroll](issues/22-tab-switch-drop-frame-1-scroll-restore.md) | none | todo | | |
| 23 | [A tag-only search filters on the index tags instead of reading every note](issues/23-tag-only-search-reads-whole-vault.md) | none | done | issue/23-tag-only-search-reads-whole-vault (7c1908e4) | 2026-11-03 |
| 24 | [Semantic and hybrid search log the time of each stage](issues/24-semantic-hybrid-stage-timing-logs.md) | none | done | issue/24-semantic-hybrid-stage-timing-logs (a7511e8a) | 2026-11-03 |
| 25 | [A text search no longer blocks the app main thread while FTS runs](issues/25-search-fts-off-main-thread.md) | none | done | issue/25-search-fts-off-main-thread (357d8989) | 2026-11-03 |
| 26 | [The first semantic or hybrid search after an index update reloads the whole search cache](issues/26-search-cache-reload-after-index-update.md) | none | wontfix | | |

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
- 2026-11-02 22:29 — 14 — start — launched by /relay-lite:run — 8811a97f
- 2026-11-02 22:34 — 05 — deliver — blocked: deliver sync rebase onto origin/main conflicts in src/lib/core/filesystem/fs.service.ts; rebase aborted, branch unchanged, worktree kept; both review rounds APPROVED (claude), suite and cargo test green before sync — cae77fac
- 2026-11-02 22:40 — 05 — deliver — main session finished the deliver: hand-rebased onto main resolving the fs.service.ts conflict with Issue 10 (kept 05's timers, dropped attachFileCounts, label now loadDirectoryTree: order); opus adversarial review of the resolution APPROVED; pnpm check 0 errors, full suite 443 files / 10188 tests passed + build ok, cargo test 1229 passed; deliver sync + merge — 7468176d
- 2026-11-02 22:40 — 14 — deliver — blocked: re-review still CHANGES_REQUESTED after 1 fix round; open blocker is an owner decision (accept that returning to or renaming/moving a collection resets it to view 0 and closes popovers, or ask for per-file view-index memory); worktree kept — adcd5921
- 2026-11-02 22:40 — 06 — start — launched by /relay-lite:run — 642b6720
- 2026-11-02 22:40 — 16 — start — launched by /relay-lite:run — 642b6720
- 2026-11-02 22:42 — 16 — deliver — blocked: build refused, first criterion is an owner decision on the rule: (A) exact match first, keep the extension-stripped fallback, or (B) exact match only for targets with an extension (needs a rule for dotted names like [[v1.2]]); build recommends A — f69d7310
- 2026-11-02 23:03 — 06 — deliver — merged as fix: scan_vault off main thread, watcher skips atomic temps; round 1 APPROVED (claude) with 3 findings (ADR 0031 amendment + CLAUDE.md watcher note fixed, 2 no change), round 2 APPROVED (claude) no findings; full suite 444 files / 10195 tests passed + build ok after rebase, cargo test 1234 passed; on-device [MAIN-HB] note-create check left for the owner — f5f5836a
- 2026-11-02 23:03 — 07 — start — launched by /relay-lite:run — bdc3c432
- 2026-11-02 23:29 — 07 — deliver — merged as perf: embedder idle unload, CPU usage report, vector reuse; round 1 APPROVED (claude) with 4 findings all fixed (reuse vector read matches content hash, sampler starts once, CPU-time test bound, finish() reads memory once and skips when debug off), round 2 APPROVED (claude) no findings; after rebase full suite 445 files / 10228 tests passed + build ok + cargo test 0 failed; model memory share not measured — 0fc25147
- 2026-11-02 23:29 — 09 — start — launched by /relay-lite:run — ce5714e4
- 2026-11-03 00:07 — 09 — deliver — merged as perf: update the tree in place for app changes, no vault scan; round 1 APPROVED (claude) with 2 findings both fixed with failing-first tests (hidden dot-paths stay out of the tree, addToTree during an in-flight load restarts the load), round 2 APPROVED (claude) no findings; full suite 448 files / 10282 tests passed + build ok, cargo test 1249 passed; sync clean — f618f44c
- 2026-11-03 00:07 — 11 — start — launched by /relay-lite:run — fb0a5191
- 2026-11-03 00:24 — 11 — deliver — merged as perf: run semantic DB commands off the main thread; round 1 APPROVED (claude), nit fixed (doc comment on the DB mutex), A-B-A reorder finding rejected; round 2 APPROVED (claude); full suite 449 files / 10287 tests passed + build ok, cargo test 1249 passed; [MAIN-HB] measurement left for the owner (if save_snapshot never waits, revert the async part in history.rs, semantic.rs and their two tests) — d365e681
- 2026-11-03 05:55 — 08 — start — launched by /relay-lite:run — 2ea92bd0
- 2026-11-03 05:57 — 14 — start — launched by /relay-lite:run — b903ae5b
- 2026-11-03 05:58 — 16 — start — launched by /relay-lite:run — bba871e4
- 2026-11-03 06:11 — 16 — deliver — merged: exact-first embed resolution; review round 1 APPROVED (5 findings fixed), round 2 APPROVED; full suite exit=0 (450 files, 10319 passed); follow-ups 17 (path-suffix precedence) and 18 (exact-first in Rust VaultIndex) filed — ad73136b
- 2026-11-03 06:14 — 15 — start — launched by /relay-lite:run — 79758e5c
- 2026-11-03 06:16 — 14 — deliver — merged: per-file CollectionView with session view-index memory; review round 1 APPROVED (findings fixed or accepted), round 2 APPROVED; full suite exit=0 (451 files, 10337 passed) after one flaky MarkdownEditor.test.ts failure on run 1 — 5b149f3c
- 2026-11-03 06:19 — 08 — deliver — merged: queryjs results keyed per note path + block text, execute uses the toDOM path, dropped charts destroyed, ADR 0010 and CLAUDE.md rules 9-10 updated; review round 1 APPROVED (nits fixed), round 2 APPROVED (1 nit open: no test pins the !container.isConnected guard); full suite exit=0 (451 files, 10353 passed) — 73e583c8
- 2026-11-03 06:19 — 12 — start — launched by /relay-lite:run — 3c605422
- 2026-11-03 06:20 — ledger updated (added 17, 18; title of 15)
- 2026-11-03 06:20 — 17 — start — launched by /relay-lite:run — 9d103550
- 2026-11-03 06:22 — ledger updated (added 19)
- 2026-11-03 06:30 — 15 — deliver — merged: TAB_SWITCH scroll-path debug logging, mutation-checked test; review round 1 APPROVED (fixed), round 2 APPROVED (1 optional comment nit); full suite exit=0 (451 files, 10359 passed); owner session needed to read the cause — 05ef25ba
- 2026-11-03 06:33 — 17 — deliver — merged: path-style targets try the exact vault-relative path first, suffix match as fallback; review round 1 APPROVED (1 fixed, 1 rejected, 1 filed as Issue 20), round 2 APPROVED; full suite exit=0 (451 files, 10364 passed) — b5e7bb61
- 2026-11-03 06:33 — 18 — start — launched by /relay-lite:run — 343e6391
- 2026-11-03 06:33 — ledger updated (added 20)
- 2026-11-03 06:35 — 20 — start — launched by /relay-lite:run — 989c70d4
- 2026-11-03 06:36 — 12 — deliver — blocked: deliver merge returned conflict 3 times because origin/main kept moving (not the Issue's files); reviews APPROVED x2, suite green after each rebase; worktree kept — c655e464
- 2026-11-03 06:37 — 12 — deliver — merged by the main session (deliver sync + merge back to back after the workflow's 3 conflict returns; only .scratch commits had landed): first-open marks after the render pass so every first-pass block auto-runs; reviews APPROVED x2; suite green at 039813fb — bbd17a64
- 2026-11-03 06:37 — 19 — start — launched by /relay-lite:run — 761bf598
- 2026-11-03 06:44 — 19 — deliver — merged: test pins that a failed run still on screen keeps its charts (mutation-checked); review round 1 APPROVED (3 fixed, 1 optional rejected); full suite exit=0 (451 files, 10370 passed) — 90bcec09
- 2026-11-03 06:49 — 20 — deliver — merged: every TS wikilink resolver caller passes the vault root (graph view, queryjs, kanban, lens, NoteRow, properties); review round 1 APPROVED (PropertiesView test added), round 2 APPROVED; full suite exit=0 (452 files, 10379 passed) — 652380c5
- 2026-11-03 07:02 — 18 — deliver — merged: Rust VaultIndex resolves exact vault-relative path, then exact file, then note name, mirroring TS; review round 1 APPROVED (3 fixed), round 2 APPROVED; cargo 1262 passed, full suite exit=0 (452 files, 10381 passed) — 7e7b5b02
- 2026-11-03 07:44 — ledger updated (added 21)
- 2026-11-03 07:45 — 13 — start — launched by /relay-lite:run — 6a301cae
- 2026-11-03 07:45 — 21 — start — launched by /relay-lite:run — 6a301cae
- 2026-11-03 07:58 — 21 — deliver — merged: tab switch writes the new tab's scroll right after focus; review round 1 APPROVED (comment fixed), round 2 APPROVED (comment nit; dropping the frame-1 restore deferred to an owner session); full suite exit=0 (452 files, 10383 passed) — deba6537
- 2026-11-03 08:00 — 13 — deliver — merged: queryjs blocks share one page set per index version (per-block list copy, block pinned to its first set); review round 1 APPROVED (4 fixed, 1 nit rejected), round 2 APPROVED; full suite exit=0 (452 files, 10389 passed) — 4cf7f4d4
- 2026-11-03 08:01 — ledger updated (added 22)
- 2026-11-03 09:47 — ledger updated (added 23)
- 2026-11-03 10:21 — 23 — start — launched by /relay-lite:run — b4bd6648
- 2026-11-03 10:34 — 23 — deliver — merged as 7c1908e4; reviews round 1 APPROVED, round 2 APPROVED; full suite 457 files, 10566 passed, build ok — 7c1908e4
- 2026-11-03 12:41 — ledger updated (added 24)
- 2026-11-03 12:43 — 24 — start — launched by /relay-lite:run — dc6ef30b
- 2026-11-03 13:07 — 24 — deliver — merged: per-stage timing line for semantic and hybrid search (src-tauri/src/semantic/search_timing.rs plus semantic.rs), no behavior change; review round 1 APPROVED (docs fixes: escaped pipe in the SEARCH.md row, total scope noted), round 2 APPROVED; cargo test exit=0, full suite 457 files / 10573 passed, pnpm check 0 errors, build ok; on-device hybrid OKR numbers left for the owner — a7511e8a
- 2026-11-03 13:19 — ledger updated (added 25, 26)
- 2026-11-03 14:18 — 25 — start — launched by /relay-lite:run — 1f29d78b
- 2026-11-03 14:46 — 25 — deliver — search_fts is async over spawn_blocking; review APPROVED x2; full suite green; on-device check left to owner — 357d8989
- 2026-11-06 00:31 — 26 set to wontfix by hand: migrated to .scratch/audit-2026-11-05/ by the pre-use audit (each Issue file names its new number); the CLI has no transition from todo to wontfix or done
