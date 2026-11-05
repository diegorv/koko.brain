VERDICT: APPROVED

Reviewed `git diff main...HEAD` (51ca57438, afd85f51a): a 3-line guard in `footnote-plugin.ts` and two tests in `footnote-plugin.test.ts`, plus the workflow's own discovery.md.

## Acceptance criteria

- [met] Failing test first: in src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.test.ts, doc 'hello ^[]\nnext' with the cursor on line 2, `expect(() => buildFootnoteDecorations(state, [{from: 0, to: state.doc.length}])).not.toThrow()`. It fails today with RangeError 'Mark decorations may not be empty'. — footnote-plugin.test.ts:106-114 is exactly this test (cursor at `doc.length`, line 2). Red verified with a throwaway probe (deleted, not committed): `findInlineFootnoteRanges` on 'hello ^[]\nnext' returns `textFrom === textTo`, and `footnoteRefDeco.range(7, 7)` throws /Mark decorations may not be empty/, which is the call the pre-fix loop made unconditionally after the reveal check. Passes on the branch.
- [met] Test: a line with both `^[]` and `^[text]`, off the cursor line, still decorates the non-empty footnote. — footnote-plugin.test.ts:116-130, doc 'a ^[] b ^[note] c\nnext' with the cursor on line 2: asserts no decoration overlaps `^[]` (2-5), replace marks at [8,10] and [14,15], one `cm-lp-footnote-ref` at [10,14]. Offsets checked by hand against the doc. Passes.
- [met] The existing cursor-inside-brackets reveal case stays green. — 'shows source when cursor is on the inline footnote' (footnote-plugin.test.ts:96-104) is unchanged (the test diff has no removed lines) and passes; the new guard runs after `isRevealed`, so reveal ordering is unchanged.
- [met] Frontend gate green. — `pnpm check`: exit 0, 0 errors, 0 warnings. `pnpm build`: exit 0. Targeted vitest (4 files, 75 tests) passes. The full `pnpm vitest run` is deliver's to run.

## Findings

None.

## Checks run by this review

- Typecheck: `taskpolicy -c background pnpm check`, exit 0 (216 files, 0 errors, 0 warnings).
- Build: `taskpolicy -c background pnpm build`, exit 0.
- Test verdict rests on: `plugins/footnote-plugin.test.ts`, `plugins/keyboard-reveal.test.ts`, `parsers/footnote.test.ts`, `parsers/combined-footnote.test.ts` (all under src/tests/lib/core/markdown-editor/extensions/live-preview/): 4 files, 75 tests, exit 0.
- Probe (temporary file, removed before commit): besides the red check above, `buildFootnoteDecorations` does not throw for `^[]` at line start, at the end of the doc, repeated `^[]^[]^[a]`, `^[]` beside `[^1]` / `[^]` refs and inside a `[^1]: d ^[]` definition line, and `^[\]]`.
- Scope: only the inline-footnote loop changed; parser regex untouched (the Issue allows either fix). The other two mark pushes in the file cannot be empty: `FOOTNOTE_REF_RE` spans at least `[^]` (3 chars) and the def marker is the same 3+ chars. No other caller of `findInlineFootnoteRanges` in src/lib. No layer-baseline or composition-root change. Tabs used, `git diff --check` clean.
- Design choice (leave `^[]` unstyled rather than hide both markers) is one of the two the Issue allows and is recorded in discovery.md; hiding both markers would render the stray `^[]` as nothing, so the choice is sound.
