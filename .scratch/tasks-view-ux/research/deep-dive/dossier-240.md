# Dossier: Issue 240, Tasks groups collapse and stay collapsed, and long groups show 50 rows

Ticket: `.scratch/open-itens/issues/240-tasks-collapse-groups-and-row-cap.md`. HEAD when read: `d2304ac9e` (main). Tabs for indentation everywhere (CLAUDE.md).

Legend: VERIFIED = read in code/docs at the cited `path:line` at HEAD. INFERRED = derived from a predecessor ticket text (108, 242, 110, 234, 236, 109, 111, 238, 239, 113, 112 have not landed, so every "after predecessors" statement is inference). Nothing was run (read-only task).

Chain: 108 -> 242 -> 110 -> 234 -> 236 -> 109 -> 111 -> 238 -> 239 -> 113 -> 112 -> **240** -> 241 -> 115. 240 is blocked by 112 only, but 112 is blocked by 113, which owns the keyboard model 240 amends. 240 needs the landed shapes of 112 (`groups`, `group`) and 113 (roving focus, current row). Neither has a dossier; section 1.3 reconstructs both from the tickets and says what to re-read.

---

## 0. Headline findings (read first)

1. **The ticket cannot be implemented from HEAD alone.** `TasksView.svelte` today (223 lines) has no groups model, no roving focus, no `currentRow`, no `groups` getter. Step 0 of the plan is a mandatory re-read of the landed 112 and 113 code; names below marked INFERRED may differ.
2. **"Clicking a chevron focuses that chevron, as any button click does" is false in WebKit.** The app runs in Tauri's macOS webview (WebKit). MDN, "Clicking and focus": "Most browsers do give focus to a button being clicked, but Safari does not, by design" (https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button, fetched; the page does not name macOS or WKWebView, so the WKWebView step is inference). jsdom's `click()` does not focus either. Consequence: no code is needed for the statement ("ArrowDown from a chevron is not handled" holds either way), but no test may rely on the chevron holding focus after a click, and the manual check must use Tab + Enter, not the mouse.
3. **The single most error-prone piece is the "effective current row".** Three places consume the current row (roving `tabindex="0"`, focus on open, 113's "focus follows after a refetch removes the row"). All three must read one derived value, not `tasksStore.currentRow` directly, or a collapsed/capped current row leaves the list with no tab stop. Put the rule in a pure function (section 3, step 3).
4. **Two of the ticket's tests are not red for the reason they name.** The ArrowDown-skips-collapsed test and the "tabindex on the next rendered row" test fail today only because the chevron does not exist; if 113's handler counts DOM rows, the skipping is free once collapsed rows leave the DOM. They are regression guards for the rendered-set derivation. Say so in the commit.
5. **Remount interacts with 234's scroll restore.** The cap resets on remount (view-local state), the collapsed set does not. A user who revealed 200 rows and scrolled deep returns to a 50-row group, so the saved `scrollTop` clamps. Accepted by the ticket's own rule; name it in the delivery.

---

## 1. Code map

### 1.1 Files 240 edits

| File | HEAD location | What 240 does |
|---|---|---|
| `src/lib/features/tasks/tasks.store.svelte.ts` | state `:3-12`, getters `:14-19`, setters `:21-25`, `reset()` `:27-33` | Add `collapsedGroups` state, getter, toggle method, cleared in `reset()`. Precedent for a replaced-not-mutated set: `$state.raw<Set<string>>(new Set())` in `src/lib/features/event-calendar/event-calendar.store.svelte.ts:42` (reassign on write). No `SvelteSet` anywhere in `src/lib` (grep empty). |
| `src/lib/features/tasks/TasksView.svelte` | group `{#each}` `:149`, header `:152-165`, task `{#each}` `:169`, row `:172-214`, root `:90`, `ScrollArea` `:137`, mount effect `:73-78` | Chevron in every group header; render rows only when not collapsed; slice to 50; "Show N more" outside the list container; effective-current-row derivation feeding tabindex and focus. Every line number here shifts after 108..112; re-read. |
| `src/lib/features/tasks/tasks-keys.logic.ts` (created by 113, INFERRED) or `task-query.logic.ts` (111) | n/a | Add pure `resolveRovingRow(...)` and the `GROUP_ROW_CAP = 50` constant. `.logic.ts` rules: no framework/store/service imports (`src/tests/lib/architecture/pure-logic.test.ts:30-58`). |
| `help/documentation/10-tasks-and-todoist.md` | "Interacting with Tasks" `:109`, bullets `:111-113`; "Filters" `:95` | Add a bullet about collapsing and the 50-row cap (PRD A12). 112 will have rewritten the grouping sentence at `:13`; do not touch it. |

Not touched: `tasks.service.ts` (`resetTasks` `:227-231` already calls `tasksStore.reset()` `:229`; `buildTaskIndex` `:65-86`), Rust, IPC DTOs, `commands.ts`, e2e mocks, `layer-baseline.json`, `feature-cycle-baseline.json` (no new cross-feature import: lucide `ChevronRight`, in-feature modules only).

### 1.2 Reused code (VERIFIED)

- Chevron recipe: `src/lib/features/rail-shell/FilesNavigator.svelte:4` (`import ChevronRight from '@lucide/svelte/icons/chevron-right'`) and `:455-466`: `<button type="button" aria-label={open ? \`Collapse ${node.name}\` : \`Expand ${node.name}\`} aria-expanded={open}>` with `<ChevronRight class="size-3.5 transition-transform {open ? 'rotate-90' : ''}" />`. Same label wording as the ticket. `chevron-right.svelte` and `chevron-down.svelte` exist in `node_modules/@lucide/svelte/dist/icons/`.
- Remount persistence fact: `EditorView.svelte:72-73` renders `<TasksView>` inside `{#if isTasksTab}` (VERIFIED), so state must live in the module store. `tasksStore` is module-level `$state` (`tasks.store.svelte.ts`), so it survives.
- Vault switch: `app-lifecycle.service.ts` calls `resetTasks()` inside the teardown sequence (VERIFIED in the 645-670 listing), and `resetTasks` calls `tasksStore.reset()` (`tasks.service.ts:229`). So "reset clears them" needs only the `reset()` edit.
- Style scans that new markup must pass (VERIFIED headers): `chrome-state-styles.test.ts` (no `transition-all`, no `hover:scale`; `group-hover:opacity-100` needs a focus twin), `chrome-type-scale.test.ts` (text floor 11 px, so no `text-[10px]`), `radius-scale.test.ts` (bare `rounded` and `rounded-[..]` are ratcheted; use `rounded-md`/`rounded-xs`), `pane-toolbar.test.ts` (the header is not a toolbar). 236's palette guard (when landed) forbids raw palette classes: use `text-muted-foreground`, `hover:bg-accent`, `focus-visible:ring-ring/50`.

### 1.3 What predecessors will have changed (INFERRED, re-read before editing)

- **112** (`groups`): `tasksStore.group` (`'note'|'folder'|'due'|'priority'|'status'`), `setGroup`, `sort`, and a `groups` getter over a module-level `$derived` returning `{ key, label, rows, count }[]` (note groups also `total`). Keys: note = `filePath`; folder = the folder string (`''` for root, label `Vault root`); due/priority/status keys are not specified (the ticket's example `due:overdue` suggests lowercase slugs). Rows keyed `filePath:lineNumber`. Flat groups drop dimmed rows; note groups keep them.
- **113**: `tasks-keys.logic.ts` with `resolveTaskKey`; `tasksStore` current row `{ filePath, lineNumber } | null` with getter/setter (names INFERRED: `currentRow`, `setCurrentRow`), set on row focus, cleared in `reset()`; a single `keydown` on the list container with `onRow = target has data-task-row`; row `tabindex` 0/-1 plus controls inside; each group's row container `role="list"` + `aria-label`; rows `role="listitem"`; focus-on-open effect (only while `document.activeElement` is body or inside the view; `focus({ preventScroll: true })` after 234's restore); "current becomes next surviving, else previous" after a refetch.
- **234**: `tasksStore.scrollOffset`, `error`; `viewportRef` bound; reset generation export.
- **236**: note header anatomy (icon, title button, subtitle, "N of M open"); `data-task-group*` hooks are a dossier-236 suggestion, not the ticket.
- **110**: row hooks `data-task-row`, `data-task-toggle`, `data-task-status`, `data-task-text`; shared fixture builder in `src/tests/lib/features/tasks/` (file name unknown; dossier-110 suggests `tasks.fixture.ts`).
- **111/238/239**: `rows`, `quick`, `visibleRows`; filter row; toolbar; `Display` menu comes with 112.

### 1.4 Names 240 introduces (chosen here; later tickets only say "collapsed keys in the Tasks store")

- Store: `collapsedGroups` getter returning `ReadonlySet<string>`; `toggleGroupCollapsed(key: string)`; `reset()` assigns a fresh empty set. Key built as `${group}:${groupKey}` (`note:/vault/A.md`, `due:overdue`). Build it in one helper (e.g. `collapseKey(group, key)` in `task-query.logic.ts`) so view and tests share it.
- View-local: `let revealed = $state.raw<ReadonlySet<string>>(new Set())` (same key string), plus the derived `layout` below.
- Logic: `GROUP_ROW_CAP = 50`; `resolveRovingRow(allRows, renderedRows, current)`.

---

## 2. Acceptance criteria to tests

Conventions: real `tasksStore`, `editorStore`, `vaultStore`; mock only `@tauri-apps/api/core` `invoke`, `plugin-fs` (as `TasksView.test.ts:17-19` does). `TasksView.test.ts` starts with `mountView` (`:77-92`) that builds one task; 240 needs multi-note and 60-task fixtures, so use 110's shared builder (extend minimally if it builds one note only). Keys events: `row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))`. Unmount with `unmount(component)` then `mount` again into the same target (the store keeps rows, so rows render at once; poll with `vi.waitFor` + `flushSync` as the file does).

| # | Ticket criterion | Test file and shape | Red today? |
|---|---|---|---|
| 1 | Collapsing a note group hides its rows, sets `aria-expanded="false"`; unmount + mount: still collapsed | `TasksView.test.ts`: two notes A, B. Find `button[aria-label="Collapse B"]`, assert `aria-expanded="true"`, click, `flushSync`, assert B's rows gone from the DOM (`[data-task-row]` count), button now `aria-label="Expand B"` and `aria-expanded="false"`, A's rows intact, title button still opens the note. `unmount`, `mount`: B still collapsed. Add: `tasksStore.collapsedGroups.has('note:/vault/B.md')`. | Yes, the button does not exist. Real regression value: the remount half proves the state is in the store (a component-local `$state` would pass the first half and fail the second). |
| 2 | ArrowDown from the last row above a collapsed group lands on the first row after it | Notes A (1 task), B (2 tasks, collapsed), C (1 task). Focus A's row, ArrowDown, `document.activeElement` is C's row. Also ArrowUp from C lands on A. | Red only because of the missing chevron (finding 4). |
| 3a | Current row in a group then collapsed; unmount + mount: the first rendered row after it has `tabindex="0"` and focus | Notes A, B (b1, b2), C. `tasksStore.setCurrentRow({ filePath: B, lineNumber: b1 })` (or focus b1, which 113 records), click "Collapse B", unmount, mount. Assert C's first row `tabindex="0"`, every other row `-1`, `document.activeElement` is that row. Variant: B is the last group, so the last rendered row (A's) gets it. | Red (no chevron). |
| 3b | Current row at position 55 of a capped group, same after remount | One note, 60 tasks, current = task 55 (line 55). Mount: row 50 (last rendered) holds `tabindex="0"` and focus. Variant with a second note after it: that note's first row. | Red for real: today no cap and no roving. |
| 3c | (added) No row rendered: focus goes to the first group's chevron | Collapse the only group, current row set, unmount, mount: `document.activeElement` is that chevron. | Red. |
| 4 | 60 tasks: 50 rows and "Show 10 more"; click shows 60 | One note, 60 tasks. `[data-task-row]` count 50; button named `Show 10 more`; `button.closest('[role="list"]')` is null; click, 60 rows, button gone. Boundaries: 50 tasks no button; 51 tasks `Show 1 more`. Remount: back to 50 (local state). Rows 1..50 are the first 50 in document order. | Red. |
| 5 | Store: getter, toggle, `reset()` | `tasks.store.test.ts` (node env, `:9-15` defaults, `:43-57` reset): default empty; toggle adds; toggle again removes; two keys independent; `reset()` clears; the getter returns the new set after a toggle (reactivity by reassign). | Red (members missing). |
| 6 | Help doc | no test reads it (grep of `src`, `e2e`, `scripts` for `10-tasks-and-todoist`: empty). Edit only. | n/a |

Extra tests worth adding (small):
- `tasks-keys.logic.test.ts` (or `task-query.logic.test.ts`): `resolveRovingRow` cases: current rendered -> itself; current hidden with later rendered rows -> first later rendered; hidden, none later -> last rendered; current null or absent from `allRows` -> first rendered; nothing rendered -> null. These carry the real logic; the component tests then only prove wiring.
- Grouping isolation: collapse "Overdue" under `due`, `setGroup('note')`: nothing collapsed; back to `due`: still collapsed (key includes the grouping). Needs 112's `setGroup`.
- Collapsed header still shows its count ("N of M open") and the toolbar count (111) is unchanged by collapse and cap.
- `resetTasks()` while mounted expands everything (store reset).

Existing tests that change: none expected. `TasksView.test.ts` row-click tests use `[data-task-row]` hooks (post-110) and one task, far below the cap and uncollapsed. A new chevron `<button>` is inside the group header, not inside `[data-task-row]`, so selectors like `[data-task-row] button` are unaffected. Check that no 113/241 test queries `document.querySelector('button')` unscoped.

E2E (ticket gate excludes e2e; read for selector risk, VERIFIED `e2e/specs/tasks-view.spec.ts`): locators are `getByRole('textbox', {name: /section tag/i})` `:20`, `[data-task-row]` + `getByRole('button', {name:'Mark task as done'})` `:52-54` (row scoped), `getByRole('button', { name: 'Welcome', exact: true })` `:106` (exact, so `Collapse Links` does not match), `[data-slot="scroll-area-viewport"]` `:75`. The fixture vault has 3 tasks in one note, far below 50. No e2e change needed.

---

## 3. Implementation plan (one context window, test first)

0. **Read the landed code** (branch state): `TasksView.svelte`, `tasks.store.svelte.ts`, `tasks-keys.logic.ts`, `task-query.logic.ts`, the shared test fixture, and the 113 focus/keydown code. Record: group key format per grouping, the name of the current-row getter/setter, whether the keydown handler derives `index/count` from the DOM or from an array, where the focus-on-open effect lives.
1. **Store (red, green).** Extend `tasks.store.test.ts` (criterion 5), see it fail. Add to `tasks.store.svelte.ts`: `let collapsedGroups = $state.raw<ReadonlySet<string>>(new Set());` getter; `toggleGroupCollapsed(key)` reassigning a copy; `reset()` sets a new empty set. JSDoc on every member (CLAUDE.md). Document "session only; Issue 123 decides persistence".
2. **Pure rule (red, green).** Write the `resolveRovingRow` tests, then implement. Signature suggestion: `resolveRovingRow(all: RowRef[], rendered: RowRef[], current: RowRef | null): RowRef | null` with `RowRef = { filePath: string; lineNumber: number }`. Algorithm: if `rendered` is empty return null; if `current` is in `rendered`, return it; find `i` = index of `current` in `all`; if found, return the first element of `rendered` whose index in `all` is greater than `i`, else the last of `rendered`; if not found (null/absent), return `rendered[0]`. Build `all` and `rendered` in one pass so each carries its `all` index (avoid O(n^2) `indexOf`). Export `GROUP_ROW_CAP = 50`.
3. **View component tests (red).** Write criteria 1, 2, 3a, 3b, 3c, 4 in a new describe. Confirm each is red for the stated reason before step 4.
4. **View edits**, in this order:
   a. Imports: `ChevronRight`, `GROUP_ROW_CAP`, `resolveRovingRow`.
   b. Local `revealed` state and a `toggleReveal(key)`; derive `layout = $derived.by(...)` over `tasksStore.groups`, `tasksStore.group`, `tasksStore.collapsedGroups`, `revealed`: per group, `collapsed`, `shown = collapsed ? [] : (revealed.has(key) ? rows : rows.slice(0, GROUP_ROW_CAP))`, `hidden = collapsed ? 0 : rows.length - shown.length`; plus the flat `all` and `rendered` arrays. Reading stores in a `$derived` is fine; do not call services in an `$effect` without `untrack()` (CLAUDE.md rule 2).
   c. Header: first child is the chevron button (`type="button"`, `aria-expanded={!collapsed}`, `aria-label={collapsed ? \`Expand ${label}\` : \`Collapse ${label}\`}`, `onclick` -> `tasksStore.toggleGroupCollapsed(key)`), then the existing header content. The title button for note groups keeps `handleFileClick`.
   d. Body: `{#if !collapsed}` wrapping the `role="list"` container (113) with `{#each shown ...}` and, after the container closes, `{#if hidden > 0}<button type="button" onclick={() => toggleReveal(key)}>Show {hidden} more</button>{/if}`. Collapsed groups must leave the DOM (not `hidden`/`display:none`), or "rendered rows only" and the tests break.
   e. Replace every read of `tasksStore.currentRow` for tabindex and focus targets with `effectiveRow = $derived(resolveRovingRow(layout.all, layout.rendered, tasksStore.currentRow))`: row `tabindex` (0 only for the effective row, controls inside likewise), the focus-on-open effect (target = effective row, else the first group's chevron when `layout.rendered` is empty but groups exist, else nothing), and 113's post-refetch focus-follow. Do not write the effective row back to the store (see ambiguity 5).
   f. Keydown: if 113 computes `index/count` from an array, switch it to `layout.rendered`; if from `querySelectorAll('[data-task-row]')`, no change. Chevron and "Show more" buttons are not `[data-task-row]`, so `onRow` is false and the handler returns null (ArrowDown on a chevron unhandled, Space/Enter keep their native click).
   g. Styling: chevron `shrink-0 rounded-xs p-0.5 text-muted-foreground hover:bg-accent outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`, icon `size-3.5 transition-transform {collapsed ? '' : 'rotate-90'}`; "Show more" as a muted `text-xs` underlined-on-hover button with the same focus ring. Tokens only.
5. **Help doc.** Add one bullet under "Interacting with Tasks" (`:109-113`): groups collapse with the chevron and stay collapsed while you switch tabs (not across restarts); a group shows its first 50 tasks with "Show N more".
6. **Gate:** `pnpm check` + `pnpm vitest run` (full; includes `layer-rules`, `feature-cycle`, `pure-logic`, `pane-toolbar`, style scans). No cargo, no e2e (ticket Gate). One heavy job at a time.
7. **Commit** with the full Context/Problem/Solution/Behavior/Files format; stage specific files; `git diff --cached --stat`. A `feat:` with source and tests together passes the hook.

---

## 4. Ambiguities (most likely intended reading)

1. **Group key per grouping.** Ticket: "keyed by grouping and group key (for example `note:<filePath>`, `due:overdue`)". Reading: `${tasksStore.group}:${group.key}` using 112's `key`. If 112's due keys are display labels (`Overdue`), the example is just illustrative; any stable unique key works. Folder root has key `''`, giving `folder:`; fine.
2. **What "N" counts.** "N = the remaining count" of "rows". Reading: `group.rows.length - 50`, rendered rows including dimmed parents in note groups, not `group.count` (which excludes dimmed). The header count still shows `count`/"N of M open". A group of 51 rows reads "Show 1 more"; no minimum.
3. **Reveal state key and lifetime.** "Local to the view; resets when it remounts." Reading: a component-level set keyed by the same collapse key; it survives collapse/expand, refetches and regrouping while mounted; no store field.
4. **"First rendered row after it".** Order = the full flattened order of all groups' rows including collapsed and capped ones. Current absent from that list entirely (null, or its row no longer exists): 113's rule (first row; refetch removal) applies, not 240's.
5. **Does the fallback write the store?** Reading: no ("stays a `{ filePath, lineNumber }`"), but 113 sets the current row when a row gets focus, so after focus lands on the fallback row the store holds it. Expanding the old group later therefore does not return to the old row. Acceptable; unspecified.
6. **Tab stops.** Chevrons and note title buttons are ordinary tab stops (only rows are roved). With many groups Tab walks all headers. The ticket does not rove them. Leave as is; mention in the delivery.
7. **Focus after "Show N more".** The button unmounts on click, so focus falls to `<body>`. The ticket is silent. Reading: do nothing extra (CLAUDE.md "no features beyond asked"); optionally move focus to the first newly revealed row. Raise to the owner; it is a small a11y gap, not a test criterion.
8. **Non-note headers.** Label is plain text (no button) with count; the chevron is the only interactive element. "The title button still opens the note" applies to note groups only.
9. **`aria-controls`.** Not requested; omit (it would point at a removed element when collapsed).
10. **Duplicate labels.** Two notes with the same title give two `Collapse <title>` buttons; tests use unique titles, the UI does not disambiguate. Not in scope.
11. **Chevron before or after the file icon.** "starts with a chevron" = first child of the header.
12. **Collapsed group under active filters.** Matching rows can be hidden inside a collapsed group while the toolbar count still includes them. Unspecified; accepted.

---

## 5. Risks

1. **Landed 113 may not tolerate unrendered current rows.** If its focus-follow or tabindex code indexes `rows[currentIndex]` and finds none, the list loses its tab stop. Mitigation: step 4e funnels everything through `effectiveRow`.
2. **Accidental `display:none` instead of `{#if}`** keeps rows in the DOM, so ArrowDown would focus invisible rows (focus on a `display:none` element silently fails). Use `{#if}`.
3. **Reactivity of the set.** Mutating a `Set` inside `$state.raw` does nothing; always reassign (precedent `event-calendar.store.svelte.ts:42,62`). Test the getter after a toggle (criterion 5).
4. **ADR-0034 / "every computed getter needs a test".** `collapsedGroups` is a plain getter over state (no `$derived`), covered by criterion 5. The view's `layout` and `effectiveRow` are component deriveds, outside the store rule; they are covered by criteria 2-4 and the logic tests.
5. **Scroll restore clamp (234).** Section 0 item 5. Also, collapsing/expanding changes content height under a saved `scrollTop`; the saved value is only rewritten on scroll events. Not checkable in jsdom; report "not checked in the app".
6. **Remount focus timing.** The focus-on-open effect runs on mount when rows exist; the collapsed/cap layout must already be derived by then (it is synchronous from store state). Use `vi.waitFor` + `flushSync` in tests.
7. **Row identity.** 111/112 rebuild row objects on each recompute; slice results are new arrays each time. Keys are `filePath:lineNumber`, so DOM and focus are preserved on refetch. A row crossing the 50 boundary (a row above is completed under Open) gains or loses its DOM node; if it held focus, 113's refetch rule moves focus.
8. **Cost.** Rendering is bounded by 50 per group, but groups are unbounded (thousands of notes with a task each, collapsed or not). PRD A9 accepts no virtualization; collapsing does not reduce the work of the `groups` derived (it still groups every row). Timing log is 112's `timeSync('TASK-PROFILE', ...)`.
9. **Layer/cycle/pure tests.** No new cross-feature import. `resolveRovingRow` must import nothing from stores or Svelte (pure-logic test). Style scans listed in 1.2.
10. **Later tickets.** 241 opens a per-row menu and returns focus to the row; if that row sits past the cap or in a collapsed group the effective-row rule applies. 115 rewrites the fetch but keeps `reset()` clearing collapsed groups (its text lists it). 123 may persist the set; keys use absolute paths, so renames orphan entries (persistence would need rename following). 116 may change group keys; whatever keys 112 produces remain the contract.
11. **Ticket claims vs code.** (a) "Clicking a chevron focuses that chevron" is contradicted for WebKit (finding 2). (b) "They survive the view's unmount and remount on tab activation": confirmed (`EditorView.svelte:72-73`, module store). (c) "`tasksStore.reset()` clears them, so a vault switch starts expanded": confirmed via `resetTasks` `tasks.service.ts:227-231` and the lifecycle teardown. (d) "PRD A9": confirmed, `.scratch/archived/tasks-view/PRD.md:129`. (e) The ticket says the button "sits outside the group's `role="list"` container": consistent with 113's per-group list container; nothing else to reconcile.
12. **Not checked:** the landed shapes of 112/113 (section 1.3); real WKWebView focus and scroll behavior; whether the chevron rotation looks right (CSS only); the 560 px container-query fold of 239/109 around the new header content.

---

## 6. Size

**S to M, as the ticket says; I would call it M** only because of test plumbing (multi-group fixtures, 60-task fixture, unmount/remount, focus assertions) and the dependency on 113's focus code. Source is roughly 40 lines in the view, 15 in the store, 25 in a logic file, 2 doc lines. Fits one context window if the implementer reads only: the landed `TasksView.svelte`, store, `tasks-keys.logic.ts`, `task-query.logic.ts`, the shared fixture, `TasksView.test.ts`, and `FilesNavigator.svelte:455-466`. The failure mode to avoid is re-deriving 113's keyboard model instead of routing it through one `effectiveRow`.
