# file card src/lib/core/settings/settings-panel.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/settings-panel.store.svelte.ts ' codemap/files
file src/lib/core/settings/settings-panel.store.svelte.ts store L24 module src/lib/core/settings in5 t6
## imports
imp src/lib/core/settings/settings-panel.store.svelte.ts:1 -> src/lib/core/settings/settings.types.ts type:SettingsSection
## imported-by
imp src/lib/app/SettingsPanel.svelte:98 -> src/lib/core/settings/settings-panel.store.svelte.ts settingsPanelStore
imp src/lib/app/commands.ts:32 -> src/lib/core/settings/settings-panel.store.svelte.ts settingsPanelStore
imp src/lib/app/global-keybindings.ts:16 -> src/lib/core/settings/settings-panel.store.svelte.ts settingsPanelStore
imp src/lib/app/tauri-listeners.service.ts:6 -> src/lib/core/settings/settings-panel.store.svelte.ts settingsPanelStore
imp src/lib/features/event-calendar/EventCalendarSection.svelte:8 -> src/lib/core/settings/settings-panel.store.svelte.ts settingsPanelStore
## reach
in2 src/lib/core/settings/settings-panel.store.svelte.ts 2 files in 2 modules: src/lib/app(1) src/routes(1)
out2 src/lib/core/settings/settings-panel.store.svelte.ts 2 files in 1 modules: src/lib/core/settings(2)
## tests
test src/tests/lib/core/settings/settings-panel.store.test.ts imports src/lib/core/settings/settings-panel.store.svelte.ts mirror
test src/tests/lib/app/SettingsPanel.test.ts imports src/lib/core/settings/settings-panel.store.svelte.ts
test src/tests/lib/app/commands.test.ts imports src/lib/core/settings/settings-panel.store.svelte.ts
test src/tests/lib/app/global-keybindings.test.ts imports src/lib/core/settings/settings-panel.store.svelte.ts
test src/tests/lib/app/tauri-listeners.service.test.ts imports src/lib/core/settings/settings-panel.store.svelte.ts
test src/tests/lib/features/event-calendar/EventCalendarSection.test.ts imports src/lib/core/settings/settings-panel.store.svelte.ts
## symbols
sym src/lib/core/settings/settings-panel.store.svelte.ts:7 store settingsPanelStore L18 | Reactive store for the in-app settings panel (open/close + active section).
by src/lib/core/settings/settings-panel.store.svelte.ts:settingsPanelStore <- src/lib/app/SettingsPanel.svelte:103 in SectionContent=$derived member +6
by src/lib/core/settings/settings-panel.store.svelte.ts:settingsPanelStore <- src/lib/app/commands.ts:403 in getBuiltInCommands mcall
by src/lib/core/settings/settings-panel.store.svelte.ts:settingsPanelStore <- src/lib/app/global-keybindings.ts:165 in GLOBAL_KEYBINDINGS mcall
by src/lib/core/settings/settings-panel.store.svelte.ts:settingsPanelStore <- src/lib/app/tauri-listeners.service.ts:29 in registerMenuSettingsListener mcall
by src/lib/core/settings/settings-panel.store.svelte.ts:settingsPanelStore <- src/lib/features/event-calendar/EventCalendarSection.svelte:77 in openEventType mcall +1
## store
store src/lib/core/settings/settings-panel.store.svelte.ts:7 settingsPanelStore esc:0
mem src/lib/core/settings/settings-panel.store.svelte.ts:8 get settingsPanelStore.isOpen r:src/lib/app/SettingsPanel.svelte:106,src/lib/app/SettingsPanel.svelte:114 w-via:open,close,toggle,_reset
mem src/lib/core/settings/settings-panel.store.svelte.ts:9 get settingsPanelStore.activeSection r:src/lib/app/SettingsPanel.svelte:103,src/lib/app/SettingsPanel.svelte:135 w-via:open,setSection,_reset
mem src/lib/core/settings/settings-panel.store.svelte.ts:11 do settingsPanelStore.open w:-
mem src/lib/core/settings/settings-panel.store.svelte.ts:15 do settingsPanelStore.close w:src/lib/app/SettingsPanel.svelte:107,src/lib/app/SettingsPanel.svelte:151,src/lib/features/event-calendar/EventCalendarSection.svelte:77,src/lib/features/event-calendar/EventCalendarSection.svelte:103
mem src/lib/core/settings/settings-panel.store.svelte.ts:16 do settingsPanelStore.toggle w:src/lib/app/commands.ts:403,src/lib/app/global-keybindings.ts:165,src/lib/app/tauri-listeners.service.ts:29
mem src/lib/core/settings/settings-panel.store.svelte.ts:17 do settingsPanelStore.setSection w:src/lib/app/SettingsPanel.svelte:139
mem src/lib/core/settings/settings-panel.store.svelte.ts:20 do settingsPanelStore._reset w:-
