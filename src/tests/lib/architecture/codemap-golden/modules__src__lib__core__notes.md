# module card src/lib/core/notes
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/core/notes ' codemap/modules
module src/lib/core/notes core files 3 in-modules 2 out-modules 2 pub 4/7 ipc 2/0 card ~0.7k
## neighbors
dep src/lib/features/tags -> src/lib/core/notes 4
dep src/lib/plugins/cal -> src/lib/core/notes 1
dep src/lib/core/notes -> src/lib/contracts 1
dep src/lib/core/notes -> src/lib/utils 1
in2 src/lib/core/notes 2 modules: src/lib/app(2) src/routes(1)
out2 src/lib/core/notes 0 modules: -
## entry files
entry src/lib/core/notes/notes.service.ts ext-in2 src/lib/features/tags/TagsView.svelte src/lib/features/tags/tags.service.ts
entry src/lib/core/notes/notes.store.svelte.ts ext-in2 src/lib/features/tags/TagsView.svelte src/lib/plugins/cal/cal.ts
entry src/lib/core/notes/hooks.ts ext-in1 src/lib/features/tags/tags.service.ts
## files
file src/lib/core/notes/hooks.ts other L12 module src/lib/core/notes in2 t0
file src/lib/core/notes/notes.service.ts service L25 module src/lib/core/notes in2 t1 | Note saving and tag loading.
file src/lib/core/notes/notes.store.svelte.ts store L19 module src/lib/core/notes in3 t0
## public
sym src/lib/core/notes/hooks.ts:3 fn addSaveObserver(o: (path: string) => void) L6 | Registers an after-save observer.
sym src/lib/core/notes/notes.service.ts:18 fn loadTags() L4 | Loads tags from Rust into the store.
sym src/lib/core/notes/notes.service.ts:22 const scheduleLoad = debounce(…) L1
sym src/lib/core/notes/notes.store.svelte.ts:4 store notesStore L16 | Tag state.
## stores
store src/lib/core/notes/notes.store.svelte.ts:4 notesStore esc:0
## effects
fx-count tauri-fs.writeTextFile 1
fx-count timer-wrap.debounce 1
fx-count timer.setTimeout 1
ipc-count ipc:get_tags 1
ipc-count ipc:save_note 1
## debt
debt src/lib/utils/debounce.ts -> src/lib/core/notes/notes.store.svelte.ts
