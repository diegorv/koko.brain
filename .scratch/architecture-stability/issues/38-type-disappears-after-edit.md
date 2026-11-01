# 38: page._type and the relationship keys disappear after an edit and return after a rebuild

**What to build:** A full build projects notes through Rust `project_note_record` (`src-tauri/src/commands/vault.rs:744-761`), which injects `_type`, `_belongs_to`, `_related_to` and `_has_many` into `properties`. An edit goes through the TS fast path instead (`collection.service.ts:84`: `updateNoteInIndex` -> `buildNoteRecord` -> `parseFrontmatterProperties`), and `buildNoteRecord` (`collection.logic.ts:21-56`) never sets those keys. So after editing a note, Collections filters on `_type` and QueryJS `page._type` lose it, until the next full rebuild brings it back.

Make the TS fast path produce the same injected keys as `project_note_record`, through one shared projection rule. Do not add a second ad-hoc mirror. This mirrors the earlier fix c7dcc17e, which aligned the lifecycle flags.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (+ `cargo test --manifest-path src-tauri/Cargo.toml` if the Rust side changes)

**Source:** src-tauri/src/commands/vault.rs:725-792, src/lib/features/collection/collection.logic.ts:21-56, src/lib/features/collection/collection.service.ts:58-95, src/lib/plugins/queryjs/queryjs.logic.ts:159-163; commit c7dcc17e

- [x] A failing test first, with real stores: a note whose frontmatter has `type: Person` (or whatever key `project_note_record` reads for `_type`; confirm it in vault.rs) gets the same `properties._type`, `_belongs_to`, `_related_to` and `_has_many` from `buildNoteRecord` as from the Rust projection
- [x] A collection filtered on `_type` keeps the note after an edit (assert the store state, not a mock call)
- [x] A golden test pins the key list both sides inject, so a key added in Rust and not in TS fails

## Notes

- **Re-checked at 1f4b769d:** the code matches. `project_note_record` is vault.rs:729 (keys injected at :746-762), `updateNoteInIndex` is collection.service.ts:86, and `buildNoteRecord` still sets none of the four keys.
- **Found by** the issue-24 verification on 2026-11-01, from reading the code; not reproduced in the app.
- **Size:** S.

## Comments

- **2026-11-01, branch `issue/38-type-disappears-after-edit`:** `buildNoteRecord` now derives `_type` (casing-normalized), `_belongs_to`, `_related_to` and `_has_many` the way Rust `project_note_record` does; a golden fixture (`src-tauri/tests/fixtures/note-record-projection.json`) is read by a Rust and a TS test so a key injected on one side only fails. Review round 1: APPROVED with 3 minor findings and 1 nit; the fix round added a case-sensitive `_type` filter test, an auto-move `{type}` casing test and a doc row, and moved the unquoted-wikilink and null-type parity cases to Issue 39. Full suite: 372 files, 9020 passed, 1 todo, build ok (`test-logs/architecture-stability/38-deliver.log`).
