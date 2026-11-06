# 31: A `#` inside a link or URL is not a task tag

**What to build:** `TASK_TAG_RE` (`src-tauri/src/vault/parsing.rs:1577-1578`, `#([A-Za-z0-9_][A-Za-z0-9_-]*)`) matches a `#` anywhere in the task text. In `read [[Book#Chapter 2]]` it finds the tag `Chapter`, and the strip at `:1857` leaves the description `read [[Book 2]]`. A URL fragment (`see https://example.com/a#b`) loses `#b` the same way. The wrong description is what the Tasks view shows once Issue 05 renders `metadata.description` (Issue 05's `taskDisplayText` works around it by showing the raw text), and the wrong tag and description are what Todoist receives as labels and content (`src/lib/features/tasks/todoist-bridge.logic.ts:43`, `:58-60`).

Under PRD decision B7 (a), Issue 26 fixes this, because the note tag scanner reads `#` only after whitespace or line start (`parsing.rs:453-462`). This Issue is the fix for B7 (b), which keeps task tags ASCII only: add the same boundary and change nothing else.

- `TASK_TAG_RE` becomes `(^|\s)#([A-Za-z0-9_][A-Za-z0-9_-]*)`. The Rust `regex` crate has no look-behind, so the leading whitespace is captured: the tag is group 2 (`:1850` reads `caps.get(2)`), and the strip at `:1857` replaces each match with `$1` so the space before the tag stays and `MULTI_SPACE_RE` collapses it as today. Update the doc comment at `:1574-1576` to say a tag needs whitespace or line start before `#`, as note tags do.
- The ASCII class stays: `#revisão` still yields `revis` (that is B7's other half, Issue 26).
- Parser output changes, no DTO change: bump `INDEX_SCHEMA_VERSION` one above its value on main at merge time (re-check after any rebase, even a clean one) (`src-tauri/src/vault/index_cache.rs:13-18`; 5 to 6 today, 6 to 7 if Issue 11 bumped it first), or cached entries with a matching mtime keep the old tags. One full index rebuild per vault; tell the owner in the delivery comment.
- The e2e mock parser returns `tags: []` for every task (`e2e/mocks/vault-index.ts:177`), so it needs no change.

**Blocked by:** 11

**Status:** needs-info

**Waits on:** PRD decision B7 (task tag rule). Run this Issue only when B7 is answered (b). Under (a) close it as wontfix in the same commit that delivers Issue 26, whose tests cover the same cases.

**Gate:** Rust only: `cargo test --manifest-path src-tauri/Cargo.toml`. Run cargo from the checkout or worktree root.

- [ ] Failing Rust test first, next to the tag tests (`parsing.rs:3216-3228`): `parse_task_metadata("read [[Book#Chapter 2]]")` returns no tags and the description `read [[Book#Chapter 2]]`. Fails today (tag `Chapter`, description `read [[Book 2]]`).
- [ ] `parse_task_metadata("see https://example.com/a#b #work")` returns the tag `work` only and the description `see https://example.com/a#b`.
- [ ] A tag at the start of the text (`#work call`) is still a tag, with description `call`.
- [ ] The existing tag tests (`parsing.rs:3216-3228`) and `parse_task_metadata_recurrence_stops_at_hash_tag` (`:3159`) pass unchanged.
- [ ] A cache written at the previous schema version is rejected and rebuilt, following `cached_inner_discards_a_schema_3_snapshot_and_reparses` (`src-tauri/tests/commands/vault_test.rs:972-990`); its `assert_eq!(INDEX_SCHEMA_VERSION, ...)` lines change on purpose to the new value.

## Notes

- **Size:** S.
- Issue 05's `taskDisplayText` keeps working after this Issue: with no `#` stripped from links, the description and the raw text agree on the link.
