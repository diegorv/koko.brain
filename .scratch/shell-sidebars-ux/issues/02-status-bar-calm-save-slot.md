# 02: Calmer status bar: 24px, no pulse, a save slot that does not shift

**Origin:** design review 2026-11-17, proposal P176 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/shell-tabs-navigation.html` (section `#P176`), research `.scratch/shell-sidebars-ux/research/verdict-sh-empty-zoom-status.md` and `breakdown.md` (old ticket 06).

**What to build:**

1. **24 px bar.** `--status-bar-height` goes from `2rem` to `1.5rem` (`src/app.css:211-212`). `src/lib/app/SettingsPanel.svelte:116` follows the token on its own.
2. **No pulse.** `animate-pulse` goes from the Modified icon (`src/lib/core/status-bar/SaveStatus.svelte:16`). The filled `Circle` vs `CircleCheck` distinction stays, and no other animation is added.
3. **Stable save slot.** Saved and Modified take the same width, so nothing to the left or right of them moves when the state flips. Recommended: both labels stacked in one `inline-grid` cell inside the existing `inline-flex` span, the inactive one `invisible` and `aria-hidden="true"`, so the bar's divider pseudo-element (`src/lib/core/status-bar/StatusBar.svelte:24-33`) stays outside the grid and the check does not depend on a preceding item (Todoist sync or a mod chip). An alternative is a `rem` `min-width`, only if the E2E below passes with an item before it. `data-save-status` on the span for the E2E.
4. **Unchanged.** No tab or a virtual tab still renders nothing (no reserved slot). No clickable status bar items.
5. **Docs.** Note in `help/documentation/mods/08-custom-ui.md:372` (the status bar row) that a mod chip taller than 24 px overflows.

Not in this ticket: clickable status bar items (excluded by the review's validation).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh settings.spec.ts` and the spec that holds the new case

- [ ] Failing test first, new `src/tests/lib/core/status-bar/SaveStatus.test.ts` (real `editorStore`): a dirty tab (`content !== savedContent`) renders "Modified" and no `.animate-pulse`; only the active label is exposed to assistive technology; a saved tab renders "Saved"; no tab and a virtual tab render nothing.
- [ ] Failing E2E first (`e2e/specs/word-count.spec.ts` or `editor.spec.ts`): with a note open, `[data-status-bar]` is 24 (plus or minus 0.5) px tall; `[data-save-status]` keeps the same `x` and `width` while Saved, after typing (Modified) and after the autosave (`expect.poll` over the 2 s debounce, `editor.service.ts:276-279`). If the E2E vault can show Todoist sync's status item before it, run once with it; otherwise say so in the PR.
- [ ] `e2e/specs/settings.spec.ts:23` goes from 32 to 24 (a requested value change, not a weakened check) and the Settings panel still ends at the bar's top edge in the same test.
- [ ] `help/documentation/03-editor.md:141-151` stays true; the mods help note above is added.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P176.** The status bar is tall for passive text, and the save indicator pulses and shifts. The bar is 32 px tall for 12 px text, and "Modified" pulses and changes width on every autosave. Lower `--status-bar-height` to about 24 px, remove the pulse, and give the save slot a fixed min-width. Validation: revise, clickable items are left for later.

## Problem

The bar costs 8 px of editor height for passive text, and the pulsing Modified icon draws the eye while the person types. The Saved and Modified labels have different widths, so every autosave shifts the items next to the slot.

## Evidence

Checked at `ab143a411`.

- `src/app.css:211-212`: the token comment and `--status-bar-height: 2rem`. `src/lib/core/status-bar/StatusBar.svelte:9`: `h-(--status-bar-height) ... text-xs`.
- `src/lib/core/status-bar/SaveStatus.svelte:14-23`: two spans with no reserved width; `:16` `animate-pulse`.
- `src/lib/app/SettingsPanel.svelte:116` is the only other consumer of the token. `e2e/specs/settings.spec.ts:23` (`toBeCloseTo(32, 0)`) is the only place the value is encoded; no snapshot contains it.
- `StatusBar.svelte:24-33`: the 12 px divider before every child of a group except the first; mods prepend to the right group (`help/documentation/mods/08-custom-ui.md:372,417`).
- Real screenshot: `.scratch/design-review/screens/landing-today-light.png`.

## Sequence with

Ticket 27 (zoom chip): its offset reads `--status-bar-height`, which works in either order. Ticket 01: both add cases to `e2e/specs/settings.spec.ts` on different lines. Open-itens 066 (status bar note count, left group): other lines, rebase only.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: the consolidated 34-ticket numbering and granularity. Defaults (not individually answered): 02.1 no reserved save slot when nothing shows (no tab, virtual tab).
