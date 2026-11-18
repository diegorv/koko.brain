VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first (`src/tests/lib/plugins/kanban/KanbanView.test.ts`, real store and logic, `kanban.service.js` and `svelte-sonner` mocked as side-effect services): in table view the check button is found by name "Mark done" and flips to "Mark open" after a click. — `KanbanView.test.ts` mocks only `kanban.service.js` and `svelte-sonner` (lines 19-25); the `it.each(['table', 'list'])` test in "check buttons" finds one "Mark done" button, clicks it, then finds zero "Mark done" and one "Mark open" and asserts `checked` is true in the persisted markdown. `KanbanTableView.svelte:50` sets `aria-label={item.checked ? 'Mark open' : 'Mark done'}`. Without the aria-label the test has no button to click, so it fails on the old code.
- [met] The table cell of `Ship #design [[Spec]]` shows "Ship" and a "Spec" button and no `#design` text; clicking "Spec" calls the view's `onOpenWikilink('Spec')` (through `handleWikilinkClick`, `KanbanView.svelte:230-232`); the Tags column still shows `design`. — `KanbanTableView.svelte:58-60` renders `<KanbanCardText text={displayText} {onWikilinkClick} hideTags />`; `KanbanView.svelte:603` passes `handleWikilinkClick` (now at `:243-245`, which calls `onOpenWikilink(target)`). The test "render the card text with a clickable wikilink and no inline tag" asserts that the cell contains "Ship" and not "#design", clicks the "Spec" button, expects `onOpenWikilink` to have been called with 'Spec', and expects the Tags cell to read `#design`.
- [met] An empty board in table view shows "No cards". — `KanbanTableView.svelte:18,86-90`: `isEmpty` is computed from `lanes.every(items.length === 0)` and renders one `colspan="6"` row. The test "an empty board shows one "No cards" row" asserts exactly one tbody row with that text; "a board with cards has no "No cards" row" covers the opposite case.
- [met] The list view's check buttons are named the same way. — `KanbanListView.svelte:39` uses the same `aria-label` ternary; it is covered by the `list` case of the same `it.each` test.
- [met] An archived `Pay rent {2026-11-20} {color:red}` shows "Pay rent"; Restore fires the toast with "Restored to To Do", and the card is in the first lane in the persisted markdown. — `KanbanView.svelte:691` renders `stripCardMetadata(item.text)`, and `:398` calls `toast.success(\`Restored to ${firstLane.title}\`)` after `applyChange(restoreItem(...))`. The archive tests assert that the row text is exactly "Pay rent", that the stored archive text keeps both tokens, that `toast.success` was called with 'Restored to To Do', that the archive is empty, and that lane 0 contains the full token text in `api.getMarkdown()`.
- [met] `KanbanCardText` still renders tags as before when `hideTags` is unset (board and list unchanged). — `hideTags` defaults to `false` (`KanbanCardText.svelte:15`), and the only branch change is `seg.type === 'tag' && !hideTags` (`:30`). `KanbanCard.svelte:243` and `KanbanListView.svelte:46` do not pass it. The board chip is still covered by the existing "tag chips" test (`KanbanView.test.ts:796-806`), and the list chip by the test "list view still renders the #design chip inline".
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — I ran `pnpm check` in the worktree: exit 0, 236 files, 0 errors, 0 warnings. The kanban test files (`pnpm vitest run src/tests/lib/plugins/kanban/`) exited 0 with 8 files and 360 tests passing. The full suite is deliver's to run.

## Findings

1. nit — `help/documentation/21-kanban.md:109`: the unescaped `"Restored to <lane>"` is read as an HTML tag by renderers that pass raw HTML through (GitHub, some markdown previews), so `<lane>` disappears there. The repo has a precedent for the same pattern (`10-tasks-and-todoist.md:143`, `"<name> copy"`), so this is optional. Fix: wrap the placeholder in backticks (`` `Restored to <lane>` ``) or write "Restored to" followed by the lane name.
2. nit — `src/lib/plugins/kanban/KanbanView.svelte:397-398`: the toast fires even when `restoreItem` returns the board unchanged (unknown `itemId`). The UI cannot reach that case, because the button passes the id of an item it renders, so no change is needed. Noted only so a future caller that passes an arbitrary id knows about it.

## Checks run by the reviewer

- `pnpm check` (worktree root): exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/plugins/kanban/`: exit 0, 8 files and 360 tests. This covers `KanbanView.test.ts`, the test file the diff changes, which mounts `KanbanView`, `KanbanTableView`, `KanbanListView` and `KanbanCardText` (all four changed components), plus `kanban.logic.test.ts`, `kanban.store.test.ts`, `kanban.service.test.ts` and the other kanban tests. My test verdict rests on these files.
- No test under `src/tests` or `e2e` asserts the help text the diff changes. "Mark done", "Mark open" and "Restored to" appear only in `KanbanView.test.ts`.
- `git diff main...HEAD --check`: clean. No layer-baseline or composition-root change.
- Scope: the diff touches only the files and lines the Issue names, plus the help doc and the workflow records. There is no layout change beyond the cell and the empty row.

## Resolution

1. Fixed: help/documentation/21-kanban.md:109 now writes the placeholder in backticks (`Restored to <lane>`), so no renderer reads it as an HTML tag.
2. Rejected, no change: the review itself notes the UI only offers restore for items present in the archive, so restoreItem never returns the board unchanged from this call site; guarding it would be code for an unreachable case.
