# Scout 02: Tasks store, service, logic, types

Scope: `src/lib/features/tasks/` store, service, logic and types, plus the Rust commands they call. Read-only. Paths are absolute from the repo root `/Users/diegorv/Dev/pet-projects/koko/brain`. "Verified" means read in this session; anything else is marked "from memory".

## Facts

### Store state (`src/lib/features/tasks/tasks.store.svelte.ts`)

- Module-level `$state`, not exposed as one object: `fileTaskGroups` (L4, `[]`), `dateFilter` (L6, `'all'`), `sectionTag` (L8, `'#to-list'`), `hideCompleted` (L10, `true`), `isLoading` (L12, `false`). Getters L15-19, setters L21-25.
- `reset()` L27-33 restores all five to the same defaults.
- The store has **no computed getters**. `filteredGroups` and `stats` are `$derived` inside the component (`src/lib/features/tasks/TasksView.svelte:52-60`), not in the store, so the store-level test rule (every getter has a test) does not reach them.
- No error state in the store. A failed fetch leaves the previous `fileTaskGroups` in place.

### Fetch: `buildTaskIndex` (`src/lib/features/tasks/tasks.service.ts:63-84`)

- Chooses the IPC by the trimmed section tag: non-empty calls `get_tasks_in_section_v2 {sectionTag}` (L69-70); empty calls `get_all_tasks_v2` (L71).
- Sequence guard: `latestTaskIndexRequest` (L53, bumped at L64). A stale result is dropped (L72), and only the newest call clears `isLoading` (L82).
- Errors are caught and logged with `error()` only (L79-80). No toast, no state. Contrast with `toggleTask`, which toasts (L153).
- `fromV2` (L18-46) converts `modifiedAt` seconds to ms (L22) and copies all `TaskMetadata` fields (L29-43). The store keeps `status`, `priority`, `recurrence`, `dueDate`, `scheduledDate`, `startDate`, `id`, `dependsOn`, `onCompletion`, `tags`. Only `description` and the checkbox text reach the UI.
- Other consumer of the same IPC: `src/lib/features/event-calendar/event-calendar.service.ts:119` calls `get_all_tasks_v2` directly. Changes to that command's shape or to `FileTaskGroup` affect the calendar too.

### Section tag: what it really is

- The UI string is a plain substring matched against Markdown heading text. Not an Obsidian tag, not a property, not a folder.
- TS passes it trimmed (`tasks.service.ts:68`). Rust: empty or whitespace-only falls through to all tasks (`src-tauri/src/vault/parsing.rs:1705-1707`). A leading `#` is added if missing (`parsing.rs:1709-1713`).
- Match is `heading_text.contains(&tag)` (`parsing.rs:1739`). Case-sensitive. `#to-list` also matches a heading containing `#to-listing` or `#to-list-archive`.
- Scope: a task is included if it sits under a matching heading, until the next heading of equal or higher level (`parsing.rs:1736-1745`). Nested sub-headings inside a matching section stay included (test at `parsing.rs:3059-3065`).
- Fenced code blocks are skipped for heading detection (`parsing.rs:1715-1732`).
- Rust command: `src-tauri/src/commands/vault.rs:736-753`. Candidates are notes whose index entry has `tasks` non-empty (`vault.rs:672-683`). Files are re-read from disk on a blocking thread (`vault.rs:748-750`), outside the index lock (comment L733-735). Read failures are skipped and logged (`vault.rs:700-710`). Groups sorted by `modified_at` desc (`vault.rs:723`).
- Consequence: the default `#to-list` means the view shows nothing from notes without a `#to-list` heading. The UI does not explain this (from memory for the rendered empty state; the store default is verified at `tasks.store.svelte.ts:8`).

### Plain tasks: `get_all_tasks_v2` (`src-tauri/src/commands/vault.rs:646-655`)

- Returns index tasks for every note, grouped per file, sorted by `modifiedAt` desc (doc comment L643-645, `lookup_all_tasks` in `src-tauri/src/vault/index.rs`, not read).

### Toggle: `toggleTask` (`tasks.service.ts:121-155`)

- Dirty open tab (L123-136): saves the tab first (`saveFileByPath`, L126). If save fails, toast and stop (L127-128). Compares the 1-based line text before and after save; if it moved, refetch and toast, and do not toggle (L131-134). Line equality is text-only (comment L118-119).
- Calls Rust `toggle_task_status {path, lineNumber}` (L137-140). Rust: `src-tauri/src/commands/vault.rs:760-786` (inner, writes disk, updates index); command L804-829 emits `vault-index-updated` only when `changed` (L817).
- No-op when `!changed` (L141-143).
- Sync of open editor tab (L149) and explicit refetch (L150).
- Two refetches per effective toggle, when a tag is set: the explicit one at L150 and the `vaultIndexVersion` effect after the throttled bump (see Refetch triggers). The comment at L105-107 says the explicit one is intentional.

### Section-tag edit: `updateSectionTagFilter` (`tasks.service.ts:94-97`)

- Sets the store, then `buildTaskIndex()`. Not persisted anywhere.
- The input in `TasksView.svelte:37-46` debounces 400 ms per keystroke (L40-45). Each debounced call triggers a full disk scan of every note with tasks, because the tag is non-empty.
- Fire-and-forget at the call site (`TasksView.svelte:44`). Safe only because `buildTaskIndex` never rejects.

### Refetch triggers (complete list, verified)

1. `TasksView.svelte:78-83`: `$effect` reads `vaultStore.vaultIndexVersion` and calls `buildTaskIndex()`. Runs on mount and on every version bump while the view is mounted. Version bumps come from every save, watcher event and toggle (`.claude/rules` pointer and `docs/agents/indexing-watcher-rules.md:5`, item 2). Throttled: about 2 s after an isolated event, at most once per 10 s in a burst (`docs/agents/indexing-watcher-rules.md:31`, item 12).
2. `toggleTask` explicit refetch (`tasks.service.ts:132` on dirty-line mismatch, `:150` on success).
3. `updateSectionTagFilter` (`tasks.service.ts:96`), debounced input.
4. `resetTasks()` (`tasks.service.ts:203-207`) is called from vault teardown (`src/lib/app/lifecycle/app-lifecycle.service.ts:640`). It advances the request counter (discards in-flight fetches), resets the store, and closes the Tasks tab.
- No refetch on the sectionTag or dateFilter or hideCompleted change, except the section-tag path above. Date and completed filters are pure client-side on the cached groups.
- `app-lifecycle.service.ts:398-400` says the task index is not built at init, because `TasksView` fetches on mount.

### Persistence of view state

- `dateFilter`, `sectionTag`, `hideCompleted`: in-memory only. Lost on app restart and reset to defaults on every vault teardown (`tasks.store.svelte.ts:27-33`, called from `app-lifecycle.service.ts:640`).
- Grep of `src/lib` for `hideCompleted`, `sectionTag`, `dateFilter`: hits only in `src/lib/features/tasks/`. Not in the settings store (`src/lib/core/settings/settings.store.svelte.ts`). No `localStorage` or `sessionStorage` in the tasks folder (grep empty).
- Only Todoist config is in settings (`settings.store.svelte.ts:122` `todoist:`), handled by a separate store.

### Pure logic (`src/lib/features/tasks/tasks.logic.ts`)

- `filterCompletedTasks` (L34-52): drops checked tasks unless they have an unchecked descendant (`hasUncheckedDescendants` L17-26, by indent).
- `filterCompleted` (L59-70): per-group, drops empty groups.
- `filterByDate` (L76-88): uses **file** `modifiedAt` (L87), not any task date. Injectable `now` (L74).
- `computeTaskStats` (L91-113): `completed` counts `checked` only (L103).
- `parseTaskTextSegments` (L130-161): wikilinks and safe http(s)-like links only (L144 `isSafeUrl`). Relative links stay text.
- `checked` is `status != todo` (`src-tauri/src/vault/task.rs:25-26`). So `in-progress` and `cancelled` count as completed in the hide filter and in the stats. This is the mapping, verified in the Rust doc comment; the UI effect follows from `tasks.logic.ts:40,103`.

### Types (`src/lib/features/tasks/tasks.types.ts`)

- `TaskItem` L4-17: `text, checked, indent, lineNumber, status, metadata`.
- `FileTaskGroup` L20-29: `filePath, fileName, modifiedAt (ms), tasks`.
- `TaskDateFilter = 'all' | 'last7days' | 'last30days'` L32. Labels are in `TasksView.svelte:31-35`.
- IPC contract: `src/lib/contracts/commands.ts:80-84` (`get_all_tasks_v2`, `get_tasks_in_section_v2 {sectionTag}`, `toggle_task_status`), arg order at L226-228.
- Rust command registration: `src-tauri/src/lib.rs:346-348`.

### Tests present (existence verified, contents not read)

- `src/tests/lib/features/tasks/tasks.store.test.ts`, `tasks.service.test.ts`, `tasks.logic.test.ts`, `task-toggle-dirty-buffer.test.ts`.
- Rust: `parsing.rs:3040-3080` covers section extraction (empty tag, matching only, nested headings, `#` added, code fence). `vault.rs` `tasks_in_section` tests not read.

## Problems and gaps

1. **Section tag is one free-text substring.** No multi-tag, no AND/OR, no negation, no exclusion, no per-note rule. Match is case-sensitive and not boundary-aware (`parsing.rs:1739`), so `#to-list` catches `#to-listing`.
2. **Sourcing rule is implicit.** The default `#to-list` silently hides every task outside such a heading. The store default (`tasks.store.svelte.ts:8`) and the empty-tag path (`tasks.service.ts:68-71`) are the only two modes. No folder, property, tag, or file-scope sourcing exists in the store.
3. **Full disk rescan on every version bump while the view is mounted.** `TasksView.svelte:78-83` plus default non-empty tag means each save, watcher event or toggle elsewhere in the vault re-reads every note with tasks (`vault.rs:748-750`). Cost scales with the number of task notes, not with what changed. Compare the index-dedupe pattern in `docs/agents/indexing-watcher-rules.md:23`.
4. **Double refetch per toggle** when a tag is set: `tasks.service.ts:150` plus the version effect after the throttled bump (comment `:105-107`). Two full disk scans for one click.
5. **Errors are silent in the view.** `tasks.service.ts:79-80` logs only. No store error, no toast, no empty-vs-failed distinction. The UI keeps stale groups and shows nothing.
6. **Filter state is lost.** Date, completed toggle and tag reset on restart and on every vault teardown (`tasks.store.svelte.ts:27-33`, `app-lifecycle.service.ts:640`). No per-vault memory.
7. **Date filter means file mtime, not task date.** `tasks.logic.ts:87`. A task with a due date next week shows under "last 7 days" only if its note was edited recently. The metadata dates are in the store (`tasks.service.ts:30-35`) but unused by filters.
8. **"Completed" conflates states.** `checked = status != todo` (`task.rs:25-26`). `in-progress` and `cancelled` hide with done tasks (`tasks.logic.ts:40`) and count as completed (`tasks.logic.ts:103`). Nothing in the store distinguishes them.
9. **Metadata discarded in the UI.** Priority, recurrence, due, scheduled, start, id, dependsOn, tags are copied (`tasks.service.ts:29-43`) but no filter, sort or grouping uses them. Only the checkbox and `description` text reach the UI.
10. **Grouping and sort are fixed.** Groups by file, files by `modifiedAt` desc (`vault.rs:723` for section mode, `vault.rs:643-645` for all-tasks mode). Tasks in document order. No store field for sort or group-by.
11. **Store is thin, logic is in the component.** `filteredGroups` and `stats` are `$derived` in `TasksView.svelte:52-60`. The combination rule (date, then completed) is not unit-testable without mounting the component.
12. **Section filter makes the Rust path do disk I/O for a UI keystroke.** Each debounced tag edit (`TasksView.svelte:40-45`) reads every task note from disk on a blocking thread. Acceptable for one-off edits, costly if the owner types many tags.

## Ideas worth keeping

- **Sequence guard** (`tasks.service.ts:53,63-84`): only the newest fetch writes the store. Keep for any new filter inputs.
- **Candidate copy under lock, read off-thread** (`vault.rs:736-753`): keeps writers unblocked. Keep when adding rule-based sourcing.
- **Dirty-buffer guard before toggle** (`tasks.service.ts:123-136`): saves the tab, verifies the line, refetches on drift. The toggle path is a good template for any task-writing action.
- **`resetTasks` discards in-flight fetches** (`tasks.service.ts:203-207`). Keep for vault switches.
- **Pure, injectable logic** (`tasks.logic.ts:74` `now` param). Filters are testable without the store. Keep the split when adding rules.
- **Heading-scoped extraction is cheap to reason about** (`parsing.rs:1705-1752`): one pass, code fences respected. Any rule engine could reuse `parse_task_line` (`parsing.rs:1746`).
- **Keep `FileTaskGroup` as the common shape.** `get_all_tasks_v2`, the section command and the event calendar all share it (`commands.ts:80-82`, `event-calendar.service.ts:119`).

## Open questions

1. Is the heading-tag substring the intended long-term sourcing rule, or a stopgap for per-rule sourcing (folder, tag, property, file list)? The PRD scope depends on this.
2. Should `#to-list` match with a boundary (`#to-list` but not `#to-listing`)? Current behavior is substring, case-sensitive (`parsing.rs:1739`). Intent not verified.
3. Should `in-progress` and `cancelled` count as completed? Current mapping is `checked = status != todo` (`task.rs:25-26`), the owner may expect otherwise.
4. Where should view state persist: per-vault file under the vault config, the settings store (global), or nowhere? Current answer is nowhere (`tasks.store.svelte.ts:27-33`).
5. Is the throttled `vaultIndexVersion` the right refetch trigger for this view, or should it refetch only on the notes it shows? Changing it touches the indexing invariants in `docs/agents/indexing-watcher-rules.md` (items 2 and 12), so it needs an owner decision.
6. What does the empty state show when `#to-list` matches nothing? Not read: `TasksView.svelte` lines 100-277 were not read in full in this scout (the component is scout 01's slice).
7. Todoist sent-state is keyed by `filePath + task text` (brief). If the Tasks store changes `text` shape or line numbers, sent-state keys are affected. Not checked in this slice.
