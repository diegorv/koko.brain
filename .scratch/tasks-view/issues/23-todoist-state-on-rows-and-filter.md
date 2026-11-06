# 23: Todoist state on each row and as a quick filter

**What to build:** After Issue 22 each row has one Todoist state: not sent, sent, possibly sent, closed in Todoist, error. Show it on every row and make it filterable.

- Each row shows its state as a visible icon with an accessible name; "not sent" shows the Send trigger, which Issue 10 already made visible (it was `opacity-0`, `TodoistPopover.svelte:113`). Use theme tokens for the state colors (see Issue 05 and `ux-polish/48`).
- A "Todoist" quick filter (only with a token): any, not sent, sent, possibly sent, closed, error. `quick.todoist` in `TaskQuery`, evaluated by `applyQuickFilters` with the state map from Issue 22 passed in, so `task-query.logic.ts` stays pure.
- The rule sentence names the filter ("sent to Todoist and closed there").

**Blocked by:** 07, 10, 22

**Status:** needs-info

**Waits on:** PRD decision B3.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `task-query.logic.test.ts`: the Todoist filter keeps only rows whose injected state matches.
- [ ] `TasksView.test.ts` with real stores: choosing "closed" lists only tasks closed in Todoist, and each row's icon has the right name.

## Notes

- **Size:** S.
