---
summary: "Tags panel: hierarchical tag tree built from the Rust vault index, with per-tag colors and a Tags editor tab."
---

## Responsibility

Owns the Tags view. It fetches tag aggregates through get_all_tags_v2, turns the flat list into a nested tree split on "/" (case-insensitive segment keys, subtree totals), sorts and filters that tree, and holds the result in tagsStore. TagsView renders the tree, lets the user pick a tag color (stored in settings), and opens search for a clicked tag. It also owns the Tags virtual editor tab (open, close, toggle) and a debounced single-flight rebuild triggered by vault index version changes. It does not compute tag data, own the color map (src/lib/utils/tag-colors.ts and settingsStore), or own the search UI.

## Key files

- `src/lib/features/tags/tags.service.ts`: get_all_tags_v2 call, rebuild orchestration (debounce plus single flight), Tags tab open, close, toggle, resetTags.
- `src/lib/features/tags/tags.logic.ts`: Pure tree helpers: buildTagTree, filterTagTree, sortTagTree, tagTreeShape.
- `src/lib/features/tags/tags.store.svelte.ts`: tagTree, sortMode, hideRareTags, isLoading, totalTagCount.
- `src/lib/features/tags/TagsView.svelte`: Panel UI: filter and sort toggles, rare-tag filter, tag color writes, vaultIndexVersion effect that schedules rebuilds.
- `src/lib/features/tags/TagItem.svelte`: Recursive tree row, collapsible when a node has children.
- `src/lib/features/tags/tags.types.ts`: TagEntry, TagTreeNode, TagSortMode.

## State

- tagsStore: module-level $state with tagTree, sortMode, hideRareTags, isLoading, totalTagCount.
- Module flags in tags.service.ts: isBuilding, pendingRebuild, and the debounced trigger.
- A virtual tab at TAGS_VIRTUAL_PATH held in editorStore.tabs.

## Collaborators

- `IPC:get_all_tags_v2`: Returns TagAggregate[] from the in-memory VaultIndex. Called by buildTagIndex and also directly by src/lib/app/editor-host.ts.
- `src/lib/core/editor`: Tags tab is an editor tab; uses editorStore tab operations, TAGS_VIRTUAL_PATH and findTabIndex.
- `src/lib/core/vault`: TagsView reads vaultIndexVersion to trigger rebuilds.
- `src/lib/core/settings`: Tag colors from settingsStore.tagColors, written with updateTagColors.
- `src/lib/utils`: tag-colors helpers, debounce and debug logging.
- `src/lib/features/search`: TagsView calls openSearch with a tag: query.
- `src/lib/contracts`: Typed call() wrapper.
- `src/lib/app`: app-lifecycle calls buildTagIndex for the deferred vault-open build and resetTags on teardown; commands imports toggleTagsTab; EditorView mounts TagsView.

## Gotchas

- Call buildTagIndex directly only for the deferred vault-open build. Reactive rebuilds must go through scheduleTagIndexRebuild, which debounces and serializes overlapping builds because undebounced saves produced concurrent duplicate rebuilds.
- The tree is keyed by lowercased segments, so Tag and tag merge into one node. fullPath keeps the first casing seen.
- The rare-tag filter lives in TagsView.svelte as a $derived through filterTagTree, not in tagsStore. Only hideRareTags is stored.
- sortTagTree returns a sorted copy of the list it is given but assigns node.children on the existing nodes, and updateTagSort reuses the existing tree, so sorting rewrites the store's nodes.
- resetTags cancels the debounced trigger, clears build flags, resets the store and closes the Tags tab.
- The Tags tab is a virtual tab with empty content and fileType 'tags', so the editor treats it as a non-file tab.
- The folder listens to no Tauri event. Its only reactive trigger is vaultStore.vaultIndexVersion inside TagsView.
- editor-host.ts reads get_all_tags_v2 itself and does not depend on tagsStore, which rebuilds only while the view is mounted.
