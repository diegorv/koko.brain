# module card src/lib/core/layout
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/core/layout ' codemap/modules
module src/lib/core/layout core files 3 in-modules 5 out-modules 4 pub 7/7 ipc 0/0 card ~1k
## neighbors
dep src/lib/app -> src/lib/core/layout 4
dep src/lib/features/backlinks -> src/lib/core/layout 1
dep src/lib/features/outgoing-links -> src/lib/core/layout 1
dep src/lib/features/properties -> src/lib/core/layout 1
dep src/lib/plugins/table-of-contents -> src/lib/core/layout 1
dep src/lib/core/layout -> src/lib/components 1
dep src/lib/core/layout -> src/lib/core/editor 2
dep src/lib/core/layout -> src/lib/core/filesystem 1
dep src/lib/core/layout -> src/lib/core/settings 1
in2 src/lib/core/layout 1 modules: src/routes(2)
out2 src/lib/core/layout 1 modules: src/lib/utils(2)
## entry files
entry src/lib/core/layout/SidebarSection.svelte ext-in4 src/lib/features/backlinks/BacklinksPanel.svelte src/lib/features/outgoing-links/OutgoingLinksPanel.svelte src/lib/features/properties/PropertiesView.svelte src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte
entry src/lib/core/layout/layout.service.ts ext-in3 src/lib/app/AppShell.svelte src/lib/app/commands.ts src/lib/app/global-keybindings.ts
entry src/lib/core/layout/layout.logic.ts ext-in1 src/lib/app/AppShell.svelte
## files
file src/lib/core/layout/SidebarSection.svelte component L72 module src/lib/core/layout in4 t1
file src/lib/core/layout/layout.logic.ts logic L38 module src/lib/core/layout in2 t1
file src/lib/core/layout/layout.service.ts service L34 module src/lib/core/layout in3 t1
## public
sym src/lib/core/layout/SidebarSection.svelte:1 component SidebarSection props:title,open=$bindable,onOpenChange,children L72
sym src/lib/core/layout/layout.logic.ts:23 fn hidesRightSidebar(activeTabPath: string | null): boolean L6 | Whether the tab at `activeTabPath` always hides the right sidebar: every panel in it covers notes only.
sym src/lib/core/layout/layout.logic.ts:36 fn isRightSidebarShown(visible: boolean, activeTabPath: string | null): boolean L3 | Whether the right sidebar renders.
sym src/lib/core/layout/layout.service.ts:10 fn toggleLeftSidebar(): void L3 | Toggles the panels between the rail and the editor (navigator, note list); the rail itself never hides.
sym src/lib/core/layout/layout.service.ts:15 fn hideRailPanels(): void L3 | Hides the panels between the rail and the editor (Cmd+1, "Hide Rail Panels").
sym src/lib/core/layout/layout.service.ts:20 fn showRailPanels(): void L3 | Shows the panels between the rail and the editor (Cmd+2, "Show Rail Panels").
sym src/lib/core/layout/layout.service.ts:30 fn toggleRightSidebar(): void L5 | Toggles the right sidebar visibility.
## debt
-
