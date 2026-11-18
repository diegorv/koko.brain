# file card src/lib/core/markdown-editor/EditorTabs.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/EditorTabs.svelte ' codemap/files
file src/lib/core/markdown-editor/EditorTabs.svelte component L226 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/EditorTabs.svelte:13 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/markdown-editor/EditorTabs.svelte:14 -> src/lib/core/editor/editor.service.ts switchTab,closeTab,togglePinTab
imp src/lib/core/markdown-editor/EditorTabs.svelte:15 -> src/lib/core/editor/editor.logic.ts isTabDirty,isTabPinned,isVirtualTab
imp src/lib/core/markdown-editor/EditorTabs.svelte:16 -> src/lib/core/layout/layout.logic.ts hidesRightSidebar
imp src/lib/core/markdown-editor/EditorTabs.svelte:17 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/markdown-editor/EditorTabs.svelte:18 -> src/lib/components/ui/context-menu/index.ts *
imp src/lib/core/markdown-editor/EditorTabs.svelte:19 -> src/lib/components/ui/dropdown-menu/index.ts DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger
imp src/lib/core/markdown-editor/EditorTabs.svelte:25 -> src/lib/core/editor/editor.types.ts type:EditorTab
imp src/lib/core/markdown-editor/EditorTabs.svelte:26 -> src/lib/core/markdown-editor/editor-tabs.logic.ts countHiddenTabs,edgeFades
## imported-by
imp src/lib/app/EditorView.svelte:11 -> src/lib/core/markdown-editor/EditorTabs.svelte default
## reach
in2 src/lib/core/markdown-editor/EditorTabs.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/markdown-editor/EditorTabs.svelte 43 files in 6 modules: src/lib/components(33) src/lib/utils(4) src/lib/core/settings(3) src/lib/core/editor(1) src/lib/core/filesystem(1) +1 modules
## tests
test src/tests/lib/core/markdown-editor/EditorTabs.test.ts imports src/lib/core/markdown-editor/EditorTabs.svelte mirror
## symbols
sym src/lib/core/markdown-editor/EditorTabs.svelte:1 component EditorTabs props:tabIcon,tabTitleColor L226
by src/lib/core/markdown-editor/EditorTabs.svelte:default <- src/lib/app/EditorView.svelte:67 in (markup) mount
## locals
local src/lib/core/markdown-editor/EditorTabs.svelte:62 fn measure(): void L6
local src/lib/core/markdown-editor/EditorTabs.svelte:84 fn handleWheel(event: WheelEvent): void L6
## mounts
mount src/lib/core/markdown-editor/EditorTabs.svelte:190 DropdownMenu -> src/lib/components/ui/dropdown-menu/dropdown-menu.svelte
mount src/lib/core/markdown-editor/EditorTabs.svelte:191 DropdownMenuTrigger -> src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte
mount src/lib/core/markdown-editor/EditorTabs.svelte:201 DropdownMenuContent -> src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte
mount src/lib/core/markdown-editor/EditorTabs.svelte:204 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
## mounted-at
mount src/lib/app/EditorView.svelte:67 EditorTabs -> src/lib/core/markdown-editor/EditorTabs.svelte
## calls
call src/lib/core/markdown-editor/EditorTabs.svelte:64 in measure -> src/lib/core/markdown-editor/editor-tabs.logic.ts:edgeFades call
call src/lib/core/markdown-editor/EditorTabs.svelte:66 in measure -> src/lib/core/markdown-editor/editor-tabs.logic.ts:countHiddenTabs call
call src/lib/core/markdown-editor/EditorTabs.svelte:71 in $effect@69 -> src/lib/core/markdown-editor/EditorTabs.svelte:measure call
call src/lib/core/markdown-editor/EditorTabs.svelte:80 in $effect@77 -> src/lib/core/markdown-editor/EditorTabs.svelte:measure ref
call src/lib/core/markdown-editor/EditorTabs.svelte:93 in reservesToggle=$derived -> src/lib/core/layout/layout.logic.ts:hidesRightSidebar call
call src/lib/core/markdown-editor/EditorTabs.svelte:126 in (markup) -> src/lib/core/markdown-editor/EditorTabs.svelte:measure markup
call src/lib/core/markdown-editor/EditorTabs.svelte:127 in (markup) -> src/lib/core/markdown-editor/EditorTabs.svelte:handleWheel markup
call src/lib/core/markdown-editor/EditorTabs.svelte:130 in (markup) -> src/lib/core/editor/editor.logic.ts:isTabPinned markup +1
call src/lib/core/markdown-editor/EditorTabs.svelte:144 in (markup) -> src/lib/core/editor/editor.service.ts:switchTab markup +2
call src/lib/core/markdown-editor/EditorTabs.svelte:147 in (markup) -> src/lib/core/editor/editor.logic.ts:isTabDirty markup +1
call src/lib/core/markdown-editor/EditorTabs.svelte:147 in (markup) -> src/lib/core/editor/editor.logic.ts:isVirtualTab markup +1
call src/lib/core/markdown-editor/EditorTabs.svelte:159 in (markup) -> src/lib/core/editor/editor.service.ts:closeTab markup +1
call src/lib/core/markdown-editor/EditorTabs.svelte:169 in (markup) -> src/lib/core/editor/editor.service.ts:togglePinTab markup
## effects
fx src/lib/core/markdown-editor/EditorTabs.svelte:48 svelte.$effect in (script)
fx src/lib/core/markdown-editor/EditorTabs.svelte:69 svelte.$effect in (script)
fx src/lib/core/markdown-editor/EditorTabs.svelte:77 svelte.$effect in (script)
