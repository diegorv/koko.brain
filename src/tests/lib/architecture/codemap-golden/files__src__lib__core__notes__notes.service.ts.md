# file card src/lib/core/notes/notes.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/notes/notes.service.ts ' codemap/files
file src/lib/core/notes/notes.service.ts service L25 module src/lib/core/notes in2 t1 | Note saving and tag loading.
## imports
imp src/lib/core/notes/notes.service.ts:2 -> pkg:@tauri-apps/plugin-fs writeTextFile
imp src/lib/core/notes/notes.service.ts:3 -> src/lib/contracts/index.ts call
imp src/lib/core/notes/notes.service.ts:4 -> src/lib/utils/debounce.ts debounce
imp src/lib/core/notes/notes.service.ts:5 -> src/lib/core/notes/notes.store.svelte.ts notesStore
imp src/lib/core/notes/notes.service.ts:6 -> src/lib/core/notes/hooks.ts notifySaved
## imported-by
imp src/lib/features/tags/TagsView.svelte:4 -> src/lib/core/notes/notes.service.ts loadTags
imp src/lib/features/tags/tags.service.ts:2 -> src/lib/core/notes/notes.service.ts scheduleLoad
## reach
in2 src/lib/core/notes/notes.service.ts 2 files in 2 modules: src/lib/app(1) src/routes(1)
out2 src/lib/core/notes/notes.service.ts 2 files in 1 modules: src/lib/contracts(2)
## tests
test src/tests/lib/core/notes/notes.service.test.ts imports src/lib/core/notes/notes.service.ts mirror
## symbols
sym src/lib/core/notes/notes.service.ts:13 fn saveNote(path: string, content: string) L4 | Saves a note to disk and to Rust.
sym src/lib/core/notes/notes.service.ts:18 fn loadTags() L4 | Loads tags from Rust into the store.
by src/lib/core/notes/notes.service.ts:loadTags <- src/lib/features/tags/TagsView.svelte:13 in (markup) markup
sym src/lib/core/notes/notes.service.ts:22 const scheduleLoad = debounce(…) L1
by src/lib/core/notes/notes.service.ts:scheduleLoad <- src/lib/features/tags/tags.service.ts:4 in onSaved call
sym src/lib/core/notes/notes.service.ts:23 fn flushLater() L3
## locals
local src/lib/core/notes/notes.service.ts:8 fn writeNote(path: string, content: string) L4
## calls
call src/lib/core/notes/notes.service.ts:10 in writeNote -> src/lib/core/notes/hooks.ts:notifySaved call
call src/lib/core/notes/notes.service.ts:14 in saveNote -> src/lib/core/notes/notes.service.ts:writeNote call
call src/lib/core/notes/notes.service.ts:15 in saveNote -> src/lib/contracts/ipc.ts:call call
call src/lib/core/notes/notes.service.ts:19 in loadTags -> src/lib/contracts/ipc.ts:call call
call src/lib/core/notes/notes.service.ts:20 in loadTags -> src/lib/core/notes/notes.store.svelte.ts:notesStore.addTag mcall
call src/lib/core/notes/notes.service.ts:22 in scheduleLoad -> src/lib/core/notes/notes.service.ts:loadTags call
call src/lib/core/notes/notes.service.ts:22 in scheduleLoad -> src/lib/utils/debounce.ts:debounce call
## effects
fx src/lib/core/notes/notes.service.ts:9 tauri-fs.writeTextFile in writeNote
ipc-call src/lib/core/notes/notes.service.ts:15 in saveNote -> ipc:save_note -> src-tauri/src/commands/notes.rs:26
ipc-call src/lib/core/notes/notes.service.ts:19 in loadTags -> ipc:get_tags -> src-tauri/src/commands/notes.rs:16
fx src/lib/core/notes/notes.service.ts:22 timer-wrap.debounce args=() => void loadTags(), 300 as scheduleLoad in scheduleLoad
fx src/lib/core/notes/notes.service.ts:24 timer.setTimeout delay=0 in flushLater
