# Lens review: Accessibility and keyboard (cross-app)

Scope: the whole app, through one lens. Inputs: inventory-*.md, review-*.md, screens/ (files-note-list-dark.png, rail-types-light.png, auto-organize-rule-builder-light.png read), and the code. Contrast ratios are computed with the app's own `contrastRatio`/`flatten` (src/lib/utils/color.ts) on the final built-in themes (`BUILTIN_THEMES`, theme.logic.ts:325, after `buildTheme`'s readability lift), alpha composited the way Tailwind's `/NN` modifier renders. "Default" = KokoBrain Default (dark), "Lavender" = Lavender Haze (light). Area reviews already list many local a11y items; this file groups them into app-wide patterns and adds the numbers and offenders they did not have.

What already works and should be the template: Tasks has a tested roving-tabindex list (tasks-keys.logic.ts:30-66, TasksView.svelte:802-890); EventColorSwatches is a correct radiogroup (EventColorSwatches.svelte:26-49); the event-calendar files use a solid focus ring (6 sites); every hover-revealed action also reveals on focus (6 of 6 `opacity-0 group-hover:opacity-100` sites carry `group-focus-within`); mouse-only cells are documented with a keyboard path (EventMonthGrid.svelte:90, EventAllDayLane.svelte:67).

## Clear

### 1. Lists have no keyboard model except Tasks; every row is its own Tab stop (interaction, L)
- Zero `role="tree"`, `treeitem`, `listbox`, `option`, `grid` or `aria-activedescendant` in src. Arrow-key handling exists in 5 components, none of them a navigation list except Kanban.
- Offenders (rows are plain buttons, Tab walks each one, no arrows, no type-ahead): note list (NoteRow.svelte:67-72, RailNoteList.svelte), Files tree (FilesNavigator.svelte:296, 482; expand/collapse only by clicking the chevron), Types views (TypesNavigator.svelte:254, 281, 410), search results (SearchPanel.svelte:125-145, SearchResult.svelte:137), backlinks and outgoing rows (LinkItem.svelte, BacklinksPanel.svelte), Tags tree (TagItem.svelte:30), Table of contents (TableOfContentsPanel.svelte), File History list (SnapshotList.svelte:49-58), editor tabs (EditorTabs.svelte:51-62, every tab `tabindex="0"`, Enter/Space only), rail mini calendar (CalendarGrid.svelte:30-75, 48 buttons), collection table rows and headers (CollectionTableView.svelte:44, 55, mouse-only `onclick` on `th`/`tr`).
- Kanban has a second, different model: arrow keys move an index in the store and paint `ring-2 ring-primary` (KanbanCard.svelte:157), but DOM focus never moves, nothing scrolls into view, and the card menu has no "Move to lane" (KanbanCard.svelte:225-262), so moving a card between lanes needs drag.
- Proposal: lift `resolveTaskKey` into a generic `roving-list.logic.ts` plus one Svelte action (`use:rovingList`): one Tab stop per list, Up/Down/Home/End, Enter opens, Cmd+Enter opens in a new tab, F2 renames, Shift+F10 opens the row menu, type-ahead on the title, and the "current row after the list changed" rule Tasks already has. Trees (Files, Tags, TOC) add Left/Right to collapse/expand with `role="tree"`/`treeitem` and `aria-expanded`. Kanban moves to real DOM focus on cards (focus-visible ring) and gains "Move to lane" in the card menu plus Cmd+Left/Right. Migrate in order of daily use: note list, Files tree, search results, backlinks, tabs, kanban.
- Risk to check at runtime (from memory, not verified here): in WebKit on macOS (the Tauri webview), Tab skips `<button>` elements unless the macOS "Keyboard navigation" setting is on, while elements with an explicit `tabindex` are reachable. If that holds, most of the rows above are not reachable by Tab at all on a default Mac, and a roving `tabindex="0"` stop fixes it as a side effect. Playwright E2E runs Chromium, so it cannot catch this.

### 2. The house focus ring is drawn at half strength and fails 3:1 (accessibility, S)
- Global `* { outline-ring/50 }` (app.css:486); Button, Input, Select and Switch use `focus-visible:ring-ring/50` (button.svelte:7, input.svelte:44, select-trigger.svelte, switch.svelte); the destructive button uses `ring-destructive/20` (dark `/40`) (button.svelte:12). Feature code copies it: 27 of the 37 non-primitive `focus-visible:ring-*` uses are `ring-ring/50` (SettingsPanel.svelte:137; EditorView.svelte:98, 112, 125, 139; ModDialogHost.svelte:151; TasksView.svelte:719, 739, 812, 822, 890, 1154; TaskLists.svelte:191, 209, 235; EventForm.svelte:171; NoteRow.svelte:70; RailNoteList.svelte:738, 799, 811; RailArchivedMenu.svelte:34; FilesNavigator.svelte:296; TypesNavigator.svelte:224, 254, 281, 410; Rail.svelte:359).
- Computed (WCAG 1.4.11 / 2.4.13 want 3:1): ring/50 is 2.52 on the editor, 2.59 on the list, 2.35 on popovers (Default); 2.21, 2.18, 2.31 (Lavender). On the selected note row it is 2.04 and 1.89. Destructive ring/20 is 1.18 to 1.33. The full ring color passes everywhere: 4.88 to 6.82.
- Bordered controls survive because the border also turns `border-ring` (the "if missing" select in auto-organize-rule-builder-light.png is clearly focused). Borderless targets do not: ghost icon buttons, rail items, note rows, tabs, tree rows; those are exactly the ones keyboard users walk.
- Second inconsistency: 7 places use `focus:` instead of `focus-visible:`, so the ring also appears on mouse click (GraphControls.svelte:81, 101, 114; SearchPanel.svelte:161; TasksView.svelte:921; KanbanView.svelte:501; KanbanLane.svelte:366; PropertiesView.svelte:227; dialog-content.svelte close button, visible in file-history-light.png). 22 inputs set `outline-none` with no focus-visible replacement, several with no focus cue at all (KanbanView.svelte:489, KanbanCard.svelte:187, PropertyField.svelte:114, 191).
- Proposal: one `--focus-ring` token (the ring color at 100%) and a `focus-ring` utility: 2px solid ring with 2px offset on borderless targets, 2px inset on rows; a base `:focus-visible` rule so the 170 raw buttons without a class get it; replace `ring-ring/50`, `ring-destructive/20` and the `focus:` variants. The event-calendar files (EventTaskChip.svelte:27, EventMonthGrid.svelte:145 and 4 more) already use the solid ring. Extends foundation #8 with the measured failure and the full offender list.

### 3. Selected, faded and dimmed rows drop text under 4.5:1 although the theme builder enforces it on flat surfaces (color-theming, M)
- `READABILITY_PAIRS` (theme-builder.logic.ts:105-155) checks muted text on editor, background, card, popover and the panel backgrounds only. It never checks text on the selected or hover tint, and nothing checks Tailwind opacity modifiers.
- Selected note row, the row the owner looks at all day (NoteRow.svelte:70 `bg-primary/25`): 11px subtitle in `text-muted-foreground` (:93) 3.42 (Default) / 3.71 (Lavender); title in `text-primary` (:89) 3.70 / 4.01. Type and property chips `text-primary/80` on `bg-primary/10` at 11px (:103, 114, 124) 3.77 / 3.45 on any row.
- Selected tree rows: `file-explorer-muted-fg` on `file-explorer-accent` 4.60 / 3.97; right sidebar muted on its accent 4.95 / 3.97; Settings nav muted on `settings-hover-bg` 4.05 in both themes.
- Archived rows are `opacity-60` as a whole (NoteRow.svelte:70): subtitle 2.92 / 2.45, title 5.85 / 3.70.
- 20 sites draw text or meaningful icons with muted at 30 to 60%: 1.75 to 2.92. TasksView.svelte:921 and KanbanLane.svelte:366, KanbanView.svelte:501 (placeholders /50), PropertyField.svelte:191 (placeholder /30), CollectionView.svelte:587 ("N results" /60), CollectionTableView.svelte:63 (empty cell /50), CollectionCalendarView.svelte:144 and CalendarGrid.svelte:58 (out-of-month days /40), KanbanDatePicker.svelte:67, 79, 130, PropertiesPanel.svelte:134, 141, FormulaRow.svelte:81, 87, SortPanel.svelte:90 (icon buttons /50), QuickSwitcher.svelte:81 (archived icon /50), PropertiesView.svelte:224, routes/(app)/+page.svelte:48, 57.
- Proposal: (a) selected row uses `accent` with `foreground` text, or add composite pairs (muted on accent, primary on primary/25 over the list) to READABILITY_PAIRS so the final pass lifts them; (b) add a `faint` token computed at 3:1 for placeholders and out-of-month days, and forbid `text-*muted*/NN` and `text-primary/NN` in a lint test beside text-roles.ts; (c) archived rows get the archive icon plus muted title, not whole-row opacity.

## Moderate

### 4. Form controls are labelled by a neighbouring span, not a label (accessibility, M)
- Heuristic scan of 126 inputs, switches, selects and textareas outside components/ui: about 80 have no `aria-label`, `aria-labelledby`, `id` or wrapping `<label>`. Concentrated in PeriodicNotesSection.svelte (12), TodoistSection.svelte (8), AutoOrganizeRuleRow.svelte (5), HeadingTypographyEditor.svelte (4), EventCalendarSection.svelte (4), TroubleshootingSection.svelte (3), GraphControls.svelte (3), AutoOrganizeRuleProperty.svelte (3), and 2 each in Sentry, Update, Kanban view and lane, FormulaRow, FilterRow, CanvasLinkInput, LinkNode, PropertyField.
- Root: SettingItem.svelte:25-27 renders the label and description as `<span>`s next to a children snippet, so 19 settings sections inherit it. Besides screen readers, it costs mouse users: clicking "Auto-check on launch" does nothing, only the 32px switch track toggles.
- Proposal: SettingItem generates an id, renders `<label for>` for the name and `aria-describedby` for the description, and passes the id to the snippet. Apply the same to auto-organize and properties rows. Covers settings #2 at the root.

### 5. Six color pickers, one accessible (accessibility, S)
- Correct: EventColorSwatches.svelte:26-49 (`radiogroup`, `aria-checked`, roving tabindex, arrows).
- Title-only swatches with selection shown by a ring: canvas ColorPicker.svelte:19-34, TagColorPicker.svelte:37-63, IconPicker.svelte:260-308, KanbanCardText.svelte:57 (tag color), KanbanCard.svelte:243-250. The kanban card swatches are raw buttons inside `ContextMenu.SubContent`, so the menu's arrow keys skip them.
- Proposal: promote EventColorSwatches to `components/ui/color-swatches` with human color names and use it in all six; inside menus render the colors as `menuitemradio` items.

### 6. Two overlay models: primitives trap focus, hand-built ones do not (interaction, M)
- 14 files use bits-ui Dialog/Command/Popover (focus moves in, is trapped, returns, Escape closes).
- Hand-built: SettingsPanel.svelte:105-120 (`role="dialog"`, no `aria-modal`, focus stays in the editor, window-level Escape closes even with a nested popover open), CanvasFilePicker.svelte:50 and CanvasLinkInput.svelte:50 (backdrop div, no trap), CanvasContextMenu.svelte:88-95 (no menu role, no focus, closes on pointerdown only), TagColorPicker.svelte:37.
- Proposal: route all of them through the primitives (Settings as a non-modal Sheet that still moves focus in and restores it; canvas menus on ContextMenu with a virtual anchor). Groups settings #3, canvas #5 and #7.

### 7. Calendar grids: five implementations, only the date picker has grid semantics (accessibility, M)
- bits-ui Calendar in KanbanDatePicker.svelte is the only one with `grid` roles and arrow keys.
- Rail mini month (CalendarGrid.svelte:30-75): 42 day buttons plus 6 week buttons, each a Tab stop, named only "10"; "has notes" dots are color only; today is `ring-1 ring-file-explorer-primary` (:59), which looks like a focus ring; out-of-month days at /40 (1.75:1). CollectionCalendarView.svelte:144 and CollectionLinearCalendarView.svelte: no roles, no keys. EventMonthGrid.svelte has labelled day buttons with `aria-pressed` but no arrow movement.
- Proposal: a shared roving-grid helper (arrows move a day, PageUp/PageDown a month, Home/End the week, Enter opens the daily note), full-date `aria-label` with "N notes", today marked by a filled day number instead of a ring.

### 8. Interactive controls nested inside interactive controls (consistency, S)
- 14 collection toolbar triggers wrap a `Button`/`button` without the `child` snippet, producing button-in-button: CollectionView.svelte:594, 621, 644, 667; CalendarConfigPanel.svelte:51, 73, 99, 123; FilterRow.svelte:114, 156; FilterPanel.svelte:112, 174; SortPanel.svelte:99, 144.
- Rows with actions inside: AppearanceSection.svelte:172 (`role="button"` row, Enter on Edit also selects the theme, foundation #9), EditorTabs.svelte:51-85 (close button inside `role="tab"`), NoteRow.svelte:113 (`role="link"` pill inside the row button, `tabindex="-1"`), SnapshotList.svelte:49-58 (`role="button"` span inside a button, `svelte-ignore node_invalid_placement_ssr`).
- Effect: two Tab stops per control, Enter firing both handlers, the UA ring on the outer element.
- Proposal: one rule, enforced by a source-scan test: Triggers use `{#snippet child({ props })}`; row actions are siblings of the row button, not children.

## Polish

### 9. Reduced motion is honored in one place (motion, S)
- `prefers-reduced-motion` appears only in EventCalendarView.svelte:284. Unhandled: Settings fly-in 200 ms (SettingsPanel.svelte:117), `animate-in` in 9 primitives, 13 `animate-spin` in 11 files, smooth scroll in PropertiesPanel.svelte:69.
- Proposal: one `@media (prefers-reduced-motion: reduce)` block in `@layer base` plus `motion-reduce:animate-none` on spinners (foundation #8).

### 10. Async status is silent to assistive tech (feedback-states, S)
- Two `role="status"` in the app (SentrySection.svelte:88, TasksView.svelte:911). Search count and "Searching...", save status, indexing, "Copy block link", mod run progress and Todoist sync change text with no live region.
- Proposal: one visually hidden polite live region in the shell and a `announce(text)` helper, called from those sites. Low value for a sighted sole user; do it alongside the shared InlineStatus component (foundation #5).

## Not verified
- No runtime check in the Tauri webview; the WebKit Tab behavior in #1 is from memory.
- Contrast for themes other than the two built-ins was not computed; the list background in Lavender is approximated with an sRGB mix of the panel and editor backgrounds (the app mixes in oklch), which moves the ratios by a few hundredths at most.
