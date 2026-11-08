# Scout 05: task contracts (Task, TaskMetadata, TaskStatus, TaskPriority, RecurrenceRule, FileTaskGroup)

Read-only pass. No builds, tests or state-changing git commands were run. Everything below comes from reading code, not from running it.

## Facts

### Source of truth and wiring

- Rust defines the wire types with `#[ts(export)]` and camelCase serde: `Task` (src-tauri/src/vault/task.rs:19-35), `TaskStatus` (task.rs:37-51, kebab-case), `TaskPriority` (task.rs:53-65), `RecurrenceRule` (task.rs:67-74), `TaskMetadata` (task.rs:76-131), `FileTaskGroup` (task.rs:149-166), `ToggleTaskResult` (task.rs:181-196).
- ts-rs output lives in src/lib/contracts/generated/ (Task.ts, TaskMetadata.ts, TaskStatus.ts, TaskPriority.ts, RecurrenceRule.ts, FileTaskGroup.ts). Barrel: src/lib/contracts/index.ts:31-37.
- `src/lib/features/tasks/task-metadata.types.ts:1` is now a one-line re-export of the four contract types from `#lib/contracts/index.js`. It is not a hand-written mirror.
- `src/lib/types/vault-v2.types.ts` re-exports the generated types under `*V2` names (`TaskMetadataV2`, `FileTaskGroupV2`, etc.). Its header states that `FileTaskGroupV2.modifiedAt` is in seconds.
- IPC: `get_all_tasks_v2` and `get_tasks_in_section_v2` return `FileTaskGroup[]`; `toggle_task_status` returns `ToggleTaskResult` (src/lib/contracts/commands.ts:80-84, args at 226-228).
- Hand-written TS types still exist in src/lib/features/tasks/tasks.types.ts: `TaskItem` (lines 4-17), `FileTaskGroup` with `modifiedAt` in ms (lines 20-29, comment at 25), and `TaskDateFilter = 'all' | 'last7days' | 'last30days'` (line 32).
- The conversion from wire to UI shape is `fromV2` in src/lib/features/tasks/tasks.service.ts:18-46. It multiplies `modifiedAt` by 1000 (line 22) and copies every `metadata` field by hand (lines 29-43). Any new Rust metadata field is dropped silently unless someone adds it here.
- `buildTaskIndex` (tasks.service.ts:63-84) fans out to `get_tasks_in_section_v2` when `sectionTag` is non-empty (lines 69-71).
- Architecture test: src/tests/lib/architecture/ipc-mirrors.test.ts:25-26 allowlists the hand-written `FileTaskGroup` in tasks.types.ts. Lines 100-102 forbid a second `FileTaskGroup` elsewhere. The test does not check the `Task`/`TaskMetadata` field lists against the TS side.

### Stale doc comments in Rust

- task.rs:3-4 says the Rust structs mirror `src/lib/features/tasks/{tasks.types.ts, task-metadata.types.ts}`. That direction is inverted: the TS file now re-exports the generated type.
- parsing.rs:1446-1447, 1473, 1588 and 1756 say the same thing and point to `task-metadata.types.ts` as the contract.

### Field table: Task (task.rs:19-35, generated Task.ts)

| Field | Type | Used by TasksView | Used by TodoistPopover | Other consumers | Notes |
|---|---|---|---|---|---|
| text | string | yes: wikilink/link segments (TasksView.svelte:221), Todoist sent-key (:242) | yes: `taskText` prop (TodoistPopover.svelte:18, sent at :98) | todoist.service.ts:200 fallback content; todoist.store.svelte.ts:50 key | Raw text with signifiers. It is the identity for sent tasks (see Problems). |
| checked | boolean | yes: checkbox state (:206, :209), strikethrough (:218), filter (tasks.logic.ts:40), stats (:103) | no | | Set to `check_char != ' '` (parsing.rs:1633, 1650). True for every status except todo. |
| indent | number | yes: left padding (TasksView.svelte:202) | no | | Tabs plus spaces/2 (parsing.rs:1604-1615). |
| lineNumber | number | yes: `{#each}` key (:199), toggle target (:207) | no | event-calendar-tasks.logic.ts:58 | 1-based. Shifts when lines above are edited. |
| status | TaskStatus | NO. No `.svelte` file reads it. | NO | copied by fromV2 (tasks.service.ts:31) only | Seven values carried over IPC; the UI ignores all of them. |
| metadata | TaskMetadata | pass-through only (TasksView.svelte:265) | receives it as `metadata` prop (TodoistPopover.svelte:22) | | Whole object is passed down; the popover reads five fields. |

### Field table: TaskMetadata (task.rs:76-131, generated TaskMetadata.ts): 13 fields

| Field | Source signifier (parsing.rs) | TasksView | TodoistPopover | Other consumers |
|---|---|---|---|---|
| description | stripped text (parse_task_metadata, parsing.rs:1760) | no | yes: title line (:121); Todoist `content` via todoist-bridge.logic.ts:43 | event-calendar-tasks.logic.ts:59 |
| dueDate | date emoji (DATE_EMOJIS parsing.rs:1449) | no | yes: display (:123-127); Todoist `dueDate` only when no recurrence (todoist-bridge.logic.ts:54-55) | event-calendar-tasks.logic.ts:53 |
| scheduledDate | parsing.rs:1450 | NO | NO | fromV2 copy only (tasks.service.ts:32) |
| startDate | parsing.rs:1451 | NO | NO | fromV2 copy only (:33) |
| createdDate | parsing.rs:1452 | NO | NO | fromV2 copy only (:34) |
| doneDate | parsing.rs:1453 | NO | NO | fromV2 copy only (:35) |
| cancelledDate | parsing.rs:1454 | NO | NO | fromV2 copy only (:36) |
| priority | PRIORITY_EMOJIS parsing.rs:1474-1480, first match wins | no | initial value (:64-65); mapped to 1-4 (todoist-bridge.logic.ts:15-29) | |
| recurrence | RECURRENCE_RE parsing.rs:1531-1547; `{ text }` only | no | display (:130-133); Todoist `dueString` (todoist-bridge.logic.ts:52-53) | |
| id | ID_EMOJI, parsing.rs:1483, 1549-1552 | NO | NO | fromV2 copy only (:39) |
| dependsOn | DEPENDS_ON_EMOJI, parsing.rs:1484, 1554-1565 | NO | NO | fromV2 copy only (:40) |
| onCompletion | ON_COMPLETION_EMOJI, parsing.rs:1485, 1567-1571 | NO | NO | fromV2 copy only (:41) |
| tags | `#word` in description, parsing.rs:1573-1578 | no | display (:135-139); Todoist `labels` (todoist-bridge.logic.ts:58-60) | |

Five of 13 metadata fields reach the UI. Eight are carried through `fromV2` and never read.

### Enums and smaller types

- `TaskStatus` (generated TaskStatus.ts:7): `todo | done | cancelled | in-progress | question | forwarded | important`. Mapping from the checkbox character at parsing.rs:1589-1600; unknown characters fall back to `todo`. No UI reads it.
- `TaskPriority` (generated TaskPriority.ts:7): `highest | high | medium | none | low | lowest`. Todoist mapping (todoist-bridge.logic.ts:15-29): highest=4, high=3, medium=2, low/lowest/none=1. The popover labels are Normal/High/Urgent/Very Urgent, values 1 to 4 (TodoistPopover.svelte:31-36).
- `RecurrenceRule` (generated RecurrenceRule.ts:7): `{ text: string }`. Raw text such as "every week". There is no parsed interval, unit or next-due value.
- `FileTaskGroup` (generated FileTaskGroup.ts, task.rs:149-166): `filePath`, `fileName` (basename without extension, display_name at task.rs:173-179), `modifiedAt` (seconds, task.rs:159-163), `tasks`. The UI only sees the ms copy from tasks.types.ts.
- `TaskDateFilter` (tasks.types.ts:32) filters on the file's `modifiedAt` (tasks.logic.ts:76-88), not on any task date.

### Behaviour that the contract hides (verified by reading)

- Default hide: `hideCompleted = true` (tasks.store.svelte.ts:10). `filterCompletedTasks` keeps only `!task.checked` (tasks.logic.ts:40). So `[/]` in-progress, `[-]` cancelled, `[?]`, `[>]` and `[!]` are all hidden by default, and `computeTaskStats` counts them as completed (tasks.logic.ts:103).
- Default section scope: `sectionTag` defaults to `'#to-list'` (tasks.store.svelte.ts:8, reset at :30). With that default, only tasks under a heading containing `#to-list` are indexed (parsing.rs:1705-1752). The `Task` struct has no heading, section or file-folder field, so the UI cannot show where a task was filtered from.
- Due date vs recurrence: when `recurrence` is set, `dueDate` is not sent to Todoist (todoist-bridge.logic.ts:52-56). The popover still displays the due date (TodoistPopover.svelte:125-127).
- Sent-task identity: `isSent` and the store key are `${filePath}:${text}` (todoist.store.svelte.ts:49-51, :28). `sendTaskToTodoist` stores the raw `text` (todoist.service.ts:215-223). The view checks `task.text` (TasksView.svelte:242).
- The UI's own date formatting uses ms (TasksView.svelte:93-100) on `group.modifiedAt`, which the conversion has already multiplied (tasks.service.ts:22).

## Problems and gaps

1. Duplicated and drifting definitions. Four places define the same shapes: the generated files, the re-export shim, the hand-written `TaskItem` and `FileTaskGroup` in tasks.types.ts, and the `*V2` aliases. The two `FileTaskGroup` types use different units (seconds vs ms).
2. `fromV2` hand-copies all 13 metadata fields (tasks.service.ts:29-43). A new Rust field is dropped with no compile error, and nothing in tests would catch it.
3. Only 5 of 13 metadata fields and 0 of 7 statuses reach the UI. Dates other than due, plus id, dependsOn and onCompletion, have no consumer at all.
4. `checked` collapses six non-todo statuses into "done". Combined with `hideCompleted = true`, in-progress and cancelled tasks disappear by default and inflate the "completed" count. This is a contract-level choice visible in parsing.rs:1633, not an accident of the view.
5. No heading or section on `Task`. The section-tag feature (parsing.rs:1705-1752) decides inclusion but leaves no trace in the output, so the UI cannot group by heading, show the source path, or explain why a task is shown.
6. Identity is weak. `lineNumber` is the view key and toggle target (TasksView.svelte:199, :207) and shifts on edits. Sent-task identity is the raw text (todoist.service.ts:217), so editing a task's text, or adding a date signifier after sending, makes the task look unsent again. The `id` (🆔) field exists in the contract and is unused for identity.
7. Priority is lossy. Five levels collapse to four Todoist levels. `low`, `lowest` and `none` are indistinguishable in Todoist, and `medium` displays as "High" (todoist-bridge.logic.ts:21-25 and popover labels :31-36).
8. Recurrence is opaque text. The UI cannot show the next occurrence, filter recurring tasks, or validate the rule. The popover shows raw text, and Todoist parses it.
9. Date filters use file mtime (tasks.logic.ts:76-88), not task dates. The contract already has `dueDate`, `scheduledDate` and `startDate`, so date-based task filtering needs no Rust change.
10. Stale Rust doc comments name the TS file as the source of truth (task.rs:3-4, parsing.rs:1446-1447). Anyone following them edits the wrong file.
11. Cost of changing the contract (from CLAUDE.md, read not run): any `#[ts(export)]` change, including doc comments, needs `cargo test` to regenerate `src/lib/contracts/generated/`, and CI fails on stale bindings. Adding a `heading` or `status`-based field is therefore a Both-gate change.

## Ideas worth keeping

- Make `fromV2` a pass-through (or delete it and use `*V2` directly, with the seconds-to-ms conversion in one place). This removes the silent field drop and the duplicate type.
- Add a heading or section path to `Task` in Rust, so the view can group by heading and show the source.
- Split `checked` from status in the UI: show a status glyph per `TaskStatus`, and make `hideCompleted` hide only `done` and `cancelled`.
- Use the existing date fields for filters (due today, overdue, scheduled this week) and for sorting. No parsing change is needed.
- Key sent tasks by the 🆔 `id` when present, or by a stable hash of the description plus file, instead of raw text.
- Keep the Todoist mapping table in todoist-bridge.logic.ts as the single place for priority and label rules, and show the mapping in the UI rather than the bare numbers.

## Open questions

- Should `[-]` (cancelled) and `[/]` (in progress) count as done? The current behaviour comes from `checked`, but the owner has not said what they want (from memory: no spec in .scratch/tasks-view yet).
- Should Todoist send scheduled and start dates, or keep only due? Todoist's API supports more than the code uses. I did not check the current SDK options (not verified here).
- Is `#to-list` the intended default scope, or a leftover? The section-tag default at tasks.store.svelte.ts:8 is the only place it is set.
- Does the owner want `id` (🆔) to become the identity for sent tasks, and does a migration of existing sent-task entries exist? Not checked.
- Are the eight unused metadata fields planned for future features, or safe to drop from the contract? Dropping one changes the generated DTO and needs the Both gate.
