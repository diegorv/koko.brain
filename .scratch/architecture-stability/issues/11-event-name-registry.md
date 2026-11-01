# 11: Event-name registry in Rust and TS, with a typed on() wrapper

**What to build:** Add `src-tauri/src/events.rs` as the single home for all 7 event-name consts.
- **Move there:** VAULT_INDEX_UPDATED_EVENT (vault/mod.rs:31), VAULT_FILES_CHANGED_EVENT (watcher.rs:34) and QC_* (quick_capture/commands.rs:25,30).
- **Add:** SEMANTIC_INDEX_PROGRESS_EVENT, TAURI_DEBUG_LOG_EVENT and MENU_SETTINGS_EVENT, replacing the literals at semantic.rs:422,447,584,729, the debug-log emit (wherever issue 26 put it) and lib.rs:266.

On the TS side:
- Add src/lib/contracts/events.ts (`EVENT_NAMES`, and an `EventMap` with the generated payloads), plus an `on()` wrapper in ipc.ts.
- Migrate the 7 listen sites.
- `EventMap` includes the unit payloads: `menu:settings` is `()`, and `qc:open-composer` is `""` (`commands.rs:301`).
- Delete the TS redefinitions at quick-capture.service.ts:14 and routes/composer/+page.svelte:6, and update `quick-capture.service.test.ts:31,244`, which imports the deleted export.

Optional, could be its own issue: replace the quick-capture `json!` payload with a `#[serde(tag = "kind")]` enum, so the TS union is generated.

**Blocked by:** 08, 10, 26

Issue 26 moves the debug-log emit into a lib.rs closure.

**Status:** resolved

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src-tauri/src/{vault/mod.rs,vault/watcher.rs,commands/semantic.rs,utils/logger.rs,lib.rs,quick_capture/commands.rs}, src/lib/core/layout/tauri-listeners.service.ts:29,175, src/lib/core/filesystem/fs.watcher.ts:202, src/lib/features/search/search.service.ts:93, src/lib/utils/debug.ts:128, src/lib/plugins/quick-capture/quick-capture.service.ts:60, ADR-0025

- [x] The parity test comes first: the set of `pub const *_EVENT: &str` values equals Object.values(EVENT_NAMES), and src-tauri/src has no match for the multiline regex `\.emit\(\s*"`. It fails on today's tree (6 sites: lib.rs:266 on one line, logger.rs:52 and semantic.rs:422/447/584/729 split across lines)
- [x] Type test: `on('vault-index-updated', (p) => p.version)` compiles, and `on('vault-index-update', ...)` is `@ts-expect-error`
- [x] If the QC enum is done: a Rust test pins each kind's JSON against today's json! output

## Notes

- **Size:** S, or M with the quick-capture enum.

## Comments

- 2026-11-01, owner triage: ready-for-agent without the optional quick-capture `#[serde(tag = "kind")]` enum; that one would be its own Issue.
- 2026-11-01, branch `issue/11-event-name-registry`: every Rust event-name const moved to `src-tauri/src/events.rs`, mirrored by `EVENT_NAMES` / `EventMap` in `src/lib/contracts/events.ts`; typed `on()` wrapper in `contracts/ipc.ts`, and every frontend `listen` call migrated to it. The parity test pins the consts to `events.rs` and rejects literal event names at any `Emitter` call. Review round 1: APPROVED with 5 nits; fixed 1, 2, 3, 5, and rejected 4 (a `listen` guard, out of scope, for its own Issue). Tests: `pnpm check` 0 errors; `cargo test` 1200 passed, 0 failed; full suite (`pnpm vitest run && pnpm build`) 407 files, 9625 passed, 1 skipped, 1 todo, build exit 0.
