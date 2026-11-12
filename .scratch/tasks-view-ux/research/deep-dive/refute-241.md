# Refute: Issue 241, change a task's status from its row, with Undo

Adversarial read at HEAD `d2304ac9e`. Sources: `.scratch/open-itens/issues/241-tasks-row-status-menu-with-undo.md` (the ticket), `dossier-241.md`, predecessor tickets 109, 110, 111, 112, 113, 234, 240, and the code and `node_modules` cited below. "Verified" means read in code at HEAD. "Inference" means derived. Predecessors are not at HEAD, so their names come from their ticket text and are marked as such.

## Verdict

**Confidence: medium** that a fresh agent implements 241 correctly from the ticket text alone.

The service half holds up. `toggle_task_status` takes any target and checks `expectedText` and `expectedStatus` (`src-tauri/src/commands/vault.rs:770-810`). `toggleTask`'s dirty-buffer protocol is as described (`src/lib/features/tasks/tasks.service.ts:130-167`). The Undo toast precedent exists (`src/lib/features/event-calendar/event-calendar.service.ts:1455-1485`). The Todoist rule matches `isClosedStatus` (`src/lib/features/todoist-sync/task-line.logic.ts:118-121`, `completion.logic.ts:170-171`). The ADR-0037 claim about duplicated anchors also holds (`docs/adr/0037-todoist-two-way-sync.md:30,46`).

Five gaps would make a careful agent guess, and a careless one ship a bug:

1. "Choosing the current status writes nothing" depends on a Rust no-op that does not exist for `[X]` or unknown box characters. bits-ui calls `onValueChange` again when the user picks the item that is already checked, so a dirty tab would be saved before the IPC runs.
2. The new refusal copy is given only as "...", and those strings are pinned in tests.
3. Copy task text points at "Issue 109's stripping", but 109 never exports a helper. Its `taskDisplayText` returns the description, not the raw text.
4. The Focus bullet ignores the portaled menu. While the menu is closing, `document.activeElement` sits inside the menu, which is neither `<body>` nor the view. No acceptance criterion tests the removal case.
5. The ticket never says when the vault generation is captured. If it is captured after the awaited write, a vault switch during that write produces a toast whose Undo writes into the previous vault. That is exactly the data risk the ticket names.

## Must-fix edits

### M1. The "current status" guard is client-side, before the dirty-tab save

- **Change** (in **The write.**): "call `toggle_task_status` with `expectedText`, `expectedStatus` and `target` (the command already accepts any target status and does nothing when the target equals the current one)"
  **to:** "call `toggle_task_status` with `expectedText`, `expectedStatus` and `target` (the command accepts any target status)."
- **Change:** "Choosing the current status writes nothing."
  **to:** "`setTaskStatus` returns before doing anything when `target === task.status`: no dirty-tab save, no IPC, no Undo dismissal. Do not rely on Rust for this. Rust rewrites `[X]` to `[x]` for target `done`, and an unknown box such as `[*]` (parsed as `todo`) to `[ ]` for target `todo`. Also, bits-ui calls the radio group's `onValueChange` again when the checked item is picked."
- **Add an acceptance criterion** in `tasks.service.test.ts`: "`setTaskStatus(path, task, task.status)` with the note open in a dirty tab sends no IPC (`invoke` not called) and leaves the tab dirty."
- **Evidence:**
  - `src-tauri/src/vault/parsing.rs:1591-1602`: `'x' | 'X'` map to Done, and `_` maps to Todo.
  - `parsing.rs:1606-1616`: Done writes `'x'`.
  - `parsing.rs:1887-1915`: the box character is always replaced.
  - `src-tauri/src/commands/vault.rs:785-790`: the no-op happens only when `updated == original`.
  - bits-ui 2.20.4, `node_modules/bits-ui/dist/bits/menu/components/menu-radio-group.svelte:20-27`: the setter calls `onValueChange(v)` unconditionally.
  - `svelte-toolbelt/dist/box/box-extras.svelte.js:4-16`: `boxWith`'s setter does not deduplicate.
  - `menu.svelte.js:1431-1433`: `selectValue` always sets.
  - `tasks.service.ts:133-146`: the dirty save runs before the IPC.

### M2. Give the exact refusal copy

- **Change:** "The refusal messages become caller-neutral ("...so the list was refreshed. Try again."), and the tests that pin the old "Click it again" copy change on purpose."
  **to:** "The two refusal messages become `The note changed, so the list was refreshed. Try again.` (line moved after the dirty-tab save) and `The task changed on disk, so the list was refreshed. Try again.` (`stale`). `Task not changed: the note could not be saved.` and `Failed to save task change.` stay. These pins change on purpose: `tasks.service.test.ts:315`, `task-toggle-dirty-buffer.test.ts:145` and `:159`."
- **Also change** "show the existing "changed on disk" message" **to** "show the stale message above". As written, it contradicts the copy change.
- **Evidence:** `tasks.service.ts:143`, `:156`. `src/tests/lib/features/tasks/tasks.service.test.ts:315`. `src/tests/lib/features/tasks/task-toggle-dirty-buffer.test.ts:145,159`.

### M3. Name the copy helper and say where it comes from

- **Change:** "Copy task text: the raw `task.text` without its trailing block id and Todoist anchor (Issue 109's stripping), so pasting it never duplicates a `🆔 td-` anchor"
  **to:** "Copy task text: `navigator.clipboard.writeText(stripTaskTrailers(task.text))`. `stripTaskTrailers(text)` is an export of `tasks.logic.ts` that removes a trailing block id and then a trailing Todoist anchor, and Issue 109's `taskDisplayText` calls it. If Issue 109 kept those regexes private, export them under that name in this Issue. 109's tests keep covering `taskDisplayText`. The copied text keeps dates, priority and tags (it is the raw text, not the display text). Success shows nothing. A rejected `writeText` shows `toast.error('Could not copy the task text.')`."
- **Add an acceptance criterion** in `tasks.logic.test.ts`:
  - `Call Ana 🆔 td-123 ^abc` gives `Call Ana`.
  - `Call Ana ^abc` gives `Call Ana`.
  - `a^b` stays unchanged.
- **Evidence:**
  - `.scratch/open-itens/issues/109-row-chips.md:8-10`: `taskDisplayText` returns `metadata.description` by default. The regexes are "a local regex in `tasks.logic.ts`", and no export is named.
  - `refute-109.md:80-83` proposes `stripTaskTrailers` for this Issue. That edit is not in the 109 ticket at HEAD.
  - The view has no clipboard code today (`src/lib/features/tasks/TasksView.svelte:1-16`).
  - The precedent is `src/lib/features/note-list/NoteRowMenu.svelte:239`.

### M4. Focus has to survive the portaled menu, and the removal case needs a test

- **Change** the **Focus.** bullet **to:** "Both menus' `Content` gets an `onCloseAutoFocus` handler that calls `e.preventDefault()`. It then focuses (with `preventScroll`) the row the menu was opened from when that row is still rendered. Otherwise it focuses the current row as Issues 113 and 240 resolve it (next surviving row, else previous, else the first rendered row). It does nothing when `document.activeElement` is outside the view and outside the closing menu. The bits-ui default is not enough. It returns focus to the trigger when the trigger is tabbable, which is the button of the current row, not the row. Otherwise it returns focus to the pre-open element, which may be a row the refetch removed. While the menu is still mounted, focus sits inside the portaled menu, so Issue 113's refetch rule ("focus was in the list") does not move it."
- **Add an acceptance criterion** in `TasksView.test.ts`: "Under the Open filter with rows A, B, C, open B's menu and choose Done. The refetch returns A and C. After the menu unmounts (await a `requestAnimationFrame`, as `settleUnmount` does in `EventPopover.test.ts:79-83`), `document.activeElement` is C's row and C has `tabindex="0"`."
- **Change** the acceptance criterion "closing it returns focus to that row" **to:** "Escape on the open menu, then after the unmount `document.activeElement` is that row element (not its actions button)."
- **Evidence:**
  - `node_modules/bits-ui/dist/bits/menu/menu.svelte.js:830-842`: the trigger gets focus if it is tabbable.
  - `node_modules/bits-ui/dist/bits/utilities/focus-scope/focus-scope.svelte.js:56-62`: close-autofocus runs on unmount.
  - `focus-scope.svelte.js:94-112`: the fallback is the pre-focus memory.
  - `node_modules/bits-ui/dist/internal/animations-complete.js:36-38,62`: without `getAnimations` (jsdom has none), the unmount runs after one animation frame.
  - The handler precedent in the repo is `src/lib/features/event-calendar/EventPopover.svelte:83-95,159`, tested in `EventPopover.test.ts:271-285`.
  - `.scratch/open-itens/issues/113-keyboard-and-a11y.md:10-11` and `240-tasks-collapse-groups-and-row-cap.md:9` define the current-row rules.

### M5. Capture the vault generation before the awaited write

- **Add** (in **Undo, menu writes only.**): "The menu handler reads the reset generation before it calls `setTaskStatus`. When the write resolves after a `resetTasks()`, no toast is shown. The Undo closure keeps that same captured value."
- **Add an acceptance criterion** in `tasks.service.test.ts`: "A menu write whose `toggle_task_status` resolves after `resetTasks()` shows no Undo toast (`toast` not called)."
- **Evidence:**
  - `toggle_task_status` writes any absolute path without confinement (`src-tauri/src/commands/vault.rs:778`, `std::fs::read_to_string(path)`, unlike `confined_note_path` at `:872`).
  - Precedent: `event-calendar.service.ts:1463,1471-1472` captures `generationCheck()` before `await deleteEvent` and returns before creating the toast.
  - `teardownVault` calls `resetTasks()` (`src/lib/app/lifecycle/app-lifecycle.service.ts:664`).
  - Issue 234 does not name the generation export (`234-tasks-groups-keep-their-place.md:15`).
  - `refute-234.md:54` proposes `getTasksResetGeneration()`. Code inside `tasks.service.ts` can read the module counter directly.

## Should-fix edits

### S1. Todoist wording about Undo

- **Change:** "and so does an Undo; an Undo after a sync already ran sends a second change."
  **to:** "An Undo before the next sync leaves the line as it was at the last sync, so nothing is sent. An Undo after a sync sends the opposite change."
- **Evidence:** `src/lib/features/todoist-sync/completion.logic.ts:170-171`. The change is computed against `localBase`, the last synced status.

### S2. The exact key rule

- **Change:** "`resolveTaskKey` (Issue 113) gains `{ kind: 'menu' }` for those two keys (its `shift` field already exists)."
  **to:** "`resolveTaskKey` gains `{ kind: 'menu' }` in two cases: `key === 'F10'` with `shift` and no Meta, Ctrl or Alt, and `key === 'ContextMenu'` with no modifier. Both apply only when `onRow` is true and `count > 0`. Every other key keeps Issue 113's rule that Shift gives `null`. F10 without Shift, and either key with Meta, Ctrl or Alt, also give `null`. Add these cases to `tasks-keys.logic.test.ts`."
- **Evidence:** `113-keyboard-and-a11y.md:8` ("returns `null` ... when Meta, Ctrl, Alt or Shift is held"), so the Shift+F10 exception is a behavior change to 113's function.

### S3. Say which menu the keyboard opens

- **Add:** "On `{ kind: 'menu' }`, the list handler calls `preventDefault()` and then `click()` on that row's actions button, which opens its DropdownMenu anchored at the button. Do not dispatch a synthetic `contextmenu` event."
- **Evidence:** `menu.svelte.js:1455-1465`. A click with `detail === 0` toggles the DropdownMenu. The ContextMenu anchors at `clientX`/`clientY` (`menu.svelte.js:1560-1562`).

### S4. Use NoteRowMenu's real pattern for the right-click target

- **Change:** "one `ContextMenu` around the list that reads the row under the pointer, as `src/lib/features/note-list/NoteRowMenu.svelte` does"
  **to:** "one `ContextMenu` around the list container. Each row's own `oncontextmenu` sets the context row, as `NoteRow.svelte:72` does. The container handler suppresses the menu when `e.target.closest('[data-task-row]')` is null and otherwise forwards to the trigger's `oncontextmenu` (`NoteRowMenu.svelte:192-208`)."
- **Note:** the trigger props spread `tabindex="-1"` and `data-state` onto that container (`menu.svelte.js:1593-1606`). Keep 113's keydown handler and its `svelte-ignore` comments working with them.
- **Evidence:** `src/lib/features/note-list/NoteRow.svelte:72`. `NoteRowMenu.svelte:46,59,192-208`.

### S5. Toast text and dismissal

- **Add:** "The toast is `toast('Task marked <Label>', { description: taskDisplayText(task), action: { label: 'Undo', onClick }, onDismiss, onAutoClose })`, where `<Label>` is the menu label. The service keeps one module-level toast id, not store state. It calls `toast.dismiss(id)` only while it holds an id, at the start of every real write in `setTaskStatus` (after the equal-status return) and in `resetTasks()`."
- **Evidence:**
  - The existing `svelte-sonner` mocks have no `dismiss` and no callable `toast`: `tasks.service.test.ts:17-19` and `task-toggle-dirty-buffer.test.ts:45-47`. An unguarded call would throw inside the `try` and turn a good write into "Failed to save task change." (`tasks.service.ts:163-166`).
  - Precedent: `event-calendar.service.ts:345-346,1473-1484`.

### S6. Statuses outside the four

- **Add:** "A row whose status is question, important or forwarded shows no radio item checked. Undo restores the previous status, whatever it was. A `[X]` line comes back as `[x]`, and an unknown box (parsed as `todo`) comes back as `[ ]`."
- **Evidence:** `parsing.rs:1591-1616`. `110-open-closed-rule.md:18-26`.

### S7. Test mechanics the acceptance criteria rely on

- **Add under the acceptance criteria:**
  - "`TasksView.test.ts` mocks `svelte-sonner` as `Object.assign(vi.fn(() => 'undo-1'), { error: vi.fn(), info: vi.fn(), dismiss: vi.fn() })`, as `EventCalendarView.test.ts:32-34` does, and runs Undo through the captured `action.onClick`."
  - "Its `toggle_task_status` mock returns `changed: true`. Today it returns `changed: false` (`TasksView.test.ts:80-82`), and no toast follows an unchanged write."
  - "Read menu items only inside `[role="menu"][data-state="open"]`. Issue 111's Status menu and Issue 112's Display menu also render radio items and labels such as Done."
- **Split** the criterion "the toast's Undo sends ...; a circle click after it dismisses the toast" into two tests:
  - Undo sends `{ expectedStatus: 'cancelled', target: 'todo', expectedText }`.
  - A circle click after a menu write, with no Undo, calls `toast.dismiss('undo-1')`.

### S8. The criterion "through `setTaskStatus`" cannot be observed

- **Change:** "the circle path still sends `target: 'done'` for an open task and `'todo'` for a closed one, through `setTaskStatus`"
  **to:** "the circle still sends `target: 'done'` for an open task and `'todo'` for a closed one, and a stale circle click shows the new stale message (the shared path)."
- **Evidence:** a call from one function to another in the same module cannot be spied on.

### S9. Say how far the focus rule widens

- **Add:** "This widens Issue 113's refetch rule for every refetch, from 'focus was in the list' to '`document.activeElement` is `<body>` or inside the view root'."
- **Evidence:** `113-keyboard-and-a11y.md:10` against the ticket's Focus bullet.

### S10. "Never duplicates" claims too much

- **Change:** "so pasting it never duplicates a `🆔 td-` anchor"
  **to:** "so pasting a synced line does not duplicate its anchor. The sync writes the anchor last, before a block id."
- **Reason:** a user can type text after the anchor, and then a trailing strip leaves it in place.
- **Evidence:** `src/lib/features/todoist-sync/create.logic.ts:391-398` (`addAnchor`). `pull.logic.ts:363-370`. The anchor regex allows no space after the emoji (`anchor.logic.ts:18`), while 109's regex needs one.

## Dossier errors

1. **R3 overstates the jsdom risk.** bits-ui unmounts closed menu content after one `requestAnimationFrame` when `getAnimations` is missing (`node_modules/bits-ui/dist/internal/animations-complete.js:36-38,62`), and jsdom 30.1.3 has no `getAnimations`. `onCloseAutoFocus` therefore does fire in jsdom once the test awaits a frame (`EventPopover.test.ts:79-83,271-285`). NoteRowMenu's "stays in the DOM" comment describes a test that never waits a frame. The 5-minute spike and the `onOpenChange` + `requestAnimationFrame` fallback are not needed.
2. **The NoteRowMenu pattern is misread.** The dossier has the view resolve the row through `data-task-path`/`data-task-line` attributes and `tasksStore.visibleRows` (section 3, step 6). NoteRowMenu sets its target from each row's own `oncontextmenu` (`NoteRow.svelte:72`), with no data attributes and no store lookup.
3. **R13 and finding 6 accept the ticket's Rust no-op claim.** "Rust ... does nothing on equal status" is false for `[X]` with target done and for unknown boxes with target todo (`parsing.rs:1591-1616,1887-1915`). Finding 1 reaches the right guard for a different reason.
4. **The helper name does not match the sibling refute.** The dossier proposes `stripTrailingTaskIds`, while `refute-109.md:82` proposes `stripTaskTrailers`. The tickets should settle on one name (M3).
5. **The Undo nuance before a sync is missing.** Finding 5 verifies `isClosedStatus` but repeats the ticket's "so does an Undo" without noting that an Undo before the next sync sends nothing (`completion.logic.ts:170-171`).
6. **The vault-generation capture is only in the risks.** The dossier places the capture before the awaited write correctly (section 3, step 2, and R10) but files it as a risk. It is a data-safety requirement and belongs in the ticket (M5).
7. **Minor: a mismatched block-id regex.** The dossier inherits 109's block-id regex `\^[A-Za-z0-9-]+`, while the sync's own regex is `\^[\w-]+` (`create.logic.ts:395`, underscore included). A block id with an underscore would survive the copy strip. This is low impact.

Verified facts that hold, so no edit is needed:
- The command takes any target and only changes the box character, so Undo's `expectedText` is the original text (`parsing.rs:1635-1672,1887-1915`).
- The e2e mock follows the same logic (`e2e/mocks/vault-index.ts:502-529`).
- Both `MoreHorizontal` and `Ellipsis` exist in `@lucide/svelte`.
- `menu-item-anatomy.test.ts:41-59` forbids side margins and `text-xs` on literal menu items.
- No `svelte-sonner` mock in `TasksView.test.ts` at HEAD.
