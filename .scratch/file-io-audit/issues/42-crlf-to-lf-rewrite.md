# 42: CRLF notes are rewritten with LF after any edit

**Status:** wontfix

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

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/095-crlf-notes-keep-their-crlf-line-endings.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
