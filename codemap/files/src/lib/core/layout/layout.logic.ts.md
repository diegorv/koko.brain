# file card src/lib/core/layout/layout.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/layout/layout.logic.ts ' codemap/files
file src/lib/core/layout/layout.logic.ts logic L38 module src/lib/core/layout in2 t1
## imports
imp src/lib/core/layout/layout.logic.ts:1 -> src/lib/core/editor/editor.logic.ts EVENT_CALENDAR_VIRTUAL_PATH,getFileName,GRAPH_VIRTUAL_PATH,TAGS_VIRTUAL_PATH,TASKS_VIRTUAL_PATH
imp src/lib/core/layout/layout.logic.ts:8 -> src/lib/core/filesystem/fs.logic.ts isCanvasFile,isKanbanFile,isViewFile
## imported-by
imp src/lib/app/AppShell.svelte:56 -> src/lib/core/layout/layout.logic.ts hidesRightSidebar,isRightSidebarShown
imp src/lib/core/layout/layout.service.ts:3 -> src/lib/core/layout/layout.logic.ts hidesRightSidebar
## reach
in2 src/lib/core/layout/layout.logic.ts 3 files in 2 modules: src/lib/app(2) src/routes(1)
out2 src/lib/core/layout/layout.logic.ts 3 files in 3 modules: src/lib/core/editor(1) src/lib/core/filesystem(1) src/lib/utils(1)
## tests
test src/tests/lib/core/layout/layout.logic.test.ts imports src/lib/core/layout/layout.logic.ts mirror
## symbols
sym src/lib/core/layout/layout.logic.ts:23 fn hidesRightSidebar(activeTabPath: string | null): boolean L6 | Whether the tab at `activeTabPath` always hides the right sidebar: every panel in it covers notes only.
by src/lib/core/layout/layout.logic.ts:hidesRightSidebar <- src/lib/app/AppShell.svelte:189 in (markup) markup
by src/lib/core/layout/layout.logic.ts:hidesRightSidebar <- src/lib/core/layout/layout.service.ts:31 in toggleRightSidebar call
sym src/lib/core/layout/layout.logic.ts:36 fn isRightSidebarShown(visible: boolean, activeTabPath: string | null): boolean L3 | Whether the right sidebar renders.
by src/lib/core/layout/layout.logic.ts:isRightSidebarShown <- src/lib/app/AppShell.svelte:61 in rightSidebarShown=$derived call
## calls
call src/lib/core/layout/layout.logic.ts:26 in hidesRightSidebar -> src/lib/core/editor/editor.logic.ts:getFileName call
call src/lib/core/layout/layout.logic.ts:27 in hidesRightSidebar -> src/lib/core/filesystem/fs.logic.ts:isCanvasFile call
call src/lib/core/layout/layout.logic.ts:27 in hidesRightSidebar -> src/lib/core/filesystem/fs.logic.ts:isKanbanFile call
call src/lib/core/layout/layout.logic.ts:27 in hidesRightSidebar -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/core/layout/layout.logic.ts:37 in isRightSidebarShown -> src/lib/core/layout/layout.logic.ts:hidesRightSidebar call
