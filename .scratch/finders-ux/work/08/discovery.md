# 08 discovery: Tags view keeps its list while refreshing

No `spec.md` in `.scratch/finders-ux/`; the README ticket table is the only feature doc.

## Files that change

- `src/lib/features/tags/tags.store.svelte.ts:3-28`: add `hasLoaded` `$state(false)`, getter, `setHasLoaded()`, cleared in `reset()` (`:22`).
- `src/lib/features/tags/tags.service.ts:43-46`: `buildTagIndex` sets `hasLoaded` true after `setTagTree`/`setTotalTagCount` succeed. The catch (`:52`) leaves tree, count and `hasLoaded` untouched (already the case for tree and count).
- `src/lib/features/tags/TagsView.svelte:52`: header count shown when `!isLoading || hasLoaded`.
- `src/lib/features/tags/TagsView.svelte:79`: "Indexing tags..." only when `isLoading && !hasLoaded`; otherwise the existing empty / keyed `{#each}` branches render, so `TagItem` instances (and their local `open` state, `TagItem.svelte:19`) survive a refresh.

## Tests

- New `src/tests/lib/features/tags/TagsView.refresh.test.ts` (jsdom). Mocks only `@tauri-apps/api/core` (`invoke`), real `tags.service`, `tags.store`, `tags.logic`. Prior art: mount/flushSync pattern from `TagsView.test.ts:27-52`; fake-timer debounce + gated `invoke` from `tags.service.test.ts:263-330`. Seed the "loaded" state through a real `buildTagIndex()` so `hasLoaded` comes from the service. Cases:
  - pending refresh keeps `work` row, no "Indexing tags..."; header count visible.
  - expanded parent (`project` > `project/alpha`) still expanded after refresh resolves with the same tree.
  - zero-tag vault after first successful build shows "No tags found" during refresh.
  - first load (empty store) shows "Indexing tags..." until IPC resolves; failed first build -> `hasLoaded` false, "No tags found".
  - failed refresh keeps previous tree on screen.
- `tags.store.test.ts`: `hasLoaded` default, setter, `reset()` clears it.
- `tags.service.test.ts`: `hasLoaded` true after success; IPC error leaves it false (existing "clears loading state even on IPC error" stays as is).

## Defaults taken

- `hideRareTags` is on by default (threshold 10): test tags use counts >= 10 so the filter does not hide them.
- Scroll position is not asserted in jsdom (no layout); it follows from the list container and rows staying mounted.
- No header refresh spinner (Issue point 5).

## Risks

- Module-level debounce/single-flight state in `tags.service.ts` leaks across tests: `resetTags()` in `beforeEach` cancels the timer and clears the flags; pending `invoke` promises are resolved or left orphaned per test.
