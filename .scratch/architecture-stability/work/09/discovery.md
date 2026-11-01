# 09 discovery: replace hand-written IPC mirrors with generated types

No spec.md for this feature; the Issue is the spec. Builds on work/08 (ts-rs output in `src/lib/contracts/generated/`, 32 types + `serde_json/JsonValue`).

## Files that change
- New `src/lib/contracts/index.ts`: type-only barrel over every generated file.
- `src/lib/types/vault-v2.types.ts`: whole file becomes `export type { NoteEntry as NoteEntryV2, ... }`; `FrontmatterValue` becomes `JsonValue as FrontmatterValue` (JsonValue is structurally identical, so it is assignable; the alias keeps 10 import sites unchanged). Stale header (:1-19) and WikiLinkV2 "positions not routed across IPC" note go.
- Inline mirrors -> import from contracts: `features/backlinks/backlinks.service.ts:24` (CachedScanResult), `core/filesystem/fs.watcher.ts:116` (VaultFilesChangedPayload), `utils/debug.ts:98` (TauriDebugLogPayload -> DebugLogPayload), `core/settings/update-check.service.ts:11` and `core/settings/sections/UpdateSection.svelte:33` (UpdateMetadata).
- Exported mirrors -> `export type { ... } from '#lib/contracts/index.js'` in place, so import sites stay: `core/status-bar/semantic-index-status.logic.ts:2`, `features/file-history/file-history.types.ts:2,12`, `features/search/search.types.ts:29-88` (SemanticResult as SemanticSearchResult, IndexStats as SearchIndexStats), `core/filesystem/fs.types.ts:27`, `features/backlinks/backlinks.types.ts:1`, `features/outgoing-links/outgoing-links.types.ts:1,9`, `features/tasks/task-metadata.types.ts:2-27`.
- `core/filesystem/fs.types.ts:2` FileTreeNode -> `Omit<FileNode,'children'> & { children?: FileTreeNode[]; fileCount?: number }`.
- `docs/adr/0003-four-layer-source-taxonomy.md`: contracts/ leaf line in Decision.
- Tests: new `src/tests/lib/contracts/contracts.types.test.ts` (expectTypeOf, red under `pnpm check` first), new `src/tests/lib/architecture/ipc-mirrors.test.ts` (name scan).

## Plan (commits)
1. Type test (red in `pnpm check`: SearchIndexStats.added is optional today).
2. Barrel + vault-v2 re-export + all mirror swaps + FileTreeNode (green); fix call sites if the stricter types error.
3. Name-scan architecture test (forbidden = generated names, `<name>V2`, TauriDebugLogPayload, SemanticSearchResult, SearchIndexStats; allowlist by file+name).
4. ADR-0003 line.

## Prior art
- `src/tests/lib/architecture/pure-logic.test.ts` (file scan + explicit ALLOWLIST with reasons); `src/tests/lib/types/vault-v2.types.test.ts` (expectTypeOf).
- `contracts` is already in OPEN_LAYERS (`scripts/import-graph.mjs:150`); pure-logic walk reaches only type files, so no baseline change.

## Defaults for open questions
- `FileTaskGroup` (tasks.types.ts:20, holds `TaskItem[]`): kept and allowlisted by name, as the Issue allows.
- `NoteRecord` (collection.types.ts:71): the Issue lists it for deletion, but it is NOT a wire mirror: `properties` is `Map<string, unknown>` built by `fromV2` in `collection.service.ts:32` and read via `.get()` by ~40 files. Replacing it with the generated `Record<string, JsonValue>` would change the collection/kb-api runtime shape and their tests. Kept and allowlisted by name like FileTaskGroup (the criterion "the check lists allowed TS-domain names explicitly" covers it). The wire type is still the generated one via `NoteRecordV2`.

## Risks
- `SearchIndexStats` fields become required: only search.service / store consume it; fixtures in tests that build partial stats would fail `pnpm check` (fix at the call site, no casts).
- `FrontmatterValue` alias equality in existing `vault-v2.types.test.ts:100` (`Record<string, FrontmatterValue>` vs `{ [key in string]: JsonValue }`): structurally equal; verify under `pnpm check`.
