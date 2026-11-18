# Scout: editor slice (P10 P11 P41 P42 P40 P112 P113 P114 P110 P111 P116)

Checked at HEAD 085b23c5d (main, 4.10.1), read-only. Prototype: `.scratch/design-review/prototypes/editor-authoring.html`. Claude MVP exclusion list taken from `git diff --name-only origin/main...origin/mvp-claude`: it changes `src/lib/app/commands.ts`, `src/lib/app/global-keybindings.ts`, `src/lib/app/AppShell.svelte`, `src/lib/app/SettingsPanel.svelte` and `src/lib/core/settings/settings.{logic,service,store.svelte,types}.ts`. It does not touch `core/markdown-editor/`, `features/note-action-bar/`, `features/canvas/` or `plugins/word-count/`.

## Summary table

| id | call | size | one-line reason |
|---|---|---|---|
| P10 | QUICK-PART | L (slice S) | Raw-mode Tab and pipe alignment rewrite table text (DEFER); the add-button labels, 20 px hit area and focus visibility are a CSS/a11y slice that must ride with open-itens 211 |
| P11 | QUICK-PART | S | Source-mode frontmatter styling is a small source-only line decoration; the canvas half is already specified as open-itens 050 and is absorbed |
| P41 | DEFER | M | `[/]` is not a Lezer TaskMarker, so it needs a parser/regex extension; the glyph logic lives in `features/tasks` (new core to features layer violation); right-click menu writes note text |
| P42 | DEFER | M | Cmd+B is the right-sidebar toggle and the global dispatcher ignores `defaultPrevented`; needs an owner call on Cmd+B and touches `commands.ts` / `global-keybindings.ts` (MVP files) |
| P40 | QUICK-PART | S | Disable the action-bar width toggle with a Settings pointer while `contentWidth` is 0; the default change is DEFER (settings files are MVP files, existing saved values, owner choice of 72ch vs px) |
| P112 | QUICK-PART | M (slice S) | Missing-image style plus `error` swap and a mermaid "Rendering" placeholder are widget-local; embedded notes as read-only markdown is M and DEFER |
| P113 | QUICK-PART | M (slice S) | "Copy failed" feedback on the code block Copy button; Toggle task / Cmd+L needs a semantics decision and a palette entry in `commands.ts` (MVP file) |
| P114 | QUICK-PART | M (slice S) | Cancel callout body italics and show the type in Title case in its colour are CSS; default title text and chevron dimming need the owner (chevron is a tested Phase 17 decision) |
| P110 | QUICK-PART | S | Fixed `padding-top` on H1-H3 lines is CSS only; the per-level "space above" setting is a settings schema change (DEFER) |
| P111 | QUICK | S | Size the number input to its content; the date input already shares the class, so only the number half of the premise holds |
| P116 | QUICK-PART | S | Singular "1 word" is a WordCount fix already specified in open-itens 213 (run that, do not duplicate); the "N of M words" selection count needs new editor state (DEFER) |

No DONE and no DROP in this slice. Premises checked at HEAD are listed per proposal below.

## Per-proposal detail

### P10. Tables in the editor cannot be edited as tables (QUICK-PART, size L, slice S)

Premise at HEAD: true. `setup/editor-extensions.ts:162-165` keymap ends with `indentWithTab` and has no table command. The rendered add buttons (`extensions/live-preview/widgets.ts:469-491`) carry only `title`; `.cm-lp-table-add-row` is `height: 6px` (`styles.ts:~436-441`) and `.cm-lp-table-add` is `opacity: 0` until the wrapper is hovered (`styles.ts:~424-430`).

- DEFER part: Tab / Shift+Tab between cells, Tab in the last cell adds a row, pipe alignment on Tab or when the cursor leaves the table. It rewrites table text in the user's notes (owner uses tables daily) and needs a table-aware command in the editor keymap. A cell menu for delete and align is a new widget. L.
- QUICK slice: (1) `aria-label` "Add column" / "Add row" on both buttons (keep `title`), (2) the buttons are visible on `:focus-visible` as well as on wrapper hover, (3) the add-row hit area is at least 20 px tall. This overlaps open-itens 211 (overlay the controls instead of reserving the 24 px right strip and 6 px bottom strip) in the same two rules, so ship them as one ticket (candidate T5 below). Note `padding-bottom: 10px` is a tuned gap (comment at `styles.ts:~374-376`); a 20 px overlay handle must not push the next line.
- Rules: CLAUDE.md live-preview rule 11 stays (mousedown `stopPropagation` on both buttons, `widgets.ts:473-476`, `489-492`).

### P11. Frontmatter renders as a giant heading in source mode and on canvas cards (QUICK-PART, size S)

Premise at HEAD: true for both halves.
- Source mode: `@lezer/markdown` 1.8.1 has no frontmatter node. Line 1 `---` is a HorizontalRule; the `key: value` lines plus the closing `---` parse as a SetextHeading2, which `markdownHighlight` colours (`highlight-styles.ts:17-24`) and `sourceHeadingSize` sizes at 1.618em (`highlight-styles.ts:~50-57`, installed only by `sourceModeExtensions()` at `setup/editor-extensions.ts:99-107`). The screenshot `screens/editor-source-mode-light.png` shows it. Live preview is unaffected (the frontmatter widget owns it).
- Canvas: `features/canvas/FileNode.svelte:83` renders `renderCanvasMarkdown(fileContent)` on the raw file (`canvas-markdown.logic.ts:14-18`). `stripFrontmatter` exists as a pure function at `core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:53-61`. This is exactly open-itens 050 (status ready-for-agent in the ledger, row 050).

Slice (T3 below): source-mode only decoration plus the 050 canvas strip. Exact behaviour change:
- In source mode, when line 1 matches `FRONTMATTER_FENCE_RE` (`parsers/frontmatter.ts:10`) and a later line matches it, lines 1..closing get a line class `cm-source-frontmatter`; the theme sets those lines (and their nested highlight spans) to body font size, normal weight and `var(--syntax-meta)`. Keys styled apart from values is optional and can wait. No fence, unclosed fence or a mid-document `---` get no class. Recompute on doc change.
- Canvas file nodes render the body without frontmatter; a text node starting with `---` renders as today; a file with only frontmatter shows the existing "Empty file" state (the `{:else if fileContent}` branch must test the stripped body).
- Known limit: `stripFrontmatter` does not strip a CRLF file (`content[afterDelimiter] !== '\n'` for `\r\n`, `embed-resolver.logic.ts:58`). Same limit the kanban preview already has; the owner is on macOS. State it, do not widen.
- Why QUICK and not "decoration rework": the decoration is a new line class installed only in `sourceModeExtensions()`; it touches no live-preview decorator, widget or `cm-lp-*` rule.

### P41. Custom task statuses show as raw `[/]` text (DEFER, size M)

Premise at HEAD: true. `taskMarkerHandler` (`inline/handlers/simple-widget-handlers.ts:20-33`) treats any `TaskMarker` other than `[ ]` as checked, and `@lezer/markdown` only produces `TaskMarker` for `/^\[[ xX]\][ \t]/` (`node_modules/@lezer/markdown/dist/index.js:2223`). So `[/]`, `[?]`, `[!]`, `[>]`, `[-]` are never nodes and stay literal text.
Why DEFER: (1) needs a new inline parse path (Lezer extension or regex handler) in live preview; (2) the glyph table `statusGlyph` is in `features/tasks/task-status.logic.ts:41-61` (delivered by tasks-view-ux 110, e420d69e2). Importing it from `core/markdown-editor/` is a new core to features import, and `layer-rules.test.ts` fails on any new violation, so it would need a move to `utils/` first; (3) glyphs are Lucide components, the widget needs inline SVG; (4) a status menu on right-click writes note text and an Undo story. Depends on open-itens 061 (button guard on the checkbox widget) landing first.

### P42. No formatting or insert commands (DEFER, size M)

Premise at HEAD: true (no bold/italic/link command in `commands.ts`, none in the editor keymap, context menu is clipboard plus block link, `MarkdownEditor.svelte:734-758`).
Why DEFER:
- `registerKeybinding` (`utils/keybindings.ts:61-81`) listens on `document` keydown and never checks `e.defaultPrevented`, so an editor-scoped Mod-b would still toggle the right sidebar (`global-keybindings.ts:142-147`). Fixing it changes dispatch for every global shortcut.
- Cmd+B changes meaning while the editor is focused: owner decision.
- Mod-i is already `selectParentSyntax` in `@codemirror/commands` defaultKeymap (`node_modules/@codemirror/commands/dist/index.js:1808`) and would need to be shadowed.
- Palette commands go in `app/commands.ts` and the keys in `app/global-keybindings.ts`, both changed by the MVP branch.
- Shipping only Cmd+I/Cmd+K without Cmd+B is incoherent, so no slice.

### P40. Line length swings, full-width toggle does nothing by default (QUICK-PART, size S)

Premise at HEAD: true. `settings.store.svelte.ts:84` `contentWidth: 0`, `wideNotes: false`; `effectiveContentWidth` returns 0 either way (`settings.logic.ts:83-85`), `editor-theme.ts:41` applies `maxWidth` only for `contentWidth > 0`. The toggle (`NoteActionBar.svelte:62`, `note-action-bar.service.ts:15-17`) flips a flag with no visible effect.
- DEFER: the default (about 72ch or 720 px). It is in `settings.store.svelte.ts` (MVP file), the editor theme uses px not ch, persisted settings that already hold 0 keep 0, and which number is an owner call.
- QUICK slice (T4): while `settingsStore.editor.contentWidth === 0` the width action is shown disabled with a tooltip/label pointing to "Settings > Editor > Content width". Use `aria-disabled` (not the `disabled` attribute) on the inline button so the tooltip and focus keep working, and `disabled` on the "More" menu item (`DropdownMenuItem`); both must not call `toggleWideNotes`. The e2e `e2e/specs/note-action-bar.spec.ts:103-124` already sets Content width to 600 first, so it stays valid. Honest note: until the default changes, the toggle is disabled for everyone who never set a width, which is the truth (it did nothing).

### P112. Live-preview widgets have thin loading and error states (QUICK-PART, size M, slice S)

Premise at HEAD: partly true. Verified:
- Embedded notes already show "Loading..." and a `.cm-lp-embed-error` not-found/failed state (`widgets.ts:~698-724`); what is missing is rendering the body as markdown (it appends text nodes with `<br>`). DEFER, M.
- `.cm-lp-image-missing` is added in `widgets.ts:175` and `:615` but has no rule in `styles.ts`, and no `error` listener exists on either `<img>` (a present file that fails to load shows the WebKit broken-image icon). True.
- Mermaid: `widgets/mermaid-widget.ts:~85-100` leaves `.cm-lp-mermaid-diagram` empty (only 16 px padding) until `mermaid.render` resolves; the cached path is instant. True.
- Math and QueryJS: already handle errors (validation says so); out of scope.
Slice (T1): style `.cm-lp-image-missing` (muted, dashed border, `--radius-xs`, `--lp-embed-error` colour like the embed error), switch to it from `img` `error` in both `ImageWidget` and `WikilinkImageEmbedWidget` with the text `"<name>" not found` and a `view.requestMeasure()`; a `Rendering diagram...` placeholder span inside the diagram container, replaced by the existing `innerHTML` / `textContent` assignments (no cache change, so live-preview rule 2 holds).

### P113. Editor widget controls are mouse-only (QUICK-PART, size M, slice S)

Premise at HEAD: true. `widgets/code-block-widget.ts:89-100` calls `navigator.clipboard.writeText(...).then(...)` with no `.catch` (an unhandled rejection and no feedback); the Copy button is `opacity: 0` until the block is hovered (`styles.ts:~345-358`); no Toggle task command exists.
- DEFER: "Toggle task" for every selected line, palette entry and Cmd+L. What a line without a checkbox becomes (`- foo` to `- [ ] foo`? plain line?) and how `[/]` statuses toggle is undecided; the palette entry is in `app/commands.ts` (MVP file). It also shares `TaskCheckboxWidget` with open-itens 061 and P41. ARIA and key handling inside widgets is "polish later" in the proposal itself.
- QUICK slice (T1): a rejected or unavailable clipboard write shows "Copy failed" on the button for the same 1500 ms the "Copied!" label uses, then returns to "Copy". Wrap the call so a missing `navigator.clipboard` (synchronous TypeError) also lands there. The existing `e2e/specs/live-preview/click-reveal/code-block-copy.spec.ts` (expects "Copied!") is unchanged. Making Copy visible on keyboard focus is skipped: Tab inside the editor is `indentWithTab`, so the button is not keyboard reachable anyway.

### P114. Callouts show a lowercase type word, a chevron on every callout, an italic body (QUICK-PART, size M, slice S)

Premise at HEAD: true. `.cm-lp-callout-type-label` has `textTransform: 'lowercase'` (`styles.ts:~502`) and `color: inherit`; the stored type is already lowercased (`callout.logic.ts:31`). The body is italic because `tags.quote` is `fontStyle: 'italic'` in `markdownHighlight` (`highlight-styles.ts:39`), applied on a span around the blockquote text in live preview too. The header line gets only `border-left-color` as an inline style (`plugins/callout-field.ts:~172-175`).
- DEFER: using the type name as the default title (a new header text decoration), and dimming the chevron (the chevron on every callout is the tested Phase 17 decision, `callout-field.test.ts:155`; the proposal itself says dimming needs the owner).
- QUICK slice (T2): (a) inside `.cm-lp-callout`, spans are `font-style: normal` and real emphasis keeps italic: `.cm-lp-callout .cm-lp-italic, .cm-lp-callout .cm-lp-italic span { font-style: italic }`. A naive `span { normal }` alone would flatten bold inside italic, so both rules are needed. (b) Type label `text-transform: capitalize` and coloured with the callout colour: add `--callout-accent: <header.color>` next to `border-left-color` in the line decoration style and give the label `color: var(--callout-accent, inherit)`.
- Needs an owner eye check in the real app (WebKit nesting of highlight spans). The decoration count tests (`callout-field.test.ts`, 7, 5, 7 counts) are unaffected because no decoration is added.

### P110. Editor headings sit closer to the text above than to their own content (QUICK-PART, size S)

Premise at HEAD: true. `.cm-lp-h1..h6` (`styles.ts:171-212`) set size, weight, line-height, spacing and colour, never space above; `.cm-line` only gets `paddingBottom` from `paragraphSpacing` (`editor-theme.ts:47-51`). Validation says the effect is mild.
- DEFER: the per-level "space above" typography setting (a new field in `HeadingTypography`, settings schema plus `heading-typography.logic.ts` plus `settings.types.ts` (MVP file) plus the heading editor UI).
- QUICK slice (T2): a fixed `padding-top` in em on `.cm-lp-h1`, `.cm-lp-h2`, `.cm-lp-h3` (em is relative to the heading's own size, so it scales; proposed 0.6em, 0.5em, 0.4em, to confirm by eye). The first line of a note should not shift: decide in the ticket whether to reset it with `.cm-line:first-child` (a heading at the top has no text above it). Live preview only; source mode has no `cm-lp-hN`. `heading-fallbacks.test.ts` only checks `font-size` and `font-weight` variable fallbacks, so it is unaffected.

### P111. Meta-bind inline controls: number field stretched, date field native chrome (QUICK, size S)

Premise at HEAD: half true. The number input has no width rule, so it takes the default ~20-char width (`styles.ts:~783-795`, screenshot `editor-live-preview-light.png`). The date input uses the same `.cm-lp-meta-bind-input` class (`widgets.ts:1050-1052`), so padding, border and radius are already shared; what remains native is the WebKit date field internals and picker icon (colour forced in `app.css`), which this ticket does not touch.
Slice (T2): `.cm-lp-meta-bind-input[type="number"]` gets `field-sizing: content` and `min-width: 4ch` (and a `max-width` so a long value cannot take the line). MDN lists `field-sizing` as "Baseline 2026, newly available" and names number inputs among the affected types, but I could not read the Safari version from it. The implementer must confirm WKWebView on the owner's macOS honours it; where it does not, the field stays as wide as today (no regression).

### P116. Two different word counts on screen (QUICK-PART, size S)

Premise at HEAD: "1 words" is true (`plugins/word-count/WordCount.svelte:33` prints fixed `words` and `characters`). The screenshot mismatch is the e2e mock, as the validation says.
- Already specified: open-itens 213 (todo, ready-for-agent, picked by the owner 2026-11-06) holds the singular fix for words and characters, hides the reading time for an empty note, and also fixes the graph footer ("1 notes"). Run 213 as written; do not write a competing ticket. It is not fully covered by a word-count-only ticket, so it must not be marked wontfix.
- DEFER: "N of M words" with a selection. `editorStore` has no selection state (no match in `core/editor/editor.store.svelte.ts`), so it needs new store state fed from the CodeMirror update listener. M.

## Candidate quick tickets

All five avoid every MVP-branch file. T1, T2 and T5 all edit `extensions/live-preview/styles.ts`: run them one after another, never in parallel worktrees. Tests never mock stores or `.logic.ts`; only `navigator.clipboard`, `mermaid` and Tauri APIs are mocked, as the existing tests already do.

### T1. Live-preview widget states: missing image, rendering diagram, failed copy (P112 slice, P113 slice)
Size S. Files: `extensions/live-preview/widgets.ts` (`ImageWidget`, `WikilinkImageEmbedWidget`), `widgets/mermaid-widget.ts`, `widgets/code-block-widget.ts`, `styles.ts`. Tests: `widgets/image-widget.test.ts`, `widgets/wikilink-image-embed-widget.test.ts`, `widgets/mermaid-widget.test.ts`, `widgets/code-block-widget.test.ts`, `styles.test.ts` (all under `src/tests/lib/core/markdown-editor/extensions/live-preview/`).
Test seam: jsdom widgets built with `toDOM`; `img.dispatchEvent(new Event('error'))`; `navigator.clipboard.writeText` stubbed to reject (a Web API, not a store); the existing `vi.mock('mermaid')` with a render that stays pending.
Acceptance criteria:
1. Failing test first: dispatching `error` on the `<img>` of an `ImageWidget` and of a `WikilinkImageEmbedWidget` gives the wrapper `cm-lp-image-missing` and text `"<name>" not found`; today nothing changes.
2. Failing test first: `styles.test.ts` finds an exact rule for `.cm-lp-image-missing` (today none exists) using the `--lp-embed-error` token and `--radius-xs` (add it to the radius ladder list).
3. Failing test first: a `MermaidWidget` whose render has not resolved contains a `Rendering diagram...` element; after resolve it is gone and the SVG is present; the cached path and the empty-source path are unchanged.
4. Failing test first: with `writeText` rejecting, a mousedown on `.cm-lp-codeblock-copy` shows "Copy failed" then returns to "Copy" after 1500 ms (fake timers); with it resolving it still shows "Copied!". A missing `navigator.clipboard` ends in "Copy failed" with no unhandled rejection.
5. `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal/code-block-copy.spec.ts` still passes.
6. Frontend gate: `pnpm check` and `pnpm vitest run`. Owner eye check: a deleted image file in a real note.

### T2. Live-preview look: callouts, headings, meta-bind number field (P114 slice, P110 slice, P111)
Size S/M (CSS plus one inline-style attribute). Files: `extensions/live-preview/styles.ts`, `extensions/live-preview/plugins/callout-field.ts` (the header line's `style` attribute). Tests: `styles.test.ts`, `plugins/callout-field.test.ts`.
Test seam: the exported `livePreviewStyles` rule strings (`exactRule` / `themeRules` helpers in `styles.test.ts`) and real `EditorState` with `computeCallouts` (existing pattern). CSS rules cannot be proved to render in jsdom, so the owner check below is part of done.
Acceptance criteria:
1. Failing test first: `exactRule('.cm-lp-callout-type-label')` has `text-transform: capitalize` (today `lowercase`) and `color: var(--callout-accent, inherit)`.
2. Failing test first: the header line decoration of a `[!warning]` callout carries `--callout-accent: <the warning colour>` in its `style` attribute next to `border-left-color`; decoration counts in the existing callout tests stay 7, 5 and 7.
3. Failing test first: rules exist that set `font-style: normal` on spans inside `.cm-lp-callout` and keep `font-style: italic` on `.cm-lp-italic` and its nested spans.
4. Failing test first: `.cm-lp-h1`, `.cm-lp-h2`, `.cm-lp-h3` have a `padding-top` and `.cm-lp-h4..h6` do not; the first-line decision (reset or keep) is pinned by a test.
5. Failing test first: a rule for `.cm-lp-meta-bind-input[type="number"]` has `field-sizing: content` and a `min-width`; the date input keeps the shared padding and border.
6. Frontend gate: `pnpm check` and `pnpm vitest run`. Owner eye check in the app: a callout with `*emphasis*` still italic, heading spacing, a number control beside a select. Unrelated edits to `heading-fallbacks.test.ts` are not needed.

### T3. Frontmatter reads as metadata: source mode and canvas cards (P11 source slice, absorbs open-itens 050)
Size S. Files: new pure `extensions/frontmatter-source/` logic (end-line finder, uses `FRONTMATTER_FENCE_RE`) plus its source-mode line decoration wired into `sourceModeExtensions()` in `setup/editor-extensions.ts` (and a theme rule); `features/canvas/canvas-markdown.logic.ts` (strip wrapper around `stripFrontmatter`) and `features/canvas/FileNode.svelte` (render and the empty branch). Tests: new logic test and `setup/editor-extensions.test.ts` (it already counts source-only classes through `legacyClasses`), `src/tests/lib/features/canvas/canvas-markdown.logic.test.ts`.
Test seam: real `EditorView` with `sourceModeExtensions()` over a markdown doc and the `.cm-line` class check; the pure canvas wrapper; no mocks of stores or logic. `FileNode.svelte` reads files through Tauri `readTextFile`, which is the only mock if a component test is wanted.
Acceptance criteria:
1. Failing test first: in source mode a doc `---\n_type: Meeting\n---\n# Title` puts `cm-source-frontmatter` on lines 1-3 and not on line 4; live preview mode puts it on none (extend the compartment swap test).
2. Failing test first: no class for a doc whose line 1 is not `---`, an unclosed `---`, or a `---` rule later in the body; typing the closing fence adds the class, deleting it removes the class.
3. Failing test first: a rule for the frontmatter lines sets body font size, normal weight and `var(--syntax-meta)` on the line and its spans (spans carry the heading style today).
4. Failing test first (from open-itens 050): rendering the file-node preview of `---\ntype: person\ntags: [a]\n---\n# Title\nBody` yields the Title heading and Body and neither `type: person` nor an `<hr>`; a text node starting with `---` renders as today; a file with no frontmatter renders as today; a file with only frontmatter shows the empty state.
5. Frontend gate: `pnpm check` and `pnpm vitest run`. Owner eye check: a typed note in source mode and on a canvas. Open-itens 050 gets wontfix with a pointer to this ticket.

### T4. Honest note-width toggle (P40 slice)
Size S. Files: `features/note-action-bar/NoteActionBar.svelte` (the `width` entry of `foldable` and its two renderings, inline button and More menu item), optionally a label helper in `note-action-bar.logic.ts`. Tests: `NoteActionBar.test.ts` (existing real-store pattern at line 380), `note-action-bar.logic.test.ts` if a helper is added. No settings files.
Test seam: real `settingsStore` (set `contentWidth`), real `editorStore`, rendered component; no mocks beyond the Tauri plugins the file already stubs.
Acceptance criteria:
1. Failing test first: with `contentWidth` 0 the width button has `aria-disabled="true"` and a label/title naming "Settings > Editor > Content width"; clicking it leaves `wideNotes` false.
2. Failing test first: with `contentWidth` 0 and the bar narrow, the width item in the More menu is disabled and does not toggle.
3. With `contentWidth` 720 the existing behaviour holds: the label reads "Use the full note width", clicking sets `wideNotes`, `aria-pressed` follows. The existing test at `NoteActionBar.test.ts:380-401` gets the `contentWidth` precondition added; its assertions are not weakened.
4. `e2e/specs/note-action-bar.spec.ts:103` (sets Content width 600 first) still passes.
5. Frontend gate: `pnpm check` and `pnpm vitest run`. Not in this ticket: the default value of `contentWidth` (owner decision, MVP settings files).

### T5. Table add controls overlay the table edge, are labelled and reachable (P10 slice, absorbs open-itens 211)
Size S/M (layout risk, needs an eye check and the E2E style check from 211). Files: `extensions/live-preview/styles.ts` (`.cm-lp-table-wrapper`, `.cm-lp-table-add*`), `extensions/live-preview/widgets.ts` (`attachAddButtons`). Tests: `widgets/table-widget.test.ts`, `table-empty-cells.test.ts` stays green, `styles.test.ts`, plus the E2E style check from 211.
Test seam: real `TableWidget` DOM in jsdom and the rule strings; layout (table width equals sibling width) can only be proved in the E2E run.
Acceptance criteria:
1. Failing test first: both add buttons have `aria-label` "Add column" and "Add row" (today `title` only).
2. Failing test first: the add buttons become visible on `:focus-visible` (rule present) and the add-row rule has a 20 px hit height (today 6 px).
3. Failing test first (from 211): E2E style check that the rendered table width equals its sibling block width (the wrapper no longer reserves `padding-right: 24px`); the gap below the table that Issue 08 tuned is kept.
4. Existing table widget tests still pass, including mousedown `stopPropagation` on both buttons (rule 11) and the append-column / append-row dispatches.
5. Frontend gate: `pnpm check`, `pnpm vitest run`, `pnpm build` (211's gate). If the owner would rather not touch table chrome now, drop T5 and leave 211 as it is.

## Overlaps found

- open-itens 050 (canvas file nodes preview without YAML): fully covered by T3, mark wontfix with a pointer once T3 is created.
- open-itens 211 (editor tables full width, hover controls overlaid): fully covered by T5, mark wontfix with a pointer. If T5 is dropped, 211 stands alone and the P10 slice is not duplicated.
- open-itens 213 (word count and graph stats singular): covers P116's slice and more (the graph footer). Do not create a ticket; run 213 as written. Do not mark it wontfix.
- open-itens 061 (task checkbox reacts to the primary button only): not covered by anything here; it is a prerequisite for any future P41 or Toggle task work on `TaskCheckboxWidget`.
- open-itens 063 and 158 (image path and size handling) and 178 (iOS asset endpoint): adjacent to T1's missing-image state, independent of it.
- tasks-view-ux 110 (done, e420d69e2) built `statusGlyph`; it is P41's dependency and the reason P41 is a layer-move question, not a missing design. tasks-view-ux 237 is wontfix (merged into 110).
- shell-sidebars-ux: 02 (status bar) is resolved and does not touch `WordCount.svelte`; 08 covers the TOC (P115, not in this slice). No overlap with this slice.
- Claude MVP branch (`origin/mvp-claude`): P40 default, P110 setting, P42 and P113 palette/keys all need MVP-owned files, which is why those parts are DEFER. T1 to T5 touch none of them.
- Cross-slice: P11's canvas half lives here only (T3); the canvas scout should not count it again. T3 edits `FileNode.svelte`, which a canvas ticket may also edit. The color scout may edit `--lp-*` tokens used by T1/T2 rules; those tickets add rules and reuse tokens, they do not rename them.
- Not checked: the real-app look of any CSS slice (callout italics through nested highlight spans, `field-sizing` in the owner's WKWebView, heading padding at the first line); I read code and did not run the app.
