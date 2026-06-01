---
type: ADR
id: "0027"
title: "Underscore prefix convention for system metadata in frontmatter with Rust-side alias resolution"
status: active
date: 2026-05-15
---

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
