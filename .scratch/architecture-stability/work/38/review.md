VERDICT: APPROVED

# Issue 38 review

Reviewed `git diff main...HEAD` (d8bc7512, 2c82a02a, 5c393d54) against the Issue. No spec.md exists for architecture-stability. No Rust source changed; only a Rust test and a shared fixture were added.

## Acceptance criteria

- [met] A failing test first, with real stores: a note whose frontmatter has `type: Person` (or whatever key `project_note_record` reads for `_type`; confirm it in vault.rs) gets the same `properties._type`, `_belongs_to`, `_related_to` and `_has_many` from `buildNoteRecord` as from the Rust projection — `project_note_record` reads `entry.is_a` (vault.rs:746), which comes from frontmatter `_type` (`type:` is aliased) via `extract_is_a` (entry.rs:356). Test `collection.service.test.ts:257` builds the index from a Rust-shaped record via `buildPropertyIndex`, then runs `updateNoteInIndex`, using the real `collectionStore` with only `invoke` mocked, and compares all four keys. I put main's `collection.logic.ts` back over the branch's and ran the file: 3 tests failed (:257, the relationship filter test, and the golden test :324). With the branch code, 25/25 pass.
- [met] A collection filtered on `_type` keeps the note after an edit (assert the store state, not a mock call) — `collection.service.test.ts:274` runs `executeQuery` over `collectionStore.propertyIndex` before and after `updateNoteInIndex` and asserts the paths returned. It passes. It is a weak guard, though: it also passes on main (see finding 1).
- [met] A golden test pins the key list both sides inject, so a key added in Rust and not in TS fails — `src-tauri/tests/fixtures/note-record-projection.json` is read by both `vault_file_ops_test.rs:371` (keys `project_note_record` adds or changes compared with `entry.frontmatter`, checked for exact equality) and `collection.service.test.ts:324` (keys `buildNoteRecord` adds or changes compared with `parseFrontmatterProperties`, also exact). If Rust adds a key unconditionally, the Rust test fails until the fixture lists it, and then the TS test fails until TS adds it. `cargo test --test vault_file_ops_test`: 27 passed.

## Checks run (by this review)

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `vitest run src/tests/lib/features/collection src/tests/lib/features/auto-move src/tests/lib/features/type-definitions src/tests/lib/features/backlinks src/tests/lib/plugins/queryjs`: exit 0, 41 files, 1685 passed, 1 todo. My test verdict rests on these files, mainly `collection.service.test.ts`, `collection-logic.test.ts` and `auto-move.logic.test.ts`/`auto-move.service.test.ts`, which cover the other `buildNoteRecord` caller.
- `cargo test --manifest-path src-tauri/Cargo.toml --test vault_file_ops_test`: exit 0, 27 passed, including `project_record_injected_keys_match_golden_fixture`.
- Red check: the new tests run against main's `collection.logic.ts` give 3 failures, as listed above.
- Probe of `buildNoteRecord` on edge cases (temporary test, since deleted): quoted string, quoted inline array and multi-link string give the same targets as Rust's `extract_outgoing_links`. Empty, null, list and number `_type` stay raw. `éclair` becomes `Éclair`.
- Not run here: the full `pnpm vitest run && pnpm build`. That is deliver's to run.

## Findings

1. minor — `src/tests/lib/features/collection/collection.service.test.ts:274`: the criterion-2 test filters on `_type == 'Person'`, and the evaluator compares `_type` against literals case-insensitively (`evaluator.ts:101-124`), so the test passes on main too and does not guard this fix. Fix: add a case-sensitive `_type` assertion, such as `_type.startsWith('P')` or a `_type == otherProp` comparison, so the test fails without `normalizeTypeCasing`.
2. minor — `src/lib/features/auto-move/auto-move.service.ts:152` / `auto-move.logic.ts:122`: auto-move's `{type}` destination variable now resolves to the casing-normalized type, so `type: project` gives `Project` instead of `project`. The branch does not test this, and `help/documentation/22-auto-move.md:75` still shows `project` as the example. Impact is low on case-insensitive APFS, because `isAlreadyInDestination` lowercases, but on a case-sensitive volume a new note lands in a sibling `Project/` folder. Fix: add an `auto-move.logic.test.ts` case for a lowercase `type:` through `buildNoteRecord`, and make the doc row say the type is casing-normalized (or name it in the commit/Issue as an intended behavior change).
3. minor — `src/lib/features/collection/collection.logic.ts:85`: parity holds only for quoted wikilinks. With an unquoted block list (`_related_to:\n  - [[Carol]]`), Rust's line parser yields `"[[Carol]]"` and derives `["Carol"]`, while the TS `yaml` parse yields a nested array that is flattened to `"\"Carol\""`, so the edit path still differs from a rebuild. This divergence predates the branch (the frontmatter parsers differ), and the documented authoring form is quoted (`help/documentation/25-types-and-relationships.md:212-215`). Fix: out of scope here; open a follow-up Issue for frontmatter parser parity on unquoted wikilinks in lists.
4. nit — `src/lib/features/collection/collection.logic.ts:57`: frontmatter `type:` (null) gives `_type: ''` on the TS side but stays `null` in Rust. This predates the branch, and the build report mentions it. It is not pinned by the fixture. Fix: leave it, or cover it in the follow-up from finding 3.

## Resolution

1. Fixed. `collection.service.test.ts` adds "a case-sensitive _type filter keeps the note after an edit", filtering `_type == kind` (two property references compare strictly). It fails against main's `collection.logic.ts` and passes with the branch.
2. Fixed. `auto-move.logic.test.ts` adds "resolves {type} to the casing-normalized type" (`type: project` through `buildNoteRecord` gives `archive/Project`; fails against main's `collection.logic.ts`). `help/documentation/22-auto-move.md` now says `{type}` is first-letter uppercased and shows `Project`. This is an intended behavior change: `{type}` now matches what a rebuild already gave.
3. Deferred to follow-up Issue 39 (`.scratch/architecture-stability/issues/39-relationship-parity-unquoted-wikilinks.md`), which also asks to re-check it after main's `3d656180` (Rust real YAML parser).
4. Folded into Issue 39 too.
