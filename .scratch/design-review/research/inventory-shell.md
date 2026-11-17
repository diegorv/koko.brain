# Inventory: App shell & navigation

Scope: src/routes, src/lib/app, src/lib/features/rail-shell, src/lib/core/layout, src/lib/core/status-bar, src/lib/core/zoom.
Read-only fact gathering. No judgments. Line numbers cite the working tree at review time.

## 1. Components (.svelte) in scope

| Path | Lines | Renders | shadcn/ui primitives used | Custom markup |
|---|---|---|---|---|
| src/routes/+layout.svelte | 7 | root layout wrapper | none | none |
| src/routes/+layout.ts | n/a | route config | none | none |
| src/routes/(app)/+layout.svelte | 187 | app bootstrap, global effects, mounts AppOverlays + AppShell | none | none (logic only) |
| src/routes/(app)/+page.svelte | 72 | start screen: title, Open Vault, recent vaults list | Button (`#lib/components/ui/button`, line 2, used 31) | recent-vault rows (47-64), remove button (56-61) |
| src/routes/composer/+page.svelte | 318 | Quick Capture composer window (textarea-like editor, hints) | none | placeholder (247), hint lines (251-253), inline `<style>` (lines ~255-318) |
| src/lib/app/AppOverlays.svelte | 25 | mounts Toaster, SettingsPanel, pickers, dialogs | none | none |
| src/lib/app/AppShell.svelte | 314 | main three-column shell (Rail, navigator, note list, editor, right sidebar), status bar | Resizable.* (line 12), ScrollArea (line 13) | right-sidebar toggle button (190-196), traffic-light spacers (255-257, 276) |
| src/lib/app/EditorView.svelte | 159 | tab area: EditorTabs, NoteActionBar, per-file-type views, empty state | none | four floating view-toggle buttons (97-149), empty state (154-157) |
| src/lib/app/SettingsPanel.svelte | 162 | right-hand Settings overlay (section nav + content) | Button (96, 151), ScrollArea (97) | section nav buttons (136-143), fixed panel (115-120) |
| src/lib/app/LabsSection.svelte | 52 | Labs settings section (Vault mods switch) | Switch (5) | SettingItem wrapper |
| src/lib/core/layout/SidebarSection.svelte | 72 | right-sidebar collapsible section | Collapsible.* (4) | header via svelte:element (button when collapsible, div otherwise) |
| src/lib/core/status-bar/StatusBar.svelte | 34 | bottom status bar, left and right snippet slots | none | div with scoped `<style>` separator (23-33) |
| src/lib/core/status-bar/SaveStatus.svelte | 24 | "Modified" / "Saved" indicator | none | span + lucide icons |
| src/lib/features/rail-shell/Rail.svelte | 380 | icon rail: Workspace, Browse, Pinned, Actions, bottom groups; collapse toggle; resize handle | none | all rail buttons (358-379), collapse button (248-257), resize handle (312-325) |
| src/lib/features/rail-shell/FilesNavigator.svelte | 502 | Files tree navigator with drag-and-drop, rename, context menus | ContextMenu.* (18) | root row (327-339), folder rows (429-502), rename input (468-477) |
| src/lib/features/rail-shell/TypesNavigator.svelte | 511 | Types/Views navigator with context menus | ContextMenu.* (27) | Views header + "New view" (250-261), type rows (280-301), view rows (400-439), view mark (453-463) |
| src/lib/features/rail-shell/RailNoteList.svelte | 925 | note list pane: header toolbar, search, rule line, grouped list, empty/loading/error states | Popover* (26) | header icon buttons (736-751, 796-818), empty/loading/error states (860-897), "Open view" button (879-886) |
| src/lib/features/rail-shell/RailSortMenu.svelte | 233 | sort popover menu | none in markup (role-based custom menu) | role=menu, menuitemradio rows (143-230) |
| src/lib/features/rail-shell/RailPropertiesPicker.svelte | 177 | "Show in note list" properties popover with drag reorder | Popover* (5), Input (6) | checkbox list (147-156), drag handle span (158-168) |
| src/lib/features/rail-shell/RailArchivedMenu.svelte | 67 | archived filter popover | Popover* (4) | trigger (34-38), option buttons (51) |
| src/lib/features/rail-shell/RailListSearch.svelte | 119 | inline search row for note list | Input (5) | loading spinner (97-106), clear button (108-115) |
| src/lib/features/rail-shell/LayoutSection.svelte | 201 | Settings > Layout section (rail style, badges, sidebar toggles, rail item order/visibility) | Button (4), Switch (5) | ordered list rows with move up/down/visibility (~120-200) |

Non-svelte files in scope with UI-relevant constants: src/lib/features/rail-shell/rail-items.logic.ts (item colors 124-141, RAIL_FALLBACK_COLOR line 135, RAIL_ACTION_COLOR line 141), src/lib/core/layout/layout.logic.ts, src/lib/core/layout/layout.service.ts, src/lib/core/zoom/zoom.service.ts (29 lines, no UI), src/lib/app/rail-navigation.ts.

Notes:
- src/lib/core/zoom has no .svelte file. zoom.service.ts exposes zoomIn/zoomOut/resetZoom only (`ZOOM_LEVELS` line 3, module state `currentZoom` line 5 starts at 1.0, never read back from the window). No zoom indicator in the area. Shortcuts live in src/lib/app/global-keybindings.ts:177-181 (Cmd+=, Cmd+Shift+=, Cmd+-, Cmd+0).
- Tooltips: no Tooltip primitive used anywhere in scope. All tooltips are native `title` attributes.
- Dialogs used from this area (outside scope, mounted here): TypeNameDialog, ViewDialog, IconPicker (RailNoteList:24-ish imports; TypesNavigator 465-511; FilesNavigator 408-427).

## 2. States

### Empty
- EditorView.svelte:154-157: no tab open shows "Select a file to view its contents" (text-sm muted). Only empty state for the editor pane.
- RailNoteList.svelte:894-897: "No notes here" (data-note-list-empty).
- RailNoteList.svelte:890-893: "No matching notes" when searching (data-note-list-no-matches).
- RailNoteList.svelte:850-852 / 675-696: per-group "Nothing here" (data-note-list-group-empty, text-xs).
- TypesNavigator.svelte:274-276: "No types yet" (data-types-navigator-empty), shown only when the type list is empty; the views section above has no empty copy.
- RailPropertiesPicker.svelte:171-173: "No matching properties" (search with no hit).
- FilesNavigator.svelte: no empty branch. A vault with no folders renders only the root row (327-343). No copy.
- Rail.svelte: no empty state (rows are fixed). Not applicable.
- StatusBar/SaveStatus: SaveStatus.svelte:7-11 returns null for no tab or virtual tab, so the save slot renders nothing, with no placeholder.
- Start screen (+page.svelte:36-67): recent list is hidden when empty (no empty copy).

### Loading
- RailNoteList.svelte:862-865: text "Loading..." (plain text, no spinner; data-note-list-loading). Count shows blank while loading (line 725).
- RailNoteList.svelte:187-194, 249: view lens resolves to `loading` status.
- RailListSearch.svelte:97-106: spinner LoaderCircle with animate-spin (line 103) while debouncing or full-text loading.
- Rail.svelte:357, 365, 376-378: busy state shown as `aria-busy` on the row and a pulsing dot (animate-pulse, line 377).
- SaveStatus.svelte:16: "Modified" uses animate-pulse dot.
- Start screen (+page.svelte): no loading state for "Open Vault" (handleOpenVault line 12-14 awaits openVaultDialog with no pending UI).
- AppShell.svelte: no loading UI while the vault initializes. `+layout.svelte:117` gates link fetch on `indexReady` silently.
- EditorView.svelte: no loading UI for tab content.
- SettingsPanel: no loading state.

### Error
- RailNoteList.svelte:872-889: error panel, role="alert", title "This view cannot be shown", message in mono (data-note-list-error-message), plus "Open view" button when a viewPath exists.
- RailNoteList.svelte:866-869: "This view no longer exists" (missing view), no action.
- RailNoteList.svelte:330-332, 448-450, 610, 647: toasts for view/list/note create failures.
- FilesNavigator.svelte:118, 174-176: toast on file operation and rename validation errors.
- TypesNavigator.svelte:202-204: toast on pin write failure.
- TypesNavigator.svelte:406-435: per-view count error shown as a red CircleAlert mark (text-destructive, role=img, aria-label/title with message).
- LabsSection.svelte:21-28: toast on save failure.
- +layout.svelte:81-84: toast on vault init failure, console.error.
- composer/+page.svelte:251-253: inline role="alert" hint for save failures.
- Start screen: no error UI beyond whatever openVaultDialog toasts (not in scope).

### Disabled
- LayoutSection.svelte:174 and :184: move-up and move-down buttons disabled when moveRailItem returns null (edges and Search item). Only disabled state in scope.
- No disabled styling for the Rail, the Types or Files navigators, or the sort menu's "Reset" option.

## 3. Interaction

### Keyboard
- RailSortMenu.svelte:77-96: menu keys ArrowUp/ArrowDown (roving), Home/End, ArrowLeft/ArrowRight (sets asc/desc on focused option), Enter/Space pick. Only in the sort menu.
- RailPropertiesPicker.svelte:91-99: ArrowUp/ArrowDown on checkbox rows.
- RailListSearch.svelte:79-80: Escape closes search (onClose). Enter/ArrowKeys not handled in this file.
- FilesNavigator.svelte:182-190: rename input, Enter confirms, Escape cancels. Blur commits (line 473) with a guard (line 98).
- SettingsPanel.svelte:105-109, 112: window-level Escape closes Settings, even when focus is elsewhere.
- composer/+page.svelte:189-194, 209: Escape dismisses; Cmd/Ctrl+Enter submits. Window keydown (line 239).
- Tree navigators (FilesNavigator, TypesNavigator): no arrow-key navigation. Rows are plain buttons in Tab order.
- Rail.svelte: rows are buttons (Tab order); no arrow-key navigation between items.
- Rail resize handle: tabindex="-1" (Rail.svelte:317). Not keyboard reachable. Double-click resets width (324).
- Sidebar and Settings navigation: no keyboard shortcut for sections in SettingsPanel.
- Global shell shortcuts (global-keybindings.ts): Cmd+1 / Cmd+2 hide/show rail panels (140-141), Cmd+B right sidebar (144), a bare "/" key handler (42, ignored while a modal is open per comment at 36-37), Cmd+= / Cmd+- / Cmd+0 zoom (177-181).

### Focus management
- SettingsPanel.svelte: role=dialog with aria-label (118-119), no focus move on open, no focus trap, no backdrop, no aria-modal. Panel is a fixed overlay right side (115-120) with fly transition.
- RailPropertiesPicker.svelte:120-125: custom focus restore on open (lastFocused, search input).
- RailListSearch: focus restoration on close not checked (file not read in full).
- FilesNavigator.svelte:98: rename blur guard.
- No focus management code in AppShell, EditorView, Rail.

### Hover-only affordances
- +page.svelte:57: remove-from-recent button is opacity-0 until row hover (group-hover) or focus-within. Also has a title and aria-label (58-59).
- RailPropertiesPicker.svelte:158-168: drag handle only shown when the property is selected and not searching.
- Rail.svelte:248-257: collapse button is always visible.

### Drag and drop
- FilesNavigator.svelte:436-452, 327-335: folder rows draggable (except when renaming), drop onto folder moves item via moveItem (line 288). Root row is a drop target (331-333). Drop-target styling: rowClass dropTarget (293-298, outline-dashed).
- FilesNavigator.svelte:283: only text/plain paths inside the tree count as moves.
- RailPropertiesPicker.svelte:144-165: list reorder via drag handle (draggable span) and li dragover/drop. Checkboxes do not drag.
- RailNoteList.svelte:923: note rows draggable (NoteRow lives outside scope).
- Rail.svelte:237-242: window dragstart blocked during rail resize.
- Rail resize: pointer capture on button (Rail.svelte:216-231), width drag with no keyboard.
- AppShell/Resizable: pane splitters via Resizable.Handle (AppShell:236, 252, 266).

### Context menus
- FilesNavigator.svelte:312-404: ContextMenu on tree root (root menu: New file, New view, New folder, folder items) and folder rows (445-452). Items: Change icon, Copy path (absolute/relative), Reveal in Finder, Rename, Move to Trash (destructive, 397-400).
- TypesNavigator.svelte:234-305, 286, 415: ContextMenu on tree area and per row (type rows: menuRow; view rows: menuViewPath). Pin/Unpin to rail via railPinItem (441-451).
- Rail.svelte: no context menu.
- RailNoteList: NoteRowMenu wraps the list (832) (outside scope).

### Tooltips
- Native `title` only. Examples: Rail.svelte:251, 316, 362; RailNoteList.svelte:741, 777, 800, 812; EditorView.svelte:101, 115, 128, 142; TypesNavigator.svelte:225, 255, 457, 467, 489.

## 4. Accessibility

### Icon-only buttons and labels
Has aria-label (and title in most):
- Rail.svelte:248-257 collapse (aria-label + title, data-rail-collapse)
- Rail.svelte:358-368 rail rows (aria-label + title)
- Rail.svelte:312-318 resize (aria-label + title, tabindex -1)
- RailNoteList.svelte:736-751 search toggle (aria-label + title, aria-pressed)
- RailNoteList.svelte:796-806 header action (aria-label + title)
- RailNoteList.svelte:808-818 "New here" (aria-label "New here", title "Create a note in this list")
- RailPropertiesPicker.svelte:104-111 trigger (aria-label + title)
- RailArchivedMenu.svelte:34-38 trigger (aria-label + title)
- RailSortMenu.svelte:107-110 trigger (aria-label + title); ascending/descending buttons aria-label (209, 222), aria-pressed (210, 223)
- RailListSearch.svelte:108-115 clear (aria-label only)
- FilesNavigator.svelte:455-464 folder expand toggle (aria-label + aria-expanded)
- EditorView.svelte:97-149 four floating toggles (aria-label + title)
- SettingsPanel.svelte:151 close (aria-label)
- +page.svelte:56-61 remove recent (aria-label + title)

Title only, no aria-label (icon-only per markup):
- AppShell.svelte:190-196 right-sidebar toggle: `title` only (193), no aria-label. Icon-only (PanelRight, 195). Also no focus-visible class.
- RailNoteList.svelte:774-781 Filter trigger: `title="Filter"` (777), no aria-label; icon-only (780).
- TypesNavigator.svelte:252-260 "New view": `title` only (255); icon-only (259).
- TypesNavigator.svelte:224-226 "Create a type": `title` only (225); markup not read in detail.

Other a11y:
- SettingsPanel.svelte:118-119: role=dialog, aria-label "Settings". Section nav has aria-current (138) but no aria-label on `<nav>` (122).
- Rail.svelte:260-261: `<nav aria-label="Rail">`; rows have aria-current="page" (364), aria-busy (365).
- FilesNavigator.svelte:327-339 root row aria-current (329); folder rows aria-current (482). No tree/treeitem roles. Folder rows: aria-expanded only on the toggle button (459).
- TypesNavigator.svelte:284, 413: aria-current on rows. No role on rows; list of buttons, no list semantics.
- RailSortMenu.svelte:143: role=menu; items role=menuitemradio (195) with aria-checked (196); separators role=separator (148, 154, 170). The "Multiple sort..." row is role=menuitem on a button (174-190).
- RailNoteList.svelte:873: role=alert on error panel. Empty/loading states have no live region.
- RailNoteList.svelte:721: aria-hidden anchor span.
- RailPropertiesPicker.svelte:135: input aria-label; checkbox aria-label (151); drag handle aria-hidden (162); `<ul>` list (138).
- RailListSearch loading span aria-hidden (101).
- Rail.svelte:377: busy pulse dot aria-hidden.
- TypesNavigator.svelte:453-463: viewMark role=img with title and aria-label.
- composer/+page.svelte:247 placeholder aria-hidden; 251-253 role=alert.
- LayoutSection.svelte: aria-pressed on style buttons (60); aria-label on move/show buttons (134, 144, 154, 173, 183, 193).

Non-button elements with click handling:
- Single-line grep for `onclick` on div/span/li/a/section/p/td/tr in scope returned no hits. Multi-line tags not exhaustively checked.
- FilesNavigator.svelte:313-326: contextmenu handler on a div (tree container). FilesNavigator.svelte:436-452: folder row `div` with drag and contextmenu handlers, no click (click is on child button 479-485). Suppressed via `svelte-ignore a11y_no_static_element_interactions` (FilesNavigator.svelte:435).
- TypesNavigator.svelte:237-249: tree container div with contextmenu handler. Views/type rows are buttons.
- RailPropertiesPicker.svelte:140-146: `<li>` with dragover/drop handlers (no click); drag handle span 158-168 is draggable with no keyboard equivalent except the row checkbox arrow keys.
- SidebarSection.svelte:33-44: header renders `<h2>` inside `<button>` when collapsible (heading inside button, phrasing-content violation). Static header is a `div` (not focusable) when not collapsible.

Focus-visible styles:
- Ring pattern `focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset` on rows: Rail.svelte:359, FilesNavigator.svelte:296, TypesNavigator.svelte:281, 410, SettingsPanel.svelte:137, FilesNavigator folder row via has-[button:focus-visible] (437).
- Ring pattern `focus-visible:ring-[3px] focus-visible:ring-ring/50` on icon buttons: RailNoteList.svelte:738, 799, 811; RailArchivedMenu.svelte:34; TypesNavigator.svelte:254; EditorView.svelte:98, 112, 125, 139.
- No focus-visible class: AppShell.svelte:190-196 right-sidebar toggle; Rail.svelte:248-257 collapse button; RailNoteList.svelte:879-886 "Open view" button; RailNoteList sort trigger in RailSortMenu.svelte:107-110 (not checked); RailPropertiesPicker.svelte:104-111 trigger (no focus-visible class; relies on shadcn? not verified); SidebarSection.svelte:38 header button (no focus-visible).
- FilesNavigator.svelte:481 name button uses `focus-visible:outline-none` with no replacement ring on that inner button (ring comes from the parent row via has-[]).
- Rail resize button has tabindex -1.
- Start screen recent-vault row button: no focus-visible class (+page.svelte:49-55); the remove button uses group-focus-within reveal (57).

## 5. Styling

### Raw color values
- src/lib/app/SettingsPanel.svelte:116: `shadow-[-4px_0_12px_rgba(0,0,0,0.15)]` (raw rgba shadow).
- src/lib/features/rail-shell/rail-items.logic.ts:124-131: hex item colors (search #64748b, inbox #3b82f6, today #f97316, favorites #eab308, types #8b5cf6, calendar #f43f5e, files #14b8a6, archive #78716c).
- rail-items.logic.ts:135: RAIL_FALLBACK_COLOR #0ea5e9. rail-items.logic.ts:141: RAIL_ACTION_COLOR #d946ef.
- Composer (src/routes/composer/+page.svelte): inline style uses CSS tokens (var(--popover), var(--primary), var(--muted-foreground), var(--destructive)), no raw hex found in scope.
- Rail `color-mix(in oklch, var(--rail-c) 18%, transparent)` (Rail.svelte:361) for active row tint.
- Theme token definitions: src/app.css:176 `--divider` light oklch(0.88 0.01 100); :237 dark `#383a4f`. --status-bar-height: src/app.css:212 (2rem).

### Hard-coded font sizes
- RailNoteList.svelte:827: `text-[11px]` (only arbitrary size in scope). Token `text-label` is also 11px (app.css:92), so this duplicates a token value.
- Composer inline CSS: `font-size: 14px` (placeholder, composer +page.svelte ~line 285-287) and `font-size: 11px` (hint, ~line 297-303); font-family `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` hard-coded (composer, two places).
- Start screen (+page.svelte): `text-3xl` (28, title line 27), `text-sm`, `text-xs`, `w-[32rem]` (line 37 fixed width).
- Tailwind named tokens used across scope (defined app.css:92-102): text-label (11), text-meta (12), text-rail (13), text-row (14), text-title (15, 600). Also raw Tailwind sizes text-xs (12), text-sm (14), text-lg (18) appear (text-xs: 6 occurrences, text-sm: 7, text-lg: 3).
- Mixed usage: TypesNavigator.svelte:224 uses `text-xs` on the "Create a type" button while its sibling rows use `text-row`/`text-meta`.

### Inline styles
- AppShell.svelte:187: `style:--rail-header-pad` set from railHeaderPad(...) (runtime).
- Box-shadow divider repeated as inline style `box-shadow: inset 0 -1px 0 var(--divider)`: AppShell.svelte:256, 276; EditorView.svelte:154; Rail.svelte:270; RailNoteList.svelte:718; FilesNavigator.svelte:306; TypesNavigator.svelte:218. Same literal in 7 places instead of a class.
- Rail.svelte:250 fixed position `left-[88px]` (collapse button) and `top-[7px]` (AppShell.svelte:191 and Rail.svelte:250, RailNoteList uses `top-[7px]` too): hard-coded traffic-light offsets. Rail.svelte:250 `left-[88px]`.
- Rail.svelte:360-361: style:--rail-c and background-color (color-mix).
- Rail.svelte:374: badge background from --rail-c.
- EditorView.svelte:61, FilesNavigator.svelte:489-493, TypesNavigator.svelte:292, 422: iconColorStyle inline.
- Rail width via style:width (Rail.svelte:259).
- Composer uses `<style>` block; AppShell uses inline `style=` only for box-shadow.
- StatusBar.svelte:23-33: scoped `<style>` with `:global` separators (12px height, 1px width, 0.3 opacity).

### z-index values (all in scope)
- z-40: Rail.svelte:250 collapse button (fixed); SettingsPanel.svelte:116 overlay (fixed).
- z-30: Rail.svelte:314 resize handle.
- z-20: AppShell.svelte:191 right-sidebar toggle (absolute).
- z-10: Rail.svelte:270 sticky strip; EditorView.svelte:98, 112, 125, 139 floating toggles; RailNoteList.svelte header (no z-index read; not checked).
- Popovers/menus use bits-ui portal (no explicit z in scope).

### Spacing and sizing
- Header band height h-10 (40px) used for every pane header: Rail.svelte:270; AppShell.svelte:256, 276; EditorView.svelte:154; RailNoteList.svelte:716 (h-10); FilesNavigator.svelte:305 (h-10). SettingsPanel uses h-14 (56px) for its headers (125, 150). Two header heights in the same shell (40 and 56).
- Rail form constants: FORM_CLASSES in Rail.svelte:98-130 (labeled: row h-7, gap-2, px-2; captioned: w-[72px] tiles, py-2.5; collapsed: p-2). Comment at line 98 says spacings were owner-approved.
- Sidebar section body p-2 (SidebarSection.svelte:50); section headers via pane-toolbar class.
- Note list rows: px-2 py-1 (RailNoteList.svelte:852); group header pt-2 pb-1.
- Navigator rows: FilesNavigator rowClass py-[5px] pr-2 (296); TypesNavigator rows py-[5px] px-2 (281, 410). Rail rows h-7 in labeled form.
- Settings nav width w-48 (SettingsPanel.svelte:122); panel width min(820px,80vw) (116).
- Start screen `w-[32rem]` (+page.svelte:37).

### Custom CSS files
- None in scope (`find` returned no .css or .scss). Styles are Tailwind classes plus scoped `<style>` in StatusBar.svelte (23-33) and composer/+page.svelte. Global tokens in src/app.css.

### Transitions, animations, durations
- SettingsPanel.svelte:117: `transition:fly={{ x: 820, duration: 200 }}`.
- composer/+page.svelte:279: `transition: box-shadow 100ms ease-out`.
- +page.svelte:48, 50, 57: transition-transform (default), transition-colors duration-100 (50), transition-opacity.
- Default Tailwind transition-colors (150ms) on many buttons (Rail.svelte:314; RailNoteList.svelte:738, 774, 799, 811, 881; FilesNavigator; TypesNavigator).
- FilesNavigator.svelte:463, TypesNavigator chevrons: transition-transform, rotate-90.
- animate-pulse: Rail.svelte:377 (busy dot), SaveStatus.svelte:16 (Modified dot).
- animate-spin: RailListSearch.svelte:103.
- prefers-reduced-motion: no handling in scope (grep for `prefers-reduced-motion` in src returns only EventCalendarView.svelte:284, outside scope). The fly transition, animate-pulse, animate-spin, rotate transitions are unguarded.

### Theme tokens used (CSS variables)
- Shell surfaces: bg-tab-bar, bg-rail-bg, bg-list-bg, bg-nav-bg, bg-editor-bg, bg-editor-empty-bg, bg-card, bg-status-bar-bg, text-status-bar-fg, bg-right-sidebar-bg, text-right-sidebar-fg, text-right-sidebar-muted-fg, text-right-sidebar-primary, bg-right-sidebar-accent.
- Settings: bg-settings-dialog-bg, bg-settings-sidebar-bg, text-settings-text, bg-settings-hover-bg.
- File explorer family (file-explorer-*): fg, fg/25, fg/10, fg/85, primary, primary/25, primary/10, accent, accent/50, border, muted-fg, badge-fg, bg (used across Rail, navigators, note list).
- Tab family: tab-text-active, tab-text-inactive, tab-bar.
- Shadcn base: background, foreground, card, popover, primary, muted-foreground, accent, accent-foreground, secondary, destructive, border, ring, muted, input.
- Shell: divider (also border-divider in SidebarSection:50), rail-muted-fg, rail-bg.
- Hover tints are not one token: RailNoteList rows/buttons use `hover:bg-file-explorer-accent` (738, 799, 811, 881); FilesNavigator/TypesNavigator rows use `hover:bg-file-explorer-primary/10` (296, 281, 410); AppShell toggle and Rail collapse use `hover:bg-accent` + `dark:hover:bg-accent/50` (AppShell 191, Rail 250); Rail rows use `hover:bg-file-explorer-fg/10` (359); SidebarSection uses `hover:bg-right-sidebar-accent/50` (38).
- Active tint differs: Rail uses 18% color-mix of the item color (Rail.svelte:361); navigators use `bg-file-explorer-primary/25` (FilesNavigator 295; TypesNavigator 282).

### Icon colors
- Items get per-item colors (rail-items.logic.ts:124-141), tinted via --rail-c (Rail.svelte:360).
- Navigator icons use `text-file-explorer-primary` when active, else `text-file-explorer-muted-fg` (FilesNavigator 489-491, TypesNavigator 292, 422).

## 6. Copy (user-visible strings)

Case and terminology:
- LayoutSection.svelte:51 "Show Inbox count on the rail" (capital I) vs LayoutSection.svelte:62 "Show inbox count on dock" (lowercase) in the same section. Aria at 55 and 66 repeat each.
- Section titles: Rail.svelte:274, 280, 288, 297 ("Workspace", "Browse", "Pinned", "Actions") title case; sections in SidebarSection use "sentence case" per its doc comment (SidebarSection.svelte:6). Right-sidebar titles themselves are passed by callers (not checked).
- Start screen: "Open Vault" (+page.svelte:33) title case; "Recent Vaults" (+page.svelte:40) title case; "Your second brain for personal knowledge" (28) sentence case; "Allowed locations:" (44) sentence case.
- "Select a file to view its contents" (EditorView.svelte:156) sentence case.
- Ellipses: all ASCII "..." (RailNoteList.svelte:864 "Loading...", RailSortMenu.svelte:165 "Multiple sort...", RailListSearch.svelte:90 "Search notes...", RailPropertiesPicker.svelte:134 "Search properties...", composer +page.svelte:247 "Quick capture..."). Consistent but not typographic.
- Empty-state wording varies: "No types yet" (TypesNavigator 275), "No notes here" (RailNoteList 896), "No matching notes" (892), "Nothing here" (852), "No matching properties" (172), "This view no longer exists" (868), "This view cannot be shown" (874).
- Rail vs navigator vs sidebar vs panels: "Toggle Rail Panels" / "Hide Rail Panels" / "Show Rail Panels" (layout.service.ts:7-14 comments; command names defined outside scope); "Show the right sidebar" (LayoutSection:78); "Show the panels" not in UI; "Pin to rail" / "Unpin from rail" (TypesNavigator 445, 448).
- Collapse wording: rail collapse "Collapse rail" / "Expand rail" (Rail.svelte:251-252) vs LayoutSection:70 "Collapse rail" (setting label) and description (32) "Show the small rail with colored icons. The toggle next to the window controls does the same."
- Header action wording: "New here" (aria, RailNoteList.svelte:813) vs title "Create a note in this list" (812). Same button, different verbs/labels. Also "Create a type" (TypesNavigator 225) vs "New type" (467) vs "New view" (255, 357 in FilesNavigator context menu) vs "New folder" (FilesNavigator 361) vs "New file" (via creators). "Create" and "New" both used for creation.
- Title vs aria mismatch in EditorView.svelte:100-101, 114-115, 127-128, 141-142: aria says "Switch to board view" while title says "Board view" (destination label in title), and mode labels differ ("Source mode" vs "Switch to source mode").
- Remove recent: title "Remove from recent" (+page.svelte:58) vs aria "Remove {name} from recent vaults" (59).
- Settings dialog: heading "Settings" (SettingsPanel 126) and aria-label "Settings" (119); close button aria "Close settings" (151).
- Vault mods: label "Vault mods" (LabsSection 40), description (41) "Run JavaScript mods from _system/mods/ in this vault. Mods run with full access to the app and your files. Only enable mods you wrote." Sentences terse vs others.
- Start screen error toast: "Vault initialization failed. Please try reopening the vault." (+layout.svelte:83) uses polite form; other toasts are terse ("Could not save the view", "Could not create the note").
- Composer hint: "Could not save. ⌘↩ retries, ESC cancels." (composer +page.svelte:251) and "Save not confirmed. ⌘↩ saves again, ESC cancels." (253). Uses "ESC" while the app's other text uses "Escape" (keybinding code).
- Status bar: "Modified" / "Saved" (SaveStatus.svelte:15-22), capitalized, no punctuation.
- Filter popover trigger title "Filter" (RailNoteList 777) vs sort trigger aria/title from triggerTitle (RailSortMenu 109-110, not read).
- Settings nav group labels from SETTINGS_SECTION_GROUPS (outside scope).

## 7. Summary for the caller (10 notable facts)

1. Three different hover tints for the same row role: `file-explorer-accent` (note list buttons), `file-explorer-primary/10` (navigators), `accent` (shell toggles), plus the rail's `file-explorer-fg/10`. Active tints also differ (18% color-mix in the rail vs /25 primary in navigators).
2. Header height is 40px (h-10) in every pane, but Settings uses 56px (h-14) headers (SettingsPanel.svelte:125, 150).
3. Shell-wide divider is repeated as an inline style `box-shadow: inset 0 -1px 0 var(--divider)` in 7 places (AppShell 256/276, EditorView 154, Rail 270, RailNoteList 718, FilesNavigator 306, TypesNavigator 218) rather than a class.
4. Motion has no reduced-motion handling in scope: SettingsPanel fly (200 ms, SettingsPanel.svelte:117), animate-pulse (Rail.svelte:377, SaveStatus.svelte:16), animate-spin (RailListSearch.svelte:103).
5. Icon-only buttons without aria-label, title only: AppShell.svelte:190-196 (right sidebar toggle), RailNoteList.svelte:774-781 (Filter), TypesNavigator.svelte:252-260 (New view). Three shell toggles also lack a focus-visible ring (AppShell 191, Rail 250, RailNoteList 879).
6. Empty and error states are inconsistent: FilesNavigator has no empty, loading or error UI; the note list has five distinct states (Loading..., This view no longer exists, error panel with role=alert, No notes here, No matching notes); StatusBar and SaveStatus render nothing when there is no tab.
7. Keyboard model is inconsistent: sort menu has full arrow/Home/End keys (RailSortMenu.svelte:77-96); tree navigators (Files, Types) and Rail rows have no arrow navigation; the rail resize handle is tabindex -1 with pointer-only resize (Rail.svelte:312-325).
8. SettingsPanel is a non-modal fixed overlay with role=dialog but no backdrop, focus move, focus trap or aria-modal; Escape is handled window-wide (SettingsPanel.svelte:105-112).
9. Hard-coded values: traffic-light offset `left-[88px]` (Rail.svelte:250), `top-[7px]` (AppShell.svelte:191, Rail.svelte:250); arbitrary `text-[11px]` (RailNoteList.svelte:827) duplicates the `text-label` token; raw hex item colors in rail-items.logic.ts:124-141 and rgba shadow at SettingsPanel.svelte:116.
10. Copy: the same LayoutSection block mixes "Show Inbox count on the rail" with "Show inbox count on dock" (LayoutSection.svelte:51 vs 62), and the same creation action is called "New here" in aria and "Create a note in this list" in title (RailNoteList.svelte:812-813). Section headers mix title case (Rail.svelte:274-297) with the sentence case rule in SidebarSection.svelte:6.

## 8. Not checked

- Multi-line element tags were not exhaustively scanned for click handlers on non-buttons.
- RailSortMenu trigger focus classes, RailPropertiesPicker trigger focus classes, and TypesNavigator "Create a type" markup (224-226) were not read in full.
- NoteRow, NoteRowMenu, SortPanel, FilterPanel, ViewDialog, TypeNameDialog, IconPicker and the shadcn primitive sources were out of scope and not inspected.
- Contrast ratios were not measured.
- No runtime or browser checks were run (read-only scout).
