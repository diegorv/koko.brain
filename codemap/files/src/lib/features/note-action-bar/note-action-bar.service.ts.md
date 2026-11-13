# file card src/lib/features/note-action-bar/note-action-bar.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/note-action-bar/note-action-bar.service.ts ' codemap/files
file src/lib/features/note-action-bar/note-action-bar.service.ts service L87 module src/lib/features/note-action-bar in1 t1
## imports
imp src/lib/features/note-action-bar/note-action-bar.service.ts:1 -> pkg:@tauri-apps/plugin-opener revealItemInDir
imp src/lib/features/note-action-bar/note-action-bar.service.ts:3 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/note-action-bar/note-action-bar.service.ts:4 -> src/lib/core/filesystem/fs.service.ts createFile
imp src/lib/features/note-action-bar/note-action-bar.service.ts:5 -> src/lib/core/filesystem/fs.logic.ts getParentPath
imp src/lib/features/note-action-bar/note-action-bar.service.ts:6 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/note-action-bar/note-action-bar.service.ts:7 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/note-action-bar/note-action-bar.service.ts:8 -> src/lib/features/deep-link/deep-link.logic.ts buildOpenNoteDeepLink
imp src/lib/features/note-action-bar/note-action-bar.service.ts:9 -> src/lib/core/frontmatter/properties.logic.ts ensureFrontmatterLink
imp src/lib/features/note-action-bar/note-action-bar.service.ts:10 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization
imp src/lib/features/note-action-bar/note-action-bar.service.ts:11 -> src/lib/utils/debug.ts error
imp src/lib/features/note-action-bar/note-action-bar.service.ts:12 -> src/lib/utils/path.ts basename,stem
## imported-by
imp src/lib/features/note-action-bar/NoteActionBar.svelte:39 -> src/lib/features/note-action-bar/note-action-bar.service.ts copyNoteDeepLink,copyNotePath,createLinkedNote,revealNote,toggleWideNotes
## reach
in2 src/lib/features/note-action-bar/note-action-bar.service.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/note-action-bar/note-action-bar.service.ts 22 files in 10 modules: src/lib/core/editor(4) src/lib/core/filesystem(4) src/lib/core/settings(4) src/lib/utils(3) src/lib/contracts(2) +5 modules
## tests
test src/tests/lib/features/note-action-bar/note-action-bar.service.test.ts imports src/lib/features/note-action-bar/note-action-bar.service.ts mirror
## symbols
sym src/lib/features/note-action-bar/note-action-bar.service.ts:15 fn toggleWideNotes(): void L3 | Flips the one global note width setting between the configured content width and full width.
by src/lib/features/note-action-bar/note-action-bar.service.ts:toggleWideNotes <- src/lib/features/note-action-bar/NoteActionBar.svelte:96 in foldable=$derived ref
sym src/lib/features/note-action-bar/note-action-bar.service.ts:23 fn revealNote(path: string): Promise<void> L8 | Shows the note in Finder; a failure (file gone, opener refused) is shown in a toast.
by src/lib/features/note-action-bar/note-action-bar.service.ts:revealNote <- src/lib/features/note-action-bar/NoteActionBar.svelte:102 in foldable=$derived call
sym src/lib/features/note-action-bar/note-action-bar.service.ts:48 fn copyNotePath(path: string): Promise<void> L3 | Copies the note's absolute path and confirms with a toast.
by src/lib/features/note-action-bar/note-action-bar.service.ts:copyNotePath <- src/lib/features/note-action-bar/NoteActionBar.svelte:104 in foldable=$derived call
sym src/lib/features/note-action-bar/note-action-bar.service.ts:57 fn copyNoteDeepLink(path: string): Promise<void> L10 | Copies a `kokobrain://open` link for the note in the open vault and confirms with a toast.
by src/lib/features/note-action-bar/note-action-bar.service.ts:copyNoteDeepLink <- src/lib/features/note-action-bar/NoteActionBar.svelte:199 in (markup) markup
sym src/lib/features/note-action-bar/note-action-bar.service.ts:75 fn createLinkedNote(hubPath: string): Promise<void> L13 | New linked note: creates a plain `Untitled` note (deduped) in the hub's folder whose frontmatter is `_belongs_to: [[hub]]`, then opens it.
by src/lib/features/note-action-bar/note-action-bar.service.ts:createLinkedNote <- src/lib/features/note-action-bar/NoteActionBar.svelte:73 in hubButton=$derived call
## locals
local src/lib/features/note-action-bar/note-action-bar.service.ts:33 fn copyWithToast(text: string, what: string, confirmation: string): Promise<void> L10
## calls
call src/lib/features/note-action-bar/note-action-bar.service.ts:16 in toggleWideNotes -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateEditor mcall
call src/lib/features/note-action-bar/note-action-bar.service.ts:27 in revealNote -> src/lib/utils/debug.ts:error call
call src/lib/features/note-action-bar/note-action-bar.service.ts:28 in revealNote -> src/lib/utils/path.ts:basename call
call src/lib/features/note-action-bar/note-action-bar.service.ts:37 in copyWithToast -> src/lib/utils/debug.ts:error call
call src/lib/features/note-action-bar/note-action-bar.service.ts:49 in copyNotePath -> src/lib/features/note-action-bar/note-action-bar.service.ts:copyWithToast call
call src/lib/features/note-action-bar/note-action-bar.service.ts:60 in copyNoteDeepLink -> src/lib/features/deep-link/deep-link.logic.ts:buildOpenNoteDeepLink call
call src/lib/features/note-action-bar/note-action-bar.service.ts:65 in copyNoteDeepLink -> src/lib/features/note-action-bar/note-action-bar.service.ts:copyWithToast call
call src/lib/features/note-action-bar/note-action-bar.service.ts:76 in createLinkedNote -> src/lib/utils/path.ts:stem call
call src/lib/features/note-action-bar/note-action-bar.service.ts:79 in createLinkedNote -> src/lib/core/frontmatter/properties.logic.ts:ensureFrontmatterLink call
call src/lib/features/note-action-bar/note-action-bar.service.ts:79 in createLinkedNote -> src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization call
call src/lib/features/note-action-bar/note-action-bar.service.ts:80 in createLinkedNote -> src/lib/core/filesystem/fs.logic.ts:getParentPath call
call src/lib/features/note-action-bar/note-action-bar.service.ts:80 in createLinkedNote -> src/lib/core/filesystem/fs.service.ts:createFile call
call src/lib/features/note-action-bar/note-action-bar.service.ts:86 in createLinkedNote -> src/lib/core/editor/editor.service.ts:openFileInEditor call
## effects
fx src/lib/features/note-action-bar/note-action-bar.service.ts:25 tauri-opener.revealItemInDir in revealNote
