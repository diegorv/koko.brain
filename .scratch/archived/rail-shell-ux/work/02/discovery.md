# Issue 02 discovery: `.view` writes route through the note-change owner

No `spec.md` exists for rail-shell-ux; the Issue is the spec.

## Files that change

- `src/lib/features/type-definitions/type-definitions.service.ts:284-309` (`updateViewIcon`,
  `updateViewQuery`): a private `writeViewFile(path, content)` does `writeTextFile`, then
  `markRecentSave(path)` and `applyNoteChange({ kind: 'upsert', source: 'save', path, content })`
  with no `vaultPath`. `updateViewQuery` keeps its `refreshViewDefinition` after it. Issue 19
  reuses this helper.
- `src/lib/features/collection/collection.service.ts:164-170`: the consumer's `upsert` returns
  early for `isViewFile(path)`; `remove` unchanged.
- `src/lib/features/file-icons/file-icons.logic.ts`: `extractViewIcon(content)` parses the whole
  body with `yaml`, reuses `extractIconFromParsedFrontmatter` / `extractIconColorsFromParsedFrontmatter`;
  parse error or non-object gives `null`.
- `src/lib/features/file-icons/file-icons.service.ts:211` (`updateFrontmatterIconForFile`): a
  `.view` path reads its ref from `extractViewIcon`; `.md` path unchanged.
- `docs/adr/0009-incremental-indexing-reverse-index.md:72`: dated amendment after the bullet.

## Tests

- `type-definitions.service.test.ts`: new describe with real collection + file-icons consumers
  registered (copy the `note-change indexing (issue 29)` setup; mock `file-icons.icon-data.js`
  as `file-icons.service.test.ts` does). Asserts `update_note_in_index` invoked with path and
  written content, no `update_search_index_file` / `update_semantic_file`,
  `areAllRecentSaves([path])` (unique path per test, the 15 s TTL map is module-level), icon
  store after `updateViewIcon` / `removeViewIcon`. The pinned test keeps its body; only its
  comment, which would now be wrong, is rewritten.
- New `update-view-query-cache.test.ts` (no parse-cache / yaml-parser mock): in-memory disk
  behind `readTextFile` / `writeTextFile`; after `updateViewQuery`, `getCachedViewDefinition`
  returns the patched filter with no further read.
- `collection.service.test.ts`: consumer + `applyNoteChange` keeps a `.view` record, replaces `.md`.
- `file-icons.logic.test.ts`: `extractViewIcon` cases incl. unparseable body.
- `file-icons.service.test.ts`: `updateFrontmatterIconForFile` on a `.view` body.

## Risks

- `updateViewIcon` writes even when nothing changed (unchanged); now also an IPC per click. OK.
- The collection skip also covers `createView`'s `fs` upsert (no empty record); the Rust delta
  fills the record at the next `vault-index-updated` refresh.

## Defaults taken

- `extractViewIcon` reads only `_icon` / `_color` / `_title_color` (the keys `updateViewIconYaml`
  writes and `buildFrontmatterIconIndex` reads after Rust alias resolution).
