VERDICT: APPROVED

Review of `git diff main...HEAD` (05bbd0a36, 657f6562a, 6794796ed) on `issue/02-quick-switcher-create-while-matching`.

## Acceptance criteria

- [met] Failing test first, in `src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts`: with no files in the tree, type `Projects/Idea` and run Create; `create_folder` is invoked for `/vault/Projects` before `create_note` is invoked with `/vault/Projects/Idea.md`, and the note opens. — test "creates the typed folder before the note in it, and opens the note" (QuickSwitcher.test.ts:290-299) compares call indexes of `create_folder` `/vault/Projects` and `create_note` `/vault/Projects/Idea.md` and waits for `openFileInEditor('/vault/Projects/Idea.md')`. Probe: with main's `QuickSwitcher.svelte` swapped in, this test and 14 others fail (15 failed, 11 passed); file restored afterwards. Implementation QuickSwitcher.svelte:75-83.
- [met] A nested path (`Area/Projects/Idea`) creates every missing folder level. — one recursive `create_folder` for `/vault/Area/Projects` (Rust `create_dir_all`, vault.rs:1179-1183), tree asserted to hold Area > Projects > Idea.md (QuickSwitcher.test.ts:301-310).
- [met] An existing folder is reused, not duplicated as `Projects 1`. — the code calls `create_folder` (no-op on an existing dir) and never `fs.service` `createFolder`; test at QuickSwitcher.test.ts:312-321 passes, but see finding 1 on its strength.
- [met] A query with an empty, `.` or `..` segment creates nothing and shows a toast that says why. — `parseCreatePath` (quick-switcher.logic.ts:23-36) refuses blank segments and any `.`-prefixed one; `it.each` at QuickSwitcher.test.ts:339-354 covers `Projects//Idea`, `Projects/`, `./Idea`, `../Idea` with no `create_folder`/`create_note` invoke and a toast containing the reason.
- [met] A query with a segment that starts with `.` (for example `.kokobrain/x` or `Projects/.hidden`) creates nothing (no `create_folder` or `create_note` invoke) and shows a toast that says why. — same `it.each` rows `.kokobrain/x`, `Projects/.hidden`; logic test rows in quick-switcher.logic.test.ts:30-36.
- [met] After `Projects/Idea` is created with no `Projects` folder in the tree, `fsStore.fileTree` holds a `Projects` folder node containing `Idea.md`. — QuickSwitcher.test.ts:323-330 asserts the real `fsStore.fileTree` (built by `createFile` -> `addToTree` -> `insertTreeNode`).
- [met] When creation fails, the toast includes the error reason; the existing "toasts and opens nothing" test keeps passing with its assertions adjusted only for the new text. — catch at QuickSwitcher.svelte:83-85 toasts `Failed to create file: <reason>`; the two old assertions changed only their string (diff at :121 and :152); new folder-failure test :356-367. Rust commands return `Result<_, String>`, so `String(err)` yields the message.
- [met] Failing test first: invert the test at `QuickSwitcher.test.ts:215-227`. With `Ideas.md` present, typing "Idea" renders the match and then `Create "Idea"` last; Enter opens `/vault/Ideas.md`; Shift+Enter creates and opens `/vault/Idea.md`. — QuickSwitcher.test.ts:241-267; both failed against main's component in the probe. The Shift+Enter test also proves `stopPropagation` matters: without it bits-ui's root handler would open `/vault/Ideas.md`, which the test rejects.
- [met] Typing "Ideas" with `Ideas.md` present renders no Create row, and Shift+Enter creates no `Ideas 1.md`. — `showCreate` (QuickSwitcher.svelte:33-38) compares the target path case-insensitively against the tree; test :269-280 (query `ideas`, `readDir` returns `Ideas.md`) asserts no row and no `create_note`.
- [met] `Projects/Idea` shows "in Projects" on the row and creates there; a plain `Idea` shows "in vault root". — label test :282-288 plus the create-location tests above; `createTargetLabel` unit-tested.
- [met] The 042 tests (Enter on no match, both query transitions) stay green. — tests at QuickSwitcher.test.ts:160-213 unchanged and passing.
- [met] The switcher footer shows the Shift+Enter Create hint; the help doc describes the Create row, Shift+Enter and folder paths. — `hints={KEY_HINTS}` (QuickSwitcher.svelte:41-45, :113) through Issue 01's `hints` prop; footer test :369-376; help/documentation/06-search-and-navigation.md:15-16.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check`: 0 errors, 0 warnings (exit 0). Targeted vitest passed (exit 0, 17 files, 398 tests). The full suite is deliver's to run.

## Findings

1. minor, src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts:312 — "reuses an existing folder instead of making a renamed copy" cannot fail for the bug it names: `readDir` is mocked to `[]` for every path, so an implementation that used `fs.service` `createFolder(vault, 'Projects')` would get `generateUniqueName` with no siblings, return `Projects`, and pass the `not.toContain('Projects 1')` assertion. It also passes against main's component. Fix: in that test make `readDir` return a `Projects` directory entry for `/vault` (e.g. `mockImplementation(async (p) => p === '/vault' ? [{ name: 'Projects', isDirectory: true, isFile: false, isSymlink: false }] : [])`) so a renaming path would produce `Projects 1`.
2. minor, src/lib/features/quick-switcher/QuickSwitcher.svelte:157 — a path query that names an existing note (`Projects/Idea` with `Projects/Idea.md` in the tree) hides the Create row, and `filterAndRank` fuzzy-matches `nameWithoutExt` only, so nothing matches either: the list says "No files found." for a note that exists, and Enter does nothing. Fix (optional, small): when the Create row is hidden because the target exists, show that note as the match (or an "already exists" line) instead of "No files found."; or record it as accepted in the Issue.
3. nit, src/lib/features/quick-switcher/QuickSwitcher.svelte:43 — the footer reads "↵ Open" even when no note matches and Enter creates. Acceptable as is; the help doc states the no-match Enter behaviour.

## Checks run by the reviewer

- `pnpm check`: exit 0, 234 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/quick-switcher/ src/tests/lib/architecture/ src/tests/scripts/sync-wiki-docs.test.ts`: exit 0 (17 files, 398 tests). Test verdict rests on `QuickSwitcher.test.ts`, `quick-switcher.logic.test.ts`, the other quick-switcher test file, the architecture layer tests and the wiki-docs sync test.
- Fail-first probe: main's `QuickSwitcher.svelte` against the branch's `QuickSwitcher.test.ts`: 15 failed, 11 passed; source restored, `git status` clean.
- No other unit or E2E test asserts `Failed to create file`, `Create "` or `No files found` (searched `src/tests`, `e2e`).
- Scope: changes stay in the quick-switcher feature, its tests and the help doc; no layer-baseline or composition-root change.
- Not checked: Shift+Enter with a real IME (jsdom cannot), and the app run itself; E2E and `pnpm build` are deliver's.

## Resolution

1. Fixed. The "reuses an existing folder" test now has `readDir` list a `Projects` directory for `/vault`, so a path through fs.service `createFolder` would name it `Projects 1` and fail the test.
2. Fixed. When the query names an existing note in its target folder, the switcher lists that note (first, if the name-only ranking missed it) instead of "No files found.", and Enter opens it. New test "lists the existing note a folder path names, and opens it on Enter" failed before the change.
3. Not changed: the reviewer marked it acceptable as is, and the help doc states that Enter creates when nothing matches.
