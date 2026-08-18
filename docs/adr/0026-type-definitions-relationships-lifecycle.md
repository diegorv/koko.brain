---
type: ADR
id: "0026"
title: "Type definitions, semantic relationships, and lifecycle flags via frontmatter"
status: active
date: 2026-05-15
---

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

### Parsing

All fields are parsed Rust-side in `NoteEntryV2::from_content` (`src-tauri/src/vault/entry.rs:220-258`). The `is_a` field maps the canonical `_type:` key (the bare `type:` spelling is alias-resolved to `_type` at parse time); `belongs_to`, `related_to`, and `relationships` are extracted from wikilink-containing frontmatter values; lifecycle booleans are extracted via `extract_bool_flag`. Results are available to TS consumers via `get_all_vault_entries_v2`.

## Alternatives considered

- **Separate metadata files (sidecar JSON)**: Would avoid polluting frontmatter but breaks the "one file = one note" model and complicates sync/portability.
- **Tags for types (`#type/project`)**: Overloads the tag namespace and can't carry metadata (icon, sort order, template). Tags remain for cross-cutting topics.
- **Folder-based organization for lifecycle**: Moving notes between `inbox/`, `archive/`, `favorites/` folders breaks existing links and folder structure. Frontmatter flags are non-destructive.

## Consequences

- Type metadata fields use the `_` prefix convention (ADR 0027) to distinguish system fields from user content.
- The TypeSidebar is an additive sidebar mode; file-tree sidebar remains the default. Both consume the same `VaultIndex` data (ADR 0025).
- Relationship resolution depends on wikilink target resolution (`resolves_to` in `src-tauri/src/vault/index.rs`), sharing the same path-matching logic as backlinks.
- Lifecycle flags are boolean; there is no state machine or transition enforcement. UI actions simply toggle the frontmatter field.
- Settings section "Types" controls `explicitOrganization` toggle and `showUntypedNotes` visibility.
