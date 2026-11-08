# 07: The active editor tab scrolls into view, and all tabs share one height

**What to build:** When a tab becomes active (a new note opens at the end of the strip, Cmd+Shift+] / [ cycling, a session restore), the tab strip scrolls so that tab is fully visible. Today `EditorTabs.svelte` (`src/lib/core/markdown-editor/EditorTabs.svelte`, about line 29) is `overflow-x-auto` and nothing scrolls it, so the active tab can sit off the strip (`references/ux-polish-2026-11-04/screens/lavender/08-canvas.png`). Add a `$effect` that reads `editorStore.activeIndex` and `editorStore.tabs.length` and calls `scrollIntoView({ block: 'nearest', inline: 'nearest' })` on the active `[role="tab"]` element (keep element refs in the `{#each}`, or query the strip). In the same file, give every tab one height: a fixed `h-8` on the tab element, `border-b-2 border-transparent` on inactive tabs, and no vertical padding difference between pinned (`px-2 py-2`) and unpinned (`px-3 py-1.5`) tabs (about lines 36-40). Today they measure 30, 32 and 34px (layout.md P13).

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh e2e/specs/tabs.spec.ts`.

- [x] Failing first: new `src/tests/lib/core/markdown-editor/EditorTabs.test.ts` mounts `EditorTabs` with the real `editorStore` and three tabs, spies on `Element.prototype.scrollIntoView` (jsdom has no layout), switches the active tab, and asserts the spy ran on the newly active `[role="tab"]` element with `inline: 'nearest'`. It fails on the current code
- [x] E2E in `e2e/specs/tabs.spec.ts`: at a narrow viewport (`page.setViewportSize`) open enough notes to overflow the strip; the active tab's bounding box lies inside `.editor-tabs-bar`'s box after opening a new note and after cycling back to the first tab with Mod+Shift+BracketLeft
- [x] E2E: a pinned tab, an inactive tab and the active tab have the same bounding-box height
- [x] The existing `tabs.spec.ts` and `tab-pinning.spec.ts` cases stay green

## Notes

- **Source:** `work/layout.md` P1 and P13, plan R5; review section 1 item 7 and section 3 row "Active tab scrolls out of view".
- **Not verified:** whether `data-tauri-drag-region` on the strip interferes with scrolling in the Tauri window, and how macOS overlay scrollbars look; the E2E runs in the browser build.
- **Out of scope:** the overflow edge fade and the tab-list chevron menu (design work in the shell layout pass), hiding `.md`, the inactive tab contrast (states.md P15), the close button that shows only on hover (states.md P7).
- **Size:** S.

- 2026-11-04, branch `issue/07-active-tab-scrolls-into-view`: `EditorTabs.svelte` scrolls the active tab into view (`inline: 'nearest'`) when the active tab changes, and every tab has one fixed height. Review round 1 fixes: the effect tracks `activeIndex` plus a component `$derived` of `activeTabPath`, so closing another tab no longer rescrolls the strip (new unit test); new unit test for adding tabs then activating one. A scrollbar-behavior finding was rejected as unreproduced. Tests at 9c8336077: vitest 494 files, 11726 passed, 1 skipped, 1 todo; `pnpm build` passed; `pnpm check` 0 errors; E2E tabs + tab-pinning 8/8. Reviews: round 1 APPROVED, round 2 APPROVED (no findings).
