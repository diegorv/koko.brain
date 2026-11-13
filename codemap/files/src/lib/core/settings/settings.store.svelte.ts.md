# file card src/lib/core/settings/settings.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/settings.store.svelte.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, store
file src/lib/core/settings/settings.store.svelte.ts store L415 module src/lib/core/settings in83 t124
## imports
imp src/lib/core/settings/settings.store.svelte.ts:1 -> src/lib/core/settings/settings.types.ts type:AppSettings,type:PeriodicNotesUpdate,type:QuickCaptureUpdate,type:OneOnOneSettings,type:LayoutSettings,type:FolderNotesSettings,type:EditorSettings,type:TemplatesSettings,type:HistorySettings,type:SearchSettings,type:TodoistSettings,type:SentrySettings,type:AutoOrganizeSettings,type:TagColorSettings,type:QueryjsSettings,type:UpdateSettings,type:EventCalendarSettings
imp src/lib/core/settings/settings.store.svelte.ts:2 -> src/lib/core/settings/theme.types.ts type:AppearanceSettings
imp src/lib/core/settings/settings.store.svelte.ts:3 -> src/lib/core/settings/theme.logic.ts DEFAULT_APPEARANCE
## imported-by
imp src/lib/app/AppShell.svelte:6 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/app/EditorView.svelte:9 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/app/boot.ts:4 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/app/commands.ts:26 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/app/deep-link-actions.ts:13 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/app/editor-host.ts:23 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/app/lifecycle/app-lifecycle.service.ts:40 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/app/rail-navigation.ts:2 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/layout/layout.service.ts:2 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:24 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/AppearanceSection.svelte:6 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/EditorSection.svelte:9 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/FileHistorySection.svelte:5 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/FilesSection.svelte:4 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/HeadingTypographyEditor.svelte:4 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/OneOnOneSection.svelte:3 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/PeriodicNotesSection.svelte:4 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/QuickCaptureSection.svelte:3 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/SentrySection.svelte:6 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/TroubleshootingSection.svelte:10 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/TypesSection.svelte:4 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/UpdateSection.svelte:12 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/settings-persistence.svelte.ts:1 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/settings.service.ts:4 -> src/lib/core/settings/settings.store.svelte.ts settingsStore,DEFAULT_SETTINGS
imp src/lib/core/settings/theme.service.ts:5 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/update-check.service.ts:3 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:27 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:8 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/auto-organize/auto-organize.service.ts:14 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/deep-link/deep-link.service.ts:11 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/EventCalendarSection.svelte:7 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/EventCalendarView.svelte:13 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/EventDialog.svelte:9 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/EventMonthGrid.svelte:2 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/EventPopover.svelte:8 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/EventTimeGrid.svelte:3 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/EventWeekStrip.svelte:2 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/ShowInCalendarButton.svelte:5 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:1 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/event-calendar.service.ts:23 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
more imported-by 43 not shown: src/lib/features/rail-shell(9) src/lib/features/todoist-sync(5) src/lib/features/search(4) src/lib/features/tasks(4) src/lib/features/note-action-bar(2) src/lib/features/tags(2) src/lib/plugins/calendar(2) src/lib/plugins/mods(2) +11 modules: q importers src/lib/core/settings/settings.store.svelte.ts
## reach
in2 src/lib/core/settings/settings.store.svelte.ts 67 files in 34 modules: src/lib/features/event-calendar(9) src/lib/app(7) src/lib/core/filesystem(5) src/lib/core/vault(3) src/lib/features/properties(3) +29 modules: q impact src/lib/core/settings/settings.store.svelte.ts --depth 2
out2 src/lib/core/settings/settings.store.svelte.ts 4 files in 2 modules: src/lib/core/settings(3) src/lib/utils(1)
## tests
test src/tests/lib/core/settings/settings.store.reactivity.client.test.ts imports src/lib/core/settings/settings.store.svelte.ts mirror
test src/tests/lib/core/settings/settings.store.test.ts imports src/lib/core/settings/settings.store.svelte.ts mirror
test src/tests/fixtures/settings-effect-probe.svelte.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/app/AppShell.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/app/EditorView.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/app/boot.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/app/commands.new-commands.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/app/commands.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/app/commands.todoist.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/app/deep-link-capture-frontmatter.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/app/editor-host.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/app/global-keybindings.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/app/meta-bind-open-view.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/app/rail-navigation.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/app/tauri-listeners.service.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/layout/layout.service.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/decorator-toggles.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/pipeline-dom.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/markdown-editor/heading-fallbacks.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/note-creator/note-creator.service.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/settings/AppearanceSection.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/settings/EditorSection.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/settings/FilesSection.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/settings/HeadingTypographyEditor.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/settings/OneOnOneSection.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/settings/TroubleshootingSection.test.ts imports src/lib/core/settings/settings.store.svelte.ts
test src/tests/lib/core/settings/UpdateSection.layout.test.ts imports src/lib/core/settings/settings.store.svelte.ts
more tests 84 not shown: src/tests/lib/features/rail-shell(15) src/tests/lib/features/event-calendar(12) src/tests/lib/core/settings(9) src/tests/lib/features/tasks(6) src/tests/lib/features/todoist-sync(5) src/tests/lib/plugins/mods(4) src/tests/lib/features/deep-link(3) src/tests/lib/features/search(3) +18 modules: q tests src/lib/core/settings/settings.store.svelte.ts
## symbols
sym src/lib/core/settings/settings.store.svelte.ts:6 const DEFAULT_SETTINGS: AppSettings L157 | Fallback values used when no settings file exists or when it fails to parse
by src/lib/core/settings/settings.store.svelte.ts:DEFAULT_SETTINGS <- src/lib/core/settings/settings.service.ts:95 in parseSettings member +40
sym src/lib/core/settings/settings.store.svelte.ts:167 store settingsStore L249 | Reactive store for the app's persisted settings
by src/lib/core/settings/settings.store.svelte.ts:settingsStore <- src/lib/app/AppShell.svelte:61 in rightSidebarShown=$derived member +32
by src/lib/core/settings/settings.store.svelte.ts:settingsStore <- src/lib/app/EditorView.svelte:9 in (script) import
by src/lib/core/settings/settings.store.svelte.ts:settingsStore <- src/lib/app/boot.ts:38 in registerAppPorts member +2
by src/lib/core/settings/settings.store.svelte.ts:settingsStore <- src/lib/app/commands.ts:65 in railGoToCommands member +4
by src/lib/core/settings/settings.store.svelte.ts:settingsStore <- src/lib/app/deep-link-actions.ts:56 in executeDailyAction member +3
by src/lib/core/settings/settings.store.svelte.ts:settingsStore <- src/lib/app/editor-host.ts:55 in periodicTarget member +1
by src/lib/core/settings/settings.store.svelte.ts:settingsStore <- src/lib/app/lifecycle/app-lifecycle.service.ts:215 in initializeVault member +11
by src/lib/core/settings/settings.store.svelte.ts:settingsStore <- src/lib/app/rail-navigation.ts:23 in selectRailItem mcall +1
more by 75 not shown: src/lib/core/settings(16) src/lib/features/event-calendar(10) src/lib/features/rail-shell(9) src/lib/features/todoist-sync(5) src/lib/features/search(4) src/lib/features/tasks(4) src/lib/features/auto-organize(3) src/lib/features/note-action-bar(2) +17 modules: q importers src/lib/core/settings/settings.store.svelte.ts:settingsStore
## store
store src/lib/core/settings/settings.store.svelte.ts:167 settingsStore esc:1
mem src/lib/core/settings/settings.store.svelte.ts:168 get settingsStore.settings r:src/lib/core/settings/sections/TypesSection.svelte:18,src/lib/core/settings/sections/TypesSection.svelte:32,src/lib/core/settings/sections/TypesSection.svelte:47,src/lib/core/settings/settings-persistence.svelte.ts:35,src/lib/core/settings/settings.service.ts:280,src/lib/features/rail-shell/LayoutSection.svelte:108 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
mem src/lib/core/settings/settings.store.svelte.ts:169 get settingsStore.periodicNotes r:26 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
more r 26 not shown: src/lib/core/settings(13) src/lib/plugins/periodic-notes(6) src/lib/app(3) src/lib/features/rail-shell(1) src/lib/plugins/one-on-one(1) src/lib/plugins/quick-capture(1) src/lib/plugins/templates(1): q store src/lib/core/settings/settings.store.svelte.ts:settingsStore.periodicNotes
mem src/lib/core/settings/settings.store.svelte.ts:170 get settingsStore.quickCapture r:8 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
more r 8 not shown: src/lib/core/settings(4) src/lib/app(1) src/lib/features/rail-shell(1) src/lib/plugins/quick-capture(1) src/lib/plugins/templates(1): q store src/lib/core/settings/settings.store.svelte.ts:settingsStore.quickCapture
mem src/lib/core/settings/settings.store.svelte.ts:171 get settingsStore.oneOnOne r:12 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
more r 12 not shown: src/lib/core/settings(6) src/lib/plugins/one-on-one(5) src/lib/plugins/templates(1): q store src/lib/core/settings/settings.store.svelte.ts:settingsStore.oneOnOne
mem src/lib/core/settings/settings.store.svelte.ts:172 get settingsStore.layout r:50 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
more r 50 not shown: src/lib/features/rail-shell(22) src/lib/app(21) src/lib/plugins/calendar(3) src/lib/core/layout(2) src/lib/features/type-definitions(2): q store src/lib/core/settings/settings.store.svelte.ts:settingsStore.layout
mem src/lib/core/settings/settings.store.svelte.ts:173 get settingsStore.folderNotes r:src/lib/core/settings/sections/FilesSection.svelte:40,src/lib/features/rail-shell/FilesNavigator.svelte:243 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
mem src/lib/core/settings/settings.store.svelte.ts:174 get settingsStore.editor r:21 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
more r 21 not shown: src/lib/core/markdown-editor(11) src/lib/core/settings(8) src/lib/features/note-action-bar(2): q store src/lib/core/settings/settings.store.svelte.ts:settingsStore.editor
mem src/lib/core/settings/settings.store.svelte.ts:175 get settingsStore.templates r:30 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
more r 30 not shown: src/lib/features/auto-organize(7) src/lib/app(4) src/lib/features/tasks(4) src/lib/features/event-calendar(3) src/lib/features/rail-shell(3) src/lib/core/settings(2) src/lib/features/todoist-sync(2) src/lib/plugins/templates(2) +3 modules: q store src/lib/core/settings/settings.store.svelte.ts:settingsStore.templates
mem src/lib/core/settings/settings.store.svelte.ts:176 get settingsStore.appearance r:13 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
more r 13 not shown: src/lib/core/settings(13): q store src/lib/core/settings/settings.store.svelte.ts:settingsStore.appearance
mem src/lib/core/settings/settings.store.svelte.ts:177 get settingsStore.history r:7 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
more r 7 not shown: src/lib/core/settings(3) src/lib/app(2) src/lib/features/file-history(2): q store src/lib/core/settings/settings.store.svelte.ts:settingsStore.history
mem src/lib/core/settings/settings.store.svelte.ts:178 get settingsStore.search r:7 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
more r 7 not shown: src/lib/features/search(5) src/lib/app(2): q store src/lib/core/settings/settings.store.svelte.ts:settingsStore.search
mem src/lib/core/settings/settings.store.svelte.ts:179 get settingsStore.autoOrganize r:src/lib/app/lifecycle/app-lifecycle.service.ts:452,src/lib/features/auto-organize/AutoOrganizeSection.svelte:115,src/lib/features/auto-organize/AutoOrganizeSection.svelte:133,src/lib/features/auto-organize/auto-organize.service.ts:207,src/lib/features/auto-organize/auto-organize.service.ts:227,src/lib/features/auto-organize/auto-organize.service.ts:235 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
mem src/lib/core/settings/settings.store.svelte.ts:180 get settingsStore.eventCalendar r:24 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
more r 24 not shown: src/lib/features/event-calendar(22) src/lib/plugins/calendar(2): q store src/lib/core/settings/settings.store.svelte.ts:settingsStore.eventCalendar
mem src/lib/core/settings/settings.store.svelte.ts:181 get settingsStore.todoist r:10 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
more r 10 not shown: src/lib/features/todoist-sync(10): q store src/lib/core/settings/settings.store.svelte.ts:settingsStore.todoist
mem src/lib/core/settings/settings.store.svelte.ts:182 get settingsStore.sentry r:src/lib/app/lifecycle/app-lifecycle.service.ts:215,src/lib/core/settings/sections/SentrySection.svelte:16,src/lib/core/settings/sections/SentrySection.svelte:53,src/lib/core/settings/sections/SentrySection.svelte:58,src/lib/core/settings/sections/SentrySection.svelte:66 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
mem src/lib/core/settings/settings.store.svelte.ts:183 get settingsStore.debugMode r:src/lib/core/markdown-editor/MarkdownEditor.svelte:258,src/lib/core/settings/sections/TroubleshootingSection.svelte:28,src/lib/utils/debug.ts:20,src/lib/utils/debug.ts:74 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
mem src/lib/core/settings/settings.store.svelte.ts:184 get settingsStore.debugModeTauri r:src/lib/app/lifecycle/app-lifecycle.service.ts:227,src/lib/core/settings/sections/TroubleshootingSection.svelte:132 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
mem src/lib/core/settings/settings.store.svelte.ts:185 get settingsStore.debugLogToFile r:8 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
more r 8 not shown: src/lib/utils(3) src/lib/core/settings(2) src/lib/app(1) src/lib/core/markdown-editor(1) src/lib/plugins/mods(1): q store src/lib/core/settings/settings.store.svelte.ts:settingsStore.debugLogToFile
mem src/lib/core/settings/settings.store.svelte.ts:187 get settingsStore.debugModRunMessages r:src/lib/core/settings/sections/TroubleshootingSection.svelte:60,src/lib/plugins/mods/mods-host.service.ts:445 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22 | Whether the user consented to local persistence of raw mod run messages.
mem src/lib/core/settings/settings.store.svelte.ts:188 get settingsStore.debugTauriLogToFile r:src/lib/app/lifecycle/app-lifecycle.service.ts:232,src/lib/core/settings/sections/TroubleshootingSection.svelte:47,src/lib/core/settings/sections/TroubleshootingSection.svelte:145,src/lib/utils/debug.ts:131,src/lib/utils/debug.ts:144 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
mem src/lib/core/settings/settings.store.svelte.ts:189 get settingsStore.debugHeartbeat r:src/lib/app/lifecycle/app-lifecycle.service.ts:236,src/lib/core/settings/sections/TroubleshootingSection.svelte:45,src/lib/core/settings/sections/TroubleshootingSection.svelte:70,src/lib/core/settings/sections/TroubleshootingSection.svelte:150 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
mem src/lib/core/settings/settings.store.svelte.ts:190 get settingsStore.livePreviewProfiling r:src/lib/app/boot.ts:38,src/lib/core/settings/sections/TroubleshootingSection.svelte:98 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
mem src/lib/core/settings/settings.store.svelte.ts:191 get settingsStore.disabledDecorators r:src/lib/core/markdown-editor/MarkdownEditor.svelte:126,src/lib/core/markdown-editor/MarkdownEditor.svelte:244,src/lib/core/markdown-editor/MarkdownEditor.svelte:662,src/lib/core/settings/sections/TroubleshootingSection.svelte:14 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
mem src/lib/core/settings/settings.store.svelte.ts:192 get settingsStore.tagColors r:src/lib/core/markdown-editor/MarkdownEditor.svelte:668,src/lib/features/properties/PropertyField.svelte:171,src/lib/features/tags/TagItem.svelte:23,src/lib/features/tags/TagsView.svelte:22 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
mem src/lib/core/settings/settings.store.svelte.ts:193 get settingsStore.queryjs r:src/lib/plugins/queryjs/QueryjsSection.svelte:54,src/lib/plugins/queryjs/QueryjsSection.svelte:58,src/lib/plugins/queryjs/QueryjsSection.svelte:62,src/lib/plugins/queryjs/queryjs-block-widget.ts:136,src/lib/plugins/queryjs/queryjs-block-widget.ts:192 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
mem src/lib/core/settings/settings.store.svelte.ts:194 get settingsStore.updates r:8 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
more r 8 not shown: src/lib/core/settings(8): q store src/lib/core/settings/settings.store.svelte.ts:settingsStore.updates
mem src/lib/core/settings/settings.store.svelte.ts:195 get settingsStore.explicitOrganization r:14 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
more r 14 not shown: src/lib/app(3) src/lib/features/rail-shell(2) src/lib/features/type-definitions(2) src/lib/core/settings(1) src/lib/features/deep-link(1) src/lib/features/note-action-bar(1) src/lib/features/quick-switcher(1) src/lib/plugins/one-on-one(1) +2 modules: q store src/lib/core/settings/settings.store.svelte.ts:settingsStore.explicitOrganization
mem src/lib/core/settings/settings.store.svelte.ts:196 get settingsStore.showUntypedNotes r:src/lib/app/AppShell.svelte:140,src/lib/core/settings/sections/TypesSection.svelte:30 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
mem src/lib/core/settings/settings.store.svelte.ts:197 get settingsStore.typesBaseFolder r:src/lib/core/settings/sections/TypesSection.svelte:44,src/lib/features/event-calendar/EventCalendarSection.svelte:55,src/lib/features/type-definitions/type-definitions.service.ts:61 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
mem src/lib/core/settings/settings.store.svelte.ts:198 get settingsStore.dockBadgeInboxCount r:src/lib/app/AppShell.svelte:67,src/lib/features/rail-shell/LayoutSection.svelte:106 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22
mem src/lib/core/settings/settings.store.svelte.ts:200 get settingsStore.tasksView r:src/lib/features/tasks/tasks.service.ts:120,src/lib/features/tasks/tasks.service.ts:144 w-via:setSettings,updatePeriodicNotes,updateQuickCapture,updateOneOnOne,updateFolderNotes,+22 | The Tasks view's saved state, unvalidated; `undefined` when nothing was saved
mem src/lib/core/settings/settings.store.svelte.ts:203 do settingsStore.setSettings w:src/lib/core/settings/sections/TypesSection.svelte:18,src/lib/core/settings/sections/TypesSection.svelte:32,src/lib/core/settings/sections/TypesSection.svelte:46,src/lib/core/settings/settings.service.ts:71,src/lib/core/settings/settings.service.ts:246,src/lib/features/rail-shell/LayoutSection.svelte:108 | Replaces the entire settings object (used on load)
mem src/lib/core/settings/settings.store.svelte.ts:208 do settingsStore.updatePeriodicNotes w:src/lib/core/settings/sections/PeriodicNotesSection.svelte:13,src/lib/core/settings/sections/PeriodicNotesSection.svelte:29 | Partially updates periodic notes settings, deep-merging nested period objects
mem src/lib/core/settings/settings.store.svelte.ts:229 do settingsStore.updateQuickCapture w:src/lib/core/settings/sections/QuickCaptureSection.svelte:45,src/lib/core/settings/sections/QuickCaptureSection.svelte:57,src/lib/core/settings/sections/QuickCaptureSection.svelte:72 | Partially updates Quick Capture settings, merging with existing values.
mem src/lib/core/settings/settings.store.svelte.ts:242 do settingsStore.updateOneOnOne w:src/lib/core/settings/sections/OneOnOneSection.svelte:15,src/lib/core/settings/sections/OneOnOneSection.svelte:31,src/lib/core/settings/sections/OneOnOneSection.svelte:43,src/lib/core/settings/sections/OneOnOneSection.svelte:57,src/lib/core/settings/sections/OneOnOneSection.svelte:69,src/lib/core/settings/sections/OneOnOneSection.svelte:81 | Partially updates 1:1 notes settings, merging with existing values
mem src/lib/core/settings/settings.store.svelte.ts:250 do settingsStore.updateLayout w:41 | Partially updates layout settings, merging with existing values
more w 41 not shown: src/lib/features/rail-shell(19) src/lib/app(12) src/lib/core/layout(4) src/lib/features/type-definitions(2) src/lib/plugins/calendar(2) src/lib/features/search(1) src/lib/plugins/table-of-contents(1): q store src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout
mem src/lib/core/settings/settings.store.svelte.ts:258 do settingsStore.updateFolderNotes w:src/lib/core/settings/sections/FilesSection.svelte:42 | Partially updates folder notes settings, merging with existing values
mem src/lib/core/settings/settings.store.svelte.ts:266 do settingsStore.updateEditor w:12 | Partially updates editor settings, merging with existing values
more w 12 not shown: src/lib/core/settings(11) src/lib/features/note-action-bar(1): q store src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateEditor
mem src/lib/core/settings/settings.store.svelte.ts:274 do settingsStore.updateTemplates w:src/lib/core/settings/sections/FilesSection.svelte:18,src/lib/core/settings/sections/FilesSection.svelte:30 | Partially updates templates settings, merging with existing values
mem src/lib/core/settings/settings.store.svelte.ts:282 do settingsStore.updateAppearance w:8 | Partially updates appearance settings, merging with existing values
more w 8 not shown: src/lib/core/settings(8): q store src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateAppearance
mem src/lib/core/settings/settings.store.svelte.ts:290 do settingsStore.updateHistory w:src/lib/core/settings/sections/FileHistorySection.svelte:23,src/lib/core/settings/sections/FileHistorySection.svelte:40,src/lib/core/settings/sections/FileHistorySection.svelte:52 | Partially updates file history settings, merging with existing values
mem src/lib/core/settings/settings.store.svelte.ts:298 do settingsStore.updateSearch w:src/lib/app/lifecycle/app-lifecycle.service.ts:479,src/lib/app/lifecycle/app-lifecycle.service.ts:493,src/lib/features/search/SearchSection.svelte:58,src/lib/features/search/SearchSection.svelte:87 | Partially updates search settings, merging with existing values
mem src/lib/core/settings/settings.store.svelte.ts:306 do settingsStore.updateAutoOrganize w:src/lib/features/auto-organize/AutoOrganizeSection.svelte:117,src/lib/features/auto-organize/AutoOrganizeSection.svelte:137 | Partially updates auto-organize settings, merging with existing values
mem src/lib/core/settings/settings.store.svelte.ts:314 do settingsStore.updateEventCalendar w:9 | Partially updates event calendar settings, merging with existing values
more w 9 not shown: src/lib/features/event-calendar(9): q store src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateEventCalendar
mem src/lib/core/settings/settings.store.svelte.ts:322 do settingsStore.updateTodoist w:8 | Partially updates Todoist settings, merging with existing values
more w 8 not shown: src/lib/features/todoist-sync(8): q store src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateTodoist
mem src/lib/core/settings/settings.store.svelte.ts:330 do settingsStore.updateSentry w:src/lib/core/settings/sections/SentrySection.svelte:14 | Partially updates optional Sentry error-monitoring settings.
mem src/lib/core/settings/settings.store.svelte.ts:338 do settingsStore.updateDebugMode w:src/lib/core/settings/sections/TroubleshootingSection.svelte:30 | Updates the debug mode flag
mem src/lib/core/settings/settings.store.svelte.ts:343 do settingsStore.updateDebugModeTauri w:src/lib/core/settings/sections/TroubleshootingSection.svelte:134 | Updates the Tauri debug mode flag
mem src/lib/core/settings/settings.store.svelte.ts:348 do settingsStore.updateDebugLogToFile w:src/lib/core/settings/sections/TroubleshootingSection.svelte:42 | Updates the debug log-to-file flag
mem src/lib/core/settings/settings.store.svelte.ts:353 do settingsStore.updateDebugModRunMessages w:src/lib/core/settings/sections/TroubleshootingSection.svelte:61 | Updates explicit consent to persist raw mod run messages locally.
mem src/lib/core/settings/settings.store.svelte.ts:358 do settingsStore.updateDebugTauriLogToFile w:src/lib/core/settings/sections/TroubleshootingSection.svelte:147 | Updates the Tauri debug log-to-file flag
mem src/lib/core/settings/settings.store.svelte.ts:363 do settingsStore.updateDebugHeartbeat w:src/lib/core/settings/sections/TroubleshootingSection.svelte:72 | Updates the heartbeat debug flag (250 ms `[HB] alive` ticks while logging)
mem src/lib/core/settings/settings.store.svelte.ts:368 do settingsStore.updateLivePreviewProfiling w:src/lib/core/settings/sections/TroubleshootingSection.svelte:100 | Updates the live preview profiling flag
mem src/lib/core/settings/settings.store.svelte.ts:373 do settingsStore.toggleDecorator w:src/lib/core/settings/sections/TroubleshootingSection.svelte:119 | Toggles a specific live preview decorator on/off
mem src/lib/core/settings/settings.store.svelte.ts:379 do settingsStore.updateTagColors w:src/lib/features/tags/TagsView.svelte:23 | Partially updates tag color settings, merging with existing values
mem src/lib/core/settings/settings.store.svelte.ts:387 do settingsStore.updateQueryjs w:src/lib/plugins/queryjs/QueryjsSection.svelte:36 | Partially updates QueryJS plugin settings, merging with existing values
mem src/lib/core/settings/settings.store.svelte.ts:398 do settingsStore.updateUpdates w:src/lib/core/settings/sections/UpdateSection.svelte:65,src/lib/core/settings/sections/UpdateSection.svelte:76,src/lib/core/settings/sections/UpdateSection.svelte:157,src/lib/core/settings/update-check.service.ts:27 | Partially updates the auto-updater settings (channel / autoCheck / lastCheckedAt), shallow-merging with the existing values.
mem src/lib/core/settings/settings.store.svelte.ts:406 do settingsStore.updateTasksView w:src/lib/features/tasks/tasks.service.ts:119 | Replaces the Tasks view's saved state; the store never inspects it
mem src/lib/core/settings/settings.store.svelte.ts:412 do settingsStore.reset w:src/lib/core/settings/settings.service.ts:296 | Restores all settings to their defaults
