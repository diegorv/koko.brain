# module card src/lib/plugins/one-on-one
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/plugins/one-on-one ' codemap/modules
module src/lib/plugins/one-on-one plugins files 6 in-modules 2 out-modules 14 pub 5/22 ipc 0/0 card ~1.3k
## neighbors
dep src/lib/app -> src/lib/plugins/one-on-one 5
dep src/lib/plugins/mods -> src/lib/plugins/one-on-one 1
dep src/lib/plugins/one-on-one -> src/lib/components 1
dep src/lib/plugins/one-on-one -> src/lib/core/editor 2
dep src/lib/plugins/one-on-one -> src/lib/core/filesystem 1
dep src/lib/plugins/one-on-one -> src/lib/core/frontmatter 1
dep src/lib/plugins/one-on-one -> src/lib/core/note-creator 2
dep src/lib/plugins/one-on-one -> src/lib/core/settings 3
dep src/lib/plugins/one-on-one -> src/lib/core/vault 2
dep src/lib/plugins/one-on-one -> src/lib/features/event-calendar 1
dep src/lib/plugins/one-on-one -> src/lib/features/note-action-bar 1
dep src/lib/plugins/one-on-one -> src/lib/features/rail-shell 2
dep src/lib/plugins/one-on-one -> src/lib/features/type-definitions 1
dep src/lib/plugins/one-on-one -> src/lib/plugins/periodic-notes 1
dep src/lib/plugins/one-on-one -> src/lib/types 1
dep src/lib/plugins/one-on-one -> src/lib/utils 5
in2 src/lib/plugins/one-on-one 1 modules: src/routes(3)
out2 src/lib/plugins/one-on-one 3 modules: src/lib/features/collection(5) src/lib/contracts(4) src/lib/core/markdown-editor(1)
## entry files
entry src/lib/plugins/one-on-one/one-on-one.service.ts ext-in4 src/lib/app/commands.ts src/lib/app/global-keybindings.ts src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/plugins/mods/mod-app.service.ts
entry src/lib/plugins/one-on-one/OneOnOnePicker.svelte ext-in1 src/lib/app/AppOverlays.svelte
entry src/lib/plugins/one-on-one/one-on-one-today.service.ts ext-in1 src/lib/app/lifecycle/app-lifecycle.service.ts
## files
file src/lib/plugins/one-on-one/MyPeopleSection.svelte component L77 module src/lib/plugins/one-on-one in1 t1
file src/lib/plugins/one-on-one/OneOnOnePicker.svelte component L95 module src/lib/plugins/one-on-one in1 t1
file src/lib/plugins/one-on-one/one-on-one-today.service.ts service L18 module src/lib/plugins/one-on-one in1 t2
file src/lib/plugins/one-on-one/one-on-one.logic.ts logic L210 module src/lib/plugins/one-on-one in4 t3
file src/lib/plugins/one-on-one/one-on-one.service.ts service L133 module src/lib/plugins/one-on-one in6 t8
file src/lib/plugins/one-on-one/one-on-one.store.svelte.ts store L42 module src/lib/plugins/one-on-one in2 t3
## public
sym src/lib/plugins/one-on-one/OneOnOnePicker.svelte:1 component OneOnOnePicker L95
sym src/lib/plugins/one-on-one/one-on-one-today.service.ts:12 fn registerOneOnOneTodaySection(): () => void L7 | Adds My people to the rail shell's Today lens, which may not import plugins (ADR 0003).
sym src/lib/plugins/one-on-one/one-on-one.service.ts:67 fn createOneOnOneNote(personName: string): Promise<void> L32 | Creates and opens a new 1:1 note for the given person, or opens the one that already exists at the same path.
sym src/lib/plugins/one-on-one/one-on-one.service.ts:105 fn registerOneOnOneActionBarAction(): () => void L15 | Registers "New 1:1" into the note action bar for Person notes; the person is the note's file name.
sym src/lib/plugins/one-on-one/one-on-one.service.ts:125 fn openOneOnOnePicker(onSelect?: OneOnOneSelectHandler): Promise<void> L4 | Opens the person picker dialog, loading people first.
## stores
store src/lib/plugins/one-on-one/one-on-one.store.svelte.ts:12 oneOnOneStore esc:0
## effects
fx-count tauri-fs.exists 1
fx-count tauri-fs.readDir 1
## debt
-
