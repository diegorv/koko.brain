# Inventory: design tokens, theming, UI primitives

Read-only fact sheet. Paths are relative to the repo root. Line numbers come from `cat -n` / `grep -n` on the working tree at the time of the scan. Counts from grep are per-line, not per-element, unless noted. Search roots: `src/` excluding `src/tests` and `generated/`.

Method notes:
- Greps run with `--exclude-dir=tests --exclude-dir=generated`. Counts for `<button` are raw text matches.
- The icon-only button check (section 5) reads a 6-line window after each `size="icon*"`; items marked "confirmed" were read in full, the rest are heuristic.
- Not read by this scout: `docs/FEATURES.md`, `docs/INSPIRATIONS.md`, `docs/adr/0033-*`. The codemap was not queried; discovery used direct grep under `src/`.

---

## 1. Inventory

### 1.1 Global stylesheet and config

- `src/app.css`: 500 lines. Imports at 1-3 (`tailwindcss`, `tw-animate-css`, `katex`). `@source not "../.scratch"` at 6. `@custom-variant dark` at 9 keys `dark:` to `html.dark`, not the OS scheme.
  - `@theme inline` color bridge at 11-70 (`--color-*` mapped to CSS vars). Type scale roles at 77-102 (`--text-label` 11px, `--text-meta` 12px, `--text-rail` 13px, `--text-row` 14px, `--text-title` 15px/600).
  - `@theme static` radius ladder 110-115 (`--radius-xs..xl` derived from `--radius`). Shadow tokens 125-129 (`--shadow-xs..xl`, read `--elev-*`).
  - `@utility section-label` at 140-142; `@utility pane-toolbar` at 151-153.
  - `:root` light tokens 155-213 (oklch for most shell colors; hex for `--file-explorer-badge-fg` at 182, `--type-*` at 194-202, `--elev-*` at 205-209; `--radius: 0.625rem` at 210; `--status-bar-height` 212).
  - `.dark` tokens 215-377 (shell at 216-244, component 245-266, type hues 268-276, syntax 285-300, live preview 303-336, wikilink 338-343, callouts 352-360).
  - `:root,.column-tones` and `.dark,.column-tones-dark` column tones 380-392.
  - `:root` event colors 402-413 (hard-coded hex `#10b981`, `#8b5cf6`, `#06b6d4`, `#f97316`, `#ec4899`, `#3b82f6`, mixed with `--editor-bg`/`--editor-fg`).
  - `:root` code-block / meta-bind vars 424-471.
  - `input[type="date"]` forced color with `!important` 473-482.
  - `@layer base` 484-500 (`*` border and outline, `body` font stack `-apple-system...`, `overflow: hidden`, `user-select: none`).
- `src/lib/features/canvas/canvas-markdown.css`: 173 lines. Scoped under `.canvas-node-content`. Heading vars with fallbacks (`var(--heading-h1-font-size, 2.058em)` etc.), `color: var(--syntax-heading1..6)`. No `transition`, `animation`, or `@media`.
- Only other stylesheet imports: `@xyflow/svelte/dist/style.css` and `./canvas-markdown.css` in `src/lib/features/canvas/CanvasInner.svelte:15-16`; `../app.css` in `src/routes/+layout.svelte:2`.
- No `tailwind.config.*` file in the repo root (checked). Tailwind is v4 via `@tailwindcss/vite` (`vite.config.js:9`, `:89`). `package.json`: `tailwindcss ^4.3.5`, `@tailwindcss/vite ^4.3.5`, `tw-animate-css 1.4.0`, `bits-ui ^2.20.6`, `paneforge ^1.0.2`, `tailwind-variants ^3.3.1`, `tailwind-merge ^3.7.0`, `clsx ^2.1.1`, `svelte-sonner ^1.2.3`, `@lucide/svelte ^1.70.0`.
- `components.json`: `style: "vega"`, `tailwind.css: src/app.css`, `baseColor: zinc`, aliases `#lib/components`, `#lib/utils`, `#lib/components/ui`, `#lib/hooks`, `#lib/utils` for `lib`.
- `cn()` is `twMerge(clsx(...))` at `src/lib/utils.ts:10-12`.
- `src/lib/utils/text-roles.ts:4`: `TEXT_ROLES = ['label','meta','rail','row','title']`. Its comment says a test keeps it in sync with `app.css`.

### 1.2 Theme application (ADR-0035 area)

- `src/lib/core/settings/theme.service.ts` (87 lines):
  - `setRootVars` 13-17: `document.documentElement.style.setProperty` per var.
  - `applyMode` 27-35: `classList.toggle('dark')` from `isDarkColor(--editor-bg)`, sets inline `style.colorScheme`, calls `appliedThemeStore.setDark` and `bumpRevision`.
  - `applyTheme` 40-44 (used by the theme editor for live draft preview; does not mirror to localStorage).
  - `applyStoredTheme` 49-62 (reads `kokobrain:theme-vars` from localStorage, for the Quick Capture composer window).
  - `applyActiveTheme` 69-84 (reads settings store, applies, writes `kokobrain:theme-vars` at 77-84; write failure is `console.error` at 81).
- `src/lib/core/settings/theme.logic.ts` (409 lines): `themeColorsToCssVars` 60-75 maps groups to `--prefix-kebab` names and adds `elevationVars` when `editorBg` is present. 168 raw hex lines in this file (built-in palettes; expected location).
- `src/lib/core/settings/theme-package.logic.ts` (404), `theme-validation.logic.ts` (76, `isThemeColorValue` grammar), `theme-catalog.service.ts` (45, fetch), `theme-builder.logic.ts` (318), `theme-editor.logic.ts` (303), `theme.types.ts` (251), `applied-theme.store.svelte.ts`.
- `src/lib/plugins/mods/mod-theme.svelte.ts:16` maps `cardForeground` to `--card-foreground` (see 4.7).
- ADR-0035 (`docs/adr/0035-remote-theme-catalog.md`, status active, 2026-11-03): built-ins are `KokoBrain Default` and `Lavender Haze`. Everything else comes from `diegorv/koko.brain-themes` `index.json`, installed as source packages (`schemaVersion: 1`), validated by `isThemeColorValue`, index capped at 512 KiB, HTTP permission scoped to `raw.githubusercontent.com/diegorv/koko.brain-themes/**`, update is manual and no downgrade, cache about 5 minutes (ADR Consequences).

### 1.3 Theme settings components (outside components/ui)

| Path | Lines | UI rendered | Primitives used | Custom markup |
|---|---|---|---|---|
| `src/lib/core/settings/sections/AppearanceSection.svelte` | 306 | Theme list (row per theme with preview, name, Active badge, hover actions), "Create new theme" button, online catalog section | `Button` (ui) | Row is `div role="button" tabindex="0"` (172-178); section title `h2 text-lg` (149) |
| `src/lib/core/settings/sections/ThemeEditor.svelte` | 202 | Header (back, name input, Cancel, Save), Export/Import, five group tabs, color rows grouped by subgroup | `Button`, `Input` (ui) | Group tabs are raw `<button>` (176-183), hidden file input (164-170) |
| `src/lib/core/settings/sections/ThemeColorRow.svelte` | 73 | One token row: label, color swatch (native `input type=color` inside `label`), hex text field | `Input` (ui) | Swatch `label` with inline `background-color` (52-54), native color input `opacity-0` (55-60) |
| `src/lib/core/settings/sections/ThemePreview.svelte` | 53 | Miniature app preview (tab bar, rail, list, editor) drawn with inline styles | none | Entire preview is inline-styled `div`/`span` (18-51), see 6.3 |
| `src/lib/core/settings/sections/HeadingTypographyEditor.svelte` | 118 | Six `details` blocks, each with font size, line height, weight select, letter spacing | `Input`, `Select` (ui), `SettingItem` (local) | `details`/`summary` (52-58) |

Other settings sections that use the same heading pattern (`h2 text-lg font-semibold` + `h3 section-label`): see section 7.

### 1.4 components/ui (shadcn-svelte generated, customized)

82 `.svelte` files and 14 `index.ts` barrels. Per-file line counts are in Appendix A (end of this file). Summary by folder:

- `button/button.svelte` (82): `tv()` variants `default|destructive|outline|secondary|ghost|link`, sizes `default|sm|lg|icon|icon-sm|icon-lg`. Pure markup (no bits-ui). Renders `<a>` when `href` is set.
- `input/input.svelte` (52): two branches, file and text. No bits-ui.
- `switch/switch.svelte` (29): bits-ui `Switch`.
- `dialog/*` (10 files): bits-ui `Dialog`. `dialog-content.svelte` (45) has overlay, close button (`showCloseButton`), `rounded-xl p-6 shadow-xl`.
- `dropdown-menu/*` (17 files) and `context-menu/*` (16 files): bits-ui. `context-menu-content.svelte` (45) has the `absorbWhileClosing` guard (17-28).
- `select/*` (11 files): bits-ui Select. Trigger 29, content 45, item 38.
- `popover/popover-content.svelte` (24): bits-ui.
- `tooltip/*` (5 files): bits-ui. Content 52.
- `command/*` (11 files): bits-ui Command (palette). `command-dialog.svelte` (40) hard-codes arbitrary child selectors in its `class` (33).
- `collapsible/*` (3): bits-ui.
- `scroll-area/*` (2): bits-ui ScrollArea. Scrollbar thumb `bg-muted-foreground/30`.
- `resizable/*` (2): paneforge `PaneResizer`. Handle has a `<style>` block (40-50) with a hard-coded `2.5rem` gradient stop.
- `separator/separator.svelte` (21): bits-ui.

Primitive import counts across `src/lib` (svelte files importing from `components/ui/`): 82 files total. Per module: button 35, input 28, switch 18, dialog 10, popover 9, dropdown-menu 9, context-menu 9, scroll-area 8, select 7, command 7, separator 6, collapsible 4, tooltip 3, resizable 1.

Raw element use: 75 `.svelte` files contain a raw `<button`. 34 files import `Button`.

### 1.5 Other `.svelte` files with scoped `<style>` blocks (in the styling audit scope)

`EditorTabs.svelte` (119, 13 rules), `StatusBar.svelte` (34), `TableOfContentsPanel.svelte` (82), `WordCount.svelte` (46), `ImageNode.svelte` (102), `EventCalendarView.svelte` (290, keyframes and reduced-motion; see 6.4), `GroupNode.svelte` (45), `CanvasLinkInput.svelte` (163), `CanvasEdge.svelte` (75), `CanvasContextMenu.svelte` (234), `CanvasFilePicker.svelte` (152), `TextNode.svelte` (131), `FileNode.svelte` (188), `CanvasInner.svelte` (817, 176 lines of CSS), `LinkNode.svelte` (216), `CanvasToolbar.svelte` (78), `ColorPicker.svelte` (72), `TagColorPicker.svelte` (110), `resizable-handle.svelte` (50), `composer/+page.svelte` (318).

---

## 2. Empty states

### 2.1 Empty states that render (text)

Command palette style (`Command.Empty`, text with trailing period):
- `src/lib/core/settings/sections/EditorSection.svelte:66` "No fonts found."
- `src/lib/plugins/mods/ModDialogHost.svelte:194` "No items found."
- `src/lib/plugins/mods/ModActionPicker.svelte:168` "No actions."
- `src/lib/plugins/templates/TemplatePicker.svelte:107` "No templates found."; `:109` "No templates available. Add .md files to _templates/ folder."
- `src/lib/plugins/one-on-one/OneOnOnePicker.svelte:90` "No people found."; `:92` "No people available. Add .md files to the people folders."
- `src/lib/features/quick-switcher/QuickSwitcher.svelte:108` "No files found."
- `src/lib/features/command-palette/CommandPalette.svelte:69` "No commands found."

Panels and lists (`<p>`/`<div>`, no trailing period):
- `src/lib/features/tags/TagsView.svelte:82` "No tags found"
- `src/lib/features/search/SearchPanel.svelte:120` "No results found"
- `src/lib/features/backlinks/BacklinksPanel.svelte:62` "No backlinks found"
- `src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:56` "No outgoing links"
- `src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:50` "No headings found"
- `src/lib/features/properties/PropertiesView.svelte:158` "No file open"
- `src/lib/features/properties/RelationshipSearch.svelte:89` "No files found"
- `src/lib/features/collection/toolbar/PropertiesPanel.svelte:153` "No properties available"
- `src/lib/features/canvas/CanvasFilePicker.svelte:67` "No files found" (class `picker-empty`)
- `src/lib/features/canvas/FileNode.svelte:85` "Empty file" (class `empty-state`)
- `src/lib/plugins/kanban/KanbanListView.svelte:55` "No cards"
- `src/lib/features/rail-shell/RailNoteList.svelte:852` "Nothing here" (group empty, `data-note-list-group-empty`)
- `src/lib/features/rail-shell/TypesNavigator.svelte:275` "No types yet"
- `src/lib/features/rail-shell/RailPropertiesPicker.svelte:172` "No matching properties"
- `src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:30` "No sync log entries yet." and `:47` "No entries match this filter."
- `src/lib/plugins/mods/ModsStatusList.svelte:88` "No mods in _system/mods/"
- `src/lib/core/settings/sections/UpdateSection.svelte:357` "No app changes since {changelog.since}"
- Disabled menu placeholders: `src/lib/features/tasks/TasksView.svelte:671` "No tags in these tasks", `:953` "No properties in these tasks"; `src/lib/features/tasks/SourcesPanel.svelte:270` "No suggestions"
- `src/lib/features/tasks/SourcesPanel.svelte:464` "No clause: this card matches every note."

Empty-state wording does not show in the theme area: `AppearanceSection` has no empty state for the installed list (built-ins always exist). Catalog empty: `AppearanceSection.svelte:301` "The theme catalog is empty."

### 2.2 Panels with no empty state visible in the scanned code

- `src/lib/core/settings/sections/AppearanceSection.svelte` installed list: no branch for zero themes (built-ins guarantee at least one).
- Canvas and graph-view empty states: not checked.
- `src/lib/features/tags/TagsView.svelte:52` `{#if !tagsStore.isLoading}` shows the list and `:79-80` shows "Indexing tags..." while loading; the empty text at `:82` is in the same branch family (not read in full).

---

## 3. Loading states

### 3.1 Loading text that renders

- `src/lib/core/settings/sections/TrashSection.svelte:81` "Loading..." (`{#if` at 80)
- `src/lib/core/settings/sections/AppearanceSection.svelte:259` "Loading the theme catalog..." (catalog `loading` status, 258)
- `src/lib/features/tasks/TasksView.svelte:910` `{#if tasksStore.hasLoaded && tasksStore.isLoading}`; `:1080` "Indexing tasks..."; `:610` button `disabled={tasksStore.isLoading}`
- `src/lib/features/event-calendar/EventCalendarView.svelte:241` "Indexing vault..."
- `src/lib/features/tags/TagsView.svelte:80` "Indexing tags..."
- `src/lib/features/search/SearchStatus.svelte:9-12` "Indexing..." and `:14` semantic indexing branch
- `src/lib/features/file-icons/IconPicker.svelte:204-206` "Loading icons..."
- `src/lib/features/file-history/SnapshotList.svelte:22-24` "Loading history..."
- `src/lib/features/file-history/DiffViewer.svelte:30-32` "Loading diff..."
- `src/lib/features/rail-shell/RailNoteList.svelte:864` "Loading..." (view first read in flight, see comments 187-192)
- `src/lib/features/rail-shell/RailListSearch.svelte` takes a `loading` prop (`RailNoteList.svelte:823`); spinner or text not read in full.
- `src/lib/features/backlinks/BacklinksPanel.svelte:60` "Indexing vault..."
- `src/lib/features/todoist-sync/TodoistSection.svelte:130` button label "Loading..." vs "Load projects"; `:149` `{#if`.
- Spinner: `animate-spin` used in 11 places, incl. `src/lib/features/todoist-sync/TodoistSyncStatus.svelte:27` (`RefreshCw` while `isSyncing`).
- Skeleton components: none found (grep for `skeleton`/`shimmer` not run to exhaustion; no matches in the scan of `src/lib`).

### 3.2 Loading with no visible state (observed in code, not exhaustive)

- `src/lib/features/event-calendar/EventCalendarView.svelte:159` and `:171`: `isLoading` is read for reactivity only; the "Indexing vault..." text is at `:241`.
- `src/lib/features/collection/CollectionView.svelte:687` `{#if` (loading branch not read in full).

---

## 4. Error states

### 4.1 Error states that render

- `src/lib/core/settings/sections/AppearanceSection.svelte:260-268`: catalog error panel `data-testid="theme-catalog-error"`, text "Could not load the theme catalog. Your installed and built-in themes still work." (263), "Retry" button (265).
- `src/lib/core/settings/sections/AppearanceSection.svelte:52`: `toast.error("Could not load the theme catalog: ...")`. Also `:63`, `:72` (install/update errors via toast).
- `src/lib/core/settings/sections/ThemeEditor.svelte:144-146`: `nameError` shown under the name input (`text-meta text-destructive`). Also used for import parse errors (`:107-109`).
- `src/lib/features/collection/CollectionView.svelte:505` "Parse Error" label (`text-destructive`, title case).
- `src/lib/features/collection/toolbar/FormulaRow.svelte:61` and `:72` (error text); `FilterRow.svelte:105-106` (`role`-less `p` with `id="filter-error-..."`, `aria-describedby` wired at `:98`).
- `src/lib/features/event-calendar/EventForm.svelte:73`, `:96`, `:143`, `:179` error branches.
- `src/lib/features/search/SearchSection.svelte:112`, `:121`, `:146`, `:155` error branches (download and index).
- `src/lib/plugins/mods/ModsStatusList.svelte:112-126` (four branches).
- `src/lib/features/file-history/SnapshotList.svelte` and `DiffViewer.svelte`: no error branch found in the grep (loading only).
- Toast usage across the app: `toast.error` 104, `toast.info` 7, `toast.success` 6, `toast.warning` 2 (grep counts).

### 4.2 Error handling without a visible UI state

- `src/lib/core/settings/theme.service.ts:81`: localStorage mirror failure is `console.error` only. This is the intended "main window already themed" path (comment at 80).
- `src/lib/core/settings/sections/ThemeEditor.svelte:107-110`: parse failure sets `nameError` (the name field's error slot) for a JSON import problem. Acceptable location, but the error is shown in the header, not near the Import button.
- `console.error` in components (grep, not all read): `src/lib/core/settings/sections/SentrySection.svelte:22,38`, `src/lib/plugins/calendar/CalendarNavigator.svelte:70,81`, `src/lib/plugins/templates/TemplatePicker.svelte:43`, `src/lib/plugins/one-on-one/OneOnOnePicker.svelte:47`, `src/lib/features/command-palette/CommandPalette.svelte:34`, `src/routes/(app)/+layout.svelte:82,130`, `src/routes/composer/+page.svelte:97,123,219,229`.

### 4.3 Disabled states

- Primitives carry disabled styling: `button.svelte:7` (`disabled:pointer-events-none disabled:opacity-50 aria-disabled:...`), `input.svelte:28,43` (`disabled:cursor-not-allowed disabled:opacity-50`), `switch.svelte:18` (`disabled:cursor-not-allowed disabled:opacity-50`), `select-trigger.svelte:22`, `dropdown-menu-item.svelte:23` and `context-menu-item.svelte:23` (`data-[disabled]:opacity-50`), `command-item.svelte:16`, `select-item.svelte:21`.
- Raw `<button>`s: no disabled style in the theme tabs (`ThemeEditor.svelte:176-183`); `AppearanceSection.svelte` row actions have no disabled branch.
- Disabled icon button in use: `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:302` `disabled={isFirst}` (relies on `Button` base).
- Disabled-but-invisible: none verified; `disabled` on `Button` disables the `<a>` path via `aria-disabled` only (`button.svelte:63-66`).

### 4.4 Invalid-value states

- `ThemeColorRow.svelte:63-71`: hex field has no `aria-invalid`; invalid hex reverts on blur (`:28-38`) with no message.
- `HeadingTypographyEditor.svelte:61-70`, `:74-83`, `:104-113`: number inputs. `oninput` (`:68`, `:81`, `:111`) writes `Number(value)` without clamp or NaN guard. Clamp happens only in `onchange`. No visible invalid state.

---

## 5. Interaction

### 5.1 Keyboard handling

- Keydown handlers: 36 svelte files with `onkeydown` (grep). Examples: `src/lib/app/SettingsPanel.svelte:106` (Escape), `src/lib/plugins/kanban/KanbanCard.svelte:73`, `src/lib/features/tasks/TaskLists.svelte:147`, `src/lib/features/collection/CollectionView.svelte:490`, `src/lib/features/note-list/NoteRowMenu.svelte:156`, `src/lib/features/search/SearchPanel.svelte:37`, `src/lib/features/rail-shell/FilesNavigator.svelte:187`, `src/lib/features/rail-shell/RailListSearch.svelte:80`.
- `AppearanceSection.svelte:172-178`: row is `div role="button" tabindex="0"` with `onkeydown` for Enter and Space calling `selectTheme`. The nested Edit, Duplicate, Uninstall, and Delete buttons (`:192-239`) have their own `onclick` with `event.stopPropagation()` (`:82`, `:93`, `:112`, `:119`), but the row's `onkeydown` has no `stopPropagation`. A keydown on a nested button bubbles to the row. Not verified at runtime.
- `ThemeColorRow.svelte:40-44`: Enter blurs the hex field (commit). No Escape handling.
- `ThemeEditor.svelte`: no Escape handler (0 matches). Cancel is only by button (`:133`, `:149`).
- `AppearanceSection.svelte`: no Escape handler (0 matches) in the theme editor flow.
- Dialog keyboard close: `dialog-content.svelte:37-42` close button only. Escape closing comes from bits-ui (not verified).
- Command palette: `command-dialog.svelte:26-38` wraps bits-ui Command.
- Tabs keyboard: `EditorTabs.svelte:57` `role="tab"`; `EventCalendarHeader.svelte:101-111` `role="tablist"` / `role="tab"`.

### 5.2 Focus management

- `autofocus` / `.focus()` appears in 57 lines across `src/lib` (grep). Two `svelte-ignore a11y_autofocus` comments exist.
- `ThemeEditor.svelte`: no focus call. Name input is not focused on open.
- `AppearanceSection.svelte`: no focus call on Edit/Duplicate.
- Focus ring on primitives: `button.svelte:7` (`focus-visible:ring-[3px] focus-visible:ring-ring/50`), `input.svelte:44`, `switch.svelte:18`, `select-trigger.svelte:22`, `resizable-handle.svelte:24` (`focus-visible:ring-1`), `scroll-area.svelte:32` (`focus-visible:ring-4`).
- Raw elements: no focus-visible class on `AppearanceSection.svelte:172-178` (row), `ThemeEditor.svelte:176-183` (tabs), `ThemeColorRow.svelte:55-60` (hidden color input). The only raw-element focus class found in the scanned set is `FilterRow.svelte:99` (`focus-visible:border-ri...`).
- Global base outline: `app.css:486-488` `* { outline-ring/50 }` (outline color only, no width).

### 5.3 Hover-only affordances (actions hidden until hover)

- `src/lib/core/settings/sections/AppearanceSection.svelte:190`: row actions `opacity-0 group-hover:opacity-100 group-focus-within:opacity-100`. Visible on focus within.
- `src/lib/core/markdown-editor/EditorTabs.svelte:87`: tab close button `opacity-0 group-hover:opacity-100 group-focus-within:opacity-100`.
- `src/lib/plugins/kanban/KanbanCard.svelte:218`, `KanbanLane.svelte:236`, `:356`, `:391`.
- `src/lib/features/tasks/TasksView.svelte:734`; `TaskLists.svelte:209`.
- `src/lib/features/properties/PropertiesView.svelte:279`; `PropertyField.svelte:148`, `:159`, `:176`.
- `src/routes/(app)/+page.svelte:57`.
- `src/lib/components/ui/resizable/resizable-handle.svelte:31`: grip shows on `group-hover` / `group-active` only.
- Keyboard reachability: `group-focus-within` appears on the matched lines of `AppearanceSection.svelte:190`, `EditorTabs.svelte:87`, `PropertiesView.svelte:279`, `PropertyField.svelte` (3 lines), `TaskLists.svelte:209`, `TasksView.svelte:734`, `routes/(app)/+page.svelte:57`. Kanban hits (`KanbanCard.svelte:218`, `KanbanLane.svelte:236/356/391`) and `resizable-handle.svelte:31` do not (on those lines). Full reachability not traced.

### 5.4 Drag and drop

- Kanban: `KanbanView.svelte:517-518`, `KanbanCard.svelte:160-162`, `KanbanLane.svelte:237-239`, `:320-321`.
- Notes and lists: `note-list/NoteRow.svelte:38`, `:41`, `:74-75`; `rail-shell/RailNoteList.svelte:923`; `rail-shell/FilesNavigator.svelte:331-333`, `:440-444`; `rail-shell/RailPropertiesPicker.svelte:144-145`, `:160`, `:164-165`.
- Collection: `collection/toolbar/SortPanel.svelte:82-86` (sort reorder).
- Canvas: `canvas/CanvasInner.svelte:602`.
- Rail resize: `rail-shell/Rail.svelte:316` `title="Drag to resize, double-click to reset"` (title only); `:234`, `:242`.
- Resize handle for panes: `components/ui/resizable/resizable-handle.svelte` (paneforge).

### 5.5 Context menus

- Right-click openers: `core/markdown-editor/EditorTabs.svelte:49`, `:97`; `core/markdown-editor/MarkdownEditor.svelte:728-733`; `plugins/kanban/KanbanCard.svelte:155`, `:224`; `plugins/kanban/KanbanLane.svelte:258`, `:268`; `features/tasks/TasksView.svelte:811`, `:1129`, `:1138`, `:1165`; `features/collection/CollectionView.svelte:520`, `:538`, `:553`; `features/note-list/NoteRowMenu.svelte:200-220`; `features/note-list/NoteRow.svelte:51`, `:72`; `features/rail-shell/FilesNavigator.svelte:313-345`, `:445`; `features/rail-shell/TypesNavigator.svelte:235-415`.
- Custom canvas menu: `features/canvas/CanvasContextMenu.svelte` (234 lines, 16 `<button>` elements) is hand-built, not `components/ui/context-menu`.
- Guard for closing menus: `components/ui/context-menu/context-menu-content.svelte:17-28` (`absorbWhileClosing`).

### 5.6 Tooltips

- Styled tooltip primitive: `components/ui/tooltip/tooltip-content.svelte` (`bg-foreground text-background`, `text-xs`, `px-3 py-1.5`, `rounded-md`, `:30`).
- Imports of the tooltip primitive: 3 files (`plugins/periodic-notes/DailyNoteButton.svelte`, `features/event-calendar/EventCalendarHeader.svelte`, `features/event-calendar/EventCalendarView.svelte`).
- Native `title=` attribute: 133 occurrences across `.svelte` files (grep). Most icon-only controls use the native `title`. Example: `AppearanceSection.svelte:197`, `:208`, `:224`, `:235`; `ThemeEditor.svelte:133`; `rail-shell/Rail.svelte:251` ("Expand rail" / "Collapse rail"), `:362` (`title={row.label}`).
- `DailyNoteButton.svelte:11-19`: icon-only button with `{...props}` spread (props come from a trigger; not traced).

---

## 6. Accessibility facts

### 6.1 Icon-only buttons

Total `size="icon*"` usages in `.svelte` under `src`: 35 (grep).

Labeled (confirmed in full or within the 6-line window):
- `src/lib/core/settings/sections/AppearanceSection.svelte:194-232`: four icon buttons, each with `title` and `aria-label`.
- `src/lib/core/settings/sections/ThemeEditor.svelte:133`: "Back to themes" with `title` and `aria-label`.
- `src/lib/app/SettingsPanel.svelte:151`: `aria-label="Close settings"`.
- `src/lib/features/event-calendar/EventDialog.svelte:210`, `:213`: `aria-label` and `title` on Delete and Duplicate.
- `src/lib/features/event-calendar/EventPopover.svelte:185`, `:188`: same.
- `src/lib/features/tasks/SourcesPanel.svelte:261`: `aria-label`.
- `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:410`, `AutoOrganizeRuleProperty.svelte:345`: label present within window.
- `src/lib/core/markdown-editor/EditorTabs.svelte:90`: tab close button, `aria-label="Close {tab.name}"`.

Unlabeled (confirmed by reading the element, no `aria-label` or `title` in the element):
- `src/lib/features/collection/CollectionView.svelte:595-601` (calendar popover trigger, icon `Calendar`).
- `src/lib/features/collection/CollectionView.svelte:668-670` (properties popover trigger, icon `Columns3`).
- `src/lib/features/collection/toolbar/FormulaRow.svelte:57-59` (remove, icon `X`).
- `src/lib/features/collection/toolbar/FilterRow.svelte:101-103` and `:184-186` (remove, icon `X`).
- `src/lib/features/collection/toolbar/SortPanel.svelte:126-133` (delete sort, icon `X`).
- `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:298-305` (move up, `ChevronUpIcon`), `:316-323` (remove, `TrashIcon`). A third at `:307-314` (move down) per grep, not read in full.
- `src/lib/plugins/periodic-notes/DailyNoteButton.svelte:11-19` (no label in element; props spread).

Heuristic-only (not individually read): `CollectionView.svelte:647`, `FilterRow` and `AutoOrganizeRuleRow` remaining hits.

### 6.2 Roles and non-button click handlers

- `role` attribute counts: `alert` 10, `group` 7, `separator` 4, `button` 4, `tablist` 3, `tab` 3, `presentation` 3, `menuitem` 3, `listitem` 3, `status` 2, `region` 2, `menuitemradio` 2, `menu` 2, `list` 2, `switch` 1, `radiogroup` 1, `radio` 1, `progressbar` 1, `none` 1, `link` 1, `img` 1, `dialog` 1.
- `div role="button"` used for a whole list row: `AppearanceSection.svelte:172-178`.
- Raw color group tabs without `role="tab"` / `aria-selected`: `ThemeEditor.svelte:176-183`.
- `onclick` on non-button elements: `src/lib/features/canvas/CanvasLinkInput.svelte:50` (backdrop `div`), `src/lib/features/canvas/CanvasFilePicker.svelte:50` (backdrop `div`). Both have `onkeydown={handleKeydown}`.
- `svelte-ignore` a11y suppressions (grep): `a11y_no_static_element_interactions` 19, `a11y_click_events_have_key_events` 3, `a11y_autofocus` 2, `a11y_no_noninteractive_tabindex` 1, `a11y_no_noninteractive_element_interactions` 1. `AppearanceSection.svelte:171` suppresses `a11y_no_static_element_interactions` on the row.

### 6.3 Labels and names

- Dialog close X: `dialog-content.svelte:37-42` (`sr-only` "Close").
- Command dialog: sr-only title "Command Palette" and description "Search for a command to run" (`command-dialog.svelte:12-13`, `:27-29`).
- Theme color swatch: `ThemeColorRow.svelte:51-61` label has no accessible name; native color input inside is `opacity-0` with no `aria-label`.
- Theme group tabs: text labels only (`ThemeEditor.svelte:182`).
- Theme name input: `placeholder="Theme name"` only (`ThemeEditor.svelte:137-143`), no `aria-label`.
- `ThemePreview.svelte`: decorative spans, no `aria-hidden`.
- Heading typography inputs: label via `SettingItem` (not read; `label` prop present at `HeadingTypographyEditor.svelte:60`, `:73`, `:86`, `:103`). Weight select has `aria-label="Font weight"` (`:92`).

### 6.4 Reduced motion

- Only `src/lib/features/event-calendar/EventCalendarView.svelte:284-288`: `@media (prefers-reduced-motion: reduce)` sets `animation: none` on the pulse and draws an outline.
- No `prefers-reduced-motion` in `app.css`, the ui primitives, or other `.css` files (grep).
- No `prefers-color-scheme` in `src` (grep, excluding tests). The theme follows the applied theme, not the OS.

### 6.5 Contrast-sensitive values set by code (facts only, not measured)

- `app.css:182` and `:246`: `--file-explorer-badge-fg: #8a8faa` (both themes, same value).
- `app.css:425` and onward: `--lp-codeblock-*` mix `--editor-fg` into `--lp-codeblock-bg`.
- `app.css:403-413`: event pairs mixed at 25% bg and 30% fg; comment says 4.5:1 checked on two themes only (KokoBrain Default and Sakura; Sakura is now a catalog theme per ADR-0035).

---

## 7. Styling facts

### 7.1 Raw color literals outside tokens

Hex literal lines in `.svelte`/`.ts` under `src` (excluding tests and generated), top files:
- `src/lib/core/settings/theme.logic.ts`: 168 (built-in palettes).
- `src/lib/features/rail-shell/rail-items.logic.ts`: 10.
- `src/lib/features/file-icons/IconPicker.svelte`: 10.
- `src/lib/core/markdown-editor/extensions/live-preview/styles.ts`: 9 (fallbacks like `var(--lp-comment, var(--syntax-meta, #6c7086))` at `:562`, `:569`; `#` fallback at `:141`).
- `src/lib/utils/color-presets.ts`: 8 (color picker presets).
- `src/lib/utils/tag-colors.ts`: 6.
- `src/lib/features/canvas/canvas.types.ts`: 6.
- `src/lib/plugins/queryjs/kb-ui.ts`: 4.
- `src/lib/plugins/graph-view/graph-view.logic.ts`: 4.
- `src/lib/utils/color.ts`: 2.
- `src/lib/features/canvas/CanvasEdge.svelte`: 2.
- Other files with 1 hex line: `TagColorPicker.svelte`, `PropertiesView.svelte`, `CanvasContextMenu.svelte`, `settings.types.ts`, `task-line.logic.ts`, `linear-calendar.logic.ts`, `callout.ts`.

`rgb()/rgba()/hsl()/hsla()/oklch()` literal lines:
- `src/lib/plugins/queryjs/kb-ui.ts`: 24; `src/lib/features/collection/linear-calendar.logic.ts`: 14; `src/lib/core/settings/theme.logic.ts`: 7 (oklch in theme builder); `src/lib/plugins/queryjs/contract/kb-api.v1.ts`: 5.
- Canvas svelte: `CanvasInner.svelte`: 11; `CanvasFilePicker.svelte`: 5; `CanvasLinkInput.svelte`: 6; `CanvasContextMenu.svelte`: 5; `LinkNode.svelte`: 4; `FileNode.svelte`: 3; `GroupNode.svelte`: 2; `ColorPicker.svelte`: 2.
- `src/lib/utils/color.ts`: 4 oklch lines.

Hex and rgb in `app.css` (declarations, by design): `:root` 155-213 (e.g., `--type-red: #C83848` at 194, `--warning: #786714` at 203, `--elev-shadow-1: #3028400f` at 205, `--search-semantic-bg: rgba(59,130,246,0.15)` and `--search-semantic-fg: #60a5fa` in both blocks); `.dark` 215-377 (e.g., `--settings-text: #bfcaf3`, `--input-bg: #3d4058`, `--syntax-*` and `--lp-*` hex).

### 7.2 Hard-coded font sizes

Arbitrary `text-[Npx]` classes (grep):
- `text-[11px]`: 22 uses in 15 files, e.g., `features/note-list/NoteRow.svelte` (4), `features/event-calendar/EventBlock.svelte` (4), `features/event-calendar/EventTimeGrid.svelte` (2), `features/collection/CollectionLinearCalendarView.svelte` (2), `features/collection/CollectionCalendarView.svelte` (2), `plugins/one-on-one/MyPeopleSection.svelte` (2), `features/rail-shell/RailNoteList.svelte` (1), `features/event-calendar/EventWeekStrip.svelte` (1), `features/event-calendar/EventTaskLane.svelte` (1), `features/event-calendar/EventAllDayLane.svelte` (1), `features/collection/collection-block-widget.ts` (1), `features/properties/RelationshipSearch.svelte` (1).
- `text-[13px]`: 4 uses (`features/properties/RelationshipSearch.svelte` 3, `plugins/calendar/CalendarGrid.svelte` 1).
- `text-[14px]`: 2 uses (`features/tags/TagItem.svelte`).
- Token equivalents exist: `label` 11px, `rail` 13px, `row` 14px (`app.css:92-101`).

Tailwind scale classes (`.svelte` grep counts), against the role tokens:
- `text-xs` (12px): 166. `text-sm` (14px): 110. `text-base`: 4. `text-lg`: 22.
- Role utilities: `text-meta` 138, `text-row` 46, `text-label` 11, `text-title` 6, `text-rail` 2.
- `text-lg` in settings headings: see section 8.

Inside `components/ui`, `text-xs` and `text-sm` are hard-coded: tooltip `tooltip-content.svelte:30`, `dropdown-menu-shortcut.svelte:16`, `dropdown-menu-label.svelte:20` (`text-sm font-semibold`), `command-shortcut.svelte:16`, `command-group.svelte:26` (`text-xs font-medium`), `select-label.svelte:16` and `select-group-heading.svelte:17` (`text-xs`), `dialog-title.svelte:15` (`text-lg`), `dialog-description.svelte:15` (`text-sm`), `command-empty.svelte:15` (`text-sm`), `input.svelte:43` (`text-base md:text-sm`). The menu items use `text-sm` (`context-menu-item.svelte:23`, `dropdown-menu-item.svelte:23`).

Preview-only sizes: `ThemePreview.svelte:26-27` inline `font-size: 5px` for tab names.

### 7.3 Inline styles

- `style=` attribute lines in `.svelte`: 67 with a px, hex, color, or opacity value (grep). Top files: `core/settings/sections/ThemePreview.svelte` (19 lines, every element), `features/collection/CollectionLinearCalendarView.svelte` (10), `features/event-calendar/EventTimeGrid.svelte` (7), `features/file-icons/IconPicker.svelte` (4), `plugins/kanban/KanbanCardText.svelte` (3), `features/rail-shell/TypesNavigator.svelte` (3), `features/rail-shell/FilesNavigator.svelte` (3), `features/event-calendar/EventMonthGrid.svelte` (3), `plugins/kanban/KanbanView.svelte` (2), `plugins/kanban/KanbanTableView.svelte` (2), `plugins/kanban/KanbanCard.svelte` (2), `features/tasks/TasksView.svelte` (2), `features/properties/PropertyField.svelte` (2), `features/note-list/NoteRow.svelte` (2), `app/EditorView.svelte` (2), `app/AppShell.svelte` (2).
- `style:xxx=` directives: 30 (grep).
- Theme editor: `ThemeColorRow.svelte:53` `style="background-color: {value}"`.
- `TableOfContentsPanel.svelte:58` sets `--toc-indent-depth` via inline style; `:79` reads it. Not declared in `app.css`.
- `EventTimeGrid.svelte` inline `--axis` and `min-width: calc(var(--axis) + 7 * 96px)` (tests reference this, `src/tests/lib/features/event-calendar/EventTimeGrid.test.ts:254-255`).
- `CanvasInner.svelte:772` sets `--xy-controls-button-color: var(--foreground)`.

### 7.4 z-index values

- Overlays: `z-50` on `dialog-overlay.svelte:16`, `dialog-content.svelte:30`, `popover-content.svelte:20`, `select-content.svelte:30`, `dropdown-menu-content.svelte:24`, `dropdown-menu-sub-content.svelte:16`, `context-menu-content.svelte:36`, `context-menu-sub-content.svelte:16`, `tooltip-content.svelte:30`, `:40` (arrow).
- `resizable-handle.svelte:31` `z-10`.
- App shell: `app/AppShell.svelte:191` `z-20`; `app/SettingsPanel.svelte:116` `z-40`; `app/EditorView.svelte:98`, `:112`, `:125`, `:139` `z-10`.
- Rail: `features/rail-shell/Rail.svelte:250` `z-40`, `:270` `z-10`, `:314` `z-30`.
- Kanban: `plugins/kanban/KanbanCardText.svelte:46`, `KanbanDatePicker.svelte:90`, `KanbanWikilinkSuggestions.svelte:80`: `z-50`.
- Graph: `plugins/graph-view/GraphControls.svelte:26` `z-10`.
- Event calendar: `EventDayHeaders.svelte:22` z-10; `EventTaskLane.svelte:30` z-10; `EventBlock.svelte:34` z-20 and z-30 (comment), `:51` computed `z-index: ${10 + Math.min(column, MAX_Z_COLUMN)}`; `EventTimeGrid.svelte:240` (z-10 and z-40), `:252` z-40, `:272` z-30, `:312` z-20, `:322` z-20; `EventAllDayLane.svelte:54` z-10.
- Canvas inline CSS: `CanvasLinkInput.svelte:82` `z-index: 50`; `CanvasFilePicker.svelte:82` `z-index: 50`; `CanvasInner.svelte:733` `z-index: 10`; `CanvasContextMenu.svelte:181` `z-index: 10`; `CanvasToolbar.svelte:47` `z-index: 5`.
- No z-index token scale exists in `app.css`.

### 7.5 Spacing and sizing

- No spacing token scale. Tailwind spacing utilities used throughout.
- Button sizes: `button.svelte:20-25` (`h-9`, `h-8`, `h-10`, `size-9`, `size-8`, `size-10`).
- Input height `h-9` (`input.svelte:43`), `ThemeColorRow.svelte:65` `h-7 w-[5.5rem]`, `ThemeEditor.svelte:139` `h-8`.
- Switch `h-[1.15rem] w-8` (`switch.svelte:18`).
- Pane toolbar token `h-10` (`app.css:151-153`, `pane-toolbar` utility).
- Status bar `--status-bar-height: 2rem` (`app.css:212`).
- Rail width and similar are set in components (not read in full).

### 7.6 Radius usage

- Radius ladder tokens: `--radius-xs..xl` (`app.css:110-115`). Used as `rounded-xs` (`ThemeColorRow.svelte:52`, dialog close `dialog-content.svelte:38`), `rounded-sm` (menu items `context-menu-item.svelte:23`, `command-item.svelte:16`), `rounded-md` (menus `dropdown-menu-content.svelte:24`, `popover-content.svelte:20`, tooltip `tooltip-content.svelte:30`, buttons `button.svelte:7`), `rounded-lg` (theme rows `AppearanceSection.svelte:173`, `:261`, `:274`), `rounded-xl` (dialog `dialog-content.svelte:30`).
- Hard-coded: `tooltip-content.svelte:40` `rounded-[2px]` (arrow); `ThemePreview.svelte` `border-radius: 1px` and `rounded-t-sm`.

### 7.7 Shadows

- Shadow tokens `--shadow-xs..xl` (`app.css:125-129`), built on `--elev-*` theme vars.
- ui use: `shadow-xs` on button (`button.svelte:10-15`), input (`input.svelte:28,43`), switch (`switch.svelte:18`), select-trigger (`:22`); `shadow-md` on context menu (`context-menu-content.svelte:36`), dropdown content (`dropdown-menu-content.svelte:24`), popover (`popover-content.svelte:20`); `shadow-xl` on dialog (`dialog-content.svelte:30`).

### 7.8 Z-tokens and CSS variables

- Token declarations in `app.css`: 277 distinct custom properties (grep of `^\s*--name:`).
- Token references in `src`: 227 distinct `var(--name` strings (grep).
- Referenced but not declared in `app.css` (set in code, or fallback-only):
  - Runtime from heading typography: `--heading-h1..h6-{font-size,font-weight,line-height,letter-spacing}` set in `src/lib/core/settings/heading-typography.logic.ts:18-28` and read in `canvas-markdown.css` and the editor.
  - Runtime from event calendar: `--axis` (`EventTimeGrid.svelte`), `--event-${color}-bg/fg` built in `src/lib/features/event-calendar/event-calendar-event.logic.ts:429` (dynamic; declared in app.css 402-413 for the 6 hues and the list in the logic file).
  - Set by components: `--rail-c` and `--rail-header-pad` (referenced in tests; `Rail.test.ts:413`, `AppShell.test.ts:304`), `--toc-indent-depth` (`TableOfContentsPanel.svelte:58`), `--date-input-fg` (opt-in override at `app.css:465-470`), `--xy-controls-button-*` (`CanvasInner.svelte:772`, `CanvasToolbar.svelte:57`).
  - Fallback-only (no declaration anywhere in `src` outside the fallback): `--lp-ul-marker`, `--lp-comment`, `--lp-hard-break`, `--lp-table-add-bg`, `--lp-table-add-hover`, `--lp-table-add-text`, `--bracket-match-bg`, `--bracket-match-fg`, `--bracket-nonmatch-bg`, `--bracket-nonmatch-fg` (`composition-aware-bracket-matching.ts:164` has `#bad0f847` as the fallback).
  - Dynamic type tokens: `var(--type-${name})` in `src/lib/features/file-icons/file-icons.logic.ts:222`.
- Declared, but no Tailwind class mapping: `--card-foreground` (`app.css:159`, `:220`) is not in the `@theme inline` block (which maps `--color-card` but not `--color-card-foreground`). Only consumer found: `src/lib/plugins/mods/mod-theme.svelte.ts:16`.
- Declared tokens with no literal text match in `src` (name or short name): `--color-type-{red,pink,teal,gray}` and `--type-{red,pink,teal,gray}` (used through `bg-type-*`/`text-type-*` classes or the dynamic `var(--type-${name})`), `--event-*-{bg,fg}` (dynamic, `event-calendar-event.logic.ts:429`), `--radius-lg`/`--radius-xl` (used as `rounded-lg`/`rounded-xl`), and `--text-*--line-height` / `--text-title--font-weight` (Tailwind derives these). No token found that is dead.

### 7.9 Theme vars flow

- Theme colors become CSS vars via `themeColorsToCssVars` (`theme.logic.ts:60-75`) and `applyActiveTheme` (`theme.service.ts:69-84`). Vars are set inline on `document.documentElement` (`theme.service.ts:13-17`), so the stylesheet's `:root` block is the fallback only.
- The `:root` and `.dark` blocks in `app.css` still define a complete second set of tokens, which are overwritten at runtime by inline vars on `<html>`.
- `html.dark` toggled from `--editor-bg` luminance (`theme.service.ts:27-35`). `color-scheme` set inline.

### 7.10 Transitions and animation durations

- `duration-150`: `resizable-handle.svelte:20`, `:31`. `duration-100`: 2 uses (not located). `duration-200`: `dialog-content.svelte:30`.
- Enter and exit animations: `animate-in`/`animate-out` with `fade-in-0`, `zoom-in-95`, `slide-in-from-*` on dialog, popover, dropdown, context-menu, select, tooltip, all without an explicit duration (tw-animate-css defaults; dialog overrides to 200ms at `:30`).
- `transition-all` on `button.svelte:7` and `transition-[color,box-shadow]` on input (`input.svelte:43`), select trigger (`select-trigger.svelte:22`), scroll-area (`scroll-area.svelte:32`). `transition-transform` on the switch thumb (`switch.svelte:26`). `transition-opacity` on row actions (`AppearanceSection.svelte:190`), `EditorTabs.svelte:87`, resizable grip (`resizable-handle.svelte:31`).
- `animate-spin`: 11 uses (`TodoistSyncStatus.svelte:27` and others).
- `animate-pulse`: 2 uses (not located).
- Keyframes: `EventCalendarView.svelte:271` `animation: event-calendar-pulse 1.4s ease-out 1` and `:274` `@keyframes -global-event-calendar-pulse`.
- No other `@keyframes` or `transition:` in `.css` files.
- Timing constants in `.ts` logic (a sampling): `src/lib/utils/log.service.ts` (2), `src/lib/core/filesystem/link-updater.service.ts` (2), `src/lib/features/tags/tags.service.ts` (2); these are not UI animation.

### 7.11 Reduced motion

See 6.4. Only one `@media (prefers-reduced-motion)` block in the whole `src` tree.

### 7.12 Custom CSS files and scoped styles

- Global: `app.css`. Feature-scoped: `features/canvas/canvas-markdown.css`. Component `<style>` blocks: 19 files (section 1.5). `resizable-handle.svelte:40-50` uses `:global(.resizable-handle)` with `var(--tab-bar)`, `var(--divider)`, `var(--primary)`.
- Rule noted in `app.css:17-22` comment: `section-label` color override relies on Tailwind emitting utilities after it (same specificity).

---

## 8. Copy

### 8.1 Case: title case vs sentence case

Title Case headings or labels:
- Settings section h2 (`text-lg font-semibold`): "Periodic Notes" (`PeriodicNotesSection.svelte:20`), "Quick Capture" (`QuickCaptureSection.svelte:30`), "File History" (`FileHistorySection.svelte:14`), "Files & Folders" (`FilesSection.svelte:9`), "Types & Lifecycle" (`TypesSection.svelte:9`), "1:1 Notes" (`OneOnOneSection.svelte:20`).
- Settings section h2 sentence or single word: "Appearance" (`AppearanceSection.svelte:149`), "Editor" (`EditorSection.svelte:38`), "Trash" (`TrashSection.svelte:66`), "Sentry" (`SentrySection.svelte:46`), "Troubleshooting" (`TroubleshootingSection.svelte:19`), "Update" (`UpdateSection.svelte:263`).
- Subsections (`section-label`, uppercase via CSS): "Heading typography" (`HeadingTypographyEditor.svelte:48`), "Theme catalog" (`AppearanceSection.svelte:253`), "Live preview" (`TroubleshootingSection.svelte:91`), "Changes in this build" (`UpdateSection.svelte:350`), "Preferences" (`UpdateSection.svelte:299`).
- Other title-cased strings: "Auto Organize" (`AutoOrganizeSection.svelte:108`), "Daily Note" (`DailyNoteButton.svelte:22`), "Parse Error" (`CollectionView.svelte:505`), "Restore This Version" (`FileHistoryDialog.svelte:96`), "Recent Vaults" (`src/routes/(app)/+page.svelte:40`), "Command Palette" (`command-dialog.svelte:12` default title).
- Sentence case buttons: "Create new theme" (`AppearanceSection.svelte:248`), "Send test event" (`SentrySection.svelte:83`), "Load projects" (`TodoistSection.svelte:130`), "Export" / "Import" (`ThemeEditor.svelte:158`, `:162`).
- Heading-to-section mismatch within the same settings tree: "Types & Lifecycle" and "Files & Folders" are Title Case with an ampersand; "Heading typography" (inside Editor) is sentence case.

### 8.2 Ellipsis and loading verbs

- ASCII "..." dominates: about 50 occurrences of `[A-Za-z]\.\.\.` in `.svelte` files (grep).
- Unicode "…" in 2 UI strings: `SentrySection.svelte:83` ('Sending…'), `SearchSection.svelte:141` ('Downloading…'). Two more are in comments.
- Loading verbs vary: "Loading...", "Loading icons...", "Loading history...", "Loading diff...", "Loading the theme catalog...", "Indexing vault...", "Indexing tasks...", "Indexing tags...", "Indexing..." (`SearchStatus.svelte:12`), "Syncing" not used as a string in the scanned set.

### 8.3 Empty-state punctuation and wording

See 2.1. Trailing period differs between `Command.Empty` text ("No files found.") and panel text ("No files found", `RelationshipSearch.svelte:89`, `CanvasFilePicker.svelte:67`). Same concept, different words: "No files found" (`RelationshipSearch`), "No results found" (`SearchPanel`), "No backlinks found" (`BacklinksPanel`), "No outgoing links" (`OutgoingLinksPanel`), "Nothing here" (`RailNoteList:852`), "No types yet" (`TypesNavigator:275`).

### 8.4 Delete, remove, trash, uninstall

- Occurrence counts (grep, `.svelte`): "Delete" 29, "Trash" 19, "Remove" 13, "Archive" 23, "Uninstall" 2, "Discard" 0.
- Theme area: "Uninstall theme" (`AppearanceSection.svelte:224-225`) for installed themes and "Delete theme" (`:235-236`) for user themes. The action for built-ins is hidden.
- Destructive confirmation copy: `TrashSection.svelte:35` "Permanently delete ... ? This cannot be undone." and `:50` "Permanently delete all N items in trash? This cannot be undone." No `window.confirm` found in `src`.
- Event dialog: "Delete event" / title "Delete" (`EventDialog.svelte:210`).

### 8.5 Cancel and close

- "Cancel" 19 occurrences, "Close" 11, "Done" 3, "Dismiss" 0. Theme editor header uses "Cancel" and "Save" (`ThemeEditor.svelte:149-150`); back icon uses "Back to themes" (`:133`).

### 8.6 Toast and inline error copy

- Same failure, two wordings: `AppearanceSection.svelte:52` toast "Could not load the theme catalog: <message>" vs inline `:263` "Could not load the theme catalog. Your installed and built-in themes still work."
- Update vs version label: row shows "by {author} · v{version}" (`:283`), button "Update to {version}" without "v" (`:292`), toast "Updated ... to {version}" (`:78`).
- "Requires a newer KokoBrain" (`:297`).

### 8.7 Punctuation and symbols

- En dash in ranges: "Size in em (0.5–5.0)" (`HeadingTypographyEditor.svelte:60`), "Multiplier (1.0–3.0)" (`:73`), "In em (-0.1 to 0.1)" (`:103`) uses "to" with a hyphen-minus for negative. Mixed range notation in the same component.
- Em dash characters in `.svelte` under `src/lib`: 26 lines (grep count; not checked whether they are comments or UI text).
- "Sending…" / "Downloading…" (unicode) vs "Loading..." (ASCII) in the same settings area.

### 8.8 Terminology

- "Theme" vs "Appearance": section title is "Appearance" (`AppearanceSection.svelte:149`), the intro says "Select a color theme, or create your own with the theme editor." (`:163`). Settings nav and status copy use "theme"; ThemeEditor header says "Back to themes".
- "Note" vs "file" in empty states: "No files found" (picker), "No templates found" and "Add .md files" (`TemplatePicker.svelte:109`), "Empty file" (`FileNode.svelte:85`).
- "Mods" (`ModsStatusList.svelte:88`) vs "Plugin" in the file comments (`plugins/` folder name). Not in UI copy.
- "Tasks" vs "TODO" vs "Todoist": `TodoistSection.svelte` and `TasksView.svelte` both used; not audited.

### 8.9 Developer strings reachable by users

- `ModsStatusList.svelte:88`: "No mods in _system/mods/" exposes a vault path.
- `TemplatePicker.svelte:109`: "Add .md files to _templates/ folder." (folder name in code font not applied).
- `OneOnOnePicker.svelte:92`: "Add .md files to the people folders." (vague; different phrasing for the same action).

---

## Appendix B: theme section and ui file line counts

(See Appendix A below for `components/ui`.)

Theme section components (`src/lib/core/settings/sections/`): AppearanceSection 306, ThemeEditor 202, ThemeColorRow 73, ThemePreview 53, HeadingTypographyEditor 118. Total 752.

---

## Appendix A: components/ui/*.svelte (path, lines, primitive/custom)
- src/lib/components/ui/button/button.svelte: 82 lines; no external primitive import (pure markup/wrapper)
- src/lib/components/ui/collapsible/collapsible-content.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/collapsible/collapsible-trigger.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/collapsible/collapsible.svelte: 11 lines; from "bits-ui"
- src/lib/components/ui/command/command-dialog.svelte: 40 lines; from "bits-ui"
- src/lib/components/ui/command/command-empty.svelte: 17 lines; from "bits-ui"
- src/lib/components/ui/command/command-group.svelte: 32 lines; from "bits-ui"
- src/lib/components/ui/command/command-input.svelte: 26 lines; from "bits-ui"
- src/lib/components/ui/command/command-item.svelte: 20 lines; from "bits-ui"
- src/lib/components/ui/command/command-link-item.svelte: 20 lines; from "bits-ui"
- src/lib/components/ui/command/command-list.svelte: 17 lines; from "bits-ui"
- src/lib/components/ui/command/command-loading.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/command/command-separator.svelte: 17 lines; from "bits-ui"
- src/lib/components/ui/command/command-shortcut.svelte: 20 lines; no external primitive import (pure markup/wrapper)
- src/lib/components/ui/command/command.svelte: 28 lines; from "bits-ui"
- src/lib/components/ui/context-menu/context-menu-checkbox-item.svelte: 43 lines; from "bits-ui"
- src/lib/components/ui/context-menu/context-menu-content.svelte: 45 lines; from "bits-ui"
- src/lib/components/ui/context-menu/context-menu-group-heading.svelte: 21 lines; from "bits-ui"
- src/lib/components/ui/context-menu/context-menu-group.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/context-menu/context-menu-item.svelte: 27 lines; from "bits-ui"
- src/lib/components/ui/context-menu/context-menu-label.svelte: 24 lines; no external primitive import (pure markup/wrapper)
- src/lib/components/ui/context-menu/context-menu-portal.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/context-menu/context-menu-radio-group.svelte: 16 lines; from "bits-ui"
- src/lib/components/ui/context-menu/context-menu-radio-item.svelte: 33 lines; from "bits-ui"
- src/lib/components/ui/context-menu/context-menu-separator.svelte: 17 lines; from "bits-ui"
- src/lib/components/ui/context-menu/context-menu-shortcut.svelte: 20 lines; no external primitive import (pure markup/wrapper)
- src/lib/components/ui/context-menu/context-menu-sub-content.svelte: 20 lines; from "bits-ui"
- src/lib/components/ui/context-menu/context-menu-sub-trigger.svelte: 29 lines; from "bits-ui"
- src/lib/components/ui/context-menu/context-menu-sub.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/context-menu/context-menu-trigger.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/context-menu/context-menu.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/dialog/dialog-close.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/dialog/dialog-content.svelte: 45 lines; from "bits-ui"
- src/lib/components/ui/dialog/dialog-description.svelte: 17 lines; from "bits-ui"
- src/lib/components/ui/dialog/dialog-footer.svelte: 20 lines; no external primitive import (pure markup/wrapper)
- src/lib/components/ui/dialog/dialog-header.svelte: 20 lines; no external primitive import (pure markup/wrapper)
- src/lib/components/ui/dialog/dialog-overlay.svelte: 20 lines; from "bits-ui"
- src/lib/components/ui/dialog/dialog-portal.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/dialog/dialog-title.svelte: 17 lines; from "bits-ui"
- src/lib/components/ui/dialog/dialog-trigger.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/dialog/dialog.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/dropdown-menu/dropdown-menu-checkbox-group.svelte: 16 lines; from "bits-ui"
- src/lib/components/ui/dropdown-menu/dropdown-menu-checkbox-item.svelte: 43 lines; from "bits-ui"
- src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte: 29 lines; from "bits-ui"
- src/lib/components/ui/dropdown-menu/dropdown-menu-group-heading.svelte: 22 lines; from "bits-ui"
- src/lib/components/ui/dropdown-menu/dropdown-menu-group.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte: 27 lines; from "bits-ui"
- src/lib/components/ui/dropdown-menu/dropdown-menu-label.svelte: 24 lines; no external primitive import (pure markup/wrapper)
- src/lib/components/ui/dropdown-menu/dropdown-menu-portal.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/dropdown-menu/dropdown-menu-radio-group.svelte: 16 lines; from "bits-ui"
- src/lib/components/ui/dropdown-menu/dropdown-menu-radio-item.svelte: 33 lines; from "bits-ui"
- src/lib/components/ui/dropdown-menu/dropdown-menu-separator.svelte: 17 lines; from "bits-ui"
- src/lib/components/ui/dropdown-menu/dropdown-menu-shortcut.svelte: 20 lines; no external primitive import (pure markup/wrapper)
- src/lib/components/ui/dropdown-menu/dropdown-menu-sub-content.svelte: 20 lines; from "bits-ui"
- src/lib/components/ui/dropdown-menu/dropdown-menu-sub-trigger.svelte: 29 lines; from "bits-ui"
- src/lib/components/ui/dropdown-menu/dropdown-menu-sub.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/dropdown-menu/dropdown-menu.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/input/input.svelte: 52 lines; no external primitive import (pure markup/wrapper)
- src/lib/components/ui/popover/popover-content.svelte: 24 lines; from "bits-ui"
- src/lib/components/ui/resizable/resizable-handle.svelte: 50 lines; from "paneforge"
- src/lib/components/ui/resizable/resizable-pane-group.svelte: 20 lines; from "paneforge"
- src/lib/components/ui/scroll-area/scroll-area-scrollbar.svelte: 31 lines; from "bits-ui"
- src/lib/components/ui/scroll-area/scroll-area.svelte: 43 lines; from "bits-ui"
- src/lib/components/ui/select/select-content.svelte: 45 lines; from "bits-ui"
- src/lib/components/ui/select/select-group-heading.svelte: 21 lines; from "bits-ui"
- src/lib/components/ui/select/select-group.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/select/select-item.svelte: 38 lines; from "bits-ui"
- src/lib/components/ui/select/select-label.svelte: 20 lines; no external primitive import (pure markup/wrapper)
- src/lib/components/ui/select/select-portal.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/select/select-scroll-down-button.svelte: 20 lines; from "bits-ui"
- src/lib/components/ui/select/select-scroll-up-button.svelte: 20 lines; from "bits-ui"
- src/lib/components/ui/select/select-separator.svelte: 18 lines; from "bits-ui"
- src/lib/components/ui/select/select-trigger.svelte: 29 lines; from "bits-ui"
- src/lib/components/ui/select/select.svelte: 11 lines; from "bits-ui"
- src/lib/components/ui/separator/separator.svelte: 21 lines; from "bits-ui"
- src/lib/components/ui/switch/switch.svelte: 29 lines; from "bits-ui"
- src/lib/components/ui/tooltip/tooltip-content.svelte: 52 lines; from "bits-ui"
- src/lib/components/ui/tooltip/tooltip-portal.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/tooltip/tooltip-provider.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/tooltip/tooltip-trigger.svelte: 7 lines; from "bits-ui"
- src/lib/components/ui/tooltip/tooltip.svelte: 7 lines; from "bits-ui"
