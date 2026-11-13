# file card src/lib/features/file-icons/IconRenderer.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/file-icons/IconRenderer.svelte ' codemap/files
file src/lib/features/file-icons/IconRenderer.svelte component L38 module src/lib/features/file-icons in11 t1
## imports
imp src/lib/features/file-icons/IconRenderer.svelte:2 -> src/lib/features/file-icons/file-icons.types.ts type:NormalizedIcon
imp src/lib/features/file-icons/IconRenderer.svelte:3 -> src/lib/utils/sanitize.ts sanitizeSvgContent
imp src/lib/features/file-icons/IconRenderer.svelte:4 -> src/lib/features/file-icons/file-icons.logic.ts iconColorCss
## imported-by
imp src/lib/app/EditorView.svelte:26 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:9 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:13 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/file-icons/IconPicker.svelte:7 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/note-list/NoteRow.svelte:8 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/properties/PropertiesView.svelte:27 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/properties/RelationshipSearch.svelte:12 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/rail-shell/FilesNavigator.svelte:47 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/rail-shell/Rail.svelte:22 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/rail-shell/TypesNavigator.svelte:30 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/tasks/TasksView.svelte:31 -> src/lib/features/file-icons/IconRenderer.svelte default
## reach
in2 src/lib/features/file-icons/IconRenderer.svelte 4 files in 4 modules: src/lib/app(1) src/lib/features/auto-organize(1) src/lib/features/note-list(1) src/lib/features/rail-shell(1)
out2 src/lib/features/file-icons/IconRenderer.svelte 3 files in 3 modules: src/lib/core/frontmatter(1) src/lib/core/settings(1) src/lib/types(1)
## tests
test src/tests/lib/features/file-icons/IconRenderer.test.ts imports src/lib/features/file-icons/IconRenderer.svelte mirror
## symbols
sym src/lib/features/file-icons/IconRenderer.svelte:1 component IconRenderer props:icon,class=,color L38
by src/lib/features/file-icons/IconRenderer.svelte:default <- src/lib/app/EditorView.svelte:59 in (markup) mount
by src/lib/features/file-icons/IconRenderer.svelte:default <- src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:283 in (markup) mount
by src/lib/features/file-icons/IconRenderer.svelte:default <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:417 in (markup) mount
by src/lib/features/file-icons/IconRenderer.svelte:default <- src/lib/features/file-icons/IconPicker.svelte:224 in (markup) mount +1
by src/lib/features/file-icons/IconRenderer.svelte:default <- src/lib/features/note-list/NoteRow.svelte:54 in (markup) mount +1
by src/lib/features/file-icons/IconRenderer.svelte:default <- src/lib/features/properties/PropertiesView.svelte:179 in (markup) mount +2
by src/lib/features/file-icons/IconRenderer.svelte:default <- src/lib/features/properties/RelationshipSearch.svelte:74 in (markup) mount
by src/lib/features/file-icons/IconRenderer.svelte:default <- src/lib/features/rail-shell/FilesNavigator.svelte:487 in (markup) mount
more by 3 not shown: src/lib/features/rail-shell(2) src/lib/features/tasks(1): q importers src/lib/features/file-icons/IconRenderer.svelte:default
## mounted-at
mount src/lib/app/EditorView.svelte:59 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:283 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:417 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/file-icons/IconPicker.svelte:224 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/file-icons/IconPicker.svelte:239 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/note-list/NoteRow.svelte:54 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/note-list/NoteRow.svelte:84 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/properties/PropertiesView.svelte:179 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/properties/PropertiesView.svelte:193 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/properties/PropertiesView.svelte:266 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/properties/RelationshipSearch.svelte:74 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/rail-shell/FilesNavigator.svelte:487 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/rail-shell/Rail.svelte:341 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/rail-shell/Rail.svelte:348 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/rail-shell/TypesNavigator.svelte:290 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/rail-shell/TypesNavigator.svelte:420 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/tasks/TasksView.svelte:760 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
## calls
call src/lib/features/file-icons/IconRenderer.svelte:20 in cssColor=$derived -> src/lib/features/file-icons/file-icons.logic.ts:iconColorCss call
call src/lib/features/file-icons/IconRenderer.svelte:36 in (markup) -> src/lib/utils/sanitize.ts:sanitizeSvgContent markup
