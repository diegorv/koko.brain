# Scout 17: docs and ADRs for the Tasks view and Todoist

Scope: `help/documentation/10-tasks-and-todoist.md`, `docs/FEATURES.md`, the glossary, `docs/adr/`, and a spot-check of the code the docs describe. Code claims were read from the files cited. Anything not read is marked "unverified".

## Facts

### Documents and their state

- The user guide is `help/documentation/10-tasks-and-todoist.md` (146 lines). It promises: Cmd+Shift+T opens the view (line 11, unverified); tasks are grouped by file and sorted by file modification date (line 13); all status markers `[ ] [x] [/] [-] [?] [>] [!]` (lines 37-45); Obsidian-style emoji metadata for dates, priority, recurrence, id, depends-on and action (lines 53-81); three filters, Date / Hide completed / Section filter with default `#to-list` (lines 97-103); click checkbox writes to the file (line 109); Todoist setup, sync button, cloud icon, Send popover with project, section and priority, completion badge (lines 116-138).
- `docs/FEATURES.md:46` lists Tasks as "an aggregated view with custom statuses and Todoist sync". It is the only FEATURES line for tasks.
- There is no `CONTEXT.md` anywhere in the repo (`find` for `CONTEXT*.md` returned nothing). `docs/agents/domain.md:7,18` expects one at the root and says to create it lazily. So the glossary does not exist, and no domain term for "task", "section", "source" or "sent task" is defined.
- No ADR covers the Tasks view or Todoist integration. The grep of `docs/adr/*.md` for task/todoist returns only incidental hits: ADR-0003:66 (lists `tasks` as a feature folder), ADR-0009:11 and ADR-0020:21 (name `fileTasksIndex` as a frontend index), ADR-0025:11-155 (moves tasks to Rust, with a broken link at :60-61 to `tasks/todo/performance-architecture-refactor.md`), ADR-0016:4-115 (plan-mode workflow, `tasks/` folder is gone), ADR-0035:30 ("as Todoist already does" scoped plugin permission for network).
- ADR-0009 and ADR-0020 are stale for tasks: they list `fileTasksIndex` as in-memory TS state, while `docs/agents/indexing-watcher-rules.md:3` says the TS side mirrors nothing and every task read goes through `get_all_tasks_v2` / `get_tasks_in_section_v2`.

### Architecture ADRs that constrain the design

- ADR-0003 (`docs/adr/0003-four-layer-source-taxonomy.md:66-95`): `features/` may import `core/`, `utils/` and other features while no cycle forms. `plugins/` may not be imported by features. A new rule engine belongs in `features/tasks/` or `core/`, and must not import a plugin (e.g. `queryjs`, `kanban`). Current `features/tasks` imports only `core/` (`tasks.service.ts:3-5`, `todoist.service.ts:3-4`, `TasksView.svelte:15-19`), so the layer rules are clean today.
- ADR-0003 amendment (`:9-18`, `:37`): new `app/` composition root. Wiring between Tasks and other layers goes through `src/lib/app/` or a register function.
- ADR-0034 (`docs/adr/0034-derived-allowed-behind-store-getters.md:22-38`): a store getter may return a module-level `$derived` for costly computation. Every computed getter needs a test (`:38`). A rule-filtered task list is a candidate for this. The fixture is `src/tests/fixtures/derived-sync.svelte.ts`.
- ADR-0005 is superseded by ADR-0034 (`:52`). Any older text saying "no `$derived` in stores" is wrong.
- Indexing rules (`docs/agents/indexing-watcher-rules.md`), binding on any Tasks change:
  - Rule 1 (`:3`): tasks are read only through `*_v2` Rust commands. A new source-rule query must be a Rust command, not a TS filter over a mirror.
  - Rule 2 (`:5`): panels refetch on `vaultStore.vaultIndexVersion`. `TasksView.svelte:78-83` does this.
  - Rule 9 (`:25`): absolute paths only in IPC params and results.
  - Rule 12 (`:31`): the version bump is throttled (about 2 s after an isolated event, at most once per 10 s in a burst). A rule edit that writes a note shows up in the view only after the throttle, unless a refetch is forced.
  - Rule 12 also says QueryJS `kb.pages().file.tasks` comes from `entry.tasks` (`:31`). Tasks view and QueryJS must agree on the task model.
- ADR-0025 (Rust vault index): tasks live in `VaultIndex` (`src-tauri/src/vault/index.rs`). `index.rs:1060-1075` builds grouped tasks sorted by `modified_at` descending.

### Code behaviour, checked against the docs

- Date filter: buttons at `TasksView.svelte:107-117`. The filter is on FILE `modifiedAt`, not on a task's due or scheduled date (`tasks.logic.ts:73-87`). The doc says only "Filter tasks by date" (`help/...:99`). That is a gap: a due date is never used.
- Sort: the doc's "sorted by file modification date" is verified. `src-tauri/src/commands/vault.rs:643,723` and `index.rs:1075` sort by `modified_at` descending. The Svelte view applies no sort (grep for `sort` in `features/tasks` is empty).
- Section filter: `tasks.store.svelte.ts:8` default `'#to-list'`, reset at `:30`. The input is at `TasksView.svelte:154-163` with placeholder "section tag". Non-empty tag routes to `get_tasks_in_section_v2` (`tasks.service.ts:68-71`). The Rust side is heading-based: `parsing.rs:1701-1749`. A task counts only if it sits under a heading whose text contains the tag, substring match. The section ends at the next heading of level equal or higher. A `#` is prepended when missing (`:1709-1713`). The doc says "heading/section tag" (`help:101`) but not that it is heading-scoped, substring-matched, or that the default hides every task outside a `#to-list` heading.
- Cost of that default: `tasks.service.ts:88-92` says a non-empty tag re-reads from disk every note with tasks, on a blocking thread. The default is non-empty, so every `vaultIndexVersion` bump and every toggle (`tasks.service.ts:100-107`) pays this scan. Not in the doc.
- Hide completed: toggle at `TasksView.svelte:121-134`. Whether it hides `[-]` and `[/]` as well is unverified (the filter logic was not read).
- Status model: the parser recognises all status characters (test `parsing.rs:2972` `extract_tasks_recognises_all_status_chars`). But `task.rs:25` defines `checked` as "status is anything other than todo", and `TasksView.svelte:209-218` renders only two states (circle or check with strikethrough). `[/]`, `[?]`, `[>]`, `[!]` and `[-]` look the same as `[x]`. The doc table (`help:37-45`) implies more states than the UI shows.
- Metadata: `TasksView.svelte` never renders dates, priority, recurrence or ids. Metadata reaches the UI only in `TodoistPopover.svelte:63-65` (priority autopopulate) and `:123` (shows a block when dueDate, recurrence or tags exist). The doc (`help:51-89`) describes metadata as if it were visible.
- Toggle: `TasksView.svelte:66-68` calls `toggleTask`, which calls Rust `toggle_task_status` (`tasks.service.ts:100-107`). The doc says "click a checkbox" (`help:109`). The plain text is also a toggle target (`TasksView.svelte:215-219`), undocumented.
- File name click opens the file (`TasksView.svelte:62-64,183-188`). Matches the doc.
- Todoist gating: the sync button and the per-task send/cloud icons appear only when `settingsStore.todoist.apiToken` is non-empty (`TasksView.svelte:70,137,241`). Matches the doc's "once configured".
- Sync button: `TasksView.svelte:141-143`, calls `syncTodoistTasks` (`todoist.service.ts:250`). Manual only. Matches the doc's note (`help:135`).
- Sent-task load: `TasksView.svelte:72-74` calls `initTodoist` on mount. `todoist.service.ts:238-244` loads sent entries from disk. The doc does not mention this.
- Sent-task identity: `TasksView.svelte:242-244` uses `todoistStore.isSent(group.filePath, task.text)`. The key is file path plus the full task text. Editing the text (adding a date, changing a status marker in the text) orphans the link: the cloud icon disappears and the Send popover reappears, so a second send is possible. This follows from the code as read. The doc does not say so. Unverified in practice.
- Cloud icon and completion badge: `TasksView.svelte:246-263`. The completed state is a `CloudCheck` icon with title "Completed in Todoist", not a check mark badge as the doc says (`help:132`). Minor.
- Send icon: `TodoistPopover.svelte:114-116` (trigger, title "Send to Todoist") and `:220-232`. Matches the doc (`help:131`).
- Sync writes: `todoist.service.ts:246-249` says sync "updates the store + disk". The doc says only the status is refreshed (`help:129`). Unclear whether it writes to notes or only to a sent-tasks file. Unverified.
- Two-way sync: `help:137-138` says completion does not sync either way. The code (manual sync only) agrees.
- Todoist network access goes through a scoped plugin permission (`ADR-0035:30`, `src/lib/features/tasks/tauri-fetch-adapter.ts`).

## Problems and gaps

1. No glossary. `CONTEXT.md` is missing, so "task", "section", "source", "sent task", "status" and "filter" have no defined meaning. The Todoist "section" (a Todoist project section) and the Obsidian "section" (a Markdown heading) are both called "section" in the UI and the doc, and they mean different things.
2. The doc overstates the view. It lists statuses (`help:37-45`), metadata (`help:51-89`) and a "Date" filter without saying the UI shows two states, shows no metadata, and filters on file mtime.
3. The default section tag `#to-list` (`tasks.store.svelte.ts:8`) is undocumented in its effect. A new user sees "No tasks found" when no note has a `#to-list` heading. The doc's default line (`help:101`) gives no consequence.
4. The default tag makes every refresh a disk scan (`tasks.service.ts:88-92`). Any rule design should not default to a whole-vault disk read per toggle.
5. No ADR covers the Tasks view or the Todoist integration, so the sent-task identity (path + text, `TasksView.svelte:242`) and the manual sync model have no recorded decision.
6. ADR-0009 and ADR-0020 still describe `fileTasksIndex` as TS state (see Facts). ADR-0025 has a dead link to `tasks/todo/`. ADR-0016 references a `tasks/` tree that does not exist (confirmed: no `tasks/` at repo root).
7. The indexing rules forbid a TS mirror of task data (`indexing-watcher-rules.md:3`), so any rule engine must be either Rust-side or pure TS over the `get_all_tasks_v2` result. Keep that in mind when designing per-rule filters.
8. Any new `.logic.ts` must have no framework imports (`CLAUDE.md` Architecture Guidelines). Store getters over `$derived` need tests (ADR-0034).

## Ideas worth keeping

- Rules as data, evaluated in a pure `tasks.logic.ts`-style module, with the Rust `*_v2` command doing the source selection. This satisfies ADR-0003 (no plugin import), indexing rule 1 (no mirror), and makes each rule testable without mocks (CLAUDE.md "never mock logic files").
- Make the heading scope explicit in the UI: show the heading path for each task (the Rust parser already knows the heading, `parsing.rs:1705-1749`). Replace the free-text section input with a picker of real headings that exist in the vault.
- Show the real status (`TaskStatus` in `task.rs`) instead of `checked`, and show due and priority in the row. The data already exists in `TaskMetadata`.
- Filter on task dates (due, scheduled, start) instead of only file mtime. The parser already extracts them.
- Stable Todoist identity: add an id to the sent-task record and key on it, not on path plus text, so editing the text does not orphan the link. The doc's `🆔` task-id field (`help:79`) is a candidate source of a stable key, but the parser's handling of `🆔` is unverified.
- Keep the Todoist mapping in a pure module (priority and section mapping in `todoist-bridge.logic.ts`), with the SDK call in the service.
- Write a short ADR for the chosen source-rule model and the Todoist identity key, since none exists.

## Open questions

1. Does the owner want the section-tag concept kept as one of several rule kinds, or replaced entirely? The current default (`#to-list`) reads like the owner's own workflow; this is from the doc and code, not a stated requirement.
2. Does `hide completed` hide `[-]` and `[/]`, or only `[x]`? Needs a read of `tasks.logic.ts` (not done in this slice).
3. Does Todoist sync write to note files (`todoist.service.ts:246-249`), or only to a sent-task record? Needs a read of `syncTodoistTasks` in full.
4. Does `🆔` task id get parsed into `TaskMetadata` today? Unverified; `task-metadata.types.ts` was not read.
5. Is the Cmd+Shift+T shortcut and "Toggle Tasks View" palette entry real? Unverified; keybinding files not read.
6. Should the glossary be created now (`domain.md` says create lazily) as a prerequisite for the PRD, since the term collision (Obsidian heading section vs Todoist section) is already in the owner's own words?
7. The owner's Portuguese quote "creating specific rules for how tasks are picked up" implies rules that are user-authored. No doc or ADR describes a rule syntax; none exists yet.
