VERDICT: APPROVED

# Issue 53 review

Reviewed `git diff main...HEAD` (5620a963, 464aaf50, bc1d7603) in the worktree.

## Acceptance criteria

- [met] Each field listed above has a `///` doc on its Rust struct, and the regenerated bindings carry it as JSDoc — every field of `FileNode` (src-tauri/src/commands/vault.rs:56-73), `SnapshotInfo` (src-tauri/src/db/history_repo.rs:8-12), `DiffLine` (src-tauri/src/commands/history.rs:15-27) and `FtsSearchResult` (src-tauri/src/db/fts_repo.rs:10-21) has a `///` doc. The FileNode, SnapshotInfo and DiffLine texts match the pre-Issue-09 mirrors (`git show 9ca9bc33^:src/lib/core/filesystem/fs.types.ts` and `.../file-history/file-history.types.ts`), and the units hold in the code: `as_millis()` at vault.rs:125-135, `now_ms()` feeding `created_at` at history.rs:45-64, `old_line_num: None` for inserts and `new_line_num: None` for deletes at history.rs:117-127. The FtsSearchResult mirror had no field docs (`git show 9ca9bc33^:src/lib/features/search/search.types.ts:29-35`); the new docs agree with the code: `index_entry` passes `rel_path` (search_index.rs:249-255), `extract_title` strips `.md`/`.markdown` (fts_logic.rs:61-67), `snippet(notes_fts, 2, '<mark>', '</mark>', '...', 30)` and `ORDER BY score` on `bm25()` (fts_repo.rs:79-88). The four generated files under src/lib/contracts/generated carry each doc as a JSDoc block.
- [met] `src/lib/contracts/generated` is committed and the CI freshness check passes — bc1d7603 commits the five regenerated bindings. I re-ran the ts-rs export tests (`cargo test --manifest-path src-tauri/Cargo.toml --lib export_bindings`, from the worktree root so `.cargo/config.toml` sets `TS_RS_EXPORT_DIR`): 32 passed, exit 0, and `git status --porcelain` came back empty afterwards, which is the same condition the `Check TS bindings are committed` step in .github/workflows/ci.yml:117-124 tests. No type was removed, so the `rm -rf` before the CI run cannot surface a stale file this run missed.
- [met] The TS `NoteRecord` is `PropertyIndexRecord` everywhere, and the mirror allowlist no longer lists it — collection.types.ts:71 declares `PropertyIndexRecord`. In 464aaf50 the diff removes 163 lines naming `NoteRecord` and adds 162 lines naming `PropertyIndexRecord`; the one extra removed line is the allowlist comment. No other line changes. `grep -rnw NoteRecord src` now finds only the generated file, the `contracts/index.ts` re-export and the `NoteRecord as NoteRecordV2` alias in vault-v2.types.ts. The `collection.types.ts -> NoteRecord` entry is gone from `ALLOWLIST` in src/tests/lib/architecture/ipc-mirrors.test.ts:24-27, and that test passes. Two prose docs outside `src/` still use the old name (findings 1 and 2).

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on src/tests/lib/features/collection, src/tests/lib/features/auto-move, src/tests/lib/plugins/queryjs, src/tests/lib/features/rail-shell, src/tests/lib/features/type-definitions, src/tests/lib/features/properties/properties.logic.test.ts, src/tests/lib/architecture, src/tests/lib/contracts, src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget.test.ts, src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts, src/tests/lib/features/file-history and src/tests/lib/features/search: exit 0, 72 files, 2658 passed, 1 todo. These cover every test file the diff changes and the tests for the source files it renames in. The full suite (`pnpm vitest run && pnpm build`) is deliver's to run.
- `cargo test --lib export_bindings` (see criterion 2): exit 0. Bindings are fresh. The rest of the Rust diff is doc comments only, so I did not re-run the whole `cargo test`.
- layer-baseline.json, BASELINE_SIZE and the composition-root list are untouched.
- No scope creep: apart from the two commits the Issue asks for, the only change is the workflow's discovery.md.

## Findings

1. minor — CLAUDE.md:301 (the "DTO firewall" sentence in Performance item 12) still says `buildKBPage` "is the only reader of `NoteEntryV2` and the collection `NoteRecord` for KBAPI". That collection type is now `PropertyIndexRecord`, and the branch already changed the same sentence in src/lib/plugins/queryjs/contract/kb-api.v1.ts:16 and src/tests/lib/plugins/queryjs/kbapi-firewall.test.ts:17. Fix: change it to "the collection `PropertyIndexRecord`", so the project instructions don't send agents looking for a type that no longer exists. Because CLAUDE.md is the project's instruction file, the owner may want to approve this edit.
2. nit — help/examples/auto-move-features/README.md:45: "If a rule's `expression` evaluates to `true` for the file's `NoteRecord`". Auto-move evaluates rules against the TS record (`auto-move.logic.ts:19`, now `PropertyIndexRecord`). Fix: name `PropertyIndexRecord`, or better for a user-facing doc, say "the file's properties record".
3. nit — src-tauri/src/commands/vault.rs:51-52: the `FileNode` struct doc says it serializes "to match the TypeScript `FileTreeNode` interface". `FileTreeNode` is now a type derived from `FileNode` (src/lib/core/filesystem/fs.types.ts:10), and the generated FileNode.ts repeats the stale text. This predates the Issue and the build report notes it. Optional fix: reword to "`FileTreeNode` (fs.types.ts) extends this type".
4. nit — `buildNoteRecord` (src/lib/features/collection/collection.logic.ts) builds a `PropertyIndexRecord` but keeps its old name. That matches the Issue, which renames the type only. Leave it unless the owner wants the function renamed too.

## Resolution

- Finding 1 (CLAUDE.md:301): not applied. CLAUDE.md is the project instruction file and a workflow agent may not edit it without the owner's own approval; left for the owner (one-word change: `NoteRecord` -> `PropertyIndexRecord` in the DTO firewall sentence).
- Finding 2 (help/examples/auto-move-features/README.md:45): fixed, now says "the file's properties record".
- Finding 3 (src-tauri/src/commands/vault.rs:51): fixed, the `FileNode` doc now reads "`FileTreeNode` (fs.types.ts) extends this type"; `cargo test` regenerated src/lib/contracts/generated/FileNode.ts, committed with it.
- Finding 4 (`buildNoteRecord` name): rejected, the Issue renames only the type; renaming the function is out of scope.
