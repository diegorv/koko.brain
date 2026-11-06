# 38: The relationship picker navigates with arrow keys

**Migrated from:** `.scratch/ux-polish/issues/68-pickers-arrow-keys.md` (audit 2026-11-05). Priority: daily use and UI correctness (bucket 2-ux). Partially fixed: the kanban picker already has arrow keys, so only RelationshipSearch remains and the title is narrowed to it.

**Audit check at `5f8003d67`:** partially_fixed (ux, medium). src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:41-65 already exports handleKeydown with ArrowDown/ArrowUp/Enter/Tab/Escape and a selectedIndex highlight (:80). src/lib/features/properties/RelationshipSearch.svelte (input at line ~62, onkeydown handleKeydown at :32-37) only handles Escape: no arrow keys, no highlighted row, results are mouse-only buttons (onmousedown). Still a gap for the relation property picker.

**Stale in the text below:** Kanban half is out of date: KanbanWikilinkSuggestions is hand-rolled but has arrow-key navigation. Only RelationshipSearch lacks it. 'about line 31' for RelationshipSearch is now line 32-37 (handleKeydown).

**What to build:** `RelationshipSearch.svelte` (about line 31) and `KanbanWikilinkSuggestions.svelte` are hand-rolled lists without arrow-key navigation. Rebuild them on shadcn `Command` inside a `Popover`, keeping their current filtering and selection behavior.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: component tests for ArrowDown/ArrowUp/Enter selection in both pickers
- [ ] Existing selection tests stay green

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Overlays row 11.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/68-pickers-arrow-keys.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
