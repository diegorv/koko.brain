# Issue 07 discovery

No `spec.md` exists for ux-polish; the Issue and `work/layout.md` (P1, P13) are the source.

## Files that change

- `src/lib/core/markdown-editor/EditorTabs.svelte`
  - script (lines 1-26): `let strip = $state<HTMLElement>()` and a `$effect` reading `editorStore.activeIndex`, `editorStore.tabs.length` and `strip`, then `strip.querySelectorAll('[role="tab"]')[activeIndex]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })`. Querying the strip avoids an element-ref array that would go stale on close/reorder.
  - line 29: `bind:this={strip}` on `.editor-tabs-bar`.
  - lines 36-40: tab gets `h-8 border-b-2` in the base classes; pinned `px-2`, unpinned `px-3` (no `py-*`); active `border-b-primary`, inactive `border-b-transparent`.
- New `src/tests/lib/core/markdown-editor/EditorTabs.test.ts` (jsdom).
- `src/tests/lib/app/EditorView.test.ts:16`: add `Element.prototype.scrollIntoView ??= () => {};` next to the `scrollTo` stub. It mounts EditorView (and so EditorTabs) with open tabs; jsdom has no `scrollIntoView`, so the new effect would throw there.
- `e2e/specs/tabs.spec.ts`: two new tests.

## Plan

1. Unit test first: mount `EditorTabs` with real `editorStore` (`reset()` + three `addTab`), stub + `vi.spyOn(Element.prototype, 'scrollIntoView')`, clear the spy, `editorStore.setActiveIndex(0)`, `flushSync()`, assert the last call's `this` is the tab with `aria-selected="true"` and args contain `inline: 'nearest'`. Run, see it fail.
2. Add the effect + `bind:this`, see it pass. Commit.
3. Heights: class change. E2E: pin one tab, compare bounding-box heights of the pinned, an inactive and the active tab. Commit.
4. E2E scroll: `setViewportSize({ width: 640, ... })`, open all six vault notes, assert the strip overflows (`scrollWidth > clientWidth`, so the test is not vacuous), then the active tab box lies inside `.editor-tabs-bar`'s box; press `Mod+Shift+BracketLeft` until the first tab is active (cycling wraps? use repeated BracketLeft from the last tab, count = tabs - 1), assert again.

## Prior art

- `src/tests/lib/app/EditorView.test.ts` (mount + real `editorStore`, ResizeObserver stub for bits-ui).
- `e2e/specs/tabs.spec.ts` (`openFile`, `pressShortcut`), `e2e/specs/event-calendar.spec.ts:197` (`setViewportSize`).

## Risks / defaults

- Default: `h-8` includes the 2px border (Tailwind preflight `box-sizing: border-box`), so all tabs are exactly 32px.
- Default: the effect tracks `strip` so it runs when the strip first mounts (0 to 1 tabs) after `bind:this` sets it.
- Narrow viewport may not overflow if sidebars collapse; the overflow precondition assertion makes that fail loudly rather than pass vacuously.
- `data-tauri-drag-region` and macOS overlay scrollbars are not checked (Issue Notes).
