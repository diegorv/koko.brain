# Refute: Issue 113, keyboard navigation and accessible rows

Read at HEAD `d2304ac9e`. Nothing was run (no check, vitest, cargo, e2e). None of the predecessors (108, 242, 110, 234, 236, 109, 111, 238, 239) has landed, so statements about their output are INFERRED from ticket text. Everything marked VERIFIED was read at the cited path:line.

## Verdict

**Confidence: medium** that a fresh agent implements 113 correctly from the ticket alone.

The core design holds up. The pure `resolveTaskKey`, the `onRow` guard against double activation, the store-held current row, DOM-order indexing and the palette command all match the code: the `commands.ts` build-time read pattern is at `src/lib/app/commands.ts:61-71`, the palette prop expression is reactive at `src/lib/app/AppOverlays.svelte:19`, and `openTasksTab` exists at `src/lib/features/tasks/tasks.service.ts:187`. Svelte delegates `keydown` and `focusin` (`node_modules/svelte/src/utils.js:110-133`), so one container handler sees every row.

Several sentences are still wrong or leave the agent to guess, in ways that produce wrong behavior or a test that cannot be written as stated:
- The focus guard lets focus jump out of the section and search text boxes, and the next Space then toggles a task.
- With no current row rendered, no row has a tab stop.
- The two svelte-ignore names do not match what the compiler emits for the markup the ticket describes.
- "Tab ... then leaves the list" is false once Issue 236's header buttons exist.
- The palette test "with the real tasks service for this case" cannot be done inside `commands.test.ts`.
- The e2e "exactly once" step has no stated way to observe a double toggle.
- Holding Space can toggle the next row.

None of these is an open owner decision. Each has an obvious conventional answer, given below.

## Must-fix edits

### M1. The focus-on-open guard steals focus from the text boxes, and Space then writes to disk

- **Sentence (bullet "Focus on open"):** "It moves only while `document.activeElement` is `<body>` or inside the view root, so it never pulls focus from wherever the user has gone (the palette, a dialog, another pane)."
- **Replace with:** "It moves only while `document.activeElement` is `<body>`, the view root itself, or an element inside the list container. It never moves focus out of a text field (the section tag textbox, the search box) or from anywhere outside the view (the palette, a dialog, another pane, the tab bar). The attempt is made once per mount: the first time the rendered row count is above zero during that mount, whether or not the guard lets it move. A later refetch or filter change never pulls focus."
- **Evidence:**
  - The section textbox is inside the view root (`src/lib/features/tasks/TasksView.svelte:90`, `:126-132`), and Issue 239 puts the search box in the pane toolbar, also inside the root (239 bullet "Search").
  - The textbox applies a typed tag after a 400 ms debounce (`TasksView.svelte:34-40`). The default tag `#to-list` often returns no rows, so the first rows of the mount arrive while the user is still in the textbox. Under the ticket's guard, focus jumps to the first row, and the user's next Space (for example between two tags, Issue 242's `#to-list #work`) reaches the list handler as a row key, so `toggle_task_status` writes the note.
  - "First rows of a session" is also undefined ("session" could mean the app session, the store's lifetime or the mount). The dossier (4.9) reads it as one mount, and the replacement states that reading.

### M2. With no current row rendered, the list has no tab stop

- **Sentence (bullet "Roving focus"):** "`tabindex="0"` on the current row and `tabindex="-1"` on the others"
- **Add after it:** "When the store has no current row, or the current row is not among the rendered rows (a vault switch, a filter change, a refetch), the first rendered row holds `tabindex="0"` and is the target of focus on open. Keep this fallback in one place: Issue 240 changes it to 'the first rendered row after it, else the last'."
- **Sentence (bullet "The current row is kept"):** "After a refetch that removes it (for example Space completed it under the Open filter), the current row becomes the next surviving row, else the previous one, and focus follows when focus was in the list."
- **Replace with:** "When the rendered rows no longer include it, after a refetch or a quick filter change, the current row becomes the next surviving row in the previous rendered order, else the previous one, else none. Focus moves to it only when, after the update, `document.activeElement` is `<body>` (the focused row was removed) or inside the list container. A filter typed in the search box therefore never moves focus."
- **Evidence:**
  - `tasksStore.reset()` clears the current row (ticket bullet), and the first mount of a session has none. The ticket's tab rule then gives every row `-1`, so Tab skips the list entirely.
  - Rows also disappear without a refetch: Issue 111's `visibleRows` is a `$derived` over `quick` (111 "Store"), and Issue 239's search filters on every input.
  - Once the focused row's DOM node is removed, "focus was in the list" cannot be read from `document.activeElement`. Chromium and jsdom move focus to `<body>`; the dossier cites jsdom `Node-impl.js:510-513` and I did not re-verify it. So the rule has to be stated as an observable post-update condition.
  - Issue 240 (bullet "Keyboard") assumes this fallback exists and refines it.

### M3. "Stop at the ends" has two readings, and they produce opposite test assertions

- **Sentence (bullet `resolveTaskKey`):** "ArrowDown and ArrowUp move by one and stop at the ends"
- **Replace with:** "ArrowDown and ArrowUp move by one. At the last row ArrowDown returns `{ kind: 'focus', index: count - 1 }`, and at the first row ArrowUp returns `{ kind: 'focus', index: 0 }`, so the handler still calls `preventDefault()` and the scroll viewport does not scroll under the focused row."
- **Evidence:** the first criterion tests "ArrowDown and ArrowUp (including at the ends)" without saying what the ends return. A `null` there would let the ScrollArea viewport scroll on the arrow key's default action. The dossier (4.6) picks the clamped focus, and the ticket should say so.

### M4. The svelte-ignore names do not match the markup the ticket describes

- **Sentence (bullet "Roles and names"):** "The focusable rows and the container's keydown handler trigger Svelte's `a11y_no_noninteractive_tabindex` and `a11y_no_noninteractive_element_interactions` warnings; add `svelte-ignore` comments for exactly those two"
- **Replace with:** "The rows (`role="listitem"` with a dynamic `tabindex`) trigger `a11y_no_noninteractive_tabindex`. The list container is a plain `<div>` with no role around all note groups, and its `onkeydown` triggers `a11y_no_static_element_interactions`. Add a `svelte-ignore` with a one-line reason (roving-focus list) for each of those two, on the element that raises it, and for any other name `pnpm check` reports on these elements. Use `onfocusin` (not `onfocus` on each row) to record the current row; `focusin` is in neither handler list and raises no warning."
- **Evidence (svelte 5.57.3):**
  - `no_noninteractive_tabindex` fires for a non-interactive role with a non-static or non-negative tabindex (`node_modules/svelte/src/compiler/phases/2-analyze/visitors/shared/a11y/index.js:316-321`).
  - `no_noninteractive_element_interactions` fires only on an element with a non-interactive role, or a non-interactive element such as `li` with no role (`:341-355`).
  - `no_static_element_interactions` fires for `keydown` on a role-less `div` (`:358-375`; `keydown` is in `a11y_interactive_handlers`, `constants.js:47-50`). The ticket does not give the container a role, so the second name it lists is never raised, and the warning that is raised is not ignored.
  - `svelte-check` runs without `--fail-on-warnings` (`package.json:14`), so a wrong name does not fail the gate. It does break the ticket's "exactly those two" wording, and a reviewer will flag it.
  - `focusin` on a static element is accepted by the analyzer (`index.js:378-386` comment).

### M5. "Tab ... then leaves the list" is false once Issue 236's header buttons exist

- **Sentence (bullet "Roving focus"):** "so Tab from the current row walks its own controls and then leaves the list."
- **Replace with:** "so Tab from the current row walks its own controls and then moves on to the next note's header buttons (the title button, and Issue 240's chevron). Group header buttons keep their normal tab stop: they are the keyboard route to opening a note without a line. Only rows and the controls inside rows rove."
- **Evidence:**
  - The note header title is a `<button>` inside the groups wrapper today (`TasksView.svelte:153-158`), and Issue 236 keeps it as "still a button that opens the note".
  - Issue 240 adds a chevron button per header and says "Clicking a chevron focuses that chevron ... ArrowDown from a chevron is not handled", which assumes headers stay tabbable.
  - As written, an agent could set the headers to `tabindex="-1"` to make the sentence true, leaving them reachable by no key.

### M6. The palette test cannot use the real tasks service inside `commands.test.ts`

- **Sentence (criterion):** "`src/tests/lib/app/commands.test.ts` covers the new command with the real tasks service for this case"
- **Replace with:** "`src/tests/lib/app/commands.new-commands.test.ts`, which runs the real tasks service (it has no `tasks.service.js` mock), covers the new command. Reset `tasksStore` and `editorStore` in `beforeEach`. The label flips with the store (`show: 'open'` and no statuses gives `Tasks: Show all statuses`; `show: 'all'`, `show: 'closed'`, or a non-empty `statuses` gives `Tasks: Show open only`), and the action changes `tasksStore.quick` and makes `TASKS_VIRTUAL_PATH` the active tab in `editorStore`. In `commands.test.ts`, the built-in count assertion goes up by one (44 at HEAD) on purpose; name it in the commit."
- **Evidence:**
  - `commands.test.ts:26-28` mocks `#lib/features/tasks/tasks.service.js` for the whole file with only `toggleTasksTab`. `vi.mock` is hoisted and applies to the file, not to one case, so the action's `openTasksTab()` call hits the mock, which has no such export.
  - `commands.new-commands.test.ts` mocks no tasks service (grep of its `vi.mock` lines: `:10-33`). `commands.todoist.test.ts` doesn't either.
  - The count is pinned at `commands.test.ts:134-138` (`toHaveLength(44)`).

### M7. The e2e "exactly once" step needs a stated observable

- **Sentence (criterion):** "e2e: pressing Space with focus on a row's circle toggles that task exactly once."
- **Replace with:** "e2e: focus the `Ship feature A` circle (`circle.focus()`), press Space, then `expect.poll` the virtual FS for `- [x] Ship feature A` and assert no 'changed on disk' toast appears (`[data-sonner-toast]` count 0). A second toggle from the list handler would find the line already `[x]`, get `stale` back, and show that toast. This test cannot fail first: it guards against the list handler also firing."
- **Evidence:**
  - The e2e mock returns `stale` and writes nothing when the line no longer holds `expectedStatus` (`e2e/mocks/vault-index.ts:518-520`), so the file content alone looks the same after one toggle or two.
  - `toggleTask` shows `toast.info('The task changed on disk, ...')` on `stale` (`src/lib/features/tasks/tasks.service.ts:154-157`).
  - The spec cannot count IPC calls.

### M8. Holding Space toggles the next row

- **Sentence (bullet `resolveTaskKey`):** the `input` type.
- **Add:** "`input` also carries `repeat: boolean` (`KeyboardEvent.repeat`). With `repeat` true, Space and Enter return `null`; arrows, Home and End still move. The logic test covers a repeated Space and a repeated ArrowDown."
- **Evidence:**
  - Under the Open filter, Space completes row A, the refetch removes it, and the ticket moves focus to the next row B ("The current row is kept").
  - Holding Space past the key-repeat delay then delivers repeated keydowns on B, and each one runs `toggleTask`, which writes the note through `toggle_task_status` (`tasks.service.ts:147-153`).
  - This writes to the user's notes, so it is in scope under the "data at risk" rule. It is a one-field addition to the pure function. The dossier (4.8) flags it but leaves it optional.

## Should-fix edits

- **S1. The focus-follow test needs a toggle mock that reports a change.**
  - **Sentence (criterion 4):** "Space completes the focused row under the Open filter; after the refetch, focus is on the row that followed it."
  - **Add:** "Use a stateful `invoke` mock: `get_all_tasks_v2` returns a mutable task list, and `toggle_task_status` flips the task and returns `updateResult.changed: true`."
  - **Evidence:** the existing helper returns `changed: false` (`src/tests/lib/features/tasks/TasksView.test.ts:80-82`), and `toggleTask` returns before any refetch on an unchanged result (`tasks.service.ts:159-161`), so the row never disappears. The real `settleTaskWrite` runs safely with `invoke` returning `undefined`, as `task-toggle-dirty-buffer.test.ts:11-31` shows, so no extra mock is required.
- **S2. Put the successor rule in pure logic.**
  - **Add to the `tasks-keys.logic.ts` bullet:** "Also export a pure `nextCurrentRow(prevKeys: string[], nextKeys: string[], current: string | null): string | null` (keys `filePath:lineNumber`, the key Issue 112 uses) implementing M2's rule, tested in `tasks-keys.logic.test.ts` for a removed middle row, a removed last row, a still-present row and an empty list."
  - **Evidence:** CLAUDE.md "Architecture Guidelines" (real pure logic goes to `.logic.ts`). Without this the rule lives only inside a component effect, and the only test is a jsdom one.
- **S3. Make the palette action the Status menu's own write.**
  - **Sentence:** "The action sets `show` to `all` or `open`, clears `statuses`"
  - **Replace with:** "The action makes the same store call as choosing All or Open in the Status menu's radio group (Issue 111), so `statuses` ends in the same 'empty' form that Issue 239's Reset filters and `Filters (n)` treat as the default."
  - **Evidence:** 111 types `statuses?: TaskStatus[]` and never says whether 'clear' means `undefined` or `[]`. If the palette and the menu disagree, 239's 'differs from its default' test shows Reset after a palette run.
- **S4. Name the activation paths that will not get first-row focus.**
  - **Add to "Focus on open":** "Opening the tab by clicking it leaves focus on the tab element, so focus stays there. That is accepted; do not widen the guard to `[role="tab"]`."
  - **Evidence:** the editor tab is a focusable `div role="tab" tabindex="0"` (`src/lib/core/markdown-editor/EditorTabs.svelte:57-61`). The palette closes before it runs the action (`src/lib/features/command-palette/CommandPalette.svelte:27-36`), but I did not trace the dialog's focus restore. Without the note, an agent may treat the owner decision "focus goes to the first row" as broken and widen the guard.
- **S5. Drop the ordering demand on the scroll restore.**
  - **Sentence:** "It calls `focus({ preventScroll: true })` after Issue 234's scroll restore."
  - **Replace with:** "It calls `focus({ preventScroll: true })`, so the order relative to Issue 234's scroll restore does not matter."
  - **Evidence:** 234's notes say the restore "may need one animation frame". Ordering against an unknown frame callback is guesswork, and `preventScroll` already makes the order irrelevant.
- **S6. The tabindex test needs links outside the current row.**
  - **Add to criterion 3:** "The fixture gives a non-current row a wikilink and a URL, and after ArrowDown the values swap to the new current row."
  - **Evidence:** the wikilink `<button>` and the `<a>` render only for segments of that kind (`TasksView.svelte:197-210`). Without one, "every other row's ... links" asserts nothing.
- **S7. Say which component tests are green before the change.**
  - **Add to criterion 2:** "The Space-on-circle case is a regression guard and is green before the change: nothing handles keys today, and jsdom does not turn a keydown into a click. Dispatch `new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })`, so `defaultPrevented` can be observed at all."
  - Criterion 5 (focus outside stays) is vacuous today as well. Pair it with the case where nothing outside has focus and the first row gets it.
- **S8. "as a grid" invites `role="grid"`.**
  - **Sentence:** "**Roving focus over rows, as a grid.**"
  - **Replace with:** "**Roving focus over rows.**" The roles are `list`/`listitem` (bullet "Roles and names"). An ARIA grid would need `row`/`gridcell` and cell-level arrow keys.
- **S9. The `aria-pressed` sentence describes nothing to change.**
  - "The Status, Due, Priority and Tag triggers ... carry no `aria-pressed`." Today no element carries `aria-pressed` (`TasksView.svelte:95-121`), and the PRD line it overrides (`.scratch/archived/tasks-view/PRD.md:224`) is about toolbar toggles that no longer exist.
  - Reword as "Do not add `aria-pressed` to the filter triggers (PRD A8's toolbar-toggle line is superseded)" so it does not read as removal work.
- **S10. Doc 20 placement.** Put the new `## Tasks` section after `## Calendar`'s table, not inside it. `event-calendar-keys.logic.test.ts:157-164` slices `## Calendar` up to the next `## ` heading and checks every calendar chord in it. A Tasks block inside that slice is harmless, but it must not split the Calendar table.

## Dossier errors found

1. **Section 1.2, `global-keybindings.test.ts` row:** "It never imports `commands.ts` paths ... (grep: `getBuiltInCommands` appears only in `commands*.test.ts`)." False. `src/tests/lib/app/global-keybindings.test.ts:65` imports `getBuiltInCommands`, and `:767` calls it. `src/tests/lib/features/command-palette/CommandPalette.test.ts:26-27` mocks `tasks.service.js` with only `toggleTasksTab`, and it calls `getBuiltInCommands()` at `:71` and `:91`. Neither file runs the actions, so the missing `openTasksTab` export is not reached, and building the list reads the real `tasksStore`. The conclusion (untouched) holds, but the grep claim is wrong.
2. **Section 0.3:** "`a11y_no_noninteractive_element_interactions` fires ... only when the element carries a non-interactive role." It also fires for non-interactive elements without a role, such as `<li>` or `<ul>` (`index.js:346`, `is_non_interactive && !role`). This matters if the agent uses `<ul>`/`<li>` markup.
3. **Section 0.1** misses the simplest route: `commands.new-commands.test.ts` already exists without a tasks-service mock, so option (b) needs no new file. Option (a), a partial mock in `commands.test.ts`, changes module evaluation for 40+ unrelated cases and is the riskier choice. The dossier recommends (a).
4. **Section 2, focus-follow row:** "add `vi.mock('#lib/core/filesystem/task-write.service.js', ...)`", presented as needed. It is optional: `task-toggle-dirty-buffer.test.ts:11-31` runs the real `settleTaskWrite` path with `invoke` returning `undefined` for the index and search commands.
5. **Section 0.5 and 4.8** flag the textbox focus theft and key auto-repeat only as "recommended" or "optional". Both lead to an unintended `toggle_task_status` write (M1, M8), so they belong in the ticket as requirements, not in the delivery notes.
6. Claims I checked and found correct:
   - `commands.test.ts:26-28` mock and `:134-138` count.
   - `EditorTabs.svelte:57-61`.
   - `CommandPalette` closes before the action.
   - Svelte delegates `keydown` and `focusin`.
   - `NoteRow.svelte:70` ring classes.
   - `e2e/mocks/vault-index.ts` returns `stale` on a second toggle.
   - Doc 10's missing screenshot (`help/documentation/10-tasks-and-todoist.md:15`).
   - The `/` binding skips typing targets and dialogs (`src/lib/app/global-keybindings.ts:40-50`).
