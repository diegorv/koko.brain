# 06: An empty inline footnote ^[] does not crash the footnote live-preview plugin

**What to build:** A note containing `^[]` (typed, or left by bracket auto-close) keeps footnote rendering working: refs, definitions and inline footnotes still decorate, and no 'CodeMirror plugin crashed' error appears. Fix in src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts: push footnoteRefDeco only when range.textFrom < range.textTo. The ^[ / ] hiding stays as it is, or `^[]` is left unstyled. Either way, no empty mark is built. Alternatively, tighten INLINE_FOOTNOTE_RE in parsers/footnote.ts to require content, with matching parser test updates.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first: in src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.test.ts, doc 'hello ^[]\nnext' with the cursor on line 2, `expect(() => buildFootnoteDecorations(state, [{from: 0, to: state.doc.length}])).not.toThrow()`. It fails today with RangeError 'Mark decorations may not be empty'.
- [ ] Test: a line with both `^[]` and `^[text]`, off the cursor line, still decorates the non-empty footnote.
- [ ] The existing cursor-inside-brackets reveal case stays green.
- [ ] Frontend gate green.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 1 of the parallel plan.
- **Finding `footnote-empty`:** real, medium. Root cause: INLINE_FOOTNOTE_RE uses `*` for the content group, so `^[]` matches with an empty capture. buildFootnoteDecorations then pushes a Decoration.mark over an empty range (textFrom == textTo), which CodeMirror rejects with a RangeError. The ViewPlugin crashes and CodeMirror deactivates it for the shared EditorView.
  Evidence: parsers/footnote.ts:38 `/\^\[([^\]\\]*(?:\\.[^\]\\]*)*)\]/g`. :99-107 textFrom = start+2, textTo = start+2+0. plugins/footnote-plugin.ts:88 skips only when revealed, then :90 runs footnoteRefDeco.range(range.textFrom, range.textTo). styles.ts:22 footnoteRefDeco = Decoration.mark. node_modules/@codemirror/view/dist/index.js:316-318 `if (from >= to) throw new RangeError("Mark decorations may not be empty")`. The constructor (:36-37) and update (:44-47) do not catch it. Trigger: any `^[]` on a line without the cursor, e.g. one left by closeBrackets (`^[` at end of line becomes `^[]`) after the cursor moves to another line, or a note opened with `^[]` away from line 1.
- Other mark pushes in the file cannot be empty (footnote-plugin.ts:77 `[^...]` is 3 or more chars, :83 the def marker). Not checked: other live-preview plugins that build marks from regex captures that can be empty. A quick grep while there is cheap.
- **Size:** S.
