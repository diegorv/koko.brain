# 17: Note-list header: one Display popover, a state dot, and "+" visible down to 150 px

**Origin:** design review 2026-11-17, proposal P33 (also builds P84's Display dot and P38's folder-lens "+" title), prototype `.scratch/design-review/prototypes/note-list-rail.html`, research `.scratch/shell-sidebars-ux/research/verdict-nl-header-creation.md` (T2) and `breakdown.md` (old ticket 18). Absorbs the note-list-header clause of `.scratch/open-itens/issues/207-chrome-icon-buttons-share-sizes-use-shadcn.md` only; its rail, tab band, note action bar, button size and `text-heading` parts stay in 207.

**What to build:**

1. **One Display trigger.** A sliders-icon trigger (the word "Display" from about 290 px of header width) replaces the Sort, Properties and Archive triggers. Its popover holds three sections, each the existing panel body with its own key model: Sort by (focus on the active row, Left/Right set direction, "Multiple sort..." on a view closes Display and opens the anchored sort panel), Show in note list (search, checkboxes, drag, Alt+arrows), Archived notes (only when `offersArchivedFilter`, `RailNoteList.svelte:138`). Tab moves between sections. No sort or properties logic is rewritten.
2. **State dot and name.** A dot on Display, named "Display options, customised", when the sort is customised, a property is shown (`selectedProperties.length > 0`) or `archivedFilter !== 'active'`; otherwise "Display options". Its `title` names the current sort ("Sorted by Modified"), since the header no longer shows the sort label or the `+N` extra-sort count (they move into Display).
3. **"+" survives 150 px.** Below a 220 px header container the title may shrink to nothing (`min-w-16` to `min-w-0`, `RailNoteList.svelte:705`), right padding 8 px, gap 2 px, CSS only on the existing `@container` header (`:698-700`); above 220 px nothing changes. Every lens keeps "+" visible at 150 px beside the labeled rail (Today also keeps its header action). The collapsed-rail case (`--rail-header-pad` 72 px) is not guaranteed; `rail-styles.spec.ts:532-548` pins it at the default list size and must stay green with Display in Sort's place.
4. **Folder-lens "+" title.** On a folder lens, "+" has `title` "New note in <folder>/" ("New note in the vault root" at the root). Its accessible name stays "New here" on every lens (about ten e2e lookups, `settings-copy.test.ts:112-115`, ten help pages); other lenses keep "Create a note in this list".
5. **Code.** `RailNoteList.svelte` header `:698-811`; `RailSortMenu.svelte` (`:106` is `min-w-0 max-w-full`, irrelevant once moved), `RailPropertiesPicker.svelte` (keep `available`, `selected`, `onChange`; open-itens 134 reuses it) and `RailArchivedMenu.svelte` each split into a panel body with the trigger removed (or a thin wrapper); new `src/lib/features/rail-shell/RailDisplayMenu.svelte`. Selectors `data-sort-option`, `data-sort-multiple` and `data-archived-option` stay; `data-note-list-sort`, `-properties` and `-archived` go; `data-note-list-display` arrives. Search and the view lens's Filter trigger stay pinned in the header (the Filter trigger is 16's).
6. **Help.** `help/documentation/01-getting-started.md:112` (Display with its three sections, the dot and the narrow behaviour; the Archived menu has no help today), the view toolbar paragraph of `25-types-and-relationships.md:461-465`, `help/examples/type-definitions-features/README.md:88`.

Not in this ticket: the prototype's overflow ("More") menu (it saves one 22 px slot on Today and the day lens only and costs a component and a second panel anchor); raising pane `minSize` (ADR 0033's 2026-11-06 amendment makes default sizes the minimums); renaming "New here"; a "+" menu in the header (13 owns the Files "+").

**Split point if one context struggles:** 17a the Display popover and dot; 17b the narrow header rule and the folder "+" title. In sequence.

**Blocked by:** 16

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` for `e2e/specs/rail-list-toolbar.spec.ts`, `e2e/specs/rail-styles.spec.ts` and `e2e/specs/rail-shell.spec.ts`.

- [ ] Failing test first, `e2e/specs/rail-list-toolbar.spec.ts` (jsdom cannot see a CSS container rule, and `RailNoteList.toolbar.test.ts:12-32` reports `width: 240` for every observed element): with the labeled rail, the Today list, a type list and a view list dragged to 150 px each show `[data-note-list-new]` visible and clickable (`click({ trial: true })`), Today also shows `[data-note-list-header-action]`, no header child ends past the pane edge, and the title has a non-zero width. The 220 px Inbox case still asserts the 64 px title (`:240-280`).
- [ ] `RailNoteList.toolbar.test.ts`: a type lens header has Search, `[data-note-list-display]` and "+", and none of `[data-note-list-sort]`, `[data-note-list-properties]`, `[data-note-list-archived]`; Display shows the Archived section on type and Untyped lenses, not on a folder lens.
- [ ] The sort cases of `RailNoteList.sort.test.ts` (settings-backed, `_list_sort`, `.view` `sort:`), the toggle and reorder cases of `RailNoteList.properties.test.ts`, and the archived cases (rows and rule line change, nothing saved) pass after only their open step changes; no assertion is removed.
- [ ] New `src/tests/lib/features/rail-shell/RailDisplayMenu.test.ts`: the active sort row has focus on open; Tab reaches the first Properties control, then the first Archived option; Escape closes and returns focus to the trigger; on a view "Multiple sort..." closes Display and opens the sort panel, and a click on Filter then closes it (`rail-list-toolbar.spec.ts:226-238` keeps passing).
- [ ] The dot and name: absent at defaults; present after choosing a sort, ticking a property, or "Show archived"; gone again after resetting each.
- [ ] Folder lens "+" `title` reads "New note in Projects/" for a picked `Projects` and "New note in the vault root" for the root; its name is "New here" on every lens.
- [ ] `rail-styles.spec.ts:532-548` (collapsed rail) passes with Display in Sort's place; `rail-shell.spec.ts:142` (`openSortPanel`) opens Display first.
- [ ] `rail-shell.boundary`, `layer-rules`, `chrome-state-styles`, `menu-item-anatomy` and `radius-scale` tests pass.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P33.** The note-list header loses New note and Daily note at narrow widths. Fold Sort, Properties and Archive into one Display popover; keep Search, Filter and "+" pinned with an overflow menu below about 220 px; prototype it at 150, 225 and 320 px. Validation: keep. This ticket replaces the overflow menu with a CSS narrow rule (default 17.1).
- **P84 (Display dot).** A dot on Archive when it is not at its default; built here as the dot on Display.
- **P38 (note-list "+" title).** The note-list "+" keeps creating a note in the listed folder; only its `title` changes.
- **207 (absorbed, note-list header clause).** Chrome icon buttons share sizes and use shadcn tooltips; only the note-list header buttons are touched here.

## Problem

Up to five `shrink-0` controls (Sort, Search, Properties, Archive or Filter, header action) plus "+" share the 40 px header band, and "+" is the first to clip. At about 150 px the Today list shows the title, sort, search and sliders icons; Daily note and "+" are cut off. What clips "+" is the 64 px title floor plus 24 px of padding, not the control count; the Sort, Properties and Archive icons are also ambiguous.

## Evidence

Checked at `ab143a411`.

- `src/lib/features/rail-shell/RailNoteList.svelte:698-700` header (`@container`, `h-10`), `:705` title `min-w-16 flex-1`, `:707` count hidden below 12 rem, `:709` `RailSortMenu`, `:722-735` Search, `RailPropertiesPicker`, `RailArchivedMenu`, `:754-760` Filter, `:784-797` "+" (`title="Create a note in this list"`, `aria-label="New here"`, `data-note-list-new`).
- `src/lib/features/rail-shell/rail-items.logic.ts:178-181,193-195`: `railHeaderPad = max(12, 120 - railWidth)`, so a first-pane header pads 72 px beside a collapsed rail and 36 px beside a captioned one. Arithmetic for Today beside the labeled rail: 12 + 8 right + 4 buttons 88 + 4 gaps 8 = 116 px, leaving the title 34 px at 150.
- `e2e/specs/rail-list-toolbar.spec.ts:240-280` asserts the title floor at about 220 px only; `settings-copy.test.ts:112-115` and ten help pages use the name "New here".
- `screens/narrow-1024x700-today-light.png` under `.scratch/design-review/` shows the clipped header; the prototype says "At 150 px the title keeps about 38 px, so it truncates" (`note-list-rail.html:336`, `min-width: 0` and 8 px padding at `:136-137,153-157`).
- `help/documentation/01-getting-started.md:112` never describes the Archive menu (grep of `help/documentation` for "Only archived" is empty).

## Why blocked

- 16: (same header and the Filter trigger it leaves pinned)

## Sequence with

- `RailNoteList.svelte`: 12, 15, 16 (blocker), 19, 20 (publishes `canCreate` for "New note here"), 24, and 34 (pane-band rewrites the band class at `:699`; 34 is blocked by this ticket).
- open-itens 132 and 136 (each adds a header control later: it goes inside Display or must pass the 150 px e2e), 134 (reuses `RailPropertiesPicker`), 137 (rule line and tests).
- `RailSortMenu.svelte`, `RailPropertiesPicker.svelte`, `RailArchivedMenu.svelte` have no other ticket in this batch.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: granularity of 34 consolidated tickets (this is old ticket 18 unchanged). Defaults (not individually answered): 17.1 (old 18.1) below a 220 px header the narrow CSS rule replaces the prototype's overflow menu; 17.2 (old 18.2) the sort name and `+N` move from the header into Display's tooltip and name.
