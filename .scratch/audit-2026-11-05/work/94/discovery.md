# Issue 94 discovery: SidebarSection wrapper

No `spec.md` for audit-2026-11-05. Source: `.scratch/ux-polish/work/layout.md` P7 / R6. Prior art: `.scratch/ux-polish/work/50/` (the `pane-toolbar` utility, `src/tests/lib/pane-toolbar.test.ts`).

## Files that change

- New `src/lib/core/layout/SidebarSection.svelte` (core, so features and plugins may import it). Props: `title`, `open?` (bindable; undefined = static section that never collapses), `onOpenChange?`, `children`. One header element, written once in a snippet: `pane-toolbar w-full`, a `size-3.5` chevron slot always reserved (chevron only when collapsible), `h2.text-title text-right-sidebar-primary`. Collapsible sections use the shadcn `Collapsible` (Trigger `child` snippet renders that header as the button). Body: `p-2 border-b border-divider`.
- `features/properties/PropertiesView.svelte:153-167`: header through the wrapper (static), drop the header `+` (keep the footer "Add property" row, layout.md R6), `:257` Relationships becomes `h3.section-label text-right-sidebar-muted-fg`, drop the trailing `<Separator class="mt-2" />` at `:303` (the wrapper draws the edge).
- `features/backlinks/BacklinksPanel.svelte:53-61`, `features/outgoing-links/OutgoingLinksPanel.svelte:51-59`, `plugins/table-of-contents/TableOfContentsPanel.svelte:45-52`: outer Collapsible + trigger replaced by the wrapper; `onclick={handleExpand}` becomes `onOpenChange` (fetch when it opens). Backlinks/Outgoing keep `max-h-[50vh] overflow-y-auto` on an inner div.
- `app/AppShell.svelte:283`: drop the `<Separator />` after TOC and its import.
- `features/properties/NoteInfo.svelte:43`: drop its leading `<Separator />`. NoteInfo renders only with Properties visible, so a section's bottom edge always sits above it; keeping it would draw a double line.

## Tests

- New `src/tests/lib/core/layout/SidebarSection.test.ts` (mount pattern from `PropertiesView.test.ts`): header structure (pane-toolbar row, reserved chevron slot, text-title h2), static vs collapsible, open/close, onOpenChange.
- Each panel test: its header comes from the wrapper (`[data-sidebar-section]`, chevron slot). `PropertiesView.test.ts:122`: titles are `['Properties']`, Relationships is a `section-label` h3; one add-property entry point.
- `pane-toolbar.test.ts`: the Properties entry moves to `SidebarSection.svelte`, which now owns the class list. `AppShell.test.ts:310` stays as is (h2 parent carries `pane-toolbar`).

## Defaults taken

- **Divider below, not `border-t` above.** The Issue says `border-t border-divider` between sections. The header keeps `pane-toolbar` (Issue 50: the Properties header lines up with the note action bar's edge, asserted in `AppShell.test.ts`), which already draws a bottom divider; a `border-t` on the next section would double it under a collapsed header. So the header draws its divider and an open body draws one below it: exactly one line between any two sections.
- Body padding stays `p-2` (rows already sit at 16px in all four panels); R6's `px-3` is not taken. The titles move to one edge (12px gutter + reserved slot + 4px gap = 30px), contents to one edge (16px).
- The unused `Separator` imports in the three collapsible panels are pre-existing dead code: left, mentioned in the report.
- Out of scope (R6 items not in the Issue): the empty 40px band, hiding the sidebar for board/canvas/view tabs.

## Risks

- jsdom computes no Tailwind: the shared recipe is held by class asserts, the pixel edge by the screenshot check.
- `Collapsible` content props/ids come from bits-ui through the Trigger `child` snippet; panel tests that click `button` must still hit the header.
