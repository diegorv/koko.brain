# 11: Property rows stack key over value in a narrow sidebar

**Origin:** design review 2026-11-17, proposal P121 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/right-sidebar.html` (P121 article), research `.scratch/shell-sidebars-ux/research/verdict-rs-properties-layout.md` (its Ticket 4) and `.scratch/shell-sidebars-ux/research/breakdown.md` (old ticket 26, now this one). No open-itens Issue is absorbed.

**What to build:** in `src/lib/features/properties/PropertyField.svelte` and `PropertiesView.svelte`. It lays out the final row, so it lands after the tickets that add elements to it; the line numbers below are HEAD `ab143a411` and the builder re-reads them after 04 and 10 land.

1. **Stacked rows.** Below 232 px of container width (`@max-[232px]:`, one constant named in the test) each property row becomes a two-column grid: a 14 px icon column and the content, with the name above the value. The sidebar can never be much wider than about 250 px at a 1024 px window (`maxSize={30}`, `AppShell.svelte:272`).
2. **Out-of-flow actions.** The Remove button (`PropertyField.svelte:158-164`) and, on list rows, the Add item button (`:147-153`) leave the flow at every width (`absolute` in a `relative` row, the `div.group` at `:106`) and show on `group-hover` and `group-focus-within`. That frees about 24 px. List rows leave no empty grid cell above the chips.
3. **Type row.** It follows the same layout, and its 16 px spacer (`PropertiesView.svelte:203`) goes. The root (`PropertiesView.svelte:155`) gets `@container`.
4. **Selectors that must keep matching:** `input[data-property-key]`, `div.group` and `input:not([data-property-key])` (`e2e/specs/live-preview/frontmatter-write-keeps-scroll.spec.ts:180-191`, `e2e/specs/properties-cross-note.spec.ts:100-104`). No new input may come before the value input in a row.

Not in this ticket: any change to `rightSidebarSize`, `minSize` or `maxSize`; list chip editing (04) and the type menu and typed add (10), which this layout absorbs.

**Blocked by:** 04, 10

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh properties-cross-note.spec.ts` (and the new narrow-width case)

- [ ] Failing test first, `src/tests/lib/features/properties/PropertiesView.test.ts`: the root carries `@container`. `PropertyField.test.ts`: the main row, key and value carry the `@max-[232px]:` stacked classes; the row is `relative`; Remove (and Add item on a list) is `absolute` with `group-hover:opacity-100` and `group-focus-within:opacity-100`.
- [ ] Every value variant (text, number, date, boolean, list with and without chips) still renders and edits through its existing test; the list branch leaves no empty grid cell above the chips; the type row has no spacer and stacks the same way; the type-selector describe (`PropertiesView.test.ts:184-`) stays green.
- [ ] E2E (required, because jsdom computes no container query): at a 1024x700 viewport with the fixture's `rightSidebarSize: 20` (`e2e/fixtures/test-vault.ts:52`, about 166 px) the first `input[data-property-key]` is above its value input and at least 100 px wide; at 1440 px key and value share one row. `properties-cross-note.spec.ts` stays green. The assertions name the fixture width, not "near the default width": the app default is `rightSidebarSize: 3` (`settings.store.svelte.ts:72`).
- [ ] No change to `rightSidebarSize`, `minSize` or `maxSize` in `AppShell.svelte`.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P121.** A narrow right sidebar truncates property names to one letter. Below about 220 px, stack the key over the value with a container query, and take the remove button (and the matching spacer) out of the flow. Validation: keep.

## Problem

The key (`flex-[2]`), the value (`flex-[3]`) and an in-flow Remove button squeeze each other, so at a laptop window the key shows as "t..." and meta-bind values are hard to read. List rows carry a second in-flow button (Add item), and the type row repeats the layout with a spacer that aligns with the Remove slot.

## Evidence

Checked at `ab143a411`.

- `src/lib/features/properties/PropertyField.svelte:106` the `div.group` row; `:108-165` the main row (icon `:110`, key `flex-[2]` `:113-119`, value `flex-[3]`, list branch `:144-154`, Remove `:158-164`).
- `src/lib/features/properties/PropertiesView.svelte:155` root, `:165-206` type row, `:203` the spacer.
- `src/lib/app/AppShell.svelte:270-272` `minSize={3}` and `maxSize={30}`; `src/lib/core/settings/settings.store.svelte.ts:72` the default `rightSidebarSize: 3` is a percentage, so a fresh vault opens a very narrow pane; `e2e/fixtures/test-vault.ts:52` uses 20, about 166 px at 1024 px.
- `e2e/specs/properties-cross-note.spec.ts:100-104` and `frontmatter-write-keeps-scroll.spec.ts:180-191` pick a row as a `div.group` containing `input[data-property-key]`.

## Why blocked

- 04: (A refused property rename reverts and says why: list chips and the key input it rewrites)
- 10: (Untyped notes get a Set type row...: the type row and the icon button this layout has to hold)

## Sequence with

- `PropertyField.svelte` and `PropertyField.test.ts`: 04 and 10 are blockers, so this ticket goes last of the three and its E2E covers the final row once. Never edit the file in parallel with them.
- `PropertiesView.svelte`: 05 (`:156`), 09 (`:53-57`, `:243-290`), 10 (blocker, `:137-152`, `:164-241`).
- `help/documentation/07-sidebar-panels.md` needs no change here; if a layout sentence is added, it merges with 01, 04, 05, 06, 07, 09, 10, 26.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: the 34-ticket consolidation (this ticket keeps its old scope and goes after the property-editing tickets, because the two research verdicts disagreed on the order and the layout-last order lets one E2E check the final row). Defaults (not individually answered): 11.1 the Remove button leaves the flow at every width, overlaying about 16 px of a long value's tail on hover (breakdown.md question 26.1); 11.2 the stacking threshold is 232 px of container width, reconciling the review's "about 220" and the prototype's 215 and 234 px (breakdown.md question 26.2).
