# 60: Live preview paints no active-line background; source mode keeps it

**Migrated from:** `.scratch/ux-polish/issues/55-no-active-line-slab.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Partially fixed, polish/high. The cursor already lands on the body (editor.logic.ts:110-123), so only the active-line fill remains, and it shows on every note opened.

**Audit check at `5f8003d67`:** partially_fixed (polish, high). The cursor-placement half is done for a tab with no saved state: MarkdownEditor.svelte:393 and :481 use getPositionAfterFrontmatter (src/lib/core/editor/editor.logic.ts:110-123), which returns the start of the first line after the closing fence. frontmatter-field.ts also maps a press into the hidden frontmatter to the body start. The slab half is still present, and the code does explain it, contrary to the first-pass note. highlightActiveLine() is installed unconditionally (src/lib/core/markdown-editor/setup/editor-extensions.ts:10,146), and .cm-activeLine paints var(--syntax-active-line) in every mode and whether or not the editor is focused (setup/editor-theme.ts:52-54). Live-preview styles override it only for block-widget lines (styles.ts:287, 344, 611, 739, 834, 855, 988). Notes are usually written as `---\n...\n---\n\n# Title`, so the first body line is the blank line between the frontmatter and the title, and the cursor lands there on open. CodeMirror then paints that blank line as an empty active-line slab above the title, which matches the owner's screenshot. A frontmatter line can still be active only through a saved cursorPos, but the hidden line is display: none (styles.ts:541-543), so it is not what the owner sees.

**Stale in the text below:** The Issue says the slab is the cursor line inside the hidden frontmatter. That is out of date. The cursor now lands on the first body line, and the slab is the active-line fill on that line, which is often blank. The 'place the cursor at body start' part and its criterion 'cursor lands after the frontmatter' are already met for new tabs (editor.logic.ts:110-123). What remains is the active-line fill (editor-theme.ts:52-54, editor-extensions.ts:146): drop it in live preview, or show it only while focused, and keep it in source mode. Optionally, skip leading blank lines when placing the cursor.

**Note (2026-11-06):** the cursor placement after the hidden frontmatter is already done at HEAD (getPositionAfterFrontmatter, editor.logic.ts:110, tested at editor.logic.test.ts:216-232); only the active-line fill remains. Ignore the cursor half below.

**What to build:** With the frontmatter hidden, the cursor line inside it paints `.cm-activeLine` (`src/lib/core/markdown-editor/setup/editor-theme.ts`, about line 52) as an empty slab above the title. Stop painting the active line in live preview (or only while the editor is focused), and place the cursor at the start of the body when the frontmatter is hidden on open.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first, on the editor theme spec or the editor extensions: in live preview no `.cm-activeLine` background is applied; it fails today (editor-theme.ts about line 52, highlightActiveLine in editor-extensions.ts).
- [ ] Source mode keeps its current active-line behavior

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Shell layout row 8.
- ADR 0008 applies (live preview architecture).
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/55-no-active-line-slab.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: criteria narrowed to the active-line fill after the order review (the cursor half was already done).
