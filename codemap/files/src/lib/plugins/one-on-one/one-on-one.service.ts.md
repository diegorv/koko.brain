# file card src/lib/plugins/one-on-one/one-on-one.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/one-on-one/one-on-one.service.ts ' codemap/files
file src/lib/plugins/one-on-one/one-on-one.service.ts service L133 module src/lib/plugins/one-on-one in6 t8
## imports
imp src/lib/plugins/one-on-one/one-on-one.service.ts:2 -> pkg:@tauri-apps/plugin-fs readDir,exists
imp src/lib/plugins/one-on-one/one-on-one.service.ts:4 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/plugins/one-on-one/one-on-one.service.ts:5 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/plugins/one-on-one/one-on-one.service.ts:6 -> src/lib/core/note-creator/note-creator.service.ts openOrCreateNote
imp src/lib/plugins/one-on-one/one-on-one.service.ts:7 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization
imp src/lib/plugins/one-on-one/one-on-one.service.ts:8 -> src/lib/core/frontmatter/properties.logic.ts ensureFrontmatterLink
imp src/lib/plugins/one-on-one/one-on-one.service.ts:9 -> src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts noteActionBarActionsStore
imp src/lib/plugins/one-on-one/one-on-one.service.ts:10 -> src/lib/plugins/one-on-one/one-on-one.store.svelte.ts oneOnOneStore,type:OneOnOneSelectHandler
imp src/lib/plugins/one-on-one/one-on-one.service.ts:11 -> src/lib/plugins/one-on-one/one-on-one.logic.ts buildOneOnOnePath,buildOneOnOneVariables,loadPeopleFromEntries,mergePeopleLists
imp src/lib/plugins/one-on-one/one-on-one.service.ts:17 -> src/lib/utils/debug.ts error
imp src/lib/plugins/one-on-one/one-on-one.service.ts:18 -> src/lib/utils/path.ts stem
## imported-by
imp src/lib/app/commands.ts:48 -> src/lib/plugins/one-on-one/one-on-one.service.ts openOneOnOnePicker
imp src/lib/app/global-keybindings.ts:18 -> src/lib/plugins/one-on-one/one-on-one.service.ts openOneOnOnePicker
imp src/lib/app/lifecycle/app-lifecycle.service.ts:67 -> src/lib/plugins/one-on-one/one-on-one.service.ts registerOneOnOneActionBarAction
imp src/lib/plugins/mods/mod-app.service.ts:17 -> src/lib/plugins/one-on-one/one-on-one.service.ts createOneOnOneNote,openOneOnOnePicker
imp src/lib/plugins/one-on-one/MyPeopleSection.svelte:13 -> src/lib/plugins/one-on-one/one-on-one.service.ts createOneOnOneNote
imp src/lib/plugins/one-on-one/OneOnOnePicker.svelte:5 -> src/lib/plugins/one-on-one/one-on-one.service.ts createOneOnOneNote
## reach
in2 src/lib/plugins/one-on-one/one-on-one.service.ts 4 files in 4 modules: src/lib/app(1) src/lib/plugins/mods(1) src/lib/plugins/one-on-one(1) src/routes(1)
out2 src/lib/plugins/one-on-one/one-on-one.service.ts 21 files in 11 modules: src/lib/core/settings(4) src/lib/utils(4) src/lib/core/filesystem(3) src/lib/contracts(2) src/lib/core/editor(2) +6 modules
## tests
test src/tests/lib/plugins/one-on-one/one-on-one.service.test.ts imports src/lib/plugins/one-on-one/one-on-one.service.ts mirror
test src/tests/lib/features/note-action-bar/NoteActionBar.test.ts imports src/lib/plugins/one-on-one/one-on-one.service.ts
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports src/lib/plugins/one-on-one/one-on-one.service.ts
test src/tests/lib/plugins/one-on-one/one-on-one.create.test.ts imports src/lib/plugins/one-on-one/one-on-one.service.ts
test src/tests/lib/app/commands.test.ts mocks src/lib/plugins/one-on-one/one-on-one.service.ts
test src/tests/lib/app/global-keybindings.test.ts mocks src/lib/plugins/one-on-one/one-on-one.service.ts
test src/tests/lib/features/command-palette/CommandPalette.test.ts mocks src/lib/plugins/one-on-one/one-on-one.service.ts
test src/tests/lib/plugins/one-on-one/OneOnOnePicker.test.ts mocks src/lib/plugins/one-on-one/one-on-one.service.ts
## symbols
sym src/lib/plugins/one-on-one/one-on-one.service.ts:42 fn loadPeople(): Promise<void> L17 | Scans both the work and personal people folders in the vault and populates the store.
sym src/lib/plugins/one-on-one/one-on-one.service.ts:67 fn createOneOnOneNote(personName: string): Promise<void> L32 | Creates and opens a new 1:1 note for the given person, or opens the one that already exists at the same path.
by src/lib/plugins/one-on-one/one-on-one.service.ts:createOneOnOneNote <- src/lib/plugins/mods/mod-app.service.ts:38 in MOD_APP ref
by src/lib/plugins/one-on-one/one-on-one.service.ts:createOneOnOneNote <- src/lib/plugins/one-on-one/MyPeopleSection.svelte:27 in newOneOnOne call
by src/lib/plugins/one-on-one/one-on-one.service.ts:createOneOnOneNote <- src/lib/plugins/one-on-one/OneOnOnePicker.svelte:45 in selectPerson call
sym src/lib/plugins/one-on-one/one-on-one.service.ts:105 fn registerOneOnOneActionBarAction(): () => void L15 | Registers "New 1:1" into the note action bar for Person notes; the person is the note's file name.
by src/lib/plugins/one-on-one/one-on-one.service.ts:registerOneOnOneActionBarAction <- src/lib/app/lifecycle/app-lifecycle.service.ts:271 in initializeVault call
sym src/lib/plugins/one-on-one/one-on-one.service.ts:125 fn openOneOnOnePicker(onSelect?: OneOnOneSelectHandler): Promise<void> L4 | Opens the person picker dialog, loading people first.
by src/lib/plugins/one-on-one/one-on-one.service.ts:openOneOnOnePicker <- src/lib/app/commands.ts:369 in getBuiltInCommands call
by src/lib/plugins/one-on-one/one-on-one.service.ts:openOneOnOnePicker <- src/lib/app/global-keybindings.ts:159 in GLOBAL_KEYBINDINGS call
by src/lib/plugins/one-on-one/one-on-one.service.ts:openOneOnOnePicker <- src/lib/plugins/mods/mod-app.service.ts:43 in MOD_APP ref
sym src/lib/plugins/one-on-one/one-on-one.service.ts:131 fn resetOneOnOne(): void L3 | Resets 1:1 notes plugin state
## locals
local src/lib/plugins/one-on-one/one-on-one.service.ts:24 fn loadPeopleFromFolder(vaultPath: string, folder: string, context: 'work' | 'personal') L12
## calls
call src/lib/plugins/one-on-one/one-on-one.service.ts:34 in loadPeopleFromFolder -> src/lib/plugins/one-on-one/one-on-one.logic.ts:loadPeopleFromEntries call
call src/lib/plugins/one-on-one/one-on-one.service.ts:50 in loadPeople -> src/lib/plugins/one-on-one/one-on-one.service.ts:loadPeopleFromFolder call +1
call src/lib/plugins/one-on-one/one-on-one.service.ts:53 in loadPeople -> src/lib/plugins/one-on-one/one-on-one.logic.ts:mergePeopleLists call
call src/lib/plugins/one-on-one/one-on-one.service.ts:53 in loadPeople -> src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:oneOnOneStore.setPeople mcall +1
call src/lib/plugins/one-on-one/one-on-one.service.ts:55 in loadPeople -> src/lib/utils/debug.ts:error call
call src/lib/plugins/one-on-one/one-on-one.service.ts:75 in createOneOnOneNote -> src/lib/plugins/one-on-one/one-on-one.logic.ts:buildOneOnOnePath call
call src/lib/plugins/one-on-one/one-on-one.service.ts:88 in createOneOnOneNote -> src/lib/plugins/one-on-one/one-on-one.logic.ts:buildOneOnOneVariables call
call src/lib/plugins/one-on-one/one-on-one.service.ts:90 in createOneOnOneNote -> src/lib/core/note-creator/note-creator.service.ts:openOrCreateNote call
call src/lib/plugins/one-on-one/one-on-one.service.ts:96 in createOneOnOneNote -> src/lib/core/frontmatter/properties.logic.ts:ensureFrontmatterLink call
call src/lib/plugins/one-on-one/one-on-one.service.ts:96 in createOneOnOneNote -> src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization call
call src/lib/plugins/one-on-one/one-on-one.service.ts:106 in registerOneOnOneActionBarAction -> src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts:noteActionBarActionsStore.register mcall
call src/lib/plugins/one-on-one/one-on-one.service.ts:112 in registerOneOnOneActionBarAction -> src/lib/plugins/one-on-one/one-on-one.service.ts:createOneOnOneNote call
call src/lib/plugins/one-on-one/one-on-one.service.ts:112 in registerOneOnOneActionBarAction -> src/lib/utils/path.ts:stem call
call src/lib/plugins/one-on-one/one-on-one.service.ts:114 in registerOneOnOneActionBarAction -> src/lib/utils/debug.ts:error call
call src/lib/plugins/one-on-one/one-on-one.service.ts:126 in openOneOnOnePicker -> src/lib/plugins/one-on-one/one-on-one.service.ts:loadPeople call
call src/lib/plugins/one-on-one/one-on-one.service.ts:127 in openOneOnOnePicker -> src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:oneOnOneStore.open mcall
call src/lib/plugins/one-on-one/one-on-one.service.ts:132 in resetOneOnOne -> src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:oneOnOneStore.reset mcall
## effects
fx src/lib/plugins/one-on-one/one-on-one.service.ts:31 tauri-fs.exists in loadPeopleFromFolder
fx src/lib/plugins/one-on-one/one-on-one.service.ts:33 tauri-fs.readDir in loadPeopleFromFolder
reg src/lib/plugins/one-on-one/one-on-one.service.ts:106 src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts:noteActionBarActionsStore.register in registerOneOnOneActionBarAction args={ id: 'new-one-on-one', label: 'New 1:1', typeName: 'Person', run: async (path)…
