# file card src/lib/features/type-definitions/ViewDialog.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/type-definitions/ViewDialog.svelte ' codemap/files
file src/lib/features/type-definitions/ViewDialog.svelte component L221 module src/lib/features/type-definitions in2 t1
## imports
imp src/lib/features/type-definitions/ViewDialog.svelte:3 -> src/lib/components/ui/dialog/index.ts *
imp src/lib/features/type-definitions/ViewDialog.svelte:4 -> src/lib/components/ui/input/index.ts Input
imp src/lib/features/type-definitions/ViewDialog.svelte:5 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/type-definitions/ViewDialog.svelte:6 -> src/lib/core/filesystem/fs.logic.ts fileOperationErrorMessage,getFileName
imp src/lib/features/type-definitions/ViewDialog.svelte:7 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/type-definitions/ViewDialog.svelte:8 -> src/lib/features/collection/toolbar/FilterPanel.svelte default
imp src/lib/features/type-definitions/ViewDialog.svelte:9 -> src/lib/features/collection/toolbar/filter.logic.ts filterGroupsToFilter,getAllKnownProperties,isUnaryOperator,parseFilterToGroups
imp src/lib/features/type-definitions/ViewDialog.svelte:15 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterGroup
imp src/lib/features/type-definitions/ViewDialog.svelte:16 -> src/lib/features/collection/yaml-parser.ts railViewIndex
imp src/lib/features/type-definitions/ViewDialog.svelte:17 -> src/lib/features/type-definitions/type-definitions.service.ts createView,editView
imp src/lib/features/type-definitions/ViewDialog.svelte:18 -> src/lib/features/type-definitions/type-definitions.logic.ts validateViewName
imp src/lib/features/type-definitions/ViewDialog.svelte:19 -> src/lib/features/type-definitions/view-parse-cache.ts refreshViewDefinition
## imported-by
imp src/lib/features/rail-shell/FilesNavigator.svelte:53 -> src/lib/features/type-definitions/ViewDialog.svelte default
imp src/lib/features/rail-shell/TypesNavigator.svelte:51 -> src/lib/features/type-definitions/ViewDialog.svelte default
## reach
in2 src/lib/features/type-definitions/ViewDialog.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/type-definitions/ViewDialog.svelte 40 files in 12 modules: src/lib/components(15) src/lib/core/editor(4) src/lib/features/collection(4) src/lib/core/filesystem(3) src/lib/features/type-definitions(3) +7 modules
## tests
test src/tests/lib/features/type-definitions/ViewDialog.svelte.test.ts imports src/lib/features/type-definitions/ViewDialog.svelte mirror
## symbols
sym src/lib/features/type-definitions/ViewDialog.svelte:1 component ViewDialog props:open=$bindable,existingLabels,edit=,oncreated,folder L221
by src/lib/features/type-definitions/ViewDialog.svelte:default <- src/lib/features/rail-shell/FilesNavigator.svelte:408 in (markup) mount
by src/lib/features/type-definitions/ViewDialog.svelte:default <- src/lib/features/rail-shell/TypesNavigator.svelte:474 in (markup) mount +1
## locals
local src/lib/features/type-definitions/ViewDialog.svelte:74 fn load(target: { path: string; label: string }) L26
local src/lib/features/type-definitions/ViewDialog.svelte:102 fn setOpen(next: boolean) L15
local src/lib/features/type-definitions/ViewDialog.svelte:118 fn submit() L21
local src/lib/features/type-definitions/ViewDialog.svelte:141 fn save(path: string, label: string) L17
local src/lib/features/type-definitions/ViewDialog.svelte:159 fn handleKeydown(e: KeyboardEvent) L6
## mounts
mount src/lib/features/type-definitions/ViewDialog.svelte:179 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/type-definitions/ViewDialog.svelte:202 FilterPanel -> src/lib/features/collection/toolbar/FilterPanel.svelte
mount src/lib/features/type-definitions/ViewDialog.svelte:217 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/type-definitions/ViewDialog.svelte:218 Button -> src/lib/components/ui/button/button.svelte
## mounted-at
mount src/lib/features/rail-shell/FilesNavigator.svelte:408 ViewDialog -> src/lib/features/type-definitions/ViewDialog.svelte
mount src/lib/features/rail-shell/TypesNavigator.svelte:474 ViewDialog -> src/lib/features/type-definitions/ViewDialog.svelte
mount src/lib/features/rail-shell/TypesNavigator.svelte:482 ViewDialog -> src/lib/features/type-definitions/ViewDialog.svelte
## calls
call src/lib/features/type-definitions/ViewDialog.svelte:57 in nameError=$derived -> src/lib/features/type-definitions/type-definitions.logic.ts:validateViewName call
call src/lib/features/type-definitions/ViewDialog.svelte:58 in availableProperties=$derived -> src/lib/features/collection/toolbar/filter.logic.ts:getAllKnownProperties call
call src/lib/features/type-definitions/ViewDialog.svelte:62 in blankValue=$derived -> src/lib/features/collection/toolbar/filter.logic.ts:isUnaryOperator call
call src/lib/features/type-definitions/ViewDialog.svelte:70 in $effect@67 -> src/lib/features/type-definitions/ViewDialog.svelte:load call
call src/lib/features/type-definitions/ViewDialog.svelte:80 in load -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/features/type-definitions/ViewDialog.svelte:83 in load -> src/lib/features/type-definitions/view-parse-cache.ts:refreshViewDefinition call
call src/lib/features/type-definitions/ViewDialog.svelte:87 in load -> src/lib/core/filesystem/fs.logic.ts:fileOperationErrorMessage call +1
call src/lib/features/type-definitions/ViewDialog.svelte:96 in load -> src/lib/features/collection/toolbar/filter.logic.ts:parseFilterToGroups call +1
call src/lib/features/type-definitions/ViewDialog.svelte:96 in load -> src/lib/features/collection/yaml-parser.ts:railViewIndex call
call src/lib/features/type-definitions/ViewDialog.svelte:122 in submit -> src/lib/features/type-definitions/ViewDialog.svelte:save call
call src/lib/features/type-definitions/ViewDialog.svelte:129 in submit -> src/lib/features/collection/toolbar/filter.logic.ts:filterGroupsToFilter call
call src/lib/features/type-definitions/ViewDialog.svelte:129 in submit -> src/lib/features/type-definitions/type-definitions.service.ts:createView call
call src/lib/features/type-definitions/ViewDialog.svelte:131 in submit -> src/lib/core/filesystem/fs.logic.ts:fileOperationErrorMessage call
call src/lib/features/type-definitions/ViewDialog.svelte:136 in submit -> src/lib/features/type-definitions/ViewDialog.svelte:setOpen call
call src/lib/features/type-definitions/ViewDialog.svelte:145 in save -> src/lib/features/type-definitions/type-definitions.service.ts:editView call
call src/lib/features/type-definitions/ViewDialog.svelte:147 in save -> src/lib/features/collection/toolbar/filter.logic.ts:filterGroupsToFilter call +1
call src/lib/features/type-definitions/ViewDialog.svelte:151 in save -> src/lib/core/filesystem/fs.logic.ts:fileOperationErrorMessage call
call src/lib/features/type-definitions/ViewDialog.svelte:151 in save -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/features/type-definitions/ViewDialog.svelte:156 in save -> src/lib/features/type-definitions/ViewDialog.svelte:setOpen call
call src/lib/features/type-definitions/ViewDialog.svelte:162 in handleKeydown -> src/lib/features/type-definitions/ViewDialog.svelte:submit call
call src/lib/features/type-definitions/ViewDialog.svelte:167 in (markup) -> src/lib/features/type-definitions/ViewDialog.svelte:setOpen markup +1
call src/lib/features/type-definitions/ViewDialog.svelte:187 in (markup) -> src/lib/features/type-definitions/ViewDialog.svelte:handleKeydown markup
call src/lib/features/type-definitions/ViewDialog.svelte:218 in (markup) -> src/lib/features/type-definitions/ViewDialog.svelte:submit markup
## effects
fx src/lib/features/type-definitions/ViewDialog.svelte:67 svelte.$effect in (script)
