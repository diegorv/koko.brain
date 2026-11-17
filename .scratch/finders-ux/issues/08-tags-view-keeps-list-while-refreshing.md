# 08: Tags view keeps its list and expanded tags on screen while it refreshes

**Origin:** design review 2026-11-17, proposal P30, tags half (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/finders-search-tags-graph.html`, research `.scratch/finders-ux/research/verdict-background-refresh.md` (ticket A) and `.scratch/finders-ux/research/breakdown.md` (fold into 159). Absorbs `.scratch/open-itens/issues/159-tags-view-keeps-list-expanded-tags-screen.md`. The search half of P30 is 05.

**What to build:** `TagsView.svelte:41-46` schedules a rebuild on mount and on every `vaultIndexVersion` bump. `buildTagIndex` sets `tagsStore.setLoading(true)` unconditionally (`tags.service.ts:27`), and the template swaps the whole list for "Indexing tags..." while loading (`TagsView.svelte:79-80`), which destroys every `TagItem`. `TagItem` keeps its expanded state in local `$state` (`TagItem.svelte:19`), so it is lost, and the scroll position resets.

1. Add `tagsStore.hasLoaded`: a getter, set true after a successful build, cleared by `reset()`. A failed build leaves it as it was.
2. Show "Indexing tags..." only while `isLoading && !hasLoaded`. A refresh over a loaded tree keeps the keyed rows (`TagsView.svelte:85`) mounted and swaps the data in place, so expanded tags and the scroll position survive.
3. The header count (`TagsView.svelte:52-56`) stays visible during a refresh once `hasLoaded` is set.
4. A tree-is-empty check is not a substitute for the flag: with it, a vault with zero tags would show "Indexing tags..." on every refresh.
5. No header refresh spinner.
6. A refresh that fails keeps the previous tree in the store and on screen (do not write partial data on error).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing test first, in a new `src/tests/lib/features/tags/TagsView.refresh.test.ts` (`TagsView.test.ts` mocks `tags.service`, so this file mocks only `@tauri-apps/api/core`, like `tags.service.test.ts`): with `tagsStore` holding a loaded tree with tag `work` and `get_all_tags_v2` left pending, mount `TagsView` and advance past the 300 ms debounce; the `work` row is still in the DOM and "Indexing tags..." is not.
- [ ] A parent tag expanded before a refresh is still expanded after the refresh resolves with the same tree.
- [ ] A vault with zero tags, after its first successful build, shows "No tags found" (not "Indexing tags...") while a refresh is in flight.
- [ ] The header count stays visible during a refresh after the first load.
- [ ] With an empty store (first load), "Indexing tags..." still shows until the IPC resolves; a failed first build leaves `hasLoaded` false and shows "No tags found".
- [ ] A refresh that fails leaves the previous tree on screen; `tags.service.test.ts` "clears loading state even on IPC error" stays green, or is updated with the reason in the commit.
- [ ] `tags.store.test.ts` covers `hasLoaded` and its `reset()`.
- [ ] Only Tauri is mocked; `tags.store` and `tags.logic` are real.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P30 (tags half).** Tags shows the loading line only on the first build.
- **159 (absorbed).** Show the loading message only while no tree has loaded yet; a refresh over an existing tree keeps the keyed rows mounted and swaps the data in place. The header count should not flicker either.

## Problem

Open the Tags tab (the tree is already built at vault open): about 300 ms later the list is replaced by "Indexing tags..." for the length of the `get_all_tags_v2` IPC (measured 0.7 to 1.2 s at 4.5k notes). Expand a parent tag and stay on the tab while any index refresh lands (a save, a watcher event, a Quick Capture): the list blanks again and every tag comes back collapsed at the top.

## Evidence

Checked at `bb57e6165`.

- `src/lib/app/lifecycle/app-lifecycle.service.ts:433`: `buildTagIndex()` at vault open fills the tree.
- `src/lib/features/tags/TagsView.svelte:41-46`: `$effect` on `vaultIndexVersion` (runs on mount) calls `scheduleTagIndexRebuild`; `:52-56` header count hidden while loading; `:79-80` `{#if tagsStore.isLoading}` replaces the list; `:85-86` keyed `{#each}` of `TagItem`.
- `src/lib/features/tags/tags.service.ts:27` `setLoading(true)` before the IPC; `:52` catch; `:54-55` `setLoading(false)` in `finally`.
- `src/lib/features/tags/TagItem.svelte:19`: `let open = $state(false)`.
- `src/lib/features/tags/tags.store.svelte.ts`: no `hasLoaded`; `reset()` at `:22`.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided: no header refresh spinner; first-load detection uses a `hasLoaded` flag, not an empty-tree check.
