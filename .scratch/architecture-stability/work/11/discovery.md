# 11 discovery: event-name registry (Rust + TS) and typed on()

No spec.md for this feature; the Issue is the spec. Repeats the work/10 pattern (contract in `src/lib/contracts/`, wrapper in `ipc.ts`, parity test reading Rust source with fs). Differences only below.

## Files that change
- New `src-tauri/src/events.rs` (+ `pub mod events;` in `lib.rs:1-8`): the 7 `pub const *_EVENT: &str`.
- Move out: `vault/mod.rs:31` (VAULT_INDEX_UPDATED_EVENT), `vault/watcher.rs:35` (VAULT_FILES_CHANGED_EVENT), `quick_capture/commands.rs:25,30` (QC_*), `commands/semantic.rs:396` (private `SEMANTIC_INDEX_PROGRESS`, renamed SEMANTIC_INDEX_PROGRESS_EVENT; the 4 literals the Issue lists were already folded into this const by an earlier Issue).
- Literals replaced: `lib.rs:259-260` (`tauri-debug-log`, the issue-26 set_log_sink closure), `lib.rs:275` (`menu:settings`).
- Importers updated: `lib.rs:19-22`, `commands/watcher.rs:2-5`, `commands/vault.rs:7`, `quick_capture/commands.rs:254,301,370`, `tests/commands/vault_test.rs:13`.
- New `src/lib/contracts/events.ts`: `EVENT_NAMES` (as const), `EventName`, `EventMap` (payloads from the generated barrel; `menu:settings` null, `qc:open-composer` string, `qc:capture-detected` unknown: untyped `json!`, the consumer narrows it).
- `src/lib/contracts/ipc.ts`: `on<K>(name, handler: (payload) => void): Promise<UnlistenFn>` over `listen`, handing the handler `event.payload` (so `on('vault-index-updated', (p) => p.version)` compiles).
- Listen sites migrated: `app/tauri-listeners.service.ts:29,179`, `core/filesystem/fs.watcher.ts:198`, `features/search/search.service.ts:93`, `utils/debug.ts:123`, `plugins/quick-capture/quick-capture.service.ts:60` (delete export at :14), `routes/composer/+page.svelte:6,77`.
- Tests: new `src/tests/lib/contracts/events-parity.test.ts`; `on()` runtime + type cases in `src/tests/lib/contracts/ipc.test.ts`; `quick-capture.service.test.ts:31,244` use `EVENT_NAMES.QC_CAPTURE_DETECTED`.

## Plan (commits)
1. Parity test first (red: no `events.ts`, and `lib.rs` has 2 `.emit("` literal sites). Collects `pub const X_EVENT: &str = "..."` across all of `src-tauri/src`, compares the set to `Object.values(EVENT_NAMES)`, asserts no `/\.emit\(\s*"/` match, floor of 7 consts so an empty parse fails.
2. Rust `events.rs` + moves + literal replacements; cargo test.
3. `events.ts` + `on()` + ipc tests (type test with `@ts-expect-error` on `'vault-index-update'`).
4. Migrate the 7 TS listen sites, delete the two TS redefinitions, update quick-capture test.

## Prior art
- `src/tests/lib/contracts/ipc-parity.test.ts` (Rust source parsing, MIN floor), `ipc.test.ts` (compile-time `@ts-expect-error` cases inside a never-run closure).
- Listener tests mock `@tauri-apps/api/event`; `on()` imports `listen` from it, so `toHaveBeenCalledWith(name, expect.any(Function))` and handler captures called with `{ payload }` keep working.

## Defaults for open questions
- Optional QC `#[serde(tag = "kind")]` enum: not done (owner triage: own Issue). `qc:capture-detected` payload stays `unknown` in `EventMap`; `quick-capture.service.ts` casts to its `QuickCaptureDetectedPayload` at the boundary, because `contracts/` may not import `plugins/`/`features/` (CaptureKind).
- `on()` handlers get the payload, not the `Event` wrapper (the Issue's type test requires it).
- Moved consts are not re-exported from their old modules.
- `close-requested` / focus listeners use `getCurrentWindow()` window events, not app events: out of scope.

## Risks
- A test that calls the captured `listen` handler with a raw payload instead of `{ payload }` would break; check each migrated site's test.
