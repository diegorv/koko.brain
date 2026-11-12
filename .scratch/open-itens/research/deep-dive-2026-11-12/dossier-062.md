# Dossier: Issue 062 (table cells render links, highlight, underscore emphasis, line breaks, escaped pipes)

Checked at HEAD 115d8d576 on 2026-11-12. Issue file: `.scratch/open-itens/issues/062-rendered-table-cells-show-links-highlight-underscore.md`. All paths below are relative to the repo root. "Verified" = read in code. "Inference" = reasoned, not executed (read-only task, nothing was run).

## 1. Still present?

Verdict: present exactly as described. No commit since the Issue's evidence commit `5f8003d67` touches `widgets.ts`, `parsers/inline-markdown.ts` or `parsers/table.ts` (`git log 5f8003d67..HEAD -- <those files>` is empty). The last change to `widgets.ts` is `575b84f2f` (meta-bind typed values), unrelated.

Verified claims (line numbers at HEAD):
- `TableWidget.toDOM` (widgets.ts:352) calls `renderCellContent` for every th (:364) and td (:378).
- `renderCellContent` (widgets.ts:286-328) splits only on `WIKILINK_DECORATION_RE` and hands the rest to `renderInlineSegments` (:226-278).
- `renderInlineSegments` switches on bold, italic, strikethrough, code, and `default` is `createTextNode(seg.content)` (:275-277). No link, highlight, `<br>`, or escape handling.
- `INLINE_RE` (parsers/inline-markdown.ts:17) is `` /`([^`]+)`|\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~/g ``. `InlineSegmentType` (:2) has five types only.
- `splitRow` (parsers/table.ts:72-81) skips `\x` pairs when looking for pipes (`i += 2`) but keeps the raw text, so `\|` reaches the widget with its backslash.
- `tsvRowsToMarkdownTable` (handlers/paste-tsv.logic.ts:129-130) writes `\\`, `\|` and `<br>`. The app's own paste therefore produces cells that show raw.
- `***x***`: by reading the regex, `\*\*(.+?)\*\*` matches `***x**` with content `*x`, leaving a stray `*` text segment (inference from the regex, not executed).
- `help/examples/markdown-editor-vault/10-tables.md:43-55` has a table row `| Link | [text](url) | [text](https://example.com) |` and expects "Formatacao inline deve funcionar dentro de celulas". It does not today for the link.
- `src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.test.ts:60` pins `==highlight==` as plain text. Lines 65 and 70 pin `[[wikilink]]` and `%%comment%%` as plain text; those stay valid (wikilinks are split before this function runs, comments are out of scope).
- `renderInlineMarkdown` has exactly one production caller, `widgets.ts:232` (grep over `src`). Changing its contract cannot affect another feature.

Extra fact the Issue does not state (verified): the editor-level handler `handleLivePreviewLinkMousedown` (click-handler.ts:17-41) is registered with `EditorView.domEventHandlers` (:78) and `TableWidget.ignoreEvent` (widgets.ts:414) only ignores form-control input events, so a mousedown on a cell element reaches that handler if the cell handler does not stop it. For a `.cm-lp-link` element it does `view.posAtDOM(linkEl)`, which for a widget returns the widget position, then `findMarkdownLinkUrlAtPosition` on that one line, and falls back to `linkEl.textContent` (click-handler.ts:29-32). With text "Docs", `isSafeUrl("Docs")` is true (scheme-less strings count as relative, sanitize-url.ts:12-14) and `openExternal("Docs")` would run. So the cell-level `stopPropagation` is not optional: omitting it gives a wrong open, not just a revealed table.

## 2. Impact for this owner

- Trigger: any table cell (header or body) with a markdown link, `==x==`, `_x_`, `__x__`, `***x***`, `\|`, `\\`, or `<br>`, while the cursor is outside the table. The strongest real trigger is TSV paste (paste from Excel/Numbers/Sheets): any cell containing a pipe or a newline is written as `\|` / `<br>` and then displays with the raw `\` and `<br>` text. Multi-line cells from a spreadsheet are common.
- Frequency: tables are daily use (Issue and owner profile). Cells with a link are plausible daily. Paste from a spreadsheet with multi-line cells is occasional, but each hit makes the whole row look broken.
- Severity: wrong rendering only. Disk content is correct (the Issue's own note: category corrected to ux). Click into the table to reveal source. No data loss. Rank: medium (ux/high in the audit, upheld). This is why it sits second in the queue, below the data-risk items 004 and 015.
- Side benefit: the app's own help example 10-tables.md already documents the expected behavior.

## 3. Complexity and risk

Size: S to M (about 60 to 90 lines of production code, 80 to 150 lines of tests). Risk: low.

Files touched:
- `src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts`: pure logic. Extend `InlineSegmentType` and the tokenizer.
- `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts`: `renderInlineSegments` (:226-278) only; plus a small import of `isOpenLinkModifier` (platform.js, `IS_MAC` already imported at :21), `reportError` (core/profiling, already used elsewhere in the live-preview folder) and `editorHost` (already imported :22).
- Tests: `src/tests/.../parsers/inline-markdown.test.ts` and `src/tests/.../table-widget.test.ts`.
- Optional: `help/examples/markdown-editor-vault/10-tables.md` (add rows for the new syntax); `docs/LIVE-PREVIEW.md` only if it lists table inline support (not checked).
- No CSS change needed: `.cm-lp-link` (styles.ts:143-155) and `.cm-lp-highlight` (styles.ts:265-268) already exist as global editor theme classes and cells live inside the editor DOM.

Centrality: `renderInlineSegments` is used by every table cell in every note, but it is a leaf renderer with a single input (a cell string). It is not a core write path, not a decoration plugin, not a store. `TableWidget.eq` compares raw strings (widgets.ts:~392-412) so no widget identity change. Live-preview rules in `docs/agents/live-preview-rules.md`: rule 2 (no expensive work in toDOM) is fine, one small regex pass per cell; rule 11 (interactive elements stop `mousedown`) applies to the new link and is the main correctness point.

What could regress (inference):
1. Underscore emphasis false positives. Notes with `snake_case_names`, `__init__`, file names like `my_file_name.md`, or meta-bind targets outside code spans. A naive `_(.+?)_` would italicize `case` in `a_case_b`. Mitigation: intraword guard, e.g. `(?<![A-Za-z0-9_])_(?=\S)(.+?)(?<=\S)_(?![A-Za-z0-9_])`. Not stated in the Issue; must be an acceptance criterion.
2. Meta-bind INPUT cells (`` `INPUT[...]` ``). Code spans match first in the regex; keep code first in alternation order so link/underscore/escape never parse inside backticks. The existing `table-widget.test.ts:472` suite ("meta-bind inputs in cells") guards this.
3. Escape handling must not touch code spans. GFM unescapes `\|` inside code in tables, but the Issue says "other backslash escapes", so decide: leave code content untouched (today's behavior, lowest risk).
4. A `<br>` in a cell makes rows taller; no layout code assumes single-line rows in the widget (not verified in any e2e). Check `table-empty-cells.test.ts` still passes.
5. Plain click on the link. The Issue says plain click behaves as on other cell text (cursor goes into the table, source revealed). So the handler must not `preventDefault` or `stopPropagation` without the modifier.
6. Security. Do not use `<a href>` or `innerHTML`. Use a `span.cm-lp-link` with a `mousedown` handler, never assign `href`. `isSafeUrl` gate at click time (same as click-handler.ts:36). `javascript:` is rejected by `isSafeUrl` (SAFE_PROTOCOLS list).

Pre-existing issues seen, out of scope, only noted:
- `[[Target\|alias]]` (the form Obsidian writes in tables) does not match `WIKILINK_DECORATION_RE` the way you would want (target would be `Target\`). splitRow tolerates it (it skips `\|`) but the widget does not unescape inside the wikilink. Not part of 062.
- Lax `\*(.+?)\*` means `5 * 3 * 2` becomes italic. Pre-existing; leave.

## 4. Implementation plan (test-first, one context)

Read first: `docs/agents/live-preview-rules.md` (rules 2 and 11), `docs/TESTING.md` (no mocking of `.logic.ts`; mocking host is allowed, the existing table-widget tests already mock the platform and the editor host).

Step 1. Failing tests (red).
a. `table-widget.test.ts`, new `describe('TableWidget: inline markdown in cells')`, reusing the `mountLink`-style setup of `describe('TableWidget — cell wikilink click')` (lines 123-262, `host` with `openLink`, add an `openExternal` mock).
   - Render a widget with body cell `'[Docs](https://x.dev) a \\| b<br>next'`. Assert: one `.cm-lp-link` with textContent `Docs`; one `br`; `td.textContent === 'Docs a | bnext'`; no `[`, `](` or `\` in it. Fails today.
   - Assert `==key==` gives `.cm-lp-highlight` with text `key`; `_note_` gives `em`; `__bold__` gives `strong`; `***both***` gives a `strong` containing an `em` (or the reverse) with textContent `both` and no `*` anywhere in the cell.
   - Negative: `a_case_b` and `snake_case_name` stay plain text (no em); `\*not italic\*` shows `*not italic*` with no em; `a \\\\ b` shows a single backslash.
   - Regression: a cell with `` `a_b \| c` `` keeps the code text unchanged; a wikilink cell and a meta-bind INPUT cell still render (existing suites already cover them, just run them).
b. Link click tests (same describe):
   - Cmd (set `platform.mac = true`, `metaKey: true`) or Ctrl (`platform.mac = false`, `ctrlKey: true`) mousedown on the link calls `host.openExternal` once with exactly `'https://x.dev'`, `defaultPrevented` is true, and the event does not reach an ancestor listener (add a spy listener on the parent).
   - Plain mousedown: `openExternal` not called, event not stopped (spy on the parent fires), `defaultPrevented` false.
   - `[x](javascript:alert(1))` with Ctrl: `openExternal` not called AND propagation still stopped (this is the textContent-fallback hazard in section 1).
   - macOS Ctrl+click (no meta): not opened (follow `isOpenLinkModifier`).
c. One chain test through the real decorator: build the doc `| h |\n| --- |\n| x \\| y<br>z |` using `mountMarkdownView` + `computeTables` (the helper `clickAdd` at table-widget.test.ts:~237 shows how to grab the `TableWidget`), `toDOM`, and assert the cell text is `x | y` plus a `br` and `z`. This proves `splitRow` keeps the raw escape and the widget unescapes it, so the test cannot pass with a hand-built widget input that the parser never produces.
d. `inline-markdown.test.ts`: change :60 to the new contract (`==highlight==` gives `{ type: 'highlight', content: 'highlight' }`); add cases for link (`{ type: 'link', content: 'Docs', href: 'https://x.dev' }`), `<br>`/`<br/>`/`<BR>`, escapes, `***x***`, `_x_`, `__x__`, intraword underscore, and code precedence. Put "reverses the pinned ==highlight== test" in the commit message (owner decision of 2026-11-06).

Step 2. Implementation (green).
- `inline-markdown.ts`: extend `InlineSegmentType` with `'highlight' | 'link' | 'break'` and add an optional `href?: string` on `InlineSegment`. Single combined regex, alternation order matters: code, link `\[([^\]]+)\]\(([^)\s]+)\)`, `\*\*\*(.+?)\*\*\*`, `\*\*(.+?)\*\*`, `__(.+?)__` (with the intraword guard), `\*(.+?)\*`, `_..._` (guard), `~~`, `==(.+?)==`, `<br\s*/?>` (case-insensitive), escape `\\([\\|`*_~=\[\]()<>#!.+-])`. Emit the escaped char as a text segment, then merge adjacent text segments so `a \| b` is one text segment. Bold-italic: emit a new `'bolditalic'` type (or two nested types) and render `<strong><em>`.
- `widgets.ts` `renderInlineSegments`: new cases. `highlight` becomes `span.cm-lp-highlight` (a `<mark>` element would bring UA black-on-yellow that overrides the theme color; the test should check the class, which is what the Issue asks for). `break` becomes `document.createElement('br')`. `link` becomes `span.cm-lp-link` with `textContent` and a `mousedown` listener:
  ```
  if (e.button !== 0 || !isOpenLinkModifier(e, IS_MAC)) return;   // plain click falls through to the editor
  e.preventDefault(); e.stopPropagation();                         // always stop, even for an unsafe URL
  if (view && isSafeUrl(href)) view.state.facet(editorHost).openExternal(href).catch((err) => reportError('LIVE-PREVIEW', 'Failed to open URL:', err));
  ```
  `view` is already a parameter (optional) of `renderInlineSegments`. Update the doc comments of `renderInlineSegments` and `renderCellContent`, which list the supported syntax.
- Update the JSDoc on `renderInlineMarkdown` and `INLINE_RE` accordingly (project rule: JSDoc on exported functions).
- Do not touch `splitRow`, `paste-tsv.logic.ts` or the editor-level click handler.
- Optionally add help rows to `help/examples/markdown-editor-vault/10-tables.md` (`==x==`, `_x_`, `<br>`, `\|`). Not required for the gate.

Step 3. Gate (frontend only, per Issue and CLAUDE.md rule 6): `pnpm check` and `pnpm vitest run`. Cargo throttling note from memory applies only to Rust; not needed. Commit as `feat:` or `fix:` (the commit-msg hook requires a test change for `fix:`, satisfied) with the full format (Context, Problem, Solution, Behavior, Files), the line "reverses the inline-markdown test that pinned ==highlight== as unsupported (owner decision 2026-11-06)", and the repo attribution trailer.

Optional manual check (not part of the gate): in `pnpm tauri dev`, paste a TSV with a pipe and a newline in a cell and confirm display; Cmd+click a link.

## 5. Acceptance criteria review

Wrong or weak:
- Criterion 2 ("leaves the editor selection unchanged"): if the test dispatches the event on a widget DOM that is not inside a real `EditorView` content element, the selection is trivially unchanged even without `stopPropagation`, so the assertion proves nothing (same trap noted in the existing test "the editor click resolver leaves a press on the rendered cell link to the widget", table-widget.test.ts:~249). CodeMirror's mousedown selection needs layout that jsdom lacks, so assert instead that the event does not propagate (ancestor spy) and that `openExternal` was called exactly once with `https://x.dev`. Ideally mount the widget under `view.contentDOM` with `livePreviewClickHandler` installed, so a missing `stopPropagation` shows up as `openExternal('Docs')`.
- Criterion 1 text: `'Docs a | bnext'` is correct for the given cell (a `<br>` has no text); fine. It is stated against a hand-built widget only; add the parser chain test (plan 1c).
- Criterion 3 does not say what DOM `***both***` is; define it as `strong > em` (or `em > strong`) with no `*` left.
- Criterion 4 refers to `inline-markdown.test.ts:60`; the file is in `src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/`. Line is right.

Missing:
- Intraword underscores stay plain (`snake_case`, `a_case_b`, `__init__` inside words). Highest regression risk, absent from the Issue.
- `\*` / `\_` suppress emphasis; `\\` shows one backslash (TSV paste writes `\\`, paste-tsv.logic.ts:129).
- Escapes and links are not parsed inside backtick code.
- `<br/>` and `<BR>` variants; empty link text; unsafe URL still stops propagation.
- Header cells are covered by the same path (state one test).

Untestable as written: none beyond the jsdom selection point above.

## 6. Run order

- Blockers: none (Issue says none; ledger shows `todo`, no dependency lines in other issues point at 062: `grep 062` over issues finds nothing).
- Hot-code series group (priority-2026-11-08.md:61): "live-preview `widgets.ts`: 062, 063, 007, 158". Of those, only 062 is in the current proposed queue. 063 (ImageWidget, widgets.ts:157-165), 007 (`ignoreEvent`, widgets.ts:414 and form-control-events.ts) and 158 (WikilinkImageEmbedWidget, widgets.ts:561-590) are deferred, so no ordering conflict inside the queue. If 007 runs later it edits `TableWidget.ignoreEvent` at :414, which is far from the lines 062 edits (:226-278 and the import block); a textual merge conflict is unlikely, but they must not run in parallel in the same checkout.
- Other queue items: 004, 015 (`editor.service.ts` group), 009, 070, 067/068 (rail views), 028, 003, 010/012, 002 touch none of `widgets.ts`, `inline-markdown.ts` or the table test files. 062 can run in parallel with them in separate worktrees; the only shared resource is the heavy-check budget (serial checks only, 1 vitest at a time per memory).
- Recommended position: keep as proposed (right after 004 and 015). Safe to batch with a gate of `pnpm check` plus `pnpm vitest run`; no relay owner-decision block (the owner decision is already recorded in the Issue, 2026-11-06).
- Post-delivery review (CLAUDE.md): if delivered through relay-lite and the fix after review changes app code, one opus refute-style review applies; skip if only tests/docs.

Not verified: nothing was executed (no tests, no app). Regex behavior for `***x***` and the `Docs` fallback path are from reading code. `docs/LIVE-PREVIEW.md` was not checked for a table-syntax list. The jsdom behavior of CM mousedown with a widget inside `contentDOM` is inference.
