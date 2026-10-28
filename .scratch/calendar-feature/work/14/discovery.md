# 14 discovery: E2E vault-index mock parity

## Files that change

- `e2e/mocks/vault-index.ts`: `buildEntry` (`:167-191`) gains `isA` from a new `extractIsA(fm)` helper; the `virtualFS.subscribe` hooks (`:437-449`) record each `UpdateResultV2` in a new exported `lastHookResult: Map<string, UpdateResultV2>`.
- `e2e/mocks/tauri-core.ts`: `handleCreateNote` (`:43-45`), `handleUpdateNoteInIndex` (`:103-105`), `handleRemoveNoteFromIndex` (`:107-109`) emit `vault-index-updated`; new `handleRenameNote` registered in `HANDLERS` (`:245-307`). A small `takeHookResult(path)` (get + delete) and `emitIndexUpdated(result)` (the `window.__e2e.events.emit` call from `handleToggleTaskStatus`, `:92-101`) keep the four handlers short.

## Plan

One commit, only those two files (Risks 8, Rollback).

1. `extractIsA`: first of `fm._type`, `fm.type` that is a non-empty string; uppercase its first code point (`normalize_type_casing`, `parsing.rs:85-91`, is per `char`), rest preserved; else `null`.
2. Hooks: `onWrite` -> `set(path, update(...))`; `onRemove` -> `set(path, remove(path))`; `onRename` -> `set(old, remove(old))`, and `set(new, update(new, ...))` when the new file reads.
3. `create_note`: write (hook fires), take and discard the hook result, emit `{ changed: true, affected: [path], version: vaultIndex.version }` unconditionally (`vault.rs:848`). Returns that object (Rust returns the `UpdateResult`).
4. `update_note_in_index` / `remove_note_from_index`: `takeHookResult(path) ?? vaultIndex.update|remove(...)`, emit only when `changed` (`vault.rs:307`, `:891`), return the result.
5. `rename_note({ from, to })`: take the removal results recorded under `from` and every `from + '/'` key; when any changed, emit `{ changed: true, affected: [from, to], version }` and return it, else return `null` (Rust returns `Option<UpdateResult>`, `vault.rs:982-996`).

## Prior art

- `handleToggleTaskStatus` for the guarded emit. No vitest covers `e2e/mocks/` (no test file imports them); the full `bash scripts/e2e.sh` run is the test, run by deliver.

## Defaults for open questions

- "Takes" = consume: the hook entry is deleted when read, so a later index call for the same path without a new write falls back to a fresh compute instead of a stale result.
- Folder rename: `virtualFS.rename` fires `onRename` per child key, never for the folder itself, so a `from`-only lookup would never emit for a folder move while Rust (`rename_note_inner` walks `from` + `from/`) does. The prefix walk keeps the "same conditions as Rust" goal; a file rename is unaffected.
- `_type` and `type` both present: the first non-empty string wins, matching `dedupeCanonicalKeys` (placeholder loses to populated).
- `update` on a hidden or non-markdown path keeps returning `changed: false`, so no emit, as Rust.

## Risks

- Every save, create, delete and rename in every spec now runs the debounced listener refresh (`tauri-listeners.service.ts:121-138`), which may re-run `loadDirectoryTree` when content order changes. Hence the full E2E suite gate.
- A hook entry left unconsumed (a write with no following index call) costs at most one extra or skipped refetch.
