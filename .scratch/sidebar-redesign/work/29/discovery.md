# Issue 29 discovery: event-calendar trailing-comment rule

## Remaining triggers (after Issue 26, `parse_yaml_block` in `src-tauri/src/vault/parsing.rs:585`)
- Fallback notes: yaml-rust2 rejects the block (`title: foo: bar`, `tags: [a, b`, tabs, ...), the whole block goes through `parse_yaml_lines` -> `parse_scalar`, which keeps `09:30 # standup` in the value.
- Quoted values: a quoted/block scalar is kept verbatim, so `start: "9 #x"` gives `"9 #x"`.

## Decision: the rule stays, unchanged
Without it, a fallback `date: 2026-11-10 # x` would be a non-actionable `unscheduled/not-a-day`, and a fallback `event_color: blue # x` would silently render the default color. The rule turns both into an actionable issue naming the key and the cause. Quoted values with ` #` in checked keys are never valid days/times/colors anyway, so flagging them costs nothing. Record this on `COMMENT_CHECKED_KEYS`.

## Files that change
- `src/lib/features/event-calendar/event-calendar-event.logic.ts:33` doc comment on `COMMENT_CHECKED_KEYS` (triggers + decision). No behaviour change.
- `src/tests/fixtures/event-notes.fixture.ts:6-48`: `rustFrontmatter` models the yaml-rust2 path for flat scalars (plain values drop a ` #` comment then go through `parse_scalar`; quoted values are strings, a comment after the closing quote dropped). A block holding a plain value with a nested `: ` (the `title: foo: bar` fallback shape) is read with the subset rules (current behaviour, comment kept). `rustScalar` line reference updated.
- `src-tauri/tests/vault_event_frontmatter_test.rs`: pin a fallback note keeping the comment, and a quoted value keeping ` #` (characterization of existing Rust behaviour).
- `src/tests/lib/features/event-calendar/event-calendar-event.logic.test.ts:541-547`: fixture test updated (`note: '09:30 # x'` now `'09:30'`), plus a fallback-note and a quoted-value test through `eventEntryFromContent` + `entryToEvent` -> `trailing-comment`.

## Prior art
- Rust pins: existing tests in `vault_event_frontmatter_test.rs` (`parse_key`).
- Parity fixture fallback cases: `src/tests/fixtures/frontmatter-parity.fixture.json:550` (`title: foo: bar`).

## Risks
- `eventEntryFromContent` feeds the service and EventDialog tests; run the whole event-calendar test folder. (Quoted numbers were already strings: `parse_scalar` returns the quoted text before any number parse, on both paths.)

## Defaults taken
- Fallback detection in the fixture covers only the nested-colon shape; other fallback triggers are not modelled.
- No YAML escape handling in quoted values (event shapes do not use escapes).
