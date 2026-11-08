# Scout 16: tests inventory for tasks and Todoist

Read-only inventory. No tests or builds were run. Line numbers are from grep/sed on the working tree at the time of the scan. "Count" means `it`/`test`/`#[test]` blocks, counted by grep.

## Facts

### Vitest: task feature (`src/tests/lib/features/tasks/`)

- `tasks.logic.test.ts` (268 lines)
  - `filterCompletedTasks` 22-86: 6 cases, incl. parent kept when children are open (40), family hidden when all done (52), deep nesting (74).
  - `filterCompleted` 88-166: 5 cases on groups.
  - `filterByDate` 168-191: only 3 cases (`all`, `last7days`, `last30days`) on FILE `modifiedAt`. Filter values are `last7days`/`last30days` in the test, not the `7d`/`30d` names the owner mentions.
  - `computeTaskStats` 193-227: 2 cases.
  - `parseTaskTextSegments` 229-267: 6 cases (wikilink alias/heading, markdown link, unsafe protocol kept as text 257, unclosed link 263).
- `tasks.store.test.ts` (58 lines): 7 cases, 4-56. Defaults and setters. Default `sectionTag` is `#to-list` (`tasks.store.svelte.ts:8`), `hideCompleted` true (`:10`). No filter combination or derived-state test.
- `tasks.service.test.ts` (368 lines), mocks only `invoke`, debug, sonner (lines 3-14). Store is real.
  - `buildTaskIndex` 48-103: 6 cases. IPC `get_all_tasks_v2`, ms conversion, section fallback to `get_tasks_in_section_v2` (90).
  - Race handling 105-175: newer call wins (105), stays loading (124), drop after `resetTasks` (144), only latest error reported (157).
  - `updateSectionTagFilter` 176-199: 2 cases.
  - `toggleTask` 201-293: 8 cases incl. no-op (245), active-tab signal bump (258), IPC error toast without editor bump (285).
  - Tab open/close/toggle 295-348: 6 cases.
  - `resetTasks` 350-368: 1 case.
- `task-toggle-dirty-buffer.test.ts` (158 lines): 5 cases, 82-156. Unsaved edits, pre-save failure, task moved or edited while dirty, clean tab. Mocks Tauri `invoke`, plugin-fs, dialog, sonner (11-45). This is the strongest test of the toggle path.
- `tauri-fetch-adapter.test.ts` (89 lines): 5 cases, 18-82 (Todoist HTTP adapter, mapping and error propagation).
- `todoist-client.test.ts` (32 lines): 2 shallow cases, 15-30 (instance created, adapter wired).
- `todoist-bridge.logic.test.ts` (202 lines), pure logic, no mocks.
  - `mapPriorityToTodoist` 11-41: 7 cases. Maps highest→4, high→3, medium→2, low/lowest/none/undefined→1.
  - `buildTodoistArgs` 43-168: 13 cases (description, priority omit, dueDate, dueString from recurrence, recurrence overrides due, labels from tags).
  - `mergeLabel` 170-202: 8 cases (dedupe, trim, blank).
- `todoist.service.test.ts` (762 lines), mocks the SDK wrapper `todoist-client.js` (14-22) and plugin-fs (23-29). Store is real.
  - `fetchProjects` 53-79 (2), `fetchSections` 81-107 (2), `createTodoistTask` 109-143 (2), `fetchTaskById` 145-172 (3, incl. 404→null, non-404 rethrow).
  - `loadSentTasks` 174-207 (3), `saveSentTasks` 209-245 (2).
  - `loadProjects` 247-332 (6, incl. no-token reject, cache reuse, `forceRefresh`), `loadSections` 334-394 (4).
  - `sendTaskToTodoist` 396-626: 11 cases. Creates, marks sent, persists (409). SDK camelCase args (435). Omits optional fields (455). Priority 1 explicit (472). Raw text fallback (488). Metadata description (514). Default label applied (539), appended to tag labels (556), no duplicate (579), blank label omitted (602). Clears sending flag on error (617).
  - `initTodoist` 628-649 (1). `syncTodoistTasks` 651-761 (7): no token reject (664), no-op with no sent tasks (675), completion status update and persist (683), 404 marks as not completed (702), non-404 skip but continue (715), syncing flag (735), flag cleared on persist failure (751).
- `todoist.store.test.ts` (207 lines): 20 cases, 10-205. Setters, `isSent`, `isCompletedInTodoist`, `getTodoistUrl`, `updateSentTask`, `reset`. Keys are `filePath:text` (`todoist.store.svelte.ts:24-28`, `:49-50`, `:99`), so identity is file path plus exact task text.

### Vitest: UI and adjacent

- `src/tests/lib/core/settings/TodoistSection.test.ts` (68 lines): 4 cases, 42-63. Render with shadcn Input, token and label typing, clearing. No test of save, validation, sync from settings, or token-missing state.
- `src/tests/lib/features/event-calendar/event-calendar-tasks.logic.test.ts` (115 lines): `tasksFromGroups` 5 cases (27-75), `tasksByDay` 3 (77-99), `monthCellSlots` 3 (101-115). Calendar consumes task groups, so this is a second consumer of the task data shape.
- No unit or component test exists for `TasksView.svelte` (277 lines) or `TodoistPopover.svelte`. Grep for those names under `src/tests` and `e2e` finds only `pane-toolbar.test.ts:20`, which lists the file path, and an `app-lifecycle.service.test.ts` mock of `buildTaskIndex`/`resetTasks` (189-191) and `todoistStore` (277).
- `src/tests/lib/features/tasks/` has no component test folder at all.

### Rust (`src-tauri/`)

- `src-tauri/tests/vault_task_test.rs` (254 lines), 9 `#[test]`.
  - Lines 1-6 claim integration tests. Actual content: 2 `#[ignore]` TOCTOU tests (`audit_finding_9_*`, lines 30 and 90), and 7 serde and wire-shape tests (120-226).
  - The ignored tests are timing-based and are not run by CI (no `--ignored` in `.github/workflows/*.yml` or `scripts/*.sh`; grep).
  - Tests cite a personal plan path (`~/.claude/plans/...`, line 10) in a repo file.
- `src-tauri/src/vault/parsing.rs` inline `#[cfg(test)]` module from line 1909. Most task logic tests are here:
  - `map_checkbox_char` 2901-2919 (2).
  - `extract_tasks` 2921-3031 (about 11): empty, prose, markers, ordered, all status chars, indent tabs and spaces, empty text rejection, fenced code skip (backtick, tilde), mismatched fences, 1-based line numbers.
  - `extract_tasks_from_section` 3043-3085 (5).
  - `parse_task_metadata` 3087-3247 (about 22): every date emoji, priority first match, recurrence stop rules, `id`, `dependsOn` CSV, `onCompletion`, hashtag tags, signifier stripping.
  - `toggle_task_in_content` 3252-3340 (about 12): every checkbox state to unchecked/checked, out-of-bounds, first match only, ordered task, preserves other lines.
- `src-tauri/src/vault/task.rs` inline tests 198-260 (3 serde tests, 229-255).
- `src-tauri/tests/vault_index_test.rs`: `lookup_all_tasks` 1127-1137 (filters empty files, sorts by mtime desc). Stats `shape_counts_notes_tasks...` 1949-1972. `a_view_is_no_source_of_tags_tasks_backlinks_or_relationships` 2137-2154 (view does not add tasks).
- `src-tauri/tests/vault_file_ops_test.rs`: `toggle_task_status_inner` 154-250 (6 cases: happy, no checkbox, out of bounds, file not found, index update, double toggle round trip).
- `src-tauri/tests/commands/vault_test.rs`: wire shapes 657-720 (`TaskV2` camelCase lineNumber, `FileTaskGroup`, `ToggleTaskResult`). `tasks_in_section_*` 1058-1103 (4 cases, incl. unreadable notes skipped).
- `src-tauri/tests/ipc_contracts_test.rs:67-`: `TaskMetadata` generated TS has `dueDate` without null.
- Generated bindings: `src/lib/contracts/generated/` is checked for staleness in CI (`.github/workflows/ci.yml:116-123`).
- Rust `TaskMetadata` fields `dependsOn`, `id`, `onCompletion`, `tags`, `recurrence`, `priority` are asserted in the parse tests above. The UI consumes only a subset (owner brief and `todoist-bridge` use priority, recurrence, due, tags).

### E2E (Playwright)

- `e2e/specs/tasks-view.spec.ts` (135 lines), 8 tests:
  - Shortcut opens tab, no `.cm-content` (5-11).
  - Surfaces tasks after clearing the section tag (13-27). Uses `getByRole('textbox', {name: /section tag/i})` (line 18 and others).
  - Multiple tasks visible (29-38), the same assertion as the previous one.
  - Toggle persists to virtual FS: asserts `- [x] Ship feature A` in `/test-vault/Projects/2026-Q2.md` (40-62). Uses `window.__e2e.fs`.
  - Scroll region with `[data-slot="scroll-area-viewport"]` (64-85), a layout regression guard.
  - Wikilink and markdown links render as links, following a wikilink does not toggle (87-110).
  - Right sidebar hidden while Tasks tab active (112-126).
  - Shortcut toggles tab closed (128-134).
- `e2e/specs/event-calendar-tasks.spec.ts` (61 lines): dated task renders on its day in week, month, day view (35); click opens the note at the task line (53).
- Mock layer for tasks:
  - `e2e/mocks/vault-index.ts`
    - `TASK_LINE_RE` 45: `/^(\s*)[-*]\s+\[(.)\]\s+(.*)$/`. Only `-` and `*` markers, no ordered lists, no `+`.
    - `STATUS_BY_CHAR` 48-57: maps 8 status chars.
    - `DUE_DATE_RE` 142: only the 📅 date.
    - `parseTasks` 150-182: fills `text`, `checked`, `indent`, `lineNumber`, `status`, `metadata.description`, `metadata.dueDate`, and `metadata.tags: []` (line 180). It does not parse priority, recurrence, id, dependsOn, onCompletion, or hashtag tags. Fenced code is skipped (157-160).
    - `getAllTasks` 464-476, `getTasksInSection` 478-484 (filters groups by section tag), `toggleTaskStatus` 486-515 (flips `' '`↔`x` only, line 509).
  - `e2e/mocks/tauri-core.ts`: handlers 148-157 for `get_all_tasks_v2`, `get_tasks_in_section_v2`, `toggle_task_status`, registered 449-451. No handler for any Todoist-related command.
  - `e2e/mocks/tauri-http.ts`: no task or Todoist reference (grep). Todoist HTTP traffic is not mocked in e2e, from grep only.
  - `e2e/fixtures/test-vault.ts` 97-106: the Projects/2026-Q2.md fixture (`## Tasks` with 3 checkbox lines and `#plan` tag). The spec comments (tasks-view.spec.ts:13-18, 29-31) describe fixture contents that match this file. Tasks have no priority, dates, or section tag other than the heading.
  - `e2e/mocks/vault-index.ts:15` comment says the TS-side `extractTasks` was deleted in Phase 7.6. This mock is a stand-in for Rust `extract_tasks`.
- `src/tests/fixtures/vault-entries.fixture.ts:31` has `tasks: []`. No shared task fixture exists for vitest.

### CI

- `.github/workflows/ci.yml:74` runs `pnpm vitest run`. `:116` runs `cargo test --manifest-path src-tauri/Cargo.toml`. A macOS fonts job (128-175) runs named test filters with expected counts, but none of them is task-specific (grep for `task` in that range returned nothing).
- `.github/workflows/e2e.yml:52` runs `scripts/e2e.sh --shard=N/4`. The tasks-view spec runs in whichever shard it lands on. No per-feature selector.

## Problems and gaps

1. No component or UI-level test for the Tasks view. `TasksView.svelte` (277 lines) and `TodoistPopover.svelte` have zero vitest coverage. The only UI check is the 8 e2e tests, which assert presence and toggle, not grouping, filter results, or count text.
2. Filter combinations are untested. `filterByDate` has 3 cases (`tasks.logic.test.ts:168-191`). `tasks.store` has no derived filter result, and `filterCompleted` is tested in isolation, not with date + section tag + hide-completed together.
3. Rules engine does not exist yet. Section tag is a single string (`tasks.store.svelte.ts:8`). The mock `getTasksInSection` (vault-index.ts:478-484) is the only "rule" implementation under test. A new rules model would need its own logic tests and a new mock path.
4. The e2e mock parser drops metadata. `metadata.tags` is always `[]` (vault-index.ts:180). Priority, recurrence, id, and dependsOn are never produced in e2e. Any new UI that displays or filters on them will look fine in unit tests (which use hand-built fixtures) and be empty in e2e.
5. Todoist identity is `filePath:text` (todoist.store.svelte.ts:24-28). Tests cover it (todoist.store.test.ts:145-156 "isSent returns false for different text in same file"). No test covers file rename, text edit after send, or duplicate identical lines in one file.
6. Todoist sync has no e2e coverage. Network goes through `tauri-fetch-adapter.ts` and the SDK. `e2e/mocks/tauri-http.ts` does not mention Todoist (grep). `todoist.service.test.ts` mocks the SDK client entirely (14-22), so the wire format (`dueString`, `labels`, `priority` mapping) is validated only by the mocked args assertions (435-616).
7. Rust ignored tests (`vault_task_test.rs:30`, `:90`) are never executed in CI. Their names say "audit_finding_9" and the header claims integration coverage it does not provide. Only `toggle_task_status_inner` happy/no-op/OOB paths (`vault_file_ops_test.rs:154-250`) run.
8. Rust rules-related gap: no test that `extract_tasks_from_section` and `tasks_in_section` agree on heading scope beyond the 4 cases in `commands/vault_test.rs:1058-1103` and the 5 in `parsing.rs:3043-3085`. Those are adequate for the current one-tag model; a multi-rule model would need new coverage.
9. Test-rule compliance: `task-toggle-dirty-buffer.test.ts`, `tasks.service.test.ts`, and `todoist.service.test.ts` mock only boundaries (Tauri invoke, fs, dialog, sonner, SDK). Stores are real. This matches CLAUDE.md.
10. `todoist-client.test.ts` (2 tests) and `TodoistSection.test.ts` (4 tests) are shallow. No test for settings save or token validation path against a real store.
11. Date filter semantics are tested on FILE `modifiedAt` only (`tasks.logic.test.ts:168-191`). No test for a task's own due date, which the Rust metadata carries (`parsing.rs:3087-3106` covers parsing only).

## Ideas worth keeping

- `task-toggle-dirty-buffer.test.ts` pattern (real stores, Tauri boundary mocked, disk state map) is the right model for any new rule-driven toggle or edit.
- `filterByDate` takes `now` as a parameter (`tasks.logic.test.ts:169`), so it is deterministic. Keep that signature for any new date rule.
- Pure logic lives in `tasks.logic.ts` and `todoist-bridge.logic.ts`, both fully unit-tested with no mocks. A rules engine can follow the same split (pure `.logic.ts`, store, thin service).
- `vault_file_ops_test.rs` and `commands/vault_test.rs` show the pattern for testing IPC functions through `*_inner` helpers with a real `VaultIndex`. A new rule-based command should follow it.
- `e2e/mocks/vault-index.ts` is the single place that must learn new task fields. Keep its `parseTasks` comment (Rust is source of truth) and add a parity check or a golden fixture shared with Rust tests (`ipc_contracts_test.rs` already does shape checks).
- Wire-shape tests (`commands/vault_test.rs:661-720`, `ipc_contracts_test.rs:67`) guard generated bindings. Any new `TaskMetadata` field needs the same kind of test.

## Open questions

1. Are the two `audit_finding_9_*` tests meant to run on demand, under `--ignored`, or are they dead? No CI or script runs them (from grep). Needs owner decision.
2. Should the e2e mock parser grow to produce priority, recurrence, tags, id, and dependsOn, or should e2e tasks stay minimal and rely on Rust integration tests? The rules UI will need realistic data either way.
3. Is there a planned shared task fixture (vitest and e2e) to replace the hand-built `TaskV2` literals in `tasks.logic.test.ts` and `event-calendar-tasks.logic.test.ts`?
4. Does the owner want Todoist sync covered end-to-end? That needs an HTTP mock in `e2e/mocks/tauri-http.ts`, which does not exist today (from grep).
5. Not verified: whether `TodoistPopover.svelte` and `TasksView.svelte` are exercised by any test indirectly (for example through `pane-toolbar.test.ts` rendering). I read only the file-path list at `pane-toolbar.test.ts:20`, not its assertions.
6. Not verified: current pass or fail status of any of these tests. I did not run them, per the hard rules.
