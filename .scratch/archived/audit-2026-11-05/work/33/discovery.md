# Issue 33 discovery

## Files that change

- `src/lib/plugins/queryjs/queryjs.logic.ts:175-202` `parseSource`: takes the vault root as a second
  parameter; the folder branch matches by path segments instead of `includes()`.
- `src/lib/plugins/queryjs/kb-api.ts:120-122` `pages()`: passes `this.vaultPath` to `parseSource`;
  JSDoc line 117 says vault-relative or absolute, subfolders included.
- `src/tests/lib/plugins/queryjs/queryjs.logic.test.ts:324-382` (describe `parseSource`): new cases
  from the criteria; existing calls get the vault root `'/vault'`.
- `src/tests/lib/plugins/queryjs/kb-api.test.ts:221` already covers `'"sub"'` through KBAPI (vault
  `/vault`); add one case that a sibling-substring folder does not match.
- `help/examples/SCOPING.md:36-37`: drop the substring gotcha (the folder source now matches
  segments).
- `help/documentation/13-queryjs.md:67`: say the folder source is vault-relative or absolute and
  includes subfolders.

## Plan

1. Failing tests in `queryjs.logic.test.ts` (criteria 1-4), run, see them fail.
2. `parseSource(source, vaultPath)`: strip quotes, lowercase, drop trailing `/`. A text starting with
   `/` is absolute; otherwise it is joined to the vault root (trailing `/` on the root stripped, as
   kb-api.ts:529 allows). A page matches when its lowercased `file.folder` equals the target or
   starts with target + `/`.
3. Wire `vaultPath` in `kb-api.ts`, add the KBAPI case, update both help pages.
4. Targeted checks: `pnpm check`, `queryjs.logic.test.ts`, `kb-api*.test.ts`,
   `src/tests/help/examples-scoping.test.ts`.

## Prior art

Existing `parseSource` tests use plain `{ file: { folder } } as any` pages; copy that shape.

## Defaults taken

- Case-insensitive, as before (Issue says keep it).
- A source starting with `/` is always absolute, never re-read as vault-relative (`"/Projects"`
  matches only a top-level `/Projects` on disk). Help says so.
- A trailing slash in the source (`"Projects/"`) is ignored.
- Out of scope, unchanged: unquoted or compound sources still return every page.

## Risks

- Every help example uses an absolute `${file.folder}` source, which keeps matching its folder and
  subfolders; a vault script relying on substring matching (`"notes"` for `/x/my-notes`) loses those
  pages. That is the fix.
