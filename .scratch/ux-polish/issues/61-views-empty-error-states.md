# 61: Graph, canvas, collection and kanban views show real empty and error states

**What to build:** The graph view has no empty or error state and fails silently on a failed load; the canvas has no empty-state; collection and kanban show ad-hoc text. Give each view an `EmptyState` for "nothing here" and an `InlineAlert` with Retry for a failed load.

**Blocked by:** 59

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: a graph test with a rejected load shows the error with Retry, and an empty vault shows the empty state
- [ ] Canvas, collection and kanban empty states use the primitive (tests)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Feature views row 6; graph failure dropped from Issue 06.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.
