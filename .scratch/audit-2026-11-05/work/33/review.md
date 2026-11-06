VERDICT: APPROVED

Reviewed `git diff main...HEAD` (66b410d28, a38a68f3a, d11d849f6) in the worktree. No `.scratch/audit-2026-11-05/spec.md` exists; nothing under `docs/adr/` covers QueryJS folder sources.

## Acceptance criteria

- [met] Failing test first, in src/tests/lib/plugins/queryjs/queryjs.logic.test.ts (describe 'parseSource'): with vault root '/vault', the filter for '"Projects"' is false for folders '/vault/Archive/Projects' and '/vault/Projects Archive', and true for '/vault/Projects' and '/vault/Projects/2026'; it fails today (the first two match). — queryjs.logic.test.ts:376-382 asserts exactly these four folders. On main, `'/vault/archive/projects'.includes('projects')` is true, so the first expectation fails there; the fix commit a38a68f3a adds the tests together with the change, and the build report records the red run. Passes on the branch.
- [met] A source whose text is part of the vault root path (vault '/Users/me/Notes', source '"Notes"') does not match every page. — queryjs.logic.test.ts:384-389: false for '/Users/me/Notes' and '/Users/me/Notes/daily', true for '/Users/me/Notes/Notes'. kb-api.test.ts:228-236 also checks '"vault"' returns `[]` through KBAPI.pagePaths.
- [met] An absolute folder source ('"/vault/Projects"') matches that folder and its subfolders only. — queryjs.logic.test.ts:391-397 (true for /vault/Projects and /vault/Projects/2026, false for 'Projects Archive' and 'Archive/Projects'); queryjs.logic.ts:206 keeps a '/'-prefixed source as absolute.
- [met] The existing cases stay green: '"notes"' matches /vault/notes, "'archive'" matches /vault/archive/2024, mismatched quotes return null. — queryjs.logic.test.ts:357-372 and :405-408 unchanged apart from the added '/vault' argument; all pass.
- [met] src/tests/help/examples-scoping.test.ts still passes, and the SCOPING.md gotcha 'The folder source matches by substring' is removed or rewritten. — help/examples/SCOPING.md diff deletes the two-line gotcha; examples-scoping.test.ts passes in my run.
- [met] help/documentation/13-queryjs.md states that the folder source is vault-relative (or absolute) and includes subfolders. — 13-queryjs.md:67 ("in a specific folder and its subfolders") and :70 (relative to the vault root, '/' means absolute, ignores case).
- [met] Frontend gate: pnpm check and pnpm vitest run pass. — `pnpm check` exit 0 (0 errors, 0 warnings). The targeted vitest files below pass; the full `pnpm vitest run` is deliver's to run.

## Checks I ran

- `taskpolicy -c background pnpm check`: exit 0, 221 files, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/plugins/queryjs/ src/tests/help/examples-scoping.test.ts src/tests/lib/core/settings/settings-copy.test.ts`: exit 0, 13 files, 588 passed, 1 todo. My test verdict rests on these files: queryjs.logic.test.ts and kb-api.test.ts (the changed code's tests), the rest of src/tests/lib/plugins/queryjs/ (kb-api-contract.test.ts reads 13-queryjs.md), examples-scoping.test.ts (reads SCOPING.md) and settings-copy.test.ts (reads 13-queryjs.md).
- Callers: `parseSource` is called only from kb-api.ts:123; KBAPI is built only in queryjs-block-widget.ts:245 with `vaultStore.path ?? ''`. Every help example uses an absolute `${...file.folder}` source, which still matches that folder and its subfolders. The change has no other blast radius.
- Indentation: no added line indented with spaces.
- Scope: source, tests and the two help pages only. Nothing in the layer baseline.

## Findings

1. minor, src/lib/plugins/queryjs/queryjs.logic.ts:206: any source that starts with '/' is read as absolute. A user who writes a vault-relative path with a leading slash (`'"/Projects"'`, a common habit) now gets an empty list with no warning. On main the substring match returned `<vault>/Projects`. Every page lives under the vault root, so an absolute target outside the root can never match anything. Fix: when the '/'-prefixed target is neither the vault root nor below it, resolve it against the vault root, and add a test case. The other option is to keep the current rule as an owner decision; it is documented at help/documentation/13-queryjs.md:70.
2. nit, src/lib/plugins/queryjs/queryjs.logic.ts:203: `'"/"'` becomes an empty folder after the trailing slash is stripped. The target is then `<root>/`, which matches no page (before the change it matched every page). Fix: treat an empty stripped folder as the filesystem root ('/' matches every page) or as no filter, and add a test case.

## Resolution

1. Fixed. `parseSource` keeps a folder source as absolute only when it is the vault root or below it; any other source, with or without a leading `/`, resolves against the vault root, so `'"/Projects"'` matches `<vault>/Projects`. Test: queryjs.logic.test.ts 'reads a leading-slash folder outside the vault root as vault-relative' (red before the change). help/documentation/13-queryjs.md and the JSDoc state the rule.
2. Fixed by the same change: `'"/"'` strips to an empty folder and targets the vault root, so it matches every page. Test: 'matches every page in the vault for the "/" source' (red before the change).
