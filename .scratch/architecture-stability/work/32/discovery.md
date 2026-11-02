# Issue 32 discovery

No spec.md for this feature. Prior art: Issue 31 (`work/31/`): `editorHost` facet (`core/markdown-editor/editor-host.ts`), installed by `createExtensions` outside every compartment, app side in `app/editor-host.ts`, passed by `EditorView.svelte:84` -> `MarkdownEditor.svelte:26-34,106-120`. This Issue repeats that pattern for block renderers.

## Files that change
- New `core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts`: `FencedBlockRenderer { language; widget(source): WidgetType }`, static `fencedBlockRenderers` Facet combining to `ReadonlyMap<language, renderer>` (first registration wins, like `editorHost`).
- `plugins/queryjs-block-field.ts:5,20`, `plugins/collection-block-field.ts:5,19`: look up the renderer once per compute; none -> `Decoration.none`. Lezer detection, `blockDecorator` settingsKey, gate unchanged.
- `widgets/queryjs-block-widget.ts` -> `plugins/queryjs/queryjs-block-widget.ts` (git mv), adds `queryjsBlockRenderer` and `registerQueryjsBlockPorts()` (content-invalidation `queryjs-cache` + tab-close `queryjs-autorun`).
- `widgets/collection-block-widget.ts` -> `features/collection/collection-block-widget.ts` (git mv), adds `collectionBlockRenderer`.
- `core/editor/editor.service.ts:12,258,335`: `queryjsSessionStore.invalidatePath` becomes `registerTabCloseListener(name, fn)` fired from `closeTab` and `closeTabsForDeletedPath`.
- `setup/editor-extensions.ts`: option `fencedBlockRenderers`, installed next to `editorHost.of` (outside compartments). `MarkdownEditor.svelte` prop `renderers`; `app/editor-host.ts` exports `appFencedBlockRenderers`; `EditorView.svelte:84` passes it.
- `app/boot.ts:4,34` -> `registerQueryjsBlockPorts()`; `app/lifecycle/app-lifecycle.service.ts:80` import path.
- `layer-baseline.json`: drop 12 lines (editor.service -> queryjs-session, 7 collection widget, 4 queryjs widget); BASELINE_SIZE 21 -> 9. `featureCycleEdges` is already empty (size 0), nothing to shrink; moving widgets adds no feature pair. `markdown-editor-imports.test.ts`: drop EXCEPTIONS.
- docs/LIVE-PREVIEW.md cache table paths.

## Tests
- Move widget tests to `src/tests/lib/plugins/queryjs/` and `src/tests/lib/features/collection/`, specifier changes only.
- Field tests: no renderer -> no decoration; fake renderer -> one widget per block. Existing field / special-fence / block-reveal tests install the real renderers.
- `decorator-toggles.test`: mounted view with registry; queryjs / collectionBlock kill-switch removes the widget. `pipeline-dom.test`: records that its sample has no queryjs/collection block, so blocks render raw without a registry.
- `editor-extensions.test`: facet survives both compartment reconfigures. editor.service test: listener gets the path; boot test: closeTab drops the autoRun marker after `registerAppPorts`.

## Defaults / risks
- "eq() content-only" read as: eq compares only the widget's own content snapshot (`jsContent`/`yamlContent` plus the existing index-ready/version snapshots), never a renderer or host reference. Kept as is; dropping the snapshots would break the "Building index..." recovery.
- `code-block-field.ts` SPECIAL_LANGUAGES unchanged: an unregistered block shows raw lines (Issue note).
- Static facet: renderers never change at runtime, no reconfigure path.
