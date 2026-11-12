# 251: The code-block language switch keeps the rest of the fence info string

**Origin:** split from Issue 061 (part 1, audit finding F101) on 2026-11-12 by the deep dive (`.scratch/open-itens/research/deep-dive-2026-11-12/`). Issue 061's Origin and Migrated-from lines apply; its archived evidence is in `.scratch/archived/editor-data-safety/audit-2026-11-02.md` (P2 table) and `.scratch/archived/file-io-audit/issues/52-live-preview-unrequested-rewrites.md`.

**What to build:** picking another language in a code block's header dropdown changes only the language tag and keeps the rest of the info string, and a fence with attributes gets highlighted.

Today `findAllFencedCodeBlocks` (src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:58-61) slices the whole `CodeInfo` node into `language` and keeps its bounds as `languageFrom`/`languageTo`. Lezer's `CodeInfo` spans the whole info string after the fence (node_modules/@lezer/markdown/dist/index.js:462-465), so for ` ```python title="main.py" ` the language is `python title="main.py"`. In `CodeBlockWidget` (widgets/code-block-widget.ts), `buildLanguageSelect` (:146-169) prepends that whole string as an extra option, and `dispatchLanguageChange` (:171-182) replaces the full range, so picking `javascript` writes ` ```javascript ` and deletes `title="main.py"` (or `{1,3}`), then autosaves. `highlightCode(this.code, this.language)` (:112) also gets the whole string, so these blocks are never highlighted.

Fix: treat the first whitespace-delimited token of `CodeInfo` as the language tag. Narrow `languageTo` to `languageFrom + token.length`, so the replace touches only the tag, and give the widget the token for the dropdown, the preselection and `highlightCode`. Keep the whole info string in its own field of `FencedCodeBlockRange`, and key both special-fence checks on that field, not on the token:

- `SPECIAL_LANGUAGES.has(block.language)` in `computeCodeBlocks` (plugins/code-block-field.ts:13, :37);
- `block.language !== language` in `findSpecialFenceBlocks` (parsers/fenced-code-block.ts:132), which mermaid, queryjs, collection and meta-bind-button use (`parsers/mermaid.ts:23` and siblings).

Keyed on the token, ` ```mermaid title="x" ` would be claimed by the mermaid decorator, or skipped by the code-block decorator and claimed by nothing. Today it renders as a plain code block, and it must keep doing so. Update the `FencedCodeBlockRange` JSDoc (fenced-code-block.ts:20-31) to say what each field holds.

**Blocked by:** none

**Status:** needs-info

**Answered:** owner, 2026-11-12: split out of 061 and parked as needs-info. The validators rated it medium risk (it changes the field the special-fence decorators key on) for a case the owner's workflow does not show (info strings such as `title=` or `{1,3}`). A vault grep for fences with text after the language would show whether it is worth doing.

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`. Targeted e2e: `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal/code-block-language-select.spec.ts e2e/specs/live-preview/code-blocks.spec.ts`.

**Source:** src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:20-31,58-61,128-146; plugins/code-block-field.ts:13,37; widgets/code-block-widget.ts:112,146-182; the `F101` describe in `.scratch/archived/editor-data-safety/repro/table-and-doc-mutations/widget-doc-rewrites.test.ts:17-41`; tests in src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.test.ts and widgets/code-block-widget.test.ts.

- [ ] Failing test first: move the `F101` describe of `.scratch/archived/editor-data-safety/repro/table-and-doc-mutations/widget-doc-rewrites.test.ts` into `src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.test.ts` (jsdom; test-helpers import `../../../test-helpers`) and see it fail. Drop its assertion that `widget.language` is the whole string.
- [ ] Switching ` ```python title="main.py" ` to `javascript` through the real `computeCodeBlocks` widget writes ` ```javascript title="main.py" `; ` ```js {1,3} ` keeps ` {1,3}` the same way; a fence with no info string still gets the tag inserted at `openFenceTo`.
- [ ] The dropdown preselects `python` for that fence, offers no extra option for the whole string, and `highlightCode` gets `python`.
- [ ] ` ```mermaid title="x" ` (any special tag followed by more text) still renders as a plain code block, and no special decorator claims it; ` ```mermaid ` alone is still skipped by the code-block decorator and claimed by mermaid.
- [ ] The `findSpecialFenceBlocks` test "skips a language that only starts with the name" (`fenced-code-block.test.ts:178-181`, including ` ```demo extra `) stays green unchanged.
- [ ] Existing code-block widget and fenced-code parser tests still pass.

## Notes

- Read `docs/agents/live-preview-rules.md` before changing these files.
- The 2026-11-05 round-2 review found the old `SPECIAL_LANGUAGES` caveat out of date: the `*_OPEN_RE` regexes are gone and every special decorator goes through `findSpecialFenceBlocks`. The keying rule above is the corrected one.
- `block-comment-field.ts:20` also calls `findAllFencedCodeBlocks`, but reads only the fence bounds, so it is unaffected.
- Undoable: Cmd+Z restores the attributes while the editor history lives.

## Audit evidence (editor-data-safety, 2026-11-02)

### F101: code-block language switch replaces the whole info string and drops text after the language

- Verdict: REPRODUCED (P2, likelihood occasional)

**How a user hits it.** A note has ` ```python title="main.py" ` (or ` ```js {1,3} `). The cursor is elsewhere, so the fence line is hidden behind the code-block widget. The user picks another language in the header dropdown; the attributes are deleted without a visible change on the fence line, and autosave writes it.

**Code trace.** @lezer/markdown index.js:462-465 emits one `CodeInfo` from the first non-space after the fence to the last non-space of the line. fenced-code-block.ts:58-61 slices it whole into `language` and keeps its bounds. code-block-field.ts hands both to `CodeBlockWidget`. code-block-widget.ts `buildLanguageSelect` prepends `python title="main.py"` as an option (it is not in `COMMON_LANGUAGES`); `dispatchLanguageChange` dispatches `changes: { from: languageFrom, to: languageTo, insert: newLanguage }`.

**Repro test.** describe `F101` in the archived repro file. It first asserts `widget!.language` is `python title="main.py"` (passes), then fails on `expect(view.state.doc.line(1).text).toBe('```javascript title="main.py"')` with `expected '```javascript' to be '```javascript title="main.py"'`.

## Comments

- 2026-11-12: created from Issue 061 part 1 by the deep dive (validate-s3+s4 "Rejected additions", cross-tests-relay M4). Status needs-info by owner decision. The text carries the 2026-11-05 round-2 correction (key `findSpecialFenceBlocks` on the whole info string too) and line numbers at HEAD `318b6e9b5`.
