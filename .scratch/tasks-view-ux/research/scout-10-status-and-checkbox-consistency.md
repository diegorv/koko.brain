# Scout 10: status and checkbox consistency (editor live preview vs TasksView)

Scope: how a task checkbox looks and behaves in the editor live preview versus the Tasks view, and what a shared checkbox needs. Read-only audit, nothing was run. Facts are verified in code with path:line; opinions are marked as such. Paths are relative to the repo root.

## Summary

The same markdown task renders and behaves differently in the three places that show it. The editor draws a square checkbox, and only for `[ ]`, `[x]`, `[X]`: the GFM Lezer parser does not recognise `[/] [-] [?] [!] [>]`, so those lines show raw bracket text after a bullet. The Tasks view draws a circle and knows all 7 Rust statuses, but it collapses them into 2 glyphs. Its filter, strike-through and stats use Rust's `checked` flag (true for every status except todo) while its click and circle use `toggleTarget` (closed only for done/cancelled). That mix makes in-progress, important, question and forwarded tasks vanish when "hide completed" is on (the default), and show as an open circle with struck-through text when it is off. A consistent design needs one shared status model in a layer both `core/` and `features/` may import (`utils/`), one checkbox visual vocabulary for 7 statuses, and a Lezer extension if the editor should render the non-GFM statuses.

## Facts

### Status model (Rust is the source of truth)
- 7 statuses: `todo | done | cancelled | in-progress | question | forwarded | important` (`src/lib/contracts/generated/TaskStatus.ts:7`; Rust enum `src-tauri/src/vault/task.rs:42-50`).
- Char mapping: `' '` todo, `x`/`X` done, `-` cancelled, `/` in-progress, `?` question, `>` forwarded, `!` important; unknown char falls back to todo (`src-tauri/src/vault/parsing.rs:1590-1601`). Inverse for writing: `status_checkbox_char`, done writes lowercase `x` (`parsing.rs:1606-1616`).
- Task line regexes accept exactly `[xX \-/?!>]` after `-*+` or `N.` and require a space after `]` and non-empty text (`parsing.rs:1426-1435`, `1635-1640`).
- `Task.checked` is `check_char != ' '` (`parsing.rs:1649`, `1666`); doc says "anything other than todo" (`src-tauri/src/vault/task.rs:24`). So `checked` is true for `[/] [?] [>] [!] [-] [x]`.
- No TS char-to-status map in the tasks feature. A second copy exists as `STATUS_CHAR` in `src/lib/features/todoist-sync/vault-scan.service.ts:19-27`, and a third string-based one in `src/lib/features/todoist-sync/task-line.logic.ts:118-133`.

### Editor live preview checkbox
- Parser: `markdown({ extensions: [GFM, MathExtension, HighlightExtension] })` (`src/lib/core/markdown-editor/highlight-styles.ts:87`). The GFM `TaskList` extension only matches `/^\[[ xX]\][ \t]/` inside a `ListItem` (`node_modules/@lezer/markdown/dist/index.js:2223`). So `[/] [-] [?] [!] [>]` never produce a `Task`/`TaskMarker` node.
- Handler: `taskMarkerHandler` on `TaskMarker` replaces `[ ]`/`[x]` with `TaskCheckboxWidget`, only when the cursor is not on that line (`.../live-preview/inline/handlers/simple-widget-handlers.ts:19-32`). It computes `checked = content !== '[ ]'` (line 27).
- Widget: `<input type=checkbox class="cm-lp-task-checkbox">`; `mousedown` does `preventDefault()` and dispatches a change of the char to `' '` if checked, else `'x'` (`.../live-preview/widgets.ts:28-56`). It does not call `stopPropagation` and `ignoreEvent()` returns `false`.
- Visual: 18x18px square, `2px` border, `--radius-xs`, transparent fill; hover border `--lp-task-hover`; checked fills `--lp-task-checked` with a CSS-drawn white-ish checkmark (`.../live-preview/styles.ts:231-262`). Colors are `--lp-task-*` literals `#585b70/#a78bfa/#a78bfa/#1e1e2e` declared once, inside the `.dark` block (`src/app.css:212`, `313-316`). A grep finds no light-mode override of `--lp-task-*` (unverified whether another mechanism supplies them in light mode, see open questions).
- The task `- ` is hidden with the static mark `cm-formatting-task-marker` (`font-size: 0`, `styles.ts:129-131`) only when the ListItem has a `Task` child (`simple-widget-handlers.ts:66,74-79`).
- A `- [/] text` line is not a task to the editor: `listMarkHandler` replaces `- ` with a bullet widget and the `[/]` text stays raw (`simple-widget-handlers.ts:86-96`; the skip at line 91 only covers a bare `[.]` with no text).
- Done task text is not struck through or dimmed in the editor: the only task-related rules in `live-preview/` are `cm-formatting-task-marker`, `cm-lp-task-checkbox*`, and the unrelated `cm-lp-qjs-tasklist` (grep of `styles.ts`, `widgets.ts`, handlers).
- Test coverage: handler tests cover `[ ]`, `[x]` and cursor-on-line only (`src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.test.ts:42-62`). No test for custom status chars.
- Click writes through a CodeMirror transaction: it is undoable and marks the tab dirty. It writes nothing but the char (no done date stamp).

### Tasks view glyph and behavior
- Glyph: `Circle` (open) or `CircleCheckBig` (checked), 16px lucide icons; chosen by `completes = toggleTarget(task.status) === 'done'` (`src/lib/features/tasks/TasksView.svelte:171,182-186`). Colors: `text-muted-foreground`, hover `text-primary/80`, done `text-primary/60`.
- `toggleTarget`: done and cancelled reopen to todo, every other status completes to done (`src/lib/features/tasks/task-status.logic.ts:5-8`). The click calls the Rust `toggle_task_status` with `expectedText/expectedStatus/target` (`tasks.service.ts:147-153`), which writes via `set_task_status_in_content` and rewrites disk, then `settleTaskWrite` syncs an open editor tab (`tasks.service.ts:162,176-179`; `src-tauri/src/commands/vault.rs:770-808`). It also stamps no done date.
- Text styling uses `task.checked`: `text-muted-foreground line-through` when checked (`TasksView.svelte:191`).
- "Hide completed" (default `true`, `tasks.store.svelte.ts:11`) calls `filterCompleted`, which keeps a task only when `!task.checked` or when it has an unchecked descendant (`tasks.logic.ts:17-26,34-52`). `computeTaskStats` counts `completed` from `task.checked` (`tasks.logic.ts:103`).
- Only the two glyphs exist for all 7 statuses; the view never reads `task.status` for rendering except through `toggleTarget` (`TasksView.svelte:171`). Tests cover the important-task circle and click (`src/tests/lib/features/tasks/TasksView.test.ts:138-149`, `task-status.logic.test.ts:10-13`, `tasks.service.test.ts:255-265`) but no test for hide-completed or strike-through with a non-done checked status (the `tasks.logic.test.ts` helper derives `status` from `checked` as only `done`/`todo`, line 16).
- A third place shows tasks: `EventTaskChip.svelte` defines `closed = done || cancelled` and shows `Circle`/`CircleCheckBig` (`src/lib/features/event-calendar/EventTaskChip.svelte:14-18,38-44`), its comment noting that Rust's `checked` is true for every non-todo status. Todoist sync uses the same closed rule (`task-line.logic.ts:118-120`).

### Live preview constraints that apply (docs/agents/live-preview-rules.md)
- Rule 1: hide syntax with `Decoration.replace`; a replace from the inline ViewPlugin must stay within one line; new hidden/replaced visuals must not use `font-size: 0` marks (the existing task-marker mark is an older instance).
- Rule 2/3: widgets are rebuilt on scroll re-entry; cheap DOM is fine, only cache expensive results. A checkbox is cheap.
- Rule 11: interactive widget elements must `stopPropagation` on `mousedown` so the click does not move the cursor onto the line (which reveals raw markdown and destroys the widget). `TaskCheckboxWidget` uses `preventDefault` only (`widgets.ts:40-47`); it dispatches in the same mousedown, so it works today, but it does not follow the listed pattern.
- Rule 5: `checkUpdateAction` reveals per touched line, so any new status widget shows raw markdown when the cursor is on that line (same as today's checkbox).
- Layer rules (`CLAUDE.md`): `core/` must not import `features/` (new violations fail `layer-rules.test.ts`); `utils/` can be imported by any layer. The editor widget lives in `core/`, `toggleTarget` lives in `features/tasks/`.

## Inconsistency matrix

| Status (char) | Editor today | Tasks view glyph | Tasks view text | Tasks view, hide-completed on | Click in editor | Click in Tasks view |
|---|---|---|---|---|---|---|
| todo (` `) | empty square | open circle | normal | shown | -> `x` | -> done |
| done (`x`/`X`) | filled square + check | circle-check | struck, muted | hidden | -> ` ` | -> todo |
| cancelled (`-`) | raw `- [-] text` after bullet | circle-check (same as done) | struck, muted | hidden | none (raw text) | -> todo |
| in-progress (`/`) | raw after bullet | open circle | struck, muted | hidden | none | -> done |
| important (`!`) | raw after bullet | open circle | struck, muted | hidden | none | -> done |
| question (`?`) | raw after bullet | open circle | struck, muted | hidden | none | -> done |
| forwarded (`>`) | raw after bullet | open circle | struck, muted | hidden | none | -> done |

If the editor were to parse the custom chars, `checked = content !== '[ ]'` would make a click on `[/]` write a space (todo), while the Tasks view writes `x` (done). The two toggle rules already disagree on `[-]`: Tasks reopens to todo, which matches the editor rule only by coincidence.

## Problems and opportunities

1. (Bug-like, fact) In the default Tasks view state (hide completed on), in-progress, important, question and forwarded tasks are hidden, because the filter uses `checked` (`tasks.logic.ts:40,22`). With hide-completed off they show an open circle next to struck-through muted text (`TasksView.svelte:171-186,191`), which contradicts itself and contradicts `toggleTarget`'s own comment ("a `[/]` or `[!]` task is checked but a click completes it", `TasksView.svelte:170`). `[!]` important tasks disappearing by default is the most user-visible case. Whether the owner uses those chars is unknown (open question), the code path is certain.
2. Three divergent definitions of "closed": Rust `checked` (anything not todo), `toggleTarget`/EventTaskChip/Todoist (done or cancelled), and the editor widget (`!== '[ ]'`). Filter, stats and strike should use the "closed" definition; today they use the "checked" one.
3. The editor shows raw `[/]` for 5 of the 7 statuses, so a task the Tasks view lists can look like broken markdown when clicked through. Opening a task via click puts the caret on its line (`openNoteAt` line target), which reveals raw markdown anyway for the standard ones, so the visual difference is only seen when the caret moves away.
4. Different shapes and weight: square 18px with checkmark and violet fill (editor) versus 16px lucide circles at 60% opacity (Tasks view, Event chip). Hit target in the Tasks view is the 16px icon (scout 01 notes no focus ring). Colors are `#a78bfa` literals in `.dark` only versus `text-primary` tokens.
5. The editor does not strike through or dim done tasks; the Tasks view does. Not necessarily wrong, but it is a visible rule difference for the same line.
6. Toggle side effects differ: editor click is an undoable in-memory edit; Tasks click rewrites disk through Rust, syncs the open tab, and refetches the whole index (which unmounts the list, scout 01). Neither stamps done dates or handles recurrence, so they match on that point.
7. Duplicated char/status maps in `parsing.rs`, `vault-scan.service.ts` and `task-line.logic.ts`, none in the tasks feature, so any new TS code (glyph per status) needs yet another map unless one is shared.

## Recommendations for the redesign (opinions)

1. First slice, no new UI: make the Tasks view's filter, strike-through and stats use a single `isClosedStatus(status)` (done or cancelled) instead of `checked`. Put it in `task-status.logic.ts` next to `toggleTarget`, update `filterCompletedTasks`/`hasUncheckedDescendants`/`computeTaskStats` to read `status`, and fix the `makeTask` test helper to cover `in-progress` and `important`. This stops `[!]`/`[/]` tasks vanishing and fixes the contradictory row. Dependency on Rust `checked` stays only as wire data.
2. Second slice: a `TaskCheckbox.svelte` (props: `status`, `onToggle`, `size`, optional `disabled`) used by TasksView and `EventTaskChip`. It renders a glyph per status, exposes a real `<button role="checkbox" aria-checked>` with `aria-checked="mixed"` for in-progress, a 24px hit area, focus-visible ring, and tokens only. Suggested glyphs (opinion): todo empty box, done filled box with check, cancelled box with dash and struck text, in-progress half-filled box, important box with `!` in a warning token, question `?`, forwarded `>`. Reuse existing status tokens (`--success`, `--warning`, `src/app.css:72-73`) per scout 01.
3. Choose one shape. Because the editor is the canonical rendering of the markdown and uses a square, the Tasks view should adopt the square checkbox (not the reverse), reusing the same radius and the editor's violet as a token. Rename or alias the `--lp-task-*` literals into neutral `--task-*` tokens defined for light and dark, so both surfaces read from one place.
4. Share the status model in `utils/`: a pure `task-status.ts` with the char-to-status and status-to-char maps, `isClosedStatus`, `toggleTarget` and a label per status. `core/` (editor widget) and `features/` (Tasks, Todoist, Event chip) can both import `utils/` without touching the layer baseline. Do not import `features/tasks/task-status.logic.ts` from `core/`.
5. Editor parity is a separate, larger slice and optional. To render `[/] [-] [?] [!] [>]` the editor needs a Lezer block parser (the pattern exists in `extensions/lezer/highlight-extension.ts`) that emits `Task` and `TaskMarker` for `^\[[ xX\-/?!>]\][ \t]` inside a `ListItem`, so the existing `taskMarkerHandler` and the `parent.getChild('Task')` dash-hiding in `listMarkHandler` (`simple-widget-handlers.ts:66,74`) work unchanged. Then `TaskCheckboxWidget` takes the status char, draws the same glyph vocabulary via a shared class set, and the click calls the same `toggleTarget`. Constraints: replace stays on one line (rule 1), no new `font-size: 0` marks (rule 1), add `stopPropagation` on `mousedown` (rule 11), keep reveal-on-cursor (rule 5), and add handler tests for each char (existing tests only cover two). Risk: changing the Lezer grammar affects fold, outline and any consumer of `Task` nodes, so run the editor tests broadly.
6. Decide the toggle semantics once. Today toggle completes in-progress to done in the Tasks view. A richer option (opinion, needs owner input): left-click toggles done/todo, and a context menu or small status popover sets any of the 7 statuses via the existing `target` field on `toggle_task_status` (the IPC already accepts any `TaskStatus`, `src/lib/contracts/commands.ts:108-109`).
7. Keep the editor and view independent on side effects: the Tasks view must keep the Rust path (disk write plus tab sync). Do not route Tasks clicks through CodeMirror.
8. Add a small visual regression guard: one component test per status asserting `aria-checked` and glyph class, and a test that the filter keeps `important`/`in-progress` tasks.

## Open questions for the owner

1. Do you use `[/]`, `[!]`, `[?]`, `[>]`, `[-]` in your notes? If not, slice 1 is only a correctness cleanup; if yes, should `[!]` and `[/]` show by default in the Tasks view (my reading: yes, they are open work)?
2. Should "completed" for hide-completed mean done only, or done plus cancelled? (Current `toggleTarget` and EventTaskChip say done plus cancelled.)
3. Should the editor render the extra statuses as real checkboxes (Lezer extension, larger risk), or is it fine that they stay raw text and only the Tasks view draws them?
4. Which shape and click model do you want: square with a status glyph, and a left-click that completes versus a menu to pick a status?
5. Should done tasks be struck through and dimmed in the editor as in the Tasks view, or neither?
6. Does the light theme need a task checkbox color? `--lp-task-*` is declared once, under `.dark` (`src/app.css:212,313-316`); I did not verify how light mode resolves it (a theme-preset mechanism may supply it) because the app was not run.

## Not checked
- The app was not run, so no visual comparison was made; all differences come from code. The light-theme resolution of `--lp-task-*`, CodeMirror's handling of `preventDefault` on widget `mousedown`, and the Rust section-tag path's treatment of statuses were not verified.
