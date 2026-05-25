Status: ready-for-agent
Phase: 1

# System metadata aliases for frontmatter normalization

## What to build

A shared alias resolution layer that maps alternative frontmatter key names to their canonical forms. Both Rust (vault index) and TypeScript (properties, collections) sides need to recognize multiple spellings of the same semantic key.

Canonical mappings:
- `type` <- `is_a`, `is a`
- `belongs_to` <- `belongs to`
- `related_to` <- `related to`
- `_organized` <- `organized`
- `_archived` <- `archived`
- `_favorite` <- `favorite`
- `_order` <- `order`
- `_sort` <- `sort`
- `_icon` <- `icon`
- `_sidebar_label` <- `sidebar_label`, `sidebar label`
- `_color` <- `color`
- `_template` <- `template`
- `_view` <- `view`
- `_visible` <- `visible`
- `_list_properties_display` <- `list_properties_display`

Reference: Tolaria's `systemMetadata.ts` for the full alias set.

The resolution should happen at parse time so downstream consumers always see canonical keys.

## Acceptance criteria

- [ ] Rust-side alias map defined and used during frontmatter parsing in the vault index
- [ ] TypeScript-side alias map available as a pure logic utility
- [ ] Frontmatter with any alias variant normalizes to canonical key in parsed output
- [ ] Unit tests covering each alias mapping (Rust and TypeScript)
- [ ] Existing frontmatter parsing behavior unchanged for keys without aliases

## Blocked by

None - can start immediately.
