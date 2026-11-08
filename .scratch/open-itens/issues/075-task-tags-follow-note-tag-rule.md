# 075: Task tags follow the note tag rule

**Origin:** `tasks-view` Issue 26, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/tasks-view/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Task tags are ASCII only (`TASK_TAG_RE`, `src-tauri/src/vault/parsing.rs:1574-1578`), so `#revisão` becomes the tag `revis` and leaves `ão` in the description, while note tags accept Unicode and nested `/` (`extract_tags_strict`, `parsing.rs:513`). The ASCII rule came from mirroring the old TS `\w` parser (`git show 9f457365b`, the removed comment), not from a product need (PRD decision B7).

- Task tags are found by the same scanner as inline note tags. `extract_inline_tags` (`parsing.rs:445-502`) returns only `Vec<String>` and strips frontmatter and code first, while the task parser needs each tag's position to remove it from the description (`:1849`, `:1857`). So move the per-tag char scan inside it (`:453-491`) into a shared function that yields each tag with its byte span, and call it from both `extract_inline_tags` and the task-metadata parser in place of `TASK_TAG_RE`. Do not copy its rule into a second regex: open Issue `audit-2026-11-05/142` changes that rule (digit-first tags with a non-digit, emoji), and one shared scanner makes task tags follow it with no further change. Update the comment at `:1574-1576`.
- Today's note rule, which tasks then follow: the first char is a Unicode letter or `_` (digit-first rejected, `:464-470`), then Unicode letters, ASCII digits, `_`, `-` and `/` (`:477`), trailing `/` stripped (`:489-491`), and `#` only after whitespace or line start (`:453-462`).
- Two side effects to pin in tests: a digit-first tag such as `#2026` stops being a task tag and stays in the description, and a mid-word `#` (a URL fragment `page#section`) no longer yields a tag. Today `TASK_TAG_RE` accepts both. If `audit-2026-11-05/142` lands first, `#2026` stays rejected (all digits) but `#2024-goals` becomes a tag; write the tests against the rule on main when this Issue runs.
- No DTO change, but a parser output change: bump `INDEX_SCHEMA_VERSION` one above its value on main at merge time (re-check after any rebase, even a clean one) (`index_cache.rs:13-18`, "or on parser output changes"; 5 to 6 today, 6 to 7 if Issue 11 bumped it first), or cached entries with a matching mtime keep the old tags. One more full index rebuild per vault; tell the owner. Add a schema-mismatch test as in `src-tauri/tests/commands/vault_test.rs:972-990`. `metadata.tags` and `description` change for non-ASCII tags, and so do the labels Todoist receives (`todoist-bridge.logic.ts:58-60`).
- The e2e mock parser (`e2e/mocks/vault-index.ts:150-182`) follows, through the parity fixture from Issue 11 (add tag cases to it). It returns `tags: []` for every task today (`:177`), so it gains a tag parser.
- In the delivery comment, say that `audit-2026-11-05/142`'s task-metadata checkbox is covered by this Issue, so that Issue only changes the shared scanner.
- Issue 31, the B7 (b) fix for the link case above, is closed as wontfix: B7 was answered (a), and this Issue's tests cover its cases.

**Blocked by:** 074

**Status:** ready-for-agent

**Answered:** PRD B7 (a): task tags follow the note tag rule. Issue 31 is closed as wontfix (owner, 2026-11-06).

**Gate:** both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the e2e mock changes. Run cargo from the checkout or worktree root.

- [ ] Failing Rust test first: `parse_task_metadata("rever #revisão #work/client")` returns tags `revisão` and `work/client` and description `rever`. Fails today.
- [ ] `#2026` and `page#section` in a task line yield no tag and stay in the description. `read [[Book#Chapter 2]]` yields no tag and keeps the description `read [[Book#Chapter 2]]` (today: tag `Chapter`, description `read [[Book 2]]`, which also reaches Todoist).
- [ ] The existing tag tests (`parsing.rs:3223` area) keep passing or change on purpose, with the reason in the commit.
- [ ] A cache written at the previous schema version is rejected and rebuilt.
- [ ] The parity test from Issue 11 covers the tag cases. If Issue 11 has not landed, add a small tag-only parity fixture (`src/tests/fixtures/task-tags-parity.fixture.json`) read by the Rust test and by a vitest test over the e2e mock parser, and Issue 11 merges it into its own fixture.

## Notes

- `audit-2026-11-05/142` is the live copy of `tags-obsidian-parity/01`, which was closed as wontfix and migrated on 2026-11-06; its task-metadata checkbox still reads "Owner decision first".
- **Size:** S to M. Split out of the old Issue 19, which also held the tag quick filter (now Issue 19 alone).
