# 03 discovery

No `spec.md` for this feature; `PRD.md` § Writes: "A view writer waits for a tab save in flight on that path."

## Files that change

- `src/lib/core/editor/editor.service.ts:162-179` `saveFileByPath`: per-path promise chain (a save queues behind the previous save of its path and reads `tab.content` when it runs). New export `waitForTabSave(path)` resolves when the chain tail settles.
- `src/lib/features/type-definitions/type-definitions.service.ts:279-379`: `writeViewFile` becomes `rewriteViewFile(path, transform, opts?)`, per-path chain, vault captured at call time. Steps: `waitForTabSave`, `readTextFile`, `assertVault`, then with no await `base = tab && dirty ? tab.content : disk`, `updated = transform(base)`, equal returns `false`. Tab branch = `frontmatter-write.service.ts:131-140`. No-tab branch = `:143-160` (exists, vault, missing refusal, a tab opened meanwhile redoes on the tab branch, `{ create: false }`, sync for a tab opened during the write), then `markRecentSave` + `applyNoteChange` (source `save`, no `vaultPath`). Returns `true` when written.
- New `ViewWriteError` (`save-failed` | `vault-changed` | `missing`) in the same file. `save-failed` was already toasted by `saveFileByPath`.
- Callers: the six writers pass their updater as `transform`; `updateViewQuery` refreshes only when written, `editView` always refreshes (as today).
- Double toast: `TypesNavigator.svelte:193-200` (`handleRailPin`), `RailNoteList.svelte:285-297` (`persistViewState`) and `:394-409` (`writeThroughOverlay`) skip their toast for `ViewWriteError` `save-failed`.
- `src/tests/lib/raw-write-ratchet.test.ts:47` reason string; `docs/agents/indexing-watcher-rules.md` rule 6 and an ADR-0009 amendment name `rewriteViewFile` and the tab branch's `notifyAfterSave`.

## Tests

- New `src/tests/lib/features/type-definitions/rewrite-view-file.service.test.ts`: real editor service, stores, hooks and note-change owner; only plugin-fs and `invoke` mocked (in-memory disk, `create: false` honoured). The five criteria cases plus: save failure reverts the tab and throws `save-failed`; vault switch throws `vault-changed`; tab write runs `update_note_in_index`.
- Prior art: `frontmatter-write.service.test.ts` (disk map, `deferred`, `openTab`), `edit-view.service.test.ts`.
- `editor.service.test.ts`: a second save of one path waits for the first.
- Existing `.view` tests (`type-definitions.service.test.ts`, `edit-view`, `update-view-query-cache`, `RailNoteList.view`) need `exists` resolving true and the third `writeTextFile` argument.
- Component tests for the skipped toast: `TypesNavigator.test.ts`, `RailNoteList.view.test.ts`.

## Defaults taken

- `requestPromptIndexRefresh` goes through `opts.promptIndexRefresh`, called inside the writer after `updated !== base` and before the write (the event fires during the write's IPC), only for Pin, list properties and Edit view, as today.
- `ViewDialog` shows a save failure inline, not as a toast: left as is.

## Risks

- A clean tab whose `savedContent` equals `updated` while disk differs: `saveFileByPath` sees no dirty tab and writes nothing. Needs an outside edit not yet reloaded that the transform exactly undoes. Not handled.
- The tab branch now runs `notifyAfterSave` (file history snapshot, content invalidation). Auto Move skips `.view` (`auto-move.service.ts:97`).
- `CollectionView.svelte:163-175` formula-row wipe on a non-self change: not touched.
