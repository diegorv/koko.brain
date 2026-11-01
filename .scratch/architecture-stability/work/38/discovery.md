# Issue 38 discovery

No `spec.md` for architecture-stability; ADRs not needed for this change.

## What actually diverges (checked in code)

The keys do not literally vanish: `parseFrontmatterProperties` canonicalizes `type` -> `_type`
(`utils/frontmatter-aliases.ts`), and `_belongs_to` / `_related_to` / `_has_many` are kept as raw
frontmatter. The VALUES diverge from `project_note_record` (`src-tauri/src/commands/vault.rs:746-762`):
- `_type`: Rust writes `normalize_type_casing` of the string (`entry.rs:356 extract_is_a`), so
  `type: person` becomes `Person`; TS keeps `person`, so `_type == "Person"` stops matching.
- relationships: Rust writes the wikilink TARGET array (`entry.rs:369 extract_wikilink_targets`:
  string or array of strings, `[[a|x]]` / `[[a#h]]` -> `a`, empty targets dropped), only when non-empty;
  TS keeps `"[[a]]"`, so `_belongs_to.contains('a')` stops matching.

## Files that change

- `src/lib/features/collection/collection.logic.ts:21-56` `buildNoteRecord`: move the tags + lifecycle
  injection and the new `_type` / relationship injection into ONE function, `projectRecordProperties`,
  the single TS mirror of `project_note_record`. Reuse `normalizeTypeCasing`
  (`type-definitions.logic.ts:158`) and `parseWikilinks` (`backlinks.logic.ts:27`, same regex/split rule
  the Rust scanner mirrors).
- `src-tauri/tests/fixtures/note-record-projection.json` (new): golden fixture with one note `content`
  and the `injected` map (key -> projected value) both sides must produce.
- `src-tauri/tests/vault_file_ops_test.rs`: golden test, `NoteEntry::from_content` + `project_note_record`,
  injected = keys added or changed vs `entry.frontmatter`, must equal the fixture exactly.
- `src/tests/lib/features/collection/collection.service.test.ts`: same golden test against `buildNoteRecord`
  (vs `parseFrontmatterProperties`), plus parity tests for `_type` and relationships through
  `buildPropertyIndex` -> `updateNoteInIndex`, and an `executeQuery` filter on `_type` that keeps the note
  after an edit (real store, only `invoke` mocked).

## Prior art

Commit c7dcc17e and its `property index producer parity` suite in collection.service.test.ts:145-227.

## Defaults taken

- `_type` non-string or empty: keep the raw parsed value (Rust does the same: no override when `is_a` is None).
- Relationship arrays: only string items are scanned (Rust `filter_map(as_str)`).
- No Rust source change; only a Rust test, so the cargo gate runs.

## Risks

- `auto-move.service.ts:151` also calls `buildNoteRecord`; rules on `_type` now see the normalized casing
  and relationship rules see target arrays, the same shape the Rust-built index already gives them.
