# 53: The right sidebar hides on kanban, canvas and view tabs

**What to build:** On a board, canvas or view tab the right sidebar stays open and every panel shows "Not available" (`PropertiesView.svelte:171`, `BacklinksPanel.svelte:65`, `OutgoingLinksPanel.svelte:63`, `TableOfContentsPanel.svelte:56`). Hide it there, the same way the Calendar, Tasks, Tags and Graph tabs already do:
- `src/lib/core/layout/layout.logic.ts:17` `hidesRightSidebar(activeTabPath)` also returns true when the path is a `.kanban`, `.canvas`, `.view` or `.collection` file. Use `isKanbanFile`, `isCanvasFile`, `isViewFile` and `isCollectionFile` from `src/lib/core/filesystem/fs.logic.ts:70-88` (`.collection` opens as the same tab type as `.view`, `editor.service.ts:137`). `null` still returns false.
- Everything else follows from that function with no code of its own: `isRightSidebarShown` (same file) hides the sidebar without touching `layout.rightSidebarVisible`, `AppShell.svelte:188` hides the toggle button, and `toggleRightSidebar` (`layout.service.ts:31`) does nothing on those tabs, so Cmd+B cannot flip the saved setting out of sight.
- Update the comments that list the hiding tabs, which this change makes wrong: the JSDoc of `isRightSidebarShown` (`layout.logic.ts` about line 22), `toggleRightSidebar` (`layout.service.ts` about lines 25-28) and the `AppShell.svelte:187` comment. Name the rule ("virtual tabs and non-Markdown file tabs") instead of a list.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first, `src/tests/lib/core/layout/layout.logic.test.ts`: `isRightSidebarShown(true, path)` is false and `isRightSidebarShown(false, path)` is false for `/vault/board.kanban`, `/vault/map.canvas`, `/vault/tasks.view` and `/vault/old.collection` (one case each, like the existing virtual-tab cases); `/vault/note.md` still follows the setting
- [ ] Failing first, `src/tests/lib/core/layout/layout.service.test.ts`: with a `.canvas` tab active, `toggleRightSidebar()` leaves `settingsStore.layout.rightSidebarVisible` unchanged; switching the active tab back to a `.md` note shows the sidebar again as the setting says (real `editorStore` and `settingsStore`)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Shell layout row 7.
- **Owner decision (2026-11-05):** the right sidebar never shows on kanban, canvas and view tabs. Hiding wins over the centered "Only available for Markdown notes" alternative.
- **Triage (2026-11-05):** cited lines checked against main at 51c0d82aa; promoted to ready-for-agent.
- Layer: `layout.logic.ts` and `fs.logic.ts` are both `core/` `.logic.ts` files; no new layer edge.
- Size: S.
