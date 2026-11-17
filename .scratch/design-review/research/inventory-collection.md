# Inventory: Collection (tables / views), src/lib/features/collection

Scope: facts only, read-only. Paths relative to repo root `src/lib/features/collection/` unless noted. Line counts from `wc -l`.

## 1. Components

| File | Lines | Renders | shadcn/ui primitives used | Custom markup |
|---|---|---|---|---|
| CollectionView.svelte | 736 | Container: parse error, "Building index...", toolbar (view tabs, sort/filter/properties/calendar-config buttons), filter error, body switch (table / calendar / linear calendar) | Popover, PopoverTrigger, PopoverContent, Button (icon-sm ghost), ContextMenu (Root, Trigger, Content, Item, Sub, SubTrigger, SubContent) | Tab strip `div` with `button`s; inline rename `input`; `{#key}` wrapper |
| CollectionTableView.svelte | 97 | Table view: `th` sort headers, rows, cells, "Show more" | none | raw `table`/`thead`/`tbody`, raw `button`, raw `input type=checkbox` |
| CollectionCalendarView.svelte | 172 | Month grid (7 cols), prev/next year/month, event pills, "+N more" | none (lucide icons only) | raw `button` nav (5), raw `button` pills, CSS grid |
| CollectionLinearCalendarView.svelte | 219 | Year view: 12 month rows x 31 day columns, absolutely positioned bars, color legend | none | raw `button` nav (5), raw `button` bars, inline-style CSS grid |
| toolbar/CalendarConfigPanel.svelte | 144 | 4 labelled dropdown "selects" (date prop, end prop, week start, color prop) | DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem | Four identical raw `button` triggers (lines 52, 74, 100, 124) |
| toolbar/FilterPanel.svelte | 216 | Two collapsible sections ("All views", "This view"), conjunction dropdowns, rows, "Add filter" | Button (ghost sm), Separator, Collapsible/Trigger/Content, DropdownMenu* | Raw `button` conjunction triggers (113, 175) |
| toolbar/FilterRow.svelte | 188 | One filter row (visual mode: property/operator dropdowns + value input + delete; raw mode: expression input + delete) | Button (ghost icon-sm), DropdownMenu*, DropdownMenuLabel, DropdownMenuSeparator | Raw `button` triggers (115, 157), raw `input` (93, 175) |
| toolbar/FormulaRow.svelte | 91 | One formula row, edit mode (name + expression inputs, confirm/remove) or view mode | Button (ghost icon-sm, line 47, 57) | Raw `button` (80, 87), raw `input` (41, 64) |
| toolbar/PropertiesPanel.svelte | 168 | Column visibility checkboxes (File / Note / Formula groups), formula list, "Add formula" | none inside body; uses FormulaRow child | Raw `input type=checkbox` (79, 97, 126), raw `button` (133, 140, 159), raw `div.h-px` separators (92, 110, 158) |
| toolbar/SortPanel.svelte | 159 | Sort rows (drag handle, name, direction dropdown, delete), empty text, "Add sort" | Button (ghost icon-sm 126, ghost sm 145), DropdownMenu* | Raw `button` direction trigger (100); `div role=listitem draggable` rows (80-88) |
| toolbar/... .logic.ts, .types.ts, yaml-parser.ts, collection-block-widget.ts | n/a | Non-Svelte. `collection-block-widget.ts` (507 lines) renders the same views as CodeMirror live-preview DOM (`document.createElement`, `style.cssText`), not Svelte components | n/a | n/a |

Related CSS: `src/lib/core/markdown-editor/extensions/live-preview/styles.ts:575-640` (`.cm-lp-collection-*` rules, 1006-line file).

## 2. States: empty / loading / error / disabled

### Present
- Parse error (YAML): `CollectionView.svelte:502-508` (title "Parse Error", title-case; `font-mono text-xs` detail; no `role`). Widget: `collection-block-widget.ts:94-99` ("Parse error: ...", class `cm-lp-collection-error`).
- Loading: `CollectionView.svelte:509-512` text "Building index..." (no spinner). Same text also used when `rowSet.entriesLoaded()` is false (`queryResult` null, line 254-257). Widget: `collection-block-widget.ts:102-108` (class `cm-lp-collection-loading`), rebuilt on index ready (line 423).
- Filter error: `CollectionView.svelte:687-694`, `role="alert"` (line 690), toolbar stays visible, table hidden. Widget: `collection-block-widget.ts:142-148` (no role).
- Table empty: `CollectionTableView.svelte:34-37` "No results match the current filters" (`p-8 text-sm`, centered, no icon, no action). Widget: `collection-block-widget.ts:160-166` (`cm-lp-collection-empty`). The same message is shown for "no notes at all" and "filters exclude everything"; it is not distinguished.
- Calendar, no date property configured: `CollectionView.svelte:704-708` "Configure a date property to display entries on the calendar". Linear: `CollectionView.svelte:718-722` "Configure a date property to display the linear calendar". Widget equivalents: calendar `collection-block-widget.ts:184`, linear `collection-block-widget.ts:279`.
- No views in a block: `collection-block-widget.ts:112-115` `container.textContent = 'No views defined'` (no class, so unstyled text in the block container).
- Formula name errors: `FormulaRow.svelte:61-63` (`text-meta text-destructive`, no `aria-describedby` on the name input at line 41-46).
- Formula expression error: `FormulaRow.svelte:68-74` (`aria-invalid`, `aria-describedby`, `id="formula-error-..."`, `data-formula-error`).
- Filter raw-row error: `FilterRow.svelte:97-98, 105-107` (`aria-invalid`, `aria-describedby`, `data-filter-error`).
- Sort empty: `SortPanel.svelte:137-139` (default "No sorts applied", line 37; `emptyText` prop line 34).
- Properties empty: `PropertiesPanel.svelte:152-154` "No properties available" (shown only when `allColumns` and `formulaEntries` are both empty).
- Save failure: `CollectionView.svelte:284-295` toasts only: "This view changed. Your edit was not saved." (conflict, line 288) and "Could not save the view" (line 294). Rollback/reseed at line 335-338. No inline indicator.

### Absent (no branch in code)
- Calendar with zero records: `CollectionCalendarView.svelte` has no `result.records.length` check; renders an empty month grid with no message (see lines 34-172). Same for linear calendar `CollectionLinearCalendarView.svelte` (no empty branch; grid always rendered, lines 140-216).
- Filter panel with no filters: `FilterPanel.svelte` shows only "Add filter" (lines 142-150 and 204-212); no "No filters" text.
- Pending write / saving state: `CollectionView.svelte:92, 308-339` tracks `pendingWrites` only in script; no template output.
- Loading for table: none beyond the index text; no skeleton, spinner or `aria-busy` anywhere in the feature (grep for loader/spinner/skeleton/animate-: no hits in the feature).
- Widget (`collection-block-widget.ts`): no empty state for calendar grids with zero records (`buildCalendar`, lines 180-272, has no count check).

### Disabled states
- Formula confirm disabled: `FormulaRow.svelte:52` `disabled={!canConfirm}` (`canConfirm` at 32-34). Only disabled-looking control on the panel.
- Delete view disabled when one view remains: `CollectionView.svelte:577-578` (`ContextMenu.Item disabled`). No tooltip explaining why.
- Checkbox cells in table rows: `CollectionTableView.svelte:65` `disabled class="pointer-events-none"`. Shows native disabled styling for display-only booleans.
- Sort direction items: no-op when already selected (`SortPanel.svelte:110, 117`) but not disabled.
- "Add sort" hidden, not disabled, when nothing is left to sort (`SortPanel.svelte:142`).
- Active-state text for toolbar buttons: sort/filter/calendar-config use `text-primary` when active (`CollectionView.svelte:598, 625, 648`); properties button is always `text-muted-foreground` (line 668) even when columns are hidden. Filter count is not shown on the button (only the Filter panel shows a count badge, `FilterPanel.svelte:101-105, 163-167`); sort count is not shown anywhere.

## 3. Interaction

### Keyboard
- Only keyboard handler in the feature: inline tab rename, `CollectionView.svelte:486-494` (Enter commits, Escape cancels). Commit also on blur (line 529).
- Table: no keyboard path. Sort headers are `th` with `onclick` (`CollectionTableView.svelte:44-47`), rows are `tr` with `onclick` (55-58). Neither is focusable; no `tabindex`, no `role`, no key handler. Grep for `tabindex`/`onkeydown` in the feature returns only `CollectionView.svelte:528`.
- Calendar: nav and events are `button`s (native keyboard works), e.g. `CollectionCalendarView.svelte:76-110, 153-159`.
- Block widget (CodeMirror): row `tr` click (`collection-block-widget.ts:452`), calendar pill `div` click (line 255, not a button), bar `div` click (line 384). No keyboard.
- Focus on rename: `CollectionView.svelte:465-468` `requestAnimationFrame` focus+select. No focus return after rename commit/cancel (lines 472-484).
- No `aria-keyshortcuts`, no keyboard shortcuts for views, sorts, filters.
- Dropdown/popover/context-menu keyboard behaviour is from bits-ui primitives (not overridden here).

### Focus management
- Popover/dropdown/context-menu focus handled by bits-ui (not configured in this feature).
- Focus-visible styling is set only on text inputs: `FilterRow.svelte:99, 179`, `FormulaRow.svelte:45, 70` (`focus-visible:border-ring`, no ring). Raw `button`s in the feature have no focus-visible class (e.g. `CollectionView.svelte:534-541, 544-550`, `CollectionCalendarView.svelte:76-110`, `FilterPanel.svelte:113-115`, `PropertiesPanel.svelte:133-146`, `SortPanel.svelte:100-105`), so they rely on the UA default. shadcn `Button` supplies `focus-visible:ring-[3px]` (`src/lib/components/ui/button/button.svelte:7`).
- Rename `input` has `outline-none` and only `border-ring` (`CollectionView.svelte:530`), no ring.

### Hover-only affordances
- Tab rename: double-click only (`CollectionView.svelte:537`). Rename also via context menu (line 557).
- Tab delete/type change: context menu only (`CollectionView.svelte:554-584`); no visible control on tabs.
- Calendar "go to today": double-click on month label (`CollectionCalendarView.svelte:92`, title "Double-click to go to today"). Linear: double-click year (`CollectionLinearCalendarView.svelte:104`).
- Formula row controls (pencil, X) are `text-muted-foreground/50` at rest, colour change on hover only (`FormulaRow.svelte:81, 87`; `PropertiesPanel.svelte:134, 141`).
- Conjunction selector (`FilterPanel.svelte:113-115, 175-177`): plain text with colour change on hover; no chevron, no border, no button chrome.
- Table rows: hover background only (`CollectionTableView.svelte:56`).
- Sort drag handle: `cursor-grab` plus colour change (`SortPanel.svelte:90`). No hover hint text.
- Tooltips: only native `title` attributes (see section 4). No Tooltip component used.

### Drag and drop
- Sort rows only: `SortPanel.svelte:80-88` (`draggable`, `dragstart`, `dragover`, `drop`, `dragend`), state `dragIndex` (line 45). `dragover` only sets `dropEffect` (lines 58-63): no drop indicator class. No keyboard alternative (the direction and delete buttons are the only controls).
- Column reordering: none (checkboxes only, `PropertiesPanel.svelte:79-84`).
- Smooth scroll on add formula: `PropertiesPanel.svelte:68-70` (`behavior: 'smooth'`), no reduced-motion check.

### Context menus
- Tab strip: `CollectionView.svelte:519-585` (shadcn ContextMenu wrapping the tab strip; `oncontextmenu` on each tab sets `tabContextIndex`, line 538). Items: Rename, Change type (Table / Calendar / Linear calendar), Delete view (destructive, disabled at one view).
- No context menus elsewhere in the feature.

### Tooltips (title attribute)
- `CollectionView.svelte:546` "Add view".
- `CollectionCalendarView.svelte:79, 86, 93, 100, 107` (Previous year, Previous month, Double-click to go to today, Next month, Next year); `:156` event pill title = basename.
- `CollectionLinearCalendarView.svelte:91, 98, 105, 112, 119` (Back 5 years, Previous year, Double-click to go to current year, Next year, Forward 5 years); `:208` bar title = basename.
- `CollectionTableView.svelte:72` icon-type cell title = icon name.
- Widget: bar `bar.title = basename` (`collection-block-widget.ts:382`). No other title in widget.

### Click targets that are not buttons
- `CollectionTableView.svelte:44-47` `th onclick` (sort).
- `CollectionTableView.svelte:55-58` `tr onclick` (open note).
- `CollectionTableView.svelte:67-68` `a href` inside clickable `tr`; no `stopPropagation`, so a link click also bubbles to the row handler.
- `CollectionView.svelte:536-537` tab `button` with `onclick` and `ondblclick`; fine.
- `collection-block-widget.ts:255` calendar pill `div` `addEventListener('click')`.
- `collection-block-widget.ts:384` bar `div` click.
- `collection-block-widget.ts:452` row `tr` click.
- `toolbar/SortPanel.svelte:80-88` `div role="listitem"` draggable, no parent list role.
- `toolbar/PropertiesPanel.svelte:126-131` checkbox row is a `div` containing a native input (not label-wrapped for formula rows, lines 125-132). Other rows are `label` (78, 96).

### Nested interactive controls (markup)
- Popover/dropdown triggers wrap raw `<button>` or shadcn `Button` inside a bits-ui trigger without the `child` snippet: `CollectionView.svelte:594-602, 621-627, 644-650, 667-670`; `CalendarConfigPanel.svelte:51-58, 73-80, 99-106, 123-130`; `FilterPanel.svelte:112-116, 174-178`; `FilterRow.svelte:114-121, 156-162`; `SortPanel.svelte:98-105, 144-147`. bits-ui `popover-trigger` renders `<button>` when no `child` snippet is given (`node_modules/bits-ui/dist/bits/popover/components/popover-trigger.svelte:39-42`). The dropdown trigger wrapper passes through to bits-ui `Trigger` (`src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte:4-6`). Result: `button` inside `button` in these places. The context-menu trigger uses the `child` snippet (`CollectionView.svelte:521-552`), which is the correct form.

## 4. Accessibility facts

### Icon-only buttons and names
| Location | Control | Accessible name |
|---|---|---|
| `CollectionView.svelte:544-550` | Add view (Plus) | `title="Add view"` only |
| `CollectionView.svelte:595-601` | Calendar config (Calendar icon) | none (no title, no aria-label) |
| `CollectionView.svelte:622-628` | Sort (ArrowUpDown) | none |
| `CollectionView.svelte:645-651` | Filter (ListFilter) | none |
| `CollectionView.svelte:668-670` | Properties (Columns3) | none |
| `CollectionView.svelte:526-532` | Rename input | none (no label; value is tab name) |
| `CollectionCalendarView.svelte:76-110` | 5 nav buttons | `title` only, no aria-label |
| `CollectionLinearCalendarView.svelte:88-122` | 5 nav buttons | `title` only, no aria-label |
| `CollectionCalendarView.svelte:153-159` | Event pill | text content (basename) |
| `toolbar/FormulaRow.svelte:47-56` | Confirm (Check) | `aria-label="Confirm formula"` |
| `toolbar/FormulaRow.svelte:57-59` | Remove (X) in edit mode | none; this X deletes the formula (`onclick={onRemove}`) |
| `toolbar/FormulaRow.svelte:80-85` | Edit (Pencil) view mode | `aria-label="Edit formula"` |
| `toolbar/FormulaRow.svelte:87-89` | Delete (X) view mode | none |
| `toolbar/PropertiesPanel.svelte:133-139` | Edit formula (Pencil) | none (the FormulaRow version has a label; this one does not) |
| `toolbar/PropertiesPanel.svelte:140-146` | Delete formula (X) | none |
| `toolbar/PropertiesPanel.svelte:159-167` | Add formula | text "Add formula" (named) |
| `toolbar/FilterRow.svelte:101-103` | Delete raw row (X) | none |
| `toolbar/FilterRow.svelte:184-186` | Delete visual row (X) | none |
| `toolbar/SortPanel.svelte:126-133` | Delete sort (X) | none |
| `toolbar/SortPanel.svelte:90-92` | Drag handle (GripVertical) | none; a `span`, not focusable |

Named but icon-only: none with `aria-label` except FormulaRow (2 of 4).

### Form control labelling
- Dropdown "selects" in CalendarConfigPanel show only the value (e.g. `CalendarConfigPanel.svelte:55`), labels are `span` (lines 49, 71, 97, 121) not associated with the trigger.
- FilterRow property/operator triggers: no aria-label, value text only (`FilterRow.svelte:118, 160`). Value input placeholder "Value..." only (line 178). Raw input placeholder "Expression..." only (line 96).
- Checkbox rows in PropertiesPanel are wrapped in `label` (lines 78-86, 96-104) and are labelled; formula checkboxes (126-131) are not in a `label`.
- Formula name input placeholder only (`FormulaRow.svelte:44`), no label.

### Roles and live regions
- `role="alert"`: `CollectionView.svelte:690` (filter error only). Parse error (502-508), widget errors (`collection-block-widget.ts:94-99, 142-148`) and empty states have no role.
- `role="listitem"` without list: `SortPanel.svelte:87`.
- `aria-invalid` + `aria-describedby`: `FormulaRow.svelte:68-69`, `FilterRow.svelte:97-98`. Name input in FormulaRow has no `aria-invalid`.
- `aria-sort` on sortable headers: not present (`CollectionTableView.svelte:44-47`); sort state is shown with ↑/↓ text glyphs only (`:30`).
- Heading semantics: header text "Parse Error" and section labels are `p` (`CollectionView.svelte:505`, `PropertiesPanel.svelte:76, 94, 112`). Linear-calendar year is a `button` with `text-lg font-bold` (`CollectionLinearCalendarView.svelte:102-108`); calendar month is a `button` (`CollectionCalendarView.svelte:90-96`). No `h*` elements in feature.
- Tables: `CollectionTableView.svelte:40` real `table`, but no `caption`, no `scope` on `th`. Widget tables: `collection-block-widget.ts:432-471` (`th` no scope); calendar and linear calendar use `table` for grid (`:300-402`) without `caption`.
- Calendar grid: no `role=grid`/`gridcell`; days are `div`s (`CollectionCalendarView.svelte:133-167`).
- Linear calendar: bars are overlaid on day cells with absolute positioning; the bar label is the only text, legend swatches (`CollectionLinearCalendarView.svelte:129-134`) have no text alternative beyond the value text.
- Icons: lucide icons, no `aria-hidden` set in the feature (grep `aria-hidden`: none).
- Checkbox `disabled` table cell (`CollectionTableView.svelte:65`) is announced as disabled.

### Colour contrast-relevant facts (see section 5)
- Muted-foreground at 50% (`text-muted-foreground/50`) used for the delete/edit affordances (`FormulaRow.svelte:81`, `PropertiesPanel.svelte:134`, `SortPanel.svelte:90`) and for null dashes (`CollectionTableView.svelte:63`).
- Linear bars force `text-white` (`CollectionLinearCalendarView.svelte:199`) on arbitrary colour backgrounds; the widget computes text colour via `barTextColor(color)` (`collection-block-widget.ts:380`, import at line 23).

## 5. Styling facts

### Raw colour literals
- Hex / rgb in `.svelte` and `collection-block-widget.ts`: none (grep `#rrggbb` returns 0).
- `text-white` only at `CollectionLinearCalendarView.svelte:199`.
- Fallback literal in widget: `collection-block-widget.ts:252` `rgba(255,255,255,0.05)` (in `var(--lp-collection-table-alt, ...)`).
- Fallback literal for error colour: `src/lib/core/markdown-editor/extensions/live-preview/styles.ts:854, 871, 888, 915` `var(--lp-collection-error, #f87171)`.
- Dark-theme hex for collection tokens: `src/app.css:328-339` (`#1e1e2e`, `#313244`, `#a6adc8`, `#181825`, `#31324488`, `#1e1e2e44`, `#585b70`, `#f38ba8`).

### Collection-specific tokens: defined only in dark block
- `--lp-collection-*` are declared only at `src/app.css:328-339`, inside the `.dark` block (`.dark` starts `app.css:215`, `:root` at `:155` has none, `:root,.column-tones` at `:380` has none). grep for `lp-collection` in `app.css` outside 215-379: 0 hits.
- Used without fallback in `styles.ts:575-640` (e.g. `border: 1px solid var(--lp-collection-border)` at 581, 599, 883, 960, 987; `var(--lp-collection-bg)` at 579) and in widget inline styles (`collection-block-widget.ts:198, 298, 335`).
- Consequence (fact, not verified visually): in the light theme these custom properties resolve to nothing.

### Theme tokens used in Svelte (not raw colours)
- `bg-card` (`CollectionView.svelte:501`), `bg-muted`, `bg-muted/60`, `bg-muted/20`, `bg-muted/50`, `bg-muted/20`, `bg-primary/5`, `bg-primary/10`, `bg-primary/15`, `bg-primary/25`, `text-primary`, `text-primary-foreground`, `text-muted-foreground`, `text-muted-foreground/40`, `/50`, `/60`, `text-foreground/80`, `text-foreground/15`, `border-foreground/15`, `border-border`, `border-border/50`, `border-input`, `bg-background`, `bg-accent`, `hover:bg-accent`, `text-destructive`, `border-destructive/50`, `bg-destructive/10`, `bg-divider`-style via `var(--divider)` inline (see below), `ring`, `border-ring`, `bg-destructive`.
- Inline `var()` references in `style=`: `var(--divider)` (`CollectionCalendarView.svelte:120, 137`; `CollectionLinearCalendarView.svelte:147, 152, 167, 180, 189`), `var(--primary)` (`CollectionLinearCalendarView.svelte:80, 81, 205`), `var(--lp-collection-*)` only in widget.
- `--divider` light value `app.css:176` (oklch), dark `app.css:237`.
- `color-mix(in oklab, var(--divider) 50%, transparent)` for dashed grid lines (`CollectionCalendarView.svelte:137`; `CollectionLinearCalendarView.svelte:167, 180`).

### Hard-coded font sizes
- `text-[11px]`: `CollectionCalendarView.svelte:154` (event pill), `:162` ("+N more"); `CollectionLinearCalendarView.svelte:146` (day header), `:151` (day numbers). No other arbitrary font size classes in the feature.
- Project tokens used instead: `text-label` (11px, app.css:92), `text-meta` (12px, app.css:94), `text-row` (14px, app.css:98): `FilterPanel.svelte:102, 164` (`text-label`), `CollectionView.svelte:690, 692` (`text-row`, `text-meta`), `FormulaRow.svelte:62, 73`, `FilterRow.svelte:106`, `PropertiesPanel` none.
- Widget inline sizes: `collection-block-widget.ts:` `font-size: 0.9em` (198, 238, 298), `0.85em` (252, 335), `max(11px, 0.8em)` (260, 320, 380), `max(11px, 0.9em)` (342), `1em` (214). The widget mixes em and px floors; the Svelte view uses px and rem-based tokens.
- Svelte text sizes in use: `text-xs` (most), `text-sm` (`CollectionTableView.svelte:40`, `CollectionView.svelte:705, 719, 504, 510`), `text-lg` (`CollectionLinearCalendarView.svelte:103`), `text-label`, `text-meta`, `text-row`, `text-[11px]`.
- Font weights: `font-medium` (13 uses), `font-semibold` (4), `font-bold` (2: `CollectionCalendarView.svelte:143`, `CollectionLinearCalendarView.svelte:103`).

### Inline styles (`style=` in Svelte)
- `CollectionView.svelte:531` `min-width: 80px` (rename input).
- `CollectionCalendarView.svelte:120` weekday header border; `:137` day cell dashed borders.
- `CollectionLinearCalendarView.svelte:132` legend swatch `background`; `:144, 163, 189, 194` grid templates `56px repeat(31, 1fr)`; `:147, 152, 167, 180` borders and min-height; `:189` `margin-top: -{rowHeight}px` (negative margin computed in JS); `:200-206` bar geometry and `background`.

### Arbitrary values (Tailwind brackets)
- `text-[11px]` (above). `h-6`, `h-7`, `h-8` used (`CollectionView.svelte:530` h-6, `FormulaRow.svelte:45` h-7, `FilterRow.svelte:99,116,158,179` h-7 with min-w-[80px], min-w-[70px]); `min-w-[80px]` (`SortPanel.svelte:95`); `max-h-[300px]` (`CollectionView` none, `PropertiesPanel.svelte:74`, `CalendarConfigPanel.svelte:59, 81, 131`, `SortPanel.svelte:150`, `FilterRow.svelte:122`); `max-h-[400px]` (`FilterPanel.svelte:94`); `max-h-6` (`CollectionTableView.svelte:70`); `transition-[filter]` (`CollectionLinearCalendarView.svelte:199`); `bg-[...]` none.
- `grid-template-columns` `56px` hard-coded in two views (`CollectionLinearCalendarView.svelte:144, 163, 189`).
- Size scale in use: `size-3` (icons in toolbar), `size-3.5` (most icons), `size-4` (linear calendar nav, `:93, 100, 114, 121`), `size-6` (day circles, `CollectionCalendarView.svelte:142`), `size-7`/`size-8` via Button.

### Spacing and radius
- Toolbar height via `pane-toolbar` utility (`app.css:151-153`, `h-10 px-3 border-b border-divider`).
- Section label utility `section-label` (`app.css:140-142`: `text-label font-semibold tracking-wide uppercase text-muted-foreground`), used in `PropertiesPanel.svelte:76, 94, 112`.
- Padding values in use: `p-1`, `p-1.5`, `p-2`, `p-3`, `p-4`, `p-8`, `px-1`, `px-1.5`, `px-2`, `px-3`, `py-0.5`, `py-1`, `py-1.5`, `py-2`, `py-2.5`, `gap-0.5`, `gap-1`, `gap-1.5`, `gap-2`, `gap-3`. Tabs: `px-2 py-0.5 h-6` (`CollectionView.svelte:530, 535`), `px-1.5 py-0.5` (`:545`). Pill `px-1.5 py-0.5` (`CollectionCalendarView.svelte:154`).
- Radius: `rounded-xs` (12 uses), `rounded-sm` (2), `rounded-md` (25), `rounded-lg` (2), `rounded-full` (3).
- Min heights: calendar day `min-h-24` (`CollectionCalendarView.svelte:134`); linear `MIN_ROW_HEIGHT = 36` (`CollectionLinearCalendarView.svelte:37`).

### z-index
- None in `src/lib/features/collection/**` (.svelte or .ts). Widget sets `bar.style.zIndex = '1'` (`collection-block-widget.ts:393`).

### Transitions and animation
- `transition-colors` (default 150ms Tailwind): `CollectionTableView.svelte:45, 56`; `CollectionCalendarView.svelte:77, 84, 91, 98, 105, 154`; `CollectionLinearCalendarView.svelte:89, 96, 103, 110, 117`.
- `duration-100` with `transition-[filter]` on bars (`CollectionLinearCalendarView.svelte:199`).
- `transition-transform` on chevrons (`FilterPanel.svelte:99, 161`; `rotate-90`).
- `transition-all` only via shadcn Button base (`button.svelte:7`).
- Smooth scroll: `PropertiesPanel.svelte:69` (`behavior: 'smooth'`).
- Widget: no transitions.

### Reduced motion
- No `prefers-reduced-motion` anywhere in the feature. Global grep in `src/` returns one hit only: `src/lib/features/event-calendar/EventCalendarView.svelte:284`.

### Theme handling
- Svelte uses semantic Tailwind tokens (`bg-card`, `text-muted-foreground`, etc.) which are mapped to CSS variables, so light/dark follow the app theme.
- Widget and CodeMirror styling uses `--lp-collection-*` (dark-only definitions, section 5 above).

### Custom CSS files
- None in the feature folder (`find` for `*.css`/`*.scss` returned nothing).
- CSS for the widget lives in `src/lib/core/markdown-editor/extensions/live-preview/styles.ts:575-640` (plus error rules at 854-915, border rules at 883, 960, 987).

## 6. Copy (user-visible strings)

Case / tone / terminology observations, cited.

### Case
- Title case vs sentence case for error headings: "Parse Error" (`CollectionView.svelte:505`) vs "Filter error" (`:691`) vs widget "Parse error: ..." (`collection-block-widget.ts:97`).
- Title case in headers and sentence case elsewhere: "Start date property" (`CalendarConfigPanel.svelte:49`), "End date property (optional)" (`:71`), "Week starts on" (`:97`), "Color by property (optional)" (`:121`); "All views" / "This view" (`FilterPanel.svelte:100, 162`).
- Context menu item casing: "Change type" (`CollectionView.svelte:561`), submenu "Table", "Calendar", "Linear calendar" (`:566, 569, 572`).
- Conjunction labels: "All the following are true", "Any of the following are true", "None of the following are true" (`toolbar.types.ts:59-63`). Operators lower-case: "is", "is not", "does not contain" (`toolbar.types.ts:32-44`).
- Sort direction labels use arrows and mixed casing: "A → Z", "Smallest → Largest", "Old → New", "False → True" (`sort.logic.ts:42-54`).
- Formula validation: "Name is required", "Name cannot contain spaces", "Name cannot contain dots or parentheses" (`toolbar/formula.logic.ts:120-122`), "Invalid expression" (`:106`).
- Expression errors surfaced verbatim in the UI (`FilterRow.svelte:106`, `FormulaRow.svelte:73`), originating in `expression/parser.ts:22-24, 162, 201, 207`, `tokenizer.ts:68, 165`, `evaluator.ts:221, 288, 470, 596`, `methods.logic.ts:269`: lowercase starts with "Expected ...", "Unexpected token ...", "Unknown function: ...", "Circular formula reference detected: ...". Mixed technical phrasing.

### Ellipsis and placeholders
- Three ASCII dots "..." throughout: "Building index..." (`CollectionView.svelte:510`, widget `:105`), "Select property..." (`CalendarConfigPanel.svelte:55`), "Formula name..." (`FormulaRow.svelte:44`), "Expression (e.g. priority * 2)..." (`:67`), "Expression..." (`FilterRow.svelte:96`), "Value..." (`:178`). No unicode ellipsis in the feature.
- Placeholder "Property" with no ellipsis (`FilterRow.svelte:118`).
- Placeholder "(unnamed)" in parentheses for formulas (`FormulaRow.svelte:79`, `PropertiesPanel.svelte:132`).

### Verbs and labels for "add"
- "Add view" (tooltip only, `CollectionView.svelte:546`), "Add filter" (`FilterPanel.svelte:149, 211`), "Add sort" (`SortPanel.svelte:147`), "Add formula" (`PropertiesPanel.svelte:167`). Consistent noun-first phrasing, but the formula button is a raw `button` (`:159-167`) while the other three are shadcn `Button` ghost sm.
- "Show more" (`CollectionTableView.svelte:92`) with count line "Showing X of Y" (`:87`). Widget footer: "Showing 50 of N" (`collection-block-widget.ts:171-176`). Same pattern, different element.

### Navigation wording
- Tooltips: "Previous year" / "Next year" / "Previous month" / "Next month" (calendar, `CollectionCalendarView.svelte:79-107`) vs "Back 5 years" / "Forward 5 years" (linear, `CollectionLinearCalendarView.svelte:91, 119`). Linear uses "Back/Forward", calendar uses "Previous/Next" for the same kind of control.
- Double-click hints: "Double-click to go to today" (`CollectionCalendarView.svelte:93`) vs "Double-click to go to current year" (`CollectionLinearCalendarView.svelte:105`).
- Calendar has no 5-year jump, linear has one (fact of design, `CollectionLinearCalendarView.svelte:88-122` vs `CollectionCalendarView.svelte:76-110`).

### Terminology drift
- Results: "N results" (`CollectionView.svelte:587`); "No results match the current filters" (`CollectionTableView.svelte:36`, widget `collection-block-widget.ts:163`) empty message).
- Entries vs. calendar: "Configure a date property to display entries on the calendar" (`CollectionView.svelte:706`) vs "...display the calendar" (widget `collection-block-widget.ts:184`) vs "...display the linear calendar" (`CollectionView.svelte:720`, widget line 279). "entries" appears only in the main view copy.
- View vs. tab vs. table: "view" (`Delete view`, `Add view`, "This view"), "tab" used only in code comments, "Table" as type name.
- "Note" (column group label, `PropertiesPanel.svelte:94`; `FilterRow.svelte:135`) vs "File" (group label) vs "Formula" (group label). Note group includes plain frontmatter properties, so the label is a category choice, not a term from the app's data model.
- Default view name "Untitled" (`CollectionView.svelte:431`).
- Count formats: "(N)" after view name in widget header (`collection-block-widget.ts:139`), "N results" in main toolbar (`CollectionView.svelte:587`). No count in the main view header.

### Other user-visible strings
- "Parse Error" / "Filter error" / "Could not save the view" / "This view changed. Your edit was not saved." (toasts, `CollectionView.svelte:288, 294`).
- "No sorts applied" (`SortPanel.svelte:37`), "No properties available" (`PropertiesPanel.svelte:153`), "No views defined" (widget `:113`), "Building index..." (widget `:105`).
- "Add formula" heading "Formula" (`PropertiesPanel.svelte:113`), "Confirm formula" (`FormulaRow.svelte:51`), "Edit formula" (`:82`).
- Widget calendar pills show "+N" with no "more" (`collection-block-widget.ts:261`) while the Svelte calendar shows "+N more" (`CollectionCalendarView.svelte:163`). Different per-cell caps: widget `maxShow = 2` (line 249), Svelte `MAX_EVENTS_PER_CELL = 3` (`CollectionCalendarView.svelte:36`).
- Widget linear view caps lanes at 3 with a "+N" marker in the month label (`collection-block-widget.ts:65, 338-344`); Svelte linear view draws all lanes (`CollectionLinearCalendarView.svelte:186-215`, no cap).
- Week day names in full words in the dropdown (`CalendarConfigPanel.svelte:43`), while the calendar header uses `getWeekDayLabels` (short labels from calendar.logic, `CollectionCalendarView.svelte:117-124`). Check `calendar.logic.ts` for the abbreviation rule if needed.

## 7. Other notable facts (for the review)

- Filter count badge appears only inside the Filter panel (`FilterPanel.svelte:101-105, 163-167`); the toolbar Filter button shows `text-primary` only (`CollectionView.svelte:648`).
- The properties button never shows active state (`CollectionView.svelte:668`).
- Tab strip uses `overflow-x-auto` (`CollectionView.svelte:522`), so tabs can scroll horizontally with no visible scrollbar styling.
- Table body capped at 200 rows (`CollectionTableView.svelte:20`), "Show more" adds 200 (`:90`). Widget caps at 50 (`collection-block-widget.ts:55`). The two caps are unrelated numbers.
- `now` is captured once per component instance for calendar views (`CollectionCalendarView.svelte:38`, `CollectionLinearCalendarView.svelte:39`), so "today" highlight does not move across midnight without remount.
- Svelte files: `e.stopPropagation()` on click only at `PropertiesPanel.svelte:161-164` (the widget's `stopEditorMousedown` at `collection-block-widget.ts:480-485` is the other use).
- Duplicated class strings: the trigger class `flex h-7 ... rounded-md border border-input bg-background px-2 text-xs hover:bg-accent` appears in 7 places (`CalendarConfigPanel.svelte:53, 75, 101, 125`; `FilterRow.svelte:116, 158`; `SortPanel.svelte:101`; `PropertiesPanel` none). Input class `border-input bg-background ... h-7 ... rounded-md border px-2 text-xs outline-none focus-visible:border-ring` repeated in `FormulaRow.svelte:45, 70`, `FilterRow.svelte:99, 179`.
- Two `.svelte` calendars and the widget calendar duplicate the same grid logic in different markup (Svelte vs `document.createElement`), with different caps and copy (section 6).

## 8. Not checked

- Visual rendering, contrast ratios, real focus rings, dark/light appearance (no browser run).
- Whether `CollectionView` shares the `Popover` / `ContextMenu` bits-ui behaviour beyond the cited files (not read: `src/lib/components/ui/popover/index.ts` exports, `context-menu/*`).
- Whether `calendar.logic.ts` `getWeekDayLabels` returns short or long names (only the call site was read).
- `expression/evaluator.ts` error text beyond the grep hits.
- Tests under `src/tests/` for this feature.
- Usage of `CollectionView` by its parent (rail-shell / editor), beyond its props.
