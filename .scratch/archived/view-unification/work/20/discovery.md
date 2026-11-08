# Issue 20 discovery: inline `collection` blocks follow the row rule

No `spec.md` in the feature folder (PRD.md only). Builds on Issue 19 (`work/19`): `filterCitesArchived` and the `definition` argument of `QueryRowSet` exist.

## Files that change

- `src/lib/features/rail-shell/lens.logic.ts:~710` new pure `blockRowSet(records, view, definition, ctx)` next to `viewRowSet`; `ctx: Pick<LensContext, 'vaultPath' | 'systemFolder'>`. Steps: `excludeSystemFolder(records, ...)`, drop `isViewFile(path)` and `properties.get('_type') === 'Type'`, drop `properties.get('archived') === true` unless `queryCitesArchived(definition, view)`, then `limit`. Reads records only (no entries), keeps input order (no `_sort`, no pins).
- `src/lib/features/collection/view-row-set.port.ts:10` `ViewRowSetPort` gains `blockRows(records, view, definition)`; header doc covers the inline block.
- `src/lib/app/boot.ts:60` port forwards `blockRows` to `blockRowSet` with `vaultStore.path` and `settingsStore.templates.systemFolder`.
- `src/lib/features/collection/collection-block-widget.ts:116` passes a `QueryRowSet` wrapping `getViewRowSetPort()?.blockRows` to `executeQuery`; plain query when no port is registered.
- Docs: `help/documentation/12-collection.md` Inline Collection (`:163`) and the limit paragraph (`:161`); `25-types-and-relationships.md:436` `limit` row ("inline block, taken after sort" becomes stale).

Record fields used: Rust `project_note_record` and TS `projectDerivedProperties` both set `_type` (normalized, so a definition is `'Type'`) and a boolean `archived`.

## Tests (test-first)

- New `src/tests/lib/features/collection/collection-block-row-rule.test.ts`, copied from `collection-block-click.test.ts` (jsdom, real CodeMirror widget, real `collectionStore`), port registered with `registerAppPorts()` (as `CollectionView.restored-view.test.ts`), `vaultStore.open('/vault')`. Cases: archived / `_system/` / `_type: Type` / `.view` rows absent; `archived == true` block lists the archived note; a record with no entry in `typeDefinitionsStore` listed; `limit: 2` counts after the rule; a `sort` order kept.
- `src/tests/lib/features/rail-shell/lens.logic.test.ts`: `blockRowSet` unit cases (same rule, blank system folder, `_archived` citation via view filters).
- `src/tests/help/collection-features.test.ts`: inline blocks run through `executeQuery(..., blockRowSet)`; new check that every inline block matches at least one row, with an explicit list of blocks expected empty.

## Risks and defaults

- Behavior change for existing blocks (archived, `_system/`, type definitions, `.view` rows gone; `limit` after the rule), as the Issue states.
- Default: `.collection` files in the help test keep the plain query (they are not inline blocks).
- Default: the widget wraps the port call in an arrow so a class-based port keeps `this`.
- Help example folder holds no `_type: Type` or archived note (checked), so its blocks list the same rows as before.
- E2E criterion: run `bash scripts/e2e.sh e2e/specs/collection-block.spec.ts e2e/specs/live-preview/click-reveal/collection-block.spec.ts` before the last commit. Risk: an E2E fixture with an archived, `_system/` or type-definition note in a block it counts.
