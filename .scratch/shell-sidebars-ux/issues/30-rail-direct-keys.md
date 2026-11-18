# 30: Direct keys for rail items

**Origin:** design review 2026-11-17, proposal P37 (direct-keys part, counted in new 20), prototype `.scratch/design-review/prototypes/shell-tabs-navigation.html` (section `#P37`, the "Key mode" control), research `.scratch/shell-sidebars-ux/research/verdict-sh-view-headers-entry.md` (ticket V7) and `.scratch/shell-sidebars-ux/research/breakdown.md` (old ticket 40).

**What to build:** parked until the owner picks a chord. Do not start this ticket.

1. A chord plus 1 to 9 selects the Nth visible rail item: hidden items are skipped, `railOrder` is respected, and pins and tab entries (ticket 29) take digits in visible rail order. Nothing past nine.
2. Hints on the first nine rows in the labeled and captioned rail forms; none in the collapsed form.
3. Code: nine bindings by `code: 'DigitN'` in `src/lib/app/global-keybindings.ts` (Cmd+1 and Cmd+2 keep hiding and showing the panels, `:140-141`); digits added to `CODE_DISPLAY_MAP` in `src/lib/utils/keybindings.ts:29-34` (a `Digit1` code prints "Digit1" today); a pure index helper in `rail-items.logic.ts`; hints in `Rail.svelte`; the selection goes through `selectRailItem` in `app/rail-navigation.ts`. ADR-0033 amendment; help `20-keyboard-shortcuts.md` and `01-getting-started.md`.

Not in this ticket: merging Cmd+1, Cmd+2 and Cmd+Shift+B, and an F6 focus cycle.

**Blocked by:** 29

**Status:** needs-info

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing test first, `src/tests/lib/features/rail-shell/rail-items.logic.test.ts`: the helper maps the visible rail order to digits 1..9, nothing past nine; hidden items are skipped and `railOrder` is respected.
- [ ] Failing test first, `src/tests/lib/app/global-keybindings.test.ts`: the chosen chord with digit N selects the Nth visible item through the real `settingsStore`; Cmd+1 and Cmd+2 still hide and show the panels; `formatShortcut` prints the digit, not "Digit1"; the "registers all 25" pin at `:142` changes on purpose.
- [ ] `Rail.test.ts`: hints show in the labeled and captioned forms and not in the collapsed form. Not testable: collisions with macOS Mission Control or Parallels.
- [ ] ADR-0033 amendment and help list the keys.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P37.** The keyboard can open a lens but not enter it; rail items have no shortcuts. Owner decisions in the proposal: direct keys for rail items (Ctrl+1..9 or Cmd+Opt+1..9), merging the three panel bindings, and an optional F6 focus cycle. (Review validation: revise, Cmd+1..9 would reverse ADR-0033.) This ticket is the direct-keys part only.

## Problem

Every rail item needs a click or the palette's "Go to X". Cmd+1 and Cmd+2 are taken by the panel toggles (ADR-0033), so a digit chord has to avoid them, and the macOS chords that look natural (Ctrl+1..9) can be the system's desktop switch.

## Evidence

Checked at `ab143a411`.

- `src/lib/app/global-keybindings.ts:133-141`: Cmd+Shift+B, Cmd+1 and Cmd+2; `:181` Cmd+0 (zoom reset). No `ctrl` binding exists.
- `src/lib/utils/keybindings.ts:29-34`: `CODE_DISPLAY_MAP` has no digits.
- `src/tests/lib/app/global-keybindings.test.ts:142`: "registers all 25 fixed global keybindings".
- `src/lib/features/rail-shell/rail-items.logic.ts:36-58`: the item order the digits would index. The prototype's handler wires only `Digit1` to `Digit4` and defaults to Ctrl, which is not the recommended chord.

## Why blocked

- 29: The day navigator stops being called Calendar, and Tasks, Graph and Tags get rail entries that open their tab (the item list the digits index)

## Sequence with

- `global-keybindings.ts` and its count pin: 26 (adds a `command` id, count unchanged), 28 (one more binding), 32 (Back and Forward).
- `app/rail-navigation.ts`: 20 (focus request) and 29 (tab entries branch). `Rail.svelte`: 29 (the Tabs section), 34 (band class `:270`).
- ADR-0033 amendments: 20, 29. Help `20-keyboard-shortcuts.md` and `01-getting-started.md`: 20, 28, 29.

## Comments

- 2026-11-17, triage: needs-info. Decided by the owner: the 34-ticket split, and no direct rail shortcuts for now (answered with the Tasks, Graph and Tags rail entries, ticket 29). Open when this is revived: 30.1 (old 40.1) which chord, Cmd+Opt+1..9 (recommended), Ctrl+1..9 (can collide with macOS "Switch to Desktop N") or none, which would make this ticket wontfix; 30.2 (old 40.2) whether pins and tab entries take digits in visible rail order (recommended yes).
