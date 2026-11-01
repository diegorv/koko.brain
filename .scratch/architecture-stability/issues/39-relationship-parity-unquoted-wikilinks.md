# 39: relationship keys differ between edit and rebuild for unquoted wikilinks in a list

**What to build:** Issue 38 made `buildNoteRecord` (`src/lib/features/collection/collection.logic.ts`) derive `_type`, `_belongs_to`, `_related_to` and `_has_many` the way Rust `project_note_record` does. Parity holds for the documented quoted form (`- "[[Carol]]"`, `help/documentation/25-types-and-relationships.md:212-215`). With an unquoted block list item (`_related_to:\n  - [[Carol]]`) the two frontmatter parsers disagree: YAML reads `[[Carol]]` as a nested sequence. At the Issue 38 review the Rust line parser gave `["Carol"]` and TS gave `['"Carol"']` (the TS parse flattens the nested array to a string). So the edit path and a rebuild still disagree for that form.

Also: a bare `type:` (null) gives `_type: ''` on the TS side and stays null in Rust (`collection.logic.ts:57`).

Re-check both after `3d656180` (sidebar-redesign Issue 26, Rust reads frontmatter with a real YAML parser), which changed the Rust side after the Issue 38 review. Then pick one rule for each case, apply it on both sides, and add the cases to `src-tauri/tests/fixtures/note-record-projection.json`.

**Blocked by:** none

**Status:** needs-triage

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (+ `cargo test --manifest-path src-tauri/Cargo.toml` if the Rust side changes)

**Source:** .scratch/architecture-stability/work/38/review.md findings 3 and 4; src/lib/features/collection/collection.logic.ts; src-tauri/src/vault/entry.rs `extract_wikilink_targets`

- [ ] A test pins what an unquoted `- [[Target]]` list item derives on both sides, and both sides agree
- [ ] A test pins what a null `type:` gives for `_type` on both sides, and both sides agree

## Notes

- **Found by** the Issue 38 review on 2026-11-01. Predates Issue 38.
- **Size:** S.
