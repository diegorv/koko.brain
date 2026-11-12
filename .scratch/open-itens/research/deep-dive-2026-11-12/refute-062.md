# Refute: Issue 062 (table cells render links, highlight, underscore emphasis, line breaks, escaped pipes)

Checked at HEAD `318b6e9b5` (2026-11-12). Read-only; nothing was run. "Verified" means read in code at HEAD. "Inference" means reasoned from code, not executed.

## Verdict

- **Bug still present: yes (verified).** `git log 5f8003d67..HEAD` over `widgets.ts`, `parsers/inline-markdown.ts`, `parsers/table.ts`, `click-handler.ts`, `wikilink-click-target.ts` and both test files is empty. Every path:line in the Issue still holds:
  - `renderInlineSegments` is at widgets.ts:226-278. Its `default` case is `createTextNode` at :274-275.
  - `renderCellContent` is at widgets.ts:286-328. It splits only on `WIKILINK_DECORATION_RE` (:292-296).
  - `TableWidget.toDOM` (widgets.ts:352-391) calls it for each th (:364) and td (:378).
  - `INLINE_RE` is at inline-markdown.ts:17, and `InlineSegmentType` (:2) has five members.
  - `splitRow` (table.ts:72) skips `\x` at :78-80 and keeps the raw text.
  - The TSV escape is at paste-tsv.logic.ts:129-130. It writes `\\`, `\|` and `<br>`.
  - `handleLivePreviewLinkMousedown` is at click-handler.ts:17-41.
  - The help example is at 10-tables.md:43-55.
- **Impact: medium, not high.** The Issue says ux/high. Tables are daily, but every symptom is display only. The source on disk is correct, and a click reveals it. The verified triggers are:
  - the app's own TSV paste (paste-tsv-handler.ts:18-40, registered at live-preview.ts:104), but only when a spreadsheet cell holds a pipe, a newline or a backslash;
  - markdown links typed by hand into a cell.

  Wikilinks in cells, the most common link form in this vault, already render and open (widgets.ts:296-322). How often the owner's tables contain the new syntax is not known, and I did not read the owner's vault.
- **Complexity: M** (one pure tokenizer, one renderer switch and one link listener, about 80 to 120 lines plus tests). **Risk: low to medium.** It is a leaf renderer with one production caller (`renderInlineMarkdown` is used only at widgets.ts:232). It has no write path, no store and no decoration plugin. The risk is a visual regression in every rendered table cell from false-positive emphasis: `_` intraword, and `==` with spaces. This vault's paths use leading underscores (`[[_notes/2026/02-Feb/_journal-day-16-02-2026|Mon 16]]`, a fixture at combined-inline-in-containers.test.ts:139; `_type` at table-widget.test.ts:487). The Issue has no criterion that guards against these false positives.
- **Acceptance criteria:** AC1 is testable and fails today (verified: the cell becomes one text node, so it has no `.cm-lp-link`). AC2 is not testable as written: the "selection unchanged" half passes even without the fix (see M3). AC3 conflicts with a second pinned test that AC4 does not name (M1). AC5 is fine.
- **Can a fresh relay-lite agent implement it from the text alone?** Not safely. There is no open owner decision. But the agent would have to guess six spec points (escape scope, code-span escapes, underscore and `==` flanking, `<br>` variants, the link grammar, nesting). A reviewer would likely send it back over the unnamed pinned test at inline-markdown.test.ts:97-103.
- **Recommendation: run-after-edits.** Apply M1 to M5 first. The queue position (after 004 and 015) is fine. It shares no hot code with the other queued Issues (priority-2026-11-08.md:61 groups it with 063, 007 and 158, which are all deferred).

## Must-fix edits to the Issue text

### M1. A second pinned test contradicts AC3

Evidence: src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.test.ts:97-103 asserts that `***text***` parses as `[{bold:'*text'},{text:'*'}]`. AC3 requires the opposite. AC4 and the owner decision line name only :60. A reviewer can read a change at :97 as weakening a pinned test without approval (global rule: never change a check without approval).

Replace AC4 with:

> - [ ] Update the pinned cases in src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.test.ts to the new contract: :60 ('renders ==highlight== as plain text (not supported)') and :97-103 ('renders ***text*** — bold takes priority, remaining * is trailing text'). Both are covered by the 2026-11-06 owner decision and by AC3. Keep :65 ([[wikilink]] stays text: wikilinks are split before this parser runs) and :70 (%%comment%% stays text). Name both reversed cases in the commit message.

Also extend the Owner decision line to "... <br>, escaped pipes and `***x***`." The orchestrator should confirm `***x***` with the owner only if it doubts the 2026-11-06 survey covered it. Otherwise the What to build text already puts it in scope.

### M2. False positives for underscores and `==` have no guard

Evidence:
- The inline editor parses `==` with flanking: it cannot open before whitespace or close after whitespace (lezer/highlight-extension.ts:22-27).
- Lezer follows CommonMark flanking for `_`, which never emphasizes intraword.
- A naive `_(.+?)_` or `==(.+?)==` in cells would italicize `notes/2026/` inside a plain `_notes/2026/_journal` path. It would also highlight ` b ` in `a == b == c`. The table would then render differently from the same text outside a table.

Add after AC3:

> - [ ] No false emphasis. Cells `a_case_b`, `snake_case_name`, `_notes/2026/_journal-day` and `__init__x` render as plain text (no em or strong). Treat `_` as a delimiter only at a word boundary: the opener is not preceded by a letter, digit or `_`, the closer is not followed by one, and both use Unicode letters (`\p{L}\p{N}` with the `u` flag), so accented words count. `a == b == c` stays plain text: `==` opens only before a non-space and closes only after a non-space, as in lezer/highlight-extension.ts:22-27.

### M3. AC2 cannot fail in jsdom as written

Evidence: the existing harness appends the widget DOM to a bare `root`, outside `view.contentDOM` (table-widget.test.ts:137-150). CodeMirror never sees the event, so "leaves the editor selection unchanged" holds with or without the fix.

The listener matters because of verified code. The editor-level `livePreviewClickHandler` (click-handler.ts:68-70) matches any `.cm-lp-link`. It resolves the widget's `posAtDOM` and then falls back to `linkEl.textContent` (click-handler.ts:29-32). `isSafeUrl('Docs')` is true, because scheme-less strings count as relative (sanitize-url.ts:12-14). So a modifier press that is not stopped would call `openExternal('Docs')` (inference from code). TableWidget.ignoreEvent returns false for mousedown (widgets.ts:414-416), so CodeMirror's handlers do run for events in cells. The capture handler `resolveWikilinkClickPosition` already returns null inside the table (wikilink-click-target.ts:67), so it does not interfere.

Replace AC2 with:

> - [ ] Link press. Mount the widget DOM under a parent that has a bubbling `mousedown` spy.
>   - With the platform open modifier (`platform.mac = true` + `metaKey`, and `platform.mac = false` + `ctrlKey`, as in the existing `cell wikilink click` describe), a primary-button mousedown on the link calls `host.openExternal` exactly once with `'https://x.dev'`. It sets `defaultPrevented` and does not reach the parent spy (live-preview rule 11).
>   - With no modifier, `openExternal` is not called, `defaultPrevented` is false and the parent spy fires. This is the same as other cell text today: CodeMirror moves the cursor in and reveals the table.
>   - A right click and a macOS Ctrl+click are not opened and are not stopped (`isOpenLinkModifier` / `isMacContextClick` in utils/platform.ts:30-40).
>   - `[x](javascript:alert(1))` with the modifier is not opened (`isSafeUrl`), but propagation is still stopped. Otherwise the editor-level handler in click-handler.ts:17-41 would open the link text as a relative URL.

### M4. Escape scope is undefined

Evidence: the Issue says "`\|` and other backslash escapes shown without the backslash". It does not say which characters, whether code spans are affected, or whether wikilinks are affected.
- TSV paste writes `\\` for every backslash (paste-tsv.logic.ts:129), so `C:\Users` pasted from a sheet shows `C:\\Users` today. No criterion covers that case.
- GFM unescapes `\|` inside code spans in tables. Lezer outside tables does not apply here.
- Meta-bind INPUT detection runs on the code-span text (widgets.ts:253-266).

Add to What to build, after "...shown without the backslash":

> Backslash escapes follow CommonMark: `\` before an ASCII punctuation character renders that character and suppresses its markup meaning, so `\*a\*` shows `*a*` with no em. A `\` before anything else stays literal. Inside a code span, nothing is unescaped except `\|` -> `|` (the GFM table rule). Escapes are handled in the non-wikilink text only (the renderInlineSegments path), so wikilinks render exactly as before. Cell strings stay raw in the parser: do not change `splitRow`/`findAllTables` (parsers/table.ts:72-81), whose raw output is pinned by table.test.ts:189-191 and combined-inline-in-containers.test.ts:118-125.

Add to AC1, or as a new item:

> - [ ] `a \\\\ b` in the cell source (TSV-paste output for one backslash) renders one backslash; `\*a\*` renders `*a*` with no em; `` `x \| y` `` renders a code element with text `x | y`.

### M5. The link grammar, `<br>` forms and nesting are unspecified

Add to What to build:

> Link syntax in cells: `[text](url)` where text has no `]` and url has no whitespace (an optional `"title"` is dropped). The link text renders as plain text in a `span.cm-lp-link`. Never use `<a href>`, and never set an href. `<br>`, `<br/>` and `<br />` in any letter case become a `<br>` element. Inside a code span they stay literal. Segments do not nest: bold, italic, highlight and link content is plain text, except `***x***` and `___x___`, which render as `strong > em`. Bare URLs and `<url>` autolinks in cells stay plain text (out of scope).

Change AC3's "a highlight mark with the class the inline pipeline uses" to "an element with class `cm-lp-highlight` (styles.ts:19 and :265)". Change "renders as bold italic" to "renders as `strong > em` with textContent `both` and no `*` in the cell".

## Should-fix edits

- **S1. Parser-chain test.** AC1 uses a hand-built widget. Add:

  > - [ ] Through the real decorator: mount `| h |\n| --- |\n| x \\| y<br>z |` with `mountMarkdownView` and the cursor after the table, take the TableWidget from `computeTables` (the `clickAdd` helper at table-widget.test.ts:243-263 shows how), call toDOM, and assert that the td holds `x | y`, a `br` and `z`.

  This proves the raw `\|` from `splitRow` is unescaped at render time.
- **S2. No-HTML criterion.** "Do not render cell text as HTML" has no test. Add:

  > - [ ] A cell `<b>x</b> <img src=x onerror=alert(1)>` renders that literal text (no `b` or `img` element).
- **S3. Header cells.** Add one assertion that a link and a `<br>` in a header cell (`th`) render too. Both cell types share renderCellContent (widgets.ts:364, :378).
- **S4. JSDoc.** Update the JSDoc of `INLINE_RE`, `renderInlineMarkdown` (inline-markdown.ts:10-23), `renderInlineSegments` (widgets.ts:222-225) and `renderCellContent` (widgets.ts:280-285). They list the supported syntax. Add JSDoc to any new `InlineSegment` field, such as `href` (CLAUDE.md: JSDoc on interface fields).
- **S5. Paths.** In AC4 and the Notes, write the full test path `src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.test.ts`.
- **S6. Optional.** Add rows for `==x==`, `_x_`, `<br>` and `\|` to help/examples/markdown-editor-vault/10-tables.md:43-55. This is not required by the gate.
- **S7. Alternative design, for the agent to consider and not required.** The cell could be parsed with the editor's own Lezer markdown config (with HighlightExtension) instead of a longer regex. That gives the same flanking rules as outside tables for free. It costs a parse per cell in toDOM, which runs again on every viewport re-entry (live-preview rule 2). The regex route is simpler. Keep the regex unless M2's criteria get hard to meet.
- **S8. Priority note.** Change "Upheld ux/high" to medium for this owner: the problem is display only and recoverable with one click, and wikilinks in cells already work. The queue position can stay, because complexity is moderate and risk is low.

## Dossier errors (dossier-062.md)

1. **Missed pinned test.** It lists only inline-markdown.test.ts:60 as pinned, and calls the `***x***` behavior "inference from the regex, not executed". inline-markdown.test.ts:97-103 pins that exact behavior and has to be reversed, which is a material omission (M1). It also says :65 and :70 "stay valid", which is right, but it never mentions :97.
2. **Wrong line.** "registered with `EditorView.domEventHandlers` (:78)": the registration is click-handler.ts:68-70.
3. **Stale HEAD.** It cites HEAD `115d8d576`. Main is now `318b6e9b5`. Nothing relevant changed, so the dossier's conclusions still hold.
4. **Missing `==` flanking risk.** It flags only underscores. `a == b == c` would highlight with a naive `==(.+?)==`, while the editor would not (highlight-extension.ts:22-27).
5. **ASCII-only guard.** The suggested underscore guard `[A-Za-z0-9_]` misses accented letters, so a word like `ação_x_y` would get false italics. Use `\p{L}\p{N}` with the `u` flag.
6. **Code-span escapes left open.** It suggests "leave code content untouched". That contradicts GFM's `\|` rule inside table code spans, and it leaves the choice to the agent. M4 fixes it in the Issue text instead.
7. **Size.** S to M is slightly low once M2 and M4 are in. M is closer.

What the dossier got right, and I re-verified: the Cmd+click fallback hazard (click-handler.ts:29-32 together with sanitize-url.ts:12-14); `renderInlineMarkdown` has a single caller; the CSS classes already exist (styles.ts:16, 143-155, 19, 265-268); the AC2 jsdom trap; and the run order.

## Not verified

- No test was run. It is inference that AC1 fails today and that the regexes behave as described. Both conclusions are drawn by reading the code, and the pinned test at :97-103 confirms the `***` behavior.
- I did not check how often the owner's real tables contain the new syntax.
- I did not check whether CodeMirror's jsdom mousedown path would move the selection if the widget were mounted under `contentDOM`.
