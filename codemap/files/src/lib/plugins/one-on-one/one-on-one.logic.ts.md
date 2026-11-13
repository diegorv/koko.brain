# file card src/lib/plugins/one-on-one/one-on-one.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/one-on-one/one-on-one.logic.ts ' codemap/files
file src/lib/plugins/one-on-one/one-on-one.logic.ts logic L189 module src/lib/plugins/one-on-one in4 t3
## imports
imp src/lib/plugins/one-on-one/one-on-one.logic.ts:2 -> src/lib/core/settings/settings.types.ts type:PeriodicNotesSettings
imp src/lib/plugins/one-on-one/one-on-one.logic.ts:3 -> src/lib/core/filesystem/fs.logic.ts isViewFile
imp src/lib/plugins/one-on-one/one-on-one.logic.ts:4 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/plugins/one-on-one/one-on-one.logic.ts:5 -> src/lib/features/rail-shell/lens.logic.ts entryNoteDate
imp src/lib/plugins/one-on-one/one-on-one.logic.ts:6 -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts buildWikilinkPath
imp src/lib/plugins/one-on-one/one-on-one.logic.ts:7 -> src/lib/utils/note-date.ts parseDateKey
## imported-by
imp src/lib/plugins/one-on-one/MyPeopleSection.svelte:12 -> src/lib/plugins/one-on-one/one-on-one.logic.ts buildMyPeople,myPeopleDaysLabel
imp src/lib/plugins/one-on-one/OneOnOnePicker.svelte:6 -> src/lib/plugins/one-on-one/one-on-one.logic.ts filterPeople,type:PersonEntry
imp src/lib/plugins/one-on-one/one-on-one.service.ts:11 -> src/lib/plugins/one-on-one/one-on-one.logic.ts buildOneOnOnePath,buildOneOnOneVariables,loadPeopleFromEntries,mergePeopleLists
imp src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:1 -> src/lib/plugins/one-on-one/one-on-one.logic.ts type:PersonEntry
## reach
in2 src/lib/plugins/one-on-one/one-on-one.logic.ts 6 files in 3 modules: src/lib/app(4) src/lib/plugins/mods(1) src/lib/plugins/one-on-one(1)
out2 src/lib/plugins/one-on-one/one-on-one.logic.ts 19 files in 7 modules: src/lib/features/collection(5) src/lib/features/type-definitions(4) src/lib/core/settings(3) src/lib/utils(3) src/lib/core/filesystem(2) +2 modules
## tests
test src/tests/lib/plugins/one-on-one/one-on-one.logic.test.ts imports src/lib/plugins/one-on-one/one-on-one.logic.ts mirror
test src/tests/help/queryjs-contract.test.ts imports src/lib/plugins/one-on-one/one-on-one.logic.ts
test src/tests/lib/plugins/one-on-one/one-on-one.service.test.ts imports src/lib/plugins/one-on-one/one-on-one.logic.ts
test src/tests/lib/plugins/one-on-one/OneOnOnePicker.test.ts imports-type src/lib/plugins/one-on-one/one-on-one.logic.ts
## symbols
sym src/lib/plugins/one-on-one/one-on-one.logic.ts:10 interface PersonEntry L8 | A person entry loaded from the people folder
by src/lib/plugins/one-on-one/one-on-one.logic.ts:PersonEntry <- src/lib/plugins/one-on-one/OneOnOnePicker.svelte:6 in (script) import
by src/lib/plugins/one-on-one/one-on-one.logic.ts:PersonEntry <- src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:1 in (module) import
sym src/lib/plugins/one-on-one/one-on-one.logic.ts:26 fn buildOneOnOnePath(vaultPath: string, baseFolder: string, folderFormat: string, filenameFormat: string, personName: string, date: dayjs.D… L17 | Builds the full absolute path for a 1:1 note.
by src/lib/plugins/one-on-one/one-on-one.logic.ts:buildOneOnOnePath <- src/lib/plugins/one-on-one/one-on-one.service.ts:75 in createOneOnOneNote call
sym src/lib/plugins/one-on-one/one-on-one.logic.ts:49 fn buildOneOnOneVariables(date: dayjs.Dayjs, personName: string, periodicNotesSettings: PeriodicNotesSettings): Record<string, string> L23 | Builds custom template variables for a 1:1 note.
by src/lib/plugins/one-on-one/one-on-one.logic.ts:buildOneOnOneVariables <- src/lib/plugins/one-on-one/one-on-one.service.ts:88 in createOneOnOneNote call
sym src/lib/plugins/one-on-one/one-on-one.logic.ts:77 fn loadPeopleFromEntries(entries: { name: string; isDirectory: boolean }[], folderPath: string, context: 'work' | 'personal'): PersonEntry[] L14 | Processes readDir entries into a sorted list of PersonEntry objects.
by src/lib/plugins/one-on-one/one-on-one.logic.ts:loadPeopleFromEntries <- src/lib/plugins/one-on-one/one-on-one.service.ts:34 in loadPeopleFromFolder call
sym src/lib/plugins/one-on-one/one-on-one.logic.ts:96 fn mergePeopleLists(workPeople: PersonEntry[], personalPeople: PersonEntry[]): PersonEntry[] L6 | Merges work and personal people lists into a single ordered list.
by src/lib/plugins/one-on-one/one-on-one.logic.ts:mergePeopleLists <- src/lib/plugins/one-on-one/one-on-one.service.ts:53 in loadPeople call
sym src/lib/plugins/one-on-one/one-on-one.logic.ts:107 fn filterPeople(query: string, people: PersonEntry[]): PersonEntry[] L5 | Filters people by a case-insensitive substring match on the name.
by src/lib/plugins/one-on-one/one-on-one.logic.ts:filterPeople <- src/lib/plugins/one-on-one/OneOnOnePicker.svelte:13 in filteredWork=$derived call +1
sym src/lib/plugins/one-on-one/one-on-one.logic.ts:114 interface MyPersonRow L12 | A row of Today's My people.
sym src/lib/plugins/one-on-one/one-on-one.logic.ts:128 interface MyPeopleOptions L10 | What `buildMyPeople` reads besides the entries.
sym src/lib/plugins/one-on-one/one-on-one.logic.ts:151 fn buildMyPeople(entries: NoteEntryV2[], options: MyPeopleOptions): MyPersonRow[] L34 | Today's My people: the notes directly in the work people folder, each with its last 1:1.
by src/lib/plugins/one-on-one/one-on-one.logic.ts:buildMyPeople <- src/lib/plugins/one-on-one/MyPeopleSection.svelte:17 in rows=$derived call
sym src/lib/plugins/one-on-one/one-on-one.logic.ts:187 fn myPeopleDaysLabel(days: number | null): string L3 | A My people row's days label: `Nd`, or `never` without a 1:1.
by src/lib/plugins/one-on-one/one-on-one.logic.ts:myPeopleDaysLabel <- src/lib/plugins/one-on-one/MyPeopleSection.svelte:63 in (markup) markup
## locals
local src/lib/plugins/one-on-one/one-on-one.logic.ts:140 fn linkStem(target: string): string L3
## calls
call src/lib/plugins/one-on-one/one-on-one.logic.ts:62 in buildOneOnOneVariables -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildWikilinkPath call
call src/lib/plugins/one-on-one/one-on-one.logic.ts:157 in buildMyPeople -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/plugins/one-on-one/one-on-one.logic.ts:161 in buildMyPeople -> src/lib/utils/note-date.ts:parseDateKey call
call src/lib/plugins/one-on-one/one-on-one.logic.ts:166 in buildMyPeople -> src/lib/features/rail-shell/lens.logic.ts:entryNoteDate call
call src/lib/plugins/one-on-one/one-on-one.logic.ts:169 in buildMyPeople -> src/lib/plugins/one-on-one/one-on-one.logic.ts:linkStem call
