# file card src/lib/app/AppOverlays.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/app/AppOverlays.svelte ' codemap/files
file src/lib/app/AppOverlays.svelte component L25 module src/lib/app in1 t1
## imports
imp src/lib/app/AppOverlays.svelte:3 -> src/lib/app/SettingsPanel.svelte default
imp src/lib/app/AppOverlays.svelte:4 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/app/AppOverlays.svelte:5 -> src/lib/features/quick-switcher/QuickSwitcher.svelte default
imp src/lib/app/AppOverlays.svelte:6 -> src/lib/features/command-palette/CommandPalette.svelte default
imp src/lib/app/AppOverlays.svelte:7 -> src/lib/plugins/templates/TemplatePicker.svelte default
imp src/lib/app/AppOverlays.svelte:8 -> src/lib/plugins/one-on-one/OneOnOnePicker.svelte default
imp src/lib/app/AppOverlays.svelte:9 -> src/lib/plugins/mods/ModActionPicker.svelte default
imp src/lib/app/AppOverlays.svelte:10 -> src/lib/plugins/mods/ModDialogHost.svelte default
imp src/lib/app/AppOverlays.svelte:11 -> src/lib/features/file-history/FileHistoryDialog.svelte default
imp src/lib/app/AppOverlays.svelte:12 -> src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte default
imp src/lib/app/AppOverlays.svelte:13 -> src/lib/app/commands.ts getBuiltInCommands
## imported-by
imp src/routes/(app)/+layout.svelte:23 -> src/lib/app/AppOverlays.svelte default
## reach
in2 src/lib/app/AppOverlays.svelte 0 files in 0 modules: -
out2 src/lib/app/AppOverlays.svelte 90 files in 32 modules: src/lib/core/settings(16) src/lib/features/todoist-sync(7) src/lib/features/file-history(6) src/lib/components(5) src/lib/plugins/mods(5) +27 modules
## tests
test src/tests/lib/app/AppOverlays.test.ts imports src/lib/app/AppOverlays.svelte mirror
## symbols
sym src/lib/app/AppOverlays.svelte:1 component AppOverlays L25
by src/lib/app/AppOverlays.svelte:default <- src/routes/(app)/+layout.svelte:183 in (markup) mount
## mounts
mount src/lib/app/AppOverlays.svelte:17 SettingsPanel -> src/lib/app/SettingsPanel.svelte
mount src/lib/app/AppOverlays.svelte:18 QuickSwitcher -> src/lib/features/quick-switcher/QuickSwitcher.svelte
mount src/lib/app/AppOverlays.svelte:19 CommandPalette -> src/lib/features/command-palette/CommandPalette.svelte
mount src/lib/app/AppOverlays.svelte:20 TemplatePicker -> src/lib/plugins/templates/TemplatePicker.svelte
mount src/lib/app/AppOverlays.svelte:21 OneOnOnePicker -> src/lib/plugins/one-on-one/OneOnOnePicker.svelte
mount src/lib/app/AppOverlays.svelte:22 ModActionPicker -> src/lib/plugins/mods/ModActionPicker.svelte
mount src/lib/app/AppOverlays.svelte:23 ModDialogHost -> src/lib/plugins/mods/ModDialogHost.svelte
mount src/lib/app/AppOverlays.svelte:24 FileHistoryDialog -> src/lib/features/file-history/FileHistoryDialog.svelte
mount src/lib/app/AppOverlays.svelte:25 TodoistSyncLogDialog -> src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte
## mounted-at
mount src/routes/(app)/+layout.svelte:183 AppOverlays -> src/lib/app/AppOverlays.svelte
## calls
call src/lib/app/AppOverlays.svelte:19 in (markup) -> src/lib/app/commands.ts:getBuiltInCommands markup
