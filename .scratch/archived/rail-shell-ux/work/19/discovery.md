# Issue 19 discovery

No `spec.md` in `.scratch/rail-shell-ux/`. Extends Issues 17 and 18 (`work/17`, `work/18`); only the differences are listed.

## Files that change

- `src/lib/features/collection/yaml-parser.ts` (after `updateCollectionYaml`, `:238`): `updateViewEditYaml(yaml, edit: ViewEdit)` -> `{ ok, yaml } | { ok: false, error }`. Errors on a YAML parse failure, a non-object top level, or no object `views[0]`. Sets `_sidebar_label` and `views[0].name` to `edit.label`; `filters` / `viewFilters` follow `updateCollectionYaml`'s rule: key present in `edit` sets it, or deletes it when `undefined`; key absent leaves the file's value. `stringify(..., { lineWidth: 0 })` as `buildNewViewYaml`.
- `src/lib/features/type-definitions/type-definitions.service.ts:306`: `editView(path, edit)`: `readTextFile`, updater, throw `Error(error)` on `ok: false` (nothing written), `vaultStore.requestPromptIndexRefresh()`, `writeViewFile`, `refreshViewDefinition(path)`.
- `src/lib/features/rail-shell/lens.logic.ts` (after `viewNavigatorRows`, `:528`): `otherViewLabels(rows, path)`: the labels of the view rows whose `lens.target` is not `path`.
- `src/lib/features/type-definitions/ViewDialog.svelte`: optional `edit?: { path; label } | null`; `oncreated` becomes optional. With `edit`: title "Edit view", button "Save"; an `$effect` on `open && edit` (service call in `untrack`) prefills `name = edit.label` and loads `refreshViewDefinition(edit.path)`: `views[0].filters` -> `groups`, top-level `filters` -> `globalGroups`, `showGlobal = globalGroups.length > 0` (fixed until close). A read error or a failed parse -> `loadError` in `role="alert"`, Save disabled. A load sequence number drops a load that resolves after close. `blankValue` also covers `globalGroups`. Save calls `editView(path, { label, viewFilters, ...(showGlobal ? { filters } : {}) })`; failure -> `fileOperationErrorMessage('save', '<file>.view', err)` inline, dialog kept open (same close guard).
- `src/lib/features/rail-shell/TypesNavigator.svelte:276-282,388-392`: "Edit view" (Pencil) after "Open view"; a second `<ViewDialog edit={editTarget} existingLabels={otherViewLabels(viewRows, editTarget.path)}>`; label from the menu row.
- `help/documentation/25-types-and-relationships.md:167-172`: Edit view bullet.
- `e2e/specs/rail-shell.spec.ts` after `:590`.

## Tests

- `src/tests/lib/features/collection/yaml-parser.test.ts`: new `describe('updateViewEditYaml')`: keeps `_icon`, `_color`, `_sort`, `_order`, `_open_in_editor`, view sort/order/limit, other views; clears a key on `undefined`; leaves `filters` without the key; errors on bad YAML and no `views[0]`; nested-object round-trip through real `parseFilterToGroups` -> `filterGroupsToFilter` -> updater; the saved label through `getViewLabel(entryV2(..., { frontmatter: parsed }))`.
- New `src/tests/lib/features/type-definitions/edit-view.service.test.ts` (copy of `update-view-query-cache.test.ts`: real cache, real updater, plugin-fs + `invoke` mocked): one write, cache serves new filters with no read, `update_note_in_index` with the path, `areAllRecentSaves`, `takePromptIndexRefresh()`; rejects and writes nothing for bad YAML / no `views[0]`.
- `src/tests/lib/features/rail-shell/lens.logic.test.ts`: `otherViewLabels` + `validateViewName` (own name, case change allowed; another view's label refused).
- `ViewDialog.svelte.test.ts`: edit mode with plugin-fs mocked and the real cache (fresh read beats the cached parse, prefill, All views shown or not, parse error alert + Save disabled, Save args, failure alert, close guard while saving).
- `TypesNavigator.test.ts`: menu labels gain "Edit view"; Edit view prefills the row label, Save calls `editView` with the same path, an open tab and the saved Types pick still resolve.

## Risks / defaults

- `requestPromptIndexRefresh()` goes before the write, not after: the Rust update emits `vault-index-updated` during `update_note_in_index`, and the event can reach the listener before the IPC resolves (same reason as `createView`). A failed write leaves the request set, as in `createView`.
- Save always writes, even with nothing changed.
- `showGlobal` is decided by non-empty top-level groups (a `filters: {}` / `null` counts as none and is left untouched).
