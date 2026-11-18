# 21: The tab strip shows what is off screen, tabs shrink, and the sidebar toggle stops covering them

**Origin:** design review 2026-11-17, proposals P34 (overflow half; counted here) and P98 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/shell-tabs-navigation.html`, research `.scratch/shell-sidebars-ux/research/verdict-sh-tabs.md` and `breakdown.md` (old ticket 09). Replaces `.scratch/open-itens/issues/153-tab-strip-shows-overflow-hides-md-extension.md` criteria 2 and 3 (the `.md` label part is new 22, the breadcrumb part new 24).

**What to build:** in `src/lib/core/markdown-editor/EditorTabs.svelte` and the toggle in `src/lib/app/AppShell.svelte`:

1. **Shrinking tabs.** Unpinned tabs shrink from 220 px down to 100 px before the strip scrolls; pinned tabs keep their size. The title no longer stops at 160 px (`max-w-40` at `EditorTabs.svelte:88` goes).
2. **Edge fades and a tab list.** When tabs are off screen, a 34 px fade shows at that edge (`pointer-events-none`; `scroll-padding-inline` equal to the fade width so the existing reveal at `:41` clears it). A "List all tabs" button (shadcn `DropdownMenu`, `aria-label="List all tabs"`) shows a count of hidden tabs. It opens a menu with one row per tab in strip order: dirty dot (`isTabDirty && !isVirtualTab`, the rule at `:64`), kind icon, name, pin mark, active row marked; choosing a row calls `switchTab(index)`. The button is always visible; the badge only while tabs are hidden.
3. **Wheel.** A vertical wheel over an overflowing strip scrolls it sideways (`onwheel` on the scroller, Svelte's `wheel` is not passive); `preventDefault` only when it overflows and `|deltaY| > |deltaX|`.
4. **Toggle never covers a tab.** With the right sidebar hidden on a note, the wrapper leaves 40 px at its right end (`pr-10`), from `$derived(!hidesRightSidebar(editorStore.activeTabPath) && !settingsStore.layout.rightSidebarVisible)`.
5. **Toggle is a real toggle** (`AppShell.svelte:190-196`): `aria-label="Right sidebar"`, `aria-pressed`, a pressed fill (`bg-accent`), the focus-visible ring classes of `EditorView.svelte:98`. Its `title` stays exactly "Hide right sidebar" / "Show right sidebar" (selected by `sidebars.spec.ts:70`, `note-action-bar.spec.ts:18,20`, `AppShell.test.ts:385`).
6. **Structure.** A non-scrolling wrapper (`h-10 bg-tab-bar`, the divider box-shadow moved from `.editor-tabs-bar` `:118-122`, `relative`, `data-tauri-drag-region`) holds the scroller and the list button. The scroller keeps `editor-tabs-bar`, `role="tablist"`, `overflow-x-auto` and `data-tauri-drag-region` (both carry it, or the empty area right of the last tab stops dragging the window). The width classes go on `ContextMenu.Trigger` (bits-ui renders its own wrapper `div`, which is the strip's flex item): unpinned `flex-[0_1_220px] min-w-[100px]`, pinned `shrink-0`; the inner tab becomes `w-full min-w-0`, the title `min-w-0 truncate`. The inline close button stays. The `{#each}` stays unkeyed (a keyed each throws `each_key_duplicate` in production on a reachable duplicate path, `path-change.service.ts:179`).
7. **Pure helpers** in new `src/lib/core/markdown-editor/editor-tabs.logic.ts`: `edgeFades(scrollLeft, clientWidth, scrollWidth)` (2 px slack, none when not overflowing) and `countHiddenTabs(scrollerRect, tabRects)` (a tab counts when more than 4 px past either edge). Recompute on `scroll`, on a `ResizeObserver` of the scroller and in an effect on `editorStore.tabs.length` (a new tab does not resize the scroller).
8. Help `help/documentation/03-editor.md` Tabs: the list button and the wheel.

Not in this ticket: the prototype's absolute close-button overlay (not in P34's text); appending "Cmd+B" to the toggle `title` (breaks three title selectors); any change to `layout.logic.ts` (the reserve is an inline `$derived` over the existing `hidesRightSidebar`).

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` for `tabs`, `sidebars`, `note-action-bar`, `tasks-view`, `collection-block` and `live-preview/click-reveal` (they select `.editor-tabs-bar`).

- [x] Failing test first, new `src/tests/lib/core/markdown-editor/editor-tabs.logic.test.ts`: `edgeFades` gives no fade when `scrollWidth <= clientWidth`, left only when `scrollLeft > 2`, right only while `scrollLeft + clientWidth < scrollWidth - 2`; `countHiddenTabs` counts a tab more than 4 px past either edge, not one within 4 px, and 0 for an empty list.
- [x] `EditorTabs.test.ts` (real stores, `ResizeObserver` stub as `EventCalendarView.test.ts:8-13`, stubbed geometry): an overflowing scroller scrolled to the middle shows both fades and the badge; nothing overflowing shows neither; opening one more tab without a resize updates the badge.
- [x] Every direct child of `.editor-tabs-bar` for an unpinned tab has `flex-[0_1_220px]` and `min-w-[100px]`, a pinned one `shrink-0`, and nothing in the strip has `max-w-40` (asserted on the scroller's children, not on `[role="tab"]`, which would pass without any shrink).
- [x] The list menu has one row per tab in order, a dirty dot only on dirty file tabs, pin marks, the active row marked; choosing the third row makes `editorStore.activeIndex` 2 and closes the menu. `menu-item-anatomy.test.ts` stays green. If the DropdownMenu does not open under jsdom by click, follow an existing DropdownMenu test in the repo.
- [x] A vertical `WheelEvent` on an overflowing scroller raises `scrollLeft` and is `defaultPrevented`; on a non-overflowing one, or with `|deltaX| > |deltaY|`, it is not.
- [x] With a note active and `rightSidebarVisible` false the wrapper has `pr-10`; with it true, or a kanban, canvas, `.view`, tags, tasks, graph or calendar tab active, it does not. Wrapper and `.editor-tabs-bar` both carry `data-tauri-drag-region`; `role="tablist"` is on `.editor-tabs-bar`.
- [x] `AppShell.test.ts`: the toggle has `aria-label="Right sidebar"`, `aria-pressed` follows `rightSidebarVisible` both ways, and it has the ring classes; "renders one right-sidebar toggle" passes unchanged.
- [x] E2E `tabs.spec.ts`: the existing overflow and reveal test passes unchanged; a new case shows unpinned tabs between 100 and 220 px wide when overflowing, and shrinking below natural width before the strip scrolls.
- [x] E2E `sidebars.spec.ts` (hide the sidebar first, as `note-action-bar.spec.ts:16-21`; the E2E vault starts with it visible): with the strip overflowing, the right edges of `.editor-tabs-bar` and of the list button are at or left of the toggle's left edge at both scroll ends.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P34 (overflow half).** The tab strip has no overflow cue or control, fixed 160 px titles, and no reorder. Tabs flex from about 220 px down to about 100 px; map the wheel to horizontal scroll; add edge fades and a list-all-tabs menu with dirty dots. (Reorder and tooltip are new 22.)
- **P98.** The right sidebar toggle covers the tab strip and is not accessible. While the sidebar is hidden, pad the end of the tab strip by the toggle's width; add `aria-pressed` and the shared focus ring.

## Problem

The macOS overlay scrollbar is invisible at rest, so an overflowing strip gives no cue, no list and no wheel mapping; tabs never shrink (`shrink-0` at `EditorTabs.svelte:53`) and titles stop at 160 px. The toggle is `absolute right-2 top-[7px]` over the window root, so with the sidebar hidden it sits over the last tab, and it has only a `title` (no `aria-pressed`, no focus ring).

## Evidence

Checked at `ab143a411`.

- `src/lib/core/markdown-editor/EditorTabs.svelte:46` the strip (`overflow-x-auto`, no fade, no list, no wheel handler); `:53` `shrink-0` on every tab; `:88` `truncate max-w-40`; `:38-42` the reveal effect; `:118-122` the divider style.
- `src/lib/app/AppShell.svelte:189-197` the toggle (`absolute right-2 top-[7px] z-20 size-6`, `title` only); the root at `:187` is `relative`. Default `rightSidebarVisible` is false (`settings.store.svelte.ts:65`).
- bits-ui 2.20.6 `ContextMenu.Trigger` renders its own `div` around the children snippet, so width classes on the inner tab would leave the flex item unsized.
- `.editor-tabs-bar` is selected in `tabs.spec.ts:50`, `tasks-view.spec.ts:175`, `collection-block.spec.ts:63`, `live-preview/click-reveal/collection-block.spec.ts:106,155` and `e2e/fixtures/helpers.ts:128`.

## Sequence with

- `EditorTabs.svelte` and `EditorTabs.test.ts`: new 22 and new 23 (chained after this one), new 34 (rewrites the band class lines; blocked by this ticket).
- `AppShell.svelte`: new 05 (right sidebar block and `:277`), new 26 (`:188` comment), new 09 (`:279`), new 34.
- `layout.logic.ts` and `layout.service.ts`: this ticket does not edit them, but new 05 adds `anyRightPanelVisible`, new 26 rewrites `hidesRightSidebar`, and new 01 adds `setRightPanelVisible`; rebase only.
- `help/documentation/03-editor.md`: new 22, 23, 24, 25, 27, 31, 32, 33.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: none for this ticket. Defaults (not individually answered): 21.1 (old 09.1) the "List all tabs" button is always visible (about 28 px of strip) with the badge only while tabs are hidden.
- 2026-11-18, deliver (branch `issue/21-tab-strip-overflow-shrink`): tab strip gets edge fades, a hidden-tab count badge and a "List all tabs" menu, vertical wheel scrolls it, unpinned tabs shrink between 100 and 220 px, the strip leaves room (`pr-10`) for the right-sidebar toggle, which gains `aria-label`, `aria-pressed` and a focus ring. Deliver fix: the hidden-tab badge's `text-[9px]` raised to the 11 px chrome floor (chrome-type-scale.test.ts). Full suite: run 1 failed 2 tests in chrome-type-scale.test.ts; run 2 at ab41923f1 exit=0, 651 files, 17268 passed, 54 skipped, 1 todo. Reviews: round 1 APPROVED, round 2 APPROVED (after the fix round).
