VERDICT: APPROVED

# Review: calendar-feature issue 03 (Rust event frontmatter contract)

Scope reviewed: `git diff main...HEAD` (ba23b09e, a2aece22). The diff touches `src-tauri/tests/vault_event_frontmatter_test.rs` (new, 130 lines), `.scratch/calendar-feature/work/03/discovery.md` and the Issue file. `git diff main...HEAD -- src-tauri/src` is empty.

Test verdict rests on: `src-tauri/tests/vault_event_frontmatter_test.rs`, which I ran myself (`cargo test --manifest-path src-tauri/Cargo.toml --test vault_event_frontmatter_test`, 12 passed, 0 failed, exit 0). No production code changed, so there are no tests of changed code to run. I did not run the inline `parsing.rs` tests. Every claim about parser behavior below was checked by reading `parsing.rs:555-712`, `aliases.rs:9-34` and `entry.rs:215-363`.

## Acceptance criteria

- [x] **The file exists and uses both APIs.** Met. It imports `kokobrain_lib::vault::parsing::parse_frontmatter` and `kokobrain_lib::vault::entry::NoteEntry` (test:13-14) and calls `NoteEntry::from_content` (test:23-29).
- [x] **`date` stays a string, and `start` is the same quoted or bare.** Met. `date: 2026-11-10` gives a String (test:33). `start: 09:30` and `start: "09:30"` both give `String("09:30")` (test:38-39). `parse_scalar` tries only i64 and f64 (parsing.rs:701-708), and both fail on `09:30`.
- [x] **`start: 570` is a Number and `all_day: true` is a Bool.** Met (test:44-46). `json!(570)` is `PosInt` and does not equal a `Float`, so the test also pins integer parsing (not f64).
- [~] **An empty `start:` gives `String("")`.** Not met as written, and the deviation is accepted. The parser's empty-value branch inserts `JsonValue::Null` both when another top-level key follows and at the end of the block (parsing.rs:604-617). `parse_scalar`'s `String("")` branch (parsing.rs:681-683) is unreachable from a top-level key, because `parse_scalar` is only called when `value_trimmed` is non-empty (parsing.rs:631-635). Meeting the criterion literally would need a production change, and the Issue forbids one. The test pins the real shapes: `start:` gives Null, with a following key (test:55) and at the end of the block (test:56), and `start: ""` gives `String("")` (test:57). Ticket 07 folds missing, null and `''` into `absent` (07 AC "parseEventTime"), so its behavior does not change. See finding 1.
- [x] **Malformed times and datetimes stay strings.** Met. `9:30 AM`, `end: 2026-11-12` and `2026-11-10T09:30` all give a String (test:62-67).
- [x] **Quotes are stripped and the comment stays in the value.** Met. `location: "Room #4"` gives `"Room #4"` (test:72-75), and `start: 09:30 # standup` gives `"09:30 # standup"` (test:80-83). The parser has no comment stripping.
- [x] **A nested map is Null.** Met (test:88-90). The test also pins that the sibling `date` survives.
- [x] **`type` goes to `_type`, and `is_a` changes only the first letter.** Met. `type: event` is stored under `_type` as `"event"`, the bare `type` key is absent, and `is_a == "Event"` (test:95-98). `_type: EVENT` gives `is_a == "EVENT"` (test:103-104). This matches `normalize_type_casing` (parsing.rs:85-91) and `extract_is_a` (entry.rs:356-363).
- [x] **Only `color` is aliased.** Met (test:109-121). `color` becomes `_color`. `event_color`, `event_title`, `location` and `end_date` keep their names, and their `_`-prefixed forms are absent. This matches ALIAS_MAP (aliases.rs:9-28).
- [x] **`event_title: "1:1 with manager"` is kept whole.** Met (test:126-129). `split_once(':')` splits on the first colon only, and the outer quotes are stripped.
- [x] **Test-only.** Met. `git diff main...HEAD --stat -- src-tauri/src` is empty.
- [ ] **Gate green, and one commit in the full format.** The commit part is met: a2aece22 has Context, Problem, Solution, Behavior, Files with line ranges, and the Co-Authored-By trailer. The full gate (Rust only: `cargo test`) is left to the deliver step, as the workflow intends.

## Findings

1. **Low (docs, non-blocking).** `.scratch/calendar-feature/plan-2026-10-28.md:60`, `:145`, `:182` and `.scratch/calendar-feature/issues/07-event-note-schema-logic.md:72` say Rust turns an empty key into `''` ("Rust turns `start:` into `''`" and "the fixture models ... `''` for empty keys"). The pinned behavior is `null` (test:55-56).
   - **Fix:** before ticket 07 is implemented, change those lines to say that an empty key is `null` and a quoted `""` is `''`, and have the `eventEntry` fixture model `null` for empty keys, so the fixture matches the Rust parse it claims to model. These files are outside this Issue's Touches, so this review does not edit them. The user should decide whether to edit them, or ticket 07's build step should handle it (its discovery will see this review).
2. **Nit (test redundancy).** At `src-tauri/tests/vault_event_frontmatter_test.rs:45`, `is_number()` adds nothing after the `json!(570)` equality on line 44, which already implies it.
   - **Fix:** optional. Drop line 45, or leave it as documentation.
3. **Nit (formatting).** `src-tauri/tests/vault_event_frontmatter_test.rs:88` and `:110` are long single-line string literals. The repo has no rustfmt config and no CI fmt check, and the tabs match the other `src-tauri/tests/*.rs` files. **Fix:** none required.

There is no correctness bug, no missing test against the criteria, and no scope creep. Layer rules, error handling and performance guidelines do not apply to a test-only Rust diff.

## Resolution

1. **Deferred, not applied here.** The finding is correct: Rust parses a bare `start:` to `null`, not `''`. The files it names (`plan-2026-10-28.md` and `issues/07-event-note-schema-logic.md`) are outside this Issue's Touches. Changing them also changes ticket 07's spec (what the `eventEntry` fixture models), so the user or ticket 07's build step decides. The behavior is pinned in `vault_event_frontmatter_test.rs` (`empty_value_is_null_and_quoted_empty_is_an_empty_string`).
2. **Fixed.** Dropped the redundant `is_number()` assertion from `integer_and_boolean_values_are_typed`.
3. **No change.** The reviewer requires no fix: there is no rustfmt config or CI fmt check.
