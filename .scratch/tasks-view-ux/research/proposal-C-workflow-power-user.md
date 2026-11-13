# Proposal C: Tasks view, workflow-first for a keyboard-heavy power user

Angle: a user who lives on the keyboard and wants to clear a task list fast. They move with keys, complete, reschedule and reprioritize without the mouse, jump to the source line, and reach any view state from the command palette. The list also has to stay fast and stable while they do it.

Read-only research. Nothing was run. "Fact" means verified in code or in the validated reports (cited as `V01` to `V10` for `validated-01.md` to `validated-10.md`, with the section name). "Opinion" is labelled. Line numbers are from `main` at `23f6c1f91`.

## 0. Position on the existing backlog (read first)

This proposal does not start a parallel ticket set. Every validator found that an owner-answered PRD already exists (`.scratch/archived/tasks-view/PRD.md`, owner answers dated 2026-11-06, PRD:54-69), and so does a chain of Issues in `.scratch/open-itens/issues/` (V03 Missed 1, V05 Missed 1, V07 Missed 1, V08 Missed 1, V10 Refuted 4). The power-user angle is therefore written as:

- **Amendments** to existing Issues: 108, 113, 122, plus small notes on 109, 111 and 112.
- **New slices** only for gaps those Issues leave open: status actions without the locator gap, palette presets and row commands, a shortcuts help, a keyboard write queue, and inline text edit.
- **Owner questions** where this angle collides with a recorded owner decision or a vetoable assumption. The main ones are A8 (no bare-letter shortcuts in v1, PRD:128), A9 (no virtualization, PRD:129) and A7 (editing scope, PRD:127).

Ledger facts (`.scratch/open-itens/ledger.md`): 108 to 113 are `todo` and `ready-for-agent`, chained 108 -> 109 -> 110 -> 111 -> 112 -> 113 (rows 145-150). 122 is `needs-triage`, blocked by 114 (done), 112 and 085 (todo) (row 159; `122-row-menu-edits-with-undo.md`). 021 and 114 are done (rows 58, 151). The Issues cite stale `TasksView.svelte` lines (V07 Missed 3, V10 Missed 8). Any amendment below must refresh them before a relay run picks the Issue up.

## 1. What blocks a power-user workflow today (facts)

| # | Fact | Evidence |
|---|---|---|
| F1 | No keyboard model. No `keydown`, `tabindex` or `role` in the view. The task text is a click-only `<span>` under `svelte-ignore a11y_*`, and the only keyboard path to a note is the file header, which opens the note without the line. | `TasksView.svelte:56-58`, `:188-193`; V06 Scout 12 Confirmed |
| F2 | Every refetch unmounts the whole list ("Indexing tasks..."), so focus and scroll are lost. A refetch runs after every toggle and on every index bump: two per toggle, the second 2 to 10 s later. | `tasks.service.ts:67`, `:176-179`; `TasksView.svelte:73-78`, `:139-140`; V01 Missed 2; V06 Scout 12 Refuted 1 |
| F3 | A toggle moves the clicked note's group to the top, because groups sort by mtime and the write bumps the mtime. | `commands/vault.rs:802-804`; `index.rs:1082`; V01 Missed 1 |
| F4 | With hide-completed on (the default), a completed row disappears on the refetch. There is no grace period, no undo and no focus handoff. | `tasks.store.svelte.ts:10`; `tasks.logic.ts:59-69`; V10 Missed 2 |
| F5 | The view remounts on every tab activation, so any component-local cursor, scroll or collapse state resets. | `EditorView.svelte:40`, `:72-73`; V04 Missed 1; V08 Refuted 2 |
| F6 | The only palette entry is `tasks:toggle`, "Toggle Tasks View". It closes the tab when the tab is already active. Fuzzy matching runs on the label only, so "todo" and "overdue" find nothing. | `commands.ts:196-204`; `tasks.service.ts:211-220`; `command-palette.logic.ts:22-26`; V02 Confirmed |
| F7 | `AppCommand` is `{ id, label, category, shortcut?, action }`. The list is built when the palette renders, so labels can depend on state (`railGoToCommands` already does this). | `command-palette.types.ts:1-7`; `AppOverlays.svelte:19`; `commands.ts:61-72`; V02 Confirmed |
| F8 | `toggle_task_status` accepts any `TaskStatus` as `target` and is guarded by line, expected text and expected status. Status actions (in progress, cancel, reopen and so on) therefore need no Rust change. | `contracts/commands.ts:108-111`; `tasks.service.ts:147-153`; `commands/vault.rs:770-809`; V01 Confirmed; V10 Scout 19 Confirmed |
| F9 | Text edits (due, priority, description) have no usable write path for ordinary lines. `write_task_lines` locates lines by `id` signifier anchor and cannot address an anchorless line. | `contracts/commands.ts:113-116`; `task_lines.rs:24-28`; `122-*.md` "Gap to settle"; V10 Scout 19 Confirmed |
| F10 | Pure token patchers already exist in Todoist sync: `setTaskStatus`, `setDueDate`, `setPriority`, `addTag`, `removeTag`, `replaceDescription`. They mirror the Rust regexes. | `features/todoist-sync/task-line.logic.ts:184-323`; V10 Scout 19 Confirmed |
| F11 | A trailing block id `^abc` must stay last on the line. An appended token after it breaks block refs and can leak into Todoist. | `task-line.logic.ts:290-323`; V06 Missed 5-6 |
| F12 | The Calendar already ships a full keyboard model, with bare keys: `T`, `N`, `D/W/M`, `?`, plus `Cmd+Z` / `Cmd+Shift+Z` undo and redo. It has a pure resolver, a typing/dialog/gesture guard, a `CALENDAR_SHORTCUTS` table tied by test to the help docs, and a shortcuts dialog. | `event-calendar-keys.logic.ts:41-109`; `EventShortcutsDialog.svelte`; `commands.ts:231-245` (`event-calendar:undo`/`redo`) |
| F13 | An undo toast precedent exists: sonner `toast(..., { action: { label: 'Undo', onClick } })`. | `event-calendar.service.ts:1468-1480` |
| F14 | `registerKeybinding` has no typing guard and calls `preventDefault()`, so in-view bare keys must use a local handler. `/` is already claimed globally, with a typing guard. | `utils/keybindings.ts:60-82`; `global-keybindings.ts:40-50`; V06 Scout 12 Confirmed |
| F15 | Global chords taken (`global-keybindings.ts:62-203`): Cmd+P, O, S, W, G, B, N, D, E, `,`, `=`, `-`, `0`, `\`; Cmd+Shift+`[`, `]`, F, T, C, B, N, H. Free for a view-local handler: Cmd+Z / Cmd+Shift+Z (the Calendar handles them locally), Cmd+F, Cmd+Enter, Alt+arrows, F2, Shift+F10 and the ContextMenu key. | file read; the Cmd+F behaviour in the Tauri webview is not checked |
| F16 | No virtualization. PRD non-goal (PRD:38) and assumption A9: 50 rows per group, then "Show N more" (Issue 112). `virtua` `VList` exists, but only `RailNoteList` uses it. | V07 Scout 14 Refuted 7 |
| F17 | `parseTaskTextSegments` runs in the template for every row on every render, with no memo. | `TasksView.svelte:194`; V07 Scout 14 F15 |
| F18 | Tests pin row anatomy by position: the first `span` is the text and the first `button` is the toggle, plus exact aria-label strings. E2E finds the hide toggle with `button[title*="completed"]` and the toggle by name substring. | `TasksView.test.ts:96`, `:117`, `:133`, `:144-157`; `e2e/specs/tasks-view.spec.ts:47`, `:52-54`; V03 Missed 7; V06 Scout 12 Refuted 4 |
| F19 | The DropdownMenu wrapper has sub-menus, radio and checkbox items, and a `shortcut` slot (`components/ui/dropdown-menu/`: `dropdown-menu-sub*.svelte`, `dropdown-menu-shortcut.svelte`). Popovers and dialogs render in a portal, so their keys do not reach a list handler. | ls; `113-*.md` |

## 2. Design principles for this angle (opinion, grounded)

1. **One cursor, owned by the store.** The current row is a `filePath:lineNumber` key in `tasksStore`, not DOM focus alone and not a component local. It survives refetches, remounts (F5) and reorders (F3). V04 net 8 and V06 net 5 say the same.
2. **Every action has three doors:** a key on the focused row, an item in the row's action menu, and a palette command that acts on the cursor. The palette door gives a full-text, discoverable surface without bare keys. It works under A8 as written.
3. **No write without the guard.** Every action goes through a Rust command that checks line, text and status, then `settleTaskWrite` (indexing rule 6; V02 "Rule constraints"). Undo calls the same command with the old and new values swapped.
4. **Calm list.** The list never blanks (108), the order never jumps (A3 path sort, Issue 112), and a just-completed row stays visible as long as the cursor is near it (owner question Q3).
5. **Copy the Calendar's keyboard architecture, not Kanban's inline switch.** That means a pure resolver, a shortcuts table, a help dialog and a test tying the table to the docs (F12; V06 Scout 12 Confirmed). Do not import from `event-calendar`: Issue 110 adds `event-calendar -> tasks`, so `tasks -> event-calendar` would be a cycle (V05 Refuted 2).

## 3. Main view mockup

Default state after 108 to 112, with the cursor on row 2, the search box empty and the A8-compliant key set. ASCII only. `>` marks the cursor row, which gets a ring rather than a glyph in the real UI.

```
+----------------------------------------------------------------------------------------+
| Tasks  38 open . 9 notes  (o)        [ Search tasks     Cmd+F ] [Status: open v]        |
|                                       [Due v] [Priority v] [Display v] [Keys]            |
+----------------------------------------------------------------------------------------+
| Open tasks under headings containing #to-list.   [Clear]                       [Reset]  |
+----------------------------------------------------------------------------------------+
| v  Projects/acme.md                                                     2 / 5 open      |
|      ( )  Send invoice to ACME                 due Nov 3 (overdue)  high          [...] |
|  >   (/)  Draft Q4 plan  [[Q4 Planning]]       in progress                        [...] |
|        ( )  Collect numbers from finance       #finance                           [...] |
|      (x)  Book kickoff room                    done . Cmd+Z to undo               [...] |
|                                                                                        |
| v  Daily/2026-11-12.md                                                  3 open          |
|      (!)  Call the bank                        important                          [...] |
|      ( )  Review PR 412                                                           [...] |
|      ( )  Renew passport                       due Dec 1                          [...] |
|      Show 47 more                                                                      |
|                                                                                        |
| >  Areas/home.md                                                        1 open          |
+----------------------------------------------------------------------------------------+
| Up/Down move  Alt+Up/Down group  Space done  Enter open at line  Shift+F10 actions      |
| Cmd+Z undo  Cmd+F search  Esc back to list                                (hide hints)  |
+----------------------------------------------------------------------------------------+
```

Row action menu, opened by Shift+F10, the ContextMenu key, the `[...]` button or right click (one shared menu, NoteRowMenu pattern, V10 net 6):

```
+-----------------------------------------+
| Open at line                 Enter      |
| Copy task text                          |
|-----------------------------------------|
| Status                    >  | Todo        |
|                              | In progress |
|                              | Done   Space|
|                              | Cancelled   |
| Due                       >  | Today       |
|                              | Tomorrow    |
|                              | Next week   |
|                              | Pick date...|
|                              | Clear       |
| Priority                  >  | Highest .. Lowest, None |
|-----------------------------------------|
| Edit text                    F2         |   (gated, Q8)
+-----------------------------------------+
```

Notes on the mockup:

- The toolbar is the single `pane-toolbar` element, with no height, padding, gap, border or wrap overrides (`pane-toolbar.test.ts:30`, `:46-50`; V04 net 2). The rule sentence and the hint strip are plain body rows outside it (V03 Missed 4). The two-line toolbar drawn above is for readability only. At width it is one row, and below 560 px the three menus fold into `Filters (n)` as Issue 111 specifies.
- `(o)` is 108's `role="status"` spinner. The count follows 111 and counts only rows with `dimmed: false`.
- Glyphs, words and tones come from 109's `statusGlyph` table, using theme tokens only (V09 net 7). Chips come from 109's `taskChips`. Text comes from `taskDisplayText`, never raw `metadata.description` (V01 Refuted 8).
- The "done . Cmd+Z to undo" row is the linger state of slice S7 (owner question Q3).
- `[Keys]` opens the shortcuts dialog. It is a labelled button rather than a bare `?`, to stay inside A8 until Q1 is answered.
- The root background moves from `bg-card` to the editor surface (V04 net 4, V09 net 5). That is a visual slice outside this angle, mentioned only so the mockup is not read as keeping `bg-card`.

## 4. Interaction model

### 4.1 Key map (v1, A8-compliant: no bare letters)

Handled by one `keydown` on the list container through a pure resolver. Every key returns `null` when the target is a typing target (`isTypingTarget`, moved to `utils/typing-target.ts` by 113), when the key lands on a control inside the row (113's `onRow` rule, so Space on the circle or Enter on a wikilink fires once), or with unexpected modifiers.

| Keys | Action | Source |
|---|---|---|
| Up / Down, Home / End | Move the cursor across rendered rows. "Show N more" is a stop in the sequence. | 113 |
| Space | Toggle (`toggleTarget`) | 113 |
| Enter | Open the note at the task line (`openNoteAt`, kind `line`) | 113, `TasksView.svelte:68` |
| Alt+Up / Alt+Down | Jump to the previous or next group header | new (V06 Scout 12 rec 2 called group jumping "the one extra that pays for itself") |
| Left / Right on a group header | Collapse or expand (112's chevron state) | new, needs 112 |
| Shift+F10, ContextMenu key | Open the row action menu at the cursor | new |
| Cmd+Z / Cmd+Shift+Z | Undo / redo the last task write made from the view | new; Calendar precedent F12. Not a global chord (F15) |
| Cmd+F | Focus the search box | new; not global (F15). Its webview default is unverified, so test it in e2e |
| Esc in search | Return focus to the cursor row | new |
| F2 | Inline edit of the task text (gated by Q8) | new |

Inside the action menu, bits-ui menus offer typeahead on item text, so Shift+F10, then `t`, then Enter could pick "Tomorrow". This is from memory and must be checked in the rendered DOM before a ticket relies on it.

**Bare-key layer (only if the owner reopens A8, Q1).** Following the Calendar precedent (F12): `j`/`k` move, `x` toggles, `s`/`d`/`p` open the Status, Due or Priority sub-menu at the cursor, `o` opens, `e` edits, `?` shows the shortcuts. `/` stays the global Search unless the owner says otherwise (V06 net 6). The table, guard and docs tie-in are the same as for the Calendar.

### 4.2 Cursor rules

- `tasksStore.cursorKey: string | null`, plus a setter. The view sets `tabindex="0"` on the row whose key matches, or on the first rendered row when there is none, and `tabindex="-1"` on the others. This is 113's roving model with the cursor moved from the DOM into the store.
- After any refetch, a pure `reconcileCursor(prevOrder, nextOrder, key)` in `tasks-keys.logic.ts` keeps the key when it still exists. Otherwise it moves to the next surviving row of the previous order, then the previous one, then `null`. The view re-focuses only when focus was inside the list before the refetch (opinion: never steal focus from the editor or the search box). The Calendar's `parkFocusAfterDelete` only re-parks on `<body>` (V06 Scout 12 Refuted 5), so this is new logic, not a copy.
- `navOrder` is the flat ordered key list. 113 takes it from DOM order across rendered rows, which already skips collapsed groups and capped rows. Keep that: it avoids a second derived list and stays correct with the 50-row cap.

### 4.3 Quick actions and their write paths

| Action | Doors | Write path | Rust/IPC change |
|---|---|---|---|
| Toggle | Space, circle, menu, palette | `toggle_task_status` (exists) | none |
| Set status (todo, in progress, done, cancelled; optionally question, important, forwarded) | menu, palette | `toggle_task_status` with explicit `target` (F8). New `setTaskStatus(filePath, task, target)` in `tasks.service.ts`; `toggleTask` becomes a call to it with `toggleTarget(status)` | none |
| Undo / redo | Cmd+Z, toast "Undo", palette | The same guarded command with expected = new and target or text = old | none for status; for text, the S8 command |
| Reschedule (today, tomorrow, next week, pick date, clear) | menu, palette | Guarded line rewrite: new text from `setDueDate` (F10), keeping a trailing `^id` last (F11) | yes, S8 (resolves 122's locator gap) |
| Set priority | menu, palette | Same command, `setPriority` | yes, S8 |
| Open at line | Enter, text click, menu, palette | `openNoteAt` (exists). Known glitch: a dirty open tab can land on a shifted line (V10 Scout 19 Confirmed) | none |
| Copy task text | menu, palette | clipboard, display text | none |
| Edit text inline | F2, menu (gated by Q8) | Same command as S8, with protected tokens (Todoist anchor, trailing block id) split off before editing and re-joined after | yes, S8 |

Rationale for the S8 command shape: V10 net 5 and V10 Missed 7 recommend a separate guarded command modelled on `toggle_task_status`. It takes `{ path, lineNumber, expectedText, expectedStatus, newText, newStatus? }`, is confined to the open vault, rewrites only the text after `] ` (keeping indent and list marker), refuses `\n` and `\r`, indexes, emits `vault-index-updated`, and returns `{ stale, updatedContent, updateResult }`. This is the PRD's original `update_task_lines` row (PRD "IPC changes", Issue 09 there). The alternatives are worse. A line-number locator added to `write_task_lines` also forces a change to its TS port `task-line-edits.logic.ts` (V10 Missed 7). Giving a line an anchor first collides with the Obsidian Tasks `id` signifier meaning and with ADR-0037 (V10 Scout 19 Refuted 12).

Patchers: do not write a third regex mirror (V10 "Conflicts", scout 19 rec 3). Two options are open (Q6). (a) Move `task-line.logic.ts`'s token functions and `ID_EMOJI` into `src/lib/utils/task-line-tokens.ts` (pure, so it fits `utils/`). Todoist sync imports them from there, and no feature pair is added. (b) Import from `features/todoist-sync` and commit the new `tasks -> todoist-sync` pair in `feature-cycle-baseline.json`. Opinion: (a). `settleTaskWrite` sits in `core/` precisely so the two features do not import each other (`task-write.service.ts:10-11`).

### 4.4 Command palette integration

All commands live in `src/lib/app/commands.ts`. The app layer may import features, so no layer rule is touched. Each command routes through a `tasks.service.ts` function that sets real `tasksStore` state, so `commands.test.ts` can assert on store state rather than only on a mock call (V02 "Rule constraints", ADR-0007).

| Command id | Label | Behaviour | Needs |
|---|---|---|---|
| `tasks:open` | `Tasks: Open` | Idempotent `openTasksTab()`; focus goes to the list | none (V02 net 6) |
| `tasks:focus-search` | `Tasks: Search tasks` | Opens the tab, then focuses the search box | 111 |
| `tasks:status-filter` | `Tasks: Show all statuses` / `Tasks: Show open only` | As 113 specifies | 111 |
| `tasks:preset-*` | `Tasks: Show overdue`, `Tasks: Show tasks with no due date`, `Tasks: Show high priority`, `Tasks: Reset filters` | `openTasksWith({ quick })`: sets `quick`, opens the tab, focuses the list | 111 |
| `tasks:group-*` | `Tasks: Group by note / folder / due date / priority / status` | `openTasksWith({ group })` | 112 |
| `tasks:view:<id>` | `Tasks: Open view <name>` | Dynamic per saved view, like `railGoToCommands` | 124 |
| `tasks:row-*` (only while the Tasks tab is active and `cursorKey` is set) | `Task: Mark done`, `Task: Mark in progress`, `Task: Cancel`, `Task: Due today`, `Task: Due tomorrow`, `Task: Clear due date`, `Task: Priority high`, `Task: Open at line`, `Task: Copy text`, `Task: Undo last change` | Acts on the cursor row. The palette closes, then awaits the action (`CommandPalette.svelte:27-37`), and the tab stays active | S5 / S8 |

Rules a ticket must carry:

- A preset that changes `sectionTag` from outside the view must keep the toolbar input in sync and call `buildTaskIndex` when the tab is already mounted (V02 Refuted 6 and 7). Quick filters and group are client-side `$derived` (111, 112) and need no refetch.
- Focus intent: `openTasksWith` sets `tasksStore.pendingFocus: 'list' | 'search' | null`. The view consumes it once on mount or in an effect (with `untrack`, ADR-0006) and clears it. This is needed because the view remounts on activation (F5), and 113 currently hard-codes "focus search on mount" (Q2).
- `Toggle Tasks View` keeps its close-when-active behaviour (Q13). `Tasks: Open` is the safe palette entry.
- Category: 113 says `Navigation`. Opinion: a `Tasks` category groups them visibly, the way `Todoist` does (`commands.ts:247-264`). This is a cosmetic owner call (Q9).
- No rail item. A Tasks rail entry falls under ADR-0033 and needs an amendment (V02 "Rule constraints", V04 net 1). The palette is the entry point for this angle.
- B5: few of the owner's tasks carry dates (PRD:62). The due presets are cheap, but they rank below status and group presets. Ship `Show tasks with no due date` first.

### 4.5 Performance at scale

Facts: no measurement of the owner's vault exists. The available instruments are the `buildTaskIndex completed in` log (`debug.ts:41-50`), the `Tasks: N files, M tasks` debug line (`tasks.service.ts:79`) and 112's planned `TASK-PROFILE` wrap. `timeAsync` also logs superseded calls (V07 Missed 7).

The redesign keeps or fixes these costs:

1. **Blanking and refetch flashes:** 108 fixes them, and every keyboard slice depends on it. Without 108, focus is destroyed on every toggle (V06 Scout 12 Refuted 1).
2. **Disk scan on every mount and bump while `#to-list` is the default** (V02 Missed). This is fixed by the existing 074 -> 115 -> 121 chain, not by this proposal. Do not patch it here.
3. **Rapid keyboard writes.** Holding Down and pressing Space repeatedly sends one IPC per row. Line numbers do not shift on a status change, so neighbouring rows stay valid. The real risk is the same row acted on twice before the refetch: the second call carries the old `expectedStatus` and comes back `stale`, with an "Click it again" toast. Minimal fix (opinion, simplest that works): a `pendingKeys: Set<string>` in `tasksStore`. While a row's write is in flight, actions on that row are ignored and its glyph shows a small spinner. Issue 115's overlay (PRD "Freshness") is the full fix and arrives later. Do not build a write queue.
4. **Render cost per row:** compute display segments once per row in 111's `buildTaskRows`, not in the template (F17). This folds into 109 or 111 as a note, not a slice.
5. **Volume:** keep A9's 50-row cap (F16). Keyboard navigation works over rendered rows, and End stops at "Show N more". Virtualization stays an owner question (Q11). It would replace `ScrollArea`, break the e2e scroll test (`tasks-view.spec.ts:75`) and the collapse design, and needs DOM-order navigation to become index-based.
6. **Remount refetch:** after 108 the cached list shows at once on remount (V07 Missed 8), so the refetch is invisible. Skipping it is not proposed, because lifecycle tests lock the first fetch on mount (V07 net 5).

## 5. Rust/IPC vs frontend only

| Slice | Frontend only | Rust/IPC (Both gate) |
|---|---|---|
| S0 to S7, S9, S10 | yes | no |
| S8 guarded line rewrite (reschedule, priority, later text edit) | TS service, menu, undo | yes: new `#[ts(export)]` command and DTOs, a regenerated `src/lib/contracts/generated/`, confinement to the open vault, an e2e mock in `e2e/mocks/tauri-core.ts` and `vault-index.ts`, and a shared fixture for the patchers (122's checklist) |
| S11 inline text edit | uses S8 | none beyond S8 |

No slice changes the `Task` DTO, `INDEX_SCHEMA_VERSION`, Rust `checked`, QueryJS `completed` or the Todoist sync (V05 net 2, V09 net 10).

## 6. Vertical slices

Each slice can be demoed alone. A prefactoring slice comes first where one is needed. "Amends N" means the work is written into that existing Issue, with its line references refreshed, rather than a new file. Gates follow CLAUDE.md rule 6. Each slice updates `help/documentation/10-tasks-and-todoist.md` and, for keys, `20-keyboard-shortcuts.md` (A12, PRD:132).

**S0. Prefactor: stable row hooks (amends 108).** Add `data-task-text` and `data-task-toggle` (and later `data-task-actions`). Rewrite the positional selectors in `TasksView.test.ts:96`, `:117`, `:133` to use them, in the same commit (V07 net 3, V01 Missed 5). No behaviour change. Frontend.
- Demo: the suite passes, and a chip or button can now be added before the text.

**S1. List stays mounted (108, unchanged scope plus S0).** Prerequisite for every keyboard slice. Frontend.

**S2. Row anatomy and open rule (109, 110, unchanged).** Supplies the glyph word and display text that the keyboard labels and menus use. Frontend, plus e2e.

**S3. Keyboard core (amends 113).** Changes to 113:
- (a) The cursor lives in `tasksStore.cursorKey` with `reconcileCursor`, plus getter and store tests (an ADR-0034 getter test if it is derived).
- (b) Alt+Up/Down group jump.
- (c) Focus on mount follows `pendingFocus`, else the list (Q2).
- (d) A `pendingKeys` guard (4.5 item 3).
- (e) **Blocked by 108 and 109 instead of 112.** 113 takes `index` and `count` from DOM order, so it does not need 112's data model. Collapsed-group skipping comes for free once 112 lands, and the "focus search" part waits for 111. This moves keyboard value three slices earlier (Q4).

Tests: `tasks-keys.logic.test.ts` (resolver and `reconcileCursor`), and `TasksView.test.ts` with real stores (ArrowDown moves focus, Space toggles once on the row and once on the circle, the cursor survives a refetch that removes its row, and the cursor survives an unmount and remount). E2E: one arrows + Space + Enter run that asserts rendered content (rule 8). Frontend, plus e2e, because 113 changes the circle label.
- Demo: Cmd+Shift+T, Down Down, Space, Enter lands on the line.

**S4. Shortcuts table and help (new).** Build a `TASKS_SHORTCUTS` table in `tasks-keys.logic.ts`, a `[Keys]` toolbar button opening a dialog modelled on `EventShortcutsDialog.svelte`, a `Tasks: Show keyboard shortcuts` palette command, a dismissible hint strip (opinion; Q12), and a test that ties the table to the resolver and the doc tables, as the Calendar does. Blocked by S3. Frontend.
- Demo: the dialog lists exactly the keys that work.

**S5. Row action menu with status actions and undo (new; carves status out of 122).** One shared `DropdownMenu` with sub-menus (F19). It opens from the visible `[...]` button (122 requires a visible, named action; no `opacity-0`, V10 "Conflicts"), from Shift+F10, from the ContextMenu key and from right click. Items: Open at line, Copy text, Status (todo, in progress, done, cancelled). Service: `setTaskStatus` generalizes `toggleTask`, keeping the dirty-buffer protocol, the `stale` handling and `afterTaskWrite` (`tasks.service.ts:130-179`). Undo is one level, held in `tasksStore.lastWrite`, shown as a sonner Undo action (F13) and bound to Cmd+Z. It replays through the same guarded command. `menu-item-anatomy.test.ts` applies. Blocked by S3 and 110. Frontend only (F8). After this, 122 keeps only due and priority.
- Demo: Shift+F10, Status, In progress, then Cmd+Z restores `[ ]`.

**S6. Palette: open, search and presets (new, plus the 113 command).** `tasks:open`, `tasks:focus-search`, `tasks:status-filter`, the quick presets and `openTasksWith` with `pendingFocus`. Blocked by 111 and S3. The group presets are a follow-up in the same Issue once 112 lands, or a second small Issue. Tests in `commands.test.ts` assert `tasksStore.quick` / `group` and the active tab. Frontend.
- Demo: Cmd+P "tasks no due" shows the filtered list with the cursor on the first row.

**S7. Completed rows linger (new, gated by Q3).** A session-only `recentlyClosed: Set<string>` in `tasksStore` keeps a row closed from the view visible, struck through and dimmed, with "Cmd+Z to undo", until the cursor moves two rows away, a filter changes or the tab is left. Pure `applyLinger(visibleRows, recentlyClosed)` in `task-query.logic.ts`. Blocked by S5 and 111. Frontend.
- Demo: completing five tasks in a row does not move the list under the cursor.

**S8. Reschedule and priority from the row (amends 122; Rust).** Prefactor first (S8a, Q6 option a): move the Todoist token patchers to `utils/task-line-tokens.ts`, with tests moved and Todoist imports updated, and no behaviour change. Then S8b: the guarded `update_task_line` command (4.3), `updateTask` in `tasks.service.ts` with the dirty-buffer protocol, the menu's Due and Priority sub-menus (Pick date uses a native `type="date"` input, the `EventForm.svelte:86-88` precedent; natural-language dates stay a non-goal, PRD:38), undo through the same command, and the trailing block id kept last (F11). Blocked by S5, 112 (122's existing edge) and 085 (122's existing edge). Gate: Both, plus e2e (the mock changes).
- Demo: Shift+F10, Due, Tomorrow, the chip updates, Cmd+Z restores it.

**S9. Palette row commands (new).** `Task: ...` commands appear only while the Tasks tab is active and `cursorKey` is set (F7). Status commands need S5; due and priority commands need S8. Ship the status half first. Frontend.
- Demo: Cmd+P "due tom" completes the reschedule on the cursor row.

**S10. Bare-key layer (new, gated by Q1, reopening A8).** Adds the 4.1 bare keys to the resolver and table, with the Calendar's guard. Blocked by S4 and S5 (S8 for `d`/`p`). Frontend.

**S11. Inline text edit (new, gated by Q8; outside A7).** F2 or the menu turns the text into an input holding the editable part of `task.text`. Protected tokens (the Todoist anchor and a trailing `^id`) are split off by a pure `splitProtectedTokens` and re-joined on save. Enter saves through S8's command, Esc cancels. NoteRowMenu's inline-rename discipline applies (cancel flag, rAF focus, Escape; V10 Scout 19 Confirmed). Double-click does not edit, because the first click already opens the note and unmounts the view (V10 Scout 19 Confirmed). Blocked by S8. Frontend.

### Blocking edges

```
108(S0+S1) --> 109 --> 110 --> 111 --> 112 --> (122 edge)
   |            |       |       |        \
   |            v       |       v         v
   +------> S3 (113) <--+     S6 ------> S6 group presets
              |   \             (needs S3)
              v    v
             S4    S5 (needs 110) --> S7 (needs 111, Q3)
              \     |  \
               \    |   S9 status half
                \   v
                 \  S8a --> S8b (needs 112, 085) --> S9 due/priority half
                  \                  \
                   +-> S10 (Q1) <-----+--> S11 (Q8)
```

Hot-file note: 108, 109, 110, 111, 113, 198 and 227 already run in series on `TasksView.svelte` (`priority-2026-11-08.md:60`; V04 Refuted 4). S3 to S11 join that series. No two of them should run in parallel relay workflows.

## 7. Testing notes that apply to every slice

- Never mock `tasksStore` or a `.logic.ts`. Mock only `invoke`, `listen`/`emit` and `plugin-fs`, as `TasksView.test.ts:7-28` does (ADR-0007; V07 Scout 13 Confirmed).
- New pure files: `tasks-keys.logic.ts` (resolver, `reconcileCursor`, shortcuts table) and the `task-query.logic.ts` additions (`applyLinger`). Each needs happy-path, empty and error-shaped tests (TESTING.md).
- Every new store getter (`cursorKey`, `pendingKeys`, `lastWrite`, `recentlyClosed`, `pendingFocus`) gets a store test. A derived getter also needs the ADR-0034 test.
- Changing the circle `aria-label` breaks exact unit assertions (`TasksView.test.ts:117`, `:144`, `:156`) but not the e2e substring match (V06 Scout 12 Refuted 4). Update the unit assertions on purpose and say so in the commit; do not weaken them.
- Commands: assert real store state and the active tab in `commands.test.ts`, not only that the mocked service was called.
- Keyboard e2e goes through `bash scripts/e2e.sh` only. Tests that rely on a non-empty section tag are invalid until the mock's `getTasksInSection` matches Rust (V04 Missed 2).

## 8. Questions only the owner can answer

1. **A8 (bare keys).** A8 says "No bare-letter shortcuts in v1" (PRD:128, not vetoed). The Calendar already ships `T`, `N`, `D/W/M` and `?` with a typing guard (F12). Reopen A8 for Tasks (enables S10), or keep chords, menus and the palette only?
2. **Focus on open.** Issue 113 focuses the search box on mount, so typing filters at once. This proposal focuses the list, so arrows and Space work at once, and a preset command can choose. Which is the default?
3. **Completed rows.** Should a row closed from the view vanish at once (today, F4) or linger, struck through, until the cursor moves away (S7)?
4. **Order of the chain.** Move 113 (keyboard) to depend on 108 and 109 instead of 112, so keyboard work lands before quick filters and grouping?
5. **122 locator.** Accept a new guarded `update_task_line` command (recommended; Both gate), or give lines an `id` signifier anchor first (collides with the Obsidian Tasks dependency id and with ADR-0037)?
6. **Patcher home.** Move Todoist's token patchers to `utils/` (recommended), or let `features/tasks` import `features/todoist-sync` and accept the new feature pair?
7. **Undo depth and scope.** One level (proposed), or a stack like the Calendar's history? Should Cmd+Z in the Tasks tab undo only the view's own writes (proposed)?
8. **Inline text edit.** A7 limits row edits to status, due and priority. Is editing the task text from the view wanted (S11)?
9. **Palette.** Is a new `Tasks` category OK, or should everything stay under `Navigation` as 113 says? Are cursor-scoped `Task: ...` commands in the palette OK, given they only appear while the tab is active?
10. **Multi-select and bulk actions.** These are a PRD non-goal (PRD:34). Power users often expect Shift+Up/Down to select, then complete or reschedule in bulk. Still out? (If in: all-or-nothing per file, and the Todoist caps of 25 close/reopen and 50 field pushes apply, V06 Scout 11 Confirmed.)
11. **Volume.** Keep A9's 50-row cap and no virtualization? To decide with data, the owner can read `buildTaskIndex completed in` and `Tasks: N files, M tasks` from a session log with the debug log on.
12. **Hint strip.** Always visible, dismissible (proposed), or only in the shortcuts dialog?
13. **Cmd+Shift+T.** Keep closing the tab when it is active (today), or make it open-or-focus?
14. **Due presets.** Given B5 (few dated tasks), ship only "No due date" and status presets first, or include Overdue and Today from the start?

## 9. Not checked

Nothing was rendered or run. Not checked: whether Cmd+F has a default behaviour in the Tauri webview, whether bits-ui `DropdownMenu` typeahead works on sub-menu items, the `menuitemradio` role names (Issue 111 flags the same), the real vault's task volume, and how screen readers handle roving focus in the Tauri webview. The ARIA content-model point (rows with interactive children use `list`/`listitem`, not `listbox`/`option`) comes from V06 Scout 12 Refuted 6, itself from memory of WAI-ARIA.
