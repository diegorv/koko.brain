# 10: Typed CommandMap, a call() wrapper, a parity test, and the core migration

**What to build:**
- **`src/lib/contracts/commands.ts`:** a `CommandMap` interface (`{ args; result }` per command) plus a runtime `COMMAND_ARGS` manifest. The manifest is `as const satisfies { [K in keyof CommandMap]: readonly ArgKey<K>[] }`, and Option params get a `?` suffix.
- **`src/lib/contracts/ipc.ts`:** `call<K>(cmd, ...args)`.
- **Results** reference the generated types. `rename_note` returns `UpdateResult | null` and `check_for_update_on_channel` returns `UpdateMetadata | null`.
- **`src/tests/contracts/ipc-parity.test.ts`:** it reads `src-tauri/src/lib.rs` and every `#[tauri::command]` signature, drops `AppHandle`/`State`/`Webview` params, camelCases the rest, and compares names and optionality with `COMMAND_ARGS`.
- **`call()` and zero-arg commands:** when no args object is given, `call()` calls `invoke(cmd)` with one argument, never `invoke(cmd, undefined)`. 26 tests assert `toHaveBeenCalledWith('cmd')`, and the `.not.` variants would otherwise pass silently.
- **Parity covers types, not just names:** the test also compares each Rust param's type name and the inner `T` of `Result<T, _>` against the CommandMap entry (via a small Rust-to-TS name table for primitives and the generated types), so a hand-written result type cannot drift.
- **Migration here:** only the invoke sites under `src/lib/core/`. Features, plugins and routes move in issue 37. `plugin:updater|download_and_install` stays a raw invoke, documented as an exception.
- **Owner decision:** delete `capture_clipboard_now`, `open_composer` and `scan_vault_v2`, or keep them listed as Rust-only commands. All three are registered but never invoked from TS (only `scan_vault_v2_cached` is). CLAUDE.md Indexing item 4 says the full rebuild calls `scan_vault_v2`; fix that line.

**Blocked by:** 09

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src-tauri/src/lib.rs:283-341, src-tauri/src/commands/*.rs, src-tauri/src/vault/watcher.rs:280,319, src-tauri/src/quick_capture/commands.rs:242-359, ADR-0018

- [x] The parity test comes first. It fails while COMMAND_ARGS is empty, and passes once the keys equal the 57 generate_handler! entries. Renaming a Rust param in a scratch copy makes it fail
- [x] The parity test checks optionality: Rust `Option<T>` params (search_fts, search_semantic, search_hybrid, check_for_update_on_channel) carry `?`, and no other params do
- [x] Type tests: `call('get_tasks_in_section_v2', {})` and `call('scan_vault', { path })` (missing sortBy) are `@ts-expect-error`
- [x] No `invoke(` import from `@tauri-apps/api/core` remains in src/lib/core, outside the updater exception
- [x] A test proves `call('cmd')` reaches `invoke` with exactly one argument
- [x] Changing a Rust command's return type (dry run on a scratch copy) fails the parity test
- [x] The existing vitest invoke mocks still assert `toHaveBeenCalledWith('cmd', {...})` unchanged
- [x] The parity test fails loudly if it parses fewer commands than expected

## Notes

- **Counts:** 76 literal invoke sites in 31 files (the 89 figure included 14 doc-comment mentions).
- **What this adds:** a compile-time guard for new commands, and typed results. Today eight invokes return `unknown`: `update_note_in_index`, `create_note`, `remove_note_from_index`, `rename_note`, `propagate_type_rename`, `cleanup_history`, `download_*_model`.
- **Size:** M.

## Comments

- 2026-11-01, branch `issue/10-typed-command-map-and-call`: typed `CommandMap` + `COMMAND_ARGS` and `call()` in `src/lib/contracts/`, the IPC parity test at `src/tests/lib/contracts/ipc-parity.test.ts`, core migrated to `call()` and guarded by `src/tests/lib/architecture/core-ipc.test.ts`, which now also catches dynamic and namespace `invoke` imports (review finding 1). `capture_clipboard_now`, `open_composer` and `scan_vault_v2` stay as Rust-only entries until the owner confirms or files their deletion. Full suite: first run had 1 failure, a 5 s timeout in `src/tests/help/queryjs-globals.test.ts` that passes alone; the second run passed 403 files and 9589 tests, and `pnpm build` passed. Review round 1: APPROVED.
