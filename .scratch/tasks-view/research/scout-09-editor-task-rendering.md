# Scout 09: editor-task-rendering

Recovered from the workflow journal: the agent's Write was refused, so this is its returned text.

**Summary (scout 09, editor task rendering):** Task checkboxes in the editor are a binary widget. `TaskCheckboxWidget` (`src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:28-58`) renders `[x]`, `[-]`, `[/]`, `[?]`, `[>]` and `[!]` identically as checked, and a click writes `[ ]` or `[x]`. That silently resets in-progress, question and important tasks to todo. Rust `toggle_task_in_content` does the same (`parsing.rs:1896-1900`). The editor click bypasses the `toggleTask` dirty-buffer guard and the Rust toggle command. There is no in-editor metadata UI for priority, dates or recurrence. No `.md` file was written: the subagent rules forbid report files, so these findings are the return value.

## Facts

- **Checkbox widget:** `widgets.ts:28-58`. `toDOM` makes `<input type=checkbox class=cm-lp-task-checkbox>`. `mousedown` calls `preventDefault()` and dispatches a raw CM change at `pos+1..pos+2` (`' '` if checked, else `'x'`). `eq` compares `checked` and `pos`. `ignoreEvent()` returns `false`. No `aria-label`, no `change` or `keydown` handler.
- **Decoration:** `inline/handlers/simple-widget-handlers.ts:19-31`. `taskMarkerHandler` skips when the line is revealed. `checked = content !== '[ ]'`, so any non-space status reads as checked.
- **Task list marker:** `simple-widget-handlers.ts:57-99`. For task items, `- ` is hidden via `cm-formatting-task-marker` (line 76). A bare `- [ ]` with no text is skipped (line 90-92).
- **Styles:** `styles.ts:92-93` (task marker hidden), `:195-222` (checkbox, hover, checked, `::after` checkmark, `--lp-task-*` tokens), `:950` (`.cm-lp-qjs-tasklist`, not inspected).
- **Rust status mapping:** `parsing.rs:1589-1599` `map_checkbox_char`: `' '` Todo, `x/X` Done, `-` Cancelled, `/` InProgress, `?` Question, `>` Forwarded, `!` Important, unknown Todo.
- **Rust toggle:** `parsing.rs:1873-1907`. `' '` becomes `x`; any other char becomes `' '`. Tests at `parsing.rs:3252` onward.
- **Rust command:** `commands/vault.rs:760-786` (`toggle_task_status_inner`). Reads disk, toggles, `write_atomic`, updates the index. Emits `vault-index-updated`, which bumps the version that `TasksView` refetches on.
- **Tasks-view toggle:** `tasks.service.ts:121-155`. If the tab is dirty, save first. If the saved line text differs from the disk line, refresh and abort with a toast. Then call `toggle_task_status`, `syncExternalContentToEditor(...,'none')`, `buildTaskIndex()`.
- **Test:** `src/tests/lib/features/tasks/task-toggle-dirty-buffer.test.ts:82-157`. Covers typed-but-unsaved buffers, line shift, edited task line, and a clean tab. Mocks only Tauri `invoke` and `plugin-fs`. Uses real `editorStore`. Nothing for status chars.
- **Metadata UI:** a grep for priority, dueDate or pill in `markdown-editor` and `plugins` found only tag and link files. No task metadata widget exists in the editor.
- **Rule doc:** `docs/agents/live-preview-rules.md` item 11 requires `stopPropagation` on widget `mousedown`. `TaskCheckboxWidget` does not do this.

## Problems and gaps

- One click on a `[/]`, `[?]`, `[!]`, `[>]` or `[-]` task resets it to todo or done, in both the editor (`widgets.ts:43`) and the tasks view (`parsing.rs:1896`). Verified from code, not at runtime.
- Done, cancelled and forwarded look identical in the editor. No status menu or cycle exists.
- Two toggle paths with different guards. The editor path has no dirty-buffer guard and no Rust call. Persistence relies on the normal autosave. Traced from code only.
- Checkbox has no keyboard path and no accessible name.
- Metadata emoji (priority, dates) gets no rendering in the editor. Whether it shows as raw text is not verified.
- Test coverage: no test for status-char rendering or for widget click behavior.

## Ideas worth keeping

- The status-aware mapping already exists in Rust (`map_checkbox_char`). A TS mirror could drive the status-aware checkbox rendering and a status menu.
- `toggle_task_in_content` is pure and tested, so it can be reused or mirrored with a shared fixture.
- The line-text comparison guard in `toggleTask` is reusable for any editor-side toggle.
- Inline pill widgets can follow the existing interactive-widget pattern (`mousedown` `stopPropagation`).

## Open questions

- Does clicking the checkbox reveal its line? `ignoreEvent` returns `false`, so CodeMirror probably moves the cursor and destroys the widget. Needs a runtime check.
- Does a click on the editor checkbox trigger `toggle_task_status`, or only the autosave? Needs a trace through `editor.service`.
- Are `.cm-lp-qjs-tasklist` items (`styles.ts:950`) wired to any toggle? Not inspected.
- Does the editor render the emoji metadata signifiers anywhere? Not checked.
