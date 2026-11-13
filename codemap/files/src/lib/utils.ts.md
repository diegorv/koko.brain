# file card src/lib/utils.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils.ts ' codemap/files
file src/lib/utils.ts other L20 module src/lib/utils.ts in54 t1
## imports
imp src/lib/utils.ts:4 -> src/lib/utils/text-roles.ts TEXT_ROLES
## imported-by
imp src/lib/components/ui/button/button.svelte:2 -> src/lib/utils.ts cn,type:WithElementRef
imp src/lib/components/ui/command/command-dialog.svelte:6 -> src/lib/utils.ts type:WithoutChildrenOrChild
imp src/lib/components/ui/command/command-empty.svelte:3 -> src/lib/utils.ts cn
imp src/lib/components/ui/command/command-group.svelte:3 -> src/lib/utils.ts cn
imp src/lib/components/ui/command/command-input.svelte:4 -> src/lib/utils.ts cn
imp src/lib/components/ui/command/command-item.svelte:3 -> src/lib/utils.ts cn
imp src/lib/components/ui/command/command-link-item.svelte:3 -> src/lib/utils.ts cn
imp src/lib/components/ui/command/command-list.svelte:3 -> src/lib/utils.ts cn
imp src/lib/components/ui/command/command-separator.svelte:3 -> src/lib/utils.ts cn
imp src/lib/components/ui/command/command-shortcut.svelte:2 -> src/lib/utils.ts cn,type:WithElementRef
imp src/lib/components/ui/command/command.svelte:2 -> src/lib/utils.ts cn
imp src/lib/components/ui/context-menu/context-menu-checkbox-item.svelte:5 -> src/lib/utils.ts cn,type:WithoutChildrenOrChild
imp src/lib/components/ui/context-menu/context-menu-content.svelte:3 -> src/lib/utils.ts cn
imp src/lib/components/ui/context-menu/context-menu-content.svelte:6 -> src/lib/utils.ts type:WithoutChildrenOrChild
imp src/lib/components/ui/context-menu/context-menu-group-heading.svelte:3 -> src/lib/utils.ts cn
imp src/lib/components/ui/context-menu/context-menu-item.svelte:3 -> src/lib/utils.ts cn
imp src/lib/components/ui/context-menu/context-menu-label.svelte:2 -> src/lib/utils.ts cn,type:WithElementRef
imp src/lib/components/ui/context-menu/context-menu-radio-item.svelte:4 -> src/lib/utils.ts cn,type:WithoutChild
imp src/lib/components/ui/context-menu/context-menu-separator.svelte:3 -> src/lib/utils.ts cn
imp src/lib/components/ui/context-menu/context-menu-shortcut.svelte:2 -> src/lib/utils.ts cn,type:WithElementRef
imp src/lib/components/ui/context-menu/context-menu-sub-content.svelte:3 -> src/lib/utils.ts cn
imp src/lib/components/ui/context-menu/context-menu-sub-trigger.svelte:4 -> src/lib/utils.ts cn,type:WithoutChild
imp src/lib/components/ui/dialog/dialog-content.svelte:7 -> src/lib/utils.ts cn,type:WithoutChildrenOrChild
imp src/lib/components/ui/dialog/dialog-description.svelte:3 -> src/lib/utils.ts cn
imp src/lib/components/ui/dialog/dialog-footer.svelte:2 -> src/lib/utils.ts cn,type:WithElementRef
imp src/lib/components/ui/dialog/dialog-header.svelte:3 -> src/lib/utils.ts cn,type:WithElementRef
imp src/lib/components/ui/dialog/dialog-overlay.svelte:3 -> src/lib/utils.ts cn
imp src/lib/components/ui/dialog/dialog-title.svelte:3 -> src/lib/utils.ts cn
imp src/lib/components/ui/dropdown-menu/dropdown-menu-checkbox-item.svelte:5 -> src/lib/utils.ts cn,type:WithoutChildrenOrChild
imp src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte:2 -> src/lib/utils.ts cn,type:WithoutChildrenOrChild
imp src/lib/components/ui/dropdown-menu/dropdown-menu-group-heading.svelte:3 -> src/lib/utils.ts cn
imp src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte:2 -> src/lib/utils.ts cn
imp src/lib/components/ui/dropdown-menu/dropdown-menu-label.svelte:2 -> src/lib/utils.ts cn,type:WithElementRef
imp src/lib/components/ui/dropdown-menu/dropdown-menu-radio-item.svelte:4 -> src/lib/utils.ts cn,type:WithoutChild
imp src/lib/components/ui/dropdown-menu/dropdown-menu-separator.svelte:3 -> src/lib/utils.ts cn
imp src/lib/components/ui/dropdown-menu/dropdown-menu-shortcut.svelte:3 -> src/lib/utils.ts cn,type:WithElementRef
imp src/lib/components/ui/dropdown-menu/dropdown-menu-sub-content.svelte:3 -> src/lib/utils.ts cn
imp src/lib/components/ui/dropdown-menu/dropdown-menu-sub-trigger.svelte:4 -> src/lib/utils.ts cn
imp src/lib/components/ui/input/input.svelte:3 -> src/lib/utils.ts cn,type:WithElementRef
imp src/lib/components/ui/popover/popover-content.svelte:2 -> src/lib/utils.ts cn
more imported-by 17 not shown: src/lib/components(17): q importers src/lib/utils.ts
## reach
in2 src/lib/utils.ts 13 files in 1 modules: src/lib/components(13)
out2 src/lib/utils.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/text-roles.test.ts imports src/lib/utils.ts
## symbols
sym src/lib/utils.ts:10 fn cn(...inputs: ClassValue[]) L3
by src/lib/utils.ts:cn <- src/lib/components/ui/button/button.svelte:62 in (markup) markup +1
by src/lib/utils.ts:cn <- src/lib/components/ui/command/command-empty.svelte:15 in (markup) markup
by src/lib/utils.ts:cn <- src/lib/components/ui/command/command-group.svelte:20 in (markup) markup
by src/lib/utils.ts:cn <- src/lib/components/ui/command/command-input.svelte:18 in (markup) markup
by src/lib/utils.ts:cn <- src/lib/components/ui/command/command-item.svelte:15 in (markup) markup
by src/lib/utils.ts:cn <- src/lib/components/ui/command/command-link-item.svelte:15 in (markup) markup
by src/lib/utils.ts:cn <- src/lib/components/ui/command/command-list.svelte:15 in (markup) markup
by src/lib/utils.ts:cn <- src/lib/components/ui/command/command-separator.svelte:15 in (markup) markup
more by 45 not shown: src/lib/components(45): q importers src/lib/utils.ts:cn
sym src/lib/utils.ts:14 type WithElementRef L3
by src/lib/utils.ts:WithElementRef <- src/lib/components/ui/button/button.svelte:2 in (module) import
by src/lib/utils.ts:WithElementRef <- src/lib/components/ui/command/command-shortcut.svelte:2 in (script) import
by src/lib/utils.ts:WithElementRef <- src/lib/components/ui/context-menu/context-menu-label.svelte:2 in (script) import
by src/lib/utils.ts:WithElementRef <- src/lib/components/ui/context-menu/context-menu-shortcut.svelte:2 in (script) import
by src/lib/utils.ts:WithElementRef <- src/lib/components/ui/dialog/dialog-footer.svelte:2 in (script) import
by src/lib/utils.ts:WithElementRef <- src/lib/components/ui/dialog/dialog-header.svelte:3 in (script) import
by src/lib/utils.ts:WithElementRef <- src/lib/components/ui/dropdown-menu/dropdown-menu-label.svelte:2 in (script) import
by src/lib/utils.ts:WithElementRef <- src/lib/components/ui/dropdown-menu/dropdown-menu-shortcut.svelte:3 in (script) import
more by 2 not shown: src/lib/components(2): q importers src/lib/utils.ts:WithElementRef
sym src/lib/utils.ts:18 type WithoutChildrenOrChild L1
by src/lib/utils.ts:WithoutChildrenOrChild <- src/lib/components/ui/command/command-dialog.svelte:6 in (script) import
by src/lib/utils.ts:WithoutChildrenOrChild <- src/lib/components/ui/context-menu/context-menu-checkbox-item.svelte:5 in (script) import
by src/lib/utils.ts:WithoutChildrenOrChild <- src/lib/components/ui/context-menu/context-menu-content.svelte:6 in (script) import
by src/lib/utils.ts:WithoutChildrenOrChild <- src/lib/components/ui/dialog/dialog-content.svelte:7 in (script) import
by src/lib/utils.ts:WithoutChildrenOrChild <- src/lib/components/ui/dropdown-menu/dropdown-menu-checkbox-item.svelte:5 in (script) import
by src/lib/utils.ts:WithoutChildrenOrChild <- src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte:2 in (script) import
by src/lib/utils.ts:WithoutChildrenOrChild <- src/lib/components/ui/resizable/resizable-handle.svelte:4 in (script) import
by src/lib/utils.ts:WithoutChildrenOrChild <- src/lib/components/ui/select/select-content.svelte:8 in (script) import
more by 4 not shown: src/lib/components(4): q importers src/lib/utils.ts:WithoutChildrenOrChild
sym src/lib/utils.ts:20 type WithoutChild L1
by src/lib/utils.ts:WithoutChild <- src/lib/components/ui/context-menu/context-menu-radio-item.svelte:4 in (script) import
by src/lib/utils.ts:WithoutChild <- src/lib/components/ui/context-menu/context-menu-sub-trigger.svelte:4 in (script) import
by src/lib/utils.ts:WithoutChild <- src/lib/components/ui/dropdown-menu/dropdown-menu-radio-item.svelte:4 in (script) import
by src/lib/utils.ts:WithoutChild <- src/lib/components/ui/scroll-area/scroll-area-scrollbar.svelte:3 in (script) import
by src/lib/utils.ts:WithoutChild <- src/lib/components/ui/scroll-area/scroll-area.svelte:4 in (script) import
by src/lib/utils.ts:WithoutChild <- src/lib/components/ui/select/select-content.svelte:6 in (script) import
by src/lib/utils.ts:WithoutChild <- src/lib/components/ui/select/select-item.svelte:4 in (script) import
by src/lib/utils.ts:WithoutChild <- src/lib/components/ui/select/select-trigger.svelte:4 in (script) import
