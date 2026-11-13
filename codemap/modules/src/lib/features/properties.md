# module card src/lib/features/properties
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/properties ' codemap/modules
module src/lib/features/properties features files 13 in-modules 5 out-modules 13 pub 14/34 ipc 1/0 card ~2.3k
## neighbors
dep src/lib/app -> src/lib/features/properties 8
dep src/lib/features/note-action-bar -> src/lib/features/properties 2
dep src/lib/features/note-list -> src/lib/features/properties 1
dep src/lib/features/quick-switcher -> src/lib/features/properties 1
dep src/lib/features/rail-shell -> src/lib/features/properties 1
dep src/lib/features/properties -> src/lib/components 4
dep src/lib/features/properties -> src/lib/contracts 1
dep src/lib/features/properties -> src/lib/core/editor 7
dep src/lib/features/properties -> src/lib/core/filesystem 7
dep src/lib/features/properties -> src/lib/core/frontmatter 12
dep src/lib/features/properties -> src/lib/core/layout 1
dep src/lib/features/properties -> src/lib/core/settings 1
dep src/lib/features/properties -> src/lib/core/vault 6
dep src/lib/features/properties -> src/lib/features/file-history 1
dep src/lib/features/properties -> src/lib/features/file-icons 6
dep src/lib/features/properties -> src/lib/features/type-definitions 1
dep src/lib/features/properties -> src/lib/types 4
dep src/lib/features/properties -> src/lib/utils 7
in2 src/lib/features/properties 1 modules: src/routes(4)
out2 src/lib/features/properties 1 modules: src/lib/core/markdown-editor(1)
## entry files
entry src/lib/features/properties/lifecycle.service.ts ext-in5 src/lib/app/commands.ts src/lib/app/global-keybindings.ts src/lib/features/note-action-bar/NoteActionBar.svelte src/lib/features/note-list/NoteRowMenu.svelte src/lib/features/rail-shell/TypesNavigator.svelte
entry src/lib/features/properties/lifecycle-filter.store.svelte.ts ext-in2 src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/features/quick-switcher/QuickSwitcher.svelte
entry src/lib/features/properties/NoteInfo.svelte ext-in1 src/lib/app/AppShell.svelte
entry src/lib/features/properties/PropertiesView.svelte ext-in1 src/lib/app/AppShell.svelte
entry src/lib/features/properties/bookmark-migration.service.ts ext-in1 src/lib/app/lifecycle/app-lifecycle.service.ts
entry src/lib/features/properties/lifecycle-filter.service.ts ext-in1 src/lib/app/tauri-listeners.service.ts
entry src/lib/features/properties/lifecycle.logic.ts ext-in1 src/lib/features/note-action-bar/note-action-bar.logic.ts
entry src/lib/features/properties/properties.service.ts ext-in1 src/lib/app/lifecycle/app-lifecycle.service.ts
## files
file src/lib/features/properties/NoteInfo.svelte component L55 module src/lib/features/properties in1 t1
file src/lib/features/properties/PropertiesView.svelte component L293 module src/lib/features/properties in1 t1
file src/lib/features/properties/PropertyField.svelte component L202 module src/lib/features/properties in1 t1
file src/lib/features/properties/RelationshipSearch.svelte component L94 module src/lib/features/properties in1 t1
file src/lib/features/properties/bookmark-migration.service.ts service L115 module src/lib/features/properties in1 t2
file src/lib/features/properties/lifecycle-filter.logic.ts logic L10 module src/lib/features/properties in1 t1
file src/lib/features/properties/lifecycle-filter.service.ts service L11 module src/lib/features/properties in1 t1
file src/lib/features/properties/lifecycle-filter.store.svelte.ts store L28 module src/lib/features/properties in3 t4
file src/lib/features/properties/lifecycle.logic.ts logic L64 module src/lib/features/properties in3 t3
file src/lib/features/properties/lifecycle.service.ts service L93 module src/lib/features/properties in5 t15
file src/lib/features/properties/note-info.logic.ts logic L35 module src/lib/features/properties in1 t1
file src/lib/features/properties/properties.service.ts service L208 module src/lib/features/properties in2 t8
file src/lib/features/properties/properties.store.svelte.ts store L34 module src/lib/features/properties in2 t5
## public
sym src/lib/features/properties/NoteInfo.svelte:1 component NoteInfo L55
sym src/lib/features/properties/PropertiesView.svelte:1 component PropertiesView L293
sym src/lib/features/properties/bookmark-migration.service.ts:49 fn migrateBookmarksToFavorites(vaultPath: string): Promise<void> L67 | Moves the legacy bookmarks into Favorites, once per vault (ADR 0033, PRD Q7).
sym src/lib/features/properties/lifecycle-filter.service.ts:7 fn refreshArchivedPaths(entries?: NoteEntryV2[]): Promise<void> L5 | Rebuilds the archived path set.
sym src/lib/features/properties/lifecycle-filter.store.svelte.ts:9 store lifecycleFilterStore L20
sym src/lib/features/properties/lifecycle.logic.ts:7 fn getLifecycleState(properties: Property[]): LifecycleState L5 | Returns the lifecycle state of a note from its properties.
sym src/lib/features/properties/lifecycle.logic.ts:14 fn isFavorite(properties: Property[]): boolean L4 | Returns whether the note is a favorite.
sym src/lib/features/properties/lifecycle.logic.ts:24 fn isOrganized(properties: Property[]): boolean L3 | Returns whether the note is organized, whatever its archive state.
sym src/lib/features/properties/lifecycle.service.ts:48 fn toggleFavoriteForPath(filePath: string, favorite: boolean): Promise<void> L10 | Toggles _favorite on a note by path through `updateNoteFrontmatter`, so an open tab keeps its unsaved edits.
sym src/lib/features/properties/lifecycle.service.ts:66 fn setTypeRailPin(definitionPath: string, pinned: boolean): Promise<void> L10 | Pins the type whose definition note is at `definitionPath` to the rail (`_rail: true`) or unpins it (the key removed), through `updateNoteFrontmatter`, so the …
sym src/lib/features/properties/lifecycle.service.ts:78 fn toggleActiveNoteFavorite(): Promise<void> L3 | Flips `_favorite` on the active note.
sym src/lib/features/properties/lifecycle.service.ts:83 fn toggleActiveNoteOrganized(): Promise<void> L3 | Flips `_organized` on the active note; `_archived` is left as-is.
sym src/lib/features/properties/lifecycle.service.ts:91 fn toggleActiveNoteArchived(): Promise<void> L3 | Archives the active note, or restores it when archived.
sym src/lib/features/properties/properties.service.ts:205 fn resetProperties(): void L4 | Resets the properties store to its initial state.
## stores
store src/lib/features/properties/lifecycle-filter.store.svelte.ts:9 lifecycleFilterStore esc:0
store src/lib/features/properties/properties.store.svelte.ts:17 propertiesStore esc:0
## effects
fx-count svelte.$effect 4
fx-count tauri-fs.exists 2
fx-count tauri-fs.readTextFile 1
fx-count tauri-fs.remove 1
fx-count timer.queueMicrotask 1
fx-count timer.setTimeout 1
ipc-count ipc:get_all_vault_entries_v2 1
## debt
-
