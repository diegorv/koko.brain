# 129: Todoist sync state on each row and as a quick filter

**Origin:** `tasks-view` Issue 23, moved here on 2026-11-08, then rewritten on 2026-11-10 by `todoist-bisync` Issue 15, which retired the one-way Send popover and the `todoist-sent.json` states (not sent, sent, possibly sent, closed) this ticket first showed. The two-way sync (`.scratch/todoist-bisync/`, ADR-0037) now owns every Todoist link. Corrected on 2026-11-12 by the deep dive (`.scratch/tasks-view-ux/research/deep-dive/SUMMARY.md` 129, `dossier-129+198+205.md`, `cross-tests-relay.md` H2, M7). Bare Issue numbers in the text below use this folder's numbering.

**What to build:** A Tasks view row whose line carries a Todoist anchor (the id signifier U+1F194 followed by `td-...`) shows its sync state, and a quick filter narrows the list by it. The states come from the sync's link table (`todoist_read_links`, `TodoistTaskLink` in `src/lib/contracts/generated/`) and its log (`todoist_read_log`) for the open vault. No IPC change: both commands exist, and the e2e mock answers them with empty lists.

- **Linked:** an attached link (`isDetached` false, `src/lib/features/todoist-sync/detach.logic.ts`) with a Todoist id.
- **Pending:** an attached link whose `todoistId` is still null (a brain-born task whose `item_add` is not acknowledged).
- **Frozen:** the link's `frozen` flag (two or more lines carry the anchor); the icon's name says why ("Frozen: this anchor is on more than one line").
- **Error:** decided at triage (proposal in Notes). The rule as first written, "newer than the link's last successful cycle", cannot be built: a link has no timestamp, `cycle` log rows carry `anchor: null`, and a cycle's error rows are logged before its own `cycle` row, by a cycle that still ends ok. The icon's name is a fixed message per kind, never raw error text.
- Any other row (no anchor, a detached link, an anchor with no link, a foreign id such as `task-001`) shows nothing.
- **Precedence** when several apply: frozen, error, pending, linked.

**State function** (pure, in `features/todoist-sync`, so `todoist-sync` never imports `tasks`)
- `src/lib/features/todoist-sync/row-state.logic.ts`, importing only contract types, `./detach.logic.js` and `./anchor.logic.js`:

  ```ts
  export type TodoistRowState = 'linked' | 'pending' | 'frozen' | 'error';
  export interface TodoistRowInfo {
  	state: TodoistRowState;
  	todoistId: string | null;
  	errorKind?: 'command-error' | 'content-not-pushed' | 'due-not-pushed';
  }
  export function buildTodoistRowStates(links: TodoistTaskLink[], log: TodoistSyncLogEntry[]): ReadonlyMap<string, TodoistRowInfo>; // keyed by anchor
  export function rowAnchor(metadataId: string | undefined): string | null; // a `td-` id longer than the prefix, else null
  export function todoistStateLabel(info: TodoistRowInfo): string;
  export function todoistTaskUrl(todoistId: string): string; // https://app.todoist.com/app/task/<id>
  ```

- The row's anchor is `rowAnchor(row.metadata.id)`. After Issue 244 rows come from the entries snapshot; check on the branch that `TaskRow` still carries `metadata.id`.
- Labels (proposal; change only with a reason in the delivery comment): linked "Synced with Todoist"; pending "Waiting to be created in Todoist"; frozen as above; error "Todoist refused the last change to this task" (`command-error`), "The task text was not sent to Todoist" (`content-not-pushed`), "The due date removal was not sent to Todoist" (`due-not-pushed`).

**State map in the Tasks feature**
- `tasksStore` holds the map as `$state.raw<ReadonlyMap<string, TodoistRowInfo>>`, replaced wholesale (a mutated `Map` does not notify), with a `todoistStates` getter and a setter; `reset()` empties it, and `resetTasks()` already runs on vault teardown, so nothing else is added there. The module-level `visibleRows` `$derived` reads it (ADR-0034: the getter gets a test that a map change recomputes it).
- `refreshTodoistStates()` in `tasks.service.ts`: with `settingsStore.todoist.syncEnabled` false, set an empty map and return; with `vaultStore.path` null or `!vaultStore.indexReady`, return without change; otherwise capture the vault path and a request counter, read `todoist_read_links` and `todoist_read_log` (no `limit`: up to 1000 rows, newest first) in one `Promise.all`, and drop the result when the counter moved or the vault changed. A failed read leaves the previous map, logs with `error('TASKS', ...)` and shows no toast. `resetTasks()` bumps the counter. Read once per call, never per row or per tasks refetch.
- `TasksView.svelte` refreshes from an `$effect` that reads `syncEnabled`, `vaultStore.path`, `vaultStore.indexReady` and `todoistSyncStore.status`, returns while the status is `'syncing'`, and calls `untrack(() => void refreshTodoistStates())`. So the map refreshes on mount, on a sync switch, on a vault switch and when a run ends, success or failure. Do not refresh on `vaultIndexVersion` bumps.

**Row and menu**
- The icon sits after the chips and before the actions button: `<span role="img" aria-label={label} title={label} data-todoist-state={state}>` around a lucide icon (`Link` linked, `Clock` pending, `Snowflake` frozen, `TriangleAlert` error), not focusable, toned with theme tokens only (`text-muted-foreground`, `text-warning`, `text-destructive`; Issue 236's palette check and Issue 198's test forbid palette classes). The state-to-icon map lives in the component: a lucide import in a `.logic.ts` fails `pure-logic.test.ts`.
- "Open in Todoist" joins Issue 241's shared row-menu item list (so both menus get it), with `ExternalLink class="size-4"`, shown when the row's info has a non-null `todoistId` (linked, frozen, error). It calls `openUrl(todoistTaskUrl(id))` from `@tauri-apps/plugin-opener`, as `TodoistSection.svelte` does.

**Quick filter**
- `export type TodoistFilter = 'any' | TodoistRowState`, and `todoist?: TodoistFilter` on Issue 111's `TaskQuickFilters` (absent means `'any'`; setters write `undefined`).
- `applyQuickFilters(rows, quick, today, now, states)`: the state map is the fifth argument (after Issue 238's four), so `task-query.logic.ts` stays pure; a row with no state never passes a non-`any` value; Issue 111's parent dimming applies as to every quick filter. `explainEmptyTasks` takes the map too and gains the stage "No task matches the Todoist filter" with `{ kind: 'resetQuick', field: 'todoist', label: 'Reset Todoist filter' }`, after Issue 239's search stage.
- `describeTaskRule` (Issue 116's `describeTaskQuery` if 116 has landed first; both run after 244, in either order) appends `, synced with Todoist`, `, synced with Todoist and pending`, `, synced with Todoist and frozen` or `, synced with Todoist and in error` after the tag and search parts.
- Issue 239's `isQuickFieldDefault` covers `todoist` (`QuickFilterField` gains `'todoist'`; absent equals `'any'`), so Reset filters and the `Filters (n)` count include it, and Reset restores `'any'`.
- The filter menu (a `DropdownMenu` radio group Any, Linked, Pending, Frozen, Error, trigger `Todoist: <value>`) shows only while `settingsStore.todoist.syncEnabled`, in the filter row and in the `Filters (n)` fold.
- Sync off: no fetch, no icons, no menu, and the view ignores `quick.todoist` (the list, the rule sentence and `Filters (n)` treat it as absent), so a value chosen while sync was on never empties the list.

**Architecture:** `features/tasks` may import `features/todoist-sync`; running `src/tests/lib/architecture/feature-cycle.test.ts` rewrites `feature-cycle-baseline.json` with the new acyclic pair `tasks -> todoist-sync`; commit that diff. `features/todoist-sync` must not import `features/tasks` (design.md Architecture).

**Blocked by:** 244

**Status:** needs-triage

**Answered:** owner, 2026-11-12: runs after Issue 244, never beside it or Issue 122 (deep-dive run order, SUMMARY X7). "Open in Todoist" is an item in Issue 241's row menu (2026-11-12). Still open: the error rule (deep-dive Q6), proposal in Notes; this Issue stays `needs-triage` until the owner decides.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`. No e2e: sync is off in the e2e vault and its mocks return no links, so no spec sees the icon or the filter.

Test mechanics: component tests go in a new `src/tests/lib/features/tasks/TasksView.todoist.test.ts`, built on Issue 110's `src/tests/fixtures/tasks.fixture.ts` (`mountTasksView`, `openMenu`, and `mockTaskFetch` to serve tasks; answer `todoist_read_links` and `todoist_read_log` by command name beside it). Real stores (`settingsStore.updateTodoist({ syncEnabled: true })`, `vaultStore.open(...)`, `vaultStore.bumpVaultIndexVersion(1)` to mark `indexReady`). Allowed boundary mocks besides `invoke`: `@tauri-apps/plugin-opener` (`openUrl: vi.fn()`, as `UpdateSection.layout.test.ts` does), `svelte-sonner`, and `#lib/utils/debug.js` or a `console.error` spy. Query icons by `[data-todoist-state]` and `aria-label`, not by SVG shape.

- [ ] Failing test first, `task-query.logic.test.ts`: with a map holding linked, pending, frozen and error anchors, `applyQuickFilters(rows, { show: 'all', todoist: 'frozen' }, today, now, states)` keeps only the frozen row; `'any'` and an absent `todoist` keep all; a row with no state never passes a non-`any` value; a failing parent above a passing child stays with `dimmed: true`.
- [ ] `row-state.logic.test.ts`: one test per state (linked, pending, frozen, and error for each of the three kinds); a detached link with a `command-error` row gives nothing; an anchor with no link, an undefined id and a foreign id give nothing; precedence when several apply; the newest log row per anchor wins.
- [ ] `task-query.logic.test.ts`: the rule sentence for each filter value; `isQuickFieldDefault` treats an absent `todoist` as `'any'`; the Todoist empty-state stage and its reset action.
- [ ] `tasks.store.test.ts`: `resetQuick()` and `reset()` clear `todoist` and the map; `visibleRows` recomputes when the map changes.
- [ ] `tasks.service.test.ts`: one refresh reads `todoist_read_links` and `todoist_read_log` once each; a refresh resolving after `resetTasks()` or a vault change does not write the store; a failed read keeps the previous map and logs through `error('TASKS', ...)`; with sync off nothing is read and the map is empty.
- [ ] `TasksView.todoist.test.ts`: choosing Todoist > Frozen lists only frozen rows, and each row's icon has the right accessible name; Reset filters is visible after a choice and restores Any; the `Filters (n)` count text includes it; with sync off there is no Todoist menu and no icon, and a `todoist` value set earlier hides no row.
- [ ] `TasksView.todoist.test.ts`: "Open in Todoist" on a linked row, in the button menu and in the right-click menu, calls `openUrl('https://app.todoist.com/app/task/<id>')`; a pending row and a row with no state have no such item.
- [ ] `feature-cycle-baseline.json` gains `tasks -> todoist-sync` and nothing else.
- [ ] `help/documentation/10-tasks-and-todoist.md` lists the row states, "Open in Todoist" and the filter.

## Notes

- **Size:** M.
- **Error rule, proposal for triage (deep-dive Q6, not decided):** the newest log row for the anchor, of any kind, decides: the row is in error when that row's kind is `command-error`, `content-not-pushed` or `due-not-pushed`. The error clears when a later row for that anchor is logged (`written`, `applied`, `stale`, `frozen`, `conflict` and the like) or when the link detaches. Known consequence: an error stays until another row for that anchor is logged or the 1000-row log drops it, since quiet cycles add no rows for an anchor. A terminal `item_add` refusal detaches the link, so it shows nothing.
- Run in series with the other Tasks view Issues (see 108). It edits `tasks.service.ts`, `tasks.store.svelte.ts`, `task-query.logic.ts`, `TasksView.svelte` and the row menu, as Issues 244, 122 (through 246) and 116 do; never run it beside them. relay-lite treats `needs-triage` as todo, so launch it only by number.
- `isQueryModified` (Issue 126) also treats an absent `todoist` as `'any'`; 126 already says so, and this Issue does not create that function.
- Names other Issues define, used here exactly: `mountTasksView`, `mockTaskFetch`, `openMenu` (Issue 110); `TaskQuickFilters`, `isQuickFieldDefault` (Issues 111 and 239); `applyQuickFilters` and its four arguments (Issue 238); the shared row-menu item list (Issue 241).
- Targeted checks include the source scans that read this feature: `src/tests/lib/pane-toolbar.test.ts`, `menu-item-anatomy.test.ts`, `chrome-type-scale.test.ts`, `chrome-state-styles.test.ts`, `src/tests/lib/architecture/{pure-logic,layer-rules,feature-cycle}.test.ts`, and Issue 236's `tasks-palette.test.ts` (or Issue 198's `palette-classes.test.ts` once it has replaced it).
- A brain-born line gains its anchor in a note write during a cycle, so for a moment its row shows no icon until the map refreshes at the end of the cycle.

## Comments


- 2026-11-12: blocker moved from 111, 113 to 241, the last Issue of the Tasks view chain, so this Issue never runs beside it on the same files. "Open in Todoist" goes in Issue 241's row menu, as a menu item, not as a separate row control. Still needs triage (its error rule).
- 2026-11-12: deep dive applied (SUMMARY 129, `dossier-129+198+205.md`, `cross-tests-relay.md` H2, M7). Blocked by 244 instead of 241, so it never runs beside the fetch move or 122. The error rule as written is not buildable; the Notes hold a proposal for triage. The `isQueryModified` criterion moved to Issue 126; this Issue extends Issue 239's `isQuickFieldDefault` instead. `TodoistFilter` on `TaskQuickFilters`, the state map as `applyQuickFilters`' fifth argument, precedence frozen, error, pending, linked, a fixed behavior with sync off, token-only icon tones, the state function's signatures, the refresh signal and its stale guards. Own test file on the shared fixture, allowed boundary mocks, source-scan checks.
- 2026-11-12: consistency review: the sentence part names Issue 116's `describeTaskQuery` as the target when 116 lands first (both follow 244, in either order); `QuickFilterField` gains `'todoist'`.
