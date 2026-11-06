# 33: kb.pages('"folder"') returns the notes in that folder and its subfolders only

**What to build:** parseSource (src/lib/plugins/queryjs/queryjs.logic.ts:194-199) lowercases the quoted text and tests page.file.folder.toLowerCase().includes(folder). file.folder is the absolute parent path (src/lib/features/collection/collection.logic.ts:33), so the match is a substring anywhere in the absolute path. The help page promises 'Pages in a specific folder' (help/documentation/13-queryjs.md:67). Match by path segments instead: a vault-relative source matches a page whose vault-relative folder equals it or starts with it plus '/'; an absolute source (the SCOPING.md pattern kb.pages(`"${root}"`) builds one) matches the same way against the absolute folder. parseSource needs the vault root for that; KBAPI already has vaultPath (src/lib/plugins/queryjs/kb-api.ts:118-131). Keep case-insensitivity unless the owner says otherwise. Out of scope unless the owner decides it: a source that is neither #tag nor quoted (unquoted name, Dataview 'a and b') still returns every page silently (kb-api.ts:121-130, pinned by queryjs.logic.test.ts:379-381).

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/plugins/queryjs/queryjs.logic.test.ts (describe 'parseSource'): with vault root '/vault', the filter for '"Projects"' is false for folders '/vault/Archive/Projects' and '/vault/Projects Archive', and true for '/vault/Projects' and '/vault/Projects/2026'; it fails today (the first two match).
- [ ] A source whose text is part of the vault root path (vault '/Users/me/Notes', source '"Notes"') does not match every page.
- [ ] An absolute folder source ('"/vault/Projects"') matches that folder and its subfolders only.
- [ ] The existing cases stay green: '"notes"' matches /vault/notes, "'archive'" matches /vault/archive/2024, mismatched quotes return null.
- [ ] src/tests/help/examples-scoping.test.ts still passes, and the SCOPING.md gotcha 'The folder source matches by substring' is removed or rewritten.
- [ ] help/documentation/13-queryjs.md states that the folder source is vault-relative (or absolute) and includes subfolders.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/medium. In common PARA layouts, a folder source also matches unrelated folders.
- **Trigger:** A block uses kb.pages('"Projects"') in a vault that also has 'Archive/Projects' or 'Projects Archive' (a common PARA layout), or a source whose text also appears in the vault's own absolute path (vault folder 'Notes', source '"Notes"').
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/plugins/queryjs/queryjs.logic.ts:195-198 includes() on lowercased folder; src/lib/plugins/queryjs/queryjs.logic.ts:153 file.folder = record.folder; src/lib/features/collection/collection.logic.ts:33 folder is the absolute parent path; help/documentation/13-queryjs.md:67 and :148 (file.folder 'Absolute parent folder path'); help/examples/SCOPING.md:36-40 already lists the substring match as a gotcha for example authors, the user-facing page does not; src/tests/lib/plugins/queryjs/queryjs.logic.test.ts:357-372 only tests matching folders.
- **Second opinion:** upheld (ux, medium). Confirmed. parseSource (queryjs.logic.ts:195-198) runs page.file.folder.toLowerCase().includes(folder), and file.folder is the absolute parent path. '"Projects"' therefore also matches 'Archive/Projects' and 'Projects Archive', and a source that appears in the vault root's own path matches every page. Queries return wrong pages, nothing is written. Corrections to apply while implementing: Category ux, not content.
- **Source:** audit 2026-11-05, domain `queryjs`, finding `N-queryjs-03` (from queryjs-ux-4, queryjs-spec-3). Size M.

## Comments
