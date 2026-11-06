# Scout 11: queryjs and tasks

Scope: `src/lib/plugins/queryjs/` (kb-api.ts, queryjs.logic.ts, kb-ui.ts) plus the contract, widget and Rust task structs they depend on. Read-only; no builds or tests run. Paths are relative to the repo root `/Users/diegorv/Dev/pet-projects/koko/brain`.

## Facts

**Task data reaching scripts**

- `page.file.tasks` exists. Type: `KBTaskV1 { text, completed, line, path }` at `src/lib/plugins/queryjs/contract/kb-api.v1.ts:40-49`. Listed on `KBPageFileV1` at `contract/kb-api.v1.ts:76`.
- Mapping happens in `buildKBPage`, `src/lib/plugins/queryjs/queryjs.logic.ts:125-130`: `text: t.text, completed: t.checked, line: t.lineNumber, path: record.path`. Status, indent and all `TaskMetadata` fields are dropped.
- The data is present upstream. Rust `NoteEntry.tasks: Vec<Task>` (`src-tauri/src/vault/entry.rs:185-187`, filled by `extract_tasks` at `entry.rs:249`). `Task` carries `status`, `indent`, and `metadata` (`src-tauri/src/vault/task.rs:22-35`). `TaskMetadata` (`task.rs` ~L82) has `description`, `due_date`, `scheduled_date`, `start_date`, `created_date`, `done_date`, `cancelled_date`, `priority`, `recurrence`, `id`, `depends_on`, `on_completion`, `tags`.
- The TS side re-exports these as `TaskV2`, `TaskMetadataV2` and friends (`src/lib/types/vault-v2.types.ts:21-40`), but `KBAPI` never exposes them.
- `checked` is lossy. `src-tauri/src/vault/parsing.rs:1633` and `:1650` set `checked: check_char != ' '`. Status mapping is at `parsing.rs:1591-1598`: `x`/`X` Done, `-` Cancelled, `/` InProgress, `?` Question, `>` Forwarded, `!` Important. So a Cancelled, InProgress, Question, Forwarded or Important task appears as `completed: true` in `kb.pages()`.
- The firewall test pins the exact shape: `src/tests/lib/plugins/queryjs/kbapi-firewall.test.ts:293-295`. Page-level task shape is also asserted in `src/tests/lib/plugins/queryjs/queryjs.logic.test.ts:284-320`.
- The firewall (`kbapi-firewall.test.ts:1-25`) forbids DTO names in the contract or KBAPI signatures. Exposing new task fields therefore needs a contract edit (a major version change per the comment at `contract/kb-api.v1.ts:79-87`).

**No task query API**

- No `kb.tasks`, `dv.tasks` or any task filter. `grep` over `src` and `docs` finds none.
- `parseSource` (`queryjs.logic.ts:180-202`) supports only `#tag` (with subtag prefix match) and `"folder"`/`'folder'`. `kb.pages(source)` cannot filter by task state.
- `KBAPI.pages()` (`src/lib/plugins/queryjs/kb-api.ts:118-131`) returns notes only, minus `.view` files, type definitions and the system folder (`kb-api.ts:468-479`). Pages are still list-able; you flatten tasks yourself.
- `KBUI` (`src/lib/plugins/queryjs/kb-ui.ts`) has no task method. Its methods: `cards` (107), `progressBar` (148), `tagCloud` (247), `tags` (295), `statusCards` (319), `timeline` (359), `heatmapCalendar` (682), `yearlyCalendar` (813). `grep -i task kb-ui.ts` returns nothing.
- `KBAPI.taskList(tasks)` (`kb-api.ts:348-367`) is a plain renderer: `<ul class="cm-lp-qjs-tasklist">` with disabled checkboxes, no link to the source file or line. Its type is at `contract/kb-api.v1.ts:698`.

**Script composition (what a user can write today)**

- A script can do `kb.pages('#x').flatMap(p => p.file.tasks)`. `DataArray` has `where`, `filter`, `map`, `flatMap`, `sort`, `sortBy`, `groupBy`, `distinct`, `limit`, `countBy`, `stats`, `join`, `forEach` (`src/lib/plugins/queryjs/data-array.ts:38-350`).
- `kb.table(headers, rows)` (`kb-api.ts:315-345`) and `kb.list` (`kb-api.ts:299-312`) can render the result. Cell values that are `KBLink` (`{path, display}`) become clickable and open the file (`kb-api.ts:488-512`). A task row can therefore link its file, but not its line.
- Missing from `KBLink`: no line anchor, so clicking does not jump to the task.

**Execution model**

- Scripts run via `new Function('kb', 'dv', wrappedCode)` (`kb-api.ts:413`) or the block wrapper at `kb-api.ts:551-555`. Only `kb`, `dv` and `input` are passed in. There is no Tauri `invoke` import in the query modules. Whether the global `window.__TAURI__` is reachable from script code is not verified.
- `kb.view(path)` loads an external `.js` from the vault (`kb-api.ts:381-421`). Path traversal is blocked at `kb-api.ts:526-538`.
- Errors are caught and rendered inline as `.cm-lp-qjs-error` (`kb-api.ts:415-419`).

**Inline block fence**

- A `` ```queryjs `` fence is detected by `findSpecialFenceBlocks(state, 'queryjs', '`')` (`src/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.ts:19-23`). Live-preview rendering goes through `queryjs-block-widget.ts`.
- The widget builds `KBAPI` at `queryjs-block-widget.ts:243-256`. Inputs: `getVaultEntries()` (the Rust snapshot, one IPC per index version), `collectionStore.propertyIndex`, `vaultStore.path`, `settingsStore.templates.systemFolder`, `loadExternalScript`. Then `runQueryjsBlock` at `queryjs-block-widget.ts:256`.
- Comment at `queryjs-block-widget.ts:240` confirms the snapshot "covers tags / tasks / outgoing links".

**Caching and cost**

- `ensureCache` (`kb-api.ts:431-485`) rebuilds all pages (`buildKBPage` for every property-index key, `kb-api.ts:452-463`) when the entries array identity, `collectionStore.version`, or system folder changes. One module-level slot is shared (`kb-api.ts:39-48`).
- Any note save that changes the entries snapshot invalidates the set for every block. Cost is O(N) per index version. Measured figure in comments: ~1 s cold on a 1870-note vault, before the O(N) resolution cache (`kb-api.ts:446-450`). Current timing is logged as `QJS-PROFILE` (`kb-api.ts:483`). Not measured by me.

**Tasks feature (for contrast)**

- The Tasks view does not use queryjs. It calls `get_all_tasks_v2` or `get_tasks_in_section_v2` (`src/lib/features/tasks/tasks.service.ts:65-71`), so it sees the full `Task` with status and metadata, and its own filters.
- `src/lib/features/collection/CollectionView.svelte` contains a "task" string (line range not checked). I did not read the collection block; from memory it is a separate declarative inline block (`collection-block-widget.ts`), which may be a closer model for a task block than queryjs.

## Problems and gaps

1. **`completed` is wrong for five of seven statuses.** `KBTask.completed` is `status != todo`, so Cancelled, InProgress, Question, Forwarded and Important all read as done in every script (`parsing.rs:1633`, `queryjs.logic.ts:127`).
2. **Metadata is dropped.** Due, scheduled, start, priority, recurrence, id, dependencies, tags: none reach scripts. Any "task query" by due date or priority needs a contract change (`queryjs.logic.ts:125-130`, `contract/kb-api.v1.ts:40-49`).
3. **No task-level filter.** `parseSource` works on pages, not tasks. Filtering tasks by tag, status or date means client-side flatMap in every script.
4. **No line-level navigation.** `KBLink` has no line field, so a task row cannot jump to the task (`contract/kb-api.v1.ts:32-37`).
5. **`taskList` is display-only.** Checkboxes are `disabled` (`kb-api.ts:357`), so a query block cannot toggle tasks. Toggling exists in the Tasks view (`tasks.service.ts`, `ToggleTaskResult` in vault-v2.types.ts), but no path connects a query block to it.
6. **Full page rebuild on any index change.** `ensureCache` rebuilds every page, not only pages whose entries changed (`kb-api.ts:431-441`). A query block watching all tasks re-runs on every save across the vault (from code reading).
7. **Owner-facing UX is script-only.** The owner has to write JS in a fence to get any task query. There is no declarative task block, which fits the owner's complaint about rules being hard to specify.
8. **Sent-task identity.** Todoist identity uses filePath + text (per the brief). `KBTask` exposes `path` + `text` + `line`, so the same key is available, but `line` changes on edit, so the key is unstable across edits. Not verified against Todoist code (outside my slice).

## Ideas worth keeping

- Keep the firewall pattern (`kbapi-firewall.test.ts`). A `KBTaskV2` with `status`, `priority`, `dueDate`, `scheduledDate`, `tags` added in a new contract version avoids leaking DTO names.
- Reuse `DataArray` for a task query result. `flatMap`, `groupBy`, `stats`, `countBy` already cover grouping and aggregation for a view.
- A declarative `tasks` fence, parsed like `queryjs` (`findSpecialFenceBlocks`), could compile YAML-ish rules (source = pages filter, where = status/tag/date, group = file/tag/date, sort) into the same `TaskMetadata` filter the Tasks view already uses (`tasks.logic.ts`: `filterCompletedTasks`, `filterByDate`, `computeTaskStats`). Shared pure logic keeps behavior in one place.
- Add a `line` anchor to `KBLink` (or a `KBTask` link) so a task row can open the file at the line.
- Use the existing `taskList` and `kb.table` renderers as the first output shape before building a new UI.
- Use `ensureCache` keying as the model for a task index: key on entries identity, rebuild only when tasks change.

## Open questions

1. Should a task block be a new fence type (`tasks`), a `queryjs` helper, or a collection-style declarative block? Collection block (`src/lib/features/collection/collection-block-widget.ts`) not read; check before deciding.
2. Is `window.__TAURI__` or any `invoke` reachable from `new Function` script bodies? Not verified. If yes, scripts can already call `get_all_tasks_v2` directly, bypassing the contract.
3. Should `completed` stay boolean with a `status` field added, or be dropped in favor of status? Changing `completed` silently changes every existing script.
4. Does toggling a task from a rendered block need the same write path as the Tasks view (`ToggleTaskResult`), and does it bump the entries snapshot?
5. Performance of `ensureCache` at the owner's vault size is unmeasured. Check `QJS-PROFILE` logs before adding a task index.
6. Which tests cover `ensureCache` invalidation on task-only edits? Not checked (`src/tests/lib/plugins/queryjs/kb-api.test.ts` exists).
