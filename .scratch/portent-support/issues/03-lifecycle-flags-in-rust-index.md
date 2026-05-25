Status: done
Phase: 1

# Add lifecycle flags (organized/archived/favorite) to vault index

## What to build

Add three boolean fields to `NoteEntryV2`: `organized`, `archived`, `favorite`. Parsed from frontmatter using alias resolution (issue 01). Default to `false` when absent.

These flags represent the Portent lifecycle:
- `organized: false` + `archived: false` = captured (in inbox)
- `organized: true` + `archived: false` = organized (active)
- `archived: true` = archived (inactive, hidden from default views)
- `favorite` is orthogonal - pins to a favorites section

The TypeScript mirror type must also gain these fields.

## Acceptance criteria

- [ ] `NoteEntryV2` has `organized: bool`, `archived: bool`, `favorite: bool` in Rust
- [ ] TypeScript mirror type has matching fields
- [ ] `_organized: true` in frontmatter -> `organized: true`
- [ ] `_archived: true` in frontmatter -> `archived: true`
- [ ] Aliases resolved via system metadata (issue 01)
- [ ] Missing flags default to `false`
- [ ] Rust unit tests for all flag combinations
- [ ] IPC commands return the new fields

## Blocked by

- 01-system-metadata-aliases
