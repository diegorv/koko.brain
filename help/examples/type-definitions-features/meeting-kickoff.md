---
belongs_to: "[[project-kokobrain]]"
date: 2026-01-15
attendees:
  - "[[person-alice]]"
  - "[[person-bob]]"
tags:
  - meeting
_organized: true
---

# Kickoff Meeting

Initial planning meeting for the Kokobrain type system.

## Decisions
- Use frontmatter `type` field (not folder-based typing)
- Relationship fields use wikilink values
- Lifecycle managed by `_organized` / `_archived` / `_favorite` flags
- Type definitions are notes with `type: Type`

## Action items
- [ ] Alice: draft type definition schema
- [ ] Bob: prototype type sidebar component
