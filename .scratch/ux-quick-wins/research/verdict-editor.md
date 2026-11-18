# Verdict: editor slice (P10 P11 P41 P42 P40 P112 P113 P114 P110 P111 P116)

Refuter pass over `scout-editor.md`, read-only, at HEAD 085b23c5d (main = origin/main). MVP list from `git diff --stat origin/main...origin/mvp-claude`: among frontend files it changes `src/lib/app/{AppShell,SettingsPanel}.svelte`, `app/commands.ts`, `app/global-keybindings.ts`, `app/lifecycle/app-lifecycle.service.ts`, `app/tauri-listeners.service.ts`, `core/layout/layout.service.ts`, `core/settings/settings.{logic,service,store.svelte,types}.ts`, `routes/(app)/+layout.svelte`, `e2e/mocks/tauri-core.ts` and the new `features/claude-code/`. No file in the tickets below is on that list.

## Corrections to the scout

1. **P10 slice was too big.** `e2e/specs/live-preview/click-reveal/table-add-buttons.spec.ts:31-42` pins "+row button sits below the table, so a last-row cell bottom edge hits the cell" (`buttonTop >= tableBottom`, `elementFromPoint` at the last row's bottom edge is a `TD`). A 20 px add-row hit area either overlays the last row (breaks that pinned decision, and a click meant for a cell then appends a row to a daily table: a text write) or needs more `paddingBottom` (breaks the gap Issue 08 tuned, `styles.ts:373-379`). Open-itens 211's overlay is the same conflict, and 211 itself says it was drafted without a deep dive. So the hit area, the overlay and 211 are DEFER. `:focus-visible` visibility buys nothing: Tab in the editor is `indentWithTab` (`setup/editor-extensions.ts:165`), so the buttons are not keyboard reachable. Only the accessible names stay QUICK: each button's text is `+` (`widgets.ts:470,486`), so its accessible name is "+" and the `title` is only a description. T5 is dropped and folded into E1 as a two-line change. 211 is NOT covered: leave it open, do not wontfix.
2. **P114 CSS as written would regress widget text inside callouts.** `livePreviewStyles` is an `EditorView.baseTheme`, so `.cm-lp-callout span { font-style: normal }` is emitted under the theme scope class and outranks the single-class italic rules for inline widget spans: `.cm-lp-meta-bind-input-error` (`styles.ts:802-806`), `.cm-lp-meta-bind-button-error` (`:772`) and `.cm-lp-math-error` (`:873`). Their error text inside a callout would lose its italics, and a test on the rule string would still pass. Use a zero-specificity wrapper: `:where(.cm-lp-callout) span { font-style: normal }` (beats the unscoped `markdownHighlight` quote class, `highlight-styles.ts:39`, and loses to every scoped widget rule), plus `.cm-lp-callout .cm-lp-italic, .cm-lp-callout .cm-lp-italic span { font-style: italic }` so bold inside italic stays italic (`cm-lp-italic` comes from `inline/markdown-highlight-style.ts:17`).
3. **P112 image `error` swap breaks an E2E that is not listed.** `e2e/specs/live-preview/misc-features.spec.ts:108-122` renders `![Alt text](https://via.placeholder.com/150)` with no `page.route` (no fixture routes it, `grep route( e2e/fixtures` is empty) and asserts `img.cm-lp-image` is visible. Today a broken `<img>` with alt text counts as visible. Once `error` replaces it with a missing state, that spec fails. The ticket must route that URL to a stub PNG (the pattern in `click-reveal/image.spec.ts:23-27`) and add an E2E for the failed state. `embed-widgets.spec.ts:71-74` (asset may fail in PLAYWRIGHT mode, asserts only the wrapper is attached) still holds if the wrapper keeps `cm-lp-image-wrapper`. The copy also needs care: `ImageWidget` also renders remote URLs, where "not found" is wrong. A failed load reads `Could not load "<name>"`. The existing unresolved-link text `"<target>" not found` (`widgets.ts:614-616`) stays as is.
4. **P112 `requestMeasure` after a late `error`.** The `error` event can fire after CodeMirror destroyed the widget (scroll out of the viewport, rule 2/3). Guard the handler with `wrapper.isConnected` before touching the view, the same way `WikilinkNoteEmbedWidget` guards with `mounted` (`widgets.ts:707-725`).
5. **P11 needs no new logic module.** `findFrontmatterBlock` and `FRONTMATTER_FENCE_RE` already exist (`extensions/live-preview/parsers/frontmatter.ts:10-32`), live preview's `frontmatter-field.ts:14-17` uses them, and `setup/editor-extensions.ts:177-183` scans the same fence. The scout's "new pure `extensions/frontmatter-source/` logic" duplicates them. A source-only line-decoration ViewPlugin next to `calloutDecoration()` (`extensions/callout/callout.ts`, same shape) is enough. The `legacyClasses` helper (`setup/editor-extensions.test.ts:459-465`) is compared with `toEqual` on an exact object, so adding a key changes three assertions on purpose.
6. **P11 canvas half collides with canvas tickets.** `verdict-canvas.md` Q2 (header click, `FileNode.svelte:55-70`) and Q4 (theme tokens, `FileNode.svelte:102,131,160`) both edit `FileNode.svelte`. The scout's T3 mixed the editor and the canvas, so it is split here: the source-mode ticket runs any time, and the canvas-card ticket runs after (or before) canvas Q2 and Q4, never in parallel with them.
7. **P40 slice collides with live and quick tickets on `NoteActionBar.svelte`.** shell-sidebars-ux 15 (More menu group `:187-219`), 24 (breadcrumb `:126-132`, `:201`) and 32 (Back/Forward at the bar start) are ready-for-agent, and `verdict-canvas.md` Q6 edits the bar's tooltips (`:148,157,175`). The width entry (`:92-97`), the More loop (`:192-197`) and `inlineAction` (`:224-235`) are next to those edits, so run it alone in sequence. Not a reason to defer: the change is local to the `width` entry.
8. **P116 is owned by another slice.** `verdict-feedback-b.md:159-166` ticket QB5 is open-itens 213 plus the `GraphView.test.ts:73` "1 links" pin correction, and it already names editor P116 as the same work. So there is no editor ticket. Open-itens 213 gets wontfix with a pointer to QB5 once QB5 exists (the scout said not to wontfix it, but open-itens is abandoned and QB5 fully covers it).
9. **P111 `field-sizing` support checked.** caniuse (https://caniuse.com/mdn-css_properties_field-sizing) lists Safari 26.2 and later as supported and 26.0-26.1 as not. The host is Darwin 25.6 (macOS 26.x), so WKWebView very likely has it. Where it does not, the field stays as wide as today. A rule-string test cannot prove it renders, so the owner eye check is part of done. Also note the number input falls back to `type="text"` for a value it cannot hold (`widgets.ts:1057-1060`), and that fallback keeps today's width. That is accepted.
10. Path fix: the table widget test is `src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts`, not under `widgets/`.

## Per proposal

| id | final call | changed | evidence |
|---|---|---|---|
| P10 | QUICK-PART (aria-label only) | yes, narrowed | Accessible names on +col/+row (`widgets.ts:466-491`). Raw-mode Tab/align (rewrites table text), cell menu, 20 px handle and overlay are DEFER: the pinned E2E `table-add-buttons.spec.ts:31-42` and the tuned gap `styles.ts:373-379` |
| P11 | QUICK-PART | no (split, simplified) | Source-mode frontmatter line class (source only, `sourceModeExtensions()` at `setup/editor-extensions.ts:99-107`, reuse `findFrontmatterBlock`); canvas cards strip frontmatter (`FileNode.svelte:83`, `stripFrontmatter` at `embed-resolver.logic.ts:53-61`, read-only display, no write path). "Keys styled apart from values" waits |
| P41 | DEFER | no | Lezer only emits `TaskMarker` for `/^\[[ xX]\][ \t]/` (`node_modules/@lezer/markdown/dist/index.js:2223`); new inline parse path; `statusGlyph` is in `features/tasks/task-status.logic.ts:57` (core to features import); right-click status menu writes note text. No safe slice |
| P42 | DEFER | no | `registerKeybinding` ignores `defaultPrevented` (`utils/keybindings.ts:56-81`), Cmd+B = right sidebar (`global-keybindings.ts:142-147`, MVP file), palette in `commands.ts` (MVP file), owner call on Cmd+B |
| P40 | QUICK-PART | no | Disable the width toggle while `contentWidth === 0` (`NoteActionBar.svelte:92-97`, only caller of `toggleWideNotes`, `note-action-bar.service.ts:15-17`). The default value is DEFER (settings store is an MVP file, owner picks the number) |
| P112 | QUICK-PART | no (scope corrected) | `.cm-lp-image-missing` has no rule (only `widgets.ts:175,615` add it); no `error` listener; mermaid diagram empty until render (`mermaid-widget.ts:78-121`). Embedded notes as markdown is DEFER (M). Add the misc-features E2E stub and the `isConnected` guard |
| P113 | QUICK-PART | no | `writeText(...).then(...)` with no catch (`code-block-widget.ts:91-98`). Toggle task + Cmd+L DEFER (semantics, `commands.ts` MVP file, shares `TaskCheckboxWidget` with open-itens 061 and P41) |
| P114 | QUICK-PART | no (CSS corrected) | Italics from `tags.quote` (`highlight-styles.ts:39`); label `textTransform: lowercase` (`styles.ts:495-508`); header line style only `border-left-color` (`callout-field.ts:171-174`). Default title text and chevron dimming DEFER (Phase 17 decision, `callout-field.ts:217`). E2E `callout-text.spec.ts:71,152` use `toHaveText` (textContent), so they stay green and cannot prove the capitalisation; the rule test plus an eye check do |
| P110 | QUICK-PART | no | `.cm-lp-h1..h6` have no top spacing (`styles.ts:171-212`); the class is stable on reveal (`inline/handlers/heading-handler.ts:18,42`), so padding does not jump on click. Per-level setting DEFER (`settings.types.ts` is an MVP file). Use `var(--heading-hN-space-above, <em>)` so the later setting needs no CSS change |
| P111 | QUICK | no | Number input has no width rule (`styles.ts:783-794`); date shares the class (`widgets.ts:1050-1052`). CSS only, no change to the frontmatter write path |
| P116 | QUICK-PART, owned by feedback-b QB5 | yes (owner moved) | `WordCount.svelte:33` fixed plurals. The singular/zero fix ships as `verdict-feedback-b.md` QB5 (= open-itens 213). The "N of M words" selection count is DEFER (no selection state in `editor.store.svelte.ts`) |

No DONE and no DROP: every premise holds at HEAD.

## Final quick tickets

Run E1 and E2 one after the other (both edit `extensions/live-preview/styles.ts`; the color slice may also edit `--lp-*` tokens there). Tests use real stores and logic; only `navigator.clipboard`, `mermaid`, Tauri plugins and `readTextFile` are mocked, as the existing tests already do. Gate for each: `pnpm check` + `pnpm vitest run`, plus the named E2E specs via `bash scripts/e2e.sh <spec>`.

### E1. Live-preview widgets show failure and progress: failed image, rendering diagram, failed copy, named table buttons
- **Ids:** P112 (slice), P113 (slice), P10 (slice).
- **Files:** `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts` (`ImageWidget`, `WikilinkImageEmbedWidget`, `attachAddButtons`), `widgets/mermaid-widget.ts`, `widgets/code-block-widget.ts`, `styles.ts`; `e2e/specs/live-preview/misc-features.spec.ts`. Tests: `src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/{image-widget,wikilink-image-embed-widget,mermaid-widget,code-block-widget}.test.ts`, `table-widget.test.ts`, `styles.test.ts`.
- **What to build:** On an `<img>` `error` event, if `wrapper.isConnected`: add `cm-lp-image-missing` to the wrapper, replace the image with the text `Could not load "<name>"` (alt or wikilink target), call `view.requestMeasure()`. The unresolved-link text `"<target>" not found` stays. Style `.cm-lp-image-missing` as muted text in a dashed `--radius-xs` box using the embed error colour. The mermaid diagram container holds a `Rendering diagram...` placeholder that the existing success (`innerHTML`) and error (`textContent`) assignments replace; the cache and the empty-source path do not change (rule 2). A rejected or missing `navigator.clipboard` shows "Copy failed" on the code block button for 1500 ms, then "Copy". +col and +row get `aria-label` "Add column" / "Add row" (keep `title`). No change to table layout, padding or the add dispatches.
- **Acceptance criteria:**
  1. Failing test first: dispatching `error` on the `<img>` of an `ImageWidget` and of a resolved `WikilinkImageEmbedWidget` gives the wrapper `cm-lp-image-missing` and the text `Could not load "<name>"`, and the wrapper keeps `cm-lp-image-wrapper`. A detached wrapper does nothing and throws nothing.
  2. Failing test first: `styles.test.ts` finds an exact `.cm-lp-image-missing` rule with `border-radius: var(--radius-xs)` (add it to the `--radius-xs` ladder list at `:62`).
  3. Failing test first: a `MermaidWidget` whose `render` stays pending contains `Rendering diagram...`; after it resolves the text is gone and an SVG is present; the cached path renders the SVG with no placeholder; the empty source still shows "Empty mermaid diagram".
  4. Failing test first: with `writeText` rejecting, mousedown on `.cm-lp-codeblock-copy` shows "Copy failed", then "Copy" after 1500 ms (fake timers); with no `navigator.clipboard`, the same, with no unhandled rejection; resolving still shows "Copied!".
  5. Failing test first: in `table-widget.test.ts` the two buttons have `aria-label` "Add column" and "Add row". The existing mousedown `stopPropagation` (rule 11) and append tests are unchanged.
  6. `misc-features.spec.ts` "image renders widget" routes its URL to a stub PNG and still sees `img.cm-lp-image`. A new step with a route that answers 404 sees `.cm-lp-image-missing` with "Could not load". `click-reveal/code-block-copy.spec.ts`, `embed-widgets.spec.ts`, `click-reveal/image.spec.ts`, `click-reveal/wikilink-image-embed.spec.ts`, `mermaid.spec.ts` and `click-reveal/table-add-buttons.spec.ts` pass.
  7. Owner eye check: a note with a deleted image file and one with a mermaid block.

### E2. Callouts, headings and the meta-bind number field read cleanly
- **Ids:** P114 (slice), P110 (slice), P111.
- **Files:** `src/lib/core/markdown-editor/extensions/live-preview/styles.ts`, `plugins/callout-field.ts` (header and body line `style` attribute). Tests: `styles.test.ts`, `plugins/callout-field.test.ts`.
- **What to build:** (a) The callout line style gains `--callout-accent: <header.color>` next to `border-left-color`. `.cm-lp-callout-type-label` gets `text-transform: capitalize` and `color: var(--callout-accent, inherit)`. (b) `:where(.cm-lp-callout) span { font-style: normal }` and `.cm-lp-callout .cm-lp-italic, .cm-lp-callout .cm-lp-italic span { font-style: italic }`. (c) `padding-top: var(--heading-hN-space-above, X)` on `.cm-lp-h1..h3` only (start at 0.6em, 0.5em, 0.4em; tune by eye). (d) `.cm-lp-meta-bind-input[type="number"]` gets `field-sizing: content`, `min-width: 4ch` and `max-width: 16ch`. No default title text, no chevron change, no settings field.
- **Acceptance criteria:**
  1. Failing test first: `exactRule('.cm-lp-callout-type-label')` contains `text-transform: capitalize` and `color: var(--callout-accent, inherit)`.
  2. Failing test first: with `computeCallouts`, the header line of a `[!warning]` callout carries `--callout-accent: ` plus the warning colour in its `style`; the existing decoration counts in `callout-field.test.ts` stay the same.
  3. Failing test first: the emitted theme has a `:where(.cm-lp-callout) span` rule with `font-style: normal` (not a plain `.cm-lp-callout span` rule) and a `.cm-lp-callout .cm-lp-italic` rule with `font-style: italic`.
  4. Failing test first: `.cm-lp-h1..h3` rules contain `padding-top: var(--heading-h1-space-above` (etc.); `.cm-lp-h4..h6` contain no `padding-top`.
  5. Failing test first: a `.cm-lp-meta-bind-input[type="number"]` rule has `field-sizing: content` and `min-width: 4ch`; the shared `.cm-lp-meta-bind-input` rule is unchanged.
  6. `click-reveal/callout-text.spec.ts`, `click-reveal/callout-controls.spec.ts`, `click-reveal/heading.spec.ts`, `headings.spec.ts` and `click-reveal/meta-bind-*.spec.ts` pass.
  7. Owner eye check in the app: a callout with `*emphasis*` and a meta-bind error inside it (both still italic, body plain), a yellow `warning` label readable in the light theme, heading spacing at the top of a note, a number control beside a select.

### E3. Frontmatter reads as metadata in source mode
- **Ids:** P11 (source-mode slice).
- **Files:** a source-only line-decoration ViewPlugin in `src/lib/core/markdown-editor/extensions/` (shape of `extensions/callout/callout.ts`, reusing `findFrontmatterBlock` / `FRONTMATTER_FENCE_RE` from `extensions/live-preview/parsers/frontmatter.ts`), wired into `sourceModeExtensions()` in `setup/editor-extensions.ts`, with its theme rule. Tests: `src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts`.
- **What to build:** In source mode only, lines from the opening `---` to the closing `---` get `cm-source-frontmatter`. The theme sets those lines and their descendant spans to body font size, normal weight and `var(--syntax-meta)`. Recompute on doc change only. No class when line 1 is not a fence, when the fence is unclosed, or for a later `---`.
- **Acceptance criteria:**
  1. Failing test first: in source mode `---\n_type: Meeting\n---\n# Title` puts `cm-source-frontmatter` on lines 1-3, not line 4; live preview puts it on none; the compartment swap test toggles it (the `legacyClasses` objects gain the key on purpose).
  2. Failing test first: no class for a doc not starting with `---`, an unclosed fence, or a body `---`. Typing the closing fence adds the class and deleting it removes it.
  3. Failing test first: the theme has a rule for `.cm-source-frontmatter` and its spans with normal weight and `var(--syntax-meta)`.
  4. `e2e/specs/live-preview/source-mode.spec.ts` and `source-mode-toggle.spec.ts` pass. Owner eye check: a typed note in source mode.

### E4. Canvas file cards preview the note without its frontmatter
- **Ids:** P11 (canvas slice); absorbs open-itens 050.
- **Files:** `src/lib/features/canvas/canvas-markdown.logic.ts` (wrapper over `stripFrontmatter`), `src/lib/features/canvas/FileNode.svelte` (`:81-85`, render and empty branch). Tests: `src/tests/lib/features/canvas/canvas-markdown.logic.test.ts`.
- **Sequencing:** not in parallel with canvas Q2 or Q4 (`verdict-canvas.md`), which also edit `FileNode.svelte`.
- **What to build:** File nodes render the body after the frontmatter. A file that is only frontmatter shows the existing "Empty file" state. Text nodes keep rendering a leading `---` as today. Display only: the file is never written. Known limit, stated not widened: `stripFrontmatter` leaves a CRLF file as is (`embed-resolver.logic.ts:58`), the same as the kanban card preview.
- **Acceptance criteria:**
  1. Failing test first: the file-preview render of `---\ntype: person\ntags: [a]\n---\n# Title\nBody` contains the Title heading and Body and neither `type: person` nor `<hr>`.
  2. Failing test first: a frontmatter-only file yields an empty body (so the empty state shows); a file with no frontmatter renders as today; `renderCanvasMarkdown('---\ntext')` for a text node is unchanged.
  3. Owner eye check: a typed note on a canvas. Open-itens 050 gets wontfix with a pointer to this ticket.

### E5. The note width toggle says when it cannot work
- **Ids:** P40 (slice).
- **Files:** `src/lib/features/note-action-bar/NoteActionBar.svelte` (the `width` entry `:92-97`, the More loop `:192-197`, `inlineAction` `:224-235`). Tests: `src/tests/lib/features/note-action-bar/NoteActionBar.test.ts`.
- **Sequencing:** not in parallel with shell-sidebars-ux 15, 24, 32 or canvas Q6, which edit the same file.
- **What to build:** While `settingsStore.editor.contentWidth === 0`, the width action is disabled. Its label and title read "Set a content width in Settings > Editor to use this". Inline, it uses `aria-disabled="true"` and the click does nothing; in More, `DropdownMenuItem disabled`. With a width set, nothing changes. No settings file is touched.
- **Acceptance criteria:**
  1. Failing test first (real `settingsStore`): with `contentWidth` 0 the inline width button has `aria-disabled="true"` and the Settings label; clicking it leaves `wideNotes` unchanged.
  2. Failing test first: with `contentWidth` 0 and a narrow bar, the More width item is disabled and does not toggle.
  3. The test at `NoteActionBar.test.ts:382-401` sets `contentWidth` 720 first, and all its assertions stay.
  4. `e2e/specs/note-action-bar.spec.ts:103-126` (sets 600 first) passes.

## Deferred

- P10 raw mode: Tab/Shift+Tab between cells, Tab adds a row, pipe alignment. These rewrite table text in daily tables. L.
- P10 rendered: a 20 px add handle, the overlay, and open-itens 211. Both conflict with the pinned `table-add-buttons.spec.ts:31-42` and the tuned gap, so an owner decision is needed. 211 stays open.
- P10 cell menu for delete and align: a new widget that writes table text.
- P11 keys styled apart from values in source mode: polish on top of E3, later.
- P41 custom task status glyphs and the status menu: new parse path, a layer move of `statusGlyph`, and writes to note text. After open-itens 061.
- P42 formatting and insert commands: Cmd+B conflict, keybinding dispatch, MVP files, owner decision.
- P40 default `contentWidth` (72ch or px): settings store is an MVP file, saved values exist, owner picks the number.
- P112 embedded notes rendered as read-only markdown: M, a new render path in the embed widget.
- P113 Toggle task command and Cmd+L: semantics undecided, `commands.ts` is an MVP file, shares `TaskCheckboxWidget` with 061 and P41.
- P113 ARIA and key handling inside widgets: the proposal itself puts it later.
- P114 type name as the default title: new header text decoration.
- P114 chevron dimming: needs the owner, Phase 17 decision.
- P110 per-level "space above" setting: settings schema plus `settings.types.ts` (MVP file) plus the heading editor UI.
- P111 date input native chrome: WebKit internals; the padding and border are already shared.
- P116 "N of M words" for a selection: needs new editor selection state. M.

## Overlaps

- open-itens 050: fully covered by E4. Mark wontfix with a pointer.
- open-itens 213: fully covered by feedback-b QB5 (which also names editor P116). Mark wontfix with a pointer to QB5.
- open-itens 211: not covered (DEFER above). Leave it.
- open-itens 061: not covered; prerequisite for P41 and Toggle task.
- shell-sidebars-ux 15, 24, 32: ordering dependency for E5 (same file), not replacements.
- Canvas verdict Q2 and Q4: ordering dependency for E4 (`FileNode.svelte`); Q6: ordering dependency for E5 (`NoteActionBar.svelte`).
- Color slice: may change `--lp-*` and `--callout-*` tokens that E1 and E2 reuse. E2's coloured type label depends on callout colour contrast, which the color work may adjust.

Not checked: the real-app rendering of any CSS (WKWebView `field-sizing`, nested highlight spans with `:where`, heading padding at the note top). I read code and tests and ran nothing.
