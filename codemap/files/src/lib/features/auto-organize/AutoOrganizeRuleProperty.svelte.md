# file card src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte ' codemap/files
file src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte component L396 module src/lib/features/auto-organize in1 t0
## imports
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:4 -> src/lib/components/ui/input/index.ts Input
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:5 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:6 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:7 -> src/lib/components/ui/select/index.ts *
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:8 -> src/lib/features/file-icons/IconPicker.svelte default
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:9 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:10 -> src/lib/features/file-icons/file-icons.icon-data.ts getIconSync
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:11 -> src/lib/features/file-icons/file-icons.logic.ts parseIconValuePermissive
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:12 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:13 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:14 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:15 -> src/lib/core/filesystem/fs.logic.ts isMarkdownFile
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:16 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:17 -> src/lib/features/collection/collection.logic.ts buildNoteRecord
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:18 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:19 -> src/lib/utils/frontmatter-aliases.ts canonicalizeKey
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:20 -> src/lib/features/auto-organize/auto-organize.types.ts type:RuleProperty
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:21 -> src/lib/features/auto-organize/auto-organize.logic.ts computeRuleValue,exprProblem,isBooleanOnlyKey,isRefusedKey,parseRuleItems,ruleRecordStats,ruleValueEditor
## imported-by
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:50 -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte default
## reach
in2 src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte 1 files in 1 modules: src/lib/features/auto-organize(1)
out2 src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte 34 files in 9 modules: src/lib/components(16) src/lib/features/collection(6) src/lib/utils(3) src/lib/core/editor(2) src/lib/core/filesystem(2) +4 modules
## symbols
sym src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:1 component AutoOrganizeRuleProperty props:property,listId,allowRemove=,onchange,onremove L396
by src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:default <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:601 in (markup) mount +1
## locals
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:96 fn fitted(key: string, value: RuleProperty['value'], mode: RuleProperty['mode'], from: RuleProperty['mode'], expr?: string): Rul… L26
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:124 fn save(next: RuleProperty) L12
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:137 fn commitKey(raw: string) L12
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:150 fn setMode(mode: RuleProperty['mode']) L4
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:156 fn setSource(source: keyof typeof SOURCE_LABELS) L7
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:164 fn commitExpr(text: string) L9
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:192 fn setValue(value: RuleProperty['value']) L4
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:202 fn setItems(text: string) L5
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:209 fn setColor(color?: string, textColor?: string) L3
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:213 fn handlePickerSelect(pack: IconPackId, name: string, color?: string, textColor?: string) L4
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:223 fn resolvedIcon() L4
## mounts
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:235 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:280 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:290 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:297 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:299 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:306 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:314 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:321 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:330 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:360 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:385 IconPicker -> src/lib/features/file-icons/IconPicker.svelte
## mounted-at
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:601 AutoOrganizeRuleProperty -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:645 AutoOrganizeRuleProperty -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte
## calls
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:63 in editor=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:ruleValueEditor call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:65 in showTypeChooser=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:isBooleanOnlyKey call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:69 in modeChoices=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:isBooleanOnlyKey call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:77 in keyRefused=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:isRefusedKey call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:104 in fitted -> src/lib/features/auto-organize/auto-organize.logic.ts:isBooleanOnlyKey call +1
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:107 in fitted -> src/lib/features/auto-organize/auto-organize.logic.ts:parseRuleItems call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:118 in fitted -> src/lib/features/auto-organize/auto-organize.logic.ts:ruleValueEditor call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:125 in save -> src/lib/features/auto-organize/auto-organize.logic.ts:exprProblem call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:140 in commitKey -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:fitted call +1
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:141 in commitKey -> src/lib/features/auto-organize/auto-organize.logic.ts:exprProblem call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:147 in commitKey -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:save call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:152 in setMode -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:fitted call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:152 in setMode -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:save call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:160 in setSource -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:fitted call +1
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:171 in commitExpr -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:save call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:177 in previewNote=$derived -> src/lib/core/filesystem/fs.logic.ts:isMarkdownFile call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:182 in preview=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:exprProblem call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:184 in preview=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:ruleRecordStats call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:184 in preview=$derived -> src/lib/features/collection/collection.logic.ts:buildNoteRecord call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:185 in preview=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:computeRuleValue call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:203 in setItems -> src/lib/features/auto-organize/auto-organize.logic.ts:parseRuleItems call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:205 in setItems -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:setValue call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:210 in setColor -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:setValue call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:210 in setColor -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:214 in handlePickerSelect -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:setValue call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:215 in handlePickerSelect -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:setColor call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:219 in iconRef=$derived -> src/lib/features/file-icons/file-icons.logic.ts:parseIconValuePermissive call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:225 in resolvedIcon -> src/lib/features/file-icons/file-icons.icon-data.ts:getIconSync call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:243 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:commitKey markup
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:250 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:setSource markup
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:266 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:setValue markup +3
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:287 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:commitExpr markup
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:296 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:resolvedIcon markup
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:325 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:setItems markup
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:342 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:setMode markup
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:389 in (markup) -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey markup +1
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:391 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:handlePickerSelect markup
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:392 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:setColor markup
