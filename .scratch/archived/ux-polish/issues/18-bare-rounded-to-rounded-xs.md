# 18: Bare `rounded` becomes `rounded-xs` everywhere, with no pixel change

**What to build:** After Issue 16, `rounded-xs` is `calc(var(--radius) - 6px)` = 4px, the same as Tailwind's bare `rounded` (0.25rem), but it tracks `--radius`. Rename every remaining rule (a) and rule (b) site of the radius-scale ratchet in `.svelte` files under `src/lib` outside `components/ui`:

- bare `rounded` to `rounded-xs`, keeping any variant prefix (`hover:rounded` to `hover:rounded-xs`). About 80 sites in about 34 files after Issue 17; the heaviest are `plugins/kanban/KanbanView.svelte`, `plugins/graph-view/GraphControls.svelte`, `features/collection/toolbar/PropertiesPanel.svelte`, `plugins/kanban/KanbanLane.svelte`, `features/tasks/TodoistPopover.svelte`, `features/properties/PropertyField.svelte`
- `rounded-l` / `rounded-r` to `rounded-l-xs` / `rounded-r-xs` (the Kanban view switch in `KanbanView.svelte`, about lines 465 and 479)
- `rounded-[4px]` to `rounded-xs` (`features/event-calendar/EventPopover.svelte` about line 165)

Leave `rounded-[inherit]` (`EventBlock.svelte:76`), `components/ui/`, and every `.ts` file alone. Then empty the rule (a) and rule (b) baselines, so the ratchet bans new bare or arbitrary radius classes outright. This is a mechanical rename (commit as `refactor:`), not a role change: no site moves to a different size.

**Blocked by:** 16, 17

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing first: empty the rule (a) and (b) baselines in `radius-scale.test.ts`, run it and see it list every remaining site; then rename until it passes
- [x] A grep over `src/lib` (`.svelte`, outside `components/ui`) finds no bare `rounded`, no size-less side variant and no `rounded-[Npx]`
- [x] No test or E2E spec selects on a bare `.rounded` class (today only `e2e/specs/editor.spec.ts:20,23` select `.rounded-full`, which is untouched); confirm with a grep of `src/tests` and `e2e`
- [x] Every changed line is a class rename only; `git diff --stat` touches only `.svelte` files plus `radius-scale.test.ts`

## Notes

- **Other tickets:** Touches about 34 .svelte files across features and plugins; other UX polish tickets editing the same class strings (interaction states, kanban, graph, settings) will rebase over a one-word rename. Run it when few of those are in flight.
- **Source:** review section 2 "Radius tokens" row and section 4 Issue 5; `.scratch/ux-polish/work/radius.md` section 4 quick win 1.
- **Pixel identity** follows from the 4px assertion in Issue 16; no screenshot pass is required.
- **Out of scope:** moving chips, inputs, segments, popover rows or kanban cards to other sizes (radius.md P3, P6, P8, P9, P10); those are role changes with visible results and need their own tickets.
- **Size:** M (mechanical, many files).

## Comments

- 2026-11-04, branch issue/18-bare-rounded-to-rounded-xs: bare `rounded` and size-less side variants renamed to `rounded-xs` across .svelte files, guarded by radius-scale.test.ts. Full suite: 493 files, 11711 tests passed, build ok. Review round 1: APPROVED, no findings.
