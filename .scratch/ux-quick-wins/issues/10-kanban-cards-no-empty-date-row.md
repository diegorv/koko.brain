# 10: Kanban cards: no empty date row, clamped preview, growing editor

**Origin:** design review 2026-11-17, proposals P186, P145 (part) (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/kanban-board.html` (P186, P145), research `.scratch/ux-quick-wins/research/verdict-kanban.md` and `breakdown.md` (old ticket 14). Absorbs open-itens 197 (`.scratch/open-itens/issues/197-kanban-cards-drop-empty-date-row-until.md`, already marked wontfix with a pointer here).

**What to build:**

1. **No empty date row.** An undated card drops the date row (`src/lib/plugins/kanban/KanbanCard.svelte:206-208`, a near-empty `flex` row around `KanbanDatePicker`). The "Set date" trigger (`KanbanDatePicker.svelte:76-87`, a 50% icon) moves to the end of the title line, outside the `ondblclick` span (`KanbanCard.svelte:200-205`; inside it a double-click on the icon would start editing), revealed on card hover or focus and never `display:none`.
2. **The popover keeps it open.** The date popover content is inline, a DOM child of the picker (`KanbanDatePicker.svelte:89`, no Portal), so an `opacity-0` wrapper would hide an open calendar when the pointer leaves the card. The wrapper stays opaque while the popover is open (`has-[[data-state=open]]:opacity-100`); WebKit does not focus a clicked button, so `focus-within` alone does not hold it. The reveal passes `src/tests/lib/chrome-state-styles.test.ts:48-54` (every `group-hover:opacity-100` also needs `group-focus-within` or its own `focus-within:opacity-100`).
3. **Dated cards unchanged.** A dated card keeps its date badge and its remove button; the card goes from `rounded-lg` to `rounded-md` (`:158`).
4. **Clamped preview.** The linked-note preview (`:210`, `max-h-32 overflow-y-auto`) becomes `line-clamp-3` instead of a raw-text scroll box.
5. **A growing editor.** The edit textarea (`:180-189`, `rows="1"`, no auto-grow) grows with its content (`scrollHeight`, set on input and on open).
6. **Focus after the edit.** After Enter or Escape, once the textarea has unmounted (`await tick()`), focus goes to the board root (`KanbanView.svelte:460`, `tabindex="-1"`), so arrow keys keep working. Moving it earlier blurs the still-mounted textarea and `onblur={commitEdit}` (`:186`) runs a second commit against the old `item`; a blur commit (click elsewhere) moves no focus. Card text is never rewritten: the textarea still holds the raw `item.text` including `{date}` and `{color}`.

Not in this ticket: editing without the `{date}` and `{color}` tokens (rewrites stored card text on commit, an owner data rule), grip and markup dedup, the lane grip hover (open-itens 214 part 2, behind open-itens 040), any change to drag or to `editingItemId` / `editingLaneId` handling (open-itens 006).

**Size:** S.

**Blocked by:** 05

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes (`e2e/specs/kanban-view.spec.ts` only checks the board renders and the source toggle).

- [ ] Failing test first, `src/tests/lib/plugins/kanban/KanbanView.test.ts` (harness `src/tests/fixtures/KanbanViewHarness.svelte`, real stores and logic, only `kanban.service.js` mocked): an undated card has a "Set date" button and no separate date row element.
- [ ] A dated card keeps its badge; the preview element has `line-clamp-3`; the card has `rounded-md`.
- [ ] With a stubbed `scrollHeight`, typing in the edit textarea sets its height to it.
- [ ] After Enter, `document.activeElement` is the board root and the harness persisted exactly once (`getPersistCount`); after Escape, focus is the board root and nothing persisted; after a click elsewhere (blur), the commit persists once and focus is not moved to the root.
- [ ] A source assertion that the "Set date" wrapper carries `has-[[data-state=open]]:opacity-100` and sits outside the `ondblclick` span; `chrome-state-styles.test.ts` passes.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Original proposal

- **P186.** Kanban card anatomy polish: every undated card has a near-empty date row, and the linked-note preview is a raw-text scroll box. On undated cards drop the date row and show the set-date icon at the end of the tag or title line on hover or focus; clamp the preview to 3 lines. Validation: revise, grip and markup dedup are left out.
- **P145 (part).** Inline kanban card editing is one fixed row: the textarea has `rows=1` and no auto-grow, and focus is lost after an edit so arrow keys stop working. Auto-grow the textarea and, after commit or Escape, focus the board container. Validation: revise, focus goes to the board container because cards are not focusable; editing without the metadata tokens is deferred.
- **Open-itens 197.** Kanban cards drop the empty date row until hover or focus; the card is `rounded-md`. Both criteria are carried.

## Problem

Every card without a date carries a near-empty row with a faint calendar icon, so a board of undated cards looks busy and the cards are taller than needed. Editing a long card shows one line and scrolls inside it, and after Enter or Escape the keyboard shortcuts stop working until the user clicks the board again.

## Evidence

Checked at `085b23c5d`.

- `KanbanCard.svelte:206-208` the date row always renders; `:210` the preview `max-h-32 overflow-y-auto`; `:158` the card classes (`rounded-lg`); `:180-189` the textarea (`rows="1"`, `onblur={commitEdit}` at `:186`); `:92-101` `commitEdit`; `:66-77` the Enter and Escape handler.
- `KanbanDatePicker.svelte:76-87` the undated trigger; `:89` the inline popover content.
- `KanbanView.svelte:460` the board root (`tabindex="-1"`); `:236-240` the key handler that needs root focus.
- `src/tests/fixtures/KanbanViewHarness.svelte:10,39` exposes `getPersistCount`.

## Why blocked

- 05 adds a "Tag color" submenu to the card menu in `KanbanCard.svelte`, passes a tag-click callback through `KanbanCard.svelte` and `KanbanLane.svelte`, and extends `KanbanView.test.ts`; this ticket edits the same card markup and test file, so it runs after 05.

## Sequence with

Tickets 11 (lane footer and counts, `KanbanLane.svelte`), 12 (table, list and archive) and 42 (card menu "Move to") edit `KanbanView.svelte`, `KanbanCard.svelte` or `KanbanView.test.ts` on other lines; run them in order, this ticket first. Ticket 02's board key handler is what receives the root focus this ticket sets. shell-sidebars-ux 25 wraps the toolbar (`KanbanView.svelte:462-507`), a different region. Open-itens 214 (lane grip, part 2 behind 040), 040 (drop index) and 006 (wrong-tab write) are avoided on purpose and stay open.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): none.
