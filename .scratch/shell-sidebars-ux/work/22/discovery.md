# Issue 22 discovery: tab drag reorder, hover path, no `.md` in labels

No `spec.md` in the feature folder; the Issue and `research/verdict-sh-tabs.md` (T2, T3) are the source. Line numbers at `2dbc9ec61`. Same strip as `work/21`; only the differences are listed.

## Files that change

- `src/lib/core/editor/editor.logic.ts:73-103` beside `reorderTabsAfterPinChange`: `clampTabInsertion(tabs, from, to)` (pinned tab into `[0, boundary]`, unpinned into `[boundary, n]`, shared by `moveTab` and the strip's marker), `moveTab(tabs, activeIndex, from, to)` (insertion index, `to > from` minus one, same objects, active followed by object identity so it stays on the same path, no-op returns the input array), `tabTooltipText(tab, vaultPath)` (`relativePath`, `utils/path.ts:98`).
- `src/lib/core/editor/editor.store.svelte.ts:146-153`: `moveTab(from, to)` assigns `tabs` and `activeIndex` like `togglePin`.
- `src/lib/core/markdown-editor/EditorTabs.svelte`
  - `:136-146` the tab: `draggable="true"`, `aria-label={tab.name}`, `title={tabTooltipText(tab, vaultStore.path)}`, `ondragstart` (sets only `application/x-kokobrain-tab` = index, `effectAllowed = 'move'`, remembers `dragFrom`).
  - `:148` dirty dot `title="Unsaved changes"`; `:155` label `isMarkdownNoteTab(tab) ? stem(tab.path) : tab.name`. Close button `aria-label` and the list menu row keep `tab.name`.
  - `:120-128` scroller gains `relative`, `ondragover` / `ondrop` / `ondragleave` / `ondragend`, all gated on `dataTransfer.types.includes(TAB_DRAG_TYPE)` and a known `dragFrom`. Insertion index from tab midpoints (`[role="tab"]` rects), clamped by `clampTabInsertion`; one `data-tab-drop-marker` div absolutely placed at the slot's left edge (scroll-relative); auto-scroll 14 px per dragover within 40 px of the scroller edges (prototype `shell-tabs-navigation.html:895-921`).
- `help/documentation/03-editor.md:5-26` Tabs: drag to reorder, hover path, label without `.md`.
- E2E: every rendered-tab-text assertion ending in `.md` (helpers `expectTabActive` callers, `hasText: 'X.md'`, `toContainText('X.md')` on `[role="tab"]` / `activeTab(page)`, variables such as `dailyNote`). Substring matches without `.md` (`'Roadmap'`) stay valid. New cases in `e2e/specs/tabs.spec.ts`.

## Tests (prior art)

- `src/tests/lib/core/editor/editor.logic.test.ts:159-214` (`reorderTabsAfterPinChange`) for `moveTab` / `tabTooltipText`.
- `src/tests/lib/core/editor/editor.store.test.ts:305-339` (`togglePin`) for `moveTab`.
- `src/tests/lib/core/markdown-editor/EditorTabs.test.ts:231-286`: geometry stubs on `Element.prototype` (`getBoundingClientRect` by tab index). Drag events built as `new Event('dragover', { bubbles, cancelable })` with `dataTransfer` and `clientX` defined on the event (jsdom has no `DragEvent`).
- E2E `rail-shell.spec.ts:897-905` (`dragTo` onto `folderButton`) for the real drag and the inverse Files-folder case.

## Risks and defaults

- jsdom has no layout: midpoint and marker math is proven with stubbed rects; real drag only in E2E (Chromium). WKWebView custom-MIME drag inside a `data-tauri-drag-region` strip is not verified here (research note).
- A pinned virtual tab: "a virtual tab shows its name only" wins, so no "Pinned" line.
- `vaultStore.path` null (no vault): the tooltip shows `tab.path` unchanged.
- The list menu row keeps `tab.name` (the Issue names only the label span).
- `{#each}` stays unkeyed (research T2 point 3).
