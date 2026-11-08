# Scout 15: note categorization as a task-sourcing selector

Scope: which note attributes a task-sourcing rule could select on, and the store or logic that exposes each. Read-only. Line numbers come from the reads; where I cite only a symbol, the line is not verified.

## Facts

**Per-note record (Rust is the source of truth)**
- `NoteEntry` struct fields: path, title, frontmatter (BTreeMap of serde_json), outgoing_links, tags, modified_at, created_at, size, word_count, snippet, tasks, is_a, organized, archived, favorite, belongs_to, related_to, has_many, relationships. `src-tauri/src/vault/entry.rs` (struct near top of file; `NoteEntry::from_content_full`).
- `is_a` comes from `_type` after alias resolution, casing normalized, `None` when absent or empty. `entry.rs` `extract_is_a`.
- `organized` = `_organized` boolean, default `true`; only literal `false` makes it inbox-eligible. `entry.rs` `from_content_full`.
- `archived` and `favorite` = `_archived` / `_favorite` booleans, default `false`. `entry.rs` `extract_bool_flag`.
- `.view` files are indexed as entries with YAML as frontmatter, no tasks, no tags, no links, `is_a` None. `entry.rs` `from_view_frontmatter`; `src-tauri/src/utils/fs.rs:140-148` (`is_markdown_filename`, `is_view_filename`).
- Tags: `extract_tags_strict` (frontmatter + inline, deduped case-insensitive) at `src-tauri/src/vault/parsing.rs:513`. Reverse index `tags_index` at `src-tauri/src/vault/index.rs:332`; `lookup_all_tags` at `index.rs:1032`.
- Reverse property index `properties_index` (key -> value -> path set) at `src-tauri/src/vault/index.rs:337`. Not verified whether TS reaches it for a generic property query (see open questions).
- Folder: no folder field on `NoteEntry`. Folder is only derivable from `path`.

**TS views of the entry**
- `NoteEntryV2` mirrors the Rust struct (`src/lib/types/vault-v2.types.ts`, from memory of the Rust mirror comment).
- `typeDefinitionsStore` holds the whole-vault snapshot, `entriesByPath`, and `typeDefinitionPaths` (type name -> definition path, first match wins). `src/lib/features/type-definitions/type-definitions.store.svelte.ts`.
- `isListableNote` = `isA !== 'Type' && !isViewFile(path)`. `src/lib/features/type-definitions/type-sidebar.logic.ts:74`.
- `getNotesForSelection(entries, selection)` filters by selection kind `type` / `untyped` / `nav` / `view`; type and untyped exclude archived. `type-sidebar.logic.ts:83`.
- `filterByNavItem`: `all` (not Type, not archived), `inbox` (not Type, not organized, not archived), `archive` (archived), `favorites` (favorite, not archived). Same file, below `toSidebarNote`.
- `getNotesForViewPaths(entries, matchingPaths, sort, includeArchived)` is the view-query path. `type-sidebar.logic.ts:115`.
- `excludeSystemFolder(entries, vaultPath, systemFolder)` is a path-prefix filter, blank folder disables it. `type-sidebar.logic.ts:54`.
- `isInboxEntry` / `getInboxCount`: `!organized && !archived && isListableNote`. `src/lib/features/type-definitions/inbox-workflow.logic.ts:10,18`.
- `getLifecycleState` (inbox | organized | archived), `isOrganized`, `isFavorite`. `src/lib/features/properties/lifecycle.logic.ts`.
- `buildArchivedPathSet` from `archived`. `src/lib/features/properties/lifecycle-filter.logic.ts`.
- Lifecycle writes: `toggleActiveNoteOrganized`, `toggleActiveNoteArchived`, `toggleFavoriteForPath`, `setTypeRailPin` in `src/lib/features/properties/lifecycle.service.ts`. Archive keeps organized as-is; restore is a separate action (`lifecycle.logic.ts`, `toggleOrganized` doc comment).

**Types (`_type`)**
- `TypeMetadata` (name, path, icon, color, order, folder, template, archiveTo, hub, listPropertiesDisplay, etc.). `src/lib/features/type-definitions/type-definitions.logic.ts:6`.
- Built-in fallback types Project, Person, Event, Topic, Task, Note at `type-definitions.logic.ts` (`BUILTIN_TYPES`, just below `TypeMetadata`). Only metadata, not membership.
- A type definition is a note with `_type: Type`; `extractTypeMetadata` at `type-definitions.logic.ts:100`; `buildTypeMetadataMap` at `:141`.
- `_folder` gives a type's default folder for new notes; `_archive_to` moves on archive only while Auto Move is on (ADR 0026 amendment, `docs/adr/0026-type-definitions-relationships-lifecycle.md:16`).

**Properties and frontmatter**
- Property types: text, list, number, date, boolean. `src/lib/core/frontmatter/properties.types.ts:2`.
- Parsing `parseFrontmatterProperties` at `src/lib/core/frontmatter/properties.logic.ts:339`; write path `serializeProperties` at `:602`; `setPropertyByBindTarget` at `:639`.
- Panel state: `propertiesStore` (properties + sourcePath). `src/lib/features/properties/properties.store.svelte.ts`. Only filled while the right sidebar shows the panel (per the comment in `lifecycle.service.ts`), so it is not a vault-wide source.
- Relationship keys `_belongs_to`, `_related_to`, `_has_many` are wikilink-target arrays (`entry.rs` `extract_wikilink_targets`).
- Key canonicalization: ADR 0027 (`docs/adr/0027-frontmatter-system-metadata-underscore-prefix.md`), ADR 0029 (`docs/adr/0029-frontmatter-yaml-canonical-form.md`).

**Tags (TS side)**
- `TagEntry` (name, count, filePaths) and `TagTreeNode` (hierarchical by `/`, totalCount, filePaths). `src/lib/features/tags/tags.types.ts`.
- `buildTagTree`, `filterTagTree` (minCount), `sortTagTree` (name|count). `src/lib/features/tags/tags.logic.ts`.
- `tagsStore`: tagTree, sortMode, hideRareTags (default true), totalTagCount. `tags.store.svelte.ts`. Tag rows are file-level, not task-level.

**Periodic notes**
- No frontmatter marker. Identified by path: `detectPeriodicNoteType(target, settings)` matches a wikilink target against the settings folder plus a per-period format regex (daily, weekly, monthly, quarterly, yearly). `src/lib/plugins/periodic-notes/periodic-notes.logic.ts:206`.
- Settings: `PeriodicNotesSettings` (folder, daily/weekly/monthly/quarterly/yearly format). `src/lib/core/settings/settings.types.ts:4-44`.
- Periodic notes are a plugin (`src/lib/plugins/`), not core. A task-sourcing rule that needs them would import a plugin from a feature, which the layer rules in CLAUDE.md flag as a violation direction.

**Rules and constraints**
- `docs/agents/indexing-watcher-rules.md` rule 1 and 2: panels read `*_v2` commands and re-read on `vaultIndexVersion`. Rule 12: `NoteEntryV2` snapshot is a cache, throttled bumps (~2 s isolated, 10 s in bursts). A task rule on note attributes will see up to ~2 s of staleness after a lifecycle or type edit, except when `requestPromptIndexRefresh()` runs.
- The rules file names `TasksView` as a `vaultIndexVersion` consumer (rule 2).

## Problems and gaps

1. No single predicate module. Type, tag, folder, property, archived, organized, and periodic checks live in separate files (`type-sidebar.logic.ts`, `inbox-workflow.logic.ts`, `lifecycle.logic.ts`, `tags.logic.ts`, `periodic-notes.logic.ts`). A rule engine would have to re-compose them, and each has a slightly different archived/Type/view exclusion.
2. Default lifecycle is permissive: missing `_organized` reads as organized, so the Inbox is opt-in. A rule of "inbox notes only" silently matches almost nothing on an existing vault.
3. Archived exclusion is baked into most lists. A task rule that wants archived sources has to pass `includeArchived` or bypass `getNotesForSelection`.
4. Folder has no first-class attribute. `excludeSystemFolder` is a string-prefix hack that needs the base vault path. A folder rule would be a prefix match, with no recursion option stated.
5. Periodic detection depends on the global format string. Changing `format` reclassifies every past note, and a rule stored by name would break silently.
6. Type identity is by normalized title, first match wins on duplicates (`type-definitions.logic.ts` `buildTypeMetadataMap` and `type-definitions.store.svelte.ts` `buildTypeDefinitionPaths`). Two `Book.md` definitions give one type, with no warning.
7. Tags are file-level. `TagEntry.filePaths` cannot say which task carries a tag. Whether a task inherits its note's tags is not verified (open question).
8. The property index is in Rust (`properties_index`), but the TS-side query surface for arbitrary `key = value` is not confirmed by this scout.
9. Staleness: lifecycle and type edits reach the sidebar after the throttled bump; a rule view may lag.

## Ideas worth keeping

- The selector set already exists in `NoteEntry` fields. A rule is a conjunction over: `isA` (type), tags (exact or `/` prefix via `buildTagTree` logic), path prefix (folder), `frontmatter[key]` value (property), `archived` / `organized` / `favorite` booleans, `modifiedAt` / `createdAt` range, and a periodic match via `detectPeriodicNoteType` on the path.
- Reuse the `.view` / collection filter engine (`CollectionFilter`, `FilterGroup`, referenced by `buildNewViewYaml` in `type-sidebar.logic.ts:351`) as the rule language. Users already build filters for views in `ViewDialog.svelte`. Verify before relying on this.
- Keep `isListableNote` as the base predicate so `.view` files and type definitions never source tasks.
- Expose each selector as a labelled chip in the UI, grouped as Scope (folder, type), Lifecycle (inbox, archived, favorite), Metadata (tag, property), Time (periodic, modified).
- Show a live count per rule from the same predicate the sourcing uses, so the owner sees what a rule matches before saving.

## Open questions

1. Does `Task` (`src-tauri/src/vault/task.rs`) carry its note's `isA`, tags, folder, or archived state, or must the TS side join by path? (Not read.)
2. Which setting holds the `systemFolder` used by `excludeSystemFolder`, and is it per type or global? (Not verified.)
3. Can TS query `properties_index` for `key = value` today, or only via a full `get_all_vault_entries_v2` scan? (Not verified.)
4. Are task-level `#tags` inside a task line indexed separately from the note's tags? (Not verified.)
5. Should periodic detection move into a core helper so features do not import a plugin (layer rules, CLAUDE.md)? Owner decision.
6. Does the owner want archived and inbox notes to source tasks by default? Owner decision.
