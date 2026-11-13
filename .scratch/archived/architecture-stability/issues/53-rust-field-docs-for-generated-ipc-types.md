# 53: Field docs on the Rust structs behind the generated IPC types

**What to build:** Issue 09 (squash 9ca9bc33) replaced the hand-written TS mirrors with the ts-rs types from Issue 08. For four of them the Rust struct has no field `///` docs, so the per-field JSDoc the mirrors carried is gone. `src/lib/types/vault-v2.types.ts` now says "Field docs live on the Rust structs", which holds for the vault types but not for these:
- `FileNode` (was `FileTreeNode` in `src/lib/core/filesystem/fs.types.ts`): `modifiedAt` / `createdAt` "timestamp in ms".
- `SnapshotInfo` (`src/lib/features/file-history/file-history.types.ts`): `timestamp` "Unix ms".
- `DiffLine`: `oldLineNum` / `newLineNum` "1-based, absent for inserts and deletes".
- `FtsSearchResult`: whatever the mirror documented (read it with `git show 9ca9bc33^:<path>`).

Add `///` field docs to those Rust structs, restoring what the mirrors said, and commit the bindings that `cargo test` regenerates (ts-rs emits them as JSDoc).

Also an owner decision from the same review (finding 1): the Issue 09 build kept `NoteRecord` in `src/lib/features/collection/collection.types.ts` and allowlisted it, because its `properties` is a runtime `Map` built by `collection.service.ts::fromV2`, not the wire shape. Renaming it (for example to `PropertyIndexRecord`) would remove the name clash with the generated `NoteRecord` and the allowlist entry. The owner chose the rename at triage (2026-11-01): rename the TS `NoteRecord` to `PropertyIndexRecord`, update every importer, and drop its entry from the mirror allowlist in `src/tests/lib/architecture/ipc-mirrors.test.ts`.

**Blocked by:** none

**Status:** resolved

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` (it regenerates `src/lib/contracts/generated`; commit the result) + `pnpm check`. Plus `pnpm vitest run` + `pnpm build` for the rename.

**Source:** review of Issue 09 (`.scratch/architecture-stability/work/09/review.md`, findings 1 and 2), 2026-11-01.

- [x] Each field listed above has a `///` doc on its Rust struct, and the regenerated bindings carry it as JSDoc
- [x] `src/lib/contracts/generated` is committed and the CI freshness check passes
- [x] The TS `NoteRecord` is `PropertyIndexRecord` everywhere, and the mirror allowlist no longer lists it

## Notes

- **Size:** S.

## Comments

- 2026-11-01, main session: the workflow stopped before delivery because both full-suite runs hit 5 s timeouts in help/ and live-preview tests under machine load (filed as Issue 55). After a rebase onto e83855ba (Issue 22) the main session re-ran the gate in this worktree: `pnpm check` 0 errors (after clearing a stale `.svelte-kit/.svelte-check` cache left by Issue 22's file moves), vitest 404 files / 9606 passed, `pnpm build` ok; cargo test 1200 passed from the workflow run (Issue 22 touches no Rust). Review round 1 APPROVED; finding 1 (CLAUDE.md:301 still says `NoteRecord`) is left to the owner.
