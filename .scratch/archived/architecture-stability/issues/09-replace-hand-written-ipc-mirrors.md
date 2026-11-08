# 09: Replace the hand-written TS mirrors with the generated types

**What to build:** Turn `src/lib/types/vault-v2.types.ts` into a re-export module (`export type { NoteEntry as NoteEntryV2, ... } from '#lib/contracts/index.js'`), so existing import sites stay unchanged. Keep `FrontmatterValue` only if the generated JsonValue is not assignable to it.

Delete these inline mirrors and import from contracts instead:
- backlinks.service.ts:24
- fs.watcher.ts:116
- utils/debug.ts:98
- update-check.service.ts:11
- semantic-index-status.logic.ts:2
- SnapshotInfo and DiffLine (file-history.types.ts)
- FtsSearchResult, SemanticStats, SemanticProgress, SearchIndexStats and SemanticSearchResult (search.types.ts)
- FileReadResult (fs.types.ts)
- the second inline `UpdateMetadata` in `UpdateSection.svelte:33`
- `NoteRecord` in `collection.types.ts:71`, `outgoing-links.types.ts:1,9`, `WikiLink` in `backlinks.types.ts:1`, and the 4 types in `task-metadata.types.ts:2-27`
- `FileTaskGroup` in `tasks.types.ts:20` is a TS-domain type (it holds `TaskItem[]`): keep it, rename it, or allowlist it by name

`FileTreeNode` becomes `Omit<FileNode,'children'> & { children?: FileTreeNode[]; fileCount?: number }`, because `fileCount` exists only in TS.

Fix the stale comments at vault-v2.types.ts:9-17 and the WikiLinkV2 note that says positions don't cross IPC (they do, through `NoteEntry.outgoingLinks`). Create the barrel `src/lib/contracts/index.ts` (ts-rs does not generate one). Add an ADR-0003 line: `contracts/` is a leaf that every layer may import; it holds generated types plus the thin `ipc.ts` wrapper from issue 10, and imports nothing from `#lib` except `@tauri-apps/api`.

**Blocked by:** 08


**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/types/vault-v2.types.ts, src/lib/features/search/search.types.ts:29-88, src/lib/features/file-history/file-history.types.ts, src/lib/core/filesystem/fs.types.ts, docs/adr/0003:50-51

- [x] A type test comes first (vitest `expectTypeOf`): `NoteEntryV2` equals the generated `NoteEntry`, and `SearchIndexStats.added` is a required `number`. It fails before the swap
- [x] No `interface` or `type X = {` in src/lib duplicates a generated type name, including renamed mirrors (`*V2`, `TauriDebugLogPayload`, `SemanticSearchResult`, `SearchIndexStats`); the check lists allowed TS-domain names explicitly
- [x] Compile errors from the stricter types are fixed at the call sites, not with casts
- [x] The existing service tests for search, backlinks, file-history, tasks and collection stay green with no assertion changes

## Notes

- **BTreeMap:** ts-rs 12 emits `{ [key in string]: V }` (no `?` unless `TS_RS_USE_V11_HASHMAP`), so no cascade there. The real cascade risk is `| null` on optional fields, handled in issue 08.
- **Layer rules:** issue 04 must exempt `contracts/` so `utils/debug.ts` and `types/vault-v2.types.ts` can import it.
- **Size:** M.

## Comments

- 2026-11-01, branch `issue/09-replace-hand-written-ipc-mirrors`: the hand-written IPC mirrors in src/lib are replaced by re-exports of the ts-rs types through the new `src/lib/contracts/index.ts` barrel, with a type test (`contracts.types.test.ts`) and an architecture guard (`ipc-mirrors.test.ts`) against new mirrors. Review round 1: APPROVED with 4 findings. Fix round: barrel completeness check added to `ipc-mirrors.test.ts`, e2e `build_search_index` mock returns all five counters, and a `#lib/contracts` comment specifier in `vault-v2.types.ts` gained its extension (the deliver suite caught it). Deferred: `NoteRecord` stays allowlisted (renaming it is the owner's call) and the Rust field docs on `FileNode` / `SnapshotInfo` / `DiffLine` / `FtsSearchResult` are a follow-up. Tests: `pnpm check` 0 errors; full suite + build 397 files, 9525 passed, 1 skipped, 1 todo (first run failed 1 test in lib-specifier-convention, fixed).
