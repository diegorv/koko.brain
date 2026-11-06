---
type: ADR
id: "0027"
title: "Underscore prefix convention for system metadata in frontmatter with Rust-side alias resolution"
status: active
date: 2026-05-15
---

## Amendment (2026-11-05): where aliases are folded

The Decision cites `canonicalize_key` at `src-tauri/src/vault/aliases.rs:34` and as called from `NoteEntryV2::from_content` in `entry.rs`. It is at `aliases.rs:32`, and the frontmatter parser calls it on each top-level key: `project_document` and the subset parser `parse_yaml_lines` in `src-tauri/src/vault/parsing.rs`, which both Markdown frontmatter and a whole `.view` file go through. A key spelled twice (`_sidebar_label` and `sidebar_label`) keeps the later value. The frontend mirror for the code that reads raw YAML is `canonicalizeKey` (`src/lib/utils/frontmatter-aliases.ts`).

## Amendment (2026-11-04): every system key in use

The Convention list below predates the rail shell. This table lists each underscore key the app reads once, with where it is read and its alias in `ALIAS_MAP` (`src-tauri/src/vault/aliases.rs:11-26`). The keys of the 2026-11-03 and 2026-11-04 amendments below are in it; the user reference for the type and `.view` keys is `help/documentation/25-types-and-relationships.md` § Type Definition Fields and § View Metadata Fields.

| Key | Read on | Alias | Note |
|-----|---------|-------|------|
| `_type` | notes | `type` | ADR 0026 |
| `_organized`, `_archived`, `_favorite` | notes | `organized`, `archived`, `favorite` | lifecycle flags (ADR 0026) |
| `_favorite_index` | notes | `favorite_index` | parsed, no effect on the rail: Favorites sorts by modified time |
| `_belongs_to`, `_related_to`, `_has_many` | notes | none | relationships (ADR 0026, 2026-05-28 amendment) |
| `_order` | notes, type definitions, `.view` | `order` | pins a note on top of a type's or view's list; orders type rows, view rows and pins |
| `_icon`, `_color`, `_title_color` | notes, folder notes, type definitions, `.view` | `icon`, `color`, `title_color` | icon of the file; a definition's icon is inherited by the type's notes |
| `_sidebar_label` | type definitions, `.view` | `sidebar_label`, `sidebar label` | row label and pin name |
| `_visible` | type definitions, `.view` | `visible` | hides a type row, or a view from Views (2026-11-04 amendment) |
| `_template`, `_folder`, `_list_properties_display` | type definitions (`_list_properties_display` also on `.view`) | `template`, none, `list_properties_display` | new-note content and folder; row pills |
| `_archive_to`, `_hub` | type definitions | none | Auto Move lifecycle rule (needs Auto Move on); hub notes' New linked note |
| `_rail` | type definitions, `.view` | none | pins to the rail (2026-11-04 amendment) |
| `_sort` | `.view` (a type definition's is parsed and not applied, ADR 0026 amendment of 2026-11-04) | `sort` | order of a view's list when its view has no `sort` |
| `_view` | type definitions | `view` | parsed, not applied |
| `_open_in_editor` | `.view` | none | 2026-11-03 amendment |
| `_group` | `.view` | none | 2026-11-04 amendment |
| `_rail_view` | `.view` | none | 2026-11-04 amendment; read from the parsed definition, not the index entry |

`ignoredKeyNotes` (`RESERVED_KEY_RULES` in `src/lib/features/type-definitions/type-sidebar.logic.ts`) marks a wrong-kind value of `_order`, `_open_in_editor`, `_sort`, `_visible`, `_group`, `_rail` and `_rail_view` on the row of the view or type that sets it; the other keys fall back to their default silently.

## Amendment (2026-11-04): `_rail_view` on a `.view`

`_rail_view` is a system field of a `.view` file, written at the top level of its YAML. Its value is the `name` of one entry under `views:`: the view the rail runs (note list, navigator count, the Sort/Filter toolbar seed and its writes) and the one Edit view edits. Matching is exact and case-sensitive and the first match wins (`railViewIndex` in `features/collection/yaml-parser.ts`). A missing key, a name no view carries, or a non-text value runs the first view. Only the rail reads it: the collection editor's tabs and inline collection blocks keep their own view. Edit view rewrites it when it renames the view it names; renaming a view tab in the editor does not.

It is read from the parsed definition (`parseCollectionYaml` keeps a non-blank string as `CollectionDefinition.railView`), not from the index entry, because the parse is what runs the query. It has no alias in `ALIAS_MAP`. It is in the reserved-key table (`RESERVED_KEY_RULES` in `features/type-definitions/type-sidebar.logic.ts`), whose checks receive the whole frontmatter record, so a value of the wrong kind on a record with `views` is marked on the view's row. Whether a string names a view cannot come from the entry, where Rust projects each view to null: `countViewNotes` reads it from the parsed definition (`railViewNameNote`), so that mark shows once the view has been counted. The same note covers a value the parse refuses but the entry holds as a string, such as an unquoted `[[Board]]`. The user documentation is `help/documentation/25-types-and-relationships.md` § View Metadata Fields.

## Amendment (2026-11-04): `_rail` on a `.view` and a type definition

`_rail` is a system field of a `.view` file (top level of its YAML) and of a type definition (its frontmatter). When it is the boolean `true`, the view or type is pinned to the rail (ADR 0033 amendment of the same day). Any other value, or no key, leaves it unpinned. The Types navigator's Pin to rail / Unpin from rail writes or removes the key.

It has no alias in `ALIAS_MAP`: only the canonical `_rail` spelling is read, like `_open_in_editor`. It is in the reserved-key table (`RESERVED_KEY_RULES` in `features/type-definitions/type-sidebar.logic.ts`), so `_rail: "true"` is marked on the view's row and on the type's row. The user documentation is `help/documentation/25-types-and-relationships.md` § Pinned Rail Items.

## Amendment (2026-11-04): `_group` and `_visible` on a `.view`

`_group` is a system field of a `.view` file, written at the top level of its YAML. Its trimmed text is the subheading the view is listed under in Types > Views: ungrouped views come first, then each group in natural order of its name, compared exactly (case-sensitive). A missing, blank or non-text value leaves the view ungrouped. It has no alias in `ALIAS_MAP`, and it is not in Rust's `SYSTEM_KEYS` (`src-tauri/src/vault/entry.rs`), so a `_group` value holding a wikilink also becomes a relationship field; accepted.

`_visible` gets a second meaning on a `.view`: when it is the boolean `false`, Views does not list the view. The file stays: the Files navigator lists it, a saved Types pick of it is kept, and its label still counts as taken for New view and Edit view. Any other value, or no key, keeps the view listed. The existing `visible` alias applies, so `visible: false` hides a view too.

Both keys are in the reserved-key table (`RESERVED_KEY_RULES` in `features/type-definitions/type-sidebar.logic.ts`), so a value their reader ignores (`_visible: "false"`, `_group: 3`) is marked on the view's row. The user documentation is `help/documentation/25-types-and-relationships.md` § View Metadata Fields.

## Amendment (2026-11-03): `_open_in_editor` on a `.view`

`_open_in_editor` is a system field of a `.view` file, written at the top level of its YAML. When it is the boolean `true`, a click on the view's row in the Types navigator opens the `.view` in the editor instead of making it the note list's lens, and the row stays highlighted while that view is the active tab. Any other value, or no key, keeps the list behavior.

It has no alias in `ALIAS_MAP`: only the canonical `_open_in_editor` spelling is read. The user documentation is `help/documentation/25-types-and-relationships.md` § View Metadata Fields.

## Context

Multiple features write metadata to note frontmatter: file icons (`_icon`, `_color`, `_title_color`), type definitions (`_order`, `_sort`, `_sidebar_label`, `_template`, `_view`, `_visible`, `_list_properties_display`), and lifecycle flags (`_organized`, `_archived`, `_favorite`). Without a naming convention, system fields collide with user-authored fields (e.g. a user's `icon:` property vs the app's icon assignment). Additionally, users may write fields with or without underscores, with spaces instead of underscores, or with legacy names -- the app needs to accept all reasonable spellings.

Previously, file icons were stored in a separate JSON file (`.kokobrain/file-icons.json`). This split metadata across two locations and made it invisible to frontmatter-based features (collection queries, properties panel, type definitions).

## Decision

**Prefix all system metadata fields with `_` (underscore) and resolve aliases at parse time in Rust via `canonicalize_key` (`src-tauri/src/vault/aliases.rs:34`).**

### Convention

- System metadata fields that control app behavior use `_` prefix: `_type`, `_icon`, `_color`, `_title_color`, `_order`, `_sort`, `_organized`, `_archived`, `_favorite`, `_sidebar_label`, `_template`, `_view`, `_visible`, `_list_properties_display`.
- User content fields have no prefix: `belongs_to`, `related_to`, `tags`, `title`.
- The `_` prefix signals "managed by the app" -- users can edit these fields manually, but the app may also write them programmatically (icon picker, lifecycle actions, type definition settings).

### Alias resolution

`src-tauri/src/vault/aliases.rs` defines a static `ALIAS_MAP` that maps alternative spellings to canonical forms. `canonicalize_key` is called during `NoteEntryV2::from_content` (`src-tauri/src/vault/entry.rs`) at parse time, so all downstream consumers see only canonical keys.

Key aliases:
- `icon` -> `_icon`, `color` -> `_color`, `title_color` -> `_title_color`
- `organized` -> `_organized`, `archived` -> `_archived`, `favorite` -> `_favorite`
- `order` -> `_order`, `sort` -> `_sort`, `template` -> `_template`
- `type` -> `_type` (the legacy `is_a` / `is a` spellings were dropped)
- `belongs to` -> `belongs_to`, `related to` -> `related_to`
- `sidebar_label` / `sidebar label` -> `_sidebar_label`

Canonical keys pass through unchanged. Unknown keys pass through unchanged.

### Icon format

Icon values use `pack:name` format (e.g. `lucide:star`). A bare name without a pack prefix (e.g. `star`) defaults to the Lucide pack. Parsing is in `file-icons.logic.ts:82` (`parseIconValuePermissive`).

### Write path

When the UI writes system metadata (icon picker, lifecycle actions), it uses `frontmatter-icon.service.ts` which updates the note's frontmatter YAML in place. Folder icons are stored in the folder note's `_icon` field (`src/lib/features/file-icons/frontmatter-icon.service.ts`).

## Alternatives considered

- **No prefix (bare names)**: Collides with user fields. A user writing `icon: camera` to describe a note about cameras would be interpreted as a file icon assignment.
- **Namespace prefix (`kb_icon`, `kokobrain_icon`)**: Verbose and ugly in frontmatter. The `_` prefix is minimal and follows the "private/internal" convention from Python and other ecosystems.
- **Separate sidecar files (JSON)**: The previous approach for file icons. Splits metadata, invisible to collection queries and properties panel, requires separate sync logic.
- **Nested YAML object (`_system: { icon: star }`)**: Harder to edit manually, complicates flat property queries, and YAML nested objects are fragile with manual editing.

## Consequences

- All system metadata is visible in the properties panel and queryable via collection filters and QueryJS.
- The alias map must be updated when new system fields are added. Adding an alias is a one-line change in `aliases.rs`.
- Users migrating from the old `icon:` (no underscore) format get automatic resolution -- no manual migration needed.
- The properties panel filters out `_`-prefixed fields from the default display to reduce noise (they are shown in a separate "System" section).
- System fields are excluded from the `VaultIndex` properties reverse index (`src-tauri/src/vault/entry.rs:370-372`) to avoid polluting property-based queries with internal metadata.
