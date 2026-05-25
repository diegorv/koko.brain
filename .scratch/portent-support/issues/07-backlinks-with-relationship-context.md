Status: ready-for-agent
Phase: 2

# Extend backlinks panel with frontmatter relationship context

## What to build

The backlinks panel currently shows notes that link to the current note via body wikilinks. Extend it to also show notes that reference the current note via frontmatter relationships (`belongs_to`, `related_to`, custom fields from issue 06).

Display should indicate the relationship type:
- "Parent of" (when another note has `belongs_to: "[[current-note]]"`)
- "Related from" (when another note has `related_to: "[[current-note]]"`)
- Custom relationship name for generic relationships

This requires a new Rust IPC command or extending `get_backlinks_v2` to include frontmatter relationship sources. The reverse index should track which entries reference which targets via frontmatter fields.

## Acceptance criteria

- [ ] Backlinks panel shows notes referencing current note via `belongs_to`
- [ ] Backlinks panel shows notes referencing current note via `related_to`
- [ ] Backlinks panel shows notes referencing current note via custom relationship fields
- [ ] Each backlink displays its relationship type label
- [ ] Body-text backlinks still shown (existing behavior preserved)
- [ ] Visual distinction between body backlinks and relationship backlinks
- [ ] Rust reverse index tracks frontmatter relationship targets
- [ ] Tests for reverse index building and querying

## Blocked by

- 06-relationship-fields-in-rust-index
