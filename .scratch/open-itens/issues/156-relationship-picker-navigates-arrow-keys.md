# 156: The relationship picker navigates with arrow keys

**Origin:** `audit-2026-11-05` Issue 38, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/ux-polish/issues/68-pickers-arrow-keys.md` (audit 2026-11-05). Priority: daily use and UI correctness (bucket 2-ux). Partially fixed: the kanban picker already has arrow keys, so only RelationshipSearch remains and the title is narrowed to it.

**Audit check at `5f8003d67`:** partially_fixed (ux, medium). src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:41-65 already exports handleKeydown with ArrowDown/ArrowUp/Enter/Tab/Escape and a selectedIndex highlight (:80). src/lib/features/properties/RelationshipSearch.svelte (input at line ~62, onkeydown handleKeydown at :32-37) only handles Escape: no arrow keys, no highlighted row, results are mouse-only buttons (onmousedown). Still a gap for the relation property picker.

**Stale in the text below:** Kanban half is out of date: KanbanWikilinkSuggestions is hand-rolled but has arrow-key navigation. Only RelationshipSearch lacks it. 'about line 31' for RelationshipSearch is now line 32-37 (handleKeydown).

**What to build:** `RelationshipSearch.svelte` (about line 31) and `KanbanWikilinkSuggestions.svelte` are hand-rolled lists without arrow-key navigation. Rebuild them on shadcn `Command` inside a `Popover`, keeping their current filtering and selection behavior.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first, in src/tests/lib/features/properties/RelationshipSearch.test.ts: with results shown, ArrowDown and ArrowUp move a highlighted row and Enter selects the highlighted row. It fails today (handleKeydown handles only Escape, and the rows act on mousedown only). Scope is RelationshipSearch.svelte only: KanbanWikilinkSuggestions already has arrow keys.
- [ ] Existing selection tests stay green

## Notes

- **Source:** `.scratch/archived/ux-polish/review-2026-11-04.md` Review section 3 Overlays row 11.
- Size: M.
- **Triage:** checked by audit 2026-11-05 (header and second opinion); the criteria are narrowed to RelationshipSearch.

**Second opinion (audit 2026-11-05, round 2):** upheld (ux, low). For RelationshipSearch the gap is real, and wider than arrow keys. handleKeydown (RelationshipSearch.svelte:32-37) only handles Escape. The result rows are buttons that act on onmousedown only, and keyboard Enter or Space on a focused button fires click, not mousedown, so the picker cannot be operated from the keyboard at all. KanbanWikilinkSuggestions.svelte:41-65 already has ArrowUp/ArrowDown/Enter/Tab and a selectedIndex highlight. Corrections to apply while implementing: The body and criteria are stale: 'What to build' still asks to rebuild both pickers on Command inside a Popover, and the first criterion asks for tests 'in both pickers'. Narrow both to RelationshipSearch.svelte, which already uses Popover, so only the list needs to become Command or get a selectedIndex. Also make Enter select the highlighted row; today even Enter on a focused row does nothing because the rows only handle mousedown. The existing test is src/tests/lib/features/properties/RelationshipSearch.test.ts. Remove the 'Triage: check the cited lines before promoting' note, or set the status back to needs-triage.

## Comments

- 2026-11-06: migrated from `.scratch/archived/ux-polish/issues/68-pickers-arrow-keys.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
