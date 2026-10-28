# 03 discovery: Rust event frontmatter contract

## Files

- `src-tauri/tests/vault_event_frontmatter_test.rs` (new). Nothing under `src-tauri/src/` changes.

## Code read

- `src-tauri/src/vault/parsing.rs:555` `parse_frontmatter` -> `parse_yaml_lines` (`:581-656`): splits each top-level line on the FIRST `:`, canonicalizes the key (`aliases.rs:34`), then `parse_scalar` (`:679-712`) on the rest.
- `parse_scalar`: strips one pair of matching outer quotes, then null/bool literals, then i64, then f64, else `String`. No comment stripping, so ` # standup` stays in the value.
- `parsing.rs:85-91` `normalize_type_casing`: uppercases the first char only.
- `entry.rs:215` `NoteEntry::from_content`; `entry.rs:356-363` `extract_is_a` reads `_type`.
- `aliases.rs:9-28`: `color -> _color`, `type -> _type`; none of `event_color`, `event_title`, `location`, `end_date`.

## Plan

One integration test file, one `#[test]` per acceptance bullet, using a `fm(body)` helper that wraps `---\n...\n---\n` and calls `parse_frontmatter`. Type/`is_a` cases go through `NoteEntry::from_content`. Prior art: `src-tauri/tests/vault_aliases_test.rs` (style, imports), inline tests `parse_null_variants` / `parse_nested_map_records_parent_as_null_and_preserves_sibling` in `parsing.rs`.

## Risk: one acceptance bullet contradicts the code

The ticket (and plan Task 2, line 60; plan line 145; ticket 07 lines 25 and 72) say an empty `start:` parses to `String("")`. It does not: the empty-value branch (`parsing.rs:604-617`) inserts `JsonValue::Null` when the next line is top-level or the block ends, and the existing inline test `parse_null_variants` (`parsing.rs:2153-2160`) already pins `e:` -> `Null`. `parse_scalar`'s `String("")` branch is only reachable from inline-array items.

Default taken (test-only ticket, no production change allowed): pin the real behavior, `start:` -> `Null`, and also pin `start: ""` -> `String("")`, so both "absent" shapes ticket 07 folds into `{ kind: 'absent' }` are covered. Ticket 07 is unaffected in behavior (it treats missing, null and `''` alike), but its fixture note "`''` for empty keys" (ticket 07 line 72, plan line 182) and plan line 145 describe the wrong shape; flagged for the reviewer/human, not edited here (outside this ticket's Touches).

## Gate

Rust only: `cargo test --manifest-path src-tauri/Cargo.toml` (deliver step). Targeted: `cargo test --manifest-path src-tauri/Cargo.toml --test vault_event_frontmatter_test`.
