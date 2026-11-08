# 51: An empty inline footnote `^[]` off the cursor line crashes the footnote plugin for the rest of the session

**Status:** resolved

Priority: P2 (no text is lost, but footnote rendering silently stops in every note until the editor remounts)

**What to build:** `buildFootnoteDecorations` (src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:86-92) pushes `footnoteRefDeco.range(range.textFrom, range.textTo)` for every inline footnote that is not revealed. `INLINE_FOOTNOTE_RE` (src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts:38) accepts empty content, so for `^[]` `findInlineFootnoteRanges` (:92-105) returns `textFrom === textTo`. `footnoteRefDeco` is a mark (styles.ts:18), and CodeMirror's `MarkDecoration.range` throws `RangeError: Mark decorations may not be empty` for an empty range (node_modules/@codemirror/view/dist/index.js:316-319). The throw happens inside the ViewPlugin constructor or `update()` (footnote-plugin.ts:36-50). CodeMirror catches it in `PluginInstance.update` (index.js:1501-1531), logs it and calls `deactivate()` (:1544-1546), which sets the instance's spec to null: `view.plugin(footnotePlugin)` returns null and no `[^1]` ref, footnote definition or `^[...]` inline footnote renders any more. A reconfigure keeps the same dead instance while the spec stays in the plugin list (`updatePlugins`, index.js:8157-8169), and the markdown editor replaces the doc on a tab switch instead of building a new view, so the breakage outlasts note switches.

Fix: in `buildFootnoteDecorations`, skip an inline footnote with empty content (`if (range.textFrom === range.textTo) continue;`) before any of its three decorations is pushed, so `^[]` renders as its raw source. Do not keep the two `hiddenSyntaxDeco` replaces for it: hiding `^[` and `]` with no visible text in between would make `s/^[]//` in prose read as `s///`. `findInlineFootnoteRanges` has no other caller, so tightening `INLINE_FOOTNOTE_RE` to require one character is an equivalent alternative; pick one, not both.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:36-50,86-92, src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts:38,86-109, src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.test.ts

- [ ] Failing test comes first. Move `.scratch/editor-data-safety/repro/lp-plugins/footnote-empty-inline.test.ts` under `src/tests/` (into `plugins/footnote-plugin.test.ts` or a jsdom file next to it: the mounted-view test needs `// @vitest-environment jsdom`; fix the `test-helpers` import path) and see both tests fail
- [ ] `buildFootnoteDecorations` on `see ^[] here\nnext line` with the cursor on line 2 does not throw and emits no decoration over `^[]`
- [ ] In a mounted view with `footnotePlugin`, moving the cursor off a `^[]` line sends nothing to `EditorView.exceptionSink` and `view.plugin(footnotePlugin)` is still non-null; a `[^1]` ref on another line still gets `cm-lp-footnote-ref`
- [ ] A non-empty inline footnote `^[text]` still hides `^[` and `]` and marks `text`, as the existing footnote-plugin tests check

## Audit evidence (editor-data-safety, 2026-11-02)

Source: editor-data-safety audit (`.scratch/editor-data-safety/audit-2026-11-02.md`, P2 table), cross-referenced in `.scratch/editor-data-safety/xref-file-io-audit.md` (no existing issue mentions the footnote plugin, RangeError or empty marks; the file I/O audit did not cover live-preview decorations). Code re-read at 1351a35d; the line numbers above are current.

### LP2: an empty inline footnote `^[]` throws RangeError in the footnote ViewPlugin and permanently deactivates footnote rendering

- Verdict: REPRODUCED (P2, likelihood occasional)

**How a user hits it.** The user types `^[` on a line; `closeBrackets()` (src/lib/core/markdown-editor/setup/editor-extensions.ts:135, default brackets include `[`) makes it `^[]` with the cursor between the brackets. The user clicks or arrows to another line before typing the footnote text. The reveal rule (footnote-plugin.ts:88) protects the line only while the selection touches it, so the next rebuild reaches the empty mark. Opening a note that already holds `^[]` off the cursor line does the same, for example a regex like `s/^[]//` in prose or inline code: the block-context skip (footnote-plugin.ts:71-72) looks only at the node at the line start, and inline code is not a block context. From then on footnotes render as raw source in every note, with only a console error (`logException`) to show for it, until the markdown editor remounts, the app restarts, or the live-preview compartment drops and re-adds the plugin (source mode and back, or the footnote decorator toggled off and on in Troubleshooting; live-preview.ts:93-95, editor-extensions.ts:118), which creates a new instance.

**Recoverable from.** Yes. No text changes; only the rendering is lost for the session.

**Code trace.** footnote-plugin.ts:37 (constructor) and :44-47 (`update` on a `rebuild` action) call `buildFootnoteDecorations`. :87-91 push `hiddenSyntaxDeco` (`^[`), `footnoteRefDeco` (text) and `hiddenSyntaxDeco` (`]`). parsers/footnote.ts:94 `content = match[1]` is `''` for `^[]`, so :101-102 give `textFrom = textTo = start + 2`. styles.ts:18 `footnoteRefDeco = Decoration.mark(...)`. @codemirror/view index.js:316-318 `if (from >= to) throw new RangeError("Mark decorations may not be empty")`. index.js:1505-1509 (create) and :1517-1527 (update) catch, log `"CodeMirror plugin crashed"` and `deactivate()`.

**Repro test.** `.scratch/editor-data-safety/repro/lp-plugins/footnote-empty-inline.test.ts`. Failing assertions: `expect(() => buildFootnoteDecorations(state, [{ from: 0, to: doc.length }])).not.toThrow()` throws `RangeError: Mark decorations may not be empty`; in the mounted view, `expect(plugin, 'plugin is deactivated after the crash').not.toBeNull()` fails (the plugin is null) and `expect(errors.map(String)).toEqual([])` receives the RangeError.

**Fix sketch.** Skip empty inline footnotes in `buildFootnoteDecorations` (`if (range.textFrom === range.textTo) continue;`), or tighten `INLINE_FOOTNOTE_RE` to require at least one character. Add a test with `^[]` off the cursor line.

## Comments

- 2026-11-06: closed by audit 2026-11-05 at `5f8003d67` (resolved): Fixed by 1ad0306a5 ('fix: empty inline footnote no longer crashes live preview', audit-2026-11-04 Issue 06). At HEAD, buildFootnoteDecorations in footnote-plugin.ts skips the empty inline case before it pushes a decoration.
