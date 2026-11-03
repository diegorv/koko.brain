VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first: a plain ```` ```js ```` block with two or more lines in a blockquote, a callout and a list item renders every line without the container prefix — `code-block-in-containers.test.ts` mounts the real `livePreviewExtensions` and checks `.cm-lp-codeblock-pre` text equals `a = 1\n\n  b = 2` (three lines, one blank, one indented) at the top level and in a callout, a blockquote and a list item. I restored main's `fenced-code-block.ts` and `code-block-field.ts` for a moment and ran it: 6 failed (render + copy in the three containers), 6 passed (top level, and the language switch everywhere). With the branch source: 12/12 pass. Parser cases in `parsers/fenced-code-block.test.ts` also cover a quote, nested quote, blank quote line, list item and list inside a quote.
- [met] Top-level code blocks render as today, and the existing code-block field and parser tests pass — `plugins/code-block-field.test.ts`, `widgets/code-block-widget.test.ts` and `parsers/fenced-code-block.test.ts` pass. I compared the old last-`CodeText` slice with the new `content` on 19 top-level docs (multi-line, inner blank lines, trailing blank, leading blank, indented fence, `~~~`, a nested longer fence, tabs, CRLF, whitespace-only line, unclosed): all identical except the documented `` ```\n\n``` `` case (`"\n"` before, `""` now, see finding 2).
- [met] Copy-to-clipboard and the language switcher still act on the right text and range inside a container — the new test clicks Copy (mousedown) and asserts `navigator.clipboard.writeText` gets the unprefixed `CODE` in every container. It also sets the language `<select>` to `python` and asserts the whole document equals the original with only `` ```js `` changed to `` ```python ``. `languageFrom/languageTo/openFenceTo` still come from `CodeInfo` unchanged (`code-block-field.ts:35-39`). `contentFrom/contentTo` have no other reader in src/lib, src/routes or e2e. `footnote.ts:15-16` has its own unrelated fields, and `pnpm check` is clean.

## Findings

1. minor — `src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:83`: `content` is now built eagerly for every fenced block on every `findAllFencedCodeBlocks` call. Six block decorators call it on each recompute: `code-block-field`, `block-comment-field`, and the mermaid / queryjs / collection / meta-bind-button parsers through `findSpecialFenceBlocks`. `block-comment-field` never reads `content`, and the special parsers need it only for the few matching blocks. Before, only the unrevealed generic blocks were sliced, once. Measured on a 460 KB note with 200 blocks of 50 lines: `findAllFencedCodeBlocks` takes ~2.0 ms against ~0.05 ms for the tree walk alone. That adds ~12 ms per decorator recompute, which runs on doc changes and touched-line selection changes. A typical note pays well under 1 ms. discovery.md (Risks) calls this negligible but did not count the six callers. Fix: build `content` only where it is read. For example, export a `fenceContent(state, block)`-style helper and call it in `computeCodeBlocks` after the special, closed and revealed checks, and in `findSpecialFenceBlocks` after its filters. Or keep the content bounds and join lazily. Not a blocker.
2. nit — `src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.test.ts:112`: the one visible top-level change, a body of exactly one blank line giving `''` instead of Lezer's `"\n"`, is a choice recorded in discovery.md but no test pins it. Because of it, a language-less `` ```\n\n``` `` block loses its Copy header (`code-block-widget.ts:73`). Add `expect(findAllFencedCodeBlocks(createMarkdownState('```\n\n```'))[0].content).toBe('')` next to the empty-block case so the choice cannot drift silently.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- Targeted tests, exit 0, 18 files / 294 tests. Files, all under `src/tests/lib/core/markdown-editor/extensions/live-preview/`:
  - root: `code-block-in-containers.test.ts`, `special-fences-in-containers.test.ts`, `invariants-harness.test.ts`, `decorator-toggles.test.ts`
  - `parsers/`: `fenced-code-block`, `collection-block`, `mermaid`, `meta-bind-button`, `queryjs-block`, `comment`
  - `plugins/`: `code-block-field`, `block-comment-field`, `collection-block-field`, `mermaid-field`, `meta-bind-button-field`, `queryjs-block-field`, `special-fence-detection`
  - `widgets/`: `code-block-widget`
- Red check: the new container test against main's source fails 6/12 as expected, as described above.
- Probes (temporary files, deleted, worktree clean): old vs new content on 28 docs (19 top level, 9 in containers), and the timing in finding 1.
- Full suite and `pnpm build` not run: they are deliver's to run.
- Scope: the diff touches only the parser, `code-block-field` and their tests. Moving the per-line join into `fenceContent` is the reuse the Issue asks for. No layer-baseline or composition-root change.

## Resolution

1. Fixed: `FencedCodeBlockRange.content` is now a getter on the block object, so `fenceContent` runs only when a caller reads it (`computeCodeBlocks` after its special/closed/revealed checks, `findSpecialFenceBlocks` after its filters); `block-comment-field` never pays for it. The interface is unchanged.
2. Fixed: `parsers/fenced-code-block.test.ts` pins `` ```\n\n``` `` giving content `''`.
