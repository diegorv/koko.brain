# Inventory: Editor & live preview (fact sheet)

Scope: `src/lib/core/markdown-editor` (incl. `extensions/live-preview`), `src/lib/features/note-action-bar`, `src/lib/plugins/table-of-contents`, `src/lib/plugins/word-count`, `src/lib/features/copy-block-link`. Plus the editor shell `src/lib/app/EditorView.svelte` (mounts the bar, tabs, empty state) and `src/lib/app/AppShell.svelte` (mounts TOC panel and word count). Read-only facts; no judgement.

## 1. Svelte components in scope

| File | Lines | Renders | shadcn/ui primitives | Custom markup |
|---|---|---|---|---|
| `src/lib/core/markdown-editor/MarkdownEditor.svelte` | 762 | CodeMirror host `div` (l.172) + right-click ContextMenu (l.175-202) | `ui/context-menu` (`ContextMenu.Root/Trigger/Content/Item/Separator/Shortcut`) | Host div with `oncontextmenu` (l.171-172, `svelte-ignore a11y_no_static_element_interactions`). No own markup otherwise. |
| `src/lib/core/markdown-editor/EditorTabs.svelte` | 119 | Tab strip (l.44-113), one tab per open file | `ui/context-menu` | Tabs are custom `div role="tab"` (l.51-62), close `button` (l.86-93) |
| `src/lib/features/note-action-bar/NoteActionBar.svelte` | 236 | Per-note action bar: breadcrumb, hub button, icon buttons, "More" menu | `ui/dropdown-menu` (Root/Trigger/Content/Item/Separator) | Icon buttons via string class `iconButton` (l.115-116); hub button (l.134-144); divider snippet (l.119-121) |
| `src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte` | 82 | Heading list inside right-sidebar section | `ui/separator` **imported but unused** (l.4); uses shared `core/layout/SidebarSection.svelte` (l.7, l.46) | Heading rows are `button` (l.55-64), inline style for indent (l.58), scoped CSS `.toc-indent-lines` (l.71-81) |
| `src/lib/plugins/word-count/WordCount.svelte` | 46 | Status-bar text "N words / N characters / N min read" (l.33) | none | `span` with scoped `.sep` divider (l.36-45) |

Non-Svelte DOM-building widgets (CodeMirror `WidgetType`, no shadcn):
- `extensions/live-preview/widgets.ts` (1127 lines): TaskCheckboxWidget (l.28), list markers (l.60, l.82), ImageWidget (l.133), MediaWidget (l.189), table cell renderer (l.229-335), TableWidget (l.372, add buttons l.468-491), WikilinkImageEmbedWidget (l.592), WikilinkNoteEmbedWidget (l.652), meta-bind select (l.764-823), meta-bind text input (l.964-1000 and builder l.1039-1127), meta-bind toggle (l.1002).
- `extensions/live-preview/widgets/code-block-widget.ts` (183): header, language `select` (l.147-170), Copy button (l.89-103).
- `extensions/live-preview/widgets/mermaid-widget.ts` (136), `widgets/math-widget.ts` (77), `widgets/meta-bind-button-widget.ts` (143).
- `extensions/live-preview/plugins/callout-field.ts` (271): fold toggle span (l.26-36), type switcher with popover (l.54-120).
- `extensions/live-preview/plugins/table-field.ts` (69), `plugins/frontmatter-field.ts` (no WidgetType; hides lines via `hiddenLineDeco`).
- Non-component files with UI strings: `setup/editor-theme.ts` (93), `extensions/live-preview/styles.ts` (1006, all CSS-in-JS), `extensions/composition-aware-bracket-matching.ts` (168).
- Logic/service files: `note-action-bar.service.ts`, `note-action-bar.logic.ts` (121), `note-action-bar-actions.store.svelte.ts`, `copy-block-link.service.ts` (73), `word-count.logic.ts` (20), `toc.logic.ts` (93), `toc.service.ts` (25), `toc.store.svelte.ts` (27).

Shell components that host these (outside scope, for placement):
- `src/lib/app/EditorView.svelte`: mounts EditorTabs (l.67), NoteActionBar only for markdown notes (l.68-70), MarkdownEditor (l.93), floating view-toggle buttons (l.95-151), empty state (l.153-158).
- `src/lib/app/AppShell.svelte`: TableOfContentsPanel (l.282), WordCount inside StatusBar right slot (l.310).

## 2. States

### Empty
- No tab open: EditorView.svelte:153-157 shows a bar (`h-10`, inline `box-shadow`, l.154) and `<p>Select a file to view its contents</p>` (l.156). Only explicit empty state with copy in scope.
- TOC: "No headings found" (TableOfContentsPanel.svelte:50). Non-markdown tab: "Not available" (l.48). Both `text-meta` `px-2 py-4`.
- Tabs strip: not rendered when no tabs (EditorTabs.svelte:44).
- NoteActionBar: not rendered unless active tab is a markdown note (EditorView.svelte:68). Hub button absent when no hub action (NoteActionBar.svelte:134).
- WordCount: hidden for non-markdown or virtual tabs (WordCount.svelte:11-15, 32). For an empty note it shows "0 words", no empty copy.
- MarkdownEditor: no empty-document affordance (no placeholder extension found in scope).
- Math: empty formula renders "Empty math expression" in `cm-lp-math-error` (math-widget.ts:39-40).
- Mermaid: empty source renders "Empty mermaid diagram" (mermaid-widget.ts:84-85).
- Collection/QJS empty classes exist in CSS only: `.cm-lp-collection-empty` (styles.ts:630-632), `.cm-lp-collection-null` (l.617).

### Loading
- Embed: "Loading…" text, unicode ellipsis (widgets.ts:701), styled only by inheritance.
- Mermaid: no loading text; `diagramEl` stays empty until the async `render` resolves (mermaid-widget.ts:80-86, 97-108).
- Image widget: no loading or error state; no `onerror` handler anywhere in scope (widgets.ts:133-186).
- Loading classes for collection and QJS exist in CSS: `.cm-lp-collection-loading` (styles.ts:625-628), `.cm-lp-qjs-loading` (l.936-939).
- WordCount is debounced 500 ms (WordCount.svelte:17-29, timer l.26), so the numbers lag edits; initial `readingTime = 1` (l.9).
- Tab switch: no loading indicator in scope; scroll restore runs in nested rAF chains (MarkdownEditor.svelte:536-570, `restoreTabScroll`, `requestAnimationFrame`).

### Error
- Embed not found: `"<target>" not found` with `cm-lp-embed-error` (widgets.ts:715-716); image embed not found: text replaces the wrapper (widgets.ts:615-616) with `cm-lp-image-missing` class (l.615).
- Embed load failure: `Failed to load "<target>"` (widgets.ts:722-723).
- Image file missing: class `cm-lp-image-missing` added (widgets.ts:175) but **no CSS rule** for it in `styles.ts` (grep found none). Browser broken-image rendering applies.
- Mermaid error: `Mermaid error: <message>` with `cm-lp-mermaid-error` (mermaid-widget.ts:113-117).
- Math error: falls back to raw formula text in `cm-lp-math-error`, no message (math-widget.ts:62-64).
- Meta-bind button config error: `Invalid button: <reason>` in `cm-lp-meta-bind-button-error` (meta-bind-button-widget.ts:69-70).
- Meta-bind input validation: inline `span.cm-lp-meta-bind-input-error` (widgets.ts:1065-1082) plus `cm-lp-meta-bind-input-invalid` wrapper class; refused write toasts (widgets.ts:909).
- Toasts (svelte-sonner): MarkdownEditor.svelte:327 "Could not copy to the clipboard.", :368 "Could not paste from the clipboard."; note-action-bar.service.ts:28, 38, 62, 83 (reveal, copy, deeplink, create linked note); copy-block-link.service.ts:39, 61 "Failed to copy link to clipboard."; meta-bind-button-widget.ts:132, 141 ("Button cannot open ...").
- Code copy failure: `navigator.clipboard.writeText(...).then(...)` has no `.catch` (code-block-widget.ts:92-100). No feedback on failure.
- Wikilink click failure: `reportError` to console only (wikilink-navigation.ts:34, 64; click-handler.ts:38; widgets.ts:295).
- Not in scope: NoteActionBar "More" error paths are logged only (NoteActionBar.svelte:111-113).

### Disabled
- ContextMenu Cut and Copy disabled when no selection (MarkdownEditor.svelte:735, 739). Paste, Select all, Copy block link/embed are never disabled (l.743-758).
- Language/meta-bind placeholder option `disabled` (widgets.ts:776-781).
- Disabled-state CSS for QJS table nav: `.cm-lp-qjs-table-nav-btn:disabled` (styles.ts:997).
- NoteActionBar: no disabled states at all (lifecycle buttons stay enabled).
- EditorTabs, TOC, WordCount: no disabled states.

## 3. Interaction

### Keyboard
- EditorTabs: Enter and Space switch tab (EditorTabs.svelte:61). No arrow-key navigation, no Delete or close shortcut in component.
- MarkdownEditor keymaps: copy block link `Mod-Shift-l` (setup/editor-extensions.ts:37, 152-154); `Mod-d` filtered out of search keymap so global Favorite handles it (editor-extensions.ts:160-162).
- Global bindings used by the bar: Cmd+D favorite (`app/global-keybindings.ts:193-197`), Cmd+E organized (l.199-203), Cmd+\ toggle source (l.185-188, `Backslash`).
- Meta-bind text input: Enter commits, Escape reverts and blurs (widgets.ts:1111-1121).
- Callout type popover: no keyboard handling (no Escape, no arrow keys) (callout-field.ts:54-120).
- Code language `select`: native (code-block-widget.ts:147-170). Native `select` has no `aria-label`.
- Meta-bind button: `click` handler (meta-bind-button-widget.ts:33-40), keyboard-operable.

### Focus management
- MarkdownEditor calls `view.focus()` at l.376, 414, 543, 610 (pending scroll, mouse, and tab flows).
- Editor outline removed: `editor-theme.ts:26` (`&` outline none) and `:29` (`&.cm-focused` outline none). No replacement ring on the editor surface itself.
- Live-preview active-line fill cleared with `!important` (styles.ts:83-; comment l.65-82).
- EditorTabs scrolls active tab into view (EditorTabs.svelte:37-41).
- Meta-bind input and select: focus styles present (see §5).

### Hover-only affordances (not visible without pointer)
- Table `+col` and `+row` buttons: opacity 0, visible on `.cm-lp-table-wrapper:hover` at 0.6 (styles.ts:411-433; widgets.ts:448-453 comment). Buttons remain focusable at opacity 0.
- Code block Copy: `opacity: 0` until `.cm-lp-codeblock:hover` (styles.ts:345-361).
- Tab close button: `opacity-0`, shown on `group-hover` and `group-focus-within` (EditorTabs.svelte:87-88).
- Callout fold: opacity 0.6, 1 on hover (styles.ts:478-489).
- Embed block hover tint `.cm-lp-embed:hover` (styles.ts:651-653).
- Callout type label hover background (styles.ts:507-511).

### Context menus
- Editor body: Cut, Copy, Paste, Select all, Copy block link (shows `formatShortcut` label), Copy block embed (MarkdownEditor.svelte:175-202).
- Tab: Pin/Unpin, Close tab (hidden for pinned tabs) (EditorTabs.svelte:98-109). No keyboard hints.
- NoteActionBar: no context menu; "More" dropdown (`align="end"`, `w-56`) holds folded actions, Copy deeplink, Archive/Restore, Delete (NoteActionBar.svelte:187-221).

### Drag and drop
- No custom DnD in scope. CodeMirror `dropCursor()` enabled (setup/editor-extensions.ts:134). Mouse-selection `dragstart` release handler (live-preview/core/mouse-selecting.ts:52).

### Tooltips
- No shadcn Tooltip used in scope (grep for `Tooltip` returns nothing). Native `title` only: NoteActionBar (l.148, 157, 175, 188), EditorView toggles (l.101, 115, 128, 142), TOC rows `title={heading.text}` (TableOfContentsPanel.svelte:59), table add (widgets.ts:472, 488), callout label (callout-field.ts:71), meta-bind button (meta-bind-button-widget.ts:26), meta-bind select and inputs (`control.title = key`, widgets.ts:757).

### Click handlers on non-button elements
- Callout fold `span` with `mousedown` only, no role or keyboard (callout-field.ts:26-34).
- Embed header `div` with `mousedown` only (widgets.ts:675-681).
- Wikilink in table cell: `a href="#"` with `mousedown` only (widgets.ts:336-353).
- Task checkbox `input type=checkbox`: `mousedown` only, no `click` or `change` listener (widgets.ts:37-50); `preventDefault` on mousedown.
- EditorTabs tab `div role="tab"`: `onclick` and `onkeydown` (EditorTabs.svelte:57-61).
- MarkdownEditor host `div` with `oncontextmenu` (MarkdownEditor.svelte:172).

### Mousedown-only controls (keyboard cannot activate)
- Code block Copy (code-block-widget.ts:89-99).
- Callout type label and every option (callout-field.ts:67-98), fold toggle (l.30-34).
- Task checkbox (widgets.ts:41-50).
- Embed header (widgets.ts:678-681).
- Table-cell wikilink (widgets.ts:340-352).
- Meta-bind select stops propagation on mousedown but uses native `change` (widgets.ts:804-816), so it is keyboard-operable.

## 4. Accessibility facts

### Icon-only buttons
- NoteActionBar: favorite (l.146-154, `aria-label`, `title`, `aria-pressed`), organized (l.155-167, same), raw/source toggle (l.173-181, same), inline actions (l.224-236, `aria-label`, `title`, `aria-pressed` optional), "More" trigger (l.188, `title` + `aria-label`). All labelled.
- EditorTabs close button: `aria-label="Close {tab.name}"` only, no `title` (EditorTabs.svelte:86-93).
- Table add buttons: text `+`, `title` only, no `aria-label` (widgets.ts:468-491).
- Callout fold: `span` with text glyph, no `aria-label`/role (callout-field.ts:26-29).
- Callout type label: `button` with `title` only; text is type name (callout-field.ts:67-71).
- Code block language `select`: no label (code-block-widget.ts:147).
- Meta-bind select and inputs: `aria-label` = bind key, `title` = bind key (widgets.ts:756-757); the text input has no `aria-invalid` or `aria-describedby` linking the error span (widgets.ts:1049-1127).
- EditorView floating toggles (kanban, canvas, collection, generic): `aria-label` and `title` (EditorView.svelte:97-149).
- Meta-bind button: visible label, `title` tooltip (meta-bind-button-widget.ts:24-26).

### Roles and semantics
- EditorTabs: `role="tablist"` (l.45), `role="tab"` on every tab with `tabindex="0"` (l.57-58), `aria-selected` (l.59). No `aria-controls`, no roving tabindex, no `aria-label` on the tablist. Close button nested inside the `role="tab"` element.
- NoteActionBar: breadcrumb is plain `span`s; chevron `aria-hidden` (l.130); divider `aria-hidden` (l.120).
- TOC: plain `button` rows; no `aria-current`, no active-heading state (TableOfContentsPanel.svelte:53-64). No scroll-spy in toc.store or toc.logic.
- WordCount: no `aria-live`, no role.
- Code block copy feedback ("Copied!" for 1500 ms, code-block-widget.ts:96-99): no `aria-live`.

### Focus-visible styles
- Present: `.cm-lp-meta-bind-btn:focus-visible` box-shadow ring (styles.ts:734-736); `.cm-lp-meta-bind-select:focus` border and box-shadow (l.712-714); `.cm-lp-meta-bind-input:focus` (l.795-798); EditorView floating toggles `focus-visible:ring-[3px]` (EditorView.svelte:98, 112, 125, 139).
- Absent: NoteActionBar `iconButton` has no `focus-visible` rule (NoteActionBar.svelte:115-116); EditorTabs has none (EditorTabs.svelte:51-62); `.cm-lp-task-checkbox` (styles.ts:231-250); `.cm-lp-codeblock-copy` (l.345-361); `.cm-lp-table-add` (l.411-433); `.cm-lp-callout-fold`, `.cm-lp-callout-type-label`, `.cm-lp-callout-type-option` (l.478-545); TOC rows (TableOfContentsPanel.svelte:57).
- Editor surface: outline removed (editor-theme.ts:26, 29).

### Reduced motion
- No `prefers-reduced-motion` handling in scope. Only occurrence in `src/lib` is `features/event-calendar/EventCalendarView.svelte:284`.

## 5. Styling facts

### Raw colors (hex, rgb) in scope
- `parsers/callout.ts:45`: fallback `'#60a5fa'` for an unknown callout type.
- `styles.ts:141`, `:562`, `:569`: fallback `#6c7086` after theme tokens.
- `styles.ts:800`, `:804`: fallback `#ef4444`.
- `styles.ts:854`, `:870`, `:888`, `:915`: fallback `#f87171` (error color hard-coded as fallback, with theme token first).
- `styles.ts:511`: fallback `rgba(255,255,255,0.05)` (a white tint, fallback only).
- `extensions/composition-aware-bracket-matching.ts:164-165`: hard-coded `#bad0f847` and `#ff000033` as fallbacks for bracket match tokens.
- No `oklch()` literals in scope; all theme colors come from `var(--...)`.

### Hard-coded sizes
- Pixel font sizes: `styles.ts:420` (`14px`, table add), `styles.ts:447` (`6px`, table add-row), `setup/editor-theme.ts:34` (`fontSize` px from settings).
- `rem`: `styles.ts:139` (`0.85rem`).
- `em` (majority): `CODE_BLOCK_FONT_SIZE` 0.85em (styles.ts:37), `TABLE_FONT_SIZE` 0.9em (l.39), callout option 0.75em (l.537), codeblock 0.7em (l.340, 346), meta-bind select 0.85em (styles.ts:698), meta-bind button 0.85em (l.726), embed header 0.9em (l.659), heading sizes via `--heading-h*-font-size` vars (l.172-207).
- Tailwind arbitrary text sizes (`text-[..]`): none in scope. Named sizes used: `text-xs` (NoteActionBar l.128, 136), `text-sm` (EditorTabs l.52, EditorView l.156), `text-meta` (TOC l.48, 50, custom utility).
- Sizing tokens: NoteActionBar `size-7` / `h-7` icon buttons (28 px), `h-4 w-px` divider (l.120). EditorTabs `h-8` tab, `h-10` strip, `max-w-40` title (l.85). EditorView empty bar `h-10` (l.154).

### Inline styles
- TOC row: `style="padding-left: {depth * 16 + 8}px; --toc-indent-depth: {depth};"` (TableOfContentsPanel.svelte:58).
- EditorTabs: `style:color={tabTitleColor?.(tab.path)}` (l.85).
- EditorView empty bar: `style="box-shadow: inset 0 -1px 0 var(--divider)"` (l.154). EditorTabs repeats that shadow in a scoped style (EditorTabs.svelte:115-118).
- Widgets set `element.style` directly: image `maxWidth`/`height` (widgets.ts:146-153), callout popover `style.display` toggling (callout-field.ts:75, 89, 97, 102).

### z-index
- `styles.ts:517` callout type popover `zIndex: '20'`.
- `EditorView.svelte:98, 112, 125, 139` floating toggle `z-10`.
- No other z-index in scope.

### Spacing (examples)
- Editor content padding `16px clamp(24px, 5vw, 80px)` (editor-theme.ts:39).
- Table wrapper `paddingRight: 24px`, `paddingBottom: 10px` (styles.ts:403-409).
- Blockquote border `3px`, padding 8/16/24px (l.217-228).
- NoteActionBar: `gap-1.5`, `px-2`, `mx-1` divider.
- Callout border `3px` solid (l.470-473).

### Transitions and animations
- `0.15s ease` (styles.ts): task checkbox `all` (l.242), codeblock copy `opacity, background-color` (l.354), table add `opacity, background` (l.424), callout fold opacity (l.484), callout type label (l.507), meta-bind button `all` (l.730).
- Tailwind `transition-colors` / `transition-opacity`: NoteActionBar (l.116, 136), EditorTabs (l.52, 87), EditorView toggles (l.98 etc).
- Timers: code copy label reset 1500 ms (code-block-widget.ts:97-99); WordCount debounce 500 ms (WordCount.svelte:26).
- No `@keyframes` in scope. No animated decoration (ADR 0008 forbids animated syntax hiding, per `styles.ts:5-10` and LIVE-PREVIEW.md).

### Theme tokens used (CSS variables)
- Editor and chrome: `--editor-bg`, `--editor-fg`, `--border`, `--divider`, `--muted-foreground`, `--popover`, `--popover-foreground`, `--accent`, `--accent-foreground`, `--primary`, `--ring`, `--destructive`, `--shadow-md`, `--radius-xs|sm|md`, `--status-bar-fg`, `--right-sidebar-muted-fg`.
- Tailwind theme utilities in Svelte: `bg-tab-bar`, `bg-editor-bg`, `bg-editor-empty-bg`, `text-editor-fg`, `text-tab-text-active`, `text-tab-text-inactive`, `text-type-yellow`, `text-type-green`, `bg-muted`, `bg-border`, `bg-foreground`, `text-muted-foreground`, `text-right-sidebar-muted-fg`, `text-right-sidebar-primary`, `bg-right-sidebar-primary/10`, `hover:bg-right-sidebar-accent/50` (SidebarSection), `bg-background/80`.
- Syntax and live preview families: `--syntax-*` (heading1-6, meta, link, url, code, selection, active-line, active-line-gutter, quote, strong, emphasis, strikethrough, processing), `--lp-*` (about 80 tokens, e.g. `--lp-codeblock-*`, `--lp-table-*`, `--lp-collection-*`, `--lp-meta-bind-*`, `--lp-embed-*`, `--lp-syntax-*`, `--lp-blockquote-bg{,2,3}`), `--callout-{note,tip,important,warning,caution,quote}`, `--heading-h{1-6}-font-{size,weight}`.
- Custom in-component vars: `--toc-indent-depth` (TableOfContentsPanel.svelte:58).
- Theme application: `setup/editor-theme.ts` builds `EditorView.theme(..., { dark })` (l.20-92).

### Custom CSS files
- None in scope. CSS is CSS-in-JS (`styles.ts` 1006 lines via `EditorView.theme`) and Svelte `<style>` blocks: `EditorTabs.svelte:115-118`, `TableOfContentsPanel.svelte:71-81`, `WordCount.svelte:36-45`.
- Global utility: `pane-toolbar` (`src/app.css:151-153`), used by NoteActionBar (l.124) and SidebarSection; `status-bar-fg` light and dark at app.css:193, 258.
- `src/lib/features/canvas/canvas-markdown.css` exists but is outside scope.

### Dark mode
- Editor theme uses `dark` facet (editor-theme.ts:91). Syntax tokens are variable-driven, so theme switching relies on token values. Fallback hex values (see above) do not switch.

## 6. Copy (user-visible strings)

Terminology drift:
- Raw vs source vs live preview: NoteActionBar tooltip "Show raw Markdown" / "Back to live preview" (NoteActionBar.svelte:61, 175 title `(Cmd+\)`). EditorView toggle title "Source mode" / "Live preview" and aria "Switch to source mode" / "Switch to live preview" (EditorView.svelte:141-142). Kanban/canvas/collection toggles use "Source mode" for the same concept (EditorView.svelte:101, 115, 128).
- Note vs file: "Select a file to view its contents" (EditorView.svelte:156) vs "this note" in menu (NoteActionBar.svelte:210-218) vs "note" throughout.
- Deeplink casing and wording: menu "Copy deeplink" (l.201), toast "Deeplink copied" (note-action-bar.service.ts:65), error "Could not build a deeplink: the note is not in the open vault." (l.62). Context menu "Copy block link" / "Copy block embed" (MarkdownEditor.svelte:195, 200). Toast "Failed to copy link to clipboard." (copy-block-link.service.ts:39, 61).
- Error verbs: "Failed to ..." (copy-block-link.service.ts:39, 61; widgets.ts:722 "Failed to load"; mermaid "Mermaid error:") vs "Could not ..." (MarkdownEditor.svelte:327, 368; note-action-bar.service.ts:28, 38, 62, 83).
- Success toasts: "Path copied", "Deeplink copied" (note-action-bar.service.ts:49, 65). copy-block-link has no success toast at all (copy-block-link.service.ts:35-42, 57-62) and returns silently for an empty line (l.25).
- Set-state tooltip phrasing: "Add to favorites" / "Remove from favorites" (NoteActionBar.svelte:58) vs "Set note as organized" / "Set note as not organized" (l.59).
- Menu item phrasing: "Restore this archived note", "Archive this note", "Delete this note" (l.210-218) vs "Copy path" (l.104), "Reveal in Finder" (l.100), "Copy deeplink" (l.201).
- Ellipsis style: "Loading…" (unicode, widgets.ts:701) vs "Select..." (ASCII, widgets.ts:778).
- Spelling: "neighbourhood" (UK) used 9 times in `src/lib` (e.g. NoteActionBar.svelte:35, 88 "Show this note's neighbourhood in the note list"). No "neighborhood" (US) in `src/lib`.
- Not-found wording: "not found" (widgets.ts:616, 715) vs "Failed to load" (widgets.ts:722) vs "Empty mermaid diagram" / "Empty math expression" (mermaid-widget.ts:85, math-widget.ts:40) vs "Invalid button:" (meta-bind-button-widget.ts:70) vs "Button cannot open ..." (meta-bind-button-widget.ts:132, 141).
- Toast starting lowercase reason: `Cannot set ${bindTarget}: ${reason lowercased}` (widgets.ts:909).
- Word count units: "words", "characters", "min read" (WordCount.svelte:33); no singular forms ("1 words").
- TOC copy: section title "Table of contents" (TableOfContentsPanel.svelte:46), empty "No headings found" (l.50), non-markdown "Not available" (l.48). Action label "Show the table of contents" (NoteActionBar.svelte:98).
- Shortcut hints: NoteActionBar titles hard-code "(Cmd+D)", "(Cmd+E)", "(Cmd+\)" (NoteActionBar.svelte:148, 157, 175). The codebase has `shortcutFor()` (`app/global-keybindings.ts:211`) and `formatShortcut` used by MarkdownEditor.svelte:196. The bar does not use them.
- Button label "Copy" then "Copied!" (code-block-widget.ts:91, 96), no aria-live.
- Hub button label comes from the registered action or "New linked note" (NoteActionBar.svelte:73).
- Labels lowercased by CSS `text-transform: lowercase` instead of source: codeblock language (styles.ts:343), callout type label (l.504), mermaid header (l.840).

## 7. Miscellaneous facts relevant to design review

- TOC is rebuilt on every content change while expanded (TableOfContentsPanel.svelte:34-39), and collapses on tab switch (l.18-27) and on destroy (l.32).
- NoteActionBar folds actions by measured width: `bind:clientWidth` (NoteActionBar.svelte:126), `HUB_ACTION_WIDTH = 136` (note-action-bar.logic.ts:105), `foldActions` (l.78-80). Width 0 folds everything into More.
- NoteActionBar `wide` toggle uses `pressed` state (NoteActionBar.svelte:92-97), label flips between "Use the normal note width" and "Use the full note width".
- Table of contents toggle lives in the bar's More menu and inline icon set (`toc` foldable, NoteActionBar.svelte:98).
- Mermaid cache is module-level (mermaid-widget.ts:47 `mermaidCache`, read at l.91).
- Callout fold/type widgets close their popover on any outside `mousedown` on the document (callout-field.ts:101-107), attached per widget instance and removed in `destroy`.
- EditorTabs context menu does not show a shortcut for Close; Close shortcut not defined in scope.
- Checkbox widget dispatches a change on mousedown only (widgets.ts:41-50), so a keyboard Space on the focused native checkbox would toggle native state without a document change (no `change` listener). Verified by absence of listeners.

## 8. Not verified

- No runtime rendering, screenshots or computed-style checks were done. Facts are from source only.
- Keyboard reachability of the table add buttons and checkbox was inferred from listeners, not tested in the app.
- Dark-mode token values were not inspected; only fallback literals were listed.
