# 34: One pane-band utility for the ten top-band copies (land last)

**Origin:** design review 2026-11-17, proposal P18 (part 1, counted in new 25), prototype `.scratch/design-review/prototypes/shell-tabs-navigation.html` (section `#P18`), research `.scratch/shell-sidebars-ux/research/verdict-sh-view-headers-entry.md` (ticket V3) and `.scratch/shell-sidebars-ux/research/breakdown.md` (old ticket 45).

**What to build:** `@utility pane-band` in `src/app.css`, beside `pane-toolbar` (`:151`), equal to `h-10 shrink-0 bg-tab-bar` plus the inset divider shadow (`box-shadow: inset 0 -1px 0 var(--divider)`, written as a declaration, not `border-b`). Each of the ten sites keeps only what is not height, background or divider, and drops its inline `style="box-shadow: ..."`:

1. `src/lib/core/markdown-editor/EditorTabs.svelte`: the non-scrolling wrapper that ticket 21 builds (`h-10 bg-tab-bar`, the divider box-shadow 21 moved out of `.editor-tabs-bar`) takes `pane-band`. The scroller inside it keeps `editor-tabs-bar flex items-end overflow-x-auto` and its own classes, without `pane-band`. At HEAD the band is the scroller itself (`:46`, divider in `<style>` `:118-122`); after 21 it is not. The wrapper has no `shrink-0` today and the utility adds it: check the strip still sizes the same in the editor column.
2. `src/lib/app/AppShell.svelte:256` and `:276` (empty-state strips).
3. `src/lib/app/EditorView.svelte:154` (the empty-editor strip; ticket 26 edits this branch).
4. `src/lib/plugins/calendar/CalendarNavigator.svelte:88-89` (keeps `flex items-center gap-2 pl-[var(--rail-header-pad)] pr-3`).
5. `src/lib/features/search/SearchPanel.svelte:157-158` (keeps the `firstPane` padding).
6. `src/lib/features/rail-shell/FilesNavigator.svelte:305-306`.
7. `src/lib/features/rail-shell/RailNoteList.svelte:699-700` (keeps `@container relative flex items-center gap-1 pr-3` and the `firstPane` padding).
8. `src/lib/features/rail-shell/TypesNavigator.svelte:217-218`.
9. `src/lib/features/rail-shell/Rail.svelte:270` (keeps `sticky top-0 z-10 w-full`).

No site adds a `shadow-*` utility (Tailwind does not promise which of two box-shadow utilities wins). No visible change.

Not in this ticket: the second row under the band (`pane-toolbar`, already shared) and the title rows for kanban, `.view` and canvas tabs (ticket 25).

**Blocked by:** 17, 18, 21, 25, 26, 29

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`. Not covered by tests: a by-eye check in the light and dark themes (say so in the commit).

- [ ] Failing test first, new `src/tests/lib/pane-band.test.ts` (a source scan modelled on `src/tests/lib/pane-toolbar.test.ts`): the utility applies `h-10`, `shrink-0`, `bg-tab-bar` and the divider shadow; no class list in `src/lib` outside `components/ui` combines `h-10` with `bg-tab-bar`; no inline `box-shadow: inset 0 -1px 0 var(--divider)` remains; each site uses `pane-band` with no height, background or border override.
- [ ] The four assertions that pin the old classes (`src/tests/lib/app/EditorView.test.ts:381-382`, `src/tests/lib/features/rail-shell/Rail.test.ts:187,190`, `src/tests/lib/features/search/SearchPanel.test.ts:105`) move on purpose to `pane-band`; the commit says they move with the recipe.
- [ ] `RailNoteList.test.ts` contrast cases (`:253`, `:1160`) and `AppShell.test.ts` stay green.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P18 (part 1).** Every view builds its own header, and kanban, canvas and .view tabs lack note chrome. The top band is copied into 10 places. Add a `pane-band` utility for the 10 copies. (Parts 2 and 3, the slim header for kanban, canvas and collection tabs and Cmd+\ toggling the tab's own source mode, are ticket 25. Review validation: revise, Favorite and pin stay off non-markdown files.)

## Problem

The 40 px top band (height, tab-bar background, inset divider) is written out as ten separate class lists and inline styles. A change to the band has to be made ten times, and the copies can drift apart so the panes' bottom edges stop lining up.

## Evidence

Checked at `ab143a411`.

- The ten sites above; a grep for `bg-tab-bar` with `h-10` in `src/lib/**/*.svelte` returns exactly these (the `EditorTabs.svelte:57` hit is an inactive tab, not a band).
- `src/app.css:145-153`: `pane-toolbar`, the existing shared recipe; `src/tests/lib/pane-toolbar.test.ts` is the scan to copy.
- Pins that fail by design: `EditorView.test.ts:381-382` (class and inline `box-shadow`), `Rail.test.ts:187,190`, `SearchPanel.test.ts:105`.
- Tabs strip: `EditorTabs.svelte:46` is `h-10 bg-tab-bar overflow-x-auto` with no `shrink-0`; its divider comes from a scoped style at `:118-122`.

## Why blocked

- 17: Note-list header: one Display popover, a state dot, and "+" visible down to 150 px (`RailNoteList.svelte` header lines)
- 18: Shared roving-list util and arrow keys in Search results (`SearchPanel.svelte`)
- 21: The tab strip shows what is off screen, tabs shrink, and the sidebar toggle stops covering them (the `EditorTabs.svelte` wrapper)
- 25: Kanban, .view and canvas tabs get a title row with their own controls; source mode is per tab (`EditorView.svelte`)
- 26: The empty editor becomes a launch point and drops the empty right sidebar (`EditorView.svelte:154`, `AppShell.svelte:256,276`)
- 29: The day navigator stops being called Calendar, and Tasks, Graph and Tags get rail entries that open their tab (`CalendarNavigator.svelte`, `Rail.svelte`)

## Sequence with

- 13 and 14: edit the Files header, including the band class at `FilesNavigator.svelte:305`. The consolidated map does not chain them to this ticket (the earlier breakdown chained the Files "+" menu); whichever lands second rebases.
- 19, 20: other lines of `RailNoteList.svelte`. 22, 23: other lines of `EditorTabs.svelte` (per-tab markup and the menu). 30: hints in `Rail.svelte`. 16: the Filter trigger in the same header.

## Comments

- 2026-11-17, triage: ready-for-agent once its blockers land. Decided by the owner: the 34-ticket split; this ticket lands last. Defaults (not individually answered): none, the old ticket had no owner question.
