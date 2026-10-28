# 03: Rust frontmatter parsing contract for event notes pinned by tests

**What to build:** a Rust integration test pins how the existing frontmatter parser and `NoteEntry::from_content` treat every key the event calendar reads: day and time values stay strings, `570` and `true` parse to a number and a boolean, an empty value parses to an empty string, quotes are stripped, an inline ` #` comment stays in the value, nested maps become null, `type` lands under `_type` with an `is_a` that only uppercases the first character, and of the calendar's own keys only `color` is aliased (to `_color`), never `event_color`, `event_title`, `location` or `end_date`. A later Rust parsing change that would silently break the calendar's projection or its issue rules (ticket 07) fails `cargo test`. No production code changes.

**Plan reference:** Task 2 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 55-70). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `src-tauri/tests/vault_event_frontmatter_test.rs` (new)

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml`

- [ ] `src-tauri/tests/vault_event_frontmatter_test.rs` exists and uses `kokobrain_lib::vault::parsing::parse_frontmatter` (`src-tauri/src/vault/parsing.rs:555`) and `kokobrain_lib::vault::entry::NoteEntry::from_content` (`src-tauri/src/vault/entry.rs:215`)
- [ ] `date: 2026-11-10` parses to `String`; `start: 09:30` and `start: "09:30"` both parse to `String("09:30")`
- [ ] `start: 570` parses to `Number`, `all_day: true` to `Bool`, and an empty `start:` to `String("")`
- [ ] `start: 9:30 AM`, `end: 2026-11-12` and `start: 2026-11-10T09:30` parse to `String` (the `invalid-time` cases of ticket 07 rely on this)
- [ ] `location: "Room #4"` parses to `String("Room #4")` because the quotes are stripped (why ticket 07 limits the ` #` issue rule to time fields), and `start: 09:30 # standup` keeps the comment in the value
- [ ] A nested map value parses to `Null`
- [ ] `type: event` lands under key `_type` with `is_a == Some("Event")`, and `_type: EVENT` gives `is_a == Some("EVENT")` because `normalize_type_casing` only uppercases the first character
- [ ] `event_color`, `event_title`, `location` and `end_date` are not aliased, while `color` becomes `_color`
- [ ] `event_title: "1:1 with manager"` parses to `String("1:1 with manager")`
- [ ] Test-only: no file under `src-tauri/src/` changes
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 11:22 — discovery — plan written; empty `start:` parses to Null, not String(""), pinned as-is and flagged — pending
- 2026-10-28 11:25 — implement — vault_event_frontmatter_test.rs added, 12/12 pass (targeted cargo test); full gate left to deliver — see commit
- 2026-10-28 11:27 — review — VERDICT: APPROVED; empty `start:` -> Null deviation accepted, plan/ticket 07 '' wording flagged (non-blocking) — see commit
- 2026-10-28 11:28 — fix — review finding 2 fixed (redundant is_number dropped), finding 1 deferred to user/ticket 07, finding 3 no change; targeted test 12/12 — see commit
