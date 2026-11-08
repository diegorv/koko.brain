# Scout 03: rust-task-ipc

Recovered from the workflow journal: the agent's Write was refused, so this is its returned text.

I did not write the research file. The subagent instructions say not to write report .md files, so the findings are below for the parent to save if it needs them. Nothing was built, run or changed, and all claims are from code I read.

## Facts
- Commands are registered at `src-tauri/src/lib.rs:346` (`get_all_tasks_v2`), `:348` (`toggle_task_status`), and `get_tasks_in_section_v2` (registration not checked).
- **`get_all_tasks_v2`** (`src-tauri/src/commands/vault.rs:647-655`): no arguments, no filtering. Returns `Vec<FileTaskGroup>` from `VaultIndex::lookup_all_tasks` (`src-tauri/src/vault/index.rs:1063-1077`). This is index-only: it clones every tagged note's `Task`s under a read lock and does no disk I/O. Groups are sorted by `modified_at` desc, with empty files dropped.
- **`get_tasks_in_section_v2`** (`commands/vault.rs:736-753`): arg `sectionTag: String`. It collects candidates from the index (`section_task_candidates`, `:672-683`, every entry with `tasks` non-empty), then on `spawn_blocking` calls `std::fs::read_to_string` on each one (`:749`) and runs `extract_tasks_from_section`. This is a whole-vault disk read of every task-bearing note on each call, with no cache. Read failures are logged and skipped (`:700-710`).
- **Section matching** (`src-tauri/src/vault/parsing.rs:1705-1752`): a `#` is prepended if missing. A heading matches when `heading_text.contains(&tag)` (`:1739`), which is a substring match, so `#work` also matches `#workshop`. A section ends at the next heading of level <= the start level (`:1736`). Headings are not stored in the index (noted at `commands/vault.rs:728-730`).
- **`FileTaskGroup`** (`src-tauri/src/vault/task.rs:154-166`): `filePath`, `fileName`, `modifiedAt` (seconds), `tasks`. No heading or section fields.
- **`Task`** (`task.rs:19-35`): `text` (raw, signifiers included, `parsing.rs:1632`), `checked` (`!= ' '`), `indent`, `lineNumber` (1-based), `status` (kebab enum), `metadata`.
- **`TaskMetadata`** (`task.rs:82-131`): `description` (clean text, `parsing.rs:1859`), optional `dueDate`, `scheduledDate`, `startDate`, `createdDate`, `doneDate`, `cancelledDate`, `priority` (`highest`/`high`/`medium`/`none`/`low`/`lowest`), `recurrence.text` (raw), `id`, `dependsOn`, `onCompletion`, `tags`.
- **Parsing** (`parsing.rs:1619-1640`): only `- `, `* `, `+ ` and `N. ` markers, with statuses `xX -/?!>`. Empty text is rejected. Fenced code is skipped (`:1676-1699`). `NoteEntry.tasks` is filled at construction (`src-tauri/src/vault/entry.rs:249`).
- **`toggle_task_status`** (`commands/vault.rs:760-829`): takes `path` and `lineNumber`. It reads from disk, flips the box at the task marker (`parsing.rs:1873+`), writes atomically, and updates the index. It returns `{updatedContent, updateResult}` and emits `vault-index-updated` only when `changed` (`:817`). No version or content check guards the line number.
- **Frontend callers** (from tests, not the implementation): `tasks.service.test.ts:65,96` expects `get_all_tasks_v2` with no args and `get_tasks_in_section_v2` with `{ sectionTag }`. `event-calendar.service.test.ts:674` also calls `get_all_tasks_v2`, so a shape change affects the calendar too. `src/tests/lib/contracts/ipc.test.ts:92` covers the contract.
- Rules doc `docs/agents/indexing-watcher-rules.md:3,5` says task commands are `*_v2` reads and that `toggle_task_status` triggers the version bump.

## Problems and gaps
- No filter arguments on any Rust task command. Status, date, priority, tag and section filtering cannot be pushed down. Filtering in the TS layer is not verified here.
- Sections are not returned. A `Task` carries no heading, heading path or section level, so the UI cannot group or breadcrumb by heading unless it re-reads files.
- The section path costs a full disk re-read of every task-bearing note on every query, and it is out of sync with the index (it can disagree with `get_all_tasks_v2`).
- Substring heading match means `#work` matches `#workshop`.
- `Task.text` includes emoji signifiers (`parsing.rs:1632`). Todoist's sent identity is keyed by filePath + task text (from the brief). Editing a date changes the text, which can orphan a sent task. `metadata.description` is the stable text, but it is not what is keyed.
- The toggle addresses by line number against disk content, not index content. If the file changed since the index was built, the line may point at a different task. There is no check on the expected text.
- `checked` is true for every non-todo status, including cancelled. This is a semantic trap for filters.
- `recurrence` is stored only as raw text. No parsed interval or next-due date.

## Ideas worth keeping
- Compute a heading path during the existing line walk in `extract_tasks` (`parsing.rs:1676`) and store it on `Task` (e.g. `headingPath: string[]`, `sectionLevel`). Cost is near zero, and it removes the disk re-read.
- Give `Task` a stable key, such as `metadata.id` when present, or a hash of path + description + occurrence index.
- Add one filter-capable Rust query over the index, taking a DTO with status, date range, priority, tags and heading match, and returning grouped results.
- Keep the atomic write and index-update path in `toggle_task_status_inner` (`commands/vault.rs:760-786`). It already returns the new content, which the UI can use.

## Open questions
- Is `get_tasks_in_section_v2` called on every keystroke or only on tag change? Not verified (tasks.service.ts not read).
- Does the calendar depend on the exact `FileTaskGroup` shape? Only the test mock was read.
- How many tasks does a large vault hold, and what does a full `get_all_tasks_v2` clone cost? Not measured.
- Is the line-number race reachable in practice, given the editor flushes before toggling? The TS dirty-buffer test (`src/tests/lib/features/tasks/task-toggle-dirty-buffer.test.ts`) suggests yes, but it was not read.

Summary (under 120 words): Rust serves tasks through `get_all_tasks_v2` (index-only, no args, no filters) and `get_tasks_in_section_v2` (re-reads every task-bearing file from disk per call, substring heading match). Both return `FileTaskGroup`/`Task` with no heading info. `toggle_task_status` writes by line number against disk. Key gaps: no server-side filters, no section data, `Task.text` includes signifiers (Todoist key risk), and the disk-read cost per section query. Idea: parse heading paths in `extract_tasks` and store them on `Task`. Full detail, file:line refs, and open questions are above.
