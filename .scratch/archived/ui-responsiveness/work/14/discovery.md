# Issue 14 discovery

No `spec.md` exists for ui-responsiveness; the Issue and `research/D-deep-dive.md` are the source. Builds on `work/04` (synchronous mount seed, `{#key activeViewIndex}` around the table).

## Files that change

- `src/lib/app/EditorView.svelte:83` wrap `<CollectionView>` in `{#key editorStore.activeTab.path}` and pass `path={editorStore.activeTab.path}`.
- `src/lib/features/collection/CollectionView.svelte:27-33` new `path` prop; `:53` `activeViewIndex` starts at the remembered index for `path`, clamped to `definition.views.length - 1` before `seedFromDefinition()` (`:114`) so the sync seed seeds the restored view; a new `$effect` records `activeViewIndex` for the path. The path is captured once at init: the `{#key}` remounts on a path change.
- `src/lib/features/collection/collection.store.svelte.ts` plain (non-reactive) `Map<path, index>` behind `getViewIndex` / `setViewIndex` / `deleteViewIndex` / `viewIndexPaths`; `reset()` clears it. `resetCollection()` (teardownVault, `app-lifecycle.service.ts:639`) already calls `reset()`.
- `src/lib/features/collection/collection.service.ts` `registerCollectionPathChangeConsumer()`: carries entries at `from` and under `from + '/'` to `to`, drops them on delete. Wired in `initializeVault`'s vault-lifetime list (`app-lifecycle.service.ts:246-261`), unwound with it.

## Plan (test-first)

1. `EditorView.test.ts` new describe, two collection tabs (A: 3 views, B: 2 views), switching with `editorStore.setActiveIndex`: (a) A view index 2 -> B shows view 0; (b) back to A shows view 2; (c) MutationObserver across the A->B switch: removed TRs are only A's rows, added TRs only B's (no unfiltered rows built and torn down).
2. `CollectionView.test.ts`: a remembered index above the view count is clamped (harness gains an optional `path`).
3. `collection.store.test.ts` / `collection.service.test.ts`: map methods, `reset` clears, path-change consumer carries file and folder entries and drops on delete.

Prior art: `CollectionView.test.ts` "first render" (MutationObserver), `EditorView.test.ts` mount pattern, `registerEventCalendarPathChangeConsumer`.

## Defaults taken

- Rename/move: carry the entry (folder moves carry children). Delete: drop it.
- The map is session-only and not reactive: it is read once per mount.

## Risks

- Remount resets the per-instance UI state (open popovers, rename buffer) on every tab switch; it was already incoherent across files.
- `collectionSourceMode` toggle already remounted the view; unchanged.
