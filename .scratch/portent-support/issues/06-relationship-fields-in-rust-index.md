Status: ready-for-agent
Phase: 2

# Parse belongs_to/related_to and wikilink-bearing fields in Rust index

## What to build

Extend the Rust vault index to extract semantic relationship fields from frontmatter. Three categories:

1. **`belongs_to`**: hierarchical ownership (task belongs to project). Frontmatter key `belongs_to` (or alias `belongs to`). Value is a single wikilink string or array of wikilink strings.
2. **`related_to`**: lateral connections. Same format as `belongs_to`.
3. **Custom relationships**: any other frontmatter field whose value contains `[[wikilink]]` syntax. Stored as a generic map.

Wikilink extraction from frontmatter values: detect `[[target]]` pattern, store raw target string. Resolution to actual entries happens at read time (TypeScript side), not at index time.

Add corresponding fields to the TypeScript mirror type.

## Acceptance criteria

- [ ] `NoteEntryV2` has `belongs_to: Vec<String>`, `related_to: Vec<String>`, `relationships: HashMap<String, Vec<String>>` in Rust
- [ ] TypeScript mirror has matching fields
- [ ] `belongs_to: "[[project]]"` -> `belongs_to: ["project"]`
- [ ] `belongs_to: ["[[a]]", "[[b]]"]` -> `belongs_to: ["a", "b"]`
- [ ] Aliases resolved via system metadata
- [ ] Custom field `mentor: "[[john]]"` -> `relationships: {"mentor": ["john"]}`
- [ ] Fields without wikilinks not included in relationships map
- [ ] Rust unit tests for all value formats (string, array, mixed)
- [ ] Existing outgoing links (body wikilinks) unchanged

## Blocked by

- 01-system-metadata-aliases
