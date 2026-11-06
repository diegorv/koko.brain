# 120: CRLF notes keep their CRLF line endings after an edit

**Migrated from:** `.scratch/file-io-audit/issues/42-crlf-to-lf-rewrite.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). It needs CRLF files, and no sync or Windows tool is in use.

**Audit check at `5f8003d67`:** still_present (corner, low). src/lib/core/markdown-editor/MarkdownEditor.svelte:95-97 toDocText turns \r\n into \n for the CodeMirror doc; src/lib/core/markdown-editor/setup/editor-extensions.ts:188 onDocChanged(update.state.doc.toString()) emits LF; no lineSeparator facet in src/lib; writeTab (editor.service.ts:194) writes tab.content verbatim. CRLF notes are rare on the owner's macOS vault.

**Stale in the text below:** The doc is now normalized explicitly by toDocText (MarkdownEditor.svelte:95-97, commit fe51c2ad0) rather than only by CodeMirror's DefaultSplit; the store keeps raw CRLF until the first keystroke, then holds LF. saveFileByPath line ref is now writeTab :191-194.

**Status:** ready-for-agent

**Blocked by:** none
Priority: P3
Severity: corruption
Source: file I/O audit, deep-dive group(s) o10-frontmatter-fidelity (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P3, severity corruption)
- Claims covered: fidelity-4

**How a user hits it.** Needs a CRLF note (Windows origin or git autocrlf), which is rare on macOS. Any keystroke, even one undone, makes the tab dirty and autosave rewrites every line ending.

**Recoverable from.** The text content is intact. Only the line endings change, so git checkout or re-converting restores them.

**Root cause.** src/lib/core/markdown-editor/setup/editor-extensions.ts:188 (doc.toString() with no EditorState.lineSeparator facet anywhere in src/lib).

**Evidence.** Fetched codemirror/state src/state.ts: create() splits with staticFacet(lineSeparator) || DefaultSplit, and lineBreak is facet(lineSeparator) || "\n". grep finds no lineSeparator in src/lib. saveFileByPath writes tab.content verbatim (editor.service.ts:165-168). Closed-note writers produce mixed endings: rebuildContent emits LF for the frontmatter and keeps the CRLF body.

**Repro test.** `.scratch/file-io-audit/repro/o10-frontmatter-fidelity/crlf-line-endings.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: Expected: ""---\r\ntitle: Win\r\n---\r\n# Heading\r\n\r\nLine one\r\nLine two\r\n"" Received: ""---\ntitle: Win\n---\n# Heading\n\nLine one\nLine two\n""
```

**Fix sketch.** Detect the note's dominant line ending on open and set EditorState.lineSeparator for that tab, or re-apply it on save. Make rebuildContent use the body's line ending.

## Acceptance criteria

Written by audit 2026-11-05 from the text above and its audit header; the original Issue had none.

- [ ] Failing test first, in src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts: create the editor state through the same path MarkdownEditor.svelte uses (toDocText of '---\r\ntitle: Win\r\n---\r\n# Heading\r\n\r\nLine one\r\nLine two\r\n'), apply one insert and one undoing delete, and assert the text passed to onDocChanged equals the original CRLF string byte for byte. It fails today because the emitted text has every \r\n turned into \n (doc.toString() at editor-extensions.ts:188 with no line-separator handling).
- [ ] A CRLF note opened and edited writes back all lines with CRLF through writeTab (editor.service.ts:191-194): assert on the content written to disk in src/tests/lib/core/editor/editor.service.test.ts or the editor-extensions test above, not only on the store.
- [ ] A note that uses LF only is written back with LF only, and a note with a mix keeps the dominant ending chosen on open (state which rule you used in a test name). No existing LF test changes.
- [ ] rebuildContent (src/lib/core/frontmatter/properties.logic.ts:677-685) emits the frontmatter delimiters and YAML with the line ending of the body it keeps, so a closed CRLF note edited through properties has no mixed endings. Failing test first in src/tests/lib/core/frontmatter/properties.logic.test.ts (describe 'rebuildContent'): body with CRLF in, no bare \n in the result. It fails today because the frontmatter part is joined with \n.
- [ ] Frontend gate: pnpm check + pnpm vitest run pass.

## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/42-crlf-to-lf-rewrite.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
