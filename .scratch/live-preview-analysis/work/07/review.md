VERDICT: CHANGES_REQUESTED

# Issue 07 review: callouts are robust

Reviewed `git diff main...HEAD` (6d20967b..1fdc78cf, base a5e16246) in the worktree. Paths below are under `src/lib/core/markdown-editor/extensions/` unless they start with `src/tests/` or `.scratch/`.

## Checks I ran

- `pnpm check`: 211 files, 0 errors, 0 warnings.
- `vitest run src/tests/lib/core/markdown-editor`: 99 files, 1398 tests passed, 0 failed.
- Probe (a throwaway test under `src/tests/zz-probe/`, deleted afterwards, `git status` clean): dumped `computeCallouts` and `blockquoteHandler` output for eight documents. Results: nested callouts at two and three levels render without throwing; a collapsed inner callout inside an expanded parent hides only its own lines; a cursor in the inner callout reveals both; `> [!note] Title   ` hides exactly `> [!note] `; a callout inside a list item (`- > [!note]`) is still a plain blockquote, as on main. A plain quote nested in a callout regresses (finding 1).
- Probe against main: I copied main's `live-preview/parsers/blockquote.ts` next to the probe and called both versions on `> [!note] T\n> > quoted\n> body`, line 2. Main returns `{ markFrom: 12, markTo: 16, depth: 2 }` (hides `> > `); HEAD returns `null`.
- Grep: `matchCalloutHeader` is the only callout regex left in `src/lib` (`callout/callout.logic.ts:8`). `CALLOUT_REGEX`, `CALLOUT_RE`, `CALLOUT_HEADER_RE` (exported) and `CALLOUT_CONTENT_RE` have no references left in `src/` or `docs/`.
- Not run: the full gate (deliver runs it), e2e, the running app. I did not re-run the new tests against main's sources; the RangeSetBuilder throw on main follows directly from main's `computeCallouts` adding the inner header after the outer's later content lines.

The test verdict rests on: `src/tests/lib/core/markdown-editor/extensions/callout/callout.logic.test.ts`, `live-preview/parsers/callout.test.ts`, `live-preview/parsers/blockquote.test.ts`, `live-preview/plugins/callout-field.test.ts`, `live-preview/inline/handlers/blockquote-handler.test.ts`, plus `parsers/combined-callout.test.ts`, `parsers/combined-edge-cases.test.ts`, `plugins/block-reveal.test.ts` and `plugins/keyboard-reveal.test.ts`, all run in the 99-file markdown-editor run.

## Acceptance criteria

- [x] **Test: nested callout renders both callouts without throwing.** Met. `callout-field.ts:157-260` collects ranges and ends with `Decoration.set(decos, true)`; `lineOwner` gives each line to its innermost callout. `callout-field.test.ts` "nested callouts" checks a type-switcher on both headers, one `cm-lp-callout` line deco per line, the hidden prefixes, collapse of the parent hiding the child, and reveal of the parent revealing the child. The probe confirms three levels work too. Visual caveat in note 2.
- [x] **Test: `> [!note] Title   ` shows the full title.** Met. `markerTo` now comes from `match.markerLength` (`live-preview/parsers/callout.ts:45-54`, group 1 of `CALLOUT_HEADER_RE`) instead of `match[0].length - title.length`. Tested in `parsers/callout.test.ts` ("keeps the full title when the header has trailing spaces") and `callout.logic.test.ts`. On main the same line hid `> [!note] Tit`.
- [x] **One callout regex/matcher remains; all three call sites use it.** Met. `matchCalloutHeader` (`callout/callout.logic.ts:27`) is called by `parseCalloutLine` (`callout.logic.ts:71`, source-mode `calloutDecoration`), `parseCalloutHeader` (`live-preview/parsers/callout.ts:37`) and `findBlockquoteMarkRange` (`live-preview/parsers/blockquote.ts:45`).
- [x] **Test: callout content lines get one style, not blockquote + callout.** Met for plain content lines (`blockquote-handler.test.ts` "leaves callout content lines to the callout field", `blockquote.test.ts` "returns null for content lines of a callout"). The exclusion overreaches to quotes nested in a callout; see finding 1.

## Findings

1. **Medium: a plain blockquote inside a callout now shows a literal `>`.** `live-preview/parsers/blockquote.ts:44-46` returns `null` when ANY `Blockquote` ancestor of the line's last `QuoteMark` starts on a callout header. For `> [!note] T\n> > quoted\n> body`, line 2 belongs to a plain blockquote nested in the callout, so the blockquote handler now emits nothing for it. The callout field hides only the callout's own prefix there (`quotePrefixLength(text, depth = 1)`, `plugins/callout-field.ts:241-252`), so the line renders as `> quoted` with no quote styling. On main the blockquote handler hid `> > ` and drew a depth-2 quote on that line (probe above). Quotes inside callouts are common Obsidian content, and the Issue only asked to stop styling callout lines twice. **Fix:** in `findBlockquoteMarkRange`, return `null` only when the innermost `Blockquote` holding the last `QuoteMark` (`tree.resolveInner(lastMark.from, 1).parent`) starts on a callout header. When an outer ancestor is a callout and the innermost blockquote is not, return a range that starts at the first `QuoteMark` after the callout's quote depth, with `depth` counted from there, so the callout field keeps its own prefix and the blockquote handler hides and styles the rest. Add tests that fail on HEAD: `blockquote.test.ts` (`> [!note] T\n> > quoted`, line 2 gives a range covering only the second `> ` with depth 1) and `blockquote-handler.test.ts` (same document: line 2 gets one blockquote line deco and a replace on the second `> `; lines 1 and 3 get nothing).

2. **Low: `> > [!tip]` opening an outer plain blockquote makes the whole outer blockquote a callout.** `live-preview/parsers/callout.ts:76-77` keeps the outer `Blockquote` when both start on the header line, because the outer's first line also matches. In `> > [!tip] X\n> > body\n> tail`, the `> tail` line (outer quote only) gets the tip callout's line deco (probe G). Main threw on this document, so the branch is still an improvement. Optional fix: keep the innermost `Blockquote` whose first line is the header (replace the previous entry when the start line repeats), and have `headerDepth` match it. Fine to leave for a follow-up Issue if the fix agent prefers.

3. **Nit: the title mark covers trailing spaces.** `live-preview/parsers/callout.ts:55` sets `titleTo` to the line end, so `cm-lp-callout-title` spans `Title   `. Invisible today. Optional: `titleTo: offset + markerEnd + title.length` (the `\s*` in the matcher already eats leading whitespace, so the trimmed title starts at `markerEnd`).

## Notes (no action in this Issue)

- Performance: `findBlockquoteMarkRange` now walks the line's ancestors and runs the matcher per `Blockquote` ancestor on every inline rebuild. O(depth) per quote line; negligible. `computeCallouts` builds the `lineOwner` map in O(sum of callout lengths) and sorts once.
- Nested callout lines show only the inner callout's border and background, not a box inside the parent's box. The discovery accepted this. Both callouts render with their own header, switcher and fold chevron, so the criterion is met. A nested look is a CSS follow-up, not this Issue.
- Source-mode `calloutDecoration` now styles `> > [!x]` header lines too. That follows from the single matcher and is intended.
- Left alone as stated in discovery: the two colour fallbacks (`#60a5fa` vs `var(--callout-note)`), `isFoldable = true`, and the duplicate hidden-line deco (visible in the collapsed probe as two `cm-lp-hidden-line` line decos per line).
- Scope: every changed source file traces to the Issue; each has test changes (`blockquote-handler.ts` is JSDoc only and still gained two tests).
