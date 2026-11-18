# file card src/lib/core/markdown-editor/EditorTabs.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/EditorTabs.svelte ' codemap/files
file src/lib/core/markdown-editor/EditorTabs.svelte component L310 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/EditorTabs.svelte:13 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/markdown-editor/EditorTabs.svelte:14 -> src/lib/core/editor/editor.service.ts switchTab,closeTab,togglePinTab
imp src/lib/core/markdown-editor/EditorTabs.svelte:15 -> src/lib/core/editor/editor.logic.ts clampTabInsertion,isMarkdownNoteTab,isTabDirty,isTabPinned,isVirtualTab,tabTooltipText
imp src/lib/core/markdown-editor/EditorTabs.svelte:23 -> src/lib/core/layout/layout.logic.ts hidesRightSidebar
imp src/lib/core/markdown-editor/EditorTabs.svelte:24 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/markdown-editor/EditorTabs.svelte:25 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/markdown-editor/EditorTabs.svelte:26 -> src/lib/utils/path.ts stem
imp src/lib/core/markdown-editor/EditorTabs.svelte:27 -> src/lib/components/ui/context-menu/index.ts *
imp src/lib/core/markdown-editor/EditorTabs.svelte:28 -> src/lib/components/ui/dropdown-menu/index.ts DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger
imp src/lib/core/markdown-editor/EditorTabs.svelte:34 -> src/lib/core/editor/editor.types.ts type:EditorTab
imp src/lib/core/markdown-editor/EditorTabs.svelte:35 -> src/lib/core/markdown-editor/editor-tabs.logic.ts countHiddenTabs,edgeFades
## imported-by
imp src/lib/app/EditorView.svelte:11 -> src/lib/core/markdown-editor/EditorTabs.svelte default
## reach
in2 src/lib/core/markdown-editor/EditorTabs.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/markdown-editor/EditorTabs.svelte 43 files in 7 modules: src/lib/components(33) src/lib/core/settings(3) src/lib/utils(3) src/lib/core/editor(1) src/lib/core/filesystem(1) +2 modules
## tests
test src/tests/lib/core/markdown-editor/EditorTabs.test.ts imports src/lib/core/markdown-editor/EditorTabs.svelte mirror
## symbols
sym src/lib/core/markdown-editor/EditorTabs.svelte:1 component EditorTabs props:tabIcon,tabTitleColor L310
by src/lib/core/markdown-editor/EditorTabs.svelte:default <- src/lib/app/EditorView.svelte:67 in (markup) mount
## locals
local src/lib/core/markdown-editor/EditorTabs.svelte:71 fn measure(): void L6
local src/lib/core/markdown-editor/EditorTabs.svelte:93 fn handleWheel(event: WheelEvent): void L6
local src/lib/core/markdown-editor/EditorTabs.svelte:117 fn isTabDrag(event: DragEvent): boolean L3
local src/lib/core/markdown-editor/EditorTabs.svelte:121 fn handleDragStart(event: DragEvent, index: number): void L6
local src/lib/core/markdown-editor/EditorTabs.svelte:129 fn handleDragOver(event: DragEvent): void L14
local src/lib/core/markdown-editor/EditorTabs.svelte:144 fn handleDrop(event: DragEvent): void L6
local src/lib/core/markdown-editor/EditorTabs.svelte:152 fn handleDragLeave(event: DragEvent): void L5
local src/lib/core/markdown-editor/EditorTabs.svelte:158 fn endDrag(): void L4
## mounts
mount src/lib/core/markdown-editor/EditorTabs.svelte:274 DropdownMenu -> src/lib/components/ui/dropdown-menu/dropdown-menu.svelte
mount src/lib/core/markdown-editor/EditorTabs.svelte:275 DropdownMenuTrigger -> src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte
mount src/lib/core/markdown-editor/EditorTabs.svelte:285 DropdownMenuContent -> src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte
mount src/lib/core/markdown-editor/EditorTabs.svelte:288 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
## mounted-at
mount src/lib/app/EditorView.svelte:67 EditorTabs -> src/lib/core/markdown-editor/EditorTabs.svelte
## calls
call src/lib/core/markdown-editor/EditorTabs.svelte:73 in measure -> src/lib/core/markdown-editor/editor-tabs.logic.ts:edgeFades call
call src/lib/core/markdown-editor/EditorTabs.svelte:75 in measure -> src/lib/core/markdown-editor/editor-tabs.logic.ts:countHiddenTabs call
call src/lib/core/markdown-editor/EditorTabs.svelte:80 in $effect@78 -> src/lib/core/markdown-editor/EditorTabs.svelte:measure call
call src/lib/core/markdown-editor/EditorTabs.svelte:89 in $effect@86 -> src/lib/core/markdown-editor/EditorTabs.svelte:measure ref
call src/lib/core/markdown-editor/EditorTabs.svelte:102 in reservesToggle=$derived -> src/lib/core/layout/layout.logic.ts:hidesRightSidebar call
call src/lib/core/markdown-editor/EditorTabs.svelte:130 in handleDragOver -> src/lib/core/markdown-editor/EditorTabs.svelte:isTabDrag call
call src/lib/core/markdown-editor/EditorTabs.svelte:136 in handleDragOver -> src/lib/core/editor/editor.logic.ts:clampTabInsertion call
call src/lib/core/markdown-editor/EditorTabs.svelte:145 in handleDrop -> src/lib/core/markdown-editor/EditorTabs.svelte:isTabDrag call
call src/lib/core/markdown-editor/EditorTabs.svelte:147 in handleDrop -> src/lib/core/editor/editor.store.svelte.ts:editorStore.moveTab mcall
call src/lib/core/markdown-editor/EditorTabs.svelte:148 in handleDrop -> src/lib/core/markdown-editor/EditorTabs.svelte:endDrag call
call src/lib/core/markdown-editor/EditorTabs.svelte:195 in (markup) -> src/lib/core/markdown-editor/EditorTabs.svelte:measure markup
call src/lib/core/markdown-editor/EditorTabs.svelte:196 in (markup) -> src/lib/core/markdown-editor/EditorTabs.svelte:handleWheel markup
call src/lib/core/markdown-editor/EditorTabs.svelte:197 in (markup) -> src/lib/core/markdown-editor/EditorTabs.svelte:handleDragOver markup
call src/lib/core/markdown-editor/EditorTabs.svelte:198 in (markup) -> src/lib/core/markdown-editor/EditorTabs.svelte:handleDrop markup
call src/lib/core/markdown-editor/EditorTabs.svelte:199 in (markup) -> src/lib/core/markdown-editor/EditorTabs.svelte:handleDragLeave markup
call src/lib/core/markdown-editor/EditorTabs.svelte:200 in (markup) -> src/lib/core/markdown-editor/EditorTabs.svelte:endDrag markup
call src/lib/core/markdown-editor/EditorTabs.svelte:203 in (markup) -> src/lib/core/editor/editor.logic.ts:isTabPinned markup +1
call src/lib/core/markdown-editor/EditorTabs.svelte:218 in (markup) -> src/lib/core/editor/editor.logic.ts:tabTooltipText markup
call src/lib/core/markdown-editor/EditorTabs.svelte:220 in (markup) -> src/lib/core/editor/editor.service.ts:switchTab markup +2
call src/lib/core/markdown-editor/EditorTabs.svelte:222 in (markup) -> src/lib/core/markdown-editor/EditorTabs.svelte:handleDragStart markup
call src/lib/core/markdown-editor/EditorTabs.svelte:224 in (markup) -> src/lib/core/editor/editor.logic.ts:isTabDirty markup +1
call src/lib/core/markdown-editor/EditorTabs.svelte:224 in (markup) -> src/lib/core/editor/editor.logic.ts:isVirtualTab markup +1
call src/lib/core/markdown-editor/EditorTabs.svelte:232 in (markup) -> src/lib/core/editor/editor.logic.ts:isMarkdownNoteTab markup
call src/lib/core/markdown-editor/EditorTabs.svelte:232 in (markup) -> src/lib/utils/path.ts:stem markup
call src/lib/core/markdown-editor/EditorTabs.svelte:236 in (markup) -> src/lib/core/editor/editor.service.ts:closeTab markup +1
call src/lib/core/markdown-editor/EditorTabs.svelte:246 in (markup) -> src/lib/core/editor/editor.service.ts:togglePinTab markup
## effects
fx src/lib/core/markdown-editor/EditorTabs.svelte:57 svelte.$effect in (script)
fx src/lib/core/markdown-editor/EditorTabs.svelte:78 svelte.$effect in (script)
fx src/lib/core/markdown-editor/EditorTabs.svelte:86 svelte.$effect in (script)
