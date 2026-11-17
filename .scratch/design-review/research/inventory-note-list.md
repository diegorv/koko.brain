# Inventory: Note list and files navigator

Scope: `src/lib/features/note-list`, `src/lib/features/file-icons`, `src/lib/features/rail-shell` (Files navigator, Types navigator, list toolbar). Facts only, path:line cited. Read-only pass.

## 1. Components (path, lines, UI, primitives)

Svelte components in scope (13 files, 3,911 lines):

- `note-list/NoteRow.svelte` (133 lines). One list row: icon, title, optional subtitle, type chip, property pills. Row is a native `<button>` (`NoteRow.svelte:67-132`); rename mode swaps in an `<input>` (`:47-65`). No shadcn primitive. Wikilink pills are `<span role="link" tabindex="-1">` nested inside the row button (`:110-122`).
- `note-list/NoteRowMenu.svelte` (302). Wrapper that owns the context menu, inline rename state, the icon picker and the trash/duplicate/favorite actions. Uses shadcn `ContextMenu` (`:13`). Renders `IconPicker` (`:290-302`). Confirm dialog via `ask()` from tauri (`:163-166`).
- `rail-shell/RailNoteList.svelte` (925). The note list pane: header toolbar, search row, rule line, grouped or flat virtualized list (`virtua` `VList`, `:834`, `:899`), loading/error/empty states. Uses shadcn `Popover` (`:26`), `RailSortMenu`, `RailPropertiesPicker`, `RailArchivedMenu`, `RailListSearch`. Header buttons are raw `<button>` with hand-written classes (`:736-819`).
- `rail-shell/RailSortMenu.svelte` (233). Sort trigger and popover, custom `role="menu"` with `menuitemradio` rows and per-row asc/desc buttons (`:143`, `:193-231`). Uses shadcn `Popover` (`:6`).
- `rail-shell/RailPropertiesPicker.svelte` (177). "Show in note list" popover: checkbox list, search input, drag-to-reorder handle (`:161-168`). Uses shadcn `Popover` (`:5`) and `Input` (`:6`).
- `rail-shell/RailArchivedMenu.svelte` (67). Three-option archive filter popover (`:45-66`). Uses shadcn `Popover` (`:4`).
- `rail-shell/RailListSearch.svelte` (119). Search input row with 180 ms debounce (`:8`), spinner (`:97-105`), clear button (`:107-117`). Uses shadcn `Input` (`:5`).
- `rail-shell/FilesNavigator.svelte` (502). "Files" tree: vault root row plus recursive folder rows with chevrons, inline rename, drag/drop move, and context menu. Uses shadcn `ContextMenu` (`:18`), `ViewDialog`, `IconPicker`. Tree rows are raw `<button>`/`<div>` (`:327-336`, `:429-496`).
- `rail-shell/TypesNavigator.svelte` (511). "Types" navigator: view rows (with counts, error marks, group sections), type rows, "New type"/"New view" buttons, context menu. Uses shadcn `ContextMenu` (`:27`). Rows are raw buttons (`:280-302`, `:409-438`). Dialogs: `TypeNameDialog`, `ViewDialog`.
- `rail-shell/Rail.svelte` (380). Left icon rail with three forms (labeled, captioned, collapsed), section titles, drag-to-resize handle (`:310-326`), collapse toggle (`:248-257`), badge pills. No shadcn primitive except none; all raw `<button>`/`<nav>` (`:259-265`, `:358-379`).
- `rail-shell/LayoutSection.svelte` (201). Settings page for rail layout. Uses shadcn `Button` (`:4`, `:57-64`, `:169-188`), `Switch` (`:5`), and `SettingItem`. This is the only in-scope file with disabled buttons (`:174`, `:184`).
- `file-icons/IconPicker.svelte` (323). Modal "Change icon": search, pack chips, 8-col icon grid (capped at 500, `:232`), preset color swatches, native `<input type="color">` for custom colors (`:267-280`, `:295-308`), "Remove custom icon" text button (`:311-319`). Uses shadcn `Dialog` (`:8`), `Input` (`:9`), `ScrollArea` (`:10`). Pack chips and swatches are raw buttons.
- `file-icons/IconRenderer.svelte` (38). Renders an icon as inline SVG (`sanitizeSvgContent`, `:36`) or emoji span (`:24`). No primitives, no states.

Non-Svelte files in scope with UI-adjacent logic: `file-icons/frontmatter-icon.service.ts`, `file-icons/icon-resolver.ts`, `note-list/note-row-menu.context.ts` (defines `RENAME_SHORTCUT = { key: 'F2' }`, `note-row-menu.context.ts:5`), `rail-shell/Rail*.logic.ts` helpers. No CSS files in scope.

Primitive usage summary:
- shadcn primitives imported: ContextMenu (NoteRowMenu, FilesNavigator, TypesNavigator), Popover (RailNoteList, RailSortMenu, RailPropertiesPicker, RailArchivedMenu), Dialog/Input/ScrollArea (IconPicker), Input (RailListSearch, RailPropertiesPicker), Button/Switch (LayoutSection).
- Raw markup with hand-written Tailwind classes: all header action buttons in RailNoteList (`:736-819`), all tree and type rows, all rail items (`Rail.svelte:358-379`), all sort and archive menu rows, all IconPicker grid/swatch buttons, the collapse toggle (`Rail.svelte:248-257`).
- Repeated class strings for header icon buttons: `flex shrink-0 cursor-default items-center rounded-md p-1 transition-colors hover:bg-file-explorer-accent hover:text-tab-text-active focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50` appears in RailNoteList `:738`, `:774`, `:799`, `:811`, and RailArchivedMenu `:34`, RailPropertiesPicker `:105`, RailSortMenu `:106` (the last two omit the focus ring).

## 2. States

Empty / loading / error / disabled, with where each is (or is not) rendered:

- Loading:
  - Rendered: RailNoteList `Loading...` (`RailNoteList.svelte:862-864`), with the count hidden while loading (`:725`). Loading also for an unready entries snapshot (`:193-194`) and view reads (`:188`, `:249`).
  - Not rendered: FilesNavigator has no loading state (tree comes from `fsStore.fileTree`, no check). TypesNavigator has none for the list; view counts show an empty slot while pending (`TypesNavigator.svelte:429-436`, comment `:429`).
  - IconPicker: `Loading icons...` (`IconPicker.svelte:204-206`), spinner-less.
  - RailListSearch: spinner icon while full-text is pending (`RailListSearch.svelte:97-105`), not text.
- Empty:
  - "Nothing here" per empty group (`RailNoteList.svelte:851-852`).
  - "No matching notes" (`:890-892`) and "No notes here" (`:894-897`).
  - "No types yet" (`TypesNavigator.svelte:274-276`).
  - FilesNavigator: no empty copy (vault root always shows; an empty folder shows no children and no hint).
  - IconPicker: "No icons found" (`IconPicker.svelte:208-211`).
  - RailPropertiesPicker: "No matching properties" (`RailPropertiesPicker.svelte:172`).
- Error:
  - RailNoteList: `role="alert"` block "This view cannot be shown" with the message and an "Open view" button (`RailNoteList.svelte:871-887`). Missing view: "This view no longer exists" (`:866-868`).
  - TypesNavigator: view count error shows a `CircleAlert` mark with `role="img"` and `title`/`aria-label` (`TypesNavigator.svelte:453-463`, `:431-433`).
  - Other errors go to `toast.error` only (NoteRowMenu `:80`, `:139`; FilesNavigator `:118`, `:176`; TypesNavigator `:204`; RailNoteList `:450`). No inline error for FilesNavigator or TypesNavigator lists.
- Disabled:
  - Only LayoutSection up/down buttons (`LayoutSection.svelte:174`, `:184`).
  - No disabled style on the header buttons; "New here" simply disappears when `canCreate` is false (`RailNoteList.svelte:808`).
  - Rename input and menu items have no disabled state.
- Hidden instead of disabled: Show-in-Views (`NoteRowMenu.svelte:232`), Change icon/Favorite only for markdown (`NoteRowMenu.svelte:256`), root has no Rename/Delete (`FilesNavigator.svelte:368`).

## 3. Interaction

- Keyboard:
  - NoteRow: F2 starts rename (`NoteRow.svelte:73`, `note-row-menu.context.ts:5`). Rename input: Enter commits, Escape cancels (`NoteRowMenu.svelte:152-160`). Pill Enter opens wikilink (`NoteRow.svelte:118`).
  - Rows are `<button>` so Tab/Enter/Space work for open (`NoteRow.svelte:67`). Pills are `tabindex="-1"` (`:116`), so not reachable by Tab.
  - Sort menu: arrow keys, Home/End, Left/Right = asc/desc, Enter/Space (`RailSortMenu.svelte:77-100`). Uses roving-ish `tabindex="-1"` on rows (`:196`), focus managed in `focusActiveRow` (`:71-75`).
  - Property picker: Alt+ArrowUp/Down reorders (`RailPropertiesPicker.svelte:91-100`). No key path for ungrouped toggle beyond checkbox.
  - FilesNavigator rename: Enter/Escape (`FilesNavigator.svelte:183-192`). No arrow-key navigation through the tree; no `role="tree"`.
  - Search: Escape closes (`RailListSearch.svelte:79-81`). Input autofocus (`:41-43`).
  - Rail: no keyboard handling beyond native buttons.
  - Note list (`VList`) and Files tree: no arrow-key navigation (`RailNoteList.svelte:834`, `:899`; `FilesNavigator.svelte:340-343`).
- Focus management:
  - Rename inputs autofocus and select via `requestAnimationFrame` (`NoteRowMenu.svelte:120-123`, `FilesNavigator.svelte:153-158`).
  - Popovers restore last-focused element on open (`RailPropertiesPicker.svelte:124`, `RailSortMenu.svelte:133-138`).
  - Search row: input focused on mount (`RailListSearch.svelte:41-43`).
  - IconPicker: default Dialog focus, no custom focus target.
- Hover-only affordances: none found. No `group-hover`, `opacity-0` reveal, or hidden-until-hover actions in scope. Hover is a background tint only (`hover:bg-file-explorer-accent`, etc.).
- Drag and drop:
  - Note rows draggable with path as `text/plain`, move effect (`NoteRow.svelte:74-80`); used by `draggable` prop in RailNoteList (`:923`).
  - Folder rows draggable, dragover/leave/drop; move via `moveItem`; expand target on drop (`FilesNavigator.svelte:250-290`, `:440-444`). Drop highlight class (`:296-298`).
  - Property reorder via private MIME `application/x-kokobrain-list-property` (`RailPropertiesPicker.svelte:72`), handle span `draggable` only (`:157-168`). No keyboard-equivalent drag beyond Alt+arrow.
  - Rail resize by pointer capture, with an 8 px-wide handle (`w-2`, `Rail.svelte:310-326`), double-click resets (`:324`). Drag blocked while resizing (`:237-239`, `:242`).
- Context menus (all right-click, all via shadcn ContextMenu):
  - Note rows: NoteRowMenu, one menu for all rows (`NoteRowMenu.svelte:199-288`). Blank area suppresses menu (`:205-212`).
  - Folder rows: FilesNavigator (`:312-404`); root right-click outside rows.
  - Type and view rows: TypesNavigator (`:306-396`).
  - No context-menu trigger exists for the rail nav items or sort/filter buttons.
- Tooltips: native `title` attributes only. No `Tooltip` component is used in scope. Count of `title=` per file: NoteRow 1, RailNoteList 5, Rail 4, TypesNavigator 5, IconPicker 6, others 0 to 2.
- Icon-only buttons with title: many, but several use a visible text title only in `title`, which renders after roughly a second with no shortcut hints.

## 4. Accessibility facts

- Icon-only buttons (aria-label present unless noted):
  - RailNoteList search toggle: `aria-label="Search notes"`, `aria-pressed` (`RailNoteList.svelte:741-743`).
  - RailNoteList sort trigger: `aria-label` via `triggerTitle` (`RailSortMenu.svelte:110`).
  - RailNoteList filter trigger: `title="Filter"` only, no `aria-label` (`RailNoteList.svelte:777-778`). Not a popover label for AT.
  - RailNoteList header action: `aria-label={headerAction.label}` (`:801`).
  - RailNoteList "New here": `aria-label="New here"` (`:813`).
  - RailPropertiesPicker trigger: `aria-label="Show in note list"` (`:110`).
  - RailArchivedMenu trigger: `aria-label={triggerTitle}` (`RailArchivedMenu.svelte:38`).
  - Rail collapse toggle: `aria-label` (`Rail.svelte:252`). Rail resize handle: `aria-label="Resize rail"`, `tabindex="-1"` (`:313-318`). Not keyboard-operable.
  - Rail items: `aria-label={row.label}`, `aria-current="page"` when active (`Rail.svelte:363-364`).
  - FilesNavigator chevron: `aria-label` and `aria-expanded` (`FilesNavigator.svelte:458-459`).
  - TypesNavigator "New view" button: `title="New view"` only, no aria-label (`TypesNavigator.svelte:255-257`). "New type" uses visible text (`:223-229`).
  - RailListSearch clear: `aria-label="Clear search"` (`RailListSearch.svelte:110`).
  - IconPicker swatches: `title` only, no aria-label (`IconPicker.svelte:262-265`, `:289-293`). Pack chips: visible text.
  - Sort row direction buttons: `aria-label` plus `aria-pressed` (`RailSortMenu.svelte:209-223`).
  - Archive icon in NoteRow: `aria-label="Archived"` on a Lucide icon (`NoteRow.svelte:97`).
- Roles: `role="menu"` and `menuitemradio`/`menuitem` (`RailSortMenu.svelte:143`, `:193-198`), `role="separator"` (`:148`), `role="alert"` for view error (`RailNoteList.svelte:873`), `role="img"` with aria-label for error/key-note marks (`TypesNavigator.svelte:455-457`), `role="link"` on pills with `tabindex="-1"` (`NoteRow.svelte:115-116`). No `role="tree"`, `role="listbox"`, or `role="list"` on the note list or folder tree. Views and types lists have no list semantics.
- Nested interactive: `role="link"` span inside a `<button>` (NoteRow `:113` inside `:67`).
- Focus-visible styles: present on header buttons `focus-visible:ring-[3px] focus-visible:ring-ring/50` (RailNoteList `:738`, `:799`, `:811`), rows `focus-visible:ring-2 ring-inset` (NoteRow `:70`, TypesNavigator `:281`, `:410`, FilesNavigator `:296`). Missing on: RailSortMenu trigger (`:106-109`, no focus-visible class), RailPropertiesPicker trigger (`:105-108`), RailNoteList filter trigger (`:774-778`), RailNoteList search-toggle and header actions have it. Sort-menu rows have none (`:198`, `:211`). Rail collapse toggle has no focus-visible class (`Rail.svelte:250`). IconPicker grid buttons have none (`IconPicker.svelte:219`, `:234`).
- Click handlers on non-button elements: none found (grep of div/span/li/svg/p/label with onclick returned zero). Non-button interactive elements: the pill `span role="link"` (`NoteRow.svelte:113`), the custom color `label` containing an `input[type=color]` (`IconPicker.svelte:267-280`), the drag handle `span draggable` (`RailPropertiesPicker.svelte:157-168`, `aria-hidden="true"`), the resize `button` (`Rail.svelte:310-326`).
- Hidden-from-AT elements: drag handle `aria-hidden` (`RailPropertiesPicker.svelte:162`), search spinner `aria-hidden` (`RailListSearch.svelte:101`), busy dot `aria-hidden` (`Rail.svelte:377`), placeholder anchor `aria-hidden` (`RailNoteList.svelte:721`).
- Row labels: Files rows have no `aria-label`; the button text is the folder name. Rename input has `aria-label="Rename {name}"` (`FilesNavigator.svelte:474`). The note-row rename input has no aria-label (`NoteRow.svelte:58-64`).
- `aria-busy` on rail rows while an action runs (`Rail.svelte:365`).
- Icon `<svg>` in IconRenderer has no title or aria-hidden (`IconRenderer.svelte:26-37`).

## 5. Styling facts

- Raw hex/rgb colors in scope: IconPicker preset palette `#ef4444 #f97316 #eab308 #22c55e #06b6d4 #3b82f6 #a855f7 #ec4899` (`IconPicker.svelte:53-60`), and `#ffffff` fallback for color inputs (`:276`, `:304`). Conic gradient for custom swatch uses named colors `red, yellow, lime, aqua, blue, magenta` (`:271`, `:299`).
- Hard-coded font sizes (arbitrary, not theme tokens): `text-[11px]` in NoteRow subtitle (`NoteRow.svelte:93`), type chip (`:103`), property pills (`:114`, `:124`); `text-[11px]` for the rule line (`RailNoteList.svelte:827`). Theme tokens exist for 11 px as `text-label` (`app.css:92`) but are not used for these.
- Other fixed text sizes: `text-xs` in TypesNavigator "New type" (`TypesNavigator.svelte:224`), search input `text-xs` (`RailListSearch.svelte:89`), IconPicker pack chips and labels `text-xs` (`IconPicker.svelte:184`, `:192`, `:256`, `:284`), `text-sm` for empty copy (`RailNoteList.svelte:891`, `:895`; `TypesNavigator.svelte:275`; `IconPicker.svelte:205`, `:209`).
- Theme token text sizes used: `text-title`, `text-row`, `text-meta`, `text-label`, `text-rail` (`app.css:92-101`).
- Inline styles:
  - `style:padding-left="{depth * 12}px"` for folder depth (`FilesNavigator.svelte:438`).
  - `style={iconColorStyle(...)}` on fallback icons (`NoteRow.svelte:56`, `:86`; `FilesNavigator.svelte:489-491`; `TypesNavigator.svelte:292`, `:422`).
  - `style:color` for title colors from icon metadata (`NoteRow.svelte:89`, `FilesNavigator.svelte:493`, `TypesNavigator.svelte:294`, `:424`).
  - `style="box-shadow: inset 0 -1px 0 var(--divider)"` as the header divider on four headers (`RailNoteList.svelte:718`, `FilesNavigator.svelte:306`, `TypesNavigator.svelte:218`, `Rail.svelte:270`). Not a Tailwind border token.
  - Rail width `style:width="{frameWidth}px"` (`Rail.svelte:259`).
  - Rail row active tint `color-mix(in oklch, var(--rail-c) 18%, transparent)` (`Rail.svelte:361`), per-row `--rail-c` var (`:360`).
  - Rail badge `style:background-color="var(--rail-c)"` with hard-coded `text-white` (`Rail.svelte:374`). Hard-coded white text on a colored pill ignores theme.
  - Icon style: `background-color` on swatches (`IconPicker.svelte:262`, `:290`).
- Z-index values: `z-40` collapse toggle (`Rail.svelte:250`), `z-10` sticky rail strip (`:270`), `z-30` resize handle (`:314`). No z-index in note-list or file-icons.
- Spacing values: arbitrary `py-[5px]` (`FilesNavigator.svelte:296`, `TypesNavigator.svelte:281`, `:410`), `h-[480px]` IconPicker body (`IconPicker.svelte:166`), `max-w-[140px]` pills (`NoteRow.svelte:103`), `w-[72px]` captioned rail item (`Rail.svelte:112`), `top-[7px] left-[88px]` (`Rail.svelte:250`), `pl-[var(--rail-header-pad)]` (`RailNoteList.svelte:717`, `FilesNavigator.svelte:305`, `TypesNavigator.svelte:217`), `ring-[3px]` (multiple).
- Custom CSS files in scope: none. Global utilities used: `section-label` (`app.css:140`), `@container` / `@max-[12rem]:hidden` / `@[16.5rem]:inline` container queries (`RailNoteList.svelte:716`, `:725`; `RailSortMenu.svelte:119`, `:122`).
- Transitions and animations:
  - `transition-colors` on most hover buttons (e.g. `RailNoteList.svelte:738`, `:774`, `:799`, `:811`, `:881`; `IconPicker.svelte:184`, `:192`, `:219`, `:234`, `:260`, `:268`, `:288`, `:296`, `:313`).
  - `transition-opacity` on swatches (`IconPicker.svelte:260`, `:268`, `:288`, `:296`).
  - `transition-transform` on chevron, rotate-90 (`FilesNavigator.svelte:463`).
  - `transition-colors` on the resize handle (`Rail.svelte:314`).
  - `animate-spin` spinner (`RailListSearch.svelte:103`), `animate-pulse` busy dot (`Rail.svelte:377`).
  - Durations: none set explicitly; Tailwind default (150 ms) on every `transition-*`. No `duration-*` or `ease-*`.
- prefers-reduced-motion: no handling in scope. `grep reduce` returned only a JS `reduce` call (`TypesNavigator.svelte:70`). Repo-wide `prefers-reduced-motion` appears only in `src/lib/features/event-calendar/EventCalendarView.svelte`. `src/app.css` has none.
- Theme tokens used (CSS variables defined in `src/app.css`, with light/dark variants at `:180` and `:244` for `--file-explorer-primary`):
  - Surfaces: `--list-bg` (`RailNoteList.svelte:714`), `--nav-bg` (`FilesNavigator.svelte:302`, `TypesNavigator.svelte:214`), `--rail-bg` (`Rail.svelte:262`), `--tab-bar` (headers).
  - File explorer set: `--file-explorer-fg`, `-muted-fg`, `-primary`, `-accent`, `-border`, `-badge-fg`. Also `text-file-explorer-muted-fg` used in NoteRow-equivalent copy.
  - Tab tokens: `text-tab-text-active`, `text-tab-text-inactive` (`RailNoteList.svelte:723`, `:725`).
  - Other: `--divider`, `--rail-muted-fg`, `bg-primary/10`, `bg-primary/25`, `bg-primary/20` (NoteRow type chip and pills), `text-primary/80`, `text-muted-foreground`, `text-destructive`, `bg-destructive/10`, `border-destructive/50` (`RailNoteList.svelte:873`), `bg-muted`, `bg-accent`, `bg-background`, `text-white`.
  - Mixed systems: note rows use shadcn tokens (`primary`, `muted-foreground`, `accent`) while navigator rows use `file-explorer-*`. Two palettes for similar rows.
- Hard-coded `text-white` on rail badge (`Rail.svelte:374`) and `text-white` also used only there in scope.

## 6. Copy

User-visible strings in scope, grouped by term. Inconsistencies flagged.

- Delete wording (three variants):
  - "Move to Trash" menu item (`NoteRowMenu.svelte:284`, `FilesNavigator.svelte:399`, `TypesNavigator.svelte:345`).
  - Confirm title "Move to Trash" and body `Move "${title}" to trash?` (lowercase "trash", `NoteRowMenu.svelte:164-166`), folder body `Move "${name}" to trash? This will include all contents.` (`FilesNavigator.svelte:196`).
  - Dialog text is a sentence, menu label is title case.
- Reveal wording: "Reveal in Finder" (`NoteRowMenu.svelte:268`, `FilesNavigator.svelte:390`, `TypesNavigator.svelte:341`, `:387`). Code calls it `revealInSystemExplorer`. Platform-specific label on a macOS-only app; fine but inconsistent with "system explorer" naming in code.
- Open wording: "Open in new tab" (`NoteRowMenu.svelte:226`), "Open view" (`TypesNavigator.svelte:311`, `RailNoteList.svelte:884`), "Open type definition" (`TypesNavigator.svelte:358`). Row click opens editor for notes; for views "Open view" vs "Open in new tab" differ in the same menu family.
- New wording: "New note" (`FilesNavigator.svelte:82`), "New Canvas" (`:88`) (capital C), "New table" (`:89`) (lowercase t), "New view" (`:357`, `TypesNavigator.svelte:255`), "New folder" (`FilesNavigator.svelte:361`), "New type" (`TypesNavigator.svelte:229`, `:467`), "New here" (`RailNoteList.svelte:813`), "Create a note in this list" (`:812`), "Create a type" (`TypesNavigator.svelte:225`), "Create type definition" (`TypesNavigator.svelte:393`), "Create" (`TypesNavigator` dialog confirm, `:470`).
  - "New table" vs "New view": the same `.view` file is called "table" in the Files menu (`FilesNavigator.svelte:89`, Untitled.view) and "view" everywhere else. Terminology conflict.
  - "Canvas" capitalized, "table" lowercase.
- Capitalization of the sort/filter labels: "Sort", "Filter", "Search notes", "Show in note list", "Multiple sort...", "Reset to default" (`RailSortMenu.svelte:156`, `:182`). Ellipsis is three dots `...`, while other loading strings use `...` too (`RailNoteList.svelte:864`) but "Search notes..." placeholder (`RailListSearch.svelte:98`) and "Search icons..." (`IconPicker.svelte:177`) also `...`. Consistent ASCII dots, not the ellipsis glyph.
- Empty copy tone is inconsistent:
  - "Nothing here" (`RailNoteList.svelte:852`), "No notes here" (`:896`), "No matching notes" (`:892`), "No types yet" (`TypesNavigator.svelte:275`), "No icons found" (`IconPicker.svelte:210`), "No matching properties" (`RailPropertiesPicker.svelte:172`).
- Error copy:
  - "This view cannot be shown" (`RailNoteList.svelte:874`), "This view no longer exists" (`:867`), "Could not create the note" (`RailNoteList.svelte:611`, toast), "Could not save the list" (`:450`), "Could not save the view" (`:331`), "Could not rename "X": reason" (`NoteRowMenu.svelte:139`), "Could not pin the view: message" (`TypesNavigator.svelte:204`), "This view changed. Your edit was not saved." (`RailNoteList.svelte:330`).
  - Mix of "Could not X" and "X failed" wording in logs vs toast; toast strings are sentences ending in period in some places and bare in others.
- Rail labels: "Workspace", "Browse", "Pinned", "Actions" (`Rail.svelte:274`, `:280`, `:288`, `:297`). "Rail top", "Rail navigators", "Rail bottom" in Settings (`LayoutSection.svelte:25-27`). Settings uses "Rail navigators" where the rail uses "Browse". Terminology drift.
- Filter states: "Hide archived", "Show archived", "Only archived" (`RailArchivedMenu.svelte:19-21`). Titles of the archive icon button reuse these labels.
- Collapse vs expand: "Collapse rail" / "Expand rail" (`Rail.svelte:251-252`). Resize: "Drag to resize, double-click to reset" (`:316`).
- Sort default label: "Default" (`RailSortMenu.svelte:122`) vs "Reset to default" (`:182`).
- Icon picker: "Change icon" (`IconPicker.svelte:169`; `NoteRowMenu.svelte:259`; `FilesNavigator.svelte:372`; `TypesNavigator.svelte:335`). "Remove custom icon" (`IconPicker.svelte:317`) vs "Remove" elsewhere. "Custom color", "Custom text color" (`:270`, `:298`). Color rows labeled "Icon:" and "Text:" (`:256`, `:284`). Preset color names "Default, Red, Orange..." are title case.
- Context-menu favorite toggles: "Favorite" / "Unfavorite" (`NoteRowMenu.svelte:263`). Views get "Pin to rail" / "Unpin from rail" (`TypesNavigator.svelte:447-449`). Two different mental models (favorites vs rail pins) for similar actions.
- Copy path submenu: "Copy path" > "Copy absolute path", "Copy relative path" (identical across three menus).
- Untitled defaults: "Untitled.md", "Untitled.canvas", "Untitled.view", folder "Untitled" (`FilesNavigator.svelte:86`, `:88`, `:89`, `:140`).
- Rename dialog: "Rename type" / "Rename" (`TypesNavigator.svelte:489-490`), "New type" / "Create" (`:467-468`). Descriptions: `This will update N note(s)` (`:492`).
- Subtitle and rule copy: `resolved.rule` line (`RailNoteList.svelte:827-829`), uses 11 px raw size.
- Header tooltips: "Search notes" (title and aria-label match), "Filter" (no aria-label, title only), "Create a note in this list" (title) vs aria-label "New here", so the visible-to-hover text and the accessible name differ (`RailNoteList.svelte:812-813`).
- Daily note: header action "Daily note", title "Open or create today's daily note" (`RailNoteList.svelte:621-622`). Curly vs straight apostrophe not an issue here, straight used.
- Rail "Inbox" and "Today" items come from registry; label copy outside scope.

## Summary of most notable facts

1. Only LayoutSection uses shadcn Button; all note-list and navigator row, header and rail buttons are hand-styled raw `<button>`s, so focus rings and hover tints differ across components.
2. Four popover triggers or menu items skip focus-visible rings: sort trigger, properties trigger, filter trigger (`RailNoteList.svelte:774`), and rail collapse toggle (`Rail.svelte:250`).
3. Wikilink pills are `role="link" tabindex="-1"` nested inside a row `<button>` (`NoteRow.svelte:67`, `:113-116`), so keyboard users cannot reach them and the markup is invalid.
4. Note list, Files tree and Types list have no list/tree/listbox roles and no arrow-key navigation (`RailNoteList.svelte:834`, `:899`; `FilesNavigator.svelte:340`).
5. Hover-only affordances: none found. Title-only (no aria-label) icon buttons: Filter (`RailNoteList.svelte:777`), New view (`TypesNavigator.svelte:255`), swatches (`IconPicker.svelte:262`).
6. Loading and error states exist only in RailNoteList (`:862-887`). FilesNavigator has no loading or empty copy; TypesNavigator has "No types yet" but no list error state; errors elsewhere are toast-only.
7. Arbitrary 11 px text (`text-[11px]`) in NoteRow and rule line (`NoteRow.svelte:93`, `:103`, `:114`, `:124`; `RailNoteList.svelte:827`) bypasses the `text-label` token (`app.css:92`).
8. Motion: `transition-*` defaults (150 ms) on nearly every control, with no `prefers-reduced-motion` handling in scope; spinner and pulse animate unconditionally (`RailListSearch.svelte:103`, `Rail.svelte:377`).
9. Colors: raw hex only in IconPicker swatches (`IconPicker.svelte:53-60`); hard-coded `text-white` on rail badges (`Rail.svelte:374`); inline `box-shadow` header dividers on four headers instead of a border token; `color-mix` tint on active rail items (`Rail.svelte:361`).
10. Copy drift: "Move to Trash" (menu) vs "move ... to trash?" (dialog); "New table" vs "view" for the same `.view` file (`FilesNavigator.svelte:89` vs `:357`); "Rail navigators" (Settings) vs "Browse" (rail section title); empty-state copy mixes "Nothing here", "No notes here", "No matching notes" and "No types yet".

Not checked: runtime rendering (no app run), actual contrast ratios, the logic `.ts` files' UI-facing strings beyond those listed, and the shadcn primitive internals (focus and aria behavior comes from bits-ui, not verified here).
