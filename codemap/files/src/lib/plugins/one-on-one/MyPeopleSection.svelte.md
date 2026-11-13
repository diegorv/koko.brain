# file card src/lib/plugins/one-on-one/MyPeopleSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/one-on-one/MyPeopleSection.svelte ' codemap/files
file src/lib/plugins/one-on-one/MyPeopleSection.svelte component L77 module src/lib/plugins/one-on-one in1 t1
## imports
imp src/lib/plugins/one-on-one/MyPeopleSection.svelte:5 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/plugins/one-on-one/MyPeopleSection.svelte:6 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/plugins/one-on-one/MyPeopleSection.svelte:7 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/plugins/one-on-one/MyPeopleSection.svelte:8 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/plugins/one-on-one/MyPeopleSection.svelte:9 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/plugins/one-on-one/MyPeopleSection.svelte:10 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/plugins/one-on-one/MyPeopleSection.svelte:11 -> src/lib/utils/debug.ts error
imp src/lib/plugins/one-on-one/MyPeopleSection.svelte:12 -> src/lib/plugins/one-on-one/one-on-one.logic.ts buildMyPeople,myPeopleDaysLabel
imp src/lib/plugins/one-on-one/MyPeopleSection.svelte:13 -> src/lib/plugins/one-on-one/one-on-one.service.ts createOneOnOneNote
## imported-by
imp src/lib/plugins/one-on-one/one-on-one-today.service.ts:2 -> src/lib/plugins/one-on-one/MyPeopleSection.svelte default
## reach
in2 src/lib/plugins/one-on-one/MyPeopleSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/plugins/one-on-one/MyPeopleSection.svelte 29 files in 16 modules: src/lib/core/settings(4) src/lib/utils(4) src/lib/core/editor(3) src/lib/features/event-calendar(3) src/lib/contracts(2) +11 modules
## tests
test src/tests/lib/plugins/one-on-one/MyPeopleSection.test.ts imports src/lib/plugins/one-on-one/MyPeopleSection.svelte mirror
## symbols
sym src/lib/plugins/one-on-one/MyPeopleSection.svelte:1 component MyPeopleSection L77
by src/lib/plugins/one-on-one/MyPeopleSection.svelte:default <- src/lib/plugins/one-on-one/one-on-one-today.service.ts:16 in registerOneOnOneTodaySection ref
## locals
local src/lib/plugins/one-on-one/MyPeopleSection.svelte:25 fn newOneOnOne(name: string) L8
## calls
call src/lib/plugins/one-on-one/MyPeopleSection.svelte:17 in rows=$derived -> src/lib/plugins/one-on-one/one-on-one.logic.ts:buildMyPeople call
call src/lib/plugins/one-on-one/MyPeopleSection.svelte:27 in newOneOnOne -> src/lib/plugins/one-on-one/one-on-one.service.ts:createOneOnOneNote call
call src/lib/plugins/one-on-one/MyPeopleSection.svelte:29 in newOneOnOne -> src/lib/utils/debug.ts:error call
call src/lib/plugins/one-on-one/MyPeopleSection.svelte:51 in (markup) -> src/lib/core/editor/editor.service.ts:openFileInEditor markup
call src/lib/plugins/one-on-one/MyPeopleSection.svelte:63 in (markup) -> src/lib/plugins/one-on-one/one-on-one.logic.ts:myPeopleDaysLabel markup
call src/lib/plugins/one-on-one/MyPeopleSection.svelte:69 in (markup) -> src/lib/plugins/one-on-one/MyPeopleSection.svelte:newOneOnOne markup
