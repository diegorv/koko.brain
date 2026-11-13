# 074 discovery: Rust records task headings

## Files that change

- `src-tauri/src/vault/task.rs:19-35`: new `TaskHeading { level: u8, text: String, line: u32 }` (`#[ts(export)]`); `Task.heading: Option<u32>` with `#[serde(skip_serializing_if = "Option::is_none", default)]` + `#[ts(optional)]`, as `TaskMetadata` does.
- `src-tauri/src/vault/entry.rs:183-187, 249`: `NoteEntry.task_headings: Vec<TaskHeading>` with `#[serde(default, skip_serializing_if = "Vec::is_empty")]` (ts-rs then emits `taskHeadings?:`; `#[ts(optional)]` itself only compiles on `Option`). `from_content_full` calls the new combined extractor.
- `src-tauri/src/vault/parsing.rs:1692-1713`: `extract_tasks_and_headings(content) -> (Vec<Task>, Vec<TaskHeading>)`, one pass: same fence logic, `HEADING_RE` only on lines after the frontmatter (line count of `frontmatter_range`, not `strip_frontmatter`), text trimmed, each task's `heading` = last heading index so far; headings cleared when there are no tasks. `extract_tasks` becomes its `.0`. `parse_task_line` literals get `heading: None`.
- `src-tauri/src/vault/index_cache.rs:18`: `INDEX_SCHEMA_VERSION` 5 -> 6 (main is at 5 today).
- `src-tauri/tests/commands/vault_test.rs:972-990`: the two `5` asserts become `6`; a new test writes a schema-5 snapshot and expects a full scan.
- `src/lib/contracts/generated/` (regenerated), `src/lib/contracts/index.ts` (barrel line for `TaskHeading`), `src/lib/types/vault-v2.types.ts` (re-export `TaskHeading as TaskHeadingV2`; a re-export is allowed by `ipc-mirrors.test.ts`).
- `e2e/mocks/vault-index.ts:150-182, 280-315`: `parseTasks` also records headings with the same rules; `buildEntry` sets `taskHeadings` only when non-empty and `heading` only when set, matching the Rust wire (fields omitted when empty/None).

## Tests

- `src-tauri/tests/vault_task_test.rs`: the Issue's note (frontmatter `# comment`, A/B/fence/C) through `NoteEntry::from_content`; no-tasks note has empty `task_headings`; task before first heading has `heading: None`. Written first, failing.
- `src/tests/fixtures/task-headings-parity.fixture.json` + `src-tauri/tests/vault_task_headings_parity_test.rs` (prior art `vault_natural_sort_parity_test.rs`, `include_str!`) + `src/tests/e2e/task-headings-parity.test.ts` (drives `vaultIndex.update` + `getEntry`, as `vault-index-tasks.test.ts` does). Both compare the serialized `taskHeadings` and each task's `{ text, lineNumber, heading }`.

## Defaults taken

- Optional on the wire (Issue Notes, deep dive): no TS literal changes needed.
- Frontmatter lines are skipped only for heading detection. Fence tracking and task parsing inside frontmatter keep today's behavior, so `tasks` output is unchanged.
- `get_tasks_in_section_v2` (`extract_tasks_from_sections`) is not changed: its tasks keep `heading: None` on the tagged path, but with no usable section tag it falls back to `extract_tasks`, whose tasks carry `heading: Some(n)` while the command sends no `task_headings` (the command is removed by Issue 121; nobody reads `heading` from it). The e2e mock's section command filters entry tasks, so its tasks carry `heading`; harmless.
- `FileTaskGroup` / `get_all_tasks_v2` carry `heading` because `lookup_all_tasks` clones `entry.tasks`; no struct change.

## Risks

- Schema bump forces one full rebuild per vault on first launch (accepted, PRD B6). Re-check the value on main after any rebase.
- Rust tests that build `Task`/`NoteEntry` literals without `..Default::default()` need the new field; compile will list them.
