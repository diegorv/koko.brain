# file card src/lib/plugins/periodic-notes/DailyNoteButton.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/periodic-notes/DailyNoteButton.svelte ' codemap/files
file src/lib/plugins/periodic-notes/DailyNoteButton.svelte component L23 module src/lib/plugins/periodic-notes in0 t0
## imports
imp src/lib/plugins/periodic-notes/DailyNoteButton.svelte:2 -> src/lib/components/ui/button/index.ts Button
imp src/lib/plugins/periodic-notes/DailyNoteButton.svelte:3 -> src/lib/components/ui/tooltip/index.ts *
imp src/lib/plugins/periodic-notes/DailyNoteButton.svelte:5 -> src/lib/plugins/periodic-notes/periodic-notes.service.ts openOrCreateDailyNote
## reach
in2 src/lib/plugins/periodic-notes/DailyNoteButton.svelte 0 files in 0 modules: -
out2 src/lib/plugins/periodic-notes/DailyNoteButton.svelte 14 files in 8 modules: src/lib/components(6) src/lib/core/settings(2) src/lib/core/editor(1) src/lib/core/note-creator(1) src/lib/core/vault(1) +3 modules
## symbols
sym src/lib/plugins/periodic-notes/DailyNoteButton.svelte:1 component DailyNoteButton L23
## mounts
mount src/lib/plugins/periodic-notes/DailyNoteButton.svelte:11 Button -> src/lib/components/ui/button/button.svelte
## calls
call src/lib/plugins/periodic-notes/DailyNoteButton.svelte:16 in (markup) -> src/lib/plugins/periodic-notes/periodic-notes.service.ts:openOrCreateDailyNote markup
