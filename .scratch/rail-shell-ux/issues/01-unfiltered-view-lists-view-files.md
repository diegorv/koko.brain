# 01: A view lists `.view` files as notes, an unfiltered view lists itself

**What to build:** The note list of a picked view lists only notes, never `.view` files. Today an unfiltered view (for example a fresh one from New view) shows every `.view` file in the vault as a row, itself included, once the index refresh lands; a filtered view shows any `.view` whose top-level keys happen to match. Add one predicate, `isListableNote(entry: NoteEntryV2): boolean`, in `features/type-definitions/type-sidebar.logic.ts` (false for a `.view` path, via `isViewFile(entry.path)` from `fs.logic.ts`, which that file already imports), and have `resolveViewLens` (`features/rail-shell/lens.logic.ts:570-582`) drop the entries it rejects before `getNotesForViewPaths`. The navigator count follows: `countViewNotes` (`features/rail-shell/view-lens.service.ts:24`) counts `resolveViewLens(...).notes`.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing test first: `resolveViewLens(VIEW, queryViewLens(def, null, index), ctx)` for a view with no filters, over entries and an index that hold plain notes and two `.view` files (the view itself and another), lists the plain notes and no `.view` path (logic test in `src/tests/lib/features/rail-shell/lens.logic.test.ts`, existing fixtures, no mocks; the fixture holds no type definition, Issue 12 owns those)
- [x] A filtered view never lists a `.view` file, even one whose top-level keys match the filter (same test file)
- [x] `isListableNote` is false for a `.view` entry and true for a markdown note (logic test in `src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts`)
- [x] The view's label still comes from its own `.view` entry (`_sidebar_label`) and its `_sort` still applies: the existing `queryViewLens and resolveViewLens` tests stay green
- [x] The navigator count of an unfiltered view excludes `.view` files (`src/tests/lib/features/rail-shell/view-lens.service.test.ts`, with a `.view` in the entries and the index)

## Notes

- **Traced, not reproduced in the running app.** Rust's `is_markdown_filename` counts `.view` as markdown (`src-tauri/src/utils/fs.rs:114-117`), so `.view` files are indexed as entries, with their raw YAML as frontmatter (`src-tauri/src/vault/entry.rs:237-241`), and projected into the property records that `executeQuery` starts from (`features/collection/collection.logic.ts:114-122`, every record). `resolveViewLens` drops only the system folder and archived notes, so the `.view` paths in the query result become rows. The view's own row appears once the entries snapshot holds it (after the throttled index refresh for a new view).
- **TS-side only.** Do not change Rust `is_markdown_filename` or the index: the Views navigator (`viewNavigatorRows`, `lens.logic.ts:511`), the view label and `_sort` (`resolveViewLens` reads `viewEntry` from `ctx.entries`) read `.view` entries from the same snapshot. Filter only the list entries in `resolveViewLens`, not the `viewEntry` lookup.
- **Test fixture tip:** `buildNoteRecord` parses `---` frontmatter, not a `.view`'s raw YAML, so build the `.view` index record with its keys inside `---` (or as a `PropertyIndexRecord` by hand) to make a filter match it.
- **Main-session decision:** this Issue changes only the rail (view lens and navigator count). The collection editor's table (`features/collection/CollectionView.svelte:207-221`) and inline collection blocks (`collection-block-widget.ts:116`) are not touched here; Issue 13 makes one function own the row set of a `.view` for the editor and the rail (owner decision I13: the rail rule wins in both surfaces), so they drop `.view` rows there.
- **Shared with Issue 12:** Issue 12 extends `isListableNote` to type definitions and applies it to the other lenses; it does not write a second predicate.
- The E2E vault-index mock indexes only `.md` files, so the E2E suite cannot show this today.
- Found during the review of the former view-create-dialog Issues (2026-11-04, now Issues 17-19 here); New view makes an unfiltered view a common result, and Issue 17 does not fix this.
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F72.

## Comments

- **Triage (2026-11-04):** ready-for-agent. Code claims re-checked: resolveViewLens (lens.logic.ts:570-582) filters only the system folder; Rust is_markdown_filename indexes .view (fs.rs:114-117); countViewNotes counts resolveViewLens notes (view-lens.service.ts:24); isViewFile is already imported in type-sidebar.logic.ts.
- **Delivered (2026-11-04):** branch issue/01-unfiltered-view-lists-view-files. New `isListableNote` predicate (type-sidebar.logic.ts) excludes `.view` entries; `resolveViewLens` uses it, so filtered and unfiltered views and the navigator count leave out `.view` files. Review round 1 APPROVED (fixes: JSDoc cites `is_markdown_filename`, fixture comment in lens.logic.test.ts); round 2 APPROVED, no findings. Tests: pnpm check exit 0; full suite (vitest + build) at 39dd7712 exit=0, 467 files, 10882 passed, 1 skipped, 1 todo.
