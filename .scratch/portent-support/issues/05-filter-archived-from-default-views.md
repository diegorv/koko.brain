Status: done
Phase: 1

# Filter archived entries from default note list

## What to build

Archived notes (`_archived: true`) should be hidden from the default note list and sidebar. Add an "Archived" filter/view that shows only archived notes, similar to a trash view.

This affects:
- Main note list: exclude archived by default
- Sidebar file explorer: option to hide archived
- Search: include archived in results but visually mark them
- Quick switcher: include archived but visually distinguish

The filtering should use the `archived` flag from the vault index (issue 03), not re-parse frontmatter.

## Acceptance criteria

- [ ] Default note list excludes notes with `archived: true`
- [ ] Dedicated "Archived" view/filter shows only archived notes
- [ ] Archived notes accessible via search (visually distinguished)
- [ ] Quick switcher includes archived notes (visually distinguished)
- [ ] Unarchiving a note returns it to default views immediately
- [ ] Count of archived notes visible somewhere (sidebar badge or filter label)
- [ ] Tests for filtering logic

## Blocked by

- 03-lifecycle-flags-in-rust-index
