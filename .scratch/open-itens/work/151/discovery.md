# 151 discovery: kanban proximity token map

No `spec.md` in `.scratch/open-itens/`. Owner decision (2026-11-06) settles the open question: checked cards show no proximity tone.

## Files that change

- `src/lib/plugins/kanban/kanban.logic.ts:686-701`: after `getDateProximity`, add `PROXIMITY_CLASSES: Record<DateProximity, { badge; border }>` (token classes from the Issue) and `cardProximity(dateStr, todayStr, checked)`.
- `src/lib/plugins/kanban/KanbanCard.svelte:10,114,118-125,167`: `dateProximity = cardProximity(cardDate, today, item.checked)`; drop `PROXIMITY_BORDER`, use `PROXIMITY_CLASSES[dateProximity].border`; drop `getDateProximity`/`DateProximity` imports if unused.
- `src/lib/plugins/kanban/KanbanDatePicker.svelte:20-27,68`: drop `PROXIMITY_BADGE`, use `PROXIMITY_CLASSES[proximity].badge`.
- `src/lib/plugins/kanban/KanbanListView.svelte:4,30,48` and `KanbanTableView.svelte:4,37,69`: `cardProximity(..., item.checked)` and `PROXIMITY_CLASSES[proximity].badge` replace the ternaries (gains tomorrow/upcoming tones).

## Plan (test-first)

1. `src/tests/lib/plugins/kanban/kanban.logic.test.ts` (after the `getDateProximity` describe, ~line 1165): `cardProximity` checked overdue -> `none`, unchecked -> `overdue`; `PROXIMITY_CLASSES` keys equal every `DateProximity`; no string matches `/-(red|orange|amber|yellow|green|blue|purple)-\d{2,3}\b/`; each tone uses its token (destructive, warning, type-orange, type-blue, muted with empty border for future/none). Fail, then add the logic. Commit.
2. `src/tests/lib/plugins/kanban/KanbanView.test.ts`: new describe mounting `KanbanViewHarness` (real stores, same pattern as "card wikilinks") with `- [x] done {2000-01-01}` and `- [ ] open {2000-01-01}`; the `[data-item-id]` card of the checked item lacks `border-l-destructive`, the unchecked one has it. Fail, then wire the four components. Commit.

## Prior art

- getDateProximity tests at `kanban.logic.test.ts:1136-1165`; harness mount at `KanbanView.test.ts:117-141`.
- Token utilities `--color-destructive/warning/type-orange/type-blue` are mapped in `src/app.css:25,67,71,75`; `text-warning` already used in `features/tasks/task-status.logic.ts:49` (class strings in a `.logic.ts`).

## Risks / defaults

- A fixed past date (2000-01-01) avoids clock mocking; `formatNow` stays real.
- Out of scope per Issue: `KanbanTableView.svelte:74` (`text-green-500` Done), `KanbanLane.svelte:309-311`.
- `pure-logic.test.ts` must stay green (no framework imports added to the logic file).
