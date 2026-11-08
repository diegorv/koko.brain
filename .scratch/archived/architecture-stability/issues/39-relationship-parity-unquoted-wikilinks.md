# 39: relationship keys differ between edit and rebuild for unquoted wikilinks in a list

**What to build:** Issue 38 made `buildNoteRecord` (`src/lib/features/collection/collection.logic.ts`) derive `_type`, `_belongs_to`, `_related_to` and `_has_many` the way Rust `project_note_record` does. Parity holds for the documented quoted form (`- "[[Carol]]"`, `help/documentation/25-types-and-relationships.md:212-215`). With an unquoted block list item (`_related_to:\n  - [[Carol]]`) the two frontmatter parsers disagree: YAML reads `[[Carol]]` as a nested sequence. At the Issue 38 review the Rust line parser gave `["Carol"]` and TS gave `['"Carol"']` (the TS parse flattens the nested array to a string). So the edit path and a rebuild still disagree for that form.

Also: a bare `type:` (null) gives `_type: ''` on the TS side and stays null in Rust (`collection.logic.ts:57`).

Re-check both after `3d656180` (sidebar-redesign Issue 26, Rust reads frontmatter with a real YAML parser), which changed the Rust side after the Issue 38 review. Then pick one rule for each case, apply it on both sides, and add the cases to `src-tauri/tests/fixtures/note-record-projection.json`.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (+ `cargo test --manifest-path src-tauri/Cargo.toml` if the Rust side changes)

**Source:** .scratch/architecture-stability/work/38/review.md findings 3 and 4; src/lib/features/collection/collection.logic.ts; src-tauri/src/vault/entry.rs `extract_wikilink_targets`

- [x] A test pins what an unquoted `- [[Target]]` list item derives on both sides, and both sides agree
- [x] A test pins what a null `type:` gives for `_type` on both sides, and both sides agree

## Notes

- **Found by** the Issue 38 review on 2026-11-01. Predates Issue 38.
- **Size:** S.

## Comments

- 2026-11-01, branch `issue/39-relationship-parity-unquoted-wikilinks`: TS `parseFrontmatterProperties` reads an unquoted `[[X]]` (value or list item) as `"[[X]]"` from the scalar's source text, like Rust `project_value`; Rust `project_note_record` writes `_type: ""` for a bare `type:`. Both pinned in `note-record-projection.json` (unquoted links, source spelling of `[[007]]`/`[[~]]`/`[[1.0]]`, null type), plus `ensureFrontmatterLink` cases for an unquoted existing link and an ADR 0029 amendment. Tests: full `pnpm vitest run && pnpm build` 376 files / 9145 passed, 1 todo, build ok; full `cargo test` 1141 passed, 0 failed. Review round 1: APPROVED (3 minor/nit findings, all fixed in the deliver step).
