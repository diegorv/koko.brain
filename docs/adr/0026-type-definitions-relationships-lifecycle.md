---
type: ADR
id: "0026"
title: "Type definitions, semantic relationships, and lifecycle flags via frontmatter"
status: active
date: 2026-05-15
---

## Amendment (2026-11-04): what the type system reads today

The Decision below names facts that no longer hold; the decision itself (types, relationships and lifecycle flags in frontmatter, definitions as `type: Type` notes) stands.

- **No TypeSidebar.** `src/lib/features/type-definitions/TypeSidebar.svelte` was removed with the classic sidebar modes (ADR 0033, contract amendment of 2026-11-01). Types are browsed in the rail's Types navigator (`src/lib/features/rail-shell/TypesNavigator.svelte`, rows from `typeNavigatorRows` in `lens.logic.ts`), and the TypeSidebar's Inbox nav item is the rail's Inbox item, counted by `isInboxEntry` (`src/lib/features/type-definitions/inbox-workflow.logic.ts:10-12`).
- **Fields that are parsed but not applied.** `extractTypeMetadata` (`src/lib/features/type-definitions/type-definitions.logic.ts:100-120`) still reads `_sort` and `_view` into `TypeMetadata`, but nothing uses them: a type's list sorts most recently modified first (`getNotesForSelection`, `type-sidebar.logic.ts:82-106`) and no code reads `view`. A `.view` file's `_sort` is a different key with a reader (ADR 0027).
- **Built-in fallback metadata.** Of `BUILTIN_TYPES` (`type-definitions.logic.ts:38-45`), only `order` is applied (the default `_order` of Project, Person, Event, Topic, Task, Note). `TypeMetadata.icon` and `color` have no reader: a type's icon and colours come from its definition note's `_icon` / `_color` / `_title_color` through the file-icons store (`resolveIconForType`, `src/lib/features/file-icons/icon-resolver.ts:75-86`), so a type without a definition has the default icon.
- **Fields added since.** `_folder`, `_archive_to` (moves only while Auto Move is on), `_hub` and `_rail` (ADR 0027 amendment of 2026-11-04).
- **Lifecycle actions** are in the note action bar (`src/lib/features/note-action-bar/`), not the Properties panel (ADR 0033). A missing `_organized` reads as organized in the action bar too, as in Rust and the Inbox.

The user reference for every type-definition key is `help/documentation/25-types-and-relationships.md` § Type Definition Fields.

## Context

Notes in a personal knowledge base often have implicit types (project, person, event, topic) and relationships (a meeting note belongs to a project, two concepts are related). Without explicit structure, these connections live only in wikilinks and the user's memory. Users also need a way to mark notes as organized, archived, or favorited without moving them between folders.

The Portent knowledge base spec provided a clean model for document types, semantic relationships, and lifecycle workflow that could be adapted for Kokobrain's frontmatter-first architecture.

## Decision

**Use frontmatter fields to declare note types (`type:`), semantic relationships (`belongs_to:`, `related_to:`), and lifecycle flags (`_organized`, `_archived`, `_favorite`), with type definitions stored as regular notes with `type: Type`.**

### Type system

- A note declares its type via `type: Project` (or any string).
- Type definitions are notes with `type: Type` in frontmatter. They control how notes of that type are displayed in the TypeSidebar via metadata fields: `_order`, `_sort`, `_view`, `_visible`, `_sidebar_label`, `_template`, `_icon`, `_color`, `_list_properties_display`.
- Six built-in types (Project, Person, Event, Topic, Task, Note) have fallback metadata when no definition note exists.
- The TypeSidebar (`src/lib/features/type-definitions/TypeSidebar.svelte`) is an alternative sidebar mode that groups notes by type instead of by folder.

### Relationships

- `belongs_to:` -- hierarchical ownership. Value is a wikilink or list of wikilinks (e.g. `belongs_to: "[[Project Alpha]]"`).
- `related_to:` -- lateral association. Same format.
- Any other frontmatter field whose value contains wikilinks is extracted as a generic relationship (`src-tauri/src/vault/entry.rs:366`, `extract_all_relationships`).
- The backlinks panel (`src/lib/features/backlinks/BacklinksPanel.svelte`) shows relationship context alongside regular backlinks.

> **Amendment (2026-05-28):** The built-in relationship fields are now underscore-canonical and take no alias. The frontmatter keys are `_belongs_to` and `_related_to` (the bare/space spellings are no longer normalized). A third first-class field `_has_many` was added for inverse ownership (this note owns/contains others), with full parity to the other two: a dedicated `NoteEntry.has_many` field, reverse-index relationship backlinks (`relationship_type: "has_many"`), and a "Has Many" row in the Properties panel. Internal field names and the emitted `relationship_type` strings stay bare (`belongs_to`/`related_to`/`has_many`); only the on-disk frontmatter keys carry the underscore. The PropertiesView FIXED_RELATIONSHIPS and the `to_note_record` projection key on the underscore form.

### Lifecycle

- `_organized: true` -- note has been explicitly organized (triaged from inbox).
- `_archived: true` -- note is hidden from default views.
- `_favorite: true` -- note is pinned.
- Lifecycle actions (organize, archive, favorite) are available in the properties panel (`src/lib/features/properties/`).
- The TypeSidebar has an Inbox nav item counting notes that are not `_organized`, not `_archived` and not Type definitions (`countNavItems`, `src/lib/features/type-definitions/type-sidebar.logic.ts`). The macOS dock badge counts the same notion via `getInboxCount` (`src/lib/features/type-definitions/inbox-workflow.logic.ts`), the sole inbox predicate. The `explicitOrganization` setting is persisted and exposed in Settings -> Types, but no code path reads it -- the Inbox is always shown.

> **Amendment (2026-11-04):** The `explicitOrganization` switch is wired; the sentence above that no code path reads it no longer holds. While it is on, a new Markdown note created for the user starts with `_organized: false`, so it is in the Inbox until organized. Covered: the Cmd+N composer, Quick Capture (popover, clipboard shortcut, `kokobrain://capture`), "+ New here" (plain and typed rules), New `<Type>`, a note made from a missing wikilink or a meta-bind `createNote` button, Files > New note, the palette's New File, the Quick Switcher's Create, New File from Template, New 1:1, New linked note, a new event-calendar event, and `kokobrain://new` when it creates the note. Excluded: periodic notes (every path into `openOrCreatePeriodicNoteForDate`), non-Markdown files, type definitions, duplicated events, `kokobrain://new` with `overwrite=true`, default template files and folder-note placeholders. The helper is opt-in per call site: each covered path passes its final content through `applyExplicitOrganization` (`src/lib/core/note-creator/explicit-organization.logic.ts`), which inserts the line textually after the opening `---` without parsing YAML and leaves content that already sets `_organized` or `organized` unchanged. It is not built into `openOrCreateNote` or `fs.service::createFile`, which the excluded paths also use, and nothing decides "periodic" from a path or folder. The Inbox item stays always shown; turning the switch off stops marking new notes and leaves marked ones as they are.

> **Amendment (2026-11-05):** `explicitOrganization` defaults to on, so a vault whose `settings.json` has no such key gets it; a saved `false` is kept. A note with no `_organized` key still reads as organized (the Rust index and the frontend both default it to `true`), because existing notes must stay out of the Inbox. `_organized: true` in the Lifecycle list above is therefore not required for a note to count as organized: only a boolean `_organized: false` makes it not organized.

### Parsing

All fields are parsed Rust-side in `NoteEntryV2::from_content` (`src-tauri/src/vault/entry.rs:220-258`). The `is_a` field maps the canonical `_type:` key (the bare `type:` spelling is alias-resolved to `_type` at parse time); `belongs_to`, `related_to`, and `relationships` are extracted from wikilink-containing frontmatter values; lifecycle booleans are extracted via `extract_bool_flag`. Results are available to TS consumers via `get_all_vault_entries_v2`.

## Alternatives considered

- **Separate metadata files (sidecar JSON)**: Would avoid polluting frontmatter but breaks the "one file = one note" model and complicates sync/portability.
- **Tags for types (`#type/project`)**: Overloads the tag namespace and can't carry metadata (icon, sort order, template). Tags remain for cross-cutting topics.
- **Folder-based organization for lifecycle**: Moving notes between `inbox/`, `archive/`, `favorites/` folders breaks existing links and folder structure. Frontmatter flags are non-destructive.

## Consequences

- Type metadata fields use the `_` prefix convention (ADR 0027) to distinguish system fields from user content.
- The TypeSidebar is an additive sidebar mode; file-tree sidebar remains the default. Both consume the same `VaultIndex` data (ADR 0025).

> **Amendment (2026-11-01):** The consequence "The TypeSidebar is an additive sidebar mode; file-tree sidebar remains the default" is replaced by [ADR 0033](0033-icon-rail-and-note-list-replace-sidebar-modes.md): the default left side is an icon rail with one note list, Types is a navigator in it, and the file tree survives as the Files navigator. The classic sidebar modes stay selectable (Settings > Sidebar > Layout > Classic) until ADR 0033's contract step removes them. Types, relationships and lifecycle flags are unchanged.

> **Amendment (2026-11-01, contract):** ADR 0033's contract step ran (see its contract amendment): the classic sidebar modes and the Classic layout choice are removed, and the rail is the only left side.

- Relationship resolution depends on wikilink target resolution (`resolves_to` in `src-tauri/src/vault/index.rs`), sharing the same path-matching logic as backlinks.
- Lifecycle flags are boolean; there is no state machine or transition enforcement. UI actions simply toggle the frontmatter field.
- Settings section "Types" controls `explicitOrganization` toggle and `showUntypedNotes` visibility.
