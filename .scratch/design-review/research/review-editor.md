# Design review: Editor and live preview

Scope: markdown-editor, live preview plugins and widget CSS, note-action-bar, table-of-contents, word-count, copy-block-link. Evidence is file:line from the repo plus the screenshots in `.scratch/design-review/screens/`. Light-mode screenshots unless noted. Test-vault harness caveats from MANIFEST.md apply (monospace fallback font, mock mtimes).

## Clear

### 1. Source mode renders the frontmatter as a giant heading
- Screenshot: `editor-source-mode-light.png`. The whole `---` block is drawn at roughly 1.6x size, `tags: [plan, launch, kokobrain]` is underlined like a link, and line numbers drift because the wrapped lines are tall.
- Cause (code): `markdownLanguage()` (`highlight-styles.ts:86-88`) parses with GFM only and has no frontmatter node, so the closing `---` turns the property lines into a Setext H2. `sourceHeadingSize` (`highlight-styles.ts:60-67`, installed by `sourceModeExtensions()` at `editor-extensions.ts:99-107`) then sizes it as a heading. Live preview hides the block, so it only shows in source mode (and in the canvas file node per MANIFEST).
- Proposal: in source mode, mark the frontmatter range (reuse `findFrontmatterBlock`, `parsers/frontmatter.ts:17`) with a mark/line decoration that resets size and weight, uses the code font color token, and highlights keys vs values (YAML-like). The body keeps its heading sizes.
- Impact: Raw mode is the escape hatch for editing properties; today the first thing the user sees in it looks broken.

### 2. Custom task statuses show as raw `[/]` text in the editor, but the Tasks view has seven statuses
- Screenshot: `editor-live-preview-scrolled-light.png` shows `[/] Polish the settings dialog` as an orange bullet plus literal `[/]`, next to normal checkboxes.
- Code: `simple-widget-handlers.ts:20-30` only decorates the Lezer `TaskMarker` (checked or not). `TaskCheckboxWidget` (`widgets.ts:28-57`) knows two states. `features/tasks/task-status.logic.ts:7,45-53` defines todo, in-progress, question, important, forwarded, done, cancelled with glyphs and tone colors.
- Proposal: render every status marker (`[/] [?] [!] [>] [-]`) in the editor with the same glyph and tone as the Tasks view; click cycles todo to done (as now), right-click or long press opens a status menu. Keep the raw text on the active line.
- Impact: tasks are a daily surface; the note editor and the Tasks tab currently disagree on what a task looks like.

### 3. No way to format or insert anything: no Cmd+B/I/K, no toolbar, context menu is clipboard only
- Code: the keymap in `editor-extensions.ts:132-166` is copy-block-link, defaultKeymap, search, history, completion, indent. `MarkdownEditor.svelte:734-758` has Cut/Copy/Paste/Select all/Copy block link/Copy block embed. A grep of `src/lib` (excluding tests) for bold/italic/heading/insert-table/insert-callout commands in `app/commands.ts` and the editor finds none (checked by search; I did not run the app).
- Proposal: add Cmd+B, Cmd+I, Cmd+K (wikilink or link), plus a "Format" and "Insert" section in the editor context menu (Bold, Italic, Link, Heading 1-3, Task, Table, Callout, Code block) and matching palette commands. Menu rows show shortcuts through `formatShortcut` like Copy block link already does.
- Impact: inserting a table, callout or code block currently needs memorised syntax; these are the widgets the live preview is built around.

### 4. Tables are not editable as tables: hover-only 6 px add handle, no Tab navigation, no alignment
- Screenshot: `editor-live-preview-scrolled-light.png` (plain bordered table).
- Code: add buttons are `opacity: 0` until wrapper hover (`styles.ts:411-433`); the `+row` button is 6 px high with a 6 px glyph (`styles.ts:443-449`); `widgets.ts:468-491` has titles only. Cell editing means moving the cursor in, which reveals raw pipes. A search of `src` for next-cell navigation or pipe alignment finds only the parser and widget.
- Proposal: (a) Tab and Shift+Tab move between cells in raw mode and add a row at the last cell; (b) pad pipes to aligned columns when the cursor leaves the table or on Tab; (c) make the add affordances a visible, 20 px minimum hit target on the table edge that appears on hover and on keyboard focus, with column/row delete in a small cell menu.
- Impact: the owner uses tables daily; today each edit is manual pipe typing with no alignment.

### 5. Result tables from collection and queryjs blocks break words mid-word
- Screenshot: `collection-and-queryjs-block-light.png` ("priori ty", "owne r", "Dieg o", "planne d", dates wrapped).
- Cause: CodeMirror's `.cm-lineWrapping` sets `overflow-wrap: anywhere` (`node_modules/@codemirror/view/dist/index.js:6917-6918`), which every widget inherits, so `table-layout: auto` shrinks columns to one character. `.cm-lp-collection-table` and `.cm-lp-qjs-table` (`styles.ts:593-607`, `954-967`) reset neither the wrapping nor offer horizontal scroll. The qjs table also prints absolute paths in the second table.
- Proposal: set `overflow-wrap: normal` and `word-break: normal` on both tables, `white-space: nowrap` on date/number columns, and wrap each table in an `overflow-x: auto` container with a right-edge fade; show only the path relative to the vault.
- Impact: dashboards are a primary use of the editor; right now they read as corrupted.

### 6. Tab strip: no overflow control, fixed 160 px titles, pinned tabs lose their name
- Screenshot: `tabs-bar-several-light.png` (left tab clipped to "ap.md", no scroll cue); `editor-live-preview-light.png` (a 2-tab strip still truncates "Kokobrain Launch Plan...").
- Code: `EditorTabs.svelte:46` uses `overflow-x-auto`, every tab is `shrink-0` (l.51), the title is `max-w-40` (l.85). A pinned tab renders only icon and pin (the title sits inside `{#if !pinned}`, l.84) and no tab has a `title` attribute, so two pinned notes, or two notes with the same file name, cannot be told apart.
- Proposal: let tabs shrink from 220 px down to about 100 px before the strip scrolls; vertical wheel scrolls the strip; add a fade at clipped edges and a "list all tabs" button at the right with the open tabs; add a native or shadcn tooltip with the full path to every tab; show a 2-letter or full title for pinned tabs on hover.
- Impact: with more than 5 notes open the user navigates blind.

## Moderate

### 7. Copy block link gives no feedback, silently no-ops, and silently edits the note
- Code: `copy-block-link.service.ts:25` returns without a word on an empty line; success has no toast (l.35-42, 57-62) while Copy path and Copy deeplink do toast (`note-action-bar.service.ts:49,65`). For a block it dispatches ` ^id` into the document before the clipboard write (l.49-53), so a failed write still leaves the id in the note.
- Proposal: toast "Block link copied" (and "Block embed copied") with the link text as the secondary line; on empty line, toast "Place the cursor on a block"; write to the clipboard first, then insert the id.
- Impact: Cmd+Shift+L currently looks like it did nothing.

### 8. Mouse-only controls cannot be used from the keyboard
- Code: task checkbox (`widgets.ts:37-50`, mousedown only), code Copy (`code-block-widget.ts:89-99`, mousedown only, hover-only via `styles.ts:345-361`, and the clipboard promise has no `.catch`), callout fold and type switcher (`callout-field.ts:26-34,67-98`, no keyboard, no Escape), embed header (`widgets.ts:675-681`), table-cell wikilink (`widgets.ts:336-353`). The code block `select` and table add buttons have no accessible name beyond `title`.
- Proposal: keep mousedown for cursor safety but also handle `click` and Enter/Space; add Escape and arrow keys to the callout popover; reveal Copy and the table add handles on `:focus-within`; add `aria-label` to the language select and add buttons; add a "Toggle task under cursor" command (Cmd+Enter style) for keyboard users; announce "Copied" via a polite live region and show an error toast on failure.
- Impact: a keyboard-first note-taker cannot toggle a task or copy code without the mouse.

### 9. Callouts: type word, chevron on every callout, italic body
- Screenshot: `editor-live-preview-light.png` ("note ▼ Why this matters", "warning ▼ Risk", all body text italic).
- Code: every callout gets the type switcher and a fold chevron (`callout-field.ts:196-215`, comment "Phase 17: every callout is foldable"); labels are CSS-lowercased (`styles.ts:504`); the body is italic because the callout is a Blockquote and `markdownHighlight` italicizes `tags.quote` (`highlight-styles.ts:39`).
- Proposal: replace the lowercase type word with a small color-matched icon (still opens the type menu), show the chevron only when the callout has a `+`/`-` marker or on hover, use the type name as the title when none is given, and cancel the quote italics inside callouts (keep them for plain blockquotes).
- Impact: callouts hold real content (warnings, risks); italic mono body plus two glyphs before the title make them slow to read.

### 10. Table of contents: decorative chevrons, no current-heading marker, resets on every tab switch
- Screenshot: `right-sidebar-all-expanded-light.png` (a chevron on every row, none expands anything).
- Code: each row renders `ChevronRight` (`TableOfContentsPanel.svelte:62`) but the click only navigates (l.60); expansion is remembered for one note and cleared on tab switch (l.18-27, l.32); `toc.store`/`toc.logic` have no active-heading state; the section sits under a long Properties panel (MANIFEST: pushes it below the fold).
- Proposal: remove the chevrons or make them collapse subtrees; highlight the heading containing the cursor or visible top (scroll-spy) and set `aria-current`; keep the TOC section open across tabs as a user preference; add a "Go to heading" palette command that lists the same headings.
- Impact: navigating long notes is the TOC's only job and it currently forgets state.

### 11. Action bar breadcrumb reads like a path but is the note type; the organized icon is unexplained
- Screenshot: `note-action-bar-light.png` ("Project › Kokobrain Launch Plan.md"), `editor-live-preview-light.png` (the folder is `Projects/`).
- Code: `note-action-bar.logic.ts:5-6,32-37` builds the first crumb from `_type` (`typeLabel`); the file name keeps `.md` (l.9); neither crumb is interactive (`NoteActionBar.svelte:128-132`). The organized toggle is a bare check-circle (l.155-167), the same glyph the Tasks view uses for done.
- Proposal: show the type as the same colored chip the note list uses ("Project"), then the title without `.md`; make the title click-to-rename; give the organized button a small text state ("Organized" / "Inbox") or a different icon (inbox-check) that matches the Inbox rail item.
- Impact: removes a misleading location cue and teaches the inbox model at the place where it is changed.

### 12. Embeds, images, mermaid and math have thin loading and error states
- Code: note embeds render the note as plain text lines with `<br>` (`widgets.ts:705-713`), so an embedded note shows raw `#`, `**` and `[[ ]]` inside a 200 px scroll box (`styles.ts:677-685`). `cm-lp-image-missing` is added (`widgets.ts:175,615`) but no CSS rule exists, so a missing `![[x.png]]` is unstyled plain text and an `http` image that fails to load shows a broken icon (no `onerror`). Mermaid is empty until the async render resolves (`mermaid-widget.ts:80-108`). Math falls back to raw text with no message (`math-widget.ts:62-64`).
- Proposal: render the embed body through the inline markdown renderer used for table cells (`renderInlineSegments`, `widgets.ts:229`); style missing images as a dashed placeholder with the file name and a "not found" icon; add `onerror` fallbacks; give mermaid a reserved-height skeleton with a "Rendering..." label; show the KaTeX error message on hover or below the raw text.
- Impact: failures currently look like content.

### 13. Two different word counts on screen, and the status bar counts code-block source
- Screenshot: `editor-live-preview-light.png` shows 268 words in the status bar and 242 in the Info panel; `collection-and-queryjs-block-light.png` shows 56 words vs 9.
- Code: `word-count.logic.ts:1-12` strips only frontmatter and splits on whitespace; the Info panel reads Rust's `entry.wordCount` (`note-info.logic.ts:32`, `src-tauri/src/vault/entry.rs:267`).
- Proposal: use one definition for both (preferably the Rust one, body only, ignoring fenced block source), show the same number in both places, and add a selection count ("12 of 268 words") to the status bar when text is selected.
- Impact: the same number must not change when the user looks one inch to the left.

### 14. Empty editor is a single sentence
- Screenshot: `editor-empty-state-light.png`.
- Code: `EditorView.svelte:153-158` renders "Select a file to view its contents"; the empty bar also repeats the divider shadow as an inline style (l.154) that `EditorTabs.svelte:115-118` defines separately.
- Proposal: show three actions with shortcuts (New note, Open Quick Switcher Cmd+O, Go to Today), the 5 most recent notes, and the vault name. Keep the text tone muted and centered.
- Impact: after closing the last tab the app has no next step.

## Polish

### 15. Copy and consistency drift
- "Raw"/"Show raw Markdown" in the note bar (`NoteActionBar.svelte:61`) vs "Source mode"/"Live preview" for the floating toggles (`EditorView.svelte:101,115,128,141-142`); the toggle is in the bar for notes and floats bottom-right for others.
- Hard-coded "(Cmd+D)", "(Cmd+E)", "(Cmd+\)" in bar tooltips (`NoteActionBar.svelte:148,157,175`) while the context menu uses `formatShortcut` glyphs; native `title` tooltips although `ui/tooltip` exists and is used by the calendar.
- "Failed to ..." vs "Could not ..." toasts (`copy-block-link.service.ts:39,61` vs `MarkdownEditor.svelte:327,368`); UK "neighbourhood" in 9 strings (`NoteActionBar.svelte:35,88`); "Loading…" vs "Select..." (`widgets.ts:701,778`); "1 words" has no singular (`WordCount.svelte:33`).
- The width toggle changes a global setting but its label reads like a per-note action (`NoteActionBar.svelte:92-97`, `note-action-bar.service.ts:13-15`): say "all notes".
- Proposal: one vocabulary (Source / Live preview), shortcut labels from the keybinding table with the same glyph format, shadcn Tooltip with shortcut chip, one "Could not ..." error voice, US spelling, plural-aware counts.

### 16. Meta-bind inline controls use three different looks
- Screenshot: `editor-live-preview-light.png` (select pill, a 190 px-wide number field showing "4", a native date control with browser chrome).
- Code: `styles.ts:683-800`: the select and text input share tokens but the number input takes the browser default width (`widgets.ts:1049-1054`, no size set); date uses the native `input type=date`.
- Proposal: size number inputs to content (about `ch` of the value plus padding, min 4ch), give date the same border, height and caret-free chrome as the select, and align all three baselines.

### 17. Small style leftovers
- Fold chevron is a Unicode `▼/▶` glyph (`callout-field.ts:28`) while the rest of the app uses Lucide chevrons.
- Hard-coded fallback hex values that do not switch with theme (`styles.ts:141,562,800,854`, `parsers/callout.ts:45`).
- No `prefers-reduced-motion` handling for the 0.15 s transitions in `styles.ts` (only `EventCalendarView.svelte:284` has it).
- `TableOfContentsPanel.svelte:4` imports `Separator` and never uses it.
- Proposal: swap to Lucide chevrons, map every fallback to a theme token, add a reduced-motion rule, drop the unused import.
