VERDICT: APPROVED

## Acceptance criteria

- [met] A test pins what an unquoted `- [[Target]]` list item derives on both sides, and both sides agree — the fixture case "unquoted wikilinks as a value and as block list items" (src-tauri/tests/fixtures/note-record-projection.json, `_belongs_to: [[Team]]`, `- [[Carol]]` next to `- "[[Dan]]"`) expects `_belongs_to: ["Team"]`, `_related_to: ["Carol", "Dan"]` and is run by both `project_record_injected_keys_match_golden_fixture` (src-tauri/tests/vault_file_ops_test.rs, passes in my run) and `buildNoteRecord matches project_note_record: %s` (src/tests/lib/features/collection/collection.service.test.ts, passes). I put main's properties.logic.ts back in the worktree for one run: that fixture case and 3 of the 4 new properties.logic.test.ts cases failed. So the tests catch the old JSON-stringify behavior. I also probed a single-item block list `- [[Carol]]`: TS gives `["Carol"]`, which is what Rust `project_value` gives for a seq holding a seq holding a seq.
- [met] A test pins what a null `type:` gives for `_type` on both sides, and both sides agree — the fixture case "null type" (`type:`) asserts `record._type == ""` on both sides. Rust `project_note_record` (src-tauri/src/commands/vault.rs:747-751) now writes "" when the frontmatter `_type` is null and no `is_a` is derived. TS already gave "" (ADR 0029 null coercion). My probe confirms `type: ~` and `type: ""` also give "" in TS. The only TS consumer that reads `_type` off a record (auto-move.logic.ts:122) already maps null to "".

## Checks run (by this review)

- `pnpm check`: 0 errors, 0 warnings.
- Vitest, 43 files, 1840 tests, all passed: src/tests/lib/features/properties/, src/tests/lib/features/collection/, plus every test file that references `parseFrontmatterProperties`, `buildNoteRecord` or `ensureFrontmatterLink`. That includes frontmatter-parity.test.ts, properties.logic.test.ts and collection.service.test.ts.
- Cargo (`--test vault_file_ops_test --test commands_test --test vault_frontmatter_parity_test --test vault_index_test`): all passed (27 + 70 + 9 + 107), golden test included.
- Not run: the full suite (`pnpm vitest run && pnpm build`) and the full `cargo test`. Deliver runs those.
- Layer baseline / BASELINE_SIZE / composition roots: untouched.

## Findings

1. minor — src/lib/features/properties/properties.logic.ts:54 — `unquotedWikilink` builds the link from the scalar after YAML resolved it (`String(target)`). Rust builds it from the source text. So `[[007]]` gives `[[7]]` in TS and `[[007]]` in Rust, and `[[1.0]]` gives `[[1]]` vs `[[1.0]]`. `[[~]]` / `[[null]]` are not matched in TS at all: my probe got the edit-path record `_related_to: ["[null]"]`, while Rust derives the target `~` / `null`. The relationship keys still differ between edit and rebuild for these spellings. They are rare note names, and the build report lists them as a known risk. Fix: read the scalar's source spelling (e.g. `parseDocument` and `Scalar.source`, or the CST) so TS matches Rust. If that is not worth it, add a fixture case that pins the divergence, so it is a decision and not an accident.
2. minor — src/lib/features/properties/properties.logic.ts:386 — this changes how `ensureFrontmatterLink` behaves, and no test covers it. With `_belongs_to: [[Team]]` (unquoted), linking `Team` now returns the content unchanged (already linked), where before the value parsed as `'["Team"]'`, the link check failed, and the call threw `nested`. The new behavior is correct and matches the Rust index, but nothing pins it. Fix: add an `ensureFrontmatterLink` case to properties.logic.test.ts for an unquoted existing link (unchanged) and one for an unquoted other link (throws `nested`).
3. nit — docs/adr/0029-frontmatter-yaml-canonical-form.md:56 / :105 — ADR 0029 lists the TS read coercions (null to "", scalar list items to strings) and the divergences between Rust and yaml@2.9.1. It does not record that `convertToProperty` now also reads the nested `[[X]]` shape (and a block list whose only item is `[x]`) as the string `"[[X]]"`, or that the Rust NoteRecord writes `_type: ""` for a bare `type:`. Fix: add a short amendment line covering both rules.

## Resolution

1. Fixed. `parseFrontmatterProperties` now parses with `parseDocument` and folds a list holding a one-item list of a scalar into `"[[X]]"` built from `Scalar.source` (`foldUnquotedWikilinks`, src/lib/features/properties/properties.logic.ts), replacing the value-level `unquotedWikilink`. `[[007]]`, `[[1.0]]`, `[[~]]` and `[[null]]` keep their spelling. Pinned by a new properties.logic.test.ts case and a new shared fixture case ("unquoted wikilinks keep the source spelling of a YAML number or null"), run by both the Rust golden test and the TS projection test; both failed on the TS side before the change and pass after.
2. Fixed. Two `ensureFrontmatterLink` cases: an unquoted `_belongs_to: [[Team]]` linking `Team` returns the content unchanged; linking `Other` throws `nested`.
3. Fixed. ADR 0029 has an amendment line for both rules (TS nested `[[X]]` read, Rust `_type: ""` for a bare `type:`).
