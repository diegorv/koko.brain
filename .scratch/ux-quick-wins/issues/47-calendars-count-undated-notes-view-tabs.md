# 47: Calendars count undated notes; view tabs show their type

**Origin:** design review 2026-11-17, proposals P49 (part) and P138 (part), prototype `.scratch/design-review/prototypes/collection-queryjs.html`, research `.scratch/ux-quick-wins/research/verdict-collection.md` (P49, P138 and T4) and `breakdown.md` (old ticket 25).

**What to build:**

1. **`countUndated`.** A pure `countUndated(records, dateProperty)` in `src/lib/features/collection/calendar.logic.ts`, built on `extractDateFromRecord` (`:68`). It counts records whose start date is missing or unparseable (the records `groupRecordsByDate` skips at `:111`) and ignores `endDateProperty`.
2. **The inline block.** For a calendar or linear-calendar view with a `dateProperty` and a count above 0, the block header (`src/lib/features/collection/collection-block-widget.ts:139`, `${view.name} (${result.records.length})`) reads `Name (12, 5 without date)`. The count is computed once on the cache-miss path (`toDOM`, `:83-130`; the cache is set at `:125`) and stored in `CollectionCacheEntry` (`:26-33`) next to `result`; `renderView` runs on every `toDOM()` including cache hits (live-preview rule 2 in `docs/agents/live-preview-rules.md`), so it never rescans the records. Ticket 14 adds a muted `1 of N views` span to the same header: keep that span and change only the text part. A table view shows no such text.
3. **The `.view` tab.** The toolbar count (`src/lib/features/collection/CollectionView.svelte:587`, `{queryResult.records.length} results`) reads `12 results, 5 without <dateProperty>` for a calendar or linear-calendar view with a `dateProperty` and a count above 0. A table view still reads `N results`.
4. **No dated entries.** When records exist and none is dated, a muted "No dated entries" line replaces the empty grid, in the block (its calendar and linear-calendar branches) and in the tab (the body branches `CollectionView.svelte:695-720`, where `CollectionCalendarView` and `CollectionLinearCalendarView` render today).
5. **Tab icons.** Each view tab (`CollectionView.svelte:534-541`) shows a lucide `table`, `calendar` or `calendar-range` icon (`aria-hidden`). The disabled "Delete view" item (`:576-582`) carries the muted reason "A collection needs at least one view" inside the item, which needs no hover on a disabled element. Rename, Change type and Delete handlers and the context menu are unchanged. The calendar-config test helper moves from the icon lookup to the trigger's name (see Acceptance).

Not in this ticket: a chevron menu on the tab (one click to a Delete view with no confirm and to YAML rewrites that drop the file's comments, open-itens 071; the guard, a confirm or an undo on Delete and a no-op when the type is unchanged, is an owner decision and is deferred); the undated-notes chip that opens a list (a new popover, size M); the `weekStartDay` and `dateProperty` hardening in open-itens 138.

**Size:** S.

**Blocked by:** 09, 14

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh collection-block.spec.ts only when a selector or E2E surface changes.

- [ ] Failing test first, `src/tests/lib/features/collection/calendar-logic.test.ts`: `countUndated` is 0 for an empty list, counts a record with a missing date and one with an unparseable date, ignores `endDateProperty`, and counts nothing for fully dated records.
- [ ] `collection-block-widget.test.ts`: a calendar block over 3 records with 1 undated shows `1 without date` in its header on first render and on a cache hit (second `toDOM()` of the same yaml and version); a table block shows no such text; all records undated shows "No dated entries"; in the style of the existing cache test at `:241` (records change in the store with no version bump), the second `toDOM()` still shows the first count, so the number is served from the cache entry with the result and no mock of `calendar.logic.ts` is involved.
- [ ] `CollectionView.test.ts`: the same counts in the toolbar for a calendar and a linear-calendar view; a table view still reads `N results` (`CollectionView.restored-view.test.ts:115-136` stays green); all undated shows the muted line, not the empty grid.
- [ ] Table, calendar and linear-calendar tabs render three different icons; with one view the Delete item contains the reason text and is still disabled; with several views it is enabled and has no reason.
- [ ] The `openConfig` helper (`CollectionView.test.ts:748-760`) finds the trigger by its name "Calendar settings" (given by shell-sidebars-ux 16), not by `svg.lucide-calendar`: a Calendar icon on a calendar tab comes first in DOM order, and the old lookup would click the tab and fail the two calendar-config tests. This changes a test helper on purpose.
- [ ] Context-menu and double-click rename tests and `CollectionView.view-writes.test.ts` pass unchanged (nothing here writes).
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Original proposal

- **P49 (part).** Collection calendar views silently drop undated notes: they are skipped while the count still includes them, and an empty grid shows no message. Proposal: an "N without date" chip that opens a list, a "No dated entries" message, and the count "N results, M on calendar". Validation: keep. Built here: the count (worded "5 without <dateProperty>", better for the inline block, which shows only the current month, than "on calendar") and the message. The chip with a list is deferred.
- **P138 (part).** Collection view-tab actions hide behind double-click and right-click: the tabs have no type icon and Delete is disabled without a reason. Proposal: a chevron menu, a type icon and a tooltip on the disabled Delete. Validation: keep, changed to QUICK-PART in the research. Built here: the icons and the Delete reason; the chevron menu is not.

## Problem

A calendar view over 17 notes with 5 undated shows 12 on the grid and says "17 results", so five notes are missing with no hint. A view where no note has the date property shows an empty grid and no message. View tabs look identical whether they hold a table or a calendar, and the disabled Delete item gives no reason.

## Evidence

Checked at `085b23c5d`.

- `calendar.logic.ts:68` `extractDateFromRecord`; `:100-118` `groupRecordsByDate` skips at `:111`. `CollectionView.svelte:587` the count; `:534-541` the tab button (`ondblclick` rename at `:537`); `:576-582` the Delete item (`disabled`, no reason); `:695-720` the calendar and linear-calendar body branches with the "Configure a date property" fallback.
- `collection-block-widget.ts:26-33` `CollectionCacheEntry` (`version`, `view`, `result`); `:84-87` the cache hit; `:111` `definition.views[0]`; `:139` the header; `renderView` (its doc comment says it runs on every `toDOM()`, cache hits included).
- `CollectionView.test.ts:748-760` `openConfig` finds the config trigger with `document.querySelector('svg.lucide-calendar')?.closest('button')`.
- Lucide `table`, `calendar` and `calendar-range` exist in `node_modules/@lucide/svelte/dist/icons/` (checked by the verdict).
- `docs/agents/view-files.md:155`: every app write of a `.view` drops its comments; `handleDeleteView` (`CollectionView.svelte:445-452`) deletes with no confirm, which is why the chevron is deferred.

## Why blocked

- 09: it edits `CollectionView.svelte` (the sort handler `:397-409`) and `CollectionTableView.svelte` and adds cases to `CollectionView.test.ts`, the file and test this ticket edits on other lines.
- 14: it edits the block header at `collection-block-widget.ts:139` and `CollectionCacheEntry` (`:26-33`) to add the `1 of N views` hint, the exact lines this ticket changes, and adds cases to `collection-block-widget.test.ts`.

## External dependency

Shell-sidebars-ux 16 (`.scratch/shell-sidebars-ux/issues/16-filters-count-clear-view-triggers.md`, ready-for-agent) edits `CollectionView.svelte`: it makes each toolbar control one named button (including "Calendar settings"), adds the filter and sort counts and an empty-table state. Do not run this ticket before 16 is done: its trigger name fixes the `svg.lucide-calendar` test trap above, and both edit the toolbar and body region of the same component. If shell-sidebars-ux 25 lands first, its `ViewHeader` moves the toolbar count and the tab strip: rebase over it.

## Sequence with

Tickets 09 and 14 land first (see Why blocked). Ticket 15 and 44 edit the filter and sort panels, not this component's tabs. Open-itens 138 (view-tab keyboard and calendar hardening) is covered for bullet 1 only and stays open; open-itens 140 is partly absorbed by shell-sidebars-ux 16. Open-itens 230 edits the linear-calendar bar block, not these lines.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): 47.1 (old 25.1, a deferred decision): the Delete view guard for the tab chevron. Default: the chevron is not built and Delete stays in the context menu until the owner picks a guard.
