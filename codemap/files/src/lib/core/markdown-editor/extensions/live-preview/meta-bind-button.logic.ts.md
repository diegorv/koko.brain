# file card src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts logic L200 module src/lib/core/markdown-editor in2 t1
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts buttonConfigError,parseButtonConfig
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts type:ButtonAction,type:ButtonConfig,getButtonActions
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts mirror
test src/tests/lib/app/meta-bind-open-view.test.ts imports-type src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts
test src/tests/lib/core/markdown-editor/editor-host.test.ts imports-type src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-writers.test.ts imports-type src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:4 type ButtonStyle L1 | Visual styles for the button
sym src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:7 interface UpdateMetadataAction L7 | Action: update a frontmatter property
sym src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:16 interface OpenAction L7 | Action: open a note or URL
sym src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:25 interface CreateNoteAction L9 | Action: create a new note
sym src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:36 interface OpenViewAction L5 | Action: open a `.view` the way a click on its row in the menu does
sym src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:43 type ButtonAction L1 | Discriminated union of all supported button actions
by src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:ButtonAction <- src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:8 in (module) import
sym src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:46 interface ButtonConfig L16 | Complete configuration for a meta-bind button
by src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:ButtonConfig <- src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:9 in (module) import
sym src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:137 fn validateButtonConfig(raw: unknown): raw is ButtonConfig L3 | Validates whether a raw parsed object has the required fields of a ButtonConfig.
sym src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:146 fn buttonConfigError(yaml: string): string | null L9 | Why `parseButtonConfig(yaml)` returns null, as a short reason for the error widget (`label missing`, `updateMetadata needs prop and value`), or null when the b…
by src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:buttonConfigError <- src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:23 in computeMetaBindButtons call
sym src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:160 fn parseButtonConfig(yaml: string): ButtonConfig | null L31 | Parses a YAML string into a ButtonConfig.
by src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:parseButtonConfig <- src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:20 in computeMetaBindButtons call
sym src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:196 fn getButtonActions(config: ButtonConfig): ButtonAction[] L5 | Returns the array of actions for a button config.
by src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:getButtonActions <- src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:36 in MetaBindButtonWidget.toDOM call +2
## locals
local src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:67 fn leavesVault(path: string): boolean L9
local src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:78 fn openViewPathError(path: unknown): string | null L4
local src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:84 fn actionError(action: unknown): string | null L24
local src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:114 fn configError(raw: unknown): string | null L18
## calls
call src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:80 in openViewPathError -> src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:leavesVault call
call src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:103 in actionError -> src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:openViewPathError call
call src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:123 in configError -> src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:actionError call +1
call src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:138 in validateButtonConfig -> src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:configError call
call src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:153 in buttonConfigError -> src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:configError call
call src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:168 in parseButtonConfig -> src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:validateButtonConfig call
