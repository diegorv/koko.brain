# Validated 06: scouts 11 (Todoist interplay) and 12 (keyboard and a11y)

Adversarial check of `scout-11-todoist-sync-interplay.md` and `scout-12-keyboard-a11y.md` at the current `main`. Every claim below was re-read in code. Read-only: nothing was run (no tests, no app, no cargo). Facts cite path:line; opinions are labelled.

Headline: both scouts are mostly accurate on mechanics, but both missed that this redesign is already ticketed. `.scratch/open-itens/issues/108` to `126` and `129` are the moved `tasks-view` Issues (108 to 113 are `ready-for-agent`, chained 108 -> 109 -> 110 -> 111 -> 112 -> 113). Issue 113 already specifies a keyboard model, 109 row chips and the cleaned text, 129 the per-row Todoist state, 108 the mounted list. Scout 12 cites none of them; scout 11 cites 108, 115 and 122 only. New vertical slices must extend or amend these Issues, not duplicate them.

## Confirmed

### Scout 11 (Todoist interplay)

- TasksView imports nothing from `features/todoist-sync` and reads no Todoist setting (`src/lib/features/tasks/TasksView.svelte:1-16`; `grep features/todoist-sync src/lib/features/tasks/` is empty).
- The Todoist test block exists and asserts no `[title="Send to Todoist"]`, no `[title="Sync task status from Todoist"]`, no `[data-task-row] a`, and no read of `todoist-sent.json`, with only `apiToken` set (`src/tests/lib/features/tasks/TasksView.test.ts:191-242`, token at `:204`).
- Row structure is a test contract: `textSpan()` is the first `[data-task-row] span` (`TasksView.test.ts:95-99`), `circleButton()` is the first `[data-task-row] button` (`:132-136`), the toggle payload is `{ path, lineNumber, expectedText, expectedStatus, target }` (`:122-128`).
- ADR-0037 records the removal of the popover, `getTask` polling and every `todoist-sent.json` read/write (`docs/adr/0037-todoist-two-way-sync.md:32`, `:36`).
- Both help docs say a Tasks view checkbox is not a note save and waits for the next interval/focus sync (`help/documentation/10-tasks-and-todoist.md:111`, `help/documentation/29-todoist-sync.md:277`).
- Rust keeps the whole text after the checkbox as `Task.text` (`src-tauri/src/vault/parsing.rs:1427`, `:1647-1654`); `metadata.id` is the first `🆔` match (`ID_RE` at `parsing.rs:1552-1554`, assignment at `:1825-1832`); `fromV2` carries it (`src/lib/features/tasks/tasks.service.ts:41`).
- The view renders raw `task.text` through `parseTaskTextSegments`, which only splits wikilinks and Markdown links (`TasksView.svelte:194-212`, `src/lib/features/tasks/tasks.logic.ts:123-161`). So a synced row shows emoji tokens, tags and the `td-` anchor raw.
- `toggle_task_status` writes only when the line still parses to `expectedText` and `expectedStatus` (`src-tauri/src/commands/vault.rs:770-801`); the TS side sends raw `task.text` (`tasks.service.ts:147-153`). Any display change must keep sending raw text.
- `write_task_lines` locates by anchor plus expected line, writes with `write_atomic`, re-reads mtime, emits `vault-index-updated` (`commands/vault.rs:898-947`, emit `:966-977`). Open tabs are patched in the editor and saved by autosave (`src/lib/features/todoist-sync/note-writer.service.ts:21-30`).
- Every refetch sets `isLoading`, which swaps the whole list for "Indexing tasks..." (`tasks.service.ts:67`, `TasksView.svelte:139-140`); the view refetches on every `vaultIndexVersion` bump (`TasksView.svelte:73-78`).
- Rows are keyed by `task.lineNumber` (`TasksView.svelte:169`), so a line shift reuses a row element for another task.
- `toggleTask -> afterTaskWrite -> settleTaskWrite`, which calls `markRecentSave` and `applyNoteChange`, never the after-save observers (`tasks.service.ts:130-179`, `src/lib/core/filesystem/task-write.service.ts:23-37`). The scheduler's after-save trigger is an `addAfterSaveObserver` gated on `syncEnabled` and `hasAnchoredLine`, 5 s delay (`src/lib/features/todoist-sync/sync-scheduler.service.ts:26`, `:90-99`). Default interval 5 min (`src/lib/core/settings/settings.store.svelte.ts:130`).
- `task-write.service.ts` lives in `core/` so Tasks and Todoist sync "both call it without importing each other" (`task-write.service.ts:10-11`).
- Status chip only while `syncEnabled`, labels from `syncStatusLabel` (`src/lib/features/todoist-sync/TodoistSyncStatus.svelte:17-31`, `sync-scheduler.logic.ts:102-108`, mounted at `src/lib/app/AppShell.svelte:308`). Store getters `status`, `isSyncing`, `lastResult`, `lastError`, `lastSyncedAt` (`todoist-sync.store.svelte.ts:44-52`), reset on teardown (`src/lib/app/lifecycle/app-lifecycle.service.ts:172`, `:673`).
- Palette `todoist:sync-now` and `todoist:show-sync-log` (`src/lib/app/commands.ts:254-263`); `syncNowFromUi` queues behind a running cycle (`sync-scheduler.service.ts:136-151`).
- `TodoistTaskLink` has `pendingUuid`, `pendingCmd`, `missCount`, `frozen`, `noteRelPath`, `todoistId` (`src/lib/contracts/generated/TodoistTaskLink.ts`); `todoist_read_links` and `todoist_read_log` (with `limit?`) exist (`src/lib/contracts/commands.ts:65`, `:73`); `isDetached` is `missCount >= 3` (`detach.logic.ts:15-20`).
- Caps: 25 close/reopen, 50 field pushes, 25 creates, 10 detaches (`sync-now.service.ts:155-161`; `ADR-0037:30`).
- Feature-to-feature imports are allowed while acyclic (`src/tests/lib/architecture/layer-rules.test.ts:21`, `:135-140`). Only `src/lib/app/*` imports `features/tasks` (`global-keybindings.ts`, `app-lifecycle.service.ts`, `EditorView.svelte`, `commands.ts`); `features/todoist-sync` does not. A `tasks -> todoist-sync` edge cannot form a cycle today.
- Default `#to-list` section filter hides tasks not under a heading containing it (`tasks.store.svelte.ts:8`, `parsing.rs:1721-1768`); the e2e spec itself says no fixture task is listed by default (`e2e/specs/tasks-view.spec.ts:17-21`).
- Date filter and group order use file mtime (`tasks.logic.ts:76-88`, `commands/vault.rs:648-650`, `:728`), and every sync write changes mtime (`commands/vault.rs:938-939`).
- Todoist HTTP is TypeScript-only and checked by `.github/workflows/privacy.yml` (`ADR-0037:17`, `:37`; `privacy.yml:54`, `:76-77`).
- Issue 122's `setDue` "replaces or appends" and `setPriority` "appends" (`.scratch/open-itens/issues/122-row-menu-edits-with-undo.md`, What to build, TS). The block-id risk scout 11 raises is real, see "Missed".

### Scout 12 (keyboard and a11y)

- No keydown handler, `tabindex`, `role` or focus call in TasksView; `aria|role=|focus|tabindex|onkeydown` matches only `:131` (input focus classes) and `:179` (circle `aria-label`).
- Date pills are bare buttons, active state by color only (`TasksView.svelte:94-104`); hide-completed is icon-only with `title` only (`:108-121`); the tag input has only a placeholder and `focus:outline-none` (`:126-132`).
- Circle `aria-label` names the action, not the task (`:179`).
- Task text is a non-focusable `<span onclick>` under `svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions` (`:188-193`); the only keyboard route to a note is the file header button, which opens without the line (`:56-58` vs `:68`).
- Wikilinks are `<button class="inline">`, URLs `<a target=_blank>`, both stop propagation (`:198-210`).
- No list or group roles; indent is a `padding-left` style (`:168-175`); stats, loading and empty lines are plain `<p>`s, no live region (`:139-146`).
- `toggleTasksTab` closes the tab when it is active (`tasks.service.ts:211-220`).
- `registerKeybinding` has no typing guard and calls `preventDefault()` (`src/lib/utils/keybindings.ts:63-80`); the calendar says bare keys must not use it (`EventCalendarView.svelte:44-47`).
- `/` is a dedicated document listener skipping typing targets and dialogs (`src/lib/app/global-keybindings.ts:40-50`); `Cmd+Shift+T` is in `GLOBAL_KEYBINDINGS` (`:115-123`); `shortcutFor` at `:211-216`.
- Calendar patterns exist as described: `root?.focus()` on mount (`EventCalendarView.svelte:39-42`), pure `resolveCalendarKey` + `isTypingTarget` (`event-calendar-keys.logic.ts:73-85`, `:98`), `CALENDAR_SHORTCUTS` tied to help docs (`:41-71`), body-target fallback (`EventCalendarView.svelte:106-115`).
- Kanban: root `tabindex="-1"` with svelte-ignore (`src/lib/plugins/kanban/KanbanView.svelte:459-460`), Enter at `:282`, Space at `:294`.
- NoteRow focus ring `focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset` (`src/lib/features/note-list/NoteRow.svelte:70`) and `tabindex="-1"` link pills (`:113-118`).
- ScrollArea viewport ring (`src/lib/components/ui/scroll-area/scroll-area.svelte:32`); `text-purple-400` is used only here (`TasksView.svelte:154`); `--card: oklch(1 0 0)` in light (`src/app.css:155`).
- Help: `Cmd+Shift+T` at `help/documentation/20-keyboard-shortcuts.md:14` and `:129`.
- `pane-toolbar.test.ts:20` lists TasksView.

## Refuted or corrected

### Scout 11

1. **"Reuse `readAnchor` on `metadata.id`" (Opportunity B, Recommendation 6) is wrong as written.** `readAnchor(line)` searches for the `🆔` token in a line (`src/lib/features/todoist-sync/anchor.logic.ts:33-39`, via `ID_TOKEN_RE` `:18`). `metadata.id` is the bare value (`td-abc`, `parsing.rs:1829`), with no emoji, so `readAnchor(task.metadata.id)` always returns null. Correct options: `readAnchor(task.text)`, or test `id.startsWith(ANCHOR_PREFIX) && id.length > ANCHOR_PREFIX.length` on `metadata.id`.
2. **"Do not gate on `apiToken` alone: the existing test ... expects no Todoist UI" is overstated.** The test checks two specific `title` values and the absence of `<a>` in a row whose text has no anchor (`TasksView.test.ts:226-233`). A marker gated on `apiToken` would not fail it. Gating on `syncEnabled` is still right, for the reason `TodoistSyncStatus.svelte:17` shows, not because of this test.
3. **"The `[data-task-row] a` assertion forbids reintroducing a link to the Todoist task" is overstated.** The fixture row carries no `td-` anchor, so a link shown only on anchored rows would not trip it. It still contradicts the test's stated intent (`:231`, "The badges were links to the Todoist task"). Note that Issue 129 (needs-triage) does plan a per-row "Open in Todoist" link (`.scratch/open-itens/issues/129-todoist-state-on-rows-and-filter.md`, Linked state). Scout 11's Recommendation 4 ("no link element inside a row") conflicts with Issue 129. The owner has to choose.
4. **Recurring tasks do not always "reappear with a new date".** Doc 29 lists the `starting <date>` rule: closing from the note completes it for good, and the line stays closed (`help/documentation/29-todoist-sync.md:283-286`). A "completes at next sync" hint must not promise a reopen.
5. **"Default 'hide completed' on (`tasks.store.svelte.ts:12`)"**: the line is `:10` (`:31` in `reset`).
6. **Line drift, substance holds:** description assignment is `parsing.rs:1873-1875`, not `:1776-1779` (that is the doc comment of `parse_task_metadata`); `readAnchor` is `anchor.logic.ts:33-39`, not `:17-25`; `hasForeignId` is `:46-48`; the after-save observer is `sync-scheduler.service.ts:90-99`, not `:74-88`; `write_task_lines` emit is `commands/vault.rs:966-977`.
7. **"Feature pairs only need the cycle tests to pass" (Recommendation 6) is incomplete.** `feature-cycle.test.ts` rewrites `featurePairs` in `src/tests/lib/architecture/feature-cycle-baseline.json` when the graph changes (`feature-cycle.test.ts:14-19`). A new `tasks -> todoist-sync` import therefore changes that JSON, and the change must be committed with the slice. Issue 129 says the same.
8. **The `pending` definition differs from the existing ticket.** Scout 11 maps pending to `pendingCmd` (a close or reopen not yet acknowledged). Issue 129 maps it to `todoistId === null` (a brain-born `item_add` not yet acknowledged). Both fields exist (`TodoistTaskLink.ts`). The definition has to be settled at triage. It should not be redefined silently.

### Scout 12

1. **"A refetch after a toggle keeps the DOM node and its focus while the row is still rendered" is false.** Every `buildTaskIndex` call sets `isLoading` (`tasks.service.ts:67`) across an awaited IPC. The template then renders only "Indexing tasks..." (`TasksView.svelte:139-140`), so every row, including the focused one, unmounts. That happens on every toggle (`afterTaskWrite`, `tasks.service.ts:176-179`) and on every index bump, whether or not "hide completed" is on. Focus is lost on every refetch. Issue 108 (mounted list) fixes this and is a hard prerequisite of any keyboard slice. The chain is already in place: 113 is blocked by 112, which descends from 108.
2. **"Global-keybindings.ts:11 imports `isTypingTarget` ... (a features-to-features import)"** is wrong. `global-keybindings.ts` is in `src/lib/app/`, so this is an app -> feature edge. Moving it to `utils/` is still what Issue 113 specifies (`src/lib/utils/typing-target.ts`), for the `tasks -> event-calendar` pair it would otherwise add.
3. **"2 stops per row plus every link"** is wrong. The text span is not focusable, so each row has one Tab stop (the circle), plus the file header button per group and every wikilink button or URL in the text.
4. **"Keep the toggle name ... or update e2e" is too strict for e2e and too loose for unit tests.** Playwright `getByRole(..., { name })` with a string does a substring match, so `Mark task as done: <text>` still matches `e2e/specs/tasks-view.spec.ts:52-54` (Issue 113 relies on this). The unit tests, however, match exactly: `button[aria-label="Mark task as done"]` (`TasksView.test.ts:117`) and `toBe('Mark task as done' | 'Mark task as not done')` (`:144`, `:156`). Those three assertions change with any label change.
5. **"After a toggle ... move to the next surviving row, as `parkFocusAfterDelete` does"** overstates the calendar. `parkFocusAfterDelete` only refocuses the root when focus fell to `<body>` (`EventCalendarView.svelte:93-104`). It never picks a next item.
6. **`role="listbox"` with `aria-activedescendant`, or `role="checkbox"` on the row (Recommendations 1 and 5), is an ARIA misfit.** Rows contain interactive descendants (circle button, wikilink buttons, `<a>`), and `option` and `checkbox` must not contain them. Issue 113's choice (`role="list"` per group, `role="listitem"` rows, roving `tabindex` on the row element) is the consistent one. Opinion, based on the WAI-ARIA content model, not checked against a source in this pass.
7. **Line drift:** `hideCompleted` is `tasks.store.svelte.ts:10` and `:31`, not `:11` and `:17`. The e2e lines are `:20` (textbox), `:47` (hide button) and `:52-54` (toggle), not `:19`, `:48` and `:56-58`. `registerKeybinding`'s matcher ends at `keybindings.ts:72-73`.
8. **Kanban is a plugin (`src/lib/plugins/kanban/`), not an "in-pane list" peer feature.** Copying its pattern is fine. Importing from it into `features/tasks` would be a feature -> plugin violation that `layer-rules.test.ts` rejects.

## Missed by scouts

1. **The redesign is already ticketed.** `.scratch/open-itens/issues/108` to `126` and `129` (origin `tasks-view` Issues, moved 2026-11-08; map in `.scratch/open-itens/priority-2026-11-08.md`). Each covers ground the scouts recommend:
   - Issue 108 (ready-for-agent, no blockers): mounted list, rule sentence, cause-naming empty state, `aria-label="Section tag"`.
   - Issue 109 (ready-for-agent): status glyphs, `taskDisplayText`, chips.
   - Issue 113 (ready-for-agent): roving row focus, `resolveTaskKey` in `tasks-keys.logic.ts`, `isTypingTarget` moved to `utils/typing-target.ts`, list/listitem roles, a circle label carrying the description, focus on the search box at mount, a `tasks:status-filter` palette command.
   - Issue 122 (needs-triage): row menu.
   - Issue 129 (needs-triage): per-row Todoist state and filter.
   - Issues 127 and 128: wontfix, superseded.

   Several of these Issues cite stale TasksView lines (`:216` svelte-ignore, `:169-170` loading), because `5417b0501` (Issue 15) shrank the file since. The tickets need a line refresh before launch.
2. **Scout 12's focus-on-open conflicts with Issue 113.** Issue 113 focuses the search box on mount. Scout 12 proposes focusing the list root. Its bare-key set (`x`, `h`, `1/2/3`, `o`, `f`, `/`) and `tabindex="-1"` on in-text links also go beyond or against 113, which keeps the circle and the links in their own tab order and handles only arrows, Home, End, Space and Enter. These are owner decisions to record in 113, not new tickets.
3. **TasksView remounts every time its tab becomes active** (`src/lib/app/EditorView.svelte:72-73`, `{#if isTasksTab}`). Each switch back reruns `buildTaskIndex` (and the loading flash until 108 lands). It drops component-local state (scroll position, any local "current row"), and `onDestroy` clears a pending section-tag debounce, so a tag typed less than 400 ms before switching tabs is lost (`TasksView.svelte:31-44`). Keyboard selection and scroll must live in `tasksStore` (getter pattern, ADR-0034 allows a derived behind a getter) or they reset on every tab switch.
4. **`metadata.description` mangles links**, a gotcha for scout 11's Opportunity A. The tag strip `TASK_TAG_RE` (`#([A-Za-z0-9_][A-Za-z0-9_-]*)`, `parsing.rs:1579-1580`) runs over the whole text (`:1873`). That turns `[[Note#Heading]]` into `[[Note]]` and cuts URL fragments. Issue 109's `taskDisplayText` falls back to raw text in exactly those cases. Rendering `description` blindly would break wikilink targets.
5. **`metadata.description` keeps a trailing block id (`^abc`).** The Rust parser does not strip it. `trailingBlockId` notes "The parser keeps it in the description" (`src/lib/features/todoist-sync/task-line.logic.ts:290-297`). A cleaned row would still show `^abc` unless the display helper drops it.
6. **The Issue 122 block-id risk is concrete for synced lines.** `trailingBlockId` matches only at line end (`task-line.logic.ts:295-297`), and `replaceDescription` treats a non-trailing `^abc` as a word (`:309-323`). An appended ` 📅 date` after `^abc` makes the block id a description word: the next sync can push `^abc` into the Todoist content, or log a mid-sentence conflict. Live-preview block references also expect the id at line end. Inferred from code, not run.
7. **Issue 122 already records that `write_task_lines` cannot address a line without a `td-` anchor** (122, "Gap to settle at triage"). Scout 11 presents `write_task_lines` as the path for row-menu edits without noting that most vault lines have no anchor.
8. **The Tasks view's only a11y test hooks are unit-level exact matches** (`TasksView.test.ts:117`, `:144`, `:156`). E2E is substring-based (`e2e/specs/tasks-view.spec.ts:52-54`). The slice that changes labels has to update the unit tests deliberately (CLAUDE.md rule 11). It must not weaken them.
9. **Indexing rule 2** (`docs/agents/indexing-watcher-rules.md:5`) names TasksView as a `vaultIndexVersion` consumer that "re-invokes the relevant `*_v2` command". A Todoist state map built from `todoist_read_links` is a separate read keyed on sync cycles (as Issue 129 says). No recommendation from either scout breaks rule 2. A non-blocking refetch (108) keeps the IPC-on-bump pattern and changes only the template.

## Net recommendations that survive

Opinions, filtered against CLAUDE.md, ADR-0003, ADR-0034, ADR-0037 and indexing rule 2.

1. **Build on the existing chain; do not duplicate.** Land 108 first (mounted list). It is a prerequisite for keyboard focus, scroll survival and a calm list during Todoist sync bursts. Then 109 (chips and display text), then 113 (keyboard), then 129 (Todoist row state). New slices should amend these Issues: refresh their stale line refs and record the owner choices below in them.
2. **Todoist safety rules (scout 11, kept):**
   - Write only through `toggle_task_status` or `write_task_lines`, always finished by `settleTaskWrite`.
   - Keep sending raw `task.text` and `task.status` to the guard.
   - Never display-edit or rewrite the anchor, and keep a trailing block id last in any edit (applies to 122).
   - No network or Todoist SDK in `features/tasks`.
   - Gate every Todoist element on `settingsStore.todoist.syncEnabled`.
3. **Anchored-row detection:** a pure helper in `features/tasks` on `metadata.id` (`startsWith('td-')`, length > 3), or `readAnchor(task.text)`. Never `readAnchor(metadata.id)`. Importing `ANCHOR_PREFIX` from `todoist-sync/anchor.logic.ts` is acyclic and pure (no imports in that file). Commit the resulting `feature-cycle-baseline.json` pair.
4. **Display text:** follow Issue 109's `taskDisplayText`: description with a raw-text fallback for heading links and URL fragments. Add a trailing block-id strip, and keep the anchor hidden.
5. **Row keys and selection identity:** key by anchor when present, else `lineNumber` plus text. Keep the keyboard "current row" in `tasksStore` keyed by `filePath:lineNumber`, not an index and not component-local, because of the remount on every tab activation.
6. **Keyboard (amend 113 rather than replace it):** keep 113's minimal set (arrows, Home, End, Space toggles, Enter opens at line), list/listitem roles, roving `tabindex` on the row, `isTypingTarget` moved to `utils/`, and no use of `registerKeybinding` for bare keys. Open owner questions to record in 113: focus target on open (search box, as in 113, or first row, as in scout 12); whether a ticked row stays visible until the next refilter; extra bare keys and a `?` help table; whether `/` may be overridden inside the view.
7. **A11y basics with no design decision** (can ride on 108 or 113): `aria-pressed` on the date pills and the hide toggle, an `aria-label` on the icon-only hide button, `aria-label="Section tag"` (keeps the e2e query), a `role="status"` line for count, loading and empty states, and a visible focus ring matching `NoteRow.svelte:70`.
8. **Todoist row state (Issue 129):** before launch, settle the "pending" definition (`todoistId` null versus `pendingCmd`) and whether an "Open in Todoist" `<a>` is allowed in a row (conflicts with the test intent at `TasksView.test.ts:231`). Any recurring hint must cover the `starting <date>` rule, which completes the task for good.
9. **Owner decisions (scout 11, kept):**
   - Trigger a cycle after a Tasks view toggle on an anchored line? This is a feature-level scheduler export plus edits to both help docs (`10-tasks-and-todoist.md:111`, `29-todoist-sync.md:277`).
   - Keep bulk actions under the sync caps (25 close/reopen, 50 field pushes).
   - Move date filters from file mtime to task-level dates, since sync writes bump mtime.

## Not verified

Nothing was run. Two claims come from code reading only: that a token appended after a block id reaches Todoist content, and where focus lands after a toggle at runtime. The recurring-task and project-note naming behaviour comes from `help/documentation/29-todoist-sync.md`, not from tracing `sync-now.service.ts`. The ARIA content-model point (item 6 under scout 12) is from memory of WAI-ARIA, not checked against the spec in this pass.
