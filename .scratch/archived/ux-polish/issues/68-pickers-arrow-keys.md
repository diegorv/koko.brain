# 68: Relationship and kanban wikilink pickers navigate with arrow keys

**What to build:** `RelationshipSearch.svelte` (about line 31) and `KanbanWikilinkSuggestions.svelte` are hand-rolled lists without arrow-key navigation. Rebuild them on shadcn `Command` inside a `Popover`, keeping their current filtering and selection behavior.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: component tests for ArrowDown/ArrowUp/Enter selection in both pickers
- [ ] Existing selection tests stay green

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Overlays row 11.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/156-relationship-picker-navigates-arrow-keys.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
