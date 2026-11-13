---
summary: "Backlink data for the active note: Rust VaultIndex bootstrap, IPC fetches, store and sidebar panel."
---

## Responsibility

Owns the frontend view of what links to the active note. The service bootstraps the Rust VaultIndex through scan_vault_v2_cached, fetches linked mentions and relationship backlinks, and writes them to backlinksStore with per-path version caches and active-tab guards. BacklinksPanel renders the sidebar section and LinkItem renders one linked-mention row. It does not own the index or the backlink resolution rules (Rust, src-tauri/src/vault), outgoing links, or tags.

## Key files

- `src/lib/features/backlinks/backlinks.service.ts`: IPC calls, VaultIndex bootstrap queue (buildIndex, rebuildIndex, resetBacklinks), fetch functions with dedupe and stale guards.
- `src/lib/features/backlinks/backlinks.store.svelte.ts`: Reactive state for linked mentions, unlinked mentions, relationship backlinks and the unlinked dirty flag.
- `src/lib/features/backlinks/backlinks.logic.ts`: Pure conversion from the Rust NoteEntryV2 payload to the panel's BacklinkEntry.
- `src/lib/features/backlinks/BacklinksPanel.svelte`: Right-sidebar section: fetches on open and on vault index version changes, renders linked mentions and relationships.
- `src/lib/features/backlinks/LinkItem.svelte`: One linked-mention row with snippet and open-in-editor click.
- `src/lib/features/backlinks/backlinks.types.ts`: BacklinkEntry and ContextSnippet; re-exports WikiLink from the generated contracts.

## State

- Service module variables vaultPath, isBuilding, pendingRebuild and inflightBuild, which serialize VaultIndex scans.
- Per-path caches lastFetchedBacklinksVersion and lastFetchedUnlinkedVersion, valued by vaultStore.vaultIndexVersion.
- backlinksStore: linkedMentions, unlinkedMentions, relationshipBacklinks, unlinkedDirty (module-level $state behind getters).

## Collaborators

- `IPC:scan_vault_v2_cached`: Loads or reconciles the Rust VaultIndex for a vault path (buildIndex).
- `IPC:get_backlinks_v2`: Linked mentions of the active note (fetchBacklinksV2).
- `IPC:get_relationship_backlinks_v2`: Frontmatter relationship sources (fetchRelationshipBacklinks).
- `IPC:get_unlinked_mentions_v2`: Called by computeUnlinkedMentionsForFile, which has no production caller outside tests.
- `src/lib/core/editor`: Active tab path for stale-result guards and panel state; openFileInEditor on row click.
- `src/lib/core/vault`: vaultIndexVersion, indexReady and isOpen drive refetches and panel state.
- `src/lib/core/layout`: SidebarSection hosts the panel.
- `src/lib/features/event-calendar`: ShowInCalendarButton rendered inside LinkItem.
- `src/lib/utils`: dedupeInflight and isStillCurrentPath wrap fetches; debug and perf helpers.
- `src/lib/contracts`: Typed call() wrapper and the WikiLink type.
- `src/lib/app`: AppShell mounts the panel; app-lifecycle calls buildIndex and resetBacklinks; watcher-handler calls rebuildIndex; boot registers the content invalidation listener that calls markUnlinkedDirty.
- `src/routes/(app)`: The layout's tab-switch effect calls fetchBacklinksV2 and markUnlinkedDirty, and clears linked and unlinked mentions when no tab is active.

## Gotchas

- Unlinked mentions are wired but not shown: computeUnlinkedMentionsForFile and the unlinkedMentions getter have no production reader. The panel renders only linked mentions and relationships, while markUnlinkedDirty is still called from boot and the app layout.
- Linked-mention snippets carry linkStart and linkEnd of 0 because the Rust payload has one body-leading snippet, so LinkItem shows no link highlight and an empty snippet yields no preview row.
- fetchBacklinksV2 skips the IPC when vaultIndexVersion equals the value last written for that path. A failed fetch does not update the cache, so the next call retries. fetchRelationshipBacklinks has no such cache.
- resetBacklinks deliberately leaves isBuilding and inflightBuild alone: clearing them during teardown would let a new vault start a second concurrent scan that could overwrite the Rust index with the old vault's entries. It clears vaultPath, pendingRebuild, the path caches and the store.
- runBuildIndex resets isBuilding in its finally before the queued rerun, and the rerun must stay outside the finally. Moving the reset below the rerun deadlocks, and moving the rerun inside finally discards the queued caller's outcome.
- Fetch and build functions catch and log IPC errors instead of rethrowing, because the in-flight promise is shared with queued callers. Callers keep the prior store contents on failure.
- The panel refetches only while its section is expanded, and its path-change effect resets the store and collapses the section when the active tab changes while expanded. The app layout still fetches linked mentions on every tab switch, whether the panel is open or not.
- No Tauri event listener lives here. Refresh follows vaultStore.vaultIndexVersion.
- backlinks.types.ts re-exports WikiLink from the contracts, and the generated WikiLink.ts names this path in a doc comment emitted from Rust (src-tauri/src/vault/entry.rs), so moving the file means updating that Rust doc comment.
