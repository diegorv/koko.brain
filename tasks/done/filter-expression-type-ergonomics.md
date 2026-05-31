# Filter Expression Type Ergonomics

Three improvements to make `.view`/`.collection` filter expressions match user expectations around the `type` field and `is_a` alias. Driven by a real debugging session where a user wrote `type == "person"` against 105 notes containing `type: person` in YAML and got zero matches.

## Background

- Rust normalises the `type` frontmatter value to first-letter-uppercase in `src-tauri/src/vault/entry.rs:344` (`normalize_type_casing`) and overwrites `properties["type"]` with that normalised string in `src-tauri/src/commands/vault.rs:667-669` when projecting `NoteRecord` for the TS collection service.
- The frontmatter alias `is_a` -> `type` is documented in `help/documentation/25-types-and-relationships.md:296,313` but is NOT recognised by the expression evaluator.
- `file.inFolder("vault/work/people")` returns zero matches because `record.folder` is an absolute path; the existing tests at `src/tests/lib/features/collection/expression/evaluator.test.ts:321-326` confirm the absolute-path contract is intentional. We leave that alone and document the workaround (`contains(file.folder, "people")`).

## Tasks

- [x] Task 1: Add a "Filter Gotchas" subsection to `help/documentation/12-collection.md` documenting (a) the `type` capitalization, (b) `is_a` working only in frontmatter (not filters - until Task 2 lands), and (c) the absolute-path requirement of `file.inFolder()` with a `contains(file.folder, ...)` workaround. Cross-reference from `help/documentation/25-types-and-relationships.md` in the Frontmatter Key Aliases table.
- [x] Task 2: In `src/lib/features/collection/expression/evaluator.ts::resolveIdentifier`, treat the identifier names `is_a` and `is a` as aliases for `type` (look up `record.properties.get("type")`). Apply the same alias in `resolveMember`'s dotted-property fallback so `note.is_a` and `property.is_a` also resolve. Add tests in `src/tests/lib/features/collection/expression/evaluator.test.ts` covering bare identifier, member access via `note.`/`property.`, and the negative case where `is_a` is missing entirely. Update the Filter Gotchas doc to remove the "not in filters" caveat for `is_a` once this lands.
- [x] Task 3: In `src/lib/features/collection/expression/evaluator.ts::evaluateBinary`, when `op` is `==` or `!=` AND either the `left` or `right` AST node is a bare identifier named `type` or `is_a`, compare the resolved values as case-insensitive strings. Keep the scope narrow (only that one identifier pair, only `==`/`!=`) so other fields stay case-sensitive. Add tests for: lowercase RHS matches capitalised stored value, mixed-case both sides, `!=` semantics, member access (`note.type == "person"`) still works, and unrelated fields (e.g. `name == "alice"`) remain case-sensitive.

## Notes

- User explicitly opted out of relaxing `file.inFolder()` semantics (Option 4 in the proposal) because making it accept vault-relative paths would produce false positives like `inFolder("notes")` matching every path containing the substring `notes`.
- No commits requested by the user; complete the tasks, run `pnpm check` + `pnpm vitest run` per the koko.brain CLAUDE.md task-completion gate, then hand back without committing.
- Tab indentation throughout (CLAUDE.md Conventions).
