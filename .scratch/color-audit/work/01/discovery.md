# Discovery: Issue 01, faded text and icons use full-strength tokens

Measured with `utils/color.ts` on `research/theme-tokens.json` (28 themes). No prior work folder for this feature.

## Files that change
- Guard + contrast test (new): `src/tests/lib/architecture/muted-text-alpha.test.ts`, style of `palette-classes.test.ts`, comments stripped before the scan. Allow-list `{ file, cls, reason }`, each entry must still match (no stale entries).
- Item 1 text/placeholders: `CollectionView.svelte:613` (/60), `PropertiesView.svelte:224,230,235` (Plus /60, add input gets `placeholder:text-right-sidebar-muted-fg`, label /60), `PropertyField.svelte:113` (key placeholder, preflight 50%), `:131,139` (/70), `:191` (placeholder /30), `PropertiesView.svelte:176` type picker (/70, same finding), `KanbanView.svelte:607`, `KanbanLane.svelte:418` (placeholder /50), `CollectionTableView.svelte:73` (/50), `SourcesPanel.svelte:344` (drop `bg-muted/30`: muted on it is 3.86 min, on editor-bg 4.52 min), `FileHistoryDialog.svelte:83` (opacity-50), `src/app.css:480-481` (70% mix -> full `var(--date-input-fg, var(--foreground))`).
- Item 2 state dims: `OutgoingLinksPanel.svelte:74` drop opacity-60, add `data-unresolved` (destructive + AlertCircle already mark it); `PropertiesView.svelte:273` unresolved relationship row drops opacity-50, gets `italic text-right-sidebar-muted-fg` + `data-unresolved`. `CollectionCalendarView.svelte:136,144` out-of-month day `text-muted-foreground`, current month `text-foreground` (was /80), drop the `bg-muted/20` cell tint (fixes :161 "+N more": muted on muted/20 is 4.10 min, on card 4.51 min). `collection-block-widget.ts:271` no td opacity; out-of-month day number `color: var(--muted-foreground)` (4.51 min on collection bg). `CalendarGrid.svelte:58` `text-file-explorer-muted-fg` (4.50 min); `:68` dots on the selected day `bg-primary-foreground` (4.51 min). Archived chips (`EventBlock.svelte:80`, same pattern `EventMonthGrid.svelte:135`, `EventAllDayLane.svelte:81`): `eventColorStyle(color, archived)` in `event-calendar-event.logic.ts:434` returns editor-bg fill, `--muted-foreground` text, a 1px inset outline in the event's fg hue (outline: no layout change for `@container`, does not clash with the box-shadow ring). Read-only lock drops opacity-70 (same finding).
- Item 3 icons: `KanbanDatePicker.svelte:67,79` (/50), `:130` outside-month and disabled days (/40, no disabled dates are configured), `PropertiesPanel.svelte:135,142`, `FormulaRow.svelte:91,98`, `SortPanel.svelte:91` (/50), checkbox border `KanbanCard.svelte:214` + same class `KanbanListView.svelte:37`, `KanbanTableView.svelte:48` -> `border-muted-foreground`. Hover classes stay.

## Tests
- Contrast test over `BUILTIN_THEMES` with real `contrastRatio` / `flatten`, in the same new file.
- Component tests: `CollectionView.test.ts` (results count), `PropertiesView.test.ts` (Add property label, unresolved relationship), `OutgoingLinksPanel.test.ts` (unresolved row), `PropertyField.test.ts` (`VALUE_COLOR` pins `/70`: moves to full on purpose), `event-calendar-event.logic.test.ts` (archived style), `collection-block-widget.test.ts` (no td opacity), `CalendarGrid.test.ts` (out-of-month + dot).

## Defaults taken
- Allow-list: `text-foreground/80` in `ModDialogHost.svelte:151` and `EventForm.svelte:189` textareas mirror the `components/ui` Input value color (out of scan scope); foreground at 80% on input-bg is 4.70:1 min on all 28 themes. Listed with that reason rather than diverging from Input.
- `text-right-sidebar-fg/80` (list item text, `PropertyField.svelte:184,191`) is outside the Issue's token list and sites: left as is.
- Destructive text on the sidebar is itself 3.39:1 min: token weakness, Issues 05-07.
- No E2E selector changes expected; the gate is check + targeted vitest.

## Risks
- Visual: muted rows look less faded; out-of-month collection cells lose their tint (the muted day number carries the cue).
