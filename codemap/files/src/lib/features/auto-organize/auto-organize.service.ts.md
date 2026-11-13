# file card src/lib/features/auto-organize/auto-organize.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/auto-organize/auto-organize.service.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, effects
file src/lib/features/auto-organize/auto-organize.service.ts service L777 module src/lib/features/auto-organize in2 t4
## imports
imp src/lib/features/auto-organize/auto-organize.service.ts:1 -> pkg:@tauri-apps/plugin-fs readTextFile,writeTextFile,mkdir,exists
imp src/lib/features/auto-organize/auto-organize.service.ts:3 -> src/lib/core/editor/editor.hooks.ts addAfterSaveObserver
imp src/lib/features/auto-organize/auto-organize.service.ts:4 -> src/lib/core/filesystem/fs.logic.ts fileOperationErrorMessage,isViewFile,TargetExistsError
imp src/lib/features/auto-organize/auto-organize.service.ts:5 -> src/lib/core/filesystem/fs.service.ts createFile,moveItem,renameItem
imp src/lib/features/auto-organize/auto-organize.service.ts:6 -> src/lib/core/editor/editor.logic.ts isTabDirty
imp src/lib/features/auto-organize/auto-organize.service.ts:7 -> src/lib/core/note-creator/note-creator.service.ts loadNoteTemplate
imp src/lib/features/auto-organize/auto-organize.service.ts:8 -> src/lib/features/file-icons/file-icons.service.ts setIconForPath
imp src/lib/features/auto-organize/auto-organize.service.ts:9 -> src/lib/features/collection/collection.logic.ts buildNoteRecord
imp src/lib/features/auto-organize/auto-organize.service.ts:10 -> src/lib/core/frontmatter/properties.logic.ts detectLossyFrontmatter,extractBody,parseFrontmatterProperties,rebuildContent
imp src/lib/features/auto-organize/auto-organize.service.ts:11 -> src/lib/core/frontmatter/frontmatter-write.service.ts updateNoteFrontmatter
imp src/lib/features/auto-organize/auto-organize.service.ts:12 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/auto-organize/auto-organize.service.ts:13 -> src/lib/core/rule-actions/rule-actions.store.svelte.ts ruleActionsStore
imp src/lib/features/auto-organize/auto-organize.service.ts:14 -> src/lib/features/auto-organize/auto-organize.store.svelte.ts autoOrganizeStore
imp src/lib/features/auto-organize/auto-organize.service.ts:15 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/auto-organize/auto-organize.service.ts:16 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/auto-organize/auto-organize.service.ts:17 -> src/lib/features/auto-organize/auto-organize.logic.ts applyPropertyWrites,createTargetProblem,findMatchingRules,findMoveRule,isAlreadyNamed,isInExcludedFolder,isAlreadyInDestination,isRefusedKey,normalizeVaultRelativePath,numberedName,ownedProperties,propertiesToWrite,propertyWriteSkipReason,renameProblem,renameTarget,resolveComputedProperties,resolveDestination,ruleRecordStats,sanitizeCreateNote,sanitizeRename,sanitizeRuleProperties,sanitizeRunAction,type:OwnedProperty
imp src/lib/features/auto-organize/auto-organize.service.ts:42 -> src/lib/features/auto-organize/auto-organize.types.ts type:AutoOrganizeConfig,type:AutoOrganizeRule
imp src/lib/features/auto-organize/auto-organize.service.ts:43 -> src/lib/features/auto-organize/type-lifecycle-rules.ts generateLifecycleRules
imp src/lib/features/auto-organize/auto-organize.service.ts:44 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/auto-organize/auto-organize.service.ts:45 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/auto-organize/auto-organize.service.ts:46 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/features/auto-organize/auto-organize.service.ts:47 -> src/lib/utils/debug.ts debug,error
imp src/lib/features/auto-organize/auto-organize.service.ts:48 -> src/lib/utils/path.ts vaultRelativeKey
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:77 -> src/lib/features/auto-organize/auto-organize.service.ts loadAutoOrganizeConfig,toggleAutoOrganizeHook,resetAutoOrganize
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:13 -> src/lib/features/auto-organize/auto-organize.service.ts saveAutoOrganizeConfig,toggleAutoOrganizeHook
## reach
in2 src/lib/features/auto-organize/auto-organize.service.ts 2 files in 2 modules: src/lib/app(1) src/routes(1)
out2 src/lib/features/auto-organize/auto-organize.service.ts 35 files in 12 modules: src/lib/features/collection(6) src/lib/core/filesystem(5) src/lib/features/file-icons(5) src/lib/utils(5) src/lib/core/settings(4) +7 modules
## tests
test src/tests/lib/features/auto-organize/auto-organize.service.test.ts imports src/lib/features/auto-organize/auto-organize.service.ts mirror
test src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts imports src/lib/features/auto-organize/auto-organize.service.ts
test src/tests/lib/features/auto-organize/auto-organize.no-chain.test.ts imports src/lib/features/auto-organize/auto-organize.service.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/features/auto-organize/auto-organize.service.ts
## symbols
sym src/lib/features/auto-organize/auto-organize.service.ts:113 fn loadAutoOrganizeConfig(vaultPath: string): Promise<void> L24 | Loads auto-organize config from .kokobrain/auto-organize-rules.json.
by src/lib/features/auto-organize/auto-organize.service.ts:loadAutoOrganizeConfig <- src/lib/app/lifecycle/app-lifecycle.service.ts:313 in initializeVault call
sym src/lib/features/auto-organize/auto-organize.service.ts:182 fn saveAutoOrganizeConfig(vaultPath: string): Promise<void> L19 | Saves current auto-organize config to disk.
by src/lib/features/auto-organize/auto-organize.service.ts:saveAutoOrganizeConfig <- src/lib/features/auto-organize/AutoOrganizeSection.svelte:35 in saveConfig call
sym src/lib/features/auto-organize/auto-organize.service.ts:206 fn registerAutoOrganizeHook(): () => void L38 | Registers the after-save observer that triggers debounced rule evaluation.
sym src/lib/features/auto-organize/auto-organize.service.ts:250 fn toggleAutoOrganizeHook(enabled: boolean): (() => void) | null L13 | Dynamically enables or disables the auto-organize after-save hook.
by src/lib/features/auto-organize/auto-organize.service.ts:toggleAutoOrganizeHook <- src/lib/app/lifecycle/app-lifecycle.service.ts:454 in initializeVault call
by src/lib/features/auto-organize/auto-organize.service.ts:toggleAutoOrganizeHook <- src/lib/features/auto-organize/AutoOrganizeSection.svelte:118 in (markup) markup
sym src/lib/features/auto-organize/auto-organize.service.ts:755 fn resetAutoOrganize(): void L23 | Resets all auto-organize state (called during vault teardown)
by src/lib/features/auto-organize/auto-organize.service.ts:resetAutoOrganize <- src/lib/app/lifecycle/app-lifecycle.service.ts:678 in teardownVault call
## locals
local src/lib/features/auto-organize/auto-organize.service.ts:105 fn getConfigPath(vaultPath: string): string L3
local src/lib/features/auto-organize/auto-organize.service.ts:146 fn withValidProperties(rule: AutoOrganizeRule): AutoOrganizeRule L32
local src/lib/features/auto-organize/auto-organize.service.ts:268 fn readCurrentContent(filePath: string): Promise<string | null> L13
local src/lib/features/auto-organize/auto-organize.service.ts:292 fn evaluateAndMove(savedPath: string, content: string, vaultPath: string): Promise<void> L90
local src/lib/features/auto-organize/auto-organize.service.ts:391 fn moveToFreeName(filePath: string, destPath: string, destLabel: string, record: PropertyIndexRecord): Promise<string | null> L15
local src/lib/features/auto-organize/auto-organize.service.ts:412 fn reportMoveFailure(filePath: string, basename: string, destLabel: string, err: unknown): void L5
local src/lib/features/auto-organize/auto-organize.service.ts:425 fn runRuleAction(rule: AutoOrganizeRule, targetPath: string, content: string, vaultPath: string): void L23
local src/lib/features/auto-organize/auto-organize.service.ts:464 fn applyRename(rule: AutoOrganizeRule, filePath: string, content: string, record: PropertyIndexRecord, stats: [number, number, number… L59
local src/lib/features/auto-organize/auto-organize.service.ts:531 fn createRuleNotes(creators: AutoOrganizeRule[], sourcePath: string, content: string, source: PropertyIndexRecord, vaultPath: string): Pr… L39
local src/lib/features/auto-organize/auto-organize.service.ts:575 fn createRuleNote(rule: AutoOrganizeRule, createNote: NonNullable<AutoOrganizeRule['createNote']>, targetPath: string, source: PropertyI… L42
local src/lib/features/auto-organize/auto-organize.service.ts:623 fn withRuleProperties(rule: AutoOrganizeRule, createNote: NonNullable<AutoOrganizeRule['createNote']>, initial: string, targetPath: string, … L23
local src/lib/features/auto-organize/auto-organize.service.ts:648 fn openInBackground(path: string, content: string): void L7
local src/lib/features/auto-organize/auto-organize.service.ts:657 fn reportCreateProblem(problem: string, rule: AutoOrganizeRule, message: string, err?: unknown): void L7
local src/lib/features/auto-organize/auto-organize.service.ts:669 fn applyLegacyIcon(rule: AutoOrganizeRule, content: string, vaultPath: string, targetPath: string): Promise<boolean> L17
local src/lib/features/auto-organize/auto-organize.service.ts:693 fn writeRuleProperties(targetPath: string, content: string | null, vaultPath: string, owned: OwnedProperty[], record: PropertyIndexRecord): P… L34
local src/lib/features/auto-organize/auto-organize.service.ts:729 fn reportWriteFailure(targetPath: string, involved: OwnedProperty[], err: unknown): void L10
local src/lib/features/auto-organize/auto-organize.service.ts:741 fn reportAddSkip(targetPath: string, skipped: OwnedProperty): void L5
local src/lib/features/auto-organize/auto-organize.service.ts:748 fn reportComputeFailure(targetPath: string, failed: OwnedProperty, reason: string): void L5
## calls
call src/lib/features/auto-organize/auto-organize.service.ts:114 in loadAutoOrganizeConfig -> src/lib/features/auto-organize/auto-organize.service.ts:getConfigPath call
call src/lib/features/auto-organize/auto-organize.service.ts:118 in loadAutoOrganizeConfig -> src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore.setConfig mcall +3
call src/lib/features/auto-organize/auto-organize.service.ts:128 in loadAutoOrganizeConfig -> src/lib/features/auto-organize/auto-organize.service.ts:withValidProperties ref
call src/lib/features/auto-organize/auto-organize.service.ts:131 in loadAutoOrganizeConfig -> src/lib/utils/debug.ts:debug call
call src/lib/features/auto-organize/auto-organize.service.ts:133 in loadAutoOrganizeConfig -> src/lib/utils/debug.ts:error call
call src/lib/features/auto-organize/auto-organize.service.ts:151 in withValidProperties -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRuleProperties call +1
call src/lib/features/auto-organize/auto-organize.service.ts:152 in withValidProperties -> src/lib/utils/debug.ts:error call +1
call src/lib/features/auto-organize/auto-organize.service.ts:156 in withValidProperties -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeCreateNote call
call src/lib/features/auto-organize/auto-organize.service.ts:169 in withValidProperties -> src/lib/features/auto-organize/auto-organize.logic.ts:renameProblem call
call src/lib/features/auto-organize/auto-organize.service.ts:170 in withValidProperties -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRename call
call src/lib/features/auto-organize/auto-organize.service.ts:184 in saveAutoOrganizeConfig -> src/lib/features/auto-organize/auto-organize.service.ts:getConfigPath call
call src/lib/features/auto-organize/auto-organize.service.ts:195 in saveAutoOrganizeConfig -> src/lib/utils/debug.ts:debug call
call src/lib/features/auto-organize/auto-organize.service.ts:197 in saveAutoOrganizeConfig -> src/lib/utils/debug.ts:error call
call src/lib/features/auto-organize/auto-organize.service.ts:207 in registerAutoOrganizeHook -> src/lib/utils/debug.ts:debug call +1
call src/lib/features/auto-organize/auto-organize.service.ts:208 in registerAutoOrganizeHook -> src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver call
call src/lib/features/auto-organize/auto-organize.service.ts:210 in registerAutoOrganizeHook -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/features/auto-organize/auto-organize.service.ts:220 in registerAutoOrganizeHook -> src/lib/features/auto-organize/auto-organize.logic.ts:isInExcludedFolder call
call src/lib/features/auto-organize/auto-organize.service.ts:233 in registerAutoOrganizeHook -> src/lib/features/auto-organize/auto-organize.service.ts:readCurrentContent call
call src/lib/features/auto-organize/auto-organize.service.ts:235 in registerAutoOrganizeHook -> src/lib/features/auto-organize/auto-organize.service.ts:evaluateAndMove call
call src/lib/features/auto-organize/auto-organize.service.ts:237 in registerAutoOrganizeHook -> src/lib/utils/debug.ts:error call
call src/lib/features/auto-organize/auto-organize.service.ts:252 in toggleAutoOrganizeHook -> src/lib/utils/debug.ts:debug call +1
call src/lib/features/auto-organize/auto-organize.service.ts:253 in toggleAutoOrganizeHook -> src/lib/features/auto-organize/auto-organize.service.ts:registerAutoOrganizeHook call
call src/lib/features/auto-organize/auto-organize.service.ts:275 in readCurrentContent -> src/lib/utils/debug.ts:debug call
call src/lib/features/auto-organize/auto-organize.service.ts:293 in evaluateAndMove -> src/lib/features/auto-organize/auto-organize.logic.ts:ruleRecordStats call
call src/lib/features/auto-organize/auto-organize.service.ts:294 in evaluateAndMove -> src/lib/features/collection/collection.logic.ts:buildNoteRecord call +2
call src/lib/features/auto-organize/auto-organize.service.ts:296 in evaluateAndMove -> src/lib/features/auto-organize/type-lifecycle-rules.ts:generateLifecycleRules call
call src/lib/features/auto-organize/auto-organize.service.ts:299 in evaluateAndMove -> src/lib/features/auto-organize/auto-organize.logic.ts:findMatchingRules call
call src/lib/features/auto-organize/auto-organize.service.ts:300 in evaluateAndMove -> src/lib/utils/debug.ts:error call +1
call src/lib/features/auto-organize/auto-organize.service.ts:303 in evaluateAndMove -> src/lib/utils/debug.ts:debug call +3
call src/lib/features/auto-organize/auto-organize.service.ts:307 in evaluateAndMove -> src/lib/features/auto-organize/auto-organize.logic.ts:findMoveRule call
call src/lib/features/auto-organize/auto-organize.service.ts:311 in evaluateAndMove -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRename call
call src/lib/features/auto-organize/auto-organize.service.ts:313 in evaluateAndMove -> src/lib/features/auto-organize/auto-organize.service.ts:applyRename call
call src/lib/features/auto-organize/auto-organize.service.ts:324 in evaluateAndMove -> src/lib/features/auto-organize/auto-organize.logic.ts:resolveDestination call
call src/lib/features/auto-organize/auto-organize.service.ts:325 in evaluateAndMove -> src/lib/features/auto-organize/auto-organize.logic.ts:isAlreadyInDestination call
call src/lib/features/auto-organize/auto-organize.service.ts:339 in evaluateAndMove -> src/lib/features/auto-organize/auto-organize.service.ts:reportMoveFailure call +1
call src/lib/features/auto-organize/auto-organize.service.ts:346 in evaluateAndMove -> src/lib/features/auto-organize/auto-organize.service.ts:moveToFreeName call
call src/lib/features/auto-organize/auto-organize.service.ts:357 in evaluateAndMove -> src/lib/features/auto-organize/auto-organize.logic.ts:ownedProperties call
call src/lib/features/auto-organize/auto-organize.service.ts:358 in evaluateAndMove -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeCreateNote call
call src/lib/features/auto-organize/auto-organize.service.ts:364 in evaluateAndMove -> src/lib/features/auto-organize/auto-organize.service.ts:applyLegacyIcon call
call src/lib/features/auto-organize/auto-organize.service.ts:366 in evaluateAndMove -> src/lib/features/auto-organize/auto-organize.service.ts:writeRuleProperties call
call src/lib/features/auto-organize/auto-organize.service.ts:371 in evaluateAndMove -> src/lib/features/auto-organize/auto-organize.service.ts:createRuleNotes call
call src/lib/features/auto-organize/auto-organize.service.ts:379 in evaluateAndMove -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRunAction call
call src/lib/features/auto-organize/auto-organize.service.ts:380 in evaluateAndMove -> src/lib/features/auto-organize/auto-organize.service.ts:runRuleAction call
call src/lib/features/auto-organize/auto-organize.service.ts:393 in moveToFreeName -> src/lib/core/filesystem/fs.service.ts:moveItem call +1
call src/lib/features/auto-organize/auto-organize.service.ts:399 in moveToFreeName -> src/lib/features/auto-organize/auto-organize.logic.ts:numberedName call
call src/lib/features/auto-organize/auto-organize.service.ts:415 in reportMoveFailure -> src/lib/core/filesystem/fs.logic.ts:fileOperationErrorMessage call
call src/lib/features/auto-organize/auto-organize.service.ts:426 in runRuleAction -> src/lib/features/auto-organize/auto-organize.logic.ts:propertyWriteSkipReason call
call src/lib/features/auto-organize/auto-organize.service.ts:431 in runRuleAction -> src/lib/utils/debug.ts:debug call +2
call src/lib/features/auto-organize/auto-organize.service.ts:434 in runRuleAction -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRunAction call
call src/lib/features/auto-organize/auto-organize.service.ts:435 in runRuleAction -> src/lib/core/rule-actions/rule-actions.store.svelte.ts:ruleActionsStore.get mcall
call src/lib/features/auto-organize/auto-organize.service.ts:439 in runRuleAction -> src/lib/utils/debug.ts:error call
call src/lib/features/auto-organize/auto-organize.service.ts:443 in runRuleAction -> src/lib/utils/path.ts:vaultRelativeKey call
call src/lib/features/auto-organize/auto-organize.service.ts:475 in applyRename -> src/lib/features/auto-organize/auto-organize.logic.ts:propertyWriteSkipReason call
call src/lib/features/auto-organize/auto-organize.service.ts:476 in applyRename -> src/lib/features/auto-organize/auto-organize.logic.ts:isRefusedKey ref
call src/lib/features/auto-organize/auto-organize.service.ts:478 in applyRename -> src/lib/utils/debug.ts:debug call +2
call src/lib/features/auto-organize/auto-organize.service.ts:482 in applyRename -> src/lib/core/editor/editor.logic.ts:isTabDirty call
call src/lib/features/auto-organize/auto-organize.service.ts:486 in applyRename -> src/lib/features/auto-organize/auto-organize.logic.ts:renameTarget call
call src/lib/features/auto-organize/auto-organize.service.ts:486 in applyRename -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRename call
call src/lib/features/auto-organize/auto-organize.service.ts:491 in applyRename -> src/lib/utils/debug.ts:error call
call src/lib/features/auto-organize/auto-organize.service.ts:501 in applyRename -> src/lib/features/auto-organize/auto-organize.logic.ts:resolveDestination call
call src/lib/features/auto-organize/auto-organize.service.ts:501 in applyRename -> src/lib/features/collection/collection.logic.ts:buildNoteRecord call
call src/lib/features/auto-organize/auto-organize.service.ts:502 in applyRename -> src/lib/features/auto-organize/auto-organize.logic.ts:isAlreadyInDestination call
call src/lib/features/auto-organize/auto-organize.service.ts:506 in applyRename -> src/lib/features/auto-organize/auto-organize.logic.ts:isAlreadyNamed call
call src/lib/features/auto-organize/auto-organize.service.ts:511 in applyRename -> src/lib/features/auto-organize/auto-organize.logic.ts:numberedName call
call src/lib/features/auto-organize/auto-organize.service.ts:517 in applyRename -> src/lib/core/filesystem/fs.service.ts:renameItem call
call src/lib/features/auto-organize/auto-organize.service.ts:539 in createRuleNotes -> src/lib/features/auto-organize/auto-organize.logic.ts:propertyWriteSkipReason call
call src/lib/features/auto-organize/auto-organize.service.ts:541 in createRuleNotes -> src/lib/utils/debug.ts:debug call +1
call src/lib/features/auto-organize/auto-organize.service.ts:547 in createRuleNotes -> src/lib/features/auto-organize/auto-organize.service.ts:reportCreateProblem call +1
call src/lib/features/auto-organize/auto-organize.service.ts:550 in createRuleNotes -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeCreateNote call
call src/lib/features/auto-organize/auto-organize.service.ts:551 in createRuleNotes -> src/lib/features/auto-organize/auto-organize.logic.ts:resolveDestination call
call src/lib/features/auto-organize/auto-organize.service.ts:552 in createRuleNotes -> src/lib/features/auto-organize/auto-organize.logic.ts:createTargetProblem call
call src/lib/features/auto-organize/auto-organize.service.ts:558 in createRuleNotes -> src/lib/features/auto-organize/auto-organize.logic.ts:normalizeVaultRelativePath call
call src/lib/features/auto-organize/auto-organize.service.ts:562 in createRuleNotes -> src/lib/features/auto-organize/auto-organize.service.ts:createRuleNote call
call src/lib/features/auto-organize/auto-organize.service.ts:583 in createRuleNote -> src/lib/utils/debug.ts:debug call +1
call src/lib/features/auto-organize/auto-organize.service.ts:595 in createRuleNote -> src/lib/features/auto-organize/auto-organize.service.ts:reportCreateProblem call +1
call src/lib/features/auto-organize/auto-organize.service.ts:598 in createRuleNote -> src/lib/core/note-creator/note-creator.service.ts:loadNoteTemplate call
call src/lib/features/auto-organize/auto-organize.service.ts:601 in createRuleNote -> src/lib/features/auto-organize/auto-organize.service.ts:withRuleProperties call
call src/lib/features/auto-organize/auto-organize.service.ts:605 in createRuleNote -> src/lib/features/auto-organize/auto-organize.logic.ts:ruleRecordStats call
call src/lib/features/auto-organize/auto-organize.service.ts:606 in createRuleNote -> src/lib/features/auto-organize/auto-organize.logic.ts:findMatchingRules call
call src/lib/features/auto-organize/auto-organize.service.ts:606 in createRuleNote -> src/lib/features/collection/collection.logic.ts:buildNoteRecord call
call src/lib/features/auto-organize/auto-organize.service.ts:612 in createRuleNote -> src/lib/core/filesystem/fs.service.ts:createFile call
call src/lib/features/auto-organize/auto-organize.service.ts:614 in createRuleNote -> src/lib/features/auto-organize/auto-organize.service.ts:openInBackground call
call src/lib/features/auto-organize/auto-organize.service.ts:631 in withRuleProperties -> src/lib/features/auto-organize/auto-organize.logic.ts:ownedProperties call
call src/lib/features/auto-organize/auto-organize.service.ts:633 in withRuleProperties -> src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties call
call src/lib/features/auto-organize/auto-organize.service.ts:634 in withRuleProperties -> src/lib/features/auto-organize/auto-organize.logic.ts:resolveComputedProperties call
call src/lib/features/auto-organize/auto-organize.service.ts:635 in withRuleProperties -> src/lib/features/auto-organize/auto-organize.service.ts:reportComputeFailure call
call src/lib/features/auto-organize/auto-organize.service.ts:637 in withRuleProperties -> src/lib/features/auto-organize/auto-organize.logic.ts:propertiesToWrite call
call src/lib/features/auto-organize/auto-organize.service.ts:639 in withRuleProperties -> src/lib/core/frontmatter/properties.logic.ts:detectLossyFrontmatter call
call src/lib/features/auto-organize/auto-organize.service.ts:641 in withRuleProperties -> src/lib/features/auto-organize/auto-organize.service.ts:reportCreateProblem call
call src/lib/features/auto-organize/auto-organize.service.ts:644 in withRuleProperties -> src/lib/core/frontmatter/properties.logic.ts:extractBody call
call src/lib/features/auto-organize/auto-organize.service.ts:644 in withRuleProperties -> src/lib/core/frontmatter/properties.logic.ts:rebuildContent call
call src/lib/features/auto-organize/auto-organize.service.ts:644 in withRuleProperties -> src/lib/features/auto-organize/auto-organize.logic.ts:applyPropertyWrites call
call src/lib/features/auto-organize/auto-organize.service.ts:651 in openInBackground -> src/lib/core/editor/editor.store.svelte.ts:editorStore.addTab mcall
call src/lib/features/auto-organize/auto-organize.service.ts:653 in openInBackground -> src/lib/core/editor/editor.store.svelte.ts:editorStore.setActiveIndex mcall
call src/lib/features/auto-organize/auto-organize.service.ts:661 in reportCreateProblem -> src/lib/utils/debug.ts:error call +1
call src/lib/features/auto-organize/auto-organize.service.ts:673 in applyLegacyIcon -> src/lib/core/frontmatter/properties.logic.ts:detectLossyFrontmatter call
call src/lib/features/auto-organize/auto-organize.service.ts:675 in applyLegacyIcon -> src/lib/utils/debug.ts:debug call +1
call src/lib/features/auto-organize/auto-organize.service.ts:679 in applyLegacyIcon -> src/lib/features/file-icons/file-icons.service.ts:setIconForPath call
call src/lib/features/auto-organize/auto-organize.service.ts:682 in applyLegacyIcon -> src/lib/utils/debug.ts:error call
call src/lib/features/auto-organize/auto-organize.service.ts:702 in writeRuleProperties -> src/lib/features/auto-organize/auto-organize.service.ts:readCurrentContent call
call src/lib/features/auto-organize/auto-organize.service.ts:704 in writeRuleProperties -> src/lib/features/auto-organize/auto-organize.logic.ts:propertyWriteSkipReason call
call src/lib/features/auto-organize/auto-organize.service.ts:709 in writeRuleProperties -> src/lib/utils/debug.ts:debug call +1
call src/lib/features/auto-organize/auto-organize.service.ts:712 in writeRuleProperties -> src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties call
call src/lib/features/auto-organize/auto-organize.service.ts:714 in writeRuleProperties -> src/lib/features/auto-organize/auto-organize.logic.ts:resolveComputedProperties call
call src/lib/features/auto-organize/auto-organize.service.ts:715 in writeRuleProperties -> src/lib/features/auto-organize/auto-organize.service.ts:reportComputeFailure call
call src/lib/features/auto-organize/auto-organize.service.ts:718 in writeRuleProperties -> src/lib/features/auto-organize/auto-organize.logic.ts:propertiesToWrite call +1
call src/lib/features/auto-organize/auto-organize.service.ts:718 in writeRuleProperties -> src/lib/features/auto-organize/auto-organize.service.ts:reportAddSkip call
call src/lib/features/auto-organize/auto-organize.service.ts:721 in writeRuleProperties -> src/lib/core/frontmatter/frontmatter-write.service.ts:updateNoteFrontmatter call
call src/lib/features/auto-organize/auto-organize.service.ts:721 in writeRuleProperties -> src/lib/features/auto-organize/auto-organize.logic.ts:applyPropertyWrites call
call src/lib/features/auto-organize/auto-organize.service.ts:724 in writeRuleProperties -> src/lib/features/auto-organize/auto-organize.service.ts:reportWriteFailure call
call src/lib/features/auto-organize/auto-organize.service.ts:732 in reportWriteFailure -> src/lib/utils/debug.ts:debug call
call src/lib/features/auto-organize/auto-organize.service.ts:737 in reportWriteFailure -> src/lib/utils/debug.ts:error call
call src/lib/features/auto-organize/auto-organize.service.ts:744 in reportAddSkip -> src/lib/utils/debug.ts:error call
call src/lib/features/auto-organize/auto-organize.service.ts:751 in reportComputeFailure -> src/lib/utils/debug.ts:error call
call src/lib/features/auto-organize/auto-organize.service.ts:775 in resetAutoOrganize -> src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore.reset mcall
call src/lib/features/auto-organize/auto-organize.service.ts:776 in resetAutoOrganize -> src/lib/utils/debug.ts:debug call
## effects
fx src/lib/features/auto-organize/auto-organize.service.ts:116 tauri-fs.exists in loadAutoOrganizeConfig
fx src/lib/features/auto-organize/auto-organize.service.ts:121 tauri-fs.readTextFile in loadAutoOrganizeConfig
fx src/lib/features/auto-organize/auto-organize.service.ts:186 tauri-fs.exists in saveAutoOrganizeConfig
fx src/lib/features/auto-organize/auto-organize.service.ts:188 tauri-fs.mkdir in saveAutoOrganizeConfig
fx src/lib/features/auto-organize/auto-organize.service.ts:194 tauri-fs.writeTextFile in saveAutoOrganizeConfig
reg src/lib/features/auto-organize/auto-organize.service.ts:208 src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver in registerAutoOrganizeHook args=(filePath) => { if (writingPaths.has(filePath)) return; if (isViewFile(filePath…
fx src/lib/features/auto-organize/auto-organize.service.ts:229 timer.setTimeout delay=settingsStore.autoOrganize.de… in registerAutoOrganizeHook
fx src/lib/features/auto-organize/auto-organize.service.ts:272 tauri-fs.readTextFile in readCurrentContent
fx src/lib/features/auto-organize/auto-organize.service.ts:274 tauri-fs.exists in readCurrentContent
fx src/lib/features/auto-organize/auto-organize.service.ts:332 tauri-fs.exists in evaluateAndMove
fx src/lib/features/auto-organize/auto-organize.service.ts:334 tauri-fs.mkdir in evaluateAndMove
fx src/lib/features/auto-organize/auto-organize.service.ts:400 tauri-fs.exists in moveToFreeName
fx src/lib/features/auto-organize/auto-organize.service.ts:508 tauri-fs.exists in applyRename
fx src/lib/features/auto-organize/auto-organize.service.ts:513 tauri-fs.exists in applyRename
fx src/lib/features/auto-organize/auto-organize.service.ts:514 tauri-fs.exists in applyRename
fx src/lib/features/auto-organize/auto-organize.service.ts:582 tauri-fs.exists in createRuleNote
fx src/lib/features/auto-organize/auto-organize.service.ts:594 tauri-fs.exists in createRuleNote
fx src/lib/features/auto-organize/auto-organize.service.ts:611 tauri-fs.exists in createRuleNote
fx src/lib/features/auto-organize/auto-organize.service.ts:611 tauri-fs.mkdir in createRuleNote
