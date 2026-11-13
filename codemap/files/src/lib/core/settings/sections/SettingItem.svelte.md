# file card src/lib/core/settings/sections/SettingItem.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/SettingItem.svelte ' codemap/files
file src/lib/core/settings/sections/SettingItem.svelte component L41 module src/lib/core/settings in18 t1
## imported-by
imp src/lib/app/LabsSection.svelte:6 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/core/settings/sections/EditorSection.svelte:11 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/core/settings/sections/FileHistorySection.svelte:6 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/core/settings/sections/FilesSection.svelte:5 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/core/settings/sections/HeadingTypographyEditor.svelte:11 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/core/settings/sections/OneOnOneSection.svelte:4 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/core/settings/sections/PeriodicNotesSection.svelte:5 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/core/settings/sections/QuickCaptureSection.svelte:4 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/core/settings/sections/SentrySection.svelte:7 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/core/settings/sections/TroubleshootingSection.svelte:11 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/core/settings/sections/TypesSection.svelte:5 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/core/settings/sections/UpdateSection.svelte:15 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:10 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/features/event-calendar/EventCalendarSection.svelte:11 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/features/rail-shell/LayoutSection.svelte:7 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/features/search/SearchSection.svelte:17 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/features/todoist-sync/TodoistSection.svelte:7 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/plugins/queryjs/QueryjsSection.svelte:7 -> src/lib/core/settings/sections/SettingItem.svelte default
## reach
in2 src/lib/core/settings/sections/SettingItem.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/sections/SettingItem.svelte 0 files in 0 modules: -
## tests
test src/tests/lib/core/settings/SettingItem.test.ts harness src/lib/core/settings/sections/SettingItem.svelte via src/tests/fixtures/SettingItemHarness.svelte
## symbols
sym src/lib/core/settings/sections/SettingItem.svelte:1 component SettingItem props:label,description,layout=,children L41
by src/lib/core/settings/sections/SettingItem.svelte:default <- src/lib/app/LabsSection.svelte:39 in (markup) mount
by src/lib/core/settings/sections/SettingItem.svelte:default <- src/lib/core/settings/sections/EditorSection.svelte:42 in (markup) mount +4
by src/lib/core/settings/sections/SettingItem.svelte:default <- src/lib/core/settings/sections/FileHistorySection.svelte:16 in (markup) mount +2
by src/lib/core/settings/sections/SettingItem.svelte:default <- src/lib/core/settings/sections/FilesSection.svelte:11 in (markup) mount +2
by src/lib/core/settings/sections/SettingItem.svelte:default <- src/lib/core/settings/sections/HeadingTypographyEditor.svelte:60 in (markup) mount +3
by src/lib/core/settings/sections/SettingItem.svelte:default <- src/lib/core/settings/sections/OneOnOneSection.svelte:24 in (markup) mount +5
by src/lib/core/settings/sections/SettingItem.svelte:default <- src/lib/core/settings/sections/PeriodicNotesSection.svelte:22 in (markup) mount +12
by src/lib/core/settings/sections/SettingItem.svelte:default <- src/lib/core/settings/sections/QuickCaptureSection.svelte:38 in (markup) mount +2
more by 10 not shown: src/lib/core/settings(4) src/lib/features/auto-organize(1) src/lib/features/event-calendar(1) src/lib/features/rail-shell(1) src/lib/features/search(1) src/lib/features/todoist-sync(1) src/lib/plugins/queryjs(1): q importers src/lib/core/settings/sections/SettingItem.svelte:default
## mounted-at
mount src/lib/app/LabsSection.svelte:39 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:42 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:88 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:108 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:129 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:152 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/FileHistorySection.svelte:16 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/FileHistorySection.svelte:28 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/FileHistorySection.svelte:45 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/FilesSection.svelte:11 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/FilesSection.svelte:23 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/FilesSection.svelte:35 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/HeadingTypographyEditor.svelte:60 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/HeadingTypographyEditor.svelte:73 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/HeadingTypographyEditor.svelte:86 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/HeadingTypographyEditor.svelte:103 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:24 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:36 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:50 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:62 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:74 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:88 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:22 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:37 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:44 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:51 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:58 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:68 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:75 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:85 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:92 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:102 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:109 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:119 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:126 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/QuickCaptureSection.svelte:38 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/QuickCaptureSection.svelte:50 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/QuickCaptureSection.svelte:68 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/SentrySection.svelte:48 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/SentrySection.svelte:59 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
more mounted-at 53 not shown: src/lib/core/settings(18) src/lib/features/event-calendar(11) src/lib/features/rail-shell(10) src/lib/features/todoist-sync(8) src/lib/features/auto-organize(2) src/lib/features/search(2) src/lib/plugins/queryjs(2): q callers src/lib/core/settings/sections/SettingItem.svelte:default
