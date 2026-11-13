# file card src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte ' codemap/files
file src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte component L378 module src/lib/features/auto-organize in1 t0
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
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:46 -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte default
## reach
in2 src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte 1 files in 1 modules: src/lib/features/auto-organize(1)
out2 src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte 34 files in 9 modules: src/lib/components(16) src/lib/features/collection(6) src/lib/utils(3) src/lib/core/editor(2) src/lib/core/filesystem(2) +4 modules
## symbols
sym src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:1 component AutoOrganizeRuleProperty props:property,listId,allowRemove=,onchange,onremove L378
by src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:default <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:428 in (markup) mount +1
## locals
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:84 fn fitted(key: string, value: RuleProperty['value'], mode: RuleProperty['mode'], from: RuleProperty['mode'], expr?: string): Rul… L26
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:112 fn save(next: RuleProperty) L12
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:125 fn commitKey(raw: string) L12
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:138 fn setMode(mode: RuleProperty['mode']) L4
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:144 fn setSource(source: keyof typeof SOURCE_LABELS) L7
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:152 fn commitExpr(text: string) L9
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:180 fn setValue(value: RuleProperty['value']) L4
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:190 fn setItems(text: string) L5
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:197 fn setColor(color?: string, textColor?: string) L3
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:201 fn handlePickerSelect(pack: IconPackId, name: string, color?: string, textColor?: string) L4
local src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:211 fn resolvedIcon() L4
## mounts
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:223 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:266 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:274 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:281 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:283 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:290 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:298 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:305 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:314 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:343 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:367 IconPicker -> src/lib/features/file-icons/IconPicker.svelte
## mounted-at
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:428 AutoOrganizeRuleProperty -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:469 AutoOrganizeRuleProperty -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte
## calls
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:62 in editor=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:ruleValueEditor call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:64 in showTypeChooser=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:isBooleanOnlyKey call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:92 in fitted -> src/lib/features/auto-organize/auto-organize.logic.ts:isBooleanOnlyKey call +1
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:95 in fitted -> src/lib/features/auto-organize/auto-organize.logic.ts:parseRuleItems call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:106 in fitted -> src/lib/features/auto-organize/auto-organize.logic.ts:ruleValueEditor call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:113 in save -> src/lib/features/auto-organize/auto-organize.logic.ts:exprProblem call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:128 in commitKey -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:fitted call +1
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:129 in commitKey -> src/lib/features/auto-organize/auto-organize.logic.ts:exprProblem call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:135 in commitKey -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:save call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:140 in setMode -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:fitted call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:140 in setMode -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:save call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:148 in setSource -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:fitted call +1
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:159 in commitExpr -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:save call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:165 in previewNote=$derived -> src/lib/core/filesystem/fs.logic.ts:isMarkdownFile call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:170 in preview=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:exprProblem call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:172 in preview=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:ruleRecordStats call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:172 in preview=$derived -> src/lib/features/collection/collection.logic.ts:buildNoteRecord call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:173 in preview=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:computeRuleValue call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:191 in setItems -> src/lib/features/auto-organize/auto-organize.logic.ts:parseRuleItems call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:193 in setItems -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:setValue call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:198 in setColor -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:setValue call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:198 in setColor -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:202 in handlePickerSelect -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:setValue call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:203 in handlePickerSelect -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:setColor call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:207 in iconRef=$derived -> src/lib/features/file-icons/file-icons.logic.ts:parseIconValuePermissive call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:213 in resolvedIcon -> src/lib/features/file-icons/file-icons.icon-data.ts:getIconSync call
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:229 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:commitKey markup
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:236 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:setSource markup
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:252 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:setValue markup +3
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:271 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:commitExpr markup
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:280 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:resolvedIcon markup
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:309 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:setItems markup
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:326 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:setMode markup
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:337 in (markup) -> src/lib/features/auto-organize/auto-organize.logic.ts:isBooleanOnlyKey markup
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:360 in (markup) -> src/lib/features/auto-organize/auto-organize.logic.ts:isRefusedKey markup
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:371 in (markup) -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey markup +1
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:373 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:handlePickerSelect markup
call src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:374 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:setColor markup
