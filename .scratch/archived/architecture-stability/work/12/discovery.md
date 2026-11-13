# Issue 12 discovery

No `spec.md` for architecture-stability. ADR-0003 (contracts is a leaf every layer may import) is the
only one that applies: the mock imports `src/lib/contracts/` types.

## Files that change

- `e2e/mocks/tauri-core.ts:17-21,321-376`: replace `Record<string, (args: Args) => unknown>` with
  `{ [K in keyof CommandMap]: (args: CommandArgs<K>) => CommandResult<K> }`; give each handler its
  typed args and result. Drop `search_vault` (+ `handleSearchVault`). Add the 12 listed handlers plus
  `capture_clipboard_now` and `open_composer` (in CommandMap since the Issue was written; the mapped
  type forces them). Shape fixes: `scan_vault_v2` returns `vaultIndex.getAll()`, `download_*_model`
  returns `true` (Rust's success value; callers ignore it), `cleanup_history` returns `0`.
  `build_search_index` already returns the five `IndexStats` fields; the type now pins it.
- `e2e/mocks/tauri-event.ts:25-32`: `eventsAPI.emit<K extends keyof EventMap>(event: K, payload: EventMap[K])`;
  tauri-core's two emits go through one typed helper.
- `e2e/mocks/virtual-fs.ts:301-346`: `searchVault` (+ `VaultSearchMatch` if orphaned) is only used by
  `search_vault`; remove it.
- `e2e/mocks/vault-index.ts:230`: `organized` is missing from `buildEntry` (the one error a typecheck
  of e2e/mocks shows today). Mirror Rust `entry.rs:246-249`: a YAML bool `_organized`, else `true`.
- `e2e/fixtures/console-guard.ts:20-28`: `ALLOWED_UNKNOWN_COMMANDS` becomes `{}`; comment updated.
- `tsconfig.json:23`: include `"e2e/mocks"` (svelte-check reads tsconfig include, so `pnpm check` covers it).
- `.github/workflows/ci.yml:36-47`: add `"e2e/**"` to the `frontend` paths filter.

## Plan

1. Include e2e/mocks in tsconfig + CI filter; fix `organized` -> `pnpm check` green. Commit.
2. Type HANDLERS + events, add handlers, remove search_vault -> `pnpm check` green; probe: delete one
   handler and break one return shape, `pnpm check` must fail on each. Commit.
3. Empty the allowlist -> targeted E2E specs pass. Commit.

## Prior art

Issue 36 (work/36): console guard and handler style. `src/lib/contracts/ipc.ts` `call()` for the
`CommandArgs` / `CommandResult` helpers.

## Risks / defaults

- `get_semantic_file_status` now returns `{ chunkCount: 0, lastEmbeddedAt: null, modelLoaded: false }`
  instead of `null`: "Loading model..." shows only when `semanticSearchEnabled` (default false).
- tauri-core keeps reaching the bus through `window.__e2e.events` (not a direct import), so a second
  copy of the event module in a pre-bundled dep cannot split the listener map.
- `propagate_type_rename` returns `0` (no on-disk rewrite); no spec reaches it today (Issue 36 run).
- AC 1 is proved by a manual probe (recorded in the report), not a committed test.
