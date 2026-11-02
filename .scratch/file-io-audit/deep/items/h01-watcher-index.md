# Deep-dive group h01-watcher-index

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## cross-cutting-11: Watcher treats any read error (non-UTF-8, permission) as a delete and removes the note from all indexes
- claimed severity: stale-state
- anchor: src/lib/app/lifecycle/watcher-handler.service.ts:105
- scenario: An external tool writes a note in Latin-1. The watcher's read_files_batch fails to decode it, so the note is removed from the Rust index, FTS5 and semantic search, and disappears from search, backlinks and tags until a later UTF-8 change.
- evidence given: READ: read_files_batch returns content None for any error (src-tauri/src/commands/files.rs:36-75). watcher-handler.service.ts:105-109 maps null to kind 'delete'.

## external-change-6: The self-save skip hides a real external write or delete from the indexes for up to 15 s after an app save, and the TTL is refreshed by every save
- claimed severity: stale-state
- anchor: src/lib/app/lifecycle/watcher-handler.service.ts:41
- scenario: The user saves N and switches to note M. Within 15 s, a sync tool rewrites or deletes N. The batch is skipped, so backlinks, tags, tasks and search keep N's old content, or keep a deleted N as a ghost row, until N is touched again or the vault is reopened. If N is the active tab, the reload plus the 1 s layout effect refresh the VaultIndex and the TS consumers, but FTS5 and semantic stay stale.
- evidence given: watcher-handler.service.ts:41-44 returns early when every path is a recent save (editor.hooks.ts:47-49). The TTL of 15 s is reset at editor.hooks.ts:24 and :37-44, and is set by every save at :68. The tab reload is not gated (app-lifecycle.service.ts:486). The partial heal runs through +layout.svelte:137-157 into updateIndexesForFile with source 'edit' and no vaultPath (index-updater.service.ts:24-40).
