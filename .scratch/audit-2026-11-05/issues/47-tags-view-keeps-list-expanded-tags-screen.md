# 47: The Tags view keeps its list and expanded tags on screen while it refreshes

**What to build:** TagsView.svelte:41-46 schedules a rebuild on mount and on every vaultIndexVersion bump. `buildTagIndex` sets `tagsStore.setLoading(true)` unconditionally (src/lib/features/tags/tags.service.ts:27), and the template swaps the whole list for 'Indexing tags...' while loading (TagsView.svelte:79-80), which destroys every TagItem. TagItem keeps its expanded state in local `$state` (TagItem.svelte:19), so it is lost, and the scroll position resets. Fix direction: show the loading message only while no tree has loaded yet; a refresh over an existing tree keeps the keyed rows (TagsView.svelte:85) mounted and swaps the data in place. The header count at :52-56 should not flicker either.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in a new src/tests/lib/features/tags/TagsView.refresh.test.ts (TagsView.test.ts mocks tags.service, so this file mocks only @tauri-apps/api/core, like tags.service.test.ts): with tagsStore holding a tree with tag 'work' and `get_all_tags_v2` left pending, mount TagsView and advance past the 300 ms debounce; the 'work' row is still in the DOM and 'Indexing tags...' is not. It fails today.
- [ ] A parent tag expanded before a refresh is still expanded after the refresh resolves with the same tree.
- [ ] With an empty store (first load), 'Indexing tags...' still shows until the IPC resolves.
- [ ] A refresh that fails leaves the previous tree on screen (tags.service.test.ts 'clears loading state even on IPC error' stays green or is updated with the reason in the commit).
- [ ] Only Tauri is mocked; tags.store and tags.logic are real.
- [ ] Frontend gate: `pnpm check` + `pnpm vitest run` pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/low. The list blanks for about 1 s and collapses on each refresh.
- **Trigger:** Open the Tags tab (the tree is already built at vault open): about 300 ms later the list is replaced by 'Indexing tags...' for the length of the get_all_tags_v2 IPC (measured 0.7 to 1.2 s at 4.5k notes). Expand a parent tag and stay on the tab while any index refresh lands (the throttled refresh of a save made just before, a watcher event, a Quick Capture): the list blanks again and every tag comes back collapsed at the top.
- **Evidence (verified by reading code at `5f8003d67`):** app-lifecycle.service.ts:413 buildTagIndex() at vault open fills the tree. EditorView.svelte:73-74 mounts TagsView only while the Tags tab is active, so every open is a fresh mount. TagsView.svelte:41-46 $effect on vaultIndexVersion (runs on mount) -> scheduleTagIndexRebuild. tags.service.ts:90-92 300 ms debounce -> runScheduledRebuild :73-88 -> buildTagIndex :26-57, setLoading(true) at :27 before the IPC, setLoading(false) in finally :55. TagsView.svelte:79-80 '{#if tagsStore.isLoading}' replaces the list; :85-86 keyed each of TagItem. TagItem.svelte:19 'let open = $state(false)'. tags.service.ts:101-105 comment records 0.7-1.2 s rebuilds at 4.5k notes.
- **Related Issues before the audit:** `.scratch/ux-polish/issues/13-tags-filtered-empty-state.md`
- **Source:** audit 2026-11-05, domain `reactivity`, finding `N-reactivity-02` (from reactivity-reactivity-3). Size S.

## Comments
