# 08: Replace the hand-written stream-json fixture with a real capture

**What to build:** Replace `src-tauri/tests/fixtures/claude/stream.ndjson`, written by hand in Issue 02, with the output of a real `claude -p ... --output-format stream-json --verbose --include-partial-messages` run, so a field renamed by the CLI fails the parser tests instead of reaching the panel.

**Blocked by:** 03

**Files:** src-tauri/tests/

**Status:** needs-triage

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml`

- [ ] The fixture is a real capture of one turn that streams text, calls at least one tool and ends in a `result`, with any personal paths or note text replaced by neutral values.
- [ ] The parser tests that read the fixture pass against it, or are updated to the fields the real stream sends.
- [ ] Owner decision recorded in Notes: the capture needs a paid `claude` run on the owner's machine.

## Problem

Found by Issue 02's review (finding 6) and carried by Issue 03's Notes, which planned the capture for Issue 03's manual check. Issue 03 was delivered by an agent that cannot make a paid run, so the capture was not done (Issue 03 review, finding 5). A hand-written fixture only proves the parser reads what its author expected.
