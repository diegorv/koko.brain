VERDICT: CHANGES_REQUESTED

# Review: Issue 55, icon and favorite writers go through `updateNoteFrontmatter`

Reviewed `git diff main...HEAD` (c6e3634e..6a2d2daa) in the worktree.

## Acceptance criteria

- [x] **Both writers use `updateNoteFrontmatter`; a dirty open tab keeps its edits.** Met.
  - `src/lib/features/file-icons/frontmatter-icon.service.ts:31-41` (`writeIconFrontmatter`) is the only write path for `setFrontmatterIcon` (`:50-64`) and `removeFrontmatterIcon` (`:73-79`). No `writeTextFile`, `syncExternalContentToEditor` or `applyNoteChange` is left in the file.
  - `src/lib/features/type-definitions/type-definitions.service.ts:244-251` (`toggleFavoriteForPath`) calls `updateNoteFrontmatter` with `toggleFavorite`.
  - Dirty-tab evidence: `frontmatter-icon.service.test.ts` "setFrontmatterIcon patches a dirty open tab..." and "removeFrontmatterIcon patches a dirty open tab..." run against the real `editorStore` and real `saveFileByPath`, and assert the written bytes contain the unsaved body edit and the tab ends clean. `type-definitions.service.test.ts` "patches an open dirty tab from its own content..." asserts the patched content handed to `syncExternalContentToEditor` keeps `# Unsaved edit` and that `saveFileByPath` runs (editor.service is mocked there, so this one checks the hand-off only; the icon tests cover the real store).
- [x] **The refusal behavior is decided and tested.** Met. Decision: adopt the refusal, report it with `toastFrontmatterWriteError` (`src/lib/features/properties/frontmatter-write.service.ts:44-64`), recorded in `discovery.md` and in an ADR-0029 amendment (`docs/adr/0029-frontmatter-yaml-canonical-form.md:102`). Tests: comments refusal for set (`frontmatter-icon.service.test.ts`), nested refusal for remove with a dirty tab left as it was, icon store untouched on refusal for a file and for a folder note (`file-icons.service.test.ts`), favorite refusal (`type-definitions.service.test.ts`), and the toast helper itself (`frontmatter-write.service.test.ts`, including the silent `save-failed`).

## What I verified

- `pnpm check`: 0 errors, 0 warnings (211 files).
- Vitest, run myself: `src/tests/lib/features/{file-icons,type-definitions,properties,auto-move}` (29 files, 964 tests) and `src/tests/lib/features/event-calendar/event-calendar.service.test.ts` (161 tests): all passed. My test verdict rests on `frontmatter-icon.service.test.ts`, `file-icons.service.test.ts`, `type-definitions.service.test.ts`, `frontmatter-write.service.test.ts`, `auto-move.service.test.ts`, `TypeSidebar.test.ts`, `TypeNoteList.view.test.ts`, `TypeNoteList.perf.test.ts` and `event-calendar.service.test.ts`.
- Probe (temporary test, deleted, not committed): real `setFrontmatterIcon` / `toggleFavoriteForPath` over an in-memory disk with a registered after-save observer. Two identical icon writes and two identical favorite toggles wrote twice and fired the observer twice, so a repeated identical write is a no-op (`next === base`). That means the new auto-move re-entry (finding 1) terminates after one extra evaluation instead of looping.
- Leftover imports in `type-definitions.service.ts` (`readTextFile`, `writeTextFile`, `syncExternalContentToEditor`, `editorStore`, `applyNoteChange`) are still used elsewhere in the file. No orphans.
- `removeProperty` is an exact-key filter and `parseFrontmatterProperties` canonicalizes aliases (`icon` -> `_icon`), so the `ICON_KEYS` filter in `removeFrontmatterIcon` strips the same keys the old code did.
- Behaviour change to note (intended by the Issue): the icon and favorite writes now run `notifyAfterSave`, so `markRecentSave` stops the watcher from re-indexing the app's own write, and every after-save observer (search, semantic, auto-move) runs on them.

## Findings

1. **Medium: auto-move turns a refusal into an error toast on every save of the note.** `src/lib/features/auto-move/auto-move.service.ts:191-197` calls `setIconForPath` from the after-save observer (debounced 3 s per file). Discovery lists only the four Svelte call sites and missed this one. When a note with lossy frontmatter (for example a YAML comment) matches a user rule that has an icon, each autosave while the user types now ends in `toast.error("The note's frontmatter has comments; ...")`. The toast comes from a background process and does not say which note. The `debug('AUTO-MOVE', 'Applied icon ...')` line also logs on a refusal, because `setIconForPath` returns normally. Before this change the icon write dropped the comments once (data loss) and never toasted again. **Fix:** in `evaluateAndMove`, skip the icon write when `detectLossyFrontmatter(content) !== null` and log it (`debug`/`error`) instead of toasting. Alternatively, have `setIconForPath` return the boolean and let auto-move ask for a quiet write. Add a test in `src/tests/lib/features/auto-move/auto-move.service.test.ts` for a lossy note that matches an icon rule: no `setIconForPath`/no toast, and a log line.
2. **Low: the refusal toast does not name the note.** `src/lib/features/properties/frontmatter-write.service.ts:61-63`. For a folder icon the write targets the folder note (`Projects/Projects.md`), not what the user clicked, and for auto-move the user did not click anything at all. **Fix:** prefix the message with the file name from `err.path` (for example `` `${getFileName(err.path)}: ${WRITE_ERROR_MESSAGES[err.reason]}` ``) and update the expected strings in the four test files that assert on it.
3. **Low: no test pins that these writers now run the after-save observers.** That was half of the Issue's stated motivation ("skip the after-save observers"), and finding 1 depends on it. Only the indexing side effects (`applyNoteChange`) are asserted. **Fix:** in `src/tests/lib/features/file-icons/frontmatter-icon.service.test.ts`, register an observer with `addAfterSaveObserver` and assert that it is called once for a closed-note icon write and not called for an identical repeat write. This is the probe above, kept as a test.

## Scope

No scope creep. The ADR amendment and the generic toast helper are what the Issue asked for ("decide ... and how the UI reports it"). `ensureFolderNote`'s placeholder write staying disk-direct is out of scope, and the build report says so. One nit, no change needed: `removeFrontmatterIcon` reads a closed note twice, once for the "no icon keys" pre-check and once inside `updateNoteFrontmatter`. The cost is one extra read on a user click.

## Resolution

1. Fixed. `evaluateAndMove` skips the icon write when `detectLossyFrontmatter(content)` is not null and logs `Skipped icon for <path>: frontmatter is <reason>` through `debug`; no toast, no `Applied icon` line. Test: `auto-move.service.test.ts` "observer skips the icon of a note with lossy frontmatter and logs instead".
2. Fixed. `toastFrontmatterWriteError` prefixes the message with `basename(err.path)` (`$lib/utils/path`). Expected strings updated in `frontmatter-write.service.test.ts`, `frontmatter-icon.service.test.ts` and `type-definitions.service.test.ts`; `file-icons.service.test.ts` and the calendar (own message map) assert no toast text.
3. Fixed. `frontmatter-icon.service.test.ts` "after-save observers" registers a real observer over an in-memory disk: one call for the first icon write, none (and no second write) for the identical repeat.
