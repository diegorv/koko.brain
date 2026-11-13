# 03 discovery: scope markdown-editor-vault and live-preview-regressions

Template: `help/examples/SCOPING.md` (issue 01). Guard: `src/tests/help/examples-scoping.test.ts`.

## Files that change
- `help/examples/markdown-editor-vault/20-collection.md`: 15 parsing collection blocks (sections 1-15, 20) read the
  whole vault; 16-19 do not parse (error demos, not guard sites). Header line 5 points at a nonexistent `base-exemplos/`.
- `help/examples/markdown-editor-vault/22-queryjs.md`: `kb.pages()` / `kb.pages("#tag")` in sections 1-3, 6-8, 11b-11e,
  16, 20; section 4 uses a literal folder source `"collection-examples"` (no such folder). Header line 5.
- `help/examples/markdown-editor-vault/23-queryjs-real-scripts.md`: sections 1, 2, 4, 7 (two reads), 8, 9, 10. Header 5-6.
- `help/examples/markdown-editor-vault/24-queryjs-advanced.md`: sections 1-5, 7-12, 14, 16-18. Header line 5.
- `src/tests/help/examples-scoping.test.ts:46-49`: drop the four `markdown-editor-vault/*` allowlist entries.
- `help/examples/live-preview-regressions/`: no change. Its only query is a `queryjs` fence nested in a ````md fence
  (`06-fenced-code.md:13`), which must not run and reads nothing. No allowlist entries.

## Plan
1. 20-collection: every block (including the limited one) gets the scope `file.folder.contains("/markdown-editor-vault")`
   as a top-level filter; an existing string filter becomes an `and:` with it; `or:` / `not:` nest under that `and:`;
   section 14 keeps its view filter. The header says where the data notes go.
2. 22-24: `kb.pages()` -> ``kb.pages(`"${kb.current().file.folder}"`)``; tag sources `kb.pages('#t')` -> the same plus
   `.whereTag('t')` (same matching as `parseSource`'s tag branch). 22 section 4 -> ``"${folder}/collection-features"``.
   Output strings that say "vault" for a count -> "folder". Headers updated.
3. Remove the allowlist entries; the stale-entry test proves every site is now scoped.

## Defaults taken
- "Scoped to the folder" = the example's own folder (`markdown-editor-vault`), relative to the note for QueryJS and by
  folder name for collection blocks (no relative form exists, SCOPING.md gap). It matches the goal: same result as its
  own vault or nested. The data these sections expect (bugs, projects, dailies, meetings) lives in the sibling
  `collection-features/` and `queryjs-features/`; the old headers already asked to copy that data next to the note, so
  the headers now say: copy that folder into this one (the folder source and `contains` include subfolders). ESPERADO
  names and counts stay valid after the copy and are left unchanged.
- No fallback for `kb.current()` (SCOPING.md: an empty folder reads every page).
- `kb.view("__system/queryjs/...")` in 23 sections 3 and 5 is untouched: it does not read pages itself; the vault-root
  path gap and the scripts belong to issue 02.

## Prior art
- Issue 01 guard unit cases (template folder source, `.whereTag` after a folder source).

## Risks
- `contains("/markdown-editor-vault")` also matches a sibling `/markdown-editor-vault-old` (SCOPING.md gotcha).
- Out of the box (no copy) the data-specific sections render empty or zero; documented in each header.
