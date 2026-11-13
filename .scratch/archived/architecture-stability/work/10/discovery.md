# 10 discovery: typed CommandMap, call(), parity test, core migration

No spec.md for this feature; the Issue is the spec. Builds on work/09 (generated types + `src/lib/contracts/index.ts` barrel).

## Files that change
- New `src/lib/contracts/commands.ts`: `CommandMap` (57 entries, `{ args; result }`, results from `./index.js`), `ArgKey<K>`, `COMMAND_ARGS` (`as const satisfies { [K in keyof CommandMap]: readonly ArgKey<K>[] }`, `?` suffix on Option params).
- New `src/lib/contracts/ipc.ts`: `call<K>(cmd, ...args)`; zero-arg commands take no args tuple and reach `invoke(cmd)` with one argument. JSDoc names the `plugin:updater|download_and_install` raw-invoke exception.
- Core migration (raw `invoke` -> `call`): `settings/update-check.service.ts:25`, `settings/sentry.service.ts:50`, `settings/sections/EditorSection.svelte:18`, `SearchSection.svelte:28,45,67,73`, `UpdateSection.svelte:142` (169 stays raw: updater plugin), `note-creator/note-creator.service.ts:98,103`, `filesystem/fs.service.ts:79,129,156`, `link-updater.service.ts:28`, `fs.watcher.ts:162,201,220`, `path-change.service.ts:159`, `note-change.service.ts:202-251`, `app-lifecycle/watcher-handler.service.ts:96`, `app-lifecycle.service.ts:234,276,362,588,598,602`, `status-bar/SemanticIndexStatus.svelte:44`, `vault/vault-entries.service.ts:24`. (`live-preview/widgets.ts` imports only `convertFileSrc`, untouched.)
- `CLAUDE.md` Indexing item 4: full rebuild calls `scan_vault_v2_cached` (the only v2 scan TS invokes, `backlinks.service.ts:95`).
- Tests: new `src/tests/lib/contracts/ipc-parity.test.ts`, `src/tests/lib/contracts/ipc.test.ts` (runtime + `@ts-expect-error` type cases).

## Plan (commits)
1. Parity test first (red: `COMMAND_ARGS` / `CommandMap` empty). Parser: read `generate_handler![...]` in `src-tauri/src/lib.rs`, map `a::b::name` to `src-tauri/src/a/b.rs`, regex the `#[tauri::command] pub [async] fn name<..>(params) -> ret` signature, drop `AppHandle`/`State`/`Webview` params, camelCase names, `Option<T>` -> `name?`. Fails loudly if it parses fewer than 57 commands or any entry's fn is not found. Types: Rust->TS table (String->string, bool->boolean, i64/u32/u64/usize/f32->number, ()->null, Vec<T>->T[], Option<T> result -> `T | null`, generated type names pass through, unknown name -> test failure), compared against the CommandMap member text read with the TypeScript compiler API (whitespace-normalized).
2. commands.ts + ipc.ts + ipc tests (green).
3. Migrate core sites (one commit), CLAUDE.md line.

## Prior art
- `src/tests/lib/architecture/ipc-mirrors.test.ts` (reads source files with fs), `src/tests/lib/contracts/contracts.types.test.ts` (compile-time checks under `pnpm check`).
- Existing core tests mock `@tauri-apps/api/core`; `call()` imports `invoke` from it, so their `toHaveBeenCalledWith('cmd', {...})` assertions stay unchanged.

## Defaults for open questions
- Owner decision (delete vs keep `capture_clipboard_now`, `open_composer`, `scan_vault_v2`): keep them, listed in CommandMap with a "Rust-only, not invoked from TS" JSDoc. Deleting is a Rust behavior change outside this Issue's gate and needs the owner; keeping keeps the 57-entry parity criterion true.
- Test path: `src/tests/lib/contracts/` instead of the Issue's `src/tests/contracts/`, because tests mirror `src/lib/` (docs/TESTING.md:7) and work/09 put contracts tests there.
- `()` results type as `null` (what Tauri serializes); u64/i64 as `number` (serde_json over IPC, same as the ts-rs config).
- The dry runs (renamed Rust param, changed return type) run on a scratch copy of the parser input, recorded in the report; not committed.

## Risks
- Stricter result types at call sites (e.g. `FileNode[]` vs `FileTreeNode[]` in fs.service / fs.watcher): fix at the call site without casts.
- Tests that mock `@tauri-apps/api/core` with `mockResolvedValue` keep working; tests asserting `.not.toHaveBeenCalledWith('cmd')` rely on the one-arg rule.
