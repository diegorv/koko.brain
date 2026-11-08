# Scout 07: todoist-store-bridge

Recovered from the workflow journal: the agent's Write was refused, so this is its returned text.

**Summary (for the workflow):** Sent-task identity is `filePath` plus the raw task text, held in memory and in `.kokobrain/todoist-sent.json`. Edits to a task's text (including its emoji date or priority signifiers), note renames or moves, and note deletions all orphan or duplicate entries, since nothing hooks into path changes. The disk write is non-atomic, and a parse error silently resets the list, so the next send can wipe every prior mapping. Sync maps a 404 to "open", and failures are only logged. I did not write the report file: my subagent instructions bar report `.md` files, so the full findings follow here.

## Facts

**Store (`src/lib/features/tasks/todoist.store.svelte.ts`)**
- Identity key is `` `${filePath}:${text}` `` (line 28, rebuilt by `buildSentKeys` and `addSentTask`/`updateSentTask`).
- `isSent` (49-51) checks the Set. `isCompletedInTodoist` (70-75) and `getTodoistUrl` (78-83) use a linear `find` on `(filePath, text)`, so the first match wins for duplicates.
- `updateSentTask` (86-93) is keyed by `todoistTaskId`. `addSentTask` (96-100) appends and adds the key. `setSentTasks` (64-67) replaces the list. `reset` (103-115) is called from `app-lifecycle.service.ts:649`.
- The store has no persistence. Persistence lives in the service.

**Bridge (`todoist-bridge.logic.ts`)**
- `mapPriorityToTodoist` (15-29): highest→4, high→3, medium→2, low/lowest/none→1.
- `buildTodoistArgs` (41-63): `content` = `metadata.description` (43), which is the clean text. Recurrence overrides due date: if `recurrence` is set, `dueString` = recurrence text and `dueDate` is dropped (52-56). Tags become `labels` (58-60).
- Not mapped at all: `scheduledDate`, `startDate`, `createdDate`, `doneDate`, `cancelledDate`, `status`, and the note path or link.
- `mergeLabel` (72-79): trims and dedupes.

**Service (`todoist.service.ts`)**
- `SENT_TASKS_FILE` = `.kokobrain/todoist-sent.json` (12), under `vaultStore.path`, absolute path.
- `loadSentTasks` (103-118): missing file or parse error returns `[]` (114-117). No validation; `JSON.parse` is cast.
- `saveSentTasks` (124-131): `mkdir` if needed, then `writeTextFile` (129), which is not atomic and writes the whole in-memory list.
- `sendTaskToTodoist` (181-235):
  - Args: metadata args (196), `content: metadataArgs.content || text` (200, raw text fallback, which includes signifiers), manual overrides (202-204), default label merged (207-210).
  - Creates the task (213), builds the entry with raw `text` (215-221), calls `addSentTask` (223) before `saveSentTasks` (224). If the save throws, the entry is in memory but not on disk, and the Todoist task already exists.
  - Does not check `metadata.status`.
- `initTodoist` (238-244) overwrites the store with disk contents via `setSentTasks`, and returns early if no vault path.
- `fetchTaskById` (74-92): 404 is detected by substring match on `err.message` (86), returns `null`.
- `syncTodoistTasks` (250-286): `Promise.allSettled` over all entries in parallel (263, no cap). `null` maps to `todoistCompleted: false` (273). Rejected fetches only `debug` (277). Saves at 281.
- Types: `SentTaskEntry` (`todoist.types.ts:25-40`) has no note-identity beyond `filePath` and `text`, and no stable id inside the note.

**Consumers**
- `TasksView.svelte:73` calls `initTodoist()` in `onMount`, not awaited and not at vault init. `:87` calls sync.
- `TasksView.svelte:242-244`: lookup by `(group.filePath, task.text)`. `:265` passes `task.text` and `task.metadata` to `TodoistPopover`.
- `TodoistPopover.svelte:97-104` passes `taskText` (raw) and `metadata` to `sendTaskToTodoist`.
- The grep over `src/lib` found no Todoist reference in `core/filesystem`, `core/vault`, or path-change code. Sent entries are not updated on rename, move or delete.

**Rust side**
- `Task.text` is the "Raw task text (without the `- [ ] ` prefix)", so it keeps emoji signifiers (`src-tauri/src/vault/task.rs:22-24`).
- `TaskMetadata.description` is the clean text (`task.rs:84`). `tags` is `Vec<String>` (`task.rs:130`), ASCII-only per `parsing.rs:1575`. Whether `#` is stripped is unverified.

**Tests**
- `src/tests/lib/features/tasks/todoist.store.test.ts`: 129-157 covers "different text in same file → not sent". Nothing covers rename, move, delete, duplicate text or edit-then-resend.
- `todoist.service.test.ts`: 200 "returns empty array on parse error" locks in the reset-on-corrupt behavior. 217 covers the write. 702 "marks deleted tasks (404) as not completed" locks in the 404-as-open behavior.
- No test covers a save failure after the Todoist create.

## Problems and gaps

Concrete failure scenarios, each from code reading and not reproduced:

1. **Editing task text orphans it.** Key is raw text including emoji signifiers (`service:215`, `store:28`). Changing a date, priority or tag makes `isSent` false. Re-sending creates a duplicate in Todoist. The old entry keeps syncing as a ghost.
2. **Note rename or move orphans every entry for that note.** Keys are absolute paths. Nothing rewrites them, though `path-change.service` exposes a consumer registry that the bridge could use.
3. **Note deletion leaves permanent stale entries.** Sync keeps polling them; the view shows them as "open in Todoist" with a dead link.
4. **Duplicate texts in one file.** One send marks every identical line as sent. Completion and URL come from the first match, so the second instance cannot be distinguished.
5. **Save failure after create.** `addSentTask` runs before `saveSentTasks` (`service:223-224`). If the write fails, the error surfaces, the Todoist task exists, and the mapping is lost on restart. Re-send duplicates.
6. **Corrupt file wipes history.** `writeTextFile` is non-atomic (`service:129`). A truncated or corrupt JSON makes `loadSentTasks` return `[]` (`service:114-117`). The next send's `saveSentTasks(todoistStore.sentTasks)` then writes only the new entry. All prior mappings are gone for good.
7. **Init race.** `initTodoist` is not awaited (`TasksView:73`). A send that completes before `setSentTasks` (`service:242`) can be dropped from memory when the disk snapshot replaces the list.
8. **Concurrent saves.** Each save serializes the store at call time with no queue (`service:224`, `:281`). An older snapshot can finish writing last. Unverified at runtime.
9. **Deleted-in-Todoist shows as open.** `null` becomes `todoistCompleted: false` (`service:273`). The 404 detection is a substring match on the SDK error text (`service:86`). The SDK error shape is from memory.
10. **Silent sync failure.** A 429 or network error only logs at debug (`service:277`). No count, no UI state, no "last synced" signal. Parallel fan-out with no cap (`service:263`). Todoist rate limits are from memory.
11. **Recurrence drops the due date.** `buildTodoistArgs` sets `dueString` and skips `dueDate` (`bridge:52-56`). Scheduled and start dates are never sent (`bridge:41-63`).
12. **Priority collapse.** `low`, `lowest` and `none` all become Todoist priority 1 (`bridge:23-27`). A manual popover choice overrides metadata (`service:204`).
13. **Raw-text fallback leaks signifiers.** Empty `description` falls back to raw text with emoji (`service:200`).
14. **No note link in Todoist.** Only `content`, priority, due and labels are sent. No file path or deep link in `description`.
15. **Status not checked.** Done or cancelled tasks can be sent; `metadata.status` is never read in `sendTaskToTodoist` (unverified whether the popover filters them).
16. **Linear lookups.** `find` per row per render in `TasksView`, O(tasks × sent). Minor.
17. **Vault switch while mounted (unverified).** `initTodoist` runs only on mount, but `reset` runs at teardown (`app-lifecycle:649`). If `TasksView` stays mounted across a vault switch, the new vault could receive the old in-memory list on the next save.

## Ideas worth keeping

- Stable identity inside the note. For example, an Obsidian-style block id (`^xxxx`) appended to the task line survives edits and moves. The mapping then depends on the id, not on text.
- Or key on the normalized clean `description` plus a file identity, so emoji edits do not orphan entries.
- Register a path-change consumer (`registerPathChangeConsumer`, per `docs/agents/indexing-watcher-rules.md` item 6) to rewrite `filePath` on rename or move, and drop entries on delete.
- Write atomically, using the same mechanism as Rust `write_atomic`. Refuse to overwrite on parse error; keep a `.bak` and surface the error.
- Persist before reporting success, or record a "pending" entry first so a failed save can be retried.
- Surface sync state: last synced time, "deleted in Todoist" as a distinct status, and a failure count.
- Add a note backlink or deep link to the Todoist `description`.
- Map scheduled and start dates, and keep the due date alongside a recurrence.

## Open questions

- Is one-way completion sync (pull on demand) intended, or should local checkbox and Todoist completion stay in step?
- Is `.kokobrain/todoist-sent.json` expected to be shared across devices (for example a synced vault)? If yes, the file needs conflict handling.
- Should moving or renaming a note carry its Todoist mapping along?
- Should re-sending an edited task update the existing Todoist task instead of creating a new one?
- Are done or cancelled tasks meant to be sendable?
- Does the parser strip `#` from task tags before they become labels (`parsing.rs:1849`)? Todoist label constraints are from memory.
- Does TasksView unmount on vault switch, which determines the trigger for risk 17?
