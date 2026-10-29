VERDICT: CHANGES_REQUESTED

# Issue 02 review: instant syntax swaps

Reviewed `git diff main...HEAD` at 9ff58c9d (4 commits: c7480622, 55467d38, 385cb4c6, 9ff58c9d).

## What I ran

- `pnpm vitest run src/tests/lib/core/markdown-editor`: 97 files, 1276/1276 passed. The test verdict rests on the files the diff changes: `inline/handlers/{autolink,blockquote,heading,inline-comment,mark,markdown-link,wikilink}-handlers.test.ts` (the heading and wikilink files are `heading-handler.test.ts` and `wikilink-handler.test.ts`), `inline/pipeline-dom.test.ts`, `plugins/callout-field.test.ts` and `plugins/footnote-plugin.test.ts`, all under `src/tests/lib/core/markdown-editor/extensions/live-preview/`. The same run covers the tests of every changed source file.
- `pnpm check`: 0 errors, 0 warnings.
- Two throwaway jsdom probes (deleted, not committed). Each mounts a real `EditorView` with `livePreviewExtensions()`:
  - **Probe 1, multi-line links.** It mounted links whose hidden part crosses a line break. All three valid CommonMark shapes make `new EditorView(...)` throw `RangeError: Decorations that replace line breaks may not be specified via plugins`:
    - `[a](\n/url)`
    - `[a](/url "ti\ntle")`
    - `[foo][bar\nbaz]`

    See finding 1.
  - **Probe 2, broad document.** A document with ATX and setext headings, `- > quote`, nested quotes, a plain and a folded callout, links, a reference link, an autolink, wikilinks, an escape, `%%c%%`, footnotes, multi-line bold and more. It walked the cursor to the start and end of every line. Nothing threw, and the rendered line text is correct: syntax hidden off the cursor, bullet kept on `- > quote`, callout chevron and title rendered.
- I did not run e2e. I read the 7 e2e diffs: the assertions are stronger, not weaker. Conditional `if (count > 0)` class checks became unconditional checks on the rendered text.

## Acceptance criteria

- [x] **Met: handler tests.** Off the cursor line the syntax ranges are `Decoration.replace`; on the cursor line no replace is emitted. Evidence:
  - Every handler test's `build()` reports a point decoration with `from < to` as `replace`.
  - Off-line cases assert the exact ranges:
    - heading-handler.test.ts: `[{from:0,to:2,class:'replace'}]`;
    - blockquote-handler.test.ts: range `0..2`;
    - setext: from `doc.indexOf('=')`;
    - callout-field.test.ts: marker and content prefix.
  - On-element cases assert `toEqual([])` over all replaces (mark, escape, heading, setext, blockquote, comment, callout). The link, wikilink, autolink and footnote "shows source" tests were already there.
  - Reveal is still per element for inline marks. Issue 04 owns the switch to a line predicate, so that is out of scope here.
- [x] **Met: no transition on hidden-syntax classes; `-visible` classes gone.**
  - `styles.ts` no longer has `.cm-formatting-inline`, `-inline-visible`, `-block-visible` or `.cm-lp-inline-comment-hidden`.
  - `.cm-formatting-block` is `opacity: 0.6` only.
  - The `transition` rules that remain belong to unrelated controls: the task checkbox, codeblock copy, table add, callout fold, callout type label and meta-bind button.
  - Outside the ADR (history) and `.scratch`, a repo-wide grep finds no reference to the deleted classes.
- [x] **Met, with a wording issue (finding 3): ADR 0008 amendment dated 2026-10-29 with the evidence; CLAUDE.md rule 1 matches.**
  - The amendment cites `b4aa9028` and `a404aebb`. I checked both commit bodies: one is a freeze from a `font-size:0` bullet mark, the other is duplicate bullets from nested mark spans after the replace-to-mark move.
  - It names SilverBullet, Zettlr, atomic-editor and ink-mde. This matches `findings-2026-10-29.md:54-65`.
  - It records the user's decision.
  - The superseded passages at :23/:53/:68 and the rejected alternative now point to the amendment.
- [ ] **Not met (needs a human): manual check that arrowing between a bullet and an H1 no longer shows text sliding.** It was not done and cannot be done in this step (finding 2).

## Findings

1. **High (correctness regression, crash).** `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts:39` and `:46`.
   - **Problem.** `linkHandler` hides `marks[1].from..marks[last].to` (inline link) and `marks[1].from..linkLabel.to` (reference link) with `hiddenSyntaxDeco`. Both ranges can contain a line break: a newline before the destination, inside the link title, or inside the reference label. A replace across a line break is illegal from a `ViewPlugin`, so CodeMirror throws `RangeError: Decorations that replace line breaks may not be specified via plugins`. Probe 1 reproduced it on mount. The note's editor fails to build whenever such a link is visible and the cursor is not on it.
   - **Regression.** On `main` these ranges were `Decoration.mark`, which may span lines.
   - **Missing enforcement.** The constraint is documented (`styles.ts:7`, CLAUDE.md rule 1, the ADR amendment) but nothing enforces it.
   - **Fix.**
     - Skip the hide (render the source) when the `Link` node spans more than one line, e.g. `if (state.doc.lineAt(node.from).number !== state.doc.lineAt(node.to).number) return;` after the `isTouched` check. This also removes the `void state;` workaround.
     - Add a handler test asserting that no `replace` range contains `\n` for the three shapes above.
     - Add a jsdom test in `pipeline-dom.test.ts` that mounts `[a](\n/url)`, `[a](/url "t\nx")` and `[foo][bar\nbaz]` with the cursor elsewhere, asserts that mounting does not throw, and asserts that the line text is rendered.
     - Write the tests first and watch them fail.
     - Then check the other `hiddenSyntaxDeco` call sites. They looked single-line to me: emphasis, code, strike and highlight delimiters, the escape `\`, the autolink `<`/`>`, the per-line wikilink, comment and inline-footnote parsers, the heading and blockquote prefix, and the setext underline line. The callout field is a `StateField`, so it is not subject to the rule.
2. **Medium (acceptance).** `.scratch/live-preview-analysis/issues/02-instant-syntax-swaps.md`, last checkbox.
   - **Problem.** The manual arrow-key check (bullet <-> H1 with no sliding) is unverified, and it is the user-visible goal of the Issue. Removing the animation also does not by itself remove the reflow on reveal: the `# ` still appears or disappears when the cursor enters the line, which shifts text by its width.
   - **Fix.** Deliver must not tick this box. The closing commit message and the final report must state that the manual check is still pending for the user.
3. **Low (docs accuracy).** `CLAUDE.md:227`, last sentence of rule 1.
   - **Problem.** "for simple static visuals (HR, hard breaks) a mark with `font-size: 0` + `::before`/`::after` is fine as long as nothing animates it" contradicts the evidence the same rule cites. The `b4aa9028` freeze came from a non-animated `font-size: 0` mark on bullets.
   - **Fix.** Say the existing HR and hard-break marks are kept as they are. New hidden or replaced visuals should use `Decoration.replace` (a widget where a glyph is needed), not a `font-size: 0` mark.
4. **Low (convention: JSDoc on exports).** `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts:6-17`.
   - **Problem.** The handler's JSDoc block now sits above the new private `const revealedCommentDeco`. The exported `inlineCommentHandler` has lost its doc comment.
   - **Fix.** Move `revealedCommentDeco` above the block, give it a one-line JSDoc, and keep the handler JSDoc directly on `export const inlineCommentHandler`.

## Scope

- **Accepted.** The changes beyond the Touches list are needed: `callout-field.ts` and `footnote-plugin.ts` used the deleted classes, and `docs/LIVE-PREVIEW.md`'s "never replace" rule contradicted the amendment.
- **No problems.** Layer rules, store, service and error-handling rules are untouched.
- **Noted for Issue 07.** It edits the same `callout-field.ts` marker lines.
