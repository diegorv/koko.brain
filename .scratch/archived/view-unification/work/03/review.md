VERDICT: APPROVED

## Acceptance criteria

- [met] Failing tests first, with real stores and only `plugin-fs` and `invoke` mocked: — `src/tests/lib/features/type-definitions/rewrite-view-file.service.test.ts` runs the real editor service, editor/vault stores, `editor.hooks` and note-change owner; it mocks `@tauri-apps/plugin-fs`, `@tauri-apps/api/core` and `appendLog` (see finding 4). The five cases: dirty tab + autosave timers (`:125`), clean tab with older buffer (`:139`), held read with Pin + icon (`:152`), held tab save then Pin with write order asserted (`:166`), delete while queued (`:185`). Probe: with `editor.service.ts` and `type-definitions.service.ts` checked out from main, all 13 writer tests and 3 of the editor tests fail on assertions (wrong YAML, unrecreated-file check, missing `{ create: false }`), not only on import; sources were restored (clean `git status`).
- [met] No `.view` writer calls `writeTextFile` except through `rewriteViewFile`. `raw-write-ratchet.test.ts` keeps one site, with its reason string updated. — `type-definitions.service.ts` has two `writeTextFile` calls: `:232` (`renameType`, frontmatter `_type` only, its own ratchet entry) and `:422` inside `rewriteViewFileNow`. All six writers (`:442`, `:447`, `:459`, `:468`, `:483`, `:495`) pass a transform; `removeViewIcon` delegates. No other `src/lib` `writeTextFile` caller targets a `.view`. Ratchet reason updated at `raw-write-ratchet.test.ts:47`; the test passes.
- [met] An open tab shows the result immediately. — Tab branch calls `syncExternalContentToEditor(path, updated, false, 'none')` before the save (`type-definitions.service.ts:408`); `EditorView.svelte:88` binds `CollectionView` to `activeTab.content`. Test `:139` asserts the tab content and the `externalContentSignal` bump.
- [met] The doc comment no longer implies a `.view` write always skips the after-save observers. — `rewriteViewFile` JSDoc (`type-definitions.service.ts:327-347`) says the tab save runs `notifyAfterSave`; rule 6 in `docs/agents/indexing-watcher-rules.md` and the ADR-0009 amendment say the same. No stale `writeViewFile` reference remains outside the ADR's dated history.

## Findings

1. minor — `src/lib/features/type-definitions/type-definitions.service.ts:405-416`: tab branch trusts `saveFileByPath`'s dirty check. When a clean tab's `savedContent` already equals `updated` while disk differs (an outside edit not yet reloaded, which the transform undoes exactly), the sync leaves the tab clean, `writeTab` writes nothing, and the call resolves `true`. The watcher reload then puts the outside bytes back in the tab, so the user's Pin/Unpin is silently lost. Rare and self-healing; fix if wanted: when `updated === tab.savedContent && disk !== updated`, mark the tab unsaved (e.g. sync with a different savedContent) or write through the no-tab path.
2. minor — `type-definitions.service.ts:409` with `editor.service.ts:173`: when the tab save queues behind another save and the tab closes before it runs (closeTab's "Discard changes?" on the now-dirty tab), `writeTab` finds no tab and returns `true`, so the writer reports success with nothing written. The builder lists it as a risk; it needs an explicit discard in a sub-IPC window. Fix if wanted: return `false`/throw when the tab is gone, or fall back to the no-tab branch.
3. nit — `src/tests/lib/features/rail-shell/RailNoteList.view.test.ts:435-452`: with `syncExternalContentToEditor` mocked, the assertion that the tab content is back to `PROJECTS_UNSORTED` holds whatever the writer does. The toast assertion carries the test; the revert itself is covered in `rewrite-view-file.service.test.ts:253-280`. Drop the tab-content line or say in a comment that it is a precondition.
4. nit — `src/tests/lib/features/type-definitions/rewrite-view-file.service.test.ts:22`: a third mock (`appendLog`) next to the two the criterion names. It is a log writer that would otherwise reach the `writeTextFile` mock and pollute its call assertions, so it is a Tauri-boundary stand-in, not a mocked store or logic file. A one-line comment would say why.
5. nit — `type-definitions.service.ts:409-410` (and the `frontmatter-write` idiom it copies): `vault-changed` thrown after a save that landed makes `TypesNavigator` toast "Could not pin the view: the vault changed before the view was saved" for a write that is on disk. The `ViewWriteReason` JSDoc documents it; the wording of the message could say "may not have been saved".

## Checks run by this review

- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/features/type-definitions src/tests/lib/core/editor src/tests/lib/core/frontmatter src/tests/lib/features/rail-shell src/tests/lib/raw-write-ratchet.test.ts src/tests/lib/architecture`: exit 0, 67 files, 2252 tests passed. Covers every test file the diff adds or changes (`rewrite-view-file.service.test.ts`, `editor.service.test.ts`, `type-definitions.service.test.ts`, `edit-view.service.test.ts`, `update-view-query-cache.test.ts`, `TypesNavigator.test.ts`, `RailNoteList.view.test.ts`, `RailNoteList.properties.test.ts`, `raw-write-ratchet.test.ts`) and the layer rules.
- The 26 other test files that call `saveFileByPath`, `saveAllDirtyTabs`, `saveCurrentFile`, `updateNoteFrontmatter` or `onContentChange`: exit 0.
- Probe against main's sources (see criterion 1): 15 of the new tests fail there.
- Full suite and `pnpm build` (the Issue's Gate) are deliver's to run. No `src-tauri/` change, no layer-baseline change.

## Other notes

- Correctness traced: `markSavedByPath` sets only `savedContent`, so an older save finishing after the sync does not overwrite `updated`; the redo after `exists` and the no-tab write have no await in between, as in `frontmatter-write.service.ts:143-160`; `notifyAfterSave` calls `applyNoteChange` with no `vaultPath`, so the tab branch keeps a `.view` out of FTS5 and the semantic table.
- `editView` now skips the write and the prompt refresh when the edit changes nothing, and still refreshes the parse cache; this matches "`updated === base` returns without writing" and "`editView` keeps its refresh".
- Scope: the toast guards in `TypesNavigator.svelte` and `RailNoteList.svelte` answer the Issue's double-toast note; the docs edits answer criterion 4. Nothing else changed.

## Resolution

1. Fixed: the tab branch runs only when the result differs from the tab's `savedContent`; a clean tab that already holds the result writes the file through the no-tab path. Test: `rewrite-view-file.service.test.ts` "writes the file when a clean tab already holds the result but disk differs".
2. Fixed: after a successful tab save, a tab that is gone gets the rewrite redone on the file (a no-op when the save did land). Test: "writes the file when the tab closes before its queued save runs".
3. Fixed: dropped the tab-content assertion from `RailNoteList.view.test.ts`.
4. Fixed: one-line comment on the `appendLog` mock.
5. Fixed: `vault-changed` now reads "the vault changed, so the view may not have been saved".
