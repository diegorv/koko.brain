Status: ready-for-agent
Phase: 1

# Add is_a type field to NoteEntryV2 and vault index

## What to build

Add an `is_a` field to `NoteEntryV2` in the Rust vault index. When a note's frontmatter contains `type` (or any alias from issue 01), extract the value, normalize casing (first letter uppercase, rest preserved), and store it on the entry.

The TypeScript mirror type (`vault-v2.types.ts`) must also gain the field. The `get_all_vault_entries_v2` IPC command already returns entries - the new field flows through automatically via serde.

Notes with `type: Type` (or `is_a: Type`) are Type Definition entries - they define a type rather than being an instance. This distinction matters for issue 09 but should already be parseable here.

## Acceptance criteria

- [ ] `NoteEntryV2` has `is_a: Option<String>` in Rust
- [ ] TypeScript mirror type has `isA: string | null`
- [ ] Frontmatter `type: Project` -> `is_a: Some("Project")`
- [ ] Aliases resolved via system metadata (issue 01)
- [ ] Casing normalized: `project` -> `Project`, `NOTE` -> `Note`
- [ ] Notes without a type field -> `is_a: None` / `null`
- [ ] Rust unit tests for parsing and normalization
- [ ] Existing vault index behavior unchanged for notes without type field

## Blocked by

- 01-system-metadata-aliases
