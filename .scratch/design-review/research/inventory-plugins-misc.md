# Inventory: Todoist, mods, one-on-one, templates, QueryJS, quick capture, composer

Scope: src/lib/features/todoist-sync, src/lib/plugins/mods, src/lib/plugins/one-on-one, src/lib/plugins/templates, src/lib/plugins/queryjs, src/lib/plugins/quick-capture, src/routes/composer. Facts only, path:line.

## 1. Svelte components (11 in scope + 1 route)

| File | Lines | Renders | shadcn primitives | Custom markup |
|---|---|---|---|---|
| src/lib/features/todoist-sync/TodoistSection.svelte | 208 | Settings section: token input, default label, sync switch, root project picker, context select, folder, interval | Input, Button, Switch, Select (Root/Trigger/Content/Item), SettingItem (core) | `<button>` as inline link (90-95), `<h2>`/`<h3>` headings, `<p>` error (150) |
| src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte | 66 | Dialog with filterable sync log table | Dialog (Root/Content/Header/Title/Description), Button | native `<table>` (50-61), filter buttons with aria-pressed (36-44) |
| src/lib/features/todoist-sync/TodoistSyncStatus.svelte | 31 | Status bar item: icon + text, shown only when sync enabled | none | `<span>` with `title` tooltip (18-23) |
| src/lib/plugins/mods/ModActionPicker.svelte | 194 | Command palette for mod actions; input step; run view with progress bar and log | Command (Dialog, Input, List, Item, Empty), Button | `role="progressbar"` div (111-117), raw `<input>` (153-160), raw `<kbd>` (163), `<details>` (137), raw `<pre>` (139) |
| src/lib/plugins/mods/ModDialogHost.svelte | 210 | Host for mod-spawned dialogs: alert, confirm, prompt, pick, loading | Dialog (Root/Content/Header/Title/Description/Footer), Button, Input, Command (pick), fuzzy-match | raw `<textarea>` (148-157), raw `<label>` (146), spinner icon (112) |
| src/lib/plugins/mods/ModsStatusList.svelte | 168 | Mods list in settings: name, version, state, load ms, enable switch, errors, callback errors, per-mod settings | Switch, Input | raw `<ul>/<li>`, `<details>`/`<summary>` (115-118, 127-130), `<time>` (124) |
| src/lib/plugins/one-on-one/MyPeopleSection.svelte | 77 | Sidebar list "My people": open button, days-since label, "New 1:1" button | none | two raw `<button>` (47-56, 65-74), raw `<div>` rows, lucide icons |
| src/lib/plugins/one-on-one/OneOnOnePicker.svelte | 95 | Command palette to pick a person (Work / Personal groups) | Command (Dialog, Input, List, Group, Item, Empty) | lucide UserIcon (70, 83) |
| src/lib/plugins/templates/TemplatePicker.svelte | 113 | Two-step palette: pick template, then type file name | Command (Dialog, Input, List, Group, Item, Empty) | raw `<input>` (75-81), raw `<kbd>` (85) |
| src/lib/plugins/queryjs/QueryjsSection.svelte | 80 | Settings section: auto-run policy select, clear cache button | Select, Button, SettingItem (core) | raw `<code>` and `<p>` (46-50) |
| src/routes/composer/+page.svelte | 318 | Floating quick-capture window: CodeMirror surface, placeholder, hint line / error hint | none | Svelte `<style>` block (259-317), raw `<div role="alert">` (251, 253) |

Non-Svelte DOM builders in scope (rendered by imperative DOM, not components):
- src/lib/plugins/queryjs/kb-ui.ts (1069 lines): tables, cards, chips, heatmap, yearly calendar, Chart.js host, prev/next table buttons (505-512).
- src/lib/plugins/queryjs/queryjs-block-widget.ts (348 lines): CodeMirror WidgetType for ```queryjs blocks; loading, run, error states.
- src/lib/plugins/quick-capture/composer-editor.ts (158 lines): CodeMirror composer theme, keymap.
- src/lib/plugins/queryjs/kb-api.ts (556), kb-api.v1.ts (739), data-array.ts (358), kb-datetime.ts (231), queryjs.logic.ts (218), queryjs-session.store.svelte.ts (198): no UI markup beyond the above.

Note: `src/lib/plugins/quick-capture/` has no `.svelte` file; the composer UI lives in `src/routes/composer/+page.svelte`.

shadcn usage in scope: 8 of the 11 `.svelte` files import `#lib/components/ui/*` (TodoistSection, TodoistSyncLogDialog, ModActionPicker, ModDialogHost, ModsStatusList, OneOnOnePicker, TemplatePicker, QueryjsSection). TodoistSyncStatus, MyPeopleSection and composer +page.svelte do not. Custom raw markup is used for the mod run view, mod dialog textarea, template name input, MyPeopleSection rows, the composer, and all QueryJS DOM.

Mount points (non-test): TodoistSyncStatus in src/lib/app/AppShell.svelte:53, 308. ModsStatusList, ModDialogHost, ModActionPicker, OneOnOnePicker, TemplatePicker, MyPeopleSection, TodoistSyncLogDialog and TodoistSection are mounted from src/lib/app/* (AppOverlays, SettingsPanel, LabsSection) per grep; not traced line by line.

## 2. States: empty / loading / error / disabled

### Empty
- Rendered: TodoistSyncLogDialog:29-31 "No sync log entries yet." (data-sync-log-empty); :46-47 "No entries match this filter."
- Rendered: ModsStatusList:87-88 "No mods in _system/mods/".
- Rendered: MyPeopleSection:35-38 "Add {ONE_ON_ONE_EVERY_PROPERTY} to a person in {folder} to track 1:1s" (text-xs, muted).
- Rendered: OneOnOnePicker:89-92 "No people found." / "No people available. Add .md files to the people folders."
- Rendered: TemplatePicker:106-110 "No templates found." / "No templates available. Add .md files to _templates/ folder."
- Rendered: ModActionPicker:168 "No actions." (Command.Empty)
- Rendered: ModDialogHost:194 "No items found." (pick dialog)
- Not rendered / missing: TodoistSection has no empty state for the root project select when `rootChoices` is null: only "None (sync off)" is offered (TodoistSection:141-144).
- Not rendered / missing: QueryjsSection has no empty/loading state (it is static, 40-79).
- Not rendered / missing: ModsStatusList has no loading state while a settings read is pending: `{:else if read}` at ModsStatusList:140 renders nothing until the read arrives.

### Loading
- Rendered: TodoistSection:129-131 "Loading..." text on the Load projects button, disabled during load (no spinner).
- Rendered: TodoistSyncStatus:27 spinning RefreshCw when `isSyncing` (animate-spin).
- Rendered: ModDialogHost:110-114 loader icon with `animate-spin` and `dialog.label` for the loading kind.
- Rendered: ModActionPicker:183 "Running" text next to a busy action (row) and run status badge 108.
- Rendered: queryjs-block-widget.ts:118-121 "Building index..." (three ASCII dots), :240-243 "Running query…" (ellipsis char), :203-206 "Query not run yet" (run prompt in manual mode).
- Not rendered: composer save in progress has no spinner or label; `saving` only gates re-entry (+page.svelte:101-110). Only the `saved` box-shadow flash shows (+page.svelte:141, 282-284).
- Not rendered: OneOnOnePicker and TemplatePicker have no loading indicator while the list loads (templatesStore/oneOnOneStore are read directly).

### Error
- Rendered: TodoistSection:53-54 "Add your API token first." (loadError); :149-151 `data-load-error` text in destructive colour.
- Rendered: ModsStatusList:112-113 mod load error message, :115-118 stack trace details; :121-132 "Last callback error (...)" with absolute time.
- Rendered: ModsStatusList:136-139 "Settings unavailable: data.json is {reason}".
- Rendered: ModActionPicker:134-141 run error message plus "Details" stack disclosure.
- Rendered: TodoistSyncLogDialog:33 shows last cycle text (not an error state as such).
- Rendered: composer +page.svelte:250-253 `role="alert"` hints: "Could not save. ⌘↩ retries, ESC cancels." and "Save not confirmed. ⌘↩ saves again, ESC cancels."
- Rendered: queryjs-block-widget.ts:299-330 structured error block (title, collapsible stack, "▶ Run again" retry).
- Rendered: kb-ui.ts:587-591 "Chart error: ..." inline (Chart.js load failure); kb-ui.ts:589 error block styled with rgba(239,68,68,...) inline.
- Visibly not rendered: TodoistSyncStatus shows only the icon in error state and puts the message only in `title` (TodoistSyncStatus:21, 24-25): error text is hover-only.
- Visibly not rendered: ModsStatusList callback errors are shown only with `data-mod-callback-error`; no dismiss (ModsStatusList:121-132).

### Disabled
- TodoistSection:129 Load projects `disabled={loadingProjects}`. This is the only `disabled` attribute in the area (grep across the scope returned no other UI disabled state).
- ModDialogHost: loading dialogs hide the close button (`showCloseButton={dialog.kind !== 'loading'}` 95) and block Esc and outside click (97-98); a cancellable loading dialog shows Cancel (201-205).
- ModActionPicker: Stop button only when status is running (144-146); Close always visible.
- Not present: composer "Save" button (none exists; keyboard only). Template and 1:1 "New" controls have no disabled state.
- Not present: QueryJS run button has no disabled/pending state while the block is running (queryjs-block-widget.ts:207-215 and the loading div at 240-244; `runningContainers` WeakSet at :38 guards re-entry without visual change).

## 3. Interaction

### Keyboard
- ModActionPicker.svelte:64-66 run view stops keydown propagation except Escape, so Enter/Home/End/arrows do not hit Command's handler; :82-88 Enter runs the action with text (IME guard via `e.isComposing`).
- ModActionPicker.svelte:21-24 clears the input text on each new action step.
- ModDialogHost.svelte:74-79 Enter confirms a confirm dialog unless focus is on another button.
- ModDialogHost.svelte:82-87 Enter submits prompt; multiline textarea needs Cmd/Ctrl+Enter (84).
- ModDialogHost.svelte:63-66 Escape dismisses (except loading, :97).
- TemplatePicker.svelte:48-55 Enter creates file in naming step; guarded by `isCreating`.
- TemplatePicker: no Escape handler (relies on Dialog close, :21-25 reset on close).
- OneOnOnePicker: no custom keydown; Command handles arrows/Enter.
- Composer +page.svelte:188-198 window keydown: Escape dismisses (idempotent `dismissing`), Cmd/Ctrl+Enter saves.
- Composer editor: composer-editor.ts (keymap 117-118): Enter inserts newline (not copy-indent), Escape calls onEscape (see :84-86 comment).
- TodoistSection: inputs use Input/Select; no custom shortcuts.
- QueryJS table nav: prev/next buttons are buttons, no keyboard shortcuts (kb-ui.ts:505-512).

### Focus management
- ModActionPicker.svelte:38-42 moves focus to Stop (running) or Close (done/failed) when the run view appears.
- ModActionPicker.svelte:152-160 input step uses `autofocus` attribute; `a11y_autofocus` ignored (151).
- ModDialogHost.svelte:56-61 `onOpenAutoFocus` focuses `initialFocus` (button or field) and marks opened; `markOpened` at :57.
- ModDialogHost.svelte:126, 134, 154, 163, 180, 204: initialFocus bound on OK, confirm, textarea, input, pick input, cancel.
- TemplatePicker.svelte:73-81 `autofocus` on name input; :73 `a11y-autofocus` ignore comment; no focus return after close (dialog default).
- composer +page.svelte:185 `queueMicrotask(() => view?.focus())` after each show; :211 focus on mount.
- MyPeopleSection: no explicit focus handling; rows are plain buttons.

### Hover-only affordances
- MyPeopleSection.svelte:44 row background `hover:bg-file-explorer-accent` (only hover); rows have no focus-visible equivalent (row div has no focus styles).
- MyPeopleSection.svelte:67 "New 1:1" button: `hover:text-file-explorer-fg` only; its text is always visible.
- TodoistSection.svelte:91 link-style button `hover:underline`.
- TodoistSyncStatus.svelte:21 error message exists only in `title` (hover tooltip).
- MyPeopleSection days label: `title` tooltip (59) for last 1:1 date; the date is not visible otherwise.
- queryjs kb-ui.ts:204-205 `cell.title = options.tooltip(item)` (heatmap cell tooltip, hover-only).
- queryjs-block-widget and styles: `.cm-lp-qjs-run:hover` (styles.ts:929) and `.cm-lp-qjs-table-nav-btn:hover:not(:disabled)` (styles.ts:994).

### Drag and drop
- None in scope (grep for draggable/ondrag/ondrop/dragover returned nothing UI-level). Composer window has `data-tauri-drag-region` on root (+page.svelte:241) and `data-tauri-drag-region="false"` on the editor (:243): the window is draggable by its padding, not by an affordance.

### Context menus
- None in scope (no ContextMenu imports or contextmenu handlers).

### Tooltips
- No shadcn Tooltip used in scope (grep for Tooltip returned nothing in the area).
- Native `title` attributes only: TodoistSyncStatus.svelte:21; MyPeopleSection.svelte:50, 59, 68; kb-ui.ts:205 (heatmap cell).
- Button titles on MyPeopleSection are the only tooltips on icon-adjacent controls; "New 1:1" button has visible text (73).

## 4. Accessibility facts

### Icon-only or unlabeled controls
- MyPeopleSection.svelte:47-56 open button: visible name text, has `title="Open {name}"`, no aria-label (redundant with text).
- MyPeopleSection.svelte:65-74 New 1:1: visible text, `title`, icon `Plus` with no aria-hidden.
- TodoistSection.svelte:90-95: link-style `<button>` with text, no aria, opens URL.
- ModActionPicker.svelte:153-160 raw `<input>`: has `placeholder` only; no aria-label (the dialog title is announced, not the field). Same for TemplatePicker.svelte:75-81 (`placeholder="File name..."`, no label).
- ModsStatusList.svelte:104-109 Switch: aria-label "Enable {name}" (105). Per-setting Switch aria-label (148) and Input aria-label (154). Good.
- ModDialogHost.svelte:146 prompt label is a `<label for>`; the prompt Input has `id` (160) and no aria-label; textarea at 150 has `id` and label.
- ModActionPicker progress bar: `role="progressbar"` (113) with aria-valuemin/max/now (114-116) but no accessible name (no aria-label or aria-labelledby). Its label text is a sibling span (121) not associated.
- Icon-only close button in Dialog: shadcn default (not checked in this scope).
- QueryJS table nav buttons (kb-ui.ts:505-512): text "Prev"/"Next", no aria-label.
- queryjs-block-widget.ts:207-215 "▶ Run" and :322-328 "▶ Run again": text labels, no aria-label; `▶` glyph is decorative text.
- Composer +page.svelte:247: placeholder div is `aria-hidden="true"`; editor has `aria-placeholder="Quick capture..."` (composer-editor.ts:125).
- TodoistSyncStatus.svelte:25-27: icon-only state indicator is paired with visible text (`{label.text}` at :29); the tooltip `title` carries the error message.

### Roles and semantics
- `role="alert"` on save hints: +page.svelte:251, 253 (announced).
- `role="progressbar"`: ModActionPicker.svelte:113 (see above).
- `aria-pressed` on filter buttons: TodoistSyncLogDialog.svelte:40 (toggle semantics).
- `aria-label` on Select triggers: TodoistSection.svelte:137 ("Root project"), :173 ("Vault context"). QueryjsSection Select trigger has no aria-label (QueryjsSection.svelte:61).
- Data table in TodoistSyncLogDialog: `<table>` with only `<tbody>` and no `<th>` or `<caption>` (TodoistSyncLogDialog.svelte:50-61); header-less table.
- `<details>` / `<summary>` used for stack traces (ModsStatusList.svelte:115, 127; ModActionPicker.svelte:137-140; queryjs-block-widget.ts:310-318).
- `<time datetime>` for callback error time (ModsStatusList.svelte:124).
- `<kbd>` hints (ModActionPicker.svelte:163; TemplatePicker.svelte:85).
- `<label for>` in ModDialogHost.svelte:146.
- Not used: `aria-live` / `aria-busy` anywhere in scope (grep returned nothing), so the run log and sync status changes are not announced except the two composer alerts.

### Click handlers on non-buttons
- Search of `<div|span|li|tr|td|p ... onclick>` in scope: none.
- Keyboard handler on a `div`: ModActionPicker.svelte:103-104 (`<!-- svelte-ignore a11y_no_static_element_interactions -->`), propagation only, not a click target.
- Row `<div>` in MyPeopleSection.svelte:41-46 has no handler (the buttons inside do).

### Focus-visible
- Shadcn Button (src/lib/components/ui/button/button.svelte:7) and Input (src/lib/components/ui/input/input.svelte:29, 44) carry `focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring`.
- Custom raw inputs use `outline-none` with no ring replacement: ModActionPicker.svelte:154, TemplatePicker.svelte:76. Focus indicator is absent on these fields (the dialog's own field is the only visible focus target).
- ModDialogHost.svelte:151 raw textarea restores `focus-visible:ring-[3px] focus-visible:ring-ring/50` explicitly.
- Raw `<button>` elements in MyPeopleSection (47, 65) use `cursor-default` and no focus-visible class; they rely on the browser default outline.
- QueryJS buttons (kb-ui.ts:505-512, queryjs-block-widget.ts:207, 322) and styles.ts:917-933 (`.cm-lp-qjs-run`) have hover styles only; no `:focus-visible` rule found in the reviewed styles.ts block (877-1001).
- Composer editor: no focus ring rule in composer-editor.ts (theme 31-52).
- Composer root `<div class="composer-root">` has no focus indicator (not focusable itself).

## 5. Styling facts

### Raw hex / rgb / named colours (outside token system)
- kb-ui.ts: default palettes and fallbacks: 30-35 (rgba heat levels), 72-75 (status bg/border rgba), 118 (card border rgba(255,255,255,0.1)), 256, 296-297 (chip defaults), 321, 346 (`color: #fff` badge), 360, 368 (rgba(150,150,150,0.2)), 419 (rgba(255,255,255,0.03)), 481 (2px solid rgba(150,150,150,0.3)), 589 (error rgba(239,68,68,0.9) and bg 0.1), 597-598 (`#fff`/`#000` highlight, rgba(128,128,128,0.3) grid), 788 and 881 (`rgb(61,61,61)` borders), 909, 965 (GitHub-style 5-step palette `#c6e48b` ... `#196127`), 1007 (`#333` / `#ebedf0` empty cell).
- kb-api.v1.ts:438, 440, 454, 494, 500: documented default colours in JSDoc (rgba values; these are public API defaults).
- styles.ts (outside scope but QueryJS-owned rules): 888 `var(--lp-collection-error, #f87171)` and 915 same, 921 `var(--lp-meta-bind-btn-primary-text, white)`.
- mods.logic.ts:231-232: hex validation for mod colour pairs (not styling).
- Composer +page.svelte and composer-editor.ts: no raw colours; uses `var(--popover)`, `var(--popover-foreground)`, `var(--primary)`, `var(--destructive)`, `var(--muted-foreground)`, `var(--muted-foreground)` (+page.svelte:275, 283, 301, 309, 316; composer-editor.ts:34, 43, 49).
- Composer +page.svelte:275 `color-mix(in srgb, var(--popover) 92%, transparent)` and :283 `color-mix(... var(--primary) 60%)` for the saved ring.

### Hard-coded font sizes (arbitrary values or px literals)
- MyPeopleSection.svelte:58 `text-[11px]` (days label); :67 `text-[11px]` (New 1:1 button).
- Composer +page.svelte:303 `font-size: 14px` (placeholder); :310 `font-size: 11px` (hint).
- composer-editor.ts:38 `fontSize: '14px'`; :37 system font stack literal.
- queryjs-block-widget and kb-ui: `font-size: max(11px, 1em)` (kb-ui.ts:785); `0.8125em`, `0.875em`, `1.143em`, `1.2em`, `1.75em`, `0.85em` (kb-ui.ts:128, 133, 202, 209, 283, 308, 338, 346, 389, 589, 753, 848, 860).
- Tailwind scale used elsewhere: `text-xs`, `text-sm`, `text-lg`, `text-meta` (custom, app.css:94-95, 12px), `text-row` (custom, app.css:98-99, 14px).

### Inline styles
- ModActionPicker.svelte:118 `style:width` for progress fill (only Svelte inline style in scope).
- kb-ui.ts: about 60 `style.cssText` assignments (e.g. 112, 118, 122, 128, 133, 191, 202, 209, 227-232, 274, 283, 303, 308, 329, 338, 346, 367-389, 563, 588, 741-901). These are DOM-built inline styles, not Svelte `style=`.
- queryjs-block-widget.ts: no inline style strings in scope.

### z-index
- None set in scope (no `z-` arbitrary or `zIndex` in the area). Dialog layering comes from shadcn components.

### Spacing and radius (literal values in scope)
- Composer: padding `14px 16px 10px` (+page.svelte:273), `border-radius: 12px` (:278), `backdrop-filter: blur(20px)` (:276), hint `padding-top: 6px` (:308), `.placeholder` 14px line-height 1.5 (:304).
- ModDialogHost.svelte:94 `sm:max-w-md`; :151 `min-h-24 px-3 py-2`.
- TodoistSyncLogDialog.svelte:24 `sm:max-w-[720px]`, :49 `max-h-[60vh]`.
- ModActionPicker.svelte:128 `max-h-64`, :139 `max-h-48` (stack pre).
- MyPeopleSection rows: `gap-1`, `px-2 py-1`, `pr-1`.
- ModActionPicker run view: `p-4`, `gap-3`, `p-2`.
- ModsStatusList: `px-4`, `py-1`, `gap-0.5`, `gap-4`, `h-7 max-w-56` (Input, line 153).
- TodoistSection: `w-44` (Select triggers at 137, 173), `w-24` (interval Input 200).

### Custom CSS files
- None in the scope directories (`find` for *.css returned nothing). Composer uses a Svelte `<style>` block (+page.svelte:259-317), with `:global(html, body)` transparent background (:260-266).
- QueryJS CSS lives in src/lib/core/markdown-editor/extensions/live-preview/styles.ts (outside scope), keyed by `.cm-lp-qjs-*` (lines 877-1001).

### Transitions and animations
- ModActionPicker.svelte:118 `transition-[width]` (no duration; Tailwind default).
- MyPeopleSection.svelte:67 `transition-colors` (Tailwind default duration).
- composer +page.svelte:279 `transition: box-shadow 100ms ease-out`.
- composer +page.svelte:12 `SAVE_FLASH_MS = 180` (flash of the saved ring, timed in JS at :144).
- Spinners: TodoistSyncStatus.svelte:27 `animate-spin`; ModDialogHost.svelte:112 `animate-spin`.
- Timers: sync-scheduler.service.ts uses setTimeout (95, 166, 186); mods-host.service.ts 629-685 setTimeout sets; queryjs-block-widget.ts:54 setTimeout(0) after rAF.
- `prefers-reduced-motion`: not referenced anywhere in scope. Global search under src found it only in src/lib/features/event-calendar/EventCalendarView.svelte; src/app.css contains none. None of the spinners, width transition, or the composer flash check reduced motion.

### Theme tokens used
- shadcn tokens: `text-muted-foreground` (28 uses), `text-destructive`, `text-primary`, `text-foreground`, `bg-primary`, `bg-muted`, `border-input`, `border-ring`, `border-border`, `ring-ring/50`, `bg-input-bg` (ModDialogHost:151), `text-warning` (MyPeopleSection:58), `text-success` (ModDialogHost:21, 107 via ALERT_ICON_CLASSES).
- Custom file-explorer tokens (defined app.css:177-182 light, 240-246 dark): `text-file-explorer-muted-fg` (MyPeopleSection:36, 58, 67), `bg-file-explorer-accent` (MyPeopleSection:42), `hover:bg-file-explorer-accent` (:44), `text-file-explorer-fg` (:67). The one-on-one sidebar reuses the file-explorer token namespace.
- Settings token: `text-settings-text` (ModsStatusList.svelte:95; defined app.css:263 dark).
- Custom text sizes: `text-meta` (12px), `text-row` (14px) from app.css:94-99.
- Composer uses raw CSS vars `--popover`, `--popover-foreground`, `--primary`, `--destructive`, `--muted-foreground`.
- QueryJS block styles use `--lp-collection-border`, `--lp-collection-error`, `--lp-collection-loading` (styles.ts:883, 888, 937, 960, 987), `--lp-wikilink` (942), `--lp-meta-bind-btn-primary-text` (921). Cross-feature reuse of collection and meta-bind tokens.
- `--syntax-active-line-gutter` used by editor theme (src/lib/core/markdown-editor/setup/editor-theme.ts:67): outside scope.

### Dark mode
- Composer applies dark via `document.documentElement.classList.contains('dark')` (+page.svelte:50-52) and reconfigures the editor theme (composer-editor.ts:154-157).
- kb-ui.ts:596, 1006 check `dark` class and pick colours in JS (heatmap, chart grid). Hex literals switch by theme (kb-ui.ts:597, 1007).

## 6. Copy inventory (user-visible strings)

### Case and casing
- Dialog titles mix styles: "Todoist sync log" (TodoistSyncLogDialog.svelte:26, sentence), "1:1 Note" (OneOnOnePicker.svelte:57, mixed), "New File from Template" (TemplatePicker.svelte:69, Title Case), "New File Name" (TemplatePicker.svelte:69, Title Case).
- Dialog descriptions: "Select a person" (OneOnOnePicker:58), "Select a template" (TemplatePicker:70), "Pick an action to run" (ModActionPicker:100), "Enter the name for the new file" (TemplatePicker:70), "Progress and log of the action" (ModActionPicker:100). Imperative vs noun phrase mix.
- Setting labels: "API token", "Default label", "Sync with Todoist", "Root project", "Include Inbox", "Vault context", "Sync folder", "Sync interval", "Auto-run policy", "Clear cache" (sentence case, consistent).
- Section headings: "Todoist" (TodoistSection:71), "Sync" (:112), "QueryJS" (QueryjsSection:45).
- Button labels: "Load projects" (TodoistSection:130), "Loading..." (:130), "Clear" (QueryjsSection:77), "Stop" / "Close" (ModActionPicker:145, 147), "Cancel" / "OK" (ModDialogHost:126, 131, 170, 171, 199, 204), "New 1:1" (MyPeopleSection:73), "▶ Run" (queryjs-block-widget.ts:211), "▶ Run again" (:328).
- Status labels: "Running", "Done", "Failed", "Cancelled" (ModActionPicker.svelte:9-14); "Loaded", "Error", "Disabled" (ModsStatusList.svelte:15-19).
- Filter labels: "All", "Cycles", "Events" (TodoistSyncLogDialog.svelte:8-12).
- Context options: "Work", "Personal" (TodoistSection:18-21). Policy options: "First open", "Always", "Manual" (QueryjsSection:9-25): sentence case.

### Ellipsis and punctuation
- Three ASCII dots: "Loading..." (TodoistSection:130), "Building index..." (queryjs-block-widget.ts:120), "Pick an action..." (ModActionPicker:166), "Search items..." (ModDialogHost:177), "Search templates..." (TemplatePicker:92), "Select a person..." (OneOnOnePicker:60), "File name..." (TemplatePicker:77), "Quick capture..." (composer +page.svelte:247; composer-editor.ts:125), "Paste your token here" (no ellipsis), "e.g. inbox" (TodoistSection:107).
- Unicode ellipsis: "Running query…" (queryjs-block-widget.ts:242), "Query not run yet" has none.
- Mixed: ASCII "..." in 6 strings vs "…" in 1 string within the same feature area.
- Arrows and symbols: "Todoist Settings → Integrations → Developer" (TodoistSection:76) uses arrows; "ESC cancels · ⌘↩ saves" (+page.svelte:255) uses middle dot and symbols; mod hint "Press Enter to run, Esc to cancel" (ModActionPicker:163); composer hint "ESC" uppercase (+page.svelte:251, 253, 255) vs "Esc" (ModActionPicker:163, ModDialogHost comments). Two spellings of the same key name.
- Dash/period: "Could not save. ⌘↩ retries, ESC cancels." (+page:251) vs "Save not confirmed. ⌘↩ saves again, ESC cancels." (+page:253). Different verbs for retry.

### Terminology drift
- "Cancel" vs "Stop" vs "Close" for running operations: ModDialogHost uses Cancel (loading, :204), ModActionPicker uses Stop for running and Close for finished (:145, 147), composer uses ESC cancels (:255).
- "Stack trace" (ModsStatusList.svelte:116, 128) vs "Details" (ModActionPicker.svelte:138) for the same disclosure of an error stack.
- "could not" vs "cannot" vs "Failed to": "Could not save the setting for {name}" (ModsStatusList:30), "Could not save ..." (composer:251), "Could not read the Todoist sync log." (sync-log.service.ts:27), "Failed to create 1:1 note." (OneOnOnePicker:48, MyPeopleSection:30, one-on-one.service.ts:117), "Failed to create file from template." (TemplatePicker:44), "cannot save ..." (mods-host.service.ts:976), "Failed to load templates" (log only).
- "1:1" vs "one-on-one": code and UI use "1:1" (MyPeopleSection:73, OneOnOnePicker:57); the setting key and feature folder use "one-on-one" (not user-visible). "My people" lens label (one-on-one-today.service.ts:15) vs "people folders" (OneOnOnePicker:92) vs "the work people folder" (MyPeopleSection:37).
- "template" vs "Template" in titles and copy: "Add .md files to _templates/ folder." (TemplatePicker:109) uses a folder path; "help/documentation/13-queryjs.md" (QueryjsSection:49) is a repo path shown to the user.
- "Sync now" (palette, sync-scheduler.service.ts:138) vs "Load projects" vs "Sync with Todoist" (TodoistSection:115) vs "Todoist sync log" (TodoistSyncLogDialog:26).
- "Query" vs "block" vs "queryjs" vs "QueryJS": QueryjsSection:45-49 ("QueryJS" heading, "```queryjs", "QueryJS query", "query" in policy text), queryjs-block-widget "Query not run yet", "Running query…".
- Toast copy: "Open a vault before capturing" (quick-capture.service.ts:106), "Open a vault to see its Todoist sync log." (sync-log.service.ts:20). Both imperative, consistent.

### Long or dense copy
- TodoistSyncLogDialog.svelte:27: "Newest first: one row per sync cycle, plus conflicts, detached and frozen tasks, skipped lines and command errors." (one long sentence for the dialog description).
- TodoistSection.svelte:166: "A work vault sends new tasks with no context label, so the webhook adds Work. A personal vault sends them with the label personal." Mechanism explained inside the setting description; mentions "webhook" which the user does not configure in-app.
- TodoistSection.svelte:76: "Exclude .kokobrain from sync tools." appended to a token description.
- QueryjsSection.svelte:18: "A result stays cached until a note is saved or changes on disk." (long description for the Always policy).
- QueryjsSection.svelte:23: "Never auto-execute. Use ▶ Run on each block." (glyph in copy).

### Exposed internal identifiers and paths
- QueryjsSection.svelte:49 shows "help/documentation/13-queryjs.md" and identifiers `kb.pages`, `kb.view`, `kb.ui`, `DataArray`, `KBDateTime`.
- TemplatePicker.svelte:109 shows `_templates/`; ModsStatusList.svelte:88 shows `_system/mods/`; ModsStatusList.svelte:138 shows "data.json is {reason}".
- mods-host.service.ts:720 and 976 show `${MODS_DIR}/${folder}` paths in toasts.
- ModsStatusList.svelte:138 raw reason string.

### Toasts (user-visible)
- ModsStatusList.svelte:30 "Could not save the setting for {name}".
- mods-host.service.ts:176, 470, 720, 769, 976 template strings `${name}: ... failed: ${message}` (error text passed through).
- OneOnOnePicker.svelte:40 shows raw error `message` in a toast (not a fixed string).
- sync-scheduler.service.ts:144-145, 261, 275 use `toast.success/error/warning` with `duration: Infinity` and `closeButton: true` (persistent toasts).
- todoist-sync.service.ts:70-71 palette-triggered toast.

## 7. Other facts worth knowing for the design review

- Sync status bar: TodoistSyncStatus renders only when `settingsStore.todoist.syncEnabled` (TodoistSyncStatus.svelte:17). Error text is only in `title` (21).
- Mod picker run view auto-closes quick actions via `closesWhenDone` (ModActionPicker.svelte:50-52).
- Mod dialogs are a single queue: only `modDialogsStore.current` renders (ModDialogHost.svelte:26), with `{#key dialog.id}` (91) resetting state per dialog.
- Composer window: `saved` flash via box-shadow (+page:282-284), hint line switches between three states (250-256); no visible state for "text queued to write" or "saving" beyond the flash.
- Composer draft is stored in localStorage (+page.svelte:16, 56-71), with a 3000 ms result timeout (:14) and a 180 ms save flash (:12).
- QueryJS policy copy describes three policies (QueryjsSection.svelte:9-25); the default and first-open behaviour are not shown on the block itself beyond "Query not run yet" and "Building index...".
- MyPeopleSection overdue state: `text-warning` only, no icon (MyPeopleSection.svelte:58, `data-overdue`).

## 8. Not checked (limits of this scout pass)
- Shadcn Dialog close button and Command item focus styles were not read (components under src/lib/components/ui/command, dialog were not opened).
- Mount sites in src/lib/app/* were located by grep only, not read.
- styles.ts QueryJS rules were read only in lines 877-1001 (partial, via grep).
- No runtime rendering; all statements are from source.
