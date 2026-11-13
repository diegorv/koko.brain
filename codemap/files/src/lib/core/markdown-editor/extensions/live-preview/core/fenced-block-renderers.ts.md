# file card src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts other L43 module src/lib/core/markdown-editor in7 t11
## imported-by
imp src/lib/app/editor-host.ts:18 -> src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts type:FencedBlockRenderer
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:35 -> src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts type:FencedBlockRenderer
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts fencedBlockRenderers
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts fencedBlockRenderers
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:28 -> src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts fencedBlockRenderers,type:FencedBlockRenderer
imp src/lib/features/collection/collection-block-widget.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts type:FencedBlockRenderer
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts type:FencedBlockRenderer
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts 6 files in 3 modules: src/lib/app(3) src/lib/core/markdown-editor(2) src/lib/plugins/queryjs(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts mirror
test src/tests/lib/app/EditorView.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/decorator-toggles.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/block-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/special-fence-detection.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/special-fences-in-containers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts
test src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts
test src/tests/lib/features/collection/collection-block-click.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts
test src/tests/lib/features/collection/collection-block-row-rule.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts
test src/tests/lib/core/markdown-editor/test-helpers.ts imports-type src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts:15 interface FencedBlockRenderer L13 | Renders one kind of fenced block (`` ```queryjs ``, `` ```collection ``) as a widget.
by src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts:FencedBlockRenderer <- src/lib/app/editor-host.ts:18 in (module) import
by src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts:FencedBlockRenderer <- src/lib/core/markdown-editor/MarkdownEditor.svelte:35 in (script) import
by src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts:FencedBlockRenderer <- src/lib/core/markdown-editor/setup/editor-extensions.ts:28 in (module) import
by src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts:FencedBlockRenderer <- src/lib/features/collection/collection-block-widget.ts:2 in (module) import
by src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts:FencedBlockRenderer <- src/lib/plugins/queryjs/queryjs-block-widget.ts:3 in (module) import
sym src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts:34 const fencedBlockRenderers = Facet.define(…) L10 | The registered renderers by language.
by src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts:fencedBlockRenderers <- src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:12 in computeCollectionBlocks ref
by src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts:fencedBlockRenderers <- src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:14 in computeQueryjsBlocks ref
by src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts:fencedBlockRenderers <- src/lib/core/markdown-editor/setup/editor-extensions.ts:130 in createExtensions mcall
