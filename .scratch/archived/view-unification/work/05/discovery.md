# 05 discovery

No `spec.md`; `PRD.md` § Writes, as for Issue 04 (`work/04`). Same pattern as 04 (one key, a per-key base, conflict refused); what differs is listed here.

## Files that change

- `src/lib/features/collection/key-edit.logic.ts` (new): `EditorKey` = the `CollectionYamlUpdates` keys minus `viewIndex`; `sortedJson` (moved from `type-note-list.logic.ts:146`, which imports it back); `editorKeyBases(definition, viewIndex)` (a view key's base pairs the view's `name` with its value, so a write never lands on another view moved to that index); `applyEditorKeyEdit(yaml, key, value, base, viewIndex)` -> ok / conflict / invalid, writing only `{ [key]: value, viewIndex }`; `editorKeyBaseAfter` (the base once a value is written, read back through the updater and parser so every key round-trips); `isViewAt(yaml, index, name)`; `CollectionEditConflict`.
- `src/lib/features/collection/CollectionView.svelte:246-337,339-380`: `persistState` and `persistCalendarConfig` go; each handler calls `persistKey(key, value)`. One `writeYaml(transform, onApply?)` for every write: a `.view` with the new `rewriteView` prop goes through `rewriteViewFile` (dirty buffer, else the file; tab saved at once); otherwise the transform runs on `yamlContent` and goes to `onYamlChange`. Base map `toolbarBase` set at seed, advanced per call. `selfUpdate` boolean becomes `selfYaml` (the bytes this instance wrote; set inside the transform, so an async write is recognised). After the last pending write: a failure toasts, reloads a clean tab from disk (`reloadExternallyChangedTabs`) and re-seeds; another key differing from `toolbarBase` re-seeds. Add / delete / rename / type change run through `writeYaml`; delete, rename and type change refuse when the view at the index is no longer the one named; add and delete set the active index in `onApply` (before the tab shows the bytes, so the clamp effect sees both together).
- `src/lib/app/EditorView.svelte:88`: pass `rewriteView={rewriteViewFile}` (collection may not import type-definitions: feature cycle).
- `src/lib/features/type-definitions/type-definitions.service.ts:350`: export `rewriteViewFile`.

## Tests

- `src/tests/lib/features/collection/CollectionView.view-writes.test.ts` (new): mounts `EditorView` on a `.view` tab, real editor service and stores, plugin-fs as an in-memory disk (prior art: `rewrite-view-file.service.test.ts` setup, `EditorView.test.ts` mount). Sort on `filters: { and: [x], note: kept }` keeps the filter; a newer sort on disk under a clean tab is refused (toast, disk unchanged, toolbar shows the file's sort); a dirty buffer edit survives a Sort; add, rename, delete each change only their part.
- `CollectionView.test.ts`: a `.collection` Sort keeps `and: [x]` and the unknown key (sync path).
- `src/tests/lib/features/collection/key-edit.logic.test.ts` (new).

## Defaults taken

- `.collection` (retired by Issue 23) keeps the buffer path, now one key per write; no disk read.
- A formula change writes `formulas` only. The old full write also rewrote `order`, but with the order from before the formula-column sync effect ran, so it never carried the new column either.
- A conflict message reuses the rail's: "This view changed. Your edit was not saved."
- Rename's no-op rewrite stays (Issue 24).

## Risks

- `.view` toolbar edits now save at once (per keystroke in a filter value), as the rail does since Issue 04.
- `save-failed` from `rewriteViewFile` is recognised by `name`/`reason`, since collection cannot import `ViewWriteError`.
