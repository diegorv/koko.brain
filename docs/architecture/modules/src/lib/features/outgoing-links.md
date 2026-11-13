---
summary: "Right-sidebar panel listing the active note's outgoing wikilinks and unlinked mentions, fetched from the Rust VaultIndex."
---

## Responsibility

Owns the Outgoing links section for the active markdown note: when open, it asks the Rust VaultIndex for the note's wikilinks (resolved to target paths) and for unlinked mentions of other note names in the active body, keeps both in a module-level store, and renders them with click-to-open for resolved links. It does not parse links or resolve targets (Rust, src-tauri/src/vault), own backlinks (features/backlinks), or own the sidebar section chrome (core/layout). outgoing-links.logic.ts is an empty placeholder.

## Key files

- `src/lib/features/outgoing-links/OutgoingLinksPanel.svelte`: Sidebar component: open state, fetch triggers on open, active path change and vaultIndexVersion change, resolved and broken link rendering.
- `src/lib/features/outgoing-links/outgoing-links.service.ts`: The IPC boundary: fetchOutgoingLinksV2 runs both commands in parallel, dedupes links by lowercase target, drops stale results, writes the store. resetOutgoingLinks clears store and skip cache.
- `src/lib/features/outgoing-links/outgoing-links.store.svelte.ts`: outgoingLinks and unlinkedMentions as getters with setters and reset.
- `src/lib/features/outgoing-links/outgoing-links.types.ts`: Re-exports the generated OutgoingLink and OutgoingUnlinkedMention types.
- `src-tauri/src/vault/index.rs`: VaultIndex lookups behind the two commands.

## State

- outgoingLinks and unlinkedMentions: module-level $state, memory only, cleared by reset().
- lastFetchedOutgoingKey: module Map in the service, keyed by path, holding a snapshot of vaultIndexVersion, content length and path used to skip redundant IPC. Cleared by resetOutgoingLinks().
- Panel open state and lastFetchedPath: component-local in OutgoingLinksPanel.svelte.

## Collaborators

- `IPC:get_outgoing_links_v2`: Wikilinks of the active note with resolved target paths.
- `IPC:get_outgoing_unlinked_mentions_v2`: Unlinked mentions, called with the path and the active tab's body.
- `event:vault-index-updated`: Not listened to here. The vault listeners route it into vaultStore.vaultIndexVersion, which the panel effect reads.
- `src/lib/core/vault`: vaultIndexVersion for the skip key and refetch trigger.
- `src/lib/core/editor`: activeTabPath, tab content and fileType; openFileInEditor on click.
- `src/lib/core/layout`: SidebarSection wraps the panel.
- `src/lib/contracts`: Typed call() wrapper and the generated link types.
- `src/lib/utils`: dedupeInflight, isStillCurrentPath and debug helpers.
- `src/lib/app`: AppShell mounts the panel when settingsStore.layout.outgoingLinksVisible is true; app-lifecycle calls resetOutgoingLinks.
- `src/routes/(app)`: +layout.svelte resets the store when the active tab path is cleared.

## Gotchas

- outgoing-links.logic.ts is an empty placeholder (export {} only). The former TypeScript link extraction moved to Rust, but Rust doc comments in src-tauri/src/vault/index.rs still refer to the removed TypeScript functions.
- Deduplication by lowercase target happens in the TypeScript service (deduplicateByTarget), not in Rust. Rust returns one entry per wikilink occurrence.
- The skip key is vaultIndexVersion, content length and path. An edit that keeps the same body length does not change the key, so a fresh fetch depends on vaultIndexVersion advancing.
- Results are dropped when the active path changed while IPC was in flight, so the store keeps its previous contents.
- The service logs and swallows IPC errors, and the panel also catches. On failure the panel keeps what it showed before.
- dedupeInflight keys by path only, so a second call for the same path during an in-flight fetch returns the first promise even with different content.
- The panel fetches only while expanded. Closing it does not clear the store; the layout and lifecycle resets do.
- The Rust structs are ts-rs exported, so changing them requires regenerating src/lib/contracts/generated with cargo test.
