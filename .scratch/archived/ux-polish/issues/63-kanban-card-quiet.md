# 63: Kanban cards drop the empty date row until hover or focus

**What to build:** Every kanban card without a date shows a 50%-opacity calendar icon row (`KanbanDatePicker.svelte`, about lines 88-99, rendered by `KanbanCard.svelte` about lines 215-217), and the card is `rounded-lg` inside a `rounded-lg` lane. Reveal the date affordance only on card hover or focus-within, and make the card `rounded-md`.

**Blocked by:** 47

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] A component test asserts the empty date row is hidden by default and shown on focus-within
- [ ] Cards with a date still show it

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Feature views row 7. Issue 47 touches the same files.
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/197-kanban-cards-drop-empty-date-row-until.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
