# Issue 50 discovery: pane toolbar band

No `spec.md` for ux-polish; sources are `review-2026-11-04.md` (Spacing and density, Shell rows 3 and 5) and `work/layout.md` R2 / P3 / P4 / P6. Issue 49 already moved the note action bar to `h-10`.

## Files that change

- `src/app.css:127`: add `@utility pane-toolbar` next to `section-label`: `flex h-10 shrink-0 items-center gap-1 border-b border-divider px-3` (layout.md R2).
- Second rows, each swaps its own height / gutter / gap / border classes for `pane-toolbar`, keeping only non-conflicting classes (bg, text color):
  - `features/note-action-bar/NoteActionBar.svelte:124` (`h-10 ... border-border px-3`)
  - `features/collection/CollectionView.svelte:416` (`h-10 border-border px-3 gap-1`)
  - `features/tags/TagsView.svelte:50` (`h-10 px-4 border-border`)
  - `features/tasks/TasksView.svelte:105` (`gap-2 px-4 py-2 border-divider`)
  - `plugins/kanban/KanbanView.svelte:462` (`gap-2 border-border px-4 py-1.5`)
  - `features/event-calendar/EventCalendarHeader.svelte:35` (`flex-wrap gap-3 border-border px-4 py-2`, two lines): one line, subtitle inline as `text-meta` after the title, `ml-2` before the view tablist to keep group spacing.
  - `features/properties/PropertiesView.svelte:152` (`h-10 px-3`) plus drop the `<Separator />` at :165, the utility draws the edge.
- `app/EditorView.svelte:147`: empty-editor strip gets the same `inset 0 -1px 0 var(--divider)` box-shadow as AppShell:253 / :273.
- `features/rail-shell/RailNoteList.svelte:416` and `features/search/SearchPanel.svelte:68`: new optional prop `firstPane` (default `false`); header is `pl-6` only when true, `pl-3` otherwise (typespacing.md:155). `app/AppShell.svelte:243-245` passes `firstPane={!hasNavigator}`, where `hasNavigator` is the existing `showsTypesNavigator || showsFilesNavigator || registeredNavigator` condition at :203, lifted to a `$derived`.

## Tests

- New `src/tests/lib/pane-toolbar.test.ts` (prior art `src/tests/lib/chrome-type-scale.test.ts`): app.css defines the utility with `h-10 px-3 gap-1 border-b border-divider`; each of the 7 files carries `pane-toolbar` on one class list with no `h-N`, `px-`/`py-`, `gap-` or `border-<color>` override beside it (Tailwind does not guarantee which of two conflicting utilities wins).
- Component class asserts where a mount test exists: `NoteActionBar.test.ts:275` and `AppShell.test.ts:243` (h-10 -> `pane-toolbar`), TagsView, KanbanView, CollectionView, PropertiesView, EventCalendarView (header one line, subtitle `text-meta`).
- `EditorView.test.ts`: empty strip draws the divider.
- `RailNoteList.test.ts`, `SearchPanel.test.ts`: `pl-6` with `firstPane`, `pl-3` and no `pl-6` without. `AppShell.test.ts`: Inbox (no navigator) -> note list header `pl-6`; Files rail item -> `pl-3`; Search lens the same.

## Defaults taken

- The note list rule strip (`RailNoteList.svelte:493`) is not in the Issue's list; left as is.
- `firstPane` defaults to `false` so a mount without the prop gets the plain gutter; AppShell is the only production caller.
- Tasks and Kanban group gap drops from 8px to the utility's 4px (no override, see test rule above).

## Risks

- Calendar title is `text-base` in a 40px row with `size-sm` (32px) buttons: fits, but a long subtitle truncates sooner on one line.
- Only class-level checks: jsdom does not compute Tailwind, so the shared pixel height is held by the utility, not measured.
