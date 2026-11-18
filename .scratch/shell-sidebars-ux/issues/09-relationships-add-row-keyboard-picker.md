# 09: Relationships: only kinds with links, one Add relationship row, a keyboard picker with recent notes first

**Origin:** design review 2026-11-17, proposal P46, plus the Relationships halves of P43 (empty chrome) and P177 (kind labels) (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/right-sidebar.html` (P46 and P43 articles), research `.scratch/shell-sidebars-ux/research/verdict-rs-relationships.md` and `.scratch/shell-sidebars-ux/research/verdict-rs-properties-layout.md` (its Ticket 3) and `.scratch/shell-sidebars-ux/research/breakdown.md` (old ticket 15, now this one). Absorbs `.scratch/open-itens/issues/156-relationship-picker-navigates-arrow-keys.md` (whole; its "rebuild on shadcn Command" and `pnpm build` gate do not carry over) and item 2 of `.scratch/open-itens/issues/210-noteinfo-relationships-heading-follow-sidebar-section.md` (its other two items land in 05).

**What to build:** in `src/lib/features/properties/` and one line in `src/lib/app/AppShell.svelte`:

1. **Keyboard picker.** In the relationship picker Up and Down move an active row (wrapping), Enter picks it, Escape closes as today, the hovered row becomes active, and the active row scrolls into view (`{ block: 'nearest' }`). With an empty query, notes reached through the Quick Switcher come first under a "Recent notes" heading, then the rest with no heading (the Quick Switcher's shape, `QuickSwitcher.svelte:164-184`). A query gives one flat ranked list. The list is capped by `MAX_RESULTS` (100, `file-entries.logic.ts:30`) and scrolls inside `max-h-48`; the component's `.slice(0, 20)` (`RelationshipSearch.svelte:25`) goes.
2. **Only kinds with links.** A note with no relationships shows no separator, no "Relationships" heading and no empty kind rows, only one "Add relationship" row. A note with relationships shows the heading and only the kinds that have links, each with its label ("Belongs to", "Related to", "Has many": sentence case, `text-rail`, muted, not `section-label`), its plus and its rows, with the Add row below them.
3. **One Add relationship row.** It opens one popover: a three-item kind step (keyboard-usable with the same active-row mechanism), then the note search. Picking a note adds the link to that kind; a second pick in an existing kind extends its value.
4. **Code.**
   - `RelationshipSearch.svelte` keeps the plain input, the `<button onmousedown>` pick with `preventDefault` (`:66-72`), `Popover.Content trapFocus={false}` (`:53`) and the explicit focus on open (`:41`). Commit `7af4d945a` left bits-ui `Command` because picks inside the Popover were flaky, and `computeAddRelationshipValue` (`src/lib/core/frontmatter/properties.logic.ts`) does not dedupe, so a double pick would write `[[X]]` twice. Add a local `activeIndex` reset to 0 on query change (precedent `src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:20-65`). ARIA: input `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`; list `role="listbox"`; rows `role="option"` with ids from `$props.id()` plus the index and `aria-selected`; the active row gets `bg-accent`.
   - Recents: a `recentPaths?: string[]` prop (default `[]`). `PropertiesView` forwards it and `AppShell.svelte:279` passes `quickSwitcherStore.recentPaths`. `features/properties` must not import `features/quick-switcher` (`src/tests/lib/architecture/feature-cycle-baseline.json:23`). Groups through `splitRecentFiles`; flat results through `filterAndRank(query, allFiles, recentPaths)`.
   - An optional kind prop: with it the kind step comes first; without it the picker is exactly the keyboard picker of item 1 (used by the per-kind plus buttons).
   - `PropertiesView.svelte:53-57` (`FIXED_RELATIONSHIPS` labels, keys unchanged) and `:243-290`; picking calls the existing `addRelationshipLink(kind, name)`.
5. **Docs.** `help/documentation/07-sidebar-panels.md:47` (typing, Up and Down, Enter, recent notes first, the single Add row), `25-types-and-relationships.md:542`, and a dated amendment line in `docs/adr/0026-type-definitions-relationships-lifecycle.md` (its 2026-05-28 amendment records "a 'Has Many' row in the Properties panel"; empty kinds are now reached through Add relationship).

Not in this ticket: rebuilding the picker on bits-ui `Command` and dropping `trapFocus={false}`; the picker's key-hint footer, the "Linked X under Belongs to" status line and a file icon on relationship rows (prototype extras).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing test first, `src/tests/lib/features/properties/RelationshipSearch.test.ts` (jsdom, real `fsStore`, `vaultStore`, `fileIconsStore`; `Element.prototype.scrollIntoView ??= () => {}` as `QuickSwitcher.test.ts:32` does): three notes and an empty query, the first option has `aria-selected="true"`; ArrowDown and ArrowUp move it; after each move the input's `aria-activedescendant` is the id of the `role="option"` element that has `aria-selected="true"`.
- [ ] Failing test first, `PropertiesView.test.ts` (real `propertiesStore`, `editorStore`): open the Belongs to picker, type `Pro`, press Enter. `_belongs_to` equals `[[Projects]]` exactly once, the popover is closed, and reopening shows an empty input.
- [ ] Failing test first, `RelationshipSearch.test.ts`: `recentPaths` `['/vault/C.md', '/vault/Gone.md', '/vault/A.md']` with notes A, B, C lists C, A under "Recent notes", then B with no heading; the missing path is skipped; no `recentPaths` gives no heading and A, B, C; a query gives no heading.
- [ ] A mousedown pick still writes exactly one `[[...]]` and closes; Escape closes and clears the query; Enter with no matches does not call `onSelect`. The three existing `RelationshipSearch` tests pass with selectors moved to `[role="option"]`.
- [ ] Failing test first, `PropertiesView.test.ts`: a note with no relationship keys renders no "Relationships" h3, no `[data-slot="separator"]` inside Properties, no kind label, and exactly one "Add relationship" button.
- [ ] A note with only `_belongs_to` renders the h3, a "Belongs to" label with its link and plus, no "Related to" or "Has many", and the Add row below. This replaces `PropertiesView.test.ts:172-181` on purpose; `:151-158` (the h3 is `section-label`) stays. Kind labels have `text-rail`, not `section-label`.
- [ ] From the Add row, choosing "Has many" and a note writes `_has_many` with that link (asserted on the real store and tab content); a second pick in an existing kind extends it. The kind step works by keyboard (arrows and Enter pick a kind, then the search takes focus).
- [ ] `feature-cycle.test.ts` and `layer-rules.test.ts` stay green.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

If one context struggles, split at the seam: the keyboard picker and recents first (the scope of open-itens 156), then the Relationships block and the kind step.

## Original proposal

- **P46.** The relationship picker cannot be used from the keyboard. Follow the Quick Switcher: an active row, Up and Down, Enter, `aria-activedescendant`, and pass the recent files so an empty query lists recents first. Validation: revise; an empty query already lists 20 files alphabetically.
- **P43 (Relationships half).** An empty Relationships block draws a separator, a heading and three empty kind rows; show it only when links exist, behind one Add row.
- **P177 (Relationships half).** The kind labels are title case in `section-label`; the rail already says "Belongs to / Related to / Has many" (`rail-shell/lens.logic.ts:416-418`).
- **156 (absorbed).** The relationship picker navigates with the arrow keys.
- **210 item 2 (absorbed).** The Relationships heading follows the sidebar section recipe; its owner decision is settled by the prototype: a heading only when links exist.

## Problem

Only Escape works in the picker. Rows select on mousedown, there are no arrow keys or Enter, and an empty query lists 20 files alphabetically with no recents. Every note also carries a Relationships separator, a heading and three empty kind rows whether or not it has any links.

## Evidence

Checked at `ab143a411`.

- `src/lib/features/properties/RelationshipSearch.svelte:25` passes `[]` as recents and slices to 20; `:33-38` handles Escape only; `:66-72` rows are `<button onmousedown>` with no `onclick`; `:53` `trapFocus={false}`.
- `src/lib/features/properties/PropertiesView.svelte:53-57` title-case labels; `:243-290` the always-rendered block with `Separator`, the `section-label` h3 and `section-label` kind labels; `:252` the one `RelationshipSearch` caller. `AppShell.svelte:279` is the one `PropertiesView` mount.
- `src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:26` `recentPaths`; `addRecentPath` has two callers, `QuickSwitcher.svelte:82,108`. `file-entries.logic.ts:51` `splitRecentFiles`, `:67` `filterAndRank`.
- `src/tests/lib/architecture/feature-cycle-baseline.json:23` already holds `quick-switcher -> properties`, so `properties` cannot import `quick-switcher`; `src/lib/app/` may import any feature.
- `docs/adr/0026-type-definitions-relationships-lifecycle.md:45` and `help/documentation/25-types-and-relationships.md:542` both record the always-present "Has Many" row.

## Sequence with

- `PropertiesView.svelte` and `PropertiesView.test.ts`: 05 (`:156`), 10 (`:137-152`, `:164-241`), 11 (`:155`, `:165-206`).
- `AppShell.svelte`: 21 (`:190-196`), 05 (`:277` and the sidebar block), 26 (`:188` comment), 34 (band lines `:256,276`). This ticket edits the import and `:279` only.
- `help/documentation/07-sidebar-panels.md`: 01, 04, 05, 06, 07, 10, 26. The `:49` type-selector sentence sits next to `:47`; whoever lands second merges by hand.
- `RelationshipSearch.svelte` has no other ticket; it is the first in this batch to change its list.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: the 34-ticket consolidation (this ticket was a single old ticket and keeps its scope). Defaults (not individually answered): 09.1 "Recent notes" means notes reached through the Quick Switcher, because recording every open is a core change (breakdown.md question 15.1); 09.2 the headings match the Quick Switcher ("Recent notes" plus an unheaded rest), not the prototype's "Recent" and "All notes" (breakdown.md question 15.2).
