# 255 discovery: Space keeps focus when the row moves into a collapsed group

No `spec.md` in `.scratch/tasks-view-ux/`; the Issue is the spec. Follows `work/240` (collapse, cap) and `work/113` (keys, focus-follow); the finding is `work/240/review-2.md` #1.

## Cause

`src/lib/features/tasks/TasksView.svelte:442-460`, the focus-follow effect. A completed todo under Status grouping stays in `order`, so `nextCurrentRow(next, prev, current) === current` and the `chosen === current` branch (:450-454) runs `rowElement(current)?.focus()`. With Done collapsed the row has no element, so focus stays on `<body>` and the current row stays the hidden one.

## Files that change

- `src/lib/features/tasks/TasksView.svelte:430-460`: the effect also reads `rendered` and keeps `prevRendered` (the `rendered` of its last run).
  - Same `order` reference (a collapse, an expand, `Show N more`): only record `prevRendered` and return. Before, the effect did not run then at all, so this keeps Issue 240's rule: a collapse is not a removal.
  - `chosen === current`, current was in `prevRendered` and is not in `rendered`: the write moved the row out of the rendered rows. Current row becomes `nextCurrentRow(rendered, prevRendered, current)` (next rendered row in display order, else the previous one), and focus follows when `focusIsFree(false)`. No second fallback: the same function, fed the rendered lists.
  - Otherwise unchanged.
  - The mouse-collapse-then-refetch case (`TasksView.collapse.test.ts:163`) still moves nothing: the collapse run recorded `prevRendered` without b1, so the refetch sees b1 hidden before and after.
- `src/lib/features/tasks/tasks-keys.logic.ts`: no change; `nextCurrentRow` already fits the rendered lists.

## Tests

- `src/tests/lib/features/tasks/TasksView.collapse.test.ts`: note A with todos a1, a2, a3 and done d1, Status > All, grouped by Status, Done collapsed; stateful toggle fixture copied from the Open filter test (:250). Space on a2: focus on a3, current row a3. Space on a3 (last): focus on a2. Expanding Done leaves focus where it is.
- `src/tests/lib/features/tasks/tasks-keys.logic.test.ts:95`: `nextCurrentRow(rendered, prevRendered, 'b')` where `b` moved into a collapsed group (hidden from `rendered`).
- Issue 240's collapse tests stay as they are.

## Defaults taken

1. Focus moves only under `focusIsFree(false)` (`<body>` or inside the list), 113's rule, rather than anywhere in the view: a toolbar control the user moved to during the write keeps focus.
2. When no row is rendered after the move (every remaining group collapsed), the current row and focus stay as they are; the existing branch handles it.
3. Applies to any refetch that moves the current row out of the rendered rows (a row menu status pick, an external edit), not only Space and the circle; the effect does not know the cause.

## Risks

- The effect now reruns on every collapse and reveal; the `next === prev` early return keeps those runs side-effect free.
