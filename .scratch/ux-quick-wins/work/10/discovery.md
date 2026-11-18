# Issue 10 discovery: kanban cards, no empty date row, clamped preview, growing editor

No `spec.md` exists for ux-quick-wins; the Issue is the spec. Same harness and test file as `work/05` (line numbers below are after 05, so they differ from the Issue's `085b23c5d` ones).

## Files that change

- `src/lib/plugins/kanban/KanbanCard.svelte`
  - `:163` card classes: `rounded-lg` to `rounded-md`.
  - `:203-213` title span + date row: wrap the `ondblclick` span (`:205-210`) in a `flex items-start gap-1` title line. Undated: the picker goes at the end of that line, outside the span, in a wrapper `opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 has-[[data-state=open]]:opacity-100` (never `display:none`). Dated: the existing `flex flex-wrap` row with the badge and remove button stays.
  - `:215` preview: `max-h-32 overflow-y-auto` to `line-clamp-3`.
  - `:185-194` textarea: an `$effect` reading `editText` and `inputEl` sets `height = auto` then `scrollHeight px`. User effects run after the `bind:value` render effect, so it measures the new value on input, on open (new `inputEl`) and on a wikilink insert. Add `overflow-hidden`.
  - `:70-81` Enter / Escape: capture the board root (`inputEl.closest('[data-kanban-board]')`) before committing or stopping, then `await tick()` and focus it. `commitEdit` (blur path) stays unchanged, so a click elsewhere moves no focus.
- `src/lib/plugins/kanban/KanbanView.svelte:520` root div: add `data-kanban-board` (the card needs a stable hook; `tabindex="-1"` alone is not one).
- `help/documentation/21-kanban.md:70,94,133`: set-date icon on hover/focus at the end of the title line; preview shows 3 lines; Enter/Escape return focus to the board.
- `src/tests/lib/plugins/kanban/KanbanView.test.ts`: new describe "card anatomy and inline edit".

## Plan (test-first)

1. Red tests: undated card has a "Set date" button and no date-row element (`.flex-wrap` row); dated card keeps badge + "Remove date"; preview `line-clamp-3` (mock `loadLinkedFileContent` resolves text for a `[[link]]` card); card `rounded-md`; stubbed `scrollHeight` on input sets `style.height`; Enter: active element is root, persist count 1; Escape: root, persist 0; blur: persist 1, active element not root; source assertion on the wrapper class and that the picker is outside the `ondblclick` span; dblclick on "Set date" does not start editing.
2. Implement card markup + classes. 3. Auto-grow. 4. Focus. 5. Help doc.

## Prior art

- Harness/api, `root()`, `card()`, `press()`, `settle()`: `KanbanView.test.ts:336-430`.
- Source scan: `src/tests/lib/chrome-state-styles.test.ts` (readFileSync on `process.cwd()`).

## Risks

- The popover content is inline inside the opacity wrapper; `has-[[data-state=open]]` keeps it visible (bits-ui sets `data-state=open` on the trigger and content).
- jsdom does not fire `blur` when a focused element is removed; a real browser may. Either way the late blur commit compares against the updated `item.text` (Enter) or the reset `editText` (Escape), so it writes nothing.

## Defaults taken

- Root hook is a new `data-kanban-board` attribute, not a prop through `KanbanLane`.
- Undated card: the wrapper is rendered only when there is no date; a dated card shows no hover icon.
