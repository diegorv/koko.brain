# Issue 12 discovery: kanban list, table and archive: named checks, clean cells, restore feedback

No `spec.md` for ux-quick-wins; the Issue is the spec. Same harness and test file as `work/05`, `work/10` and `work/11`. Line numbers are at c4e97f94e (after 05 and 11), so `KanbanView.svelte` lines differ from the Issue's.

## Files that change

- `src/lib/plugins/kanban/KanbanCardText.svelte:5-13` new prop `hideTags?: boolean`; `:28` the `tag` branch renders nothing when it is set. Same `parseCardSegments` parse as the board.
- `src/lib/plugins/kanban/KanbanTableView.svelte`
  - `:8-13` new prop `onWikilinkClick?`.
  - `:43-51` check button `aria-label={item.checked ? 'Mark open' : 'Mark done'}`.
  - `:54` cell renders `<KanbanCardText text={displayText} {onWikilinkClick} hideTags />`.
  - `:31` an empty-row `<tr><td colspan="6">No cards</td></tr>` when no lane of the shown board has items.
- `src/lib/plugins/kanban/KanbanListView.svelte:35-43` same `aria-label` on the check button.
- `src/lib/plugins/kanban/KanbanView.svelte`
  - `:600` table call passes `onWikilinkClick={handleWikilinkClick}` (list does at `:598`).
  - `:688` archive row shows `stripCardMetadata(item.text)` (import from `./kanban.logic`, `:17-49`).
  - `:392-396` `handleRestoreItem` calls `toast.success(\`Restored to ${firstLane.title}\`)` after `applyChange(restoreItem(...))`; new `import { toast } from 'svelte-sonner'`.
- `help/documentation/21-kanban.md:25,27,109`: table cells render links (clickable) without inline tags; restore toast.
- Tests: `src/tests/lib/plugins/kanban/KanbanView.test.ts`, new describe "list, table and archive"; `vi.mock('svelte-sonner')` at the file top (pattern from `src/tests/lib/core/settings/TrashSection.test.ts:16-18`).

## Plan (test-first)

1. Red: table check found by name "Mark done", flips to "Mark open" after click; list check same names.
2. Red: table cell of `Ship #design [[Spec]]` has "Ship", a "Spec" button, no `#design`; clicking "Spec" calls `onOpenWikilink('Spec')`; Tags column shows `design`. List view still shows the `#design` chip (hideTags unset).
3. Red: empty board in table view shows "No cards".
4. Red: archived `Pay rent {2026-11-20} {color:red}` shows "Pay rent" with no `{`; Restore calls `toast.success('Restored to To Do')` and the persisted markdown has the card under `## To Do`.
5. Implement, help text, targeted checks.

## Prior art

- Harness mount with `onOpenWikilink`: `KanbanView.test.ts:127-152`; `mountMode`: `:165-176`; archive markdown shape: `kanban.logic.test.ts:257`.

## Risks

- `displayBoard` is the filtered board, so a filter that hides every card also shows the table's "No cards" row; same as the list's per-lane text.
- Tag-only card text renders an empty cell in the table (tags are in the Tags column).

## Defaults taken

- The empty-row check uses the shown (filtered) board, matching what the table would otherwise render.
- The table cell passes no `tagColors`: with `hideTags` no chip is drawn, so the prop would be unused.
