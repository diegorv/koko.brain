## Topic 1
Overall editor architecture: which editor is primary (BlockNote? TipTap? CodeMirror?), how a note goes markdown -> editor document -> markdown (find the parse/serialize code, e.g. richEditorMarkdown, durableMarkdownBlocks, markdownSourcePatch). Do they ever show raw markdown syntax inline like Obsidian live preview?

**Tolaria is not a CodeMirror live-preview editor. It is a BlockNote WYSIWYG editor with a separate CodeMirror raw mode, and the two are never shown together.**

**Primary editor**
- Rich mode is BlockNote 0.46.2 on ProseMirror/TipTap 3.30.5 (`package.json`). ADR 0022 (`docs/adr/0022-blocknote-rich-text-editor.md`) records this choice.
- CodeMirror 6 is raw mode only. `src/components/RawEditorView.tsx` uses `useCodeMirror`, and `src/extensions/markdownHighlight.ts` applies `@codemirror/lang-markdown` highlighting. ADR 0037 and 0140 cover this.

**Markdown to document to markdown**
- Load: `richEditorMarkdown.ts` runs `preProcess*` steps (wikilinks, durable blocks, math, table cell breaks, tildes), converts to BlockNote blocks through `inject*` steps (`injectWikilinks`, `injectDurableEditorMarkdownBlocks`, `injectCalloutBlocks`, `injectMathInBlocks`, and others), and records the source in `richEditorSourceState.ts` (a WeakMap of up to 32 snapshots, each with source and spans).
- Save: `serializeRichEditorDocumentToMarkdown` (`richEditorMarkdown.ts:490`) calls `blocksToMarkdownDirect` (`blockNoteDirectMarkdown.ts:511`) and `serializeDurableEditorBlocks`. It then calls `patchMarkdownSourceWithMap` (`markdownSourcePatch.ts:216`), which splices changed spans into the original source so unchanged bytes survive the round trip.
- ADR 0116 makes `richEditorMarkdown.ts` the single owner of serialization for autosave, tab swap and raw-mode entry.
- ADR 0187 (Yjs collaboration) keeps the Markdown file as the canonical form.

**Does it show raw syntax inline like Obsidian?**
- No. Rich mode renders syntax as BlockNote nodes. There is no per-line reveal of markers when the cursor enters a line.
- Raw mode shows the whole file as highlighted source. Its highlighting colours tokens but does not hide markers, and the two modes are toggled, not hybrid.
- ProseMirror decorations do exist (ADR 0142; `richEditorTextDirection.ts`, `richEditorBlockSelectionExtension.ts`, `codeBlockLineNumbers.ts`), but in what I read they serve RTL direction, block selection and line numbers, not marker hiding.
- Kokobrain's model (one CM6 document as source of truth, decorations hiding markers except on the cursor line) has no counterpart here. Tolaria instead keeps a block model and treats Markdown as an output, with source patching to limit round-trip loss.

**Checked and not checked**
- Checked: package.json, ADRs 0022, 0037, 0116, 0140, 0142, 0187, the import graph under `src/`, and the function locations above.
- Not checked: the internals of `markdownSourcePatch.ts` and `blockNoteDirectMarkdown.ts`, a full grep for any rich-mode marker-hiding decorations, and running the app. The `/tmp/tolaria` clone is shallow (`--depth 1` when fresh; it already existed, so its depth is unknown).

## Topic 2
The CodeMirror raw/source mode: find all files importing @codemirror. What extensions/decorations do they use? Any cursor-line reveal or syntax hiding? How do they switch between rich and raw mode and keep state in sync?

Tolaria is a different architecture from Kokobrain. It has no cursor-line reveal or syntax hiding, and it does not do live preview in CodeMirror. CodeMirror is only the raw source editor. The rich editor is BlockNote.

**Clone:** `/tmp/tolaria` at commit `84df59c`. Nothing was run in the repo.

**Files importing `@codemirror` or `@lezer` (excluding tests):**
- `src/hooks/useCodeMirror.ts`: the main view setup. Imports `@codemirror/view`, `state`, `commands`, `language`.
- `src/hooks/useCodeMirrorReadOnly.ts`: read-only `Compartment`.
- `src/extensions/markdownHighlight.ts`: markdown language plus `HighlightStyle`.
- `src/extensions/frontmatterHighlight.ts`: `Decoration.mark` for YAML frontmatter.
- `src/extensions/editorFindHighlight.ts`: `StateField` with `Decoration.line` and `Decoration.mark` for find matches.
- `src/extensions/rawEditorLanguage.ts`: lang-html/js/json/python/sql/yaml, selected by file path.
- `src/extensions/zoomCursorFix.ts`: `ViewPlugin` that corrects coordinates under CSS zoom.
- `src/components/RawEditorView.tsx`, `RawEditorFindBar.tsx`, `rawEditorAutocomplete.tsx`, `rawEditorFindTypes.ts`: types and UI only.
- `src/utils/rawMarkdownSource.ts`: maps CM `ChangeSet` onto the source string, preserving CRLF.
- `src/utils/rawEditorUtils.ts`: type import only.

**Extensions in use (`useCodeMirror.ts`):** line numbers, `highlightActiveLine`, history, `defaultKeymap`/`historyKeymap`, `indentUnit`, `EditorView.perLineTextDirection` with a `Decoration.line` setting `dir="auto"`, and a custom theme pulling from CSS variables (`var(--surface-editor)`, `var(--state-hover-subtle)`). Syntax colours come from `HighlightStyle.define` in `markdownHighlight.ts` (`var(--syntax-heading)`, etc.).

**Syntax hiding and cursor reveal: none.** A grep for `Decoration.replace`, `Decoration.widget`, `display:none` and cursor-based decorations in `src/` finds nothing in the editor code. Markdown is shown as raw text, styled only with colour, weight and font-size. `markdownHighlight.ts` gives `heading1` `fontSize: '1.4em'` and the `*`/`#` markers keep their size. The only `Decoration.widget` hits are `imeCompositionKeyGuardExtension.ts:71` and `codeBlockLineNumbers.ts:27`. Those are not markdown hiding.

**Rich/raw switching:**
- A raw flag lives in the layout. `editor-content/editorContentState.ts:92`: `const effectiveRawMode = rawMode || isNonMarkdownText`. Non-markdown text files are always raw.
- `useEditorContentModel.ts:104`: `onToggleRaw` calls `toggleRaw()`. If BlockNote crashes with `react_update_depth_exceeded`, it writes `editor_mode: 'raw'` into the vault config.
- The raw view is mounted only when `rawMode` is true (`EditorContentLayout.tsx:169`). BlockNote is used otherwise. Each mode is a separate React subtree.
- Cursor and scroll are carried over by `src/components/editorModePosition.ts`. It converts the BlockNote cursor to a line ratio (`RawEditorPositionSnapshot { anchorLineRatio, headLineRatio }`) and back. It also uses `data-testid="raw-editor-codemirror"` to find the `EditorView` through `__cmView`.

**Keeping state in sync:**
- Raw to rich: `src/components/editorRawModeSync.ts` uses `buildPendingRawExitContent`, which calls `serializeRichEditorDocumentToMarkdown` from BlockNote. The result becomes `pendingExitContent`, then `rawModeContentOverride`, and feeds `rawModeContent` in `useEditorSetup.ts:314`. Raw content therefore wins over the stale tab content when leaving BlockNote.
- Raw edits: `RawEditorView.tsx:54` sets `DEBOUNCE_MS = 500`. Each doc change updates `latestContentRef` immediately and calls `onContentChange` after 500 ms. Save and unmount flush the pending change.
- Prop to doc: `useRawEditorContentSync` runs `setRawDoc(content)` on every `content` prop change. The external-change path is therefore prop-driven, not diffed.

**Relevance to Kokobrain:** the Tolaria design avoids the cursor-line reveal problem entirely. Rich mode is a separate WYSIWYG engine, not decorations over source. The bullet/H1 arrowing glitch you describe would not appear in Tolaria's raw mode, because it has no hidden markers. Kokobrain's live-preview decoration layer has no direct counterpart here.

**Not checked:** `docs/` in the Tolaria repo, the BlockNote-side schema, and the tests. Paths were not verified at runtime.

## Topic 3
Headings and lists: how are headings and bullet/ordered/task lists rendered and edited? Any special handling for keyboard navigation (ArrowUp/Down), list keymaps, gapcursor, or caret issues between blocks of different heights?

**Tolaria (/tmp/tolaria) uses a block model in rich mode, not a shared text document, so it is not comparable to Kokobrain's CM6 live preview.** Rich mode is BlockNote over ProseMirror/TipTap. Raw mode is CodeMirror 6.

**Headings and lists**
- Headings are blocks with a `level` prop (`src/components/titleHeadingInteractions.test.ts`, fixture around lines 14-18). The first block is the H1 title, guarded by `src/components/titleHeadingPasteTarget.ts`.
- Lists are block types `bulletListItem`, `numberedListItem`, `checkListItem`, `toggleListItem` (`src/components/richEditorListTabExtension.ts`). Nesting is block children, via `nestBlock()`/`unnestBlock()` on Tab/Shift-Tab.
- Bullet markers are CSS `::before` gradients sized from `--editor-font-size` (`src/components/EditorTheme.listMarkers.test.ts` asserts the CSS).

**Keyboard navigation**
- No ArrowUp/Down handling for headings or lists. Only two arrow extensions are wired in `src/components/useEditorSetup.ts` (lines 269-272):
  - `richEditorCodeBlockArrowNavigationExtension.ts`: line-by-line movement inside code blocks, native `selection.modify('move', ..., 'line')`, and crossing into adjacent blocks at the edges.
  - `richEditorEmptyListNavigationExtension.ts`: in an empty list item, ArrowUp/Down moves to the prev/next block.
- Gapcursor: no reference in non-test `src`. BlockNote/TipTap may enable it internally; I did not confirm.
- Caret: `patches/prosemirror-view@1.42.3.patch` replaces `isEquivalentPosition` with an `equivalentPositionParent` helper in `dom.ts`. This changes how DOM selection maps to document positions. The patch has no explanatory comment. It is the most likely place for caret bugs, but I did not reproduce any.
- Block height differences are handled in CSS only (`src/components/editorSchema.math.test.ts` ~136-141 covers divider-to-heading margins).

**Raw mode and marker hiding**
- `src/components/RawEditorView.tsx` mounts CodeMirror. `src/extensions/markdownHighlight.ts` is a `HighlightStyle` that sizes headings by tag (lines 26-31). It hides nothing.
- `src/components/Editor.css` (lines ~280-351) has "Bear-style live preview" rules for `.cm-heading-line` and `.cm-formatting-block`: absolutely positioned markers, opacity toggled by a `-visible` class. A grep of `src` finds no code that adds those classes, so these rules are either dead or depend on a library I did not check.

**Comparison with Kokobrain**
- Kokobrain hides markers with decorations gated by cursor line (`checkUpdateAction` + `lastCursorLine`, per `/Users/diegorv/Dev/pet-projects/koko/brain/CLAUDE.md`). Tolaria has no equivalent in running code. Its raw-mode hiding is CSS and is not tied to the cursor line in `src`.
- Tolaria avoids the H1-to-bullet arrow problem by letting ProseMirror handle vertical moves per block. Kokobrain's glitch comes from CM6 line-based motion around widgets and replaced ranges. Tolaria's analogous risk sits in the prosemirror-view caret patch.

**Not checked:** I did not run either app. I read only `CLAUDE.md` for Kokobrain, not its live-preview source. Nothing in `/tmp/tolaria` was edited.

## Topic 4
Round-trip fidelity: how do they preserve markdown the rich editor cannot represent (unknown syntax, frontmatter, wikilinks, callouts, math, mermaid, tables)? Look at durable/raw block utilities and tests.

**Tolaria round-trip fidelity (read-only, /tmp/tolaria @ 84df59c)**

Tolaria does not keep the Markdown source in the rich editor. It converts BlockNote blocks back to Markdown and uses several layers to keep unrepresentable syntax intact.

1. **Source patching keeps unchanged bytes.** `src/utils/richEditorMarkdown.ts` (`serializeRichEditorDocumentToMarkdown`, ~L490) calls `patchMarkdownSourceWithMap(tabContent, baseline.rendered, rendered, baseline.spans)`. It diffs the previous canonical render against the new one and applies only the changed hunks to the original file text. `richEditorSourceState.ts` caches snapshots per editor and path (limit 32). `markdownSourcePatch.test.ts` checks that an untouched doc returns source bytes unchanged, and that HTML, entities and tables survive a one-character edit.

2. **Durable block codecs for fenced syntax.** `src/utils/durableMarkdownBlocks.ts` finds a fence whose info string a codec claims, stores the source in a payload, and replaces it with a token (`@@TOLARIA_MERMAID_BLOCK:...@@`) that BlockNote treats as a paragraph. `mermaidMarkdown.ts` stores `{source, diagram}` so the original fence is re-emitted. Codecs registered in `editorDurableMarkdown.ts`: `htmlBlockMarkdownCodec`, `mermaidMarkdownCodec`, `tldrawMarkdownCodec`. Tests: `editorDurableMarkdown.test.ts` ("round-trips Mermaid and tldraw blocks through one durable pipeline") and `mermaidMarkdown.test.ts`.

3. **Inline bridges.** `wikilinks.ts` swaps `[[...]]` for `\u2039WIKILINK:...\u203A` placeholders during import and restores them on export. `mathMarkdown.ts` handles `$...$`/`$$...$$` (`mathMarkdown.test.ts` covers inline math in table cells). `markdownHighlightMarkdown.ts` maps `==text==` and Bear-style color prefixes. `calloutMarkdown.ts` keeps callout marker metadata in block props and writes `> [!type]` back.

4. **Frontmatter is outside the editor.** `richEditorMarkdown.ts` L550-553 runs `splitFrontmatter(tabContent)` and prepends the original frontmatter text to the body on save.

5. **Fallbacks.** `blockNoteDirectMarkdown.ts` (`serializeBlockNoteMarkdown`) uses a direct serializer when every block shape is known. Otherwise it falls back to BlockNote's `blocksToMarkdownLossy`. Aligned tables stay source-backed on mobile (`docs/adr/0262-mobile-tentap-table-node.md`). `docs/adr/0082-markdown-durable-math-notes.md` explains why math was not added as a ProseMirror node: it would risk rewriting the source.

**Raw mode** (`src/components/RawEditorView.tsx`, `src/utils/rawMarkdownSource.ts`) edits the file text directly. `applyRawMarkdownChanges` applies CodeMirror changes to the source string and keeps mixed CRLF/LF endings.

**Kokobrain comparison:** Kokobrain stores raw Markdown in the CodeMirror doc, so there is no serializer layer and no round-trip loss to manage. Its risk is different: decorations that hide syntax must not change the document text. Tolaria's cost is the bridge code above, with the source patch as the main safeguard.

**Not verified:** I did not run Tolaria's test suite, so the test-pass status is unknown. I read only the listed utilities and tests, not the BlockNote internals.

## Topic 5
Custom blocks/widgets: math, mermaid, callouts, code blocks, embeds, tables. How are they implemented (BlockNote custom blocks, React node views)? Any caching of rendered output?

**Tolaria: custom blocks and caching (read-only, /tmp/tolaria)**

**Architecture:** Tolaria is a rich BlockNote editor, not a CodeMirror live-preview editor. Custom blocks are `createReactBlockSpec` React node views:
- `src/components/editorSchema.tsx:316` `MathBlock`, `:331` `MermaidBlock` (with `runsBefore: ["codeBlock"]` and a markdown `parse` that reads ```` ```mermaid ```` fences), `:411` `TldrawBlock`, `:441` `EmbeddedBlockSpec`.
- `src/components/CalloutBlock.tsx:60` `CalloutBlockSpec`, rendering an `<aside class="tolaria-callout">`.
- `src/components/tolariaFileBlockSpec.ts:9` file block.
- Markdown is the on-disk format. Each block has a codec (`utils/mathMarkdown.ts`, `utils/mermaidMarkdown.ts`, `utils/calloutMarkdown.ts`, `utils/htmlBlockMarkdown.ts`) that converts to and from text.
- Raw mode is a separate CodeMirror view (`components/RawEditorView.tsx`, `utils/rawEditorUtils.ts`), toggled exclusively with the rich editor (`components/Editor.tsx`, `handleToggleRawExclusive`). Only one is mounted at a time, so there is no cursor-line reveal.

**Rendering and caching:**
- **Math:** `editorSchema.tsx:139` `MathRender` calls `renderMathToHtml` (`utils/mathMarkdown.ts:584`, `katex.renderToString`) on every render. No cache.
- **Mermaid:** `components/MermaidDiagram.tsx` renders in a `useEffect` through a module-level `renderQueue` promise chain (line 37, 153). The SVG lives in component `useState` (line 249). Nothing is cached across unmounts, so each remount re-renders. Errors fall back to a raw-source view.
- **Callouts:** no render cost to cache; they are plain DOM.
- **Whole notes:** `src/hooks/editorParsedBlockCache.ts` is an LRU of parsed BlockNote blocks per note (`PARSED_NOTE_BLOCK_CACHE_LIMIT = 6`, 768 KB per entry, 3 MB total). Parsing is also offloaded to `hooks/editorFastMarkdownBlocks.worker.ts`.

**Comparison with Kokobrain:**
- Tolaria does not do Obsidian-style live preview, so it has none of the cursor-line glitches you describe. Its trade-off is a markdown round trip through codecs and a hard switch to raw mode.
- Kokobrain caches at the widget level (`docs/PATTERNS.md`, CLAUDE.md "Performance Guidelines"): KaTeX HTML strings keyed with `displayMode`, Mermaid SVG strings, and live DOM for queryjs. Tolaria caches only at note level, and math and Mermaid re-render on remount.
- Tolaria's Mermaid render queue serializes renders, which Kokobrain does not do.

**Not checked:** I did not run the app or tests, and I did not check the BlockNote patches in `patches/@blocknote__*.patch`, which may change block-level behaviour. I also did not read the arrow-key handling in the rich editor, so I cannot say whether Tolaria has the same arrow-key issues.

## Topic 6
Wikilinks and inline marks: how are [[wikilinks]], highlights, strikethrough, inline code, autolinks implemented in the editor? Input rules, marks, decorations?

Tolaria does not do Obsidian-style live preview. It is a WYSIWYG BlockNote/ProseMirror editor that stores markdown and converts syntax into rich inline nodes and marks. CodeMirror only renders the raw mode, and I found no decoration that hides markup there.

**Wikilinks: a custom inline node, not an input rule**
- `[[target]]` is handled by markdown pre/post-processing. `/tmp/tolaria/src/utils/wikilinks.ts:34` (`preProcessWikilinks`) replaces each `[[...]]` outside inline code with a placeholder `\u2039WIKILINK:target\u203A`. Injection and restore run through `injectWikilinks` (line 297) and `restoreWikilinksInBlocks` (line 306). Serialization back to `[[target]]` is at line 340.
- The node is a `createReactInlineContentSpec` with `type: "wikilink"`, `propSchema: { target }` and `content: "none"`, rendered as `<span class="wikilink" data-target=...>` in `/tmp/tolaria/src/components/editorSchema.tsx:112`. It is registered at line 502.
- Typing `[[` opens the autocomplete menu through `buildItems(query, '[[')` in `/tmp/tolaria/src/components/singleEditorSuggestionItems.tsx:329`. Selection inserts `{ type: 'wikilink', props: { target } }` (line 88). Rendering lives in `WikilinkSuggestionMenu.tsx`.

**Highlights (`==text==`): a custom style plus a text-prefix scheme**
- `/tmp/tolaria/src/components/editorSchema.tsx:487` defines `MarkdownHighlightStyle = createStyleSpec(...)`, rendered as `<mark class="markdown-highlight">`.
- `/tmp/tolaria/src/utils/markdownHighlightMarkdown.ts` handles the markdown side. `splitTextItemAtHighlightDelimiters` (around line 126) splits text on `==`. `addHighlightStyle` (around line 147) sets `styles.highlight = true`, plus `backgroundColor` for non-default colors. The color is encoded as a markdown prefix, read by `readMarkdownHighlightPrefix` (line 89).
- Toolbar and cursor toggles call `updateHighlightMarks` in `/tmp/tolaria/src/components/markdownHighlightModel.ts`, which uses ProseMirror `addMark`/`removeMark`.

**Strikethrough (`~text~`)**
- Single-tilde strikethrough is a pre-process step. `preProcessSingleTildeStrikethrough` in `/tmp/tolaria/src/utils/markdownStrikethrough.ts:65` escapes single `~` into `\~` and leaves double `~~` alone. It is called from `/tmp/tolaria/src/utils/richEditorMarkdown.ts:147`. The strikethrough mark itself comes from BlockNote.

**Inline code**
- No custom node. Code spans are protected from every transform by `transformOutsideInlineCode` in `/tmp/tolaria/src/utils/markdownInlineCode.ts`, which is used by the wikilink, highlight and strikethrough passes. The code mark comes from BlockNote.

**Autolinks**
- Links come from BlockNote's default link mark. Tolaria adds policy on top. `/tmp/tolaria/src/utils/editorLinkAutolink.ts` decides which hrefs count as links (`shouldAutoLinkTolariaHref`, line 119) and which filename-like text to strip (`shouldStripAutoLinkedLocalFileMark`, line 136). `/tmp/tolaria/src/components/useFilenameAutolinkGuard.ts` removes accidental filename autolinks through a transaction listener.

**Comparison with Kokobrain**
- Mechanisms differ. Tolaria round-trips markdown into a ProseMirror schema and does not show raw syntax. Kokobrain keeps raw markdown in the CodeMirror doc and hides syntax with decorations. The only overlap is the treatment of `[[...]]` as a special token that must survive round-trips. Tolaria's approach avoids the cursor-line glitch you describe, because there is no raw markup to reveal or hide.

**Not verified**
- BlockNote's own input rules for bold, code, strikethrough and links live in `node_modules`, which I excluded, so I did not read them.
- I did not check Tolaria's raw CodeMirror mode in depth beyond the decoration grep.
- I did not spawn the 10 Haiku sub-agents you mentioned. The task text described a single read-only analysis, and I did it directly.

## Topic 7
Performance strategy: editor performance thresholds (.editor-performance-thresholds.json, editorPerformanceTrace), mutation flush, debounced saves, large-document handling. What do they measure and how?

Read-only analysis of `/tmp/tolaria`. The clone already existed there, so I used it as-is without re-pulling. I did not spawn sub-agents because the task was a single read-only pass.

**What is measured and how**
- `.editor-performance-thresholds.json` holds per-scenario budgets (`baselineMs` median, `p90Ms`, `maxMs`) for `small` (5 sections), `large` (460 sections), `startup` and `list`. Example: large `blockApplyMs` baseline 213.2, max 288. Edit frame max is 16.
- `scripts/editor-performance-benchmark.mjs` runs Playwright against the production build. The `__TOLARIA_PERFORMANCE_HARNESS__` flag turns on the DEV-only trace logs. It times `performance.now()` at title click, editor visible, section 1 and section N present. Edit frame is `execCommand('insertText')` plus one `requestAnimationFrame`, around line 398.
- `scripts/editor-performance-statistics.mjs`: 1 warmup plus 5 samples; median is gated, p90 is diagnostic only.
- `scripts/editor-performance-thresholds.mjs`: budget is `max(median*1.35, median+25)`, and edit frame uses `max(median*2.5, median+8, 16)`. `updateThresholds` only lowers `maxMs` (ratchet). A missing metric fails closed.
- `src/utils/editorPerformanceTrace.ts` emits `richEditorSerialize`, `editorBlockResolve`, `editorBlockApply` and similar lines through `logPerf` (`console.debug "[perf]"`). `canMeasurePerformance()` in `performanceLogging.ts` gates them, and each trace skips quiet calls (e.g. `blockCount < 200 && durationMs < 4`).
- `docs/PERFORMANCE.md` describes the CI job `performance-regression`. A separate big-vault web bench uses budgets in `apps/web/bigVaultBudgets.ts`, with typing p95 at 100 ms and memory at 80 MB.

**Mutation flush**
- `src/utils/editorMutationFlush.ts` `persistEditorStateBeforeMutation` calls `flushPendingEditorContent`, then `flushPendingRawContent`, then awaits `savePendingForPath`.
- It is wired in `src/App.tsx:548` before file mutations. `flushEditorStateBeforeAction` in the same file adds the app save.

**Debounced saves**
- `src/hooks/editorChangeDebounce.ts`: `RICH_EDITOR_CHANGE_DEBOUNCE_MS = 1_500`, a trailing timer. It flushes synchronously on unmount.
- `useRawModeWithFlush.ts` has `flushBeforeRawMode` and `flushBeforePathChange`, so the pending rich edit is serialized on mode toggle or path change.
- The raw CodeMirror mode has no debounce in this hook. It is flushed on mode switch.

**Large documents**
- `src/hooks/editorContentSwapApply.ts:16-18`: notes over 320 blocks apply progressively, with a first chunk of 48 blocks and then chunks of 120.
- Measured cost: large-note block apply is 213 ms against 11 ms for the small note, and it dominates full-applied time (383 ms).

**Versus Kokobrain**
- Tolaria is a BlockNote/ProseMirror rich editor with a CodeMirror raw toggle. It has no Obsidian-style live preview, so the arrow-key bullet/H1 cursor-line glitch does not map onto its code.
- Kokobrain's debounce per its `CLAUDE.md` is 500 ms for frontmatter and 2000 ms for body (`editor.service.ts`). Its live preview uses viewport-skip guards and a 150 ms scroll debounce. I did not read the Kokobrain source to verify these.
- The transferable idea is Tolaria's CI gate: milestone budgets, a production build, median-of-5 and a ratchet that only tightens. I did not see an equivalent budget gate in Kokobrain's `CLAUDE.md`.

**Not checked:** I did not run the benchmark or trace the `flushPendingEditorContent` registration. I did not read Kokobrain's code.

## Topic 8
Lessons applicable to a CodeMirror live-preview editor: search their docs/, docs/adr, CLAUDE.md, AGENTS.md, release-notes and git-free notes for decisions about why they chose a block editor vs live preview, known editor bugs/regressions (cursor, selection, headings, lists) and how they fixed them.

Tolaria chose BlockNote (a block editor) with CodeMirror only as a raw mode, so it does not do Kokobrain-style live preview. Its docs have no reports of arrow-key bugs between bullets and H1s. The closest lessons are in how it keeps raw markdown and rich edits in sync.

**Why block editor (ADR-0022, `/tmp/tolaria/docs/adr/0022-blocknote-rich-text-editor.md`)**
- Options considered: BlockNote + CodeMirror raw mode (chosen), ProseMirror directly, CodeMirror only, Monaco.
- Rejected CodeMirror-only as "poor UX for non-technical users, no inline previews". Live preview was not evaluated as its own option.
- Cost it accepted: a markdown round-trip pipeline (`splitFrontmatter` → `preProcessWikilinks` → `tryParseMarkdownToBlocks` → `injectWikilinks`, with placeholder tokens `‹`/`›`).

**Lessons that transfer to a CodeMirror live-preview editor**
- Syntax highlighting via the official parser, not regex: ADR-0037 (`/tmp/tolaria/docs/adr/0037-codemirror-language-markdown-highlighting.md`) replaced a regex heading decoration with `@codemirror/lang-markdown` plus a `HighlightStyle`. Its context says regex tokenising was "already proving hard to maintain after the heading/frontmatter overlap bug". Relevant to your H1/bullet glitches.
- Keep original bytes as the source of truth: `docs/ABSTRACTIONS.md` (around line 699) describes editor-scoped source snapshots with an import-time serialization baseline. Saves apply only the diff to the original bytes, which preserves line endings and untouched syntax. Entering raw mode uses the same save boundary, so raw CodeMirror transactions apply to original source offsets.
- Cursor validity: release note `release-notes/v2027-08-28.md:23` says "rejected invalid raw-editor cursor positions". Source to inspect: `/tmp/tolaria/src/components/RawEditorView.tsx` and `/tmp/tolaria/src/utils/rawEditorUtils.ts` (with its test file).
- Stale cursor blocks: `release-notes/v2026-06-10.md:22` lists hardening for "stale cursor blocks" and "stale Tiptap coordinate lookups" during rich-editor recovery.
- IME: `release-notes/v2026-08-19.md:28` fixed "late Korean and Chinese IME commits, including inside nested bullets". Relevant if your list handling is custom.
- Nested list and bullet fixes: `v2026-08-19.md:15` (indentation and numbering), `v2026-09-24.md:30` (nested-bullet crashes).
- Title surface: ADR-0055, later superseded by ADR-0068, removed a separate title field so the H1 is the only title. ADR-0044 is the original H1-as-title decision. Fewer title surfaces meant fewer cursor edge cases.

**Gaps**
- I did not find any doc that explicitly weighs live preview against block editing.
- I did not read the release-notes text for the H1/bullet arrow-key glitch, or the test files, so the fixes are reported from changelog wording only.
- I did not check `src/components/richEditorListTabExtension.test.ts` and `src/components/richEditorCodeBlockTabExtension.test.ts`, which may show how they handle Tab in lists.
- Nothing in the repo or the clone was edited or run.