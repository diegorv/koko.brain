# 53: The right sidebar hides on kanban, canvas and view tabs

**What to build:** On a board, canvas or `.view` tab the right sidebar stays open and shows "Not available". Extend `hidesRightSidebar` (`src/lib/core/layout/layout.logic.ts`, about line 17) to `.kanban`, `.canvas` and `.view` tabs, so the sidebar collapses for them and comes back for a Markdown note without changing the saved visibility setting.

**Blocked by:** none

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: `layout.logic` tests for `.kanban`, `.canvas` and `.view` paths
- [ ] Switching from a canvas tab back to a note shows the sidebar again with the user setting unchanged

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Shell layout row 7.
- Owner check: alternative is a centered "Only available for Markdown notes" state; hiding is the review's pick.
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.
