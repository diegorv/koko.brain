# 075 discovery: task tags follow the note tag rule

"Issue 11" in the Issue text is this feature's 074 (landed): its parity test is
`src-tauri/tests/vault_task_headings_parity_test.rs` + `src/tests/e2e/task-headings-parity.test.ts`
over `src/tests/fixtures/task-headings-parity.fixture.json`. Tag cases go into that fixture; no separate tag fixture.

## Files that change

- `src-tauri/src/vault/parsing.rs:447-502`: the char scan (`:453-491`) moves into `scan_inline_tags(text) -> Vec<InlineTag>` (byte span + name); `extract_inline_tags` keeps its strip passes and dedupe and calls it.
- `parsing.rs:1578-1583`: `TASK_TAG_RE` removed with its comment; `parsing.rs:1926-1936` (`parse_task_metadata` tags step) scans `text` once with `scan_inline_tags`, takes the names, cuts the spans out, then collapses spaces as today. Section comment `:1419-1421` updated.
- `src-tauri/src/vault/index_cache.rs:18`: `INDEX_SCHEMA_VERSION` 6 -> 7.
- `src-tauri/tests/commands/vault_test.rs:983,994`: asserts 6 -> 7; new test writes a schema-6 snapshot holding the old ASCII tags and expects a full scan with the new tags (copy of `cached_inner_records_task_headings_a_schema_5_snapshot_lacked`, `:1028`).
- `e2e/mocks/vault-index.ts:197-209`: `parseTasks` gains tags through `findInlineTags` (`src/lib/utils/tag-extraction.ts:119`, the TS mirror of the same rule) on the due-stripped text; description = spans cut, `\s{2,}` -> `' '`, trimmed (Rust's `MULTI_SPACE_RE`), now for every task, not only dated ones.
- Parity: both sides' projections add each task's `description` and `tags` (`metadata`); existing cases gain those fields; new tag cases (Unicode + nested, digit-first, URL fragment, wikilink heading, trailing `/`).

## Tests (first, failing)

- `parsing.rs` tests (`:3333` area): `rever #revisão #work/client` -> tags `revisão`, `work/client`, description `rever`; `#2026`, `page#section`, `read [[Book#Chapter 2]]` -> no tag, description unchanged. Existing `extracts_tags_with_hyphens`, `tags_excluded_from_description`, `recurrence_stops_at_hash_tag` keep passing unchanged.

## Defaults taken

- Span = `#` through the last tag char with trailing `/` excluded, as TS `findInlineTags` (`to`). So `#work/` gives tag `work` and leaves `/` in the description. Matches the editor's TS rule and keeps the mock parity exact.
- No dedupe of task tags (today's behavior; `TASK_TAG_RE` kept duplicates).
- Task text is not stripped of inline code / comments before the scan (unchanged scope: only the per-tag scan is shared).
- `RECURRENCE_RE`'s stop list keeps `#[A-Za-z0-9_]` (not in the Issue). So `🔁 every week #2026` still ends the rule at `#2026`, which now stays in the description; `🔁 every week #ação` keeps `#ação` inside the rule text, so it yields no tag. Follow-up candidate, not changed here.

## Risks

- One full index rebuild per vault on first launch (owner to be told at delivery). Re-check `INDEX_SCHEMA_VERSION` on main after any rebase.
- Todoist labels change for non-ASCII / digit-first tags (`todoist-bridge.logic.ts:58-60`), by design.
- Not in the Issue, left unchanged: `src/lib/features/todoist-sync/task-line.logic.ts:42-45,220-233` mirrors the removed `TASK_TAG_RE` (ASCII `TAG_NAME`, no left boundary in `tagMatches`), and `pull.logic.ts:327` filters labels with `isTaskTagName`. After this change a Todoist label `2026` is written as `#2026`, which Rust no longer reads as a tag; a label `revisão` is dropped on pull although Rust now reads `#revisão`; `removeTag('section')` also cuts `page#section`. Its comments now name a constant that is gone. Follow-up Issue for the main session (Todoist design rule 8), as is the test fake `src/tests/fixtures/todoist-vault.fake.ts:93,101`.
- Delivery comment: `audit-2026-11-05/142`'s task-metadata checkbox is covered here; that Issue only changes the shared scanner.
