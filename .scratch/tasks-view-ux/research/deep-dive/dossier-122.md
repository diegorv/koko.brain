# Dossier: Issue 122, Set due and priority from the Tasks row menu, with undo

Written at HEAD `d2304ac9e`. READ-ONLY research; nothing in the codebase was run. Citations are `path:line` at HEAD. "Fact" means read in code; "Inference" means derived. Emoji signifiers are named by code point (due U+1F4C5, scheduled U+23F3, start U+1F6EB, priority highest U+1F53A, high U+23EB, medium U+1F53C, low U+1F53D, lowest U+23EC, id U+1F194, recurrence U+1F501) to keep this file emoji-free.

Predecessors assumed landed exactly as written: 108, 242, 110, 234, 236, 109, 111, 238, 239, 113, 112, 240, 241 (122 is "Blocked by: 241, 085"). Issue 115 (entries snapshot and overlay) is NOT a blocker of 122 and may land before or after it; both orders are covered. 243, 116, 121, 123, 124, 129, 198, 205 are not touched except where named.

## 0. Verdict first

Fact: the ticket is `needs-triage` and says so ("Waits on: the locator gap"). The gap is real and larger than the ticket states. Do not start before the owner decides the locator. The most likely decision (synthesis Q8 (a)+(c), `.scratch/tasks-view-ux/research/synthesis.md:354`, T14 at `:299-307`) is: a new guarded Rust command addressing a line by line number, expected text and expected status (as `toggle_task_status` does), plus one shared pure token-patch module. This dossier plans that reading and marks every point where another reading changes the work.

Two things the ticket gets wrong or leaves out (details in section 5):
1. "As built it needs no new Rust command" is contradicted even for lines that DO carry an anchor: `write_task_lines` needs the whole expected line, and the row cannot rebuild it (`TaskItem` has no marker, whitespace or status-char case).
2. 115's overlay stores only text and status per row; a due or priority edit changes `metadata`, which TS cannot recompute. So after 115 the chip would lag up to 10 s unless the write returns the re-parsed task.

## 1. Code map

### 1.1 Rust

| What | Where (HEAD) | Notes |
|---|---|---|
| `write_task_lines` command | `src-tauri/src/commands/vault.rs:956-982` (inner `:898-948`) | Root check `idx.vault_root()` at `:903`, `confined_note_path` at `:872-891`, `write_atomic`, `update_note_in_index_inner`, emit after lock dropped. Registered `src-tauri/src/lib.rs:355`. |
| Edit locator | `src-tauri/src/vault/task_lines.rs:11-29` (`TaskLineReplace`), `:304-316` (`locate`), `:320-329` (`locate_unanchored`), `:259-296` (`validate`) | `locate` matches by anchor AND `line != expected` => `LineDiffers` (whole-line equality). `line_number` mode is ONLY for stamping a first anchor: `validate` errors when the new line does not carry the anchor (`:276-280`). There is no unanchored, anchor-free edit anywhere. |
| `toggle_task_status` | `src-tauri/src/commands/vault.rs:770-829` (inner), `:831-868` (command) | Guard model to copy: `parse_task_line(line, n)` then `task.text == expected_text && task.status == expected_status` (`:779-785`); no-op returns `stale` flag; takes an absolute `path` with NO open-vault check (that is Issue 103, still open). |
| Line parser | `src-tauri/src/vault/parsing.rs:1635-1678` `parse_task_line` (`pub(crate)`), `TASK_RE` `:1426` group 3 = text, ordered `:1433` | `Task.text` = text after `] ` (`task.rs:23`). Text keeps a trailing `\r` on CRLF files (`.` matches `\r` in the Rust regex). |
| Metadata parse | `parsing.rs:1776` `parse_task_metadata` (pub), `DATE_EMOJIS` `:1449`, `build_date_regex` `:1495`, `PRIORITY_EMOJIS` `:1475` (list order decides winner and only ONE occurrence is removed per parse), `RECURRENCE_RE` `:1532` swallows a following block id | A fixture parity test can call `kokobrain_lib::vault::parsing::parse_task_metadata`. |
| DTOs | `src-tauri/src/vault/task.rs:181-200` `ToggleTaskResult { updated_content, update_result, stale }`; `TaskLinesWriteResult` `task_lines.rs:147-160` | Reusing `ToggleTaskResult` for a new command needs no new `#[ts(export)]` type and no regenerated bindings. |
| Rust tests to extend | `src-tauri/tests/vault_task_test.rs` (toggle cases, `toggle_task_status_inner` import line 8), `src-tauri/tests/vault_task_lines_test.rs:504-513` (`vault(files)` helper: tempdir + `build_with_root`) | New command tests copy the `vault()` helper. |
| Parity-fixture pattern | `src-tauri/tests/vault_natural_sort_parity_test.rs:11` `include_str!("../../src/tests/fixtures/natural-sort-parity.fixture.json")` | `src/tests/fixtures/` exists and holds the sibling JSON fixtures. |

Predecessors' Rust changes: 242 changes `get_tasks_in_section_v2` args only; none of 108-241 touches `toggle_task_status`, `write_task_lines`, `task_lines.rs` or `parsing.rs` (inference from the ticket texts; 115 and 121 stop calling or later delete `get_tasks_in_section_v2`, which 122 does not use).

### 1.2 IPC contract and e2e mock

| What | Where |
|---|---|
| `CommandMap` entries | `src/lib/contracts/commands.ts:108-117` (`toggle_task_status`, `write_task_lines`) |
| Arg-name list | `src/lib/contracts/commands.ts:270-271` (`COMMAND_ARGS`); parity check `src/tests/lib/contracts/ipc-parity.test.ts` (reads `generate_handler!`, `MIN_COMMANDS = 57` is a floor, a new command does not need it raised) |
| `write_task_lines` e2e mock | `e2e/mocks/tauri-core.ts:179-181` `handleWriteTaskLines(): never` throws; table entry `:485` |
| `toggle_task_status` e2e mock | `e2e/mocks/tauri-core.ts:166-177`; `e2e/mocks/vault-index.ts:502-529` `toggleTaskStatus` |
| Mock task parser | `e2e/mocks/vault-index.ts:45` `TASK_LINE_RE = /^(\s*)[-*]\s+\[(.)\]\s+(.*)$/` (no `+`, no ordered), `:153` `DUE_DATE_RE`, `:160-190` `parseTasks` fills only `dueDate`, `tags: []` (so priority and tag chips cannot be asserted in e2e; 109 says the same) |

### 1.3 Frontend at HEAD, and what each predecessor changes

HEAD facts: `src/lib/features/tasks/` holds `TasksView.svelte` (223 lines), `tasks.service.ts` (231), `tasks.store.svelte.ts` (34), `tasks.logic.ts` (161), `task-status.logic.ts` (9), `tasks.types.ts`, `task-metadata.types.ts`. There is NO row menu, NO `setTaskStatus`, NO `updateTask` at HEAD.

| File / symbol | HEAD | Predecessor changes 122 builds on |
|---|---|---|
| `toggleTask` | `tasks.service.ts:130-167`: dirty-buffer protocol at `:133-146` (`isTabDirty`, `saveFileByPath`, `lineAt`), `call('toggle_task_status')` `:147-153`, stale `:154-158`, no-op `:159-161`, `afterTaskWrite` `:162` | 241: becomes `setTaskStatus(filePath, task, target)` (same protocol), `toggleTask` delegates; messages become caller-neutral; Undo toast for menu writes, "last menu write only", dismissed by any newer write and by `resetTasks()`, Undo refused when the vault generation is stale (generation introduced in 234). |
| `afterTaskWrite` | `tasks.service.ts:176-179` -> `settleTaskWrite` (`core/filesystem/task-write.service.ts:24-37`) then `buildTaskIndex()` | 115 (if landed): records an overlay keyed `filePath:lineNumber` (new text, status, `updateResult.version`), `requestPromptIndexRefresh()` called by the writer just before the command. |
| `buildTaskIndex` | `tasks.service.ts:65-86` | 242 (`parseSectionTags`), 234 (path sort, error field, reset generation), 111 (also fills `tasksStore.rows` via `buildTaskRows(groups, vaultPath)`), 115 (reads entries snapshot instead). |
| `tasksStore` | `tasks.store.svelte.ts:1-34` | 108 `hasLoaded`; 234 error + scroll offset; 111 `rows`, `quick`, `visibleRows`; 113 current row; 112 `group`, `sort`, `groups`; 240 collapsed keys. 122 adds NO store field (Undo state lives in the service, see 3.4). |
| Row markup | `TasksView.svelte:169-215` | 110 `data-task-toggle`, `data-task-status`, `data-task-text`; 109 chips from `taskChips(metadata, today)` (due chip `Nov 6` style, priority word chip, tags), clean text; 113 roving tabindex; 241 the always-visible `Task actions` button (`MoreHorizontal`), one `ContextMenu` around the list reading the row under the pointer, Shift+F10 via `resolveTaskKey` `{ kind: 'menu' }`. |
| Menu components | none at HEAD | 241 adds a DropdownMenu (button) and ContextMenu (right click) with Open at line, Copy task text, Status radio group. 122 adds Due and Priority to BOTH (the same items twice, as 241 does). Primitives exist: `src/lib/components/ui/dropdown-menu/` and `context-menu/` each have `sub`, `sub-trigger`, `sub-content`, `radio-group`, `radio-item`. |
| Chip row | none | 109: `taskChips` returns `{kind:'due'|'priority'|...}`; the TasksView test asserts a priority chip text such as `high`. |
| `TaskItem` | `tasks.types.ts:4-17` (text, checked, indent, lineNumber, status, metadata) | 111: `TaskRow = TaskItem + filePath, relPath, folder, noteTitle, open, modifiedAt, parentLine?`. The menu hands a `TaskRow` to `updateTask(row.filePath, row, ...)`. |
| Copy/strip helpers | none | 109: `taskDisplayText` strips trailing block id then Todoist anchor via a local regex in `tasks.logic.ts`. Reusable for the toast message only; NOT for edits (edits operate on raw `task.text`). |

### 1.4 New files this ticket creates (proposed paths)

- `src/lib/features/tasks/task-line-edit.logic.ts` (ticket-named) OR the shared module of Q8 (c), see ambiguity A2.
- `src/tests/lib/features/tasks/task-line-edit.logic.test.ts`
- `src/tests/fixtures/task-line-edits.fixture.json` (ticket-named)
- `src-tauri/tests/vault_task_line_edits_parity_test.rs` (my name; ticket names no file)
- A menu component for the shared Due/Priority items if 241 did not already isolate the menu body (for example `TaskRowMenuItems.svelte`, name only illustrative). Read 241's delivered markup first; do not duplicate the two menus' item lists by hand if 241 factored them.
- New Rust command in `commands/vault.rs` (name is my proposal, not decided: `write_task_text`).

## 2. Acceptance criteria, test shape, red-first analysis

The ticket has four unchecked boxes plus one checked. Because the locator command is not in the ticket's boxes, I add criteria 2b and 2c (needed under the Q8 (a) reading).

### AC1. Shared fixture drives `task-line-edit.logic.test.ts` and a Rust parity test

- Fixture shape: `{ "cases": [ { "name", "text", "op": { "kind": "due", "date": "2026-11-06" | null } | { "kind": "priority", "priority": "highest|high|medium|none|low|lowest" }, "expected" } ] }` (object with `cases` like `natural-sort-parity.fixture.json`; the Rust side reads `fixture["cases"]`, see `vault_natural_sort_parity_test.rs:19-32`).
- Cases to include (each is a way the edit has gone wrong in a sibling implementation): no due yet; replace an existing due; due written with no space after the emoji; clear due (and clear when none present: expected equals text); due with a variation selector U+FE0F; priority set on a text with none; replace one priority with another; two priority emojis present (Rust removes only one per parse, so the edit must remove all); priority `none` removes all; text ending in a block id (`^abc123`) stays last; text ending in a Todoist anchor and block id (`... id-emoji td-x ^abc`): token goes before the anchor; text with recurrence (insert must not be swallowed into the recurrence text, but must stop it correctly); text with a wikilink containing `#`; scheduled/start/created dates and tags untouched; trailing whitespace; text that is only a tag.
- TS test: `expect(apply(op, text)).toBe(expected)` per case, via a pure `applyEdit` switch or direct calls.
- Rust test: for each case, `parse_task_metadata(expected)` and assert `due_date`/`priority` equal the op's intent (`None` for `none`/`null`), AND assert the untouched fields (scheduled, start, created, recurrence, id, depends_on, on_completion, tags, description) equal `parse_task_metadata(text)`'s. The second assert is what makes "the other signifiers and tags stay" a real check; the ticket only says due and priority.
- Red before the change: the TS test fails (module missing, import error). The Rust test cannot fail for the right reason before the TS exists, because it never calls TS: it validates hand-written `expected` strings against the parser. It is a parity pin, not a behavior test. To see it red, write it first against a deliberately wrong `expected` (for example an expected string that puts the due after a block id, which the recurrence/description assertions catch) and then fix the fixture. State this honestly in the review.
- Existing tests changed: none (new files). If Q8 (c) is chosen, the existing `src/tests/lib/features/todoist-sync/task-line.logic.test.ts` (78 `it`) must stay green unchanged and is the safety net for the move.

### AC2. Rust staleness, open-vault refusal, line-break refusal (already `[x]`)

Fact: covered for `write_task_lines` by `src-tauri/tests/vault_task_lines_test.rs`. Under the new-command reading it does NOT cover the new command, so criteria 2b and 2c apply.

### AC2b (added). New guarded command, Rust tests in `vault_task_test.rs` or a new `vault_task_text_test.rs`

Through the `_inner` function with a tempdir vault (copy `vault()` at `vault_task_lines_test.rs:504-513` so `idx.vault_root()` is set):
- writes `newText` on an unanchored `- [ ] call Ana` line at line N; file bytes and index entry (due date visible via `idx` task list) updated; `stale` false.
- keeps the line prefix byte for byte: tab indentation, `*` and `+` markers, ordered `3. [ ]`, status char `X` vs `x` (status is guard-compared as `done` for both and NOT rewritten).
- `expected_text` differs: bytes unchanged, `stale` true. `expected_status` differs: same. Line past end or 0: same. Non-task line: same.
- `new_text` containing `\n` or `\r`: `Err`. Blank `new_text`: `Err` (a blank text would turn the line into a non-task, `parse_task_line` returns `None`).
- vault root other than the open vault: `Err`, bytes unchanged. Relative path with `..` or absolute: `Err` (from `confined_note_path`).
- `new_text == expected_text`: no write, `changed` false, `stale` false.
- Red before: compile error (unresolved import), which is a legitimate red for a missing command.

### AC2c (added). IPC wiring

`pnpm check` plus `ipc-parity.test.ts` fail until `commands.ts` has the CommandMap entry and the `COMMAND_ARGS` list matches the Rust params (camelCase). Fact: the parity test parses `generate_handler![...]`, so registering in `lib.rs` is what makes it check the new entry (`lib.rs:354-355` is where the toggle and writer are registered).

### AC3. `tasks.service.test.ts` with real stores

- "Set due tomorrow on 2026-11-05 sends newText ending in the due token for 2026-11-06": fake only `Date` (`vi.useFakeTimers({ toFake: ['Date'] })`, `vi.setSystemTime(new Date('2026-11-05T12:00:00'))`, the pattern 109 uses). The "tomorrow" arithmetic must live in a pure, clock-free function (`resolveDuePreset(preset, today)`), otherwise the service test depends on the clock reader. Assert `invoke('<new command>', { vaultRoot, relPath, lineNumber, expectedText, expectedStatus, newText })` and that, after the mocked refetch returns the task with `metadata.dueDate: '2026-11-06'`, `tasksStore.rows[0].metadata.dueDate` is that date (the row comes from the refetch before 115; from the overlay after 115 only if the write returns the parsed task, see A5).
- Undo: the toast action's `onClick` (capture via the mocked `toast` call args) sends the OLD text as `newText` with the NEW text as `expectedText` and the unchanged status. The file's `svelte-sonner` mock at `tasks.service.test.ts:17-19` is `{ error, info }`; 241 will have extended it for the Undo toast (`message` with `action`, `dismiss`); extend, do not replace.
- Red before: `updateTask` does not exist.
- Also add: stale result refetches and writes nothing more, shows the caller-neutral message; no-op edit (`newText === task.text`) sends nothing and shows no toast; Undo with a stale vault generation sends nothing.
- Existing tests changed: none required. If the dirty-buffer preflight is extracted from `setTaskStatus` into a shared private function (recommended), `task-toggle-dirty-buffer.test.ts` is the guard and must stay green. Its `invoke` fake (`task-toggle-dirty-buffer.test.ts:11-32`) only implements `toggle_task_status`; add a fake for the new command and parallel cases (typing moved the line, typing edited the line, pre-save failure) for `updateTask`.

### AC4. `TasksView.test.ts`: the menu sets priority and the row's chip changes

- Shape: shared fixture builder from 110, real `tasksStore`; mock `invoke` so `get_all_tasks_v2` first returns the task with no priority, the write command returns `{ updatedContent, updateResult: { changed: true, ... }, stale: false }`, and the next `get_all_tasks_v2` returns the task with `metadata.priority: 'high'`. Open the menu the way 241's tests do (NoteActionBar pattern: `trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`, `src/tests/lib/features/note-action-bar/NoteActionBar.test.ts:289`), choose Priority > High (`[data-slot="dropdown-menu-radio-item"]`), then `vi.waitFor` the row's chip text `high`.
- Assert the write args too (`newText` ends with the high emoji), not only the chip; the chip alone would pass if only the refetch fixture drove it.
- Red before: no menu items.
- Add: Due > Tomorrow sends the date (clock faked); Clear due is offered only when a due exists (A7); Undo toast Undo restores the chip; right-click context menu has the same Due and Priority items.
- Existing tests changed: none by 122 itself, but 241's menu tests that count items or assert the exact item list must be updated on purpose (they will name 3 items; 122 adds two groups).

### AC5 (added). e2e

`e2e/specs/tasks-view.spec.ts` gets one test: open Tasks, clear the section tag, open the row menu of `Ship feature A`, set Due > Today, assert `window.__e2e.fs.readFileSync(...)`-style content (pattern at the spec's toggle test, which reads `/test-vault/Projects/2026-Q2.md` through `__e2e.fs.readFileSafe`) matches the due token regex for today and the chip text appears. Needs the mock handler (3.1 step 6). Priority cannot be asserted by chip in e2e (mock parser has no priority), assert the file content instead.

## 3. Implementation plan (one context window, order of edits)

0. Pre-flight (no edits). Confirm the locator decision is recorded in the ticket's Notes (the Q8 decision) and `Status` moved off `needs-triage`; per memory, an undecided owner decision means come back blocked. Read the LANDED 241 code: `setTaskStatus`, the Undo toast helper and where its state lives, the menu markup, the store's reset-generation accessor, `resolveTaskKey`. Everything below says "reuse 241's X"; the names are unknown until then.
1. Failing tests first (commit nothing yet, or commit as red only if the repo's hook allows; it normally does not, so keep red in the working tree):
   a. `src/tests/fixtures/task-line-edits.fixture.json` and `task-line-edit.logic.test.ts`.
   b. `src-tauri/tests/vault_task_line_edits_parity_test.rs` and the AC2b Rust tests.
2. Pure edit module. Reading (c): create the shared module (see A2), move the text-level cores of `setDueDate` and `setPriority` out of `src/lib/features/todoist-sync/task-line.logic.ts:195-231` (the `patchText` wrappers stay in todoist and call the shared cores so its API and its 78 tests are unchanged); add the block-id guard to the insertion helper: today `insertToken` (`task-line.logic.ts:168`) inserts before the first id emoji, else appends after the last non-space character, so on a line ending in a block id the new token lands AFTER the block id and breaks it. Insert before a trailing block id (`trailingBlockId`, `:295`) when there is no id emoji. Add `resolveDuePreset(preset, today)` and the priority-to-emoji map (reading `pull.logic.ts:240` `PRIORITY_EMOJI` only covers highest, high, medium; low and lowest are not mapped there, so the map is built in the shared module from the full five). Green AC1 TS.
3. Rust command in `commands/vault.rs` next to `write_task_lines`: params `vault_root, rel_path, line_number, expected_text, expected_status, new_text`; inner: `validate_vault_path` + `idx.vault_root()` check + `confined_note_path` (same three lines as `:899-905`), read, split on `\n`, `parse_task_line` guard exactly as `toggle_task_status_inner:779-785`, refuse `new_text` with `\n`/`\r` or blank, rebuild the line as `line[..caps_group3_start] + new_text` (prefix preserved verbatim; use the same `TASK_RE`/`ORDERED_TASK_RE` capture the status setter uses, `parsing.rs:1902-1905`, which means exposing a small `pub fn set_task_text_in_content` beside `set_task_status_in_content` at `parsing.rs:1887`), `write_atomic`, `update_note_in_index_inner`, return `ToggleTaskResult`, emit `vault-index-updated` with the lock dropped (copy `:849-866`). Register in `lib.rs`, add to `commands.ts` (CommandMap with a doc comment, and `COMMAND_ARGS`). `cargo test` from the checkout root. Green AC2b, AC2c.
4. e2e mock: `VaultIndexImpl` method mirroring `toggleTaskStatus` (`vault-index.ts:502-529`) that replaces group 3 of `TASK_LINE_RE`, writes `virtualFS`, `this.update(...)`; handler in `tauri-core.ts` plus table entry beside `:484-485`. Leave `handleWriteTaskLines` throwing (still no spec drives Todoist sync), and say so; the ticket's sentence "this Issue makes it write through vault-index.ts" is only true if the anchor-based command is kept as the locator (see A1).
5. Service: in `tasks.service.ts` extract the dirty-buffer preflight (`:133-146`) from 241's `setTaskStatus` into one private function (`preflightTaskWrite(filePath, lineNumber): Promise<boolean>`) used by both writers, so the two paths cannot drift, the same argument 241 makes for `toggleTask`. Add `updateTask(filePath, task, change)` with `change = { text: string }`: no-op guard, preflight, call the new command with `relativePath(vaultStore.path, filePath)` and `vaultStore.path`, `stale` handling (refetch, caller-neutral toast, write nothing), unchanged result returns silently, success calls `afterTaskWrite`. If 115 has landed: `vaultStore.requestPromptIndexRefresh()` immediately before the `call`, and `afterTaskWrite` records the overlay. Undo: reuse 241's one-toast mechanism (a newer write of any kind dismisses it, `resetTasks()` dismisses it, stale generation refuses). Green AC3.
6. View: add Due and Priority to 241's menus (both the DropdownMenu and the ContextMenu from one shared snippet or component). Due: Today, Tomorrow, In a week (today + 7), Pick a date (opens a single view-level Dialog with `Input type="date"`, precedent `EventForm.svelte:86-94`), Clear (shown only when `metadata.dueDate` is set). Priority: radio group Highest, High, Medium, None, Low, Lowest, current checked from `metadata.priority ?? 'none'` (the parser never emits `none`, `parsing.rs:1799`). Each choice calls the pure edit then `updateTask`. After a write that removes or moves the row, 241 and 113's focus rules apply. `menu-item-anatomy.test.ts` constrains the items: no `m*-` horizontal margin classes, no `text-xs` labels. Green AC4.
7. e2e spec test (AC5) and `bash scripts/e2e.sh`.
8. Docs: `help/documentation/10-tasks-and-todoist.md` (A12): the row menu now sets due and priority, what Undo does and does not do, the Todoist effect (3.5). `docs/agents/indexing-watcher-rules.md` rules 2 and 6 list the task-write commands by name; add the new one. Update the comment lists in `core/filesystem/task-write.service.ts:7-8` and `note-change.service.ts:16-17,65` that name `toggle_task_status` and `write_task_lines`.
9. Gate: `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm check`, `pnpm vitest run`, `bash scripts/e2e.sh`. Suggested commits: (1) pure module + fixture + parity test, (2) Rust command + mock + contract, (3) service + view + docs.

### 3.5 Todoist effect (no code, goes in the help text)

Inference from `completion.logic.ts` and `fields.logic.ts`: on a line with a Todoist anchor, a due edit reaches Todoist as a field push on the next sync and so does a priority edit among highest, high and medium (`priority.logic.ts` maps low, lowest and none all to Todoist priority 1, so low/lowest/none edits do not change the pushed value). Undo after a sync ran pushes a second change. The recurring-task case (`fields.logic.ts:369` `due-not-pushed`: a removed due on a recurring line is not pushed) means "Clear due" on a recurring synced task keeps the Todoist due; say it in the help.

## 4. Ambiguities (every guess, with the likely reading)

- A1. Locator. Readings: (a) new command by line number + expected text + status; (b) stamp a `id-emoji` anchor first via `write_task_lines`' `line_number` attach mode; (c) read the whole line from disk in TS and call `write_task_lines`. Likely: (a), per synthesis Q8. (b) collides with the Obsidian Tasks dependency id and ADR-0037 (`docs/adr/0037-todoist-two-way-sync.md`: a copied anchor freezes a link) and silently links lines to Todoist when the sync is on. (c) still cannot address an unanchored line (anchor is mandatory, `task_lines.rs:211-215`). Only (a) works for the common unanchored task; the owner does not use external sync (memory note), so most rows have no anchor.
- A2. Where the token patchers live. Readings: (1) new independent `features/tasks/task-line-edit.logic.ts` as the ticket says (a third mirror of the Rust regexes after Rust and `todoist-sync/task-line.logic.ts`; violates T14 AC5, `synthesis.md:307`); (2) import `todoist-sync/task-line.logic.ts` (adds a `tasks -> todoist-sync` feature pair; Q8 (d) rejected it; 129 later accepts that pair only for state, but 122 should not need it); (3) move the text-level cores to one pure shared file. Likely: (3) per Q8 (c), placed where both features may import it, for example `src/lib/utils/` (pure, no state; `pure-logic.test.ts` forbids any store/service/Tauri import) with Todoist's line wrappers kept as thin callers. If the owner insists on the ticket text, (1) works but needs the Q8 deviation recorded.
- A3. Semantics of `setPriority`. The ticket says "removes any priority emoji and appends the new one". Todoist's `setPriority` replaces the first emoji in place and drops the rest (`task-line.logic.ts:211-221`). Likely intended: the end state must parse to the chosen priority and keep other tokens in place; either passes the parity test as long as the fixture is written for the chosen behavior. Pick in-place replace (smaller diff for the user's line) and write the fixture to match; flag if the owner wants append.
- A4. Where `newText` is computed and what `change` is. Likely: the menu handler calls the pure edit on `task.text` and passes `change = { text }`; Undo is the symmetric call. Status is never changed by 122, so the ticket's "previous text and status, expecting the new ones" reduces to previous text, expected new text, and the current status as expected status.
- A5. What the write returns for the 115 overlay. 115's overlay stores new text and status only, but chips read `metadata`. Likely intended: have the new command return the re-parsed `Task` (`parse_task_line` on the written line) so the overlay can replace the whole row fields; otherwise the due or priority chip lags the write by up to 10 s when 115 has landed (before 115 the refetch is fresh: the Rust command updates `VaultIndex` synchronously, so `get_all_tasks_v2` reads the new value). This forces a new DTO (`#[ts(export)]`, regenerated bindings, committed; CLAUDE.md IPC DTO rule: Rust + frontend gates) instead of reusing `ToggleTaskResult`. Decide at triage; if 122 lands before 115, reuse `ToggleTaskResult` and let 115 add the field.
- A6. Command naming and path form. The existing pair differ: `toggle_task_status` takes absolute `path`, `write_task_lines` takes `vaultRoot` + `relPath` and is confined. Likely: the new command takes `vaultRoot` + `relPath` so it is confined from day one and Issue 103 has nothing to fix for it. The name is a proposal.
- A7. "Clear" availability and "In a week". Likely: Clear shown only when a due exists (a no-op write must not happen); "in a week" is today + 7 days (not "next Monday"; PRD A7 says "next week" but the ticket says "in a week").
- A8. "A picked date" UI. No date-picker primitive in `components/ui/` (list: button collapsible command context-menu dialog dropdown-menu input popover resizable scroll-area select separator switch tooltip). `plugins/kanban/KanbanDatePicker.svelte` exists but `features/tasks` importing `plugins/` is a layer violation the baseline may not grow (`layer-rules.test.ts`). Likely: a Dialog with `Input type="date"` (precedent `EventForm.svelte:86-94`); the menu item "Pick a date" closes the menu and opens it. Focus must return to the row after the dialog closes (241's focus rule).
- A9. Inline groups versus submenus. 241's Status is an inline radio group; "next to Status" suggests inline. Eleven more items inline makes a tall menu. Submenus are testable in jsdom only by keyboard (ArrowRight on the sub-trigger). Likely: submenus for Due and Priority; if 241 delivered inline groups, match it.
- A10. Which row text is "expected". After 115, the overlaid row; before it, the store row. Same code either way: always pass the row the menu was opened on.
- A11. CRLF notes. Rust's `.` keeps `\r` in `Task.text`; a text-level append after the `\r` would corrupt the line, and a `new_text` that carries `\r` is refused (as `write_task_lines` refuses it). Likely: state the limit once (CRLF notes get a failure toast), per memory "No core changes for corner cases"; or make the TS patch insert before trailing whitespace (as Todoist's `insertToken` does) and have Rust re-attach the original trailing `\r`. Prefer stating the limit.
- A12. Blocker 085. The ticket lists "Blocked by: 241, 085" but its own Waits-on line says the open-root check is already in `write_task_lines` and `VaultIndex::vault_root()` exists (`src-tauri/src/vault/index.rs:349`). 085 only gates `read_files_batch`. Likely stale; 122 does not need 085's code. Confirm and drop at triage, otherwise 122 waits for nothing.

## 5. Risks and contradictions

Contradictions between the ticket and the code (facts):
1. "As built it needs no new Rust command": false. `TaskLineReplace.expected_line` is "The whole line the caller last saw" (`task_lines.rs:17-22`), compared by exact equality (`:312`). `TaskItem` carries `indent` as a count (`calculate_indent`, `parsing.rs:1620`, computes tabs + spaces/2 and drops the characters), no marker, and `status` collapses `x` and `X` (`map_checkbox_char`, `parsing.rs:1591`). The row cannot rebuild the line even for an anchored task. TS would have to re-read the file to get the line, adding a read and a TOCTOU window that the line-number guard avoids.
2. "A row whose task carries no id value cannot be addressed by it": true, and the `line_number` field is not the escape hatch it looks like; it only attaches a first anchor and demands the new line carry it (`validate`, `task_lines.rs:276-280`).
3. 115 says an overlay "records the written line's new text and status" and that row edits read `expectedText` from it. For due or priority the displayed chip comes from `metadata`, not text (A5).
4. The ticket names `setPriority(text, priority)` "appends"; `insertToken` semantics in Todoist (anchor-aware) and the block-id rule (T14 AC2: block id and anchor "stay in place") are stricter; the ticket's one-line description of `setDue` ("replaces or appends") omits both.
5. Ticket says the e2e mock "throws for `write_task_lines` today; this Issue makes it write through `e2e/mocks/vault-index.ts`". Under (a) the mock that must write is the NEW command; `write_task_lines` stays unmocked and unused by any spec.

What could break:
- Other readers of the same stores: `tasksStore.rows`/`visibleRows` (111), `groups` (112), `current row` (113). A due edit moves a row between buckets under Group by Due, or removes it under an active Due filter. 113's "next surviving row" focus rule and 241's focus-on-removal rule must hold for edits, not just status writes; add one test.
- `event-calendar` reads dated tasks (`event-calendar-tasks.logic.ts`) through `applyNoteChange` fan-out from `settleTaskWrite`; a due edit changes what the calendar shows. This is by design (the `task` source consumers refresh, `docs/agents/indexing-watcher-rules.md` rule 6 and 16). No extra code, but the e2e can assert it cheaply if wanted.
- Layer and cycle tests: `layer-rules.test.ts` (nothing new if the pure module is in `utils/` or inside `features/tasks`), `feature-cycle.test.ts` (reading (2) would add `tasks -> todoist-sync` to `featurePairs`, committed, still acyclic because todoist-sync does not import tasks: `grep` finds no `features/tasks` import under `todoist-sync`), `pure-logic.test.ts` (the pure module must not import `debug`, stores, services, Tauri).
- `menu-item-anatomy.test.ts` scans every `.svelte` outside `components/ui` for `DropdownMenu`/`ContextMenu` item markup; a stray `mr-2` or `text-xs` on the new items fails it.
- ADR-0034: 122 adds no store getter; if the implementer adds Undo state to the store, every computed getter needs a test.
- IPC: `ipc-parity.test.ts` compares arg names; Rust `vault_root` becomes `vaultRoot` in TS. A new DTO regenerates `src/lib/contracts/generated/`, which must be committed (CI fails on stale bindings).
- Todoist sync race: the sync can rewrite the same line between the row render and the write. The guard (expected text and status) turns that into `stale`, a refetch and the existing message. Undo after a sync rewrote the line is likewise refused as stale. No data loss, user sees "changed on disk".
- Rapid second edit before the refetch lands: the second call sends pre-edit text and goes stale (before 115) or uses the overlay (after 115). Acceptable; `afterTaskWrite` awaits the refetch before the first call resolves.
- A trailing block id plus a recurrence: the Rust recurrence regex swallows a following block id into `recurrence.text` (comment above `RECURRENCE_RE`, `parsing.rs:1532`, 109 says the same); an edit that puts the token before the block id keeps that behavior identical to before. Do not "fix" it here.
- Failing-first for the parity test is weak (AC1). Say so in the review so it does not read as a defect.
- Undo toast single-instance semantics are 241's; 122 must not add a second toast channel. If 241 stored Undo as a closure per toast with no registry, 122 will need that registry; read 241 before changing it.
- Not verified: I did not run anything, so the jsdom behavior of bits-ui submenus and a Dialog opened from a closing menu (focus return) is from reading, not execution.

Library behavior note: no node_modules reads were needed; bits-ui menu behavior in jsdom is inferred from the existing `NoteActionBar.test.ts` technique (keydown Enter on the trigger).

## 6. Size

- Ticket says M. My estimate: L if the locator command is included (Rust command + DTO decision + mock + contract + Rust tests, shared pure module move with the Todoist tests as safety net, service, view menus for two menu types plus a date dialog, three test files, e2e, two doc files). The ticket's M is only right if `write_task_lines` could be reused, which it cannot (section 5, item 1).
- Fits one context window: tight but feasible if steps 1-4 (pure + Rust) are committed before step 5. Recommended split at triage: 122a (pure shared module, fixture, Rust command, mock, contract; gate Both + e2e mock only) and 122b (service, menus, Undo, e2e, docs; gate frontend + e2e). Relay-lite runs one Issue per context; the split also keeps the Rust gate out of the second run.
- Not checked: the delivered text of 241 (it does not exist at HEAD), so every "reuse 241's X" name is unverified; and the Todoist sync's exact push behavior for priority was read from `priority.logic.ts` and `completion.logic.ts` headers, not traced end to end.
