VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first (TS): two overlapping `loadDirectoryTree` calls, the first resolves last, the newer tree wins — `fs.service.test.ts` "keeps the newer tree when an older overlapping load resolves last" passes on HEAD; with `fs.service.ts` swapped back to main's version it fails (probe, restored with `git checkout HEAD --`). Guard at `src/lib/core/filesystem/fs.service.ts:101-104`.
- [met] Failing first (Rust): the watcher's path filter drops `note.md.tmp-123-4` and keeps `note.md`, `note.tmp`, `a.tmp-x` — `vault::watcher::tests::temp_filter_drops_write_atomic_temp` and `temp_filter_keeps_regular_and_lookalike_names` pass (`cargo test --lib watcher`: 33 passed); the function did not exist on main, so the tests could not pass there. The filter is wired into `run_debounce_loop` (`watcher.rs:211`) and `debounce_filters_write_atomic_temp` covers the loop.
- [met] Failing first: two watcher batches for different subtrees whose scans resolve out of order both end up in `fsStore.fileTree` — `fs.watcher.test.ts` "keeps both subtree patches when two batches resolve out of order" passes on HEAD and fails with main's `fs.watcher.ts` (probe). Rebase at `fs.watcher.ts:245-249` reads `fsStore.fileTree` after the last await.
- [met] Failing first (Rust): the debounced batch produced by a `write_atomic` of `dir/note.md` contains `dir/note.md` and no `.tmp-` path — `vault_watcher_test::watcher_drops_write_atomic_temp_path` passes on HEAD; with the `is_write_atomic_temp` check removed from `run_debounce_loop` it fails with `write_atomic temp path leaked into emit: [".../dir/note.md", ".../dir/note.md.tmp-29794-0"]` (probe, restored).
- [met] Existing watcher and `scan_vault` Rust tests stay green — `cargo test --test vault_watcher_test --test commands_test`: 11 + 81 passed (includes every `commands::vault_test` case, now on `scan_vault_inner`, plus the new `#[tokio::test]` through the async command); `cargo test --lib watcher`: 33 passed.
- [not met] Not verified by the agent: with Issue 05's `[MAIN-HB]`, creating a note logs no main-thread stall from `scan_vault`; dragging the window during a creation stays smooth — device check for the owner; not checkable here. Code-side the command is `async` + `spawn_blocking` (`src-tauri/src/commands/vault.rs:114-122`), same shape as `build_search_index`, and no Rust caller depends on the old sync signature (grep).

## Findings

1. minor — `docs/adr/0031-native-rust-vault-watcher.md:33` (also `CLAUDE.md` Indexing & Watcher item 5). ADR 0031 says the watcher's filter matches `utils::fs::walk_dir`, "so the watcher and the vault scan can never disagree about which files exist". The new `is_write_atomic_temp` filter breaks that: `scan_vault` still lists a file named `*.tmp-<digits>-<digits>` (a user file, or a temp left behind by a crash between `write_atomic`'s write and rename), but the watcher no longer reports it being created or deleted, so the explorer only catches up on the next full load. The divergence is accepted in discovery.md and the commit body, but the ADR and CLAUDE.md now state the opposite. Fix: add a one-line amendment to ADR 0031 (and the CLAUDE.md item) that names the second filter and the accepted divergence, or make `walk_dir` skip the same pattern.
2. nit — `src/lib/core/filesystem/fs.service.ts:101`. A superseded `loadDirectoryTree` now resolves without writing, so its awaiting caller (`createFile`, `createFolder`, `duplicateItem`, `applyPathChange`, `openOrCreateNote`, `trash.service`, `templates.service`) continues while the store still holds the pre-operation tree until the newer load lands. If that newer load rejects, neither call writes and the tree stays stale until the next load. I checked those callers: none reads `fsStore.fileTree` right after `await refreshTree()`, so this needs no change now. Worth knowing for Issue 09.
3. nit — `src/lib/core/filesystem/fs.service.ts:96` (pre-existing). `loadFolderOrder` writes `fsStore.folderOrder` inside each call, before the generation guard, so an older overlapping call can still leave its folder order in the store last. This only matters if `.kokobrain` folder order changed between the two reads. Not introduced here, and no change required in this Issue.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/filesystem/ src/tests/lib/app/tauri-listeners.service.test.ts src/tests/lib/app/lifecycle/`: 18 files, 617 tests passed. This covers `fs.service.test.ts`, `fs.service.race-audit.test.ts` and `fs.watcher.test.ts` (the test files of the changed TS code), plus the `loadDirectoryTree` / `scan_vault` callers in lifecycle and the Tauri listeners.
- Red probes: swapping `fs.service.ts` and `fs.watcher.ts` back to main's versions makes exactly the two new TS tests fail (2 failed, 127 passed). Removing the Rust temp filter makes `watcher_drops_write_atomic_temp_path` fail. All sources were restored afterwards, and `git status` is clean.
- Rust (`CARGO_TARGET_DIR` = main checkout's `src-tauri/target`, `CARGO_BUILD_JOBS=2`, nice 19): `--lib watcher` 33 passed; `--test vault_watcher_test --test commands_test` 11 + 81 passed. I did not run the full Rust suite. The shared target was last built from the probe's modified `watcher.rs`, so the next cargo run recompiles from the restored source.
- Full vitest suite and `pnpm build`: not run (deliver's).
- Scope: the diff touches only the files the Issue names, their tests and the workflow's own `.scratch/.../work/06/` records. No layer-baseline or composition-root change. The ts-rs bindings are unaffected (`FileNode` is unchanged).

## Resolution

1. Fixed: dated amendment added to ADR 0031 (Consequences) naming `is_write_atomic_temp` and the accepted divergence from `walk_dir`; CLAUDE.md Indexing & Watcher item 5 names the second filter and points to the amendment. `walk_dir` is left unchanged, so `scan_vault` still lists such files.
2. No change: the reviewer confirmed no current caller reads `fsStore.fileTree` right after awaiting `refreshTree`. Noted for Issue 09.
3. No change: pre-existing, outside this Issue's scope.
