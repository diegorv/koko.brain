VERDICT: APPROVED

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | nit: `NoteRowNote.createdAt` unread after the footer removal | resolved | 56df3a3cc drops the field from `note-row.types.ts` and its writers in `lens.logic.ts` (`toLensNote`, `fileToLensNote`). A grep of `src/lib/features/note-list`, `src/lib/features/rail-shell` and the harness finds no `createdAt` left on a row; the only remaining hit is `entryNoteDate`'s `diskCreatedAt: entry.createdAt * 1000` (`lens.logic.ts:194`), which reads `NoteEntryV2.createdAt`, so the note date rule is unchanged. `LensNote extends NoteRowNote` (`rail-shell.types.ts`) and no test asserts a row object with `createdAt`. `pnpm check` exits 0. |
| 2 | nit: `noteSubtitle` doc says "the order the lists sort by" | resolved | `lens.logic.ts:180` now reads "the order most lists sort by". |

## Acceptance criteria re-checked

- [met] `NoteRow.svelte` has no footer branch: the `subtitle === undefined` block, the `formatRelativeTime` / `formatNoteDate` import and the "replaces the modified / created dates" wording of the `subtitle` prop doc are gone. The `row` tests in `NoteRowMenu.test.ts` assert that a row with a subtitle renders it in `[data-note-row-subtitle]` and that a row without one renders no date line (component test; `NoteRowMenuHarness.svelte` may gain an optional `subtitle` prop) — the fix only renames the no-subtitle test to "even when the note has a modified time" and drops the `createdAt` input, since the field no longer exists; it still sets a current `modifiedAt` and asserts no subtitle node. `NoteRowMenu.test.ts` passes.
- [met] Folder lens rows of other file kinds, and markdown files with no entry yet, keep their kind label (`Canvas`, `PDF`, `Image`, `File`, `Note`) as the subtitle (existing test `lens.logic.test.ts` "fills a markdown row from its entry and other files from the tree" stays green for the kind label) — the fix removes only the `createdAt` line from `fileToLensNote`; `subtitle: FILE_KIND_LABELS[kind]` is untouched and `lens.logic.test.ts` passes.

## Checks run

- `pnpm check`: exit 0, 214 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/note-list/ src/tests/lib/features/rail-shell/ src/tests/lib/plugins/calendar/day-lens.logic.test.ts`: exit 0, 18 files, 531 tests passed (covers both changed test files and the tests of `lens.logic.ts` and `note-row.types.ts` consumers).
- The full suite (`pnpm vitest run && pnpm build`) is deliver's to run and was not run here.
- Scope: the fix commit touches only the type, its two writers, the two test fixtures and the review file. No test was weakened; no layer-baseline change.

## Findings

None.
