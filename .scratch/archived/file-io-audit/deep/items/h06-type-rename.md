# Deep-dive group h06-type-rename

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## rust-writes-5: propagate_type_rename reports success when some notes kept the old type
- claimed severity: stale-state
- anchor: src-tauri/src/commands/vault.rs:356
- scenario: Rename type Project to Initiative while one member note is read-only or was moved since indexing. The rename shows success, but that note keeps _type: Project, a type with no definition, and drops out of the collection with no message.
- evidence given: Per-member read and write errors are skipped with only a debug_log (commands/vault.rs:356-376), and the command still returns Ok(updated) (:423). write_atomic refuses read-only targets (utils/fs.rs:20-23). renameType ignores the returned count and toasts only when the call throws (type-definitions.service.ts:224-230).

## feature-writers-15: renameType loses keystrokes typed during its per-tab write
- claimed severity: minor
- anchor: src/lib/features/type-definitions/type-definitions.service.ts:218
- scenario: While a type rename runs, the user types in an open member note. Keystrokes made during the writeTextFile round trip are replaced by the markSaved sync.
- evidence given: type-definitions.service.ts:215-225 computes from tab.content, awaits the write, then syncExternalContentToEditor(...,true,'none'); editor.store.svelte.ts:130-136.
