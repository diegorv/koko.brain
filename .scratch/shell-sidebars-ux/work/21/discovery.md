# Issue 21 discovery: tab strip overflow, shrinking tabs, toggle reserve

No `spec.md` in the feature folder; the Issue is the source. Line numbers at `2c08d559c`.

## Files that change

- New `src/lib/core/markdown-editor/editor-tabs.logic.ts`: `edgeFades(scrollLeft, clientWidth, scrollWidth)` -> `{ left, right }` (2 px slack, both false when `scrollWidth <= clientWidth`); `countHiddenTabs(scroller, tabs)` over `{ left, right }` spans (a tab counts when it extends more than 4 px past either edge).
- `src/lib/core/markdown-editor/EditorTabs.svelte`
  - `:45-46` the strip becomes: wrapper `div` (`relative flex items-end h-10 bg-tab-bar`, divider box-shadow moved from `:118-122`, `data-tauri-drag-region`, `pr-10` from an inline `$derived(!hidesRightSidebar(activeTabPath) && !settingsStore.layout.rightSidebarVisible)`) > `relative flex-1 min-w-0 h-full` scroll-wrap holding the scroller and two 34 px `pointer-events-none` gradient fades (prototype `.scroll-wrap`, so the right fade sits at the scroller's edge, not past the list button) + the list button.
  - The scroller keeps `editor-tabs-bar`, `role="tablist"`, `overflow-x-auto`, `data-tauri-drag-region`; gains `h-full`, `scroll-padding-inline: 34px`, `onscroll` (re-measure), `onwheel` (Svelte 5 marks only touchstart/touchmove passive, `node_modules/svelte/src/utils.js:261`).
  - `:51` `ContextMenu.Trigger` gets `class` (`shrink-0` pinned, `flex-[0_1_220px] min-w-[100px]` unpinned; the shadcn trigger spreads restProps onto bits-ui's div); `:53` the tab drops `shrink-0`, gains `w-full min-w-0`; `:88` title `min-w-0 truncate` (no `max-w-40`). `{#each}` stays unkeyed.
  - Kind icon block `:67-83` moves into a `{#snippet kindIcon(tab)}` shared by the tab and the menu row.
  - List button: shadcn `DropdownMenu` (import style of `NoteActionBar.svelte:18-24`), trigger `aria-label="List all tabs"`, ChevronDown, badge `<span data-hidden-tabs>` only while `hiddenCount > 0`. Rows: dot slot (dot when `isTabDirty && !isVirtualTab`), kind icon, name, `Pin` with `ml-auto` when pinned, active row `aria-current="true"` + `font-medium`; `onclick={() => switchTab(index)}`.
  - Measuring: `measure()` sets `fades` and `hiddenCount`; called from `onscroll`, a `ResizeObserver` on the scroller (effect keyed on `strip`), and an effect on `editorStore.tabs.length`.
- `src/lib/app/AppShell.svelte:190-196` toggle: `aria-label="Right sidebar"`, `aria-pressed`, `bg-accent text-accent-foreground` when pressed, `focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50` (`EditorView.svelte:98`); titles unchanged.
- `help/documentation/03-editor.md` Tabs: list button, shrinking, wheel.
- E2E: `e2e/specs/tabs.spec.ts` (new width case), `e2e/specs/sidebars.spec.ts` (new toggle-clearance case).

## Tests (prior art)

- New `src/tests/lib/core/markdown-editor/editor-tabs.logic.test.ts` (plain node).
- `src/tests/lib/core/markdown-editor/EditorTabs.test.ts`: ResizeObserver stub as `EventCalendarView.test.ts:8-13`; geometry stubbed on `Element.prototype` (`getBoundingClientRect`, `scrollWidth`, `clientWidth`, `scrollLeft`) computed from tab index so a new tab gets a rect; DropdownMenu opened by `pointerdown` + ticks as `tasks.fixture.ts:172-178`; classes asserted on `.editor-tabs-bar` children; wheel via `new WheelEvent('wheel', { deltaY, cancelable: true })`; reserve cases per virtual path / file extension with real `settingsStore`.
- `src/tests/lib/app/AppShell.test.ts:368-388`: aria-label, aria-pressed both ways, ring classes.

## Risks and defaults

- jsdom has no layout: fades and badge are proven only with stubbed geometry; real widths only in E2E.
- The list button is always visible (Issue comment default 21.1). Badge text is the hidden count.
- "More than 4 px past an edge" read as the tab's overflow beyond the scroller edge exceeds 4 px.
- The menu row icon reuses the tab icon sizes (`size-3.5`), no extra margin (menu-item-anatomy).
