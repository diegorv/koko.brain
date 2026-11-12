---
summary: "Sidebar visibility rules, the toggle actions that drive them, and the shared right sidebar section component."
---

## Responsibility

Decides which side panels show. layout.logic.ts holds the pure rules: which virtual tabs and file kinds hide the right sidebar (hidesRightSidebar) and the combined check of the persisted flag and the active tab (isRightSidebarShown). layout.service.ts holds the toggle, show and hide actions for the rail panels and the right sidebar, each writing through settingsStore.updateLayout. SidebarSection.svelte is the frame (header plus optionally collapsible body) used by right sidebar panels. It does not own the rail, the editor tabs, the panel contents, or pane sizing, which AppShell handles. It holds no state of its own.

## Key files

- `src/lib/core/layout/layout.logic.ts`: hidesRightSidebar and isRightSidebarShown.
- `src/lib/core/layout/layout.service.ts`: toggleLeftSidebar, hideRailPanels, showRailPanels and toggleRightSidebar.
- `src/lib/core/layout/SidebarSection.svelte`: Right sidebar section frame built on the shadcn Collapsible primitives.
- `src/lib/app/AppShell.svelte`: Main consumer: applies the visibility rules to the shell and renders the toggle button.

## State

- No state of its own. It reads editorStore.activeTabPath and writes the persisted layout settings railPanelsVisible and rightSidebarVisible through settingsStore.updateLayout.

## Collaborators

- `src/lib/core/editor`: Uses the virtual tab path constants and getFileName from editor.logic.ts and reads editorStore.activeTabPath.
- `src/lib/core/filesystem`: Uses isCanvasFile, isKanbanFile and isViewFile from fs.logic.ts to classify the active tab.
- `src/lib/core/settings`: Writes the layout settings through settingsStore.updateLayout.
- `src/lib/app`: AppShell.svelte, commands.ts and global-keybindings.ts call the actions and rules.
- `src/lib/features`: The properties, backlinks and outgoing-links panels render inside SidebarSection.
- `src/lib/plugins`: The table-of-contents panel renders inside SidebarSection, and toc.service.ts writes rightSidebarVisible directly through updateLayout.

## Gotchas

- toggleRightSidebar returns early when the active tab is one hidesRightSidebar covers, so the persisted flag is not flipped out of sight. AppShell also hides the toggle button on those tabs.
- isRightSidebarShown combines the persisted flag with the tab check. The tab check never writes the setting, so a note tab shows the sidebar again as the user left it.
- SidebarSection is collapsible only when its open prop is defined. Without it the section renders static with no toggle button.
- toc.service.ts in the table-of-contents plugin sets rightSidebarVisible directly through settingsStore.updateLayout, so that write path bypasses these actions and their guard. Several features also write other layout keys (railItem, railPanelsVisible) through updateLayout directly.
