# 14: Inline collection block: readable table, built-in names, other-views hint

**Origin:** design review 2026-11-17, proposals P50, P09 (collection half), P47 (block side), prototype `.scratch/design-review/prototypes/collection-queryjs.html`, research `.scratch/ux-quick-wins/research/verdict-collection.md` (ticket T2) and `breakdown.md` (old ticket 23).

**What to build:** widget DOM and style edits in the inline block only, no live-preview decoration rework.

1. **Scrolling table.** `buildCollectionTable` (`src/lib/features/collection/collection-block-widget.ts:432-468`) keeps returning the `<table>` unchanged. `renderView` (`:163`) appends it inside a `cm-lp-table-scroll` div (`overflow-x: auto; overflow-wrap: normal; word-break: normal`, `th` nowrap). Ticket 03 already adds the `cm-lp-table-scroll` rule for QueryJS tables; reuse it and add only what is missing. The month grid (`:203-205`) and linear calendar (`:304-306`) reuse `cm-lp-collection-table` with `tableLayout: fixed`: they are not wrapped, and no new rule targets `.cm-lp-collection-table` alone (`styles.ts:593-616`), only the wrapper.
2. **Cell classes.** Date cells (a `Date`, or a string matching `^\d{4}-\d{2}-\d{2}`, since frontmatter dates arrive as strings) and number cells get a nowrap class. Text cells hold an inner span with max-width, ellipsis and `title` (max-width on a `td` is unreliable in auto layout, WebKit included).
3. **Built-in names.** Headers use `columnLabel` and name cells use `formatColumnCell`, both from ticket 09 (`collection.logic.ts`); the header `title` is the raw key. `file.name` cells lose the `.md`; the value, filters and sorts are unchanged.
4. **Other views.** `CollectionCacheEntry` (`:26-33`) carries the view names, computed on the cache-miss path only (the cache key stays the yaml string). With more than one view the header (`:139`) appends a muted `1 of N views` span whose `title` lists the other names, on first render and on a cache hit. One view renders no hint and the header stays `All (2)`. No interactive chips.

Not in this ticket: ellipsis on QueryJS cells (script output), `file.folder` stays absolute, humanized note-property and `formula.*` keys (open-itens 216 needs an owner decision), the undated-notes count (ticket 47).

**Size:** S

**Blocked by:** 09, 13

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus `bash scripts/e2e.sh collection-block.spec.ts` and `live-preview/click-reveal/collection-block.spec.ts`.

- [ ] Failing test first (`src/tests/lib/features/collection/collection-block-widget.test.ts`): the table sits inside `.cm-lp-table-scroll`; the month-grid and linear-calendar tables do not; a date-string cell and a `Date` cell carry the nowrap class; a long text cell's span has `title`.
- [ ] Headers read `Name` with `title="file.name"`; a `file.name` cell reads `w`, not `w.md` (assertions at `:188`, `:238`, `:254` change on purpose in the same commit).
- [ ] A two-view YAML renders `1 of 2 views` with the second name in `title`, on the first render and again on the cache-hit path; a one-view YAML renders no hint and the header text stays `All (2)`.
- [ ] `styles.test.ts` passes, plus a check that no new rule targets `.cm-lp-collection-table` alone and the radius ladder is unchanged.
- [ ] `e2e/specs/collection-block.spec.ts` (`:36,:41,:49,:54,:66` and the row locator `:58`) moves to `'Roadmap | active'` / `'2026-Q2 | active'` and `hasText: 'Roadmap'`; both E2E specs pass.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass. Not covered by jsdom: the widget height re-measure in a real editor; say so in the commit.

## Original proposal

- **P50.** "When an inline block has more than one view, add a muted '1 of N views' hint (or a tooltip naming them)." Validation: revise, no interactive chips.
- **P09 (collection half).** "Set `overflow-wrap: normal; word-break: normal` on both result tables. Header, date and number cells get `nowrap`. Text cells get a max-width, ellipsis and a title. Wrap each table in an `overflow-x: auto` container." The QueryJS half is ticket 03.
- **P47 (block side).** "Add built-in display names for `file.*` columns, with the raw key as a tooltip", and hide `.md` in the cell. The view side is ticket 09.

## Problem

The block's table inherits `overflow-wrap: anywhere` and has no overflow container, so words and dates split across lines and a wide table cannot scroll. Headers show `file.name` and cells show `.md`. The widget always renders `views[0]` with no sign that other views exist.

## Evidence

Checked at 085b23c5d.

- `collection-block-widget.ts:111` `definition.views[0]`; `:84-87` cache hit skips parsing; `:26-33` the entry has no names; `:139` header text; `:163` the table append; `:441` `th.textContent = col.displayName`.
- `styles.ts:593-616` the collection table rules (no wrap override); the month grid and linear calendar share the class.
- Tests that read names: `collection-block-widget.test.ts:188,238,254` (`w.md`); `e2e/specs/collection-block.spec.ts:36,41,49,54,58,66` (`Roadmap.md | active`). No E2E block defines two views, so `toHaveText('Active (1)')` stays green.

## Why blocked

- 09: it creates `columnLabel` and `formatColumnCell` in `collection.logic.ts`, which this ticket imports for the inline block.
- 13: it edits the callout, heading and meta-bind rules of the same `live-preview/styles.ts`; the theme file is one serial chain (03, 08, 13, 14).

## Sequence with

- 09 (collection table: names) supplies `columnLabel` and `formatColumnCell`, so it must be merged before this ticket starts; the owner order runs 09 before 14. Do not launch 14 by number ahead of 09.
- 03 (QueryJS tables) defines `.cm-lp-table-scroll` and the nowrap idea for QueryJS cells; reuse, do not duplicate.
- 47 (calendars count undated notes) edits the same widget header and `CollectionCacheEntry`; it is blocked by this ticket.
- open-itens 143 changes which view the block renders later; the hint stays valid.
- shell-sidebars-ux 16 owns `CollectionView.svelte` and `FilterPanel.svelte`, not this widget; no overlap.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. No owner questions on this ticket.
