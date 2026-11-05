# 06: A watcher batch with `.md` and `.view` updates both

**What to build:** `mdPaths` keeps only `.md` and `.markdown` (`watcher-handler.service.ts:49`). With 1 to 10 of them the incremental branch runs and returns (`:53-59`), so any `.view` in the same batch is never read. Rust indexes `.view` (`utils/fs.rs:136`) and the watcher only emits paths (`vault/watcher.rs:270-276`).

Failures: a `git pull` changing `a.md` and `b.view` leaves `b.view`'s label, `_rail`, `_visible` and `_order` stale until the next rebuild. A deleted `.view` stays as a ghost row. An external `Foo.view` -> `Foo.md` leaves a dead pin, and `Foo.md` -> `Foo.view` adds no entry. ADR-0009 line 72 says a `.view` edited outside the app "still takes the full rebuild", which is false for a mixed batch.

**Do not** skip the incremental branch when a `.view` is present. The full rebuild runs only `scan_vault_v2_cached` (`backlinks.service.ts`), and the incremental branch is the only watcher path that passes `vaultPath`, so that shortcut stops the `.md` files in the batch from updating search until the next vault open.

**Do not** add `.view` to `mdPaths` either, for the same reason in reverse: it would write FTS5 and semantic rows for the view.

Keep the incremental branch and add the `.view` paths to the read. `read_files_batch` has no extension filter (`commands/files.rs:25-75`). `.md` calls `applyNoteChange` with `vaultPath`; `.view` calls it without, so `ftsKey` is null and no search IPC fires (`note-change.service.ts`). A view-only batch keeps the full rebuild it has today.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing tests first, on `rebuildAllIndexes` with only `invoke` mocked, for `['/v/a.md', '/v/b.view']`:
  - `update_search_index_file` fires for `a.md` and not for `b.view`.
  - `update_note_in_index` fires for `b.view` with its content.
  - No scan runs.
  - A deleted `.md` in the batch reaches `remove_from_search_index`, and a deleted `.view` reaches `remove_note_from_index` only.
- [ ] ADR-0009 line 72 states the real rule.

## Notes

- `src/tests/lib/app/lifecycle/watcher-handler.service.test.ts` has no `.view` or `.collection` case today.
- `endsWith` is case-sensitive here while `isViewFile` is not. Use `isViewFile` for the view half and leave the `.md` check as it is.
- Nothing here runs the real FSEvents payload for a rename. Do one manual check in the app.
- **Size:** S.
