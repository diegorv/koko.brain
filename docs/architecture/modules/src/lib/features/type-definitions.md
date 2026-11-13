---
summary: "Type definitions and .view files: type metadata, type-grouped sidebar logic, view rewrites and the view parse cache."
---

## Responsibility

Owns the model of Kokobrain types. A type is a note with _type: Type (isA === 'Type' in the index), and its name is the definition file name. The folder derives TypeMetadata (icon, color, order, folder, template, visibility, list properties, archive target, hub flag) from definition frontmatter with builtin fallbacks, keeps the reactive snapshot of vault entries with path and type-name indexes, creates and renames types and typed notes, and models .view files (filters, sort, list properties, rail pin, Views visibility) with a serialized write path and a parsed-definition cache. It does not own the Rust index or file watcher (src-tauri, core/filesystem), the generic collection YAML parser (features/collection), or the note list and editor UI beyond the dialogs and logic helpers it ships.

## Key files

- `src/lib/features/type-definitions/type-definitions.store.svelte.ts`: Type metadata map, whole-vault entries snapshot with path and type-definition indexes, selection. setEntries and patchEntries keep the indexes in step.
- `src/lib/features/type-definitions/type-definitions.logic.ts`: TypeMetadata, extractTypeMetadata with builtin fallbacks, buildTypeMetadataMap, name validation, rewriteTypeInFrontmatter, buildTypeNoteDir.
- `src/lib/features/type-definitions/type-definitions.service.ts`: refreshTypeDefinitions, typed note creation, type create and rename (propagate_type_rename), view creation and the .view write path rewriteViewFile.
- `src/lib/features/type-definitions/type-sidebar.logic.ts`: isListableNote, getNotesForSelection, buildTypeSections, .view accessors, system-folder exclusion, property pills and date formatting.
- `src/lib/features/type-definitions/type-note-list.logic.ts`: Toolbar edits against .view YAML with conflict detection, rename file name building, overridden queries.
- `src/lib/features/type-definitions/view-parse-cache.ts`: Parsed .view definitions keyed by path and content hash, with epoch-guarded clears and per-path read ordering.
- `src/lib/features/type-definitions/inbox-workflow.logic.ts`: Inbox membership and count, shared by the dock badge and the rail Inbox lens.
- `src/lib/features/type-definitions/TypeNameDialog.svelte`: Dialog for creating or naming a type, validated by validateTypeName.
- `src/lib/features/type-definitions/ViewDialog.svelte`: Dialog for creating or editing a .view (name, filters, icon and colors).

## State

- type-definitions.store.svelte.ts: typeMetadataMap, entries snapshot ($state.raw), entriesByPath, typeDefinitionPaths, entriesVersion, selectedTypeOrNav.
- view-parse-cache.ts: parsed definitions with content hash by path, a global clear epoch, and a read sequence with the newest read number per path.
- viewWriteTails in type-definitions.service.ts: the pending write chain per .view path.
- On disk, through @tauri-apps/plugin-fs and core/filesystem: type definition notes, .view YAML files, and new typed notes in the vault root or configured folders.

## Collaborators

- `IPC:get_all_vault_entries_v2`: refreshTypeDefinitions fetches the whole snapshot when no entries are passed.
- `IPC:create_folder`: createTypedNote creates the target folder recursively before writing.
- `IPC:propagate_type_rename`: renameType asks Rust to rewrite _type across member notes (src-tauri/src/commands/vault.rs).
- `src/lib/core/vault`: Vault path and prompt index refresh requests.
- `src/lib/core/editor`: Rewrite and rename paths save open tabs, wait for in-flight saves and sync external content.
- `src/lib/core/filesystem`: applyNoteChange after writes; createFile and renameItem for definitions, typed notes and views.
- `src/lib/core/note-creator`: openOrCreateNote and loadNoteTemplate for typed notes.
- `src/lib/core/settings`: Types base folder, explicit-organization switch, and the rail layout pick and pin updated on type rename.
- `src/lib/core/frontmatter`: Frontmatter helpers for type rewrites.
- `src/lib/features/collection`: yaml-parser (updateViewEditYaml, viewIndexByName, parseCollectionYaml via the cache), toolbar logic and collectionStore.
- `src/lib/features/file-icons`: Icon helpers for type and view icons.
- `src/lib/app`: tauri-listeners calls refreshTypeDefinitions and setEntries or patchEntries; AppShell, commands, boot, editor-host, app-lifecycle and EditorView use the store, view helpers, cache clearing and rewriteViewFile.
- `src/lib/features/rail-shell`: TypesNavigator, RailNoteList, Rail and lens.logic consume the store, dialogs, parse cache and view writes.
- `src/lib/features/note-list`: NoteRowMenu uses showViewInViews and the rename file-name builder.
- `src/lib/features/event-calendar`: Creates typed event notes via createTypedNote, creates the Event type definition, and reads the store.
- `src/lib/features/auto-organize`: Reads the store for lifecycle rules; type-lifecycle-rules takes TypeMetadata.
- `src/lib/features/dock-badge`: Uses getInboxCount so the badge matches the rail Inbox lens.
- `src/lib/plugins/queryjs`: kb.pages applies isListableNote and excludeSystemFolder.
- `src/lib/plugins/calendar`: Day lens uses excludeSystemFolder and isListableNote; CalendarNavigator reads the store.
- `src/lib/plugins/one-on-one`: MyPeopleSection reads the store.
- `src/lib/plugins/mods`: Mod API creates typed notes and reads the store.

## Gotchas

- entriesByPath and typeDefinitionPaths must be written together with entries (setEntries, patchEntries, reset). Writing one without the others leaves consumers stale.
- Type name resolution is first match wins in snapshot order. buildTypeDefinitionPaths in the store and buildTypeMetadataMap must apply the same rule so they name the same file.
- A type's name is its definition file name, not a frontmatter field. createTypeDefinition refuses a vault-root collision with a case-insensitive match, because createFile would otherwise dedupe to a different name.
- Every write to an existing .view goes through rewriteViewFile, which serializes writes per path, waits for in-flight tab saves, and uses the dirty tab buffer as the base when a tab is open.
- isListableNote excludes both Type definitions and .view files. Rail lenses, QueryJS kb.pages, the calendar and the inbox count depend on it.
- renameType rewrites open editor tabs before calling propagate_type_rename, so a dirty tab's pending auto-save cannot overwrite the propagated _type.
- view-parse-cache uses a global epoch: a read in flight during a clear must not reinsert old content, so every clear must bump the epoch. A per-path read sequence handles two reads of one path resolving out of order.
- Builtin defaults for Project, Person, Event, Topic, Task and Note apply only when the definition frontmatter lacks the key (BUILTIN_TYPES).
