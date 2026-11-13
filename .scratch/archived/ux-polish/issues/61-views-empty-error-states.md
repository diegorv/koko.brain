# 61: Graph, canvas, collection and kanban views show real empty and error states

**What to build:** The graph view has no empty or error state and fails silently on a failed load; the canvas has no empty-state; collection and kanban show ad-hoc text. Give each view an `EmptyState` for "nothing here" and an `InlineAlert` with Retry for a failed load.

**Blocked by:** 59

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: a graph test with a rejected load shows the error with Retry, and an empty vault shows the empty state
- [ ] Canvas, collection and kanban empty states use the primitive (tests)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Feature views row 6; graph failure dropped from Issue 06.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/206-graph-collection-kanban-views-show-real-empty.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
