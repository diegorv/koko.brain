# Issue 26 discovery: Rust frontmatter via yaml-rust2

## Files that change
- `src-tauri/Cargo.toml` (+ `Cargo.lock`): `yaml-rust2 = { version = "0.13", default-features = false }`.
- `src-tauri/src/vault/parsing.rs:526-770`: module comment rewritten; `parse_frontmatter` (555) and `parse_frontmatter_raw_yaml` (570) call a new `parse_yaml_block` that tries yaml-rust2, falls back to `parse_yaml_lines` (579, kept as the subset parser) on `Err` with `debug_log("FRONTMATTER", ...)`.
- `src-tauri/src/vault/parsing.rs:2331` `parse_comments_after_value_are_kept_as_part_of_string` and `:2266` `parse_block_array_terminates_when_indent_decreases`: owner-approved behaviour changes.
- `src-tauri/tests/vault_event_frontmatter_test.rs:73` `inline_comment_is_kept_in_the_value` and its module comment ("an inline ` #` comment is NOT stripped").
- `src-tauri/src/vault/index_cache.rs:13-16`: `INDEX_SCHEMA_VERSION` 3 -> 4, doc comment.
- New: `src/tests/fixtures/frontmatter-parity.fixture.json`, `src-tauri/tests/vault_frontmatter_parity_test.rs`, `src/tests/lib/features/properties/frontmatter-parity.test.ts`.
- `src-tauri/tests/commands/vault_test.rs` (~line 900): schema-3 snapshot is discarded.
- `docs/adr/0029-frontmatter-yaml-canonical-form.md`: amendment. New follow-up issue `.scratch/sidebar-redesign/issues/29-...md`.

## Plan
1. Fixture + Rust parity test (red), TS parity test (green on the TS side).
2. Add dependency, implement: a `MarkedEventReceiver` buffers `Event`s; on `Ok`, build a small node tree (Scalar{text, style} / Seq / Map(entries)), resolving `Alias(id)` from a per-parse anchor map. Projection: root must be a Map, else empty map; key = scalar text, skip empty keys and non-scalar keys, `canonicalize_key`, last-wins via `BTreeMap::insert`; plain scalar -> `parse_scalar`, quoted/block scalar -> `String`; Seq -> Array (with the `[[X]]` rule); Map -> Null.
3. Update the approved changed tests, bump schema version, cache test, relationship test (`NoteEntry::from_content` + `VaultIndex::lookup_relationship_backlinks`, which is what `get_relationship_backlinks_v2` returns).
4. Docs: module comment, ADR amendment, follow-up issue.

## Prior art
- Self-exec stderr capture for the one-log assertion: `src-tauri/tests/utils_logger_test.rs`.
- Cache tests: `vault_test.rs:798-881` (`scan_vault_v2_cached_inner`, `cache_file_path`, `serialize_snapshot`).
- TS projection: `e2e/mocks/vault-index.ts:96-136`.

## Defaults taken
- `[[X]]` rule: X is the inner scalar's source text in any style (so `[[2026]]` gives `"[[2026]]"`, not a nested number), the issue says "string"; numeric note names are common for periodic notes.
- Other nested sequences stay nested arrays (same as the TS projection).
- `load(recv, false)`: only the first YAML document is read (a `...` line ends it).
- Fixture sentinel for non-JSON values: `{"$float": "inf"}` style is not needed for Rust (`.inf` is a string there); TS-side `.inf` is encoded as the string sentinel `"__INFINITY__"` in `tsExpected` and mapped in the TS test.
- Fixture lives at `src/tests/fixtures/` (TS) and is read by Rust via `include_str!("../../src/tests/fixtures/...")`.

## Risks
- yaml-rust2 may accept or reject inputs differently from `yaml@2.9.1`; the fixture records each divergence explicitly.
- Fallback cases must reproduce today's values exactly; asserted against the subset outputs in the fixture.
- `views:` in `.view` files becomes `[null]`; `grep frontmatter.views src/lib e2e` finds nothing (re-checked at discovery).
