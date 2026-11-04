# 68: Relationship and kanban wikilink pickers navigate with arrow keys

**What to build:** `RelationshipSearch.svelte` (about line 31) and `KanbanWikilinkSuggestions.svelte` are hand-rolled lists without arrow-key navigation. Rebuild them on shadcn `Command` inside a `Popover`, keeping their current filtering and selection behavior.

**Blocked by:** None (can start immediately)

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: component tests for ArrowDown/ArrowUp/Enter selection in both pickers
- [ ] Existing selection tests stay green

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Overlays row 11.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.
