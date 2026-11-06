# 83: Kanban cards drop the empty date row until hover or focus, and the date trigger stays keyboard reachable

**Migrated from:** `.scratch/ux-polish/issues/63-kanban-card-quiet.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Drafted without a deep dive, and it needs a keyboard-reachability decision. It is blocked by 47.

**Audit check at `5f8003d67`:** still_present (polish, low). Empty-date affordance is always visible: src/lib/plugins/kanban/KanbanDatePicker.svelte:88-96 renders the calendar-icon trigger with `text-muted-foreground/50` whenever no date is set, and src/lib/plugins/kanban/KanbanCard.svelte:215-217 renders it unconditionally inside the card body. The card is `rounded-lg` (KanbanCard.svelte:167, carries the `group` class) inside a `rounded-lg` lane (KanbanLane.svelte:215). No hover/focus-within reveal exists. Purely visual noise, no data or reactivity effect. Blocked by Issue 47, which is not done.

**Stale in the text below:** KanbanCard.svelte render lines are 215-217 in the text but the DatePicker usage is at :216 (accurate within a line); KanbanDatePicker trigger is at :88-96, close to the cited 88-99. Status is still needs-triage: the Issue itself says it was drafted without a deep dive, and it needs a decision on keyboard reachability (a hidden date trigger must stay focusable, so use focus-within or opacity rather than display:none, consistent with Issue 67 'hover-only controls also appear on keyboard focus').

**Owner decision needed:** Hide the empty date row until hover: confirm it stays reachable by keyboard through focus-within or opacity (not display:none), or drop the ticket.

**What to build:** Every kanban card without a date shows a 50%-opacity calendar icon row (`KanbanDatePicker.svelte`, about lines 88-99, rendered by `KanbanCard.svelte` about lines 215-217), and the card is `rounded-lg` inside a `rounded-lg` lane. Reveal the date affordance only on card hover or focus-within, and make the card `rounded-md`.

**Blocked by:** 68

**Status:** needs-info

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] A component test asserts the empty date row is hidden by default and shown on focus-within
- [ ] Cards with a date still show it

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Feature views row 7. Issue 47 touches the same files.
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/63-kanban-card-quiet.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
