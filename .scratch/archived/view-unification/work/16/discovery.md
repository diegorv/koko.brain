# 16 discovery: a meta-bind button can open a view

No `spec.md` for this feature (only `PRD.md:34`, which restates the Issue).

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:15-36,57,77`: `OpenViewAction { type: 'openView'; path }` in the union, `'openView'` in `VALID_ACTION_TYPES`, an `actionError` case. Missing / non-`.view` path (case-insensitive, as `isViewFile`) -> `openView needs a .view path`; a path whose `..` segments climb above the root -> `openView path leaves the vault`. Pure string check, no vault path needed.
- `src/lib/core/markdown-editor/editor-host.ts:38-61,74-83`: `openView(path): Promise<boolean>` on `EditorHost` (vault-relative path, `false` when the file is not in the vault), `NOOP_HOST.openView` resolves `false`.
- `src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:91-131`: `case 'openView'`: `host.openView(path)`; on `false`, `toast.error('Button cannot open view "<path>": no such file in the vault')` and return `false`, which stops the chain (same shape as `refuseOpen`).
- `src/lib/app/editor-host.ts:87`: `openView` = no vault -> false; `resolveFilePath` (throws on traversal -> false); not a file in `fsStore.fileTree` (the flat list `treeLinkIndex().files`, the same tree the Views menu reads) -> false; else `openRailView(abs, getViewOpensInEditor(typeDefinitionsStore.getEntryByPath(abs)))` -> true. `app/` is the composition root, so importing `features/type-definitions` there adds no layer violation.
- `help/documentation/24-meta-bind.md:139-160`: `#### openView` section after `createNote`.

## Tests (failing first)

- `meta-bind-button.logic.test.ts:276-300` (`buttonConfigError` table): `openView` + path valid, plus an unknown extra field still valid; no path, `x.md`, `../x.view`, `a/../../x.view` -> the reasons above. `parseButtonConfig` keeps `path`.
- `plugins/meta-bind-button-field.test.ts:206-227`: the error widget text for a `../` path and a non-`.view` path.
- `core/markdown-editor/editor-host.test.ts:243-371`: `fakeHost` gets `openView`; an openView click calls `host.openView(path)`; `false` toasts once and stops a later `createNote`; `true` runs the next action.
- New `src/tests/lib/app/meta-bind-open-view.test.ts`, real stores and real `editor.service` (Tauri mocked, as `RailNoteList.view.test.ts`): a `_visible: false, _open_in_editor: true` view opens as the active tab and the layout is unchanged; an ordinary view, with `AppShell` mounted (setup copied from `AppShell.test.ts` + `RailNoteList.view.test.ts`), sets `railItem: types`, the view lens, panels visible, and the note list shows the view's rows; a missing file toasts, opens no tab, writes nothing, leaves the layout, and a following `createNote` does not run.
- `src/tests/lib/app/editor-host.test.ts`: `openView` without a vault and with a traversal path resolves `false`.

## Risks

- AppShell-level test is the heaviest part (virtua, ResizeObserver, property index). Fallback if it proves flaky: mount `RailNoteList` with the lens read from `settingsStore.layout.railTypesLens`.
- Existence is checked against the file tree, not the disk: a file created outside the app before the watcher reports it reads as missing (same as the Views menu).

## Defaults taken

- A leading `/` is stripped and read as vault-relative, as `resolveFilePath` does; not refused.
- The missing-file toast lives in the widget (like `refuseOpen`), so the host stays a boolean.
- No sample added to `help/examples/markdown-editor-vault/19-meta-bind.md` (the example vault has no `.view`; not in the criteria).
