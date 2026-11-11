# 10 discovery: a task written in the brain is created in Todoist

No `spec.md`; design is `research/design.md` rules 1, 2, 8, 8b, 9, 11, 13, Scope, Anchor. Builds on 06-09/13 (`work/06/`, `work/09/`, `work/13/`): same fakes, same `syncNow` cycle. Only what differs is listed.

## Files

- `src-tauri/src/vault/task_lines.rs:15` + TS port `task-line-edits.logic.ts:45`: `TaskLineReplace.lineNumber?` (optional, ts-rs `optional`). With it the line has no anchor yet: line N is replaced if it still equals `expectedLine`, and `anchor` (the one `newLine` adds) must not be in the note (`anchorExists`). The writer can only locate anchored lines today, so writing the first anchor needs this (rule 2 says "through the writer"). Rust tests in `src-tauri/tests/vault_task_lines_test.rs`; bindings regenerate.
- `pull.logic.ts`: `ScannedLine.indent`, `LineFields.recurrence?`; `extractTaskLines` gains `indent` (Rust `calculate_indent`). `planPull` pairs an unlinked item with a pending add (link with `todoistId` null, not detached): by its `kokobrain:` line, else by content + project against the pending `item_add` args (exactly one match). Paired links go to `updatedLinks` (todoist id set, pending cleared, `remote_base` from the item). `PullCounts.todoistCreated`.
- `vault-scan.service.ts:29-80`: indent + recurrence from the index task.
- New `create.logic.ts` (pure): `createTarget` (scope), `planCreates` (candidates -> anchor, pending link, `item_add`; resends of stored pending adds), `ackedLink`.
- `sync-now.service.ts`: `syncNow(mode)` required; creates planned after fields (skipped in rebuild mode); first-run preview / 25 cap (ask on manual, skip on auto); anchors written in `writeBatches` (line-number replace); pending links in the main commit; `pushCreates` after the field pushes: ok -> todoist id from `temp_id_mapping`, terminal 4xx -> link detached + logged, other -> kept for resend; `first_run_done` set by a manual cycle that got past the preview.
- `sync-scheduler.service.ts:105-121`: `stopAutoSync` dismisses the failure and cap toasts it shows; fourth cap toast (creates). `sync-scheduler.logic.ts`: `autoSyncCreateCapMessage`.
- `features/tasks/TasksView.svelte:254`: Send hidden for anchored lines, and (sync on) lines in scope.
- `src/tests/fixtures/todoist-sync.fake.ts`: `item_add` keeps only known fields, parses `due` like `item_update` (string-only due gets a date); `todoist-vault.fake.ts`: indent + recurrence.

## Plan

- Scope (`createTarget`): open status (rule 5), indent 0, no `🆔` at all, parsed fields present; note's `todoist_project` in the tree -> that project; else a `#todoist` tag -> root. A user `🆔` without `td-` in such a line is logged (`create-skipped`). Content over 500 code points or with a newline: logged, not created. A note named by 2+ project notes: skipped (pull writes nothing there either).
- Args: `content` = parsed description, `description` = `kokobrain:<anchor>`, `projectId`, `priority`, `labels` = line tags minus excluded labels (+ `personal` when `syncContext` is personal), `due` per the Issue, `autoParseLabels: false`, `tempId` = anchor, `uuid` = `pending_uuid`. The command is stored as `pending_cmd` JSON, so a resend is byte-identical.
- On ack `remote_base` = the sent values; the next pull's diff fills Todoist's date for a string-only due and moves the label base for the webhook's `Work`.

## Tests to copy

- `sync-now.service.test.ts` "close/reopen cap" (ask / auto skip) and the offline-commands fetch wrapper (line 855); `sync-scheduler.service.test.ts` cap toasts; `pull.logic.test.ts` pairing; `vault_task_lines_test.rs` helpers.

## Defaults taken

- Only lines with no `🆔` are created. An anchored line without a link row is never created (no way to tell a lost store from a crash between the anchor write and the commit); risk below.
- The cap counts new creates; resends of pending adds always go. Preview only when the first run has creates; `first_run_done` is set by the first manual cycle that commits.
- "Project note" = a note whose `todoist_project` is in the tree, wherever it is; a note in the sync folder without it is not one.
- Tasks view "in scope" = sync on with a root, note has `todoist_project` (property index) or the line has `#todoist`, path in sync scope; it cannot see the tree.

## Risks

- A crash after the anchor write but before the commit leaves an anchored line that is never created (rare; removing the `🆔` retries it).
- A user `🆔` line is logged every cycle.
- `Gate: frontend` in the Issue, but the writer change touches Rust: cargo test runs too.
