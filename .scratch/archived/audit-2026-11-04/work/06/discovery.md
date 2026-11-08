# Issue 06 discovery: empty inline footnote `^[]`

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:87-92`
  (inline footnote loop in `buildFootnoteDecorations`).
- `src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.test.ts:83-105`
  (`inline footnotes ^[text]` describe block).

## Plan

1. Red: add the two tests from the acceptance criteria to the inline describe block:
   - `'hello ^[]\nnext'`, cursor on line 2, `buildFootnoteDecorations` does not throw
     (today: RangeError "Mark decorations may not be empty").
   - `'a ^[] b ^[note] c\nnext'`, cursor on line 2: the non-empty footnote still gets
     its two `replace` marks and one `cm-lp-footnote-ref` mark over `note`.
2. Green: in the inline loop, `continue` when `range.textFrom === range.textTo`, so
   `^[]` is left unstyled (no hidden markers, no mark). The parser and its regex stay
   as they are.

## Default taken (open question)

The Issue allows either keeping the `^[` / `]` hiding or leaving `^[]` unstyled. I
leave it unstyled: hiding both markers of an empty footnote would make `^[]` render
as nothing, so the user could not see or click the stray brackets. The second test
also asserts that `^[]` gets no decorations.

## Prior art

Existing tests in the same file (`buildFootnotes` helper, `collectDecos`). The
cursor-inside reveal test (`shows source when cursor is on the inline footnote`) is
untouched and must stay green.

## Risks

- None beyond the inline loop: ref marks (`[^...]`, 3+ chars) and the def marker
  cannot be empty. A grep of `live-preview/` for marks built from capture ranges
  (`textFrom`/`contentFrom`) found only this site; a wider audit of other plugins is
  out of scope.
