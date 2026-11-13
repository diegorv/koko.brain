# file card src/lib/features/auto-organize/auto-organize.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/auto-organize/auto-organize.logic.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls
file src/lib/features/auto-organize/auto-organize.logic.ts logic L971 module src/lib/features/auto-organize in4 t5
## imports
imp src/lib/features/auto-organize/auto-organize.logic.ts:1 -> src/lib/features/auto-organize/auto-organize.types.ts type:AutoOrganizeRule,type:RuleCreateNote,type:RuleProperty,type:RuleRename,type:RuleRunAction,type:RuleValue
imp src/lib/features/auto-organize/auto-organize.logic.ts:2 -> src/lib/core/frontmatter/properties.types.ts type:Property,type:PropertyType
imp src/lib/features/auto-organize/auto-organize.logic.ts:3 -> src/lib/core/filesystem/fs.logic.ts isMarkdownFile,isViewFile
imp src/lib/features/auto-organize/auto-organize.logic.ts:4 -> src/lib/core/frontmatter/properties.logic.ts detectLossyFrontmatter,extractRawFrontmatter,isEmptyPropertyValue,normalizeTypeCasing,parseFrontmatterProperties
imp src/lib/features/auto-organize/auto-organize.logic.ts:11 -> src/lib/features/collection/collection.logic.ts evaluateFilter
imp src/lib/features/auto-organize/auto-organize.logic.ts:12 -> src/lib/features/collection/collection.types.ts type:FilterItem,type:PropertyIndexRecord
imp src/lib/features/auto-organize/auto-organize.logic.ts:13 -> src/lib/features/collection/expression/evaluator.ts evaluateExpression,validateExpression,type:EvalContext
imp src/lib/features/auto-organize/auto-organize.logic.ts:18 -> src/lib/features/collection/expression/expression.types.ts type:ASTNode
imp src/lib/features/auto-organize/auto-organize.logic.ts:19 -> src/lib/features/collection/expression/parser.ts parse
imp src/lib/features/auto-organize/auto-organize.logic.ts:20 -> src/lib/features/collection/toolbar/filter.logic.ts isFilterObject,isUnaryOperator,parseExpressionToRow
imp src/lib/features/auto-organize/auto-organize.logic.ts:21 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterRow
imp src/lib/features/auto-organize/auto-organize.logic.ts:22 -> src/lib/utils/frontmatter-aliases.ts canonicalizeKey
## imported-by
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:21 -> src/lib/features/auto-organize/auto-organize.logic.ts computeRuleValue,exprProblem,isBooleanOnlyKey,isRefusedKey,parseRuleItems,ruleRecordStats,ruleValueEditor
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:31 -> src/lib/features/auto-organize/auto-organize.logic.ts BLANK_VALUE_ERROR,countMatchingNotes,countNotesToCreate,hasBlankValue,isRefusedKey,isValidCreatePath,isValidTemplatePath,renameProblem,sanitizeCreateNote,sanitizeRename,sanitizeRuleProperties,sanitizeRunAction
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:14 -> src/lib/features/auto-organize/auto-organize.logic.ts generateRuleId
imp src/lib/features/auto-organize/auto-organize.service.ts:16 -> src/lib/features/auto-organize/auto-organize.logic.ts applyPropertyWrites,createTargetProblem,findMatchingRules,findMoveRule,isAlreadyNamed,isInExcludedFolder,isAlreadyInDestination,isRefusedKey,normalizeVaultRelativePath,numberedName,ownedProperties,propertiesToWrite,propertyWriteSkipReason,renameProblem,renameTarget,resolveComputedProperties,resolveDestination,ruleRecordStats,sanitizeCreateNote,sanitizeRename,sanitizeRuleProperties,sanitizeRunAction,type:OwnedProperty
## reach
in2 src/lib/features/auto-organize/auto-organize.logic.ts 2 files in 1 modules: src/lib/app(2)
out2 src/lib/features/auto-organize/auto-organize.logic.ts 12 files in 4 modules: src/lib/features/collection(5) src/lib/utils(4) src/lib/core/filesystem(2) src/lib/features/file-icons(1)
## tests
test src/tests/lib/features/auto-organize/auto-organize.logic.test.ts imports src/lib/features/auto-organize/auto-organize.logic.ts mirror
test src/tests/help/auto-organize-doc-examples.test.ts imports src/lib/features/auto-organize/auto-organize.logic.ts
test src/tests/help/auto-organize-switch-back.test.ts imports src/lib/features/auto-organize/auto-organize.logic.ts
test src/tests/help/examples-scoping.test.ts imports src/lib/features/auto-organize/auto-organize.logic.ts
test src/tests/lib/features/auto-organize/type-lifecycle-rules.test.ts imports src/lib/features/auto-organize/auto-organize.logic.ts
## symbols
sym src/lib/features/auto-organize/auto-organize.logic.ts:25 const BLANK_VALUE_ERROR L1 | The message for a filter row that compares against a blank value, as the view dialog words it.
by src/lib/features/auto-organize/auto-organize.logic.ts:BLANK_VALUE_ERROR <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:353 in (markup) markup
sym src/lib/features/auto-organize/auto-organize.logic.ts:36 fn filterProblem(filter: FilterItem): string | null L18 | Why an object filter must match nothing, or null when it can run: a value that is not a filter object (`and` / `or` / `not` not lists, a null item), an object …
sym src/lib/features/auto-organize/auto-organize.logic.ts:60 fn hasBlankValue(row: FilterRow): boolean L3 | True for a builder row shown as property, operator and value whose operator needs a value and has none: saved, it would compare against `''`, which most notes …
by src/lib/features/auto-organize/auto-organize.logic.ts:hasBlankValue <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:84 in blankValue=$derived ref
sym src/lib/features/auto-organize/auto-organize.logic.ts:97 fn findMatchingRule(rules: AutoOrganizeRule[], record: PropertyIndexRecord, vaultPath: string, onError?: (rule: AutoOrganizeRule, err: unk… L18 | Evaluates all rules against a PropertyIndexRecord and returns the first matching rule.
sym src/lib/features/auto-organize/auto-organize.logic.ts:123 fn findMatchingRules(rules: AutoOrganizeRule[], record: PropertyIndexRecord, vaultPath: string, onError?: (rule: AutoOrganizeRule, err: unk… L17 | Every enabled rule whose filter is true, in list order.
by src/lib/features/auto-organize/auto-organize.logic.ts:findMatchingRules <- src/lib/features/auto-organize/auto-organize.service.ts:293 in evaluateAndMove call +1
sym src/lib/features/auto-organize/auto-organize.logic.ts:147 fn countMatchingNotes(expression: FilterItem, index: Map<string, PropertyIndexRecord>, vaultPath: string): number | null L19 | How many notes in `index` a rule with this filter matches now, with the matcher a save uses. 0 for a blank expression, null when a string does not parse or an …
by src/lib/features/auto-organize/auto-organize.logic.ts:countMatchingNotes <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:97 in matchCount=$derived call
sym src/lib/features/auto-organize/auto-organize.logic.ts:171 fn findMoveRule(matched: AutoOrganizeRule[]): AutoOrganizeRule | null L3 | The rule that moves the note: the first one with a non-blank destination.
by src/lib/features/auto-organize/auto-organize.logic.ts:findMoveRule <- src/lib/features/auto-organize/auto-organize.service.ts:301 in evaluateAndMove call
sym src/lib/features/auto-organize/auto-organize.logic.ts:182 fn isRefusedKey(key: string): boolean L3 | True when `key` (or its alias) is one a rule never sets.
by src/lib/features/auto-organize/auto-organize.logic.ts:isRefusedKey <- src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:360 in (markup) markup
by src/lib/features/auto-organize/auto-organize.logic.ts:isRefusedKey <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:137 in keySuggestions=$derived call
by src/lib/features/auto-organize/auto-organize.logic.ts:isRefusedKey <- src/lib/features/auto-organize/auto-organize.service.ts:432 in applyRename ref
sym src/lib/features/auto-organize/auto-organize.logic.ts:194 fn isBooleanOnlyKey(key: string): boolean L3 | True when `key` (or its alias) accepts only a boolean value.
by src/lib/features/auto-organize/auto-organize.logic.ts:isBooleanOnlyKey <- src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:64 in showTypeChooser=$derived call +3
sym src/lib/features/auto-organize/auto-organize.logic.ts:202 type RuleValueEditor L1 | The Settings editor for a rule property's value.
sym src/lib/features/auto-organize/auto-organize.logic.ts:211 fn ruleValueEditor(key: string, value: RuleValue | undefined, mode: RuleProperty['mode']): RuleValueEditor L10 | Which editor Settings shows for a property value: none for `remove`, the items field for `add`, else a yes/no switch for a boolean-only key or a boolean, the i…
by src/lib/features/auto-organize/auto-organize.logic.ts:ruleValueEditor <- src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:62 in editor=$derived call +1
sym src/lib/features/auto-organize/auto-organize.logic.ts:223 fn parseRuleItems(text: string): string[] L6 | The items of a comma-separated Settings field: trimmed, blank ones left out.
by src/lib/features/auto-organize/auto-organize.logic.ts:parseRuleItems <- src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:95 in fitted call +1
sym src/lib/features/auto-organize/auto-organize.logic.ts:289 fn sanitizeRuleProperties(raw: unknown, onRefused?: (key: string, reason: string) => void): RuleProperty[] L32 | The valid entries of a rule's `properties` as loaded from JSON: a non-array is none, and an entry with a blank key, an unknown mode, a value of another type, t…
by src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRuleProperties <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:118 in doesNothing=$derived call
by src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRuleProperties <- src/lib/features/auto-organize/auto-organize.service.ts:147 in withValidProperties call +1
sym src/lib/features/auto-organize/auto-organize.logic.ts:323 fn isValidCreatePath(path: string): boolean L4 | True when `path` (trimmed) is a Markdown note path that does not start with `/`.
by src/lib/features/auto-organize/auto-organize.logic.ts:isValidCreatePath <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:189 in pathInvalid=$derived call +1
sym src/lib/features/auto-organize/auto-organize.logic.ts:329 fn isValidTemplatePath(template: string): boolean L4 | True when `template` (trimmed) stays inside the vault: no `..` segment and no leading `/`.
by src/lib/features/auto-organize/auto-organize.logic.ts:isValidTemplatePath <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:192 in templateInvalid=$derived call +1
sym src/lib/features/auto-organize/auto-organize.logic.ts:341 fn sanitizeCreateNote(raw: unknown): RuleCreateNote | undefined L13 | A rule's `createNote` as loaded from JSON, or undefined when it has no string `path` that `isValidCreatePath` accepts, or a template that `isValidTemplatePath`…
by src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeCreateNote <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:100 in validCreate=$derived call
by src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeCreateNote <- src/lib/features/auto-organize/auto-organize.service.ts:152 in withValidProperties call +2
sym src/lib/features/auto-organize/auto-organize.logic.ts:360 fn normalizeVaultRelativePath(target: string): string | null L5 | Vault-relative `target` without its empty and `.` segments, or null when any segment is `..`.
by src/lib/features/auto-organize/auto-organize.logic.ts:normalizeVaultRelativePath <- src/lib/features/auto-organize/auto-organize.service.ts:514 in createRuleNotes call
sym src/lib/features/auto-organize/auto-organize.logic.ts:373 fn createTargetProblem(target: string, vaultPath: string, protectedFolders: string[], excludedFolders: string[]): string | null L17 | Why a rule must not create a note at vault-relative `target`, or null when it may: a `..` segment (a frontmatter variable can bring one in), no file name (a va…
by src/lib/features/auto-organize/auto-organize.logic.ts:createTargetProblem <- src/lib/features/auto-organize/auto-organize.service.ts:508 in createRuleNotes call
sym src/lib/features/auto-organize/auto-organize.logic.ts:392 interface CreateGates L6 | The folders a created note must stay out of.
sym src/lib/features/auto-organize/auto-organize.logic.ts:408 fn countNotesToCreate(expression: FilterItem, createNote: RuleCreateNote, index: Map<string, PropertyIndexRecord>, vaultPath: string, gates:… L27 | How many notes a rule with this filter and `createNote` would create now: the distinct resolved targets of the matching notes in `index` that pass the gates an…
by src/lib/features/auto-organize/auto-organize.logic.ts:countNotesToCreate <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:104 in createCount=$derived call
sym src/lib/features/auto-organize/auto-organize.logic.ts:452 fn volatileInputs(expr: string): string[] L3 | The inputs `expr` reads that change on every save, in reading order: `now()`, `file.mtime`, `file.ctime` and `file.size`.
sym src/lib/features/auto-organize/auto-organize.logic.ts:519 fn exprProblem(expr: string, mode: RuleProperty['mode']): string | null L4 | Why Settings must not save `expr` with `mode`, or null: blank, refused by the evaluator's validator (a parse error or an unknown function), or reading an input…
by src/lib/features/auto-organize/auto-organize.logic.ts:exprProblem <- src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:113 in save call +2
sym src/lib/features/auto-organize/auto-organize.logic.ts:525 type ComputedValue L1 | The value an `expr` property writes, or why it writes nothing.
sym src/lib/features/auto-organize/auto-organize.logic.ts:543 fn computeRuleValue(property: RuleProperty, ctx: EvalContext): ComputedValue L28 | Evaluates `property.expr` against the note in `ctx` and converts the result to the value written.
by src/lib/features/auto-organize/auto-organize.logic.ts:computeRuleValue <- src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:173 in preview=$derived call
sym src/lib/features/auto-organize/auto-organize.logic.ts:585 fn renameProblem(raw: unknown): string | null L13 | Why a rule's `rename` cannot be used, or null: not an object, both or neither of `name` and `expr`, a blank or non-text one, an `expr` the evaluator's validato…
by src/lib/features/auto-organize/auto-organize.logic.ts:renameProblem <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:232 in renameError=$derived call +1
by src/lib/features/auto-organize/auto-organize.logic.ts:renameProblem <- src/lib/features/auto-organize/auto-organize.service.ts:165 in withValidProperties call
sym src/lib/features/auto-organize/auto-organize.logic.ts:600 fn sanitizeRename(raw: unknown): RuleRename | undefined L5 | A rule's `rename` as loaded from JSON, trimmed, or undefined when `renameProblem` refuses it.
by src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRename <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:120 in doesNothing=$derived call
by src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRename <- src/lib/features/auto-organize/auto-organize.service.ts:166 in withValidProperties call +2
sym src/lib/features/auto-organize/auto-organize.logic.ts:611 fn sanitizeRunAction(raw: unknown): RuleRunAction | undefined L6 | A rule's `runAction` as loaded from JSON, its id trimmed and its `input` kept as typed when it is non-empty text, or undefined without a non-blank text `id`.
by src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRunAction <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:114 in actionId=$derived call +1
by src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRunAction <- src/lib/features/auto-organize/auto-organize.service.ts:370 in evaluateAndMove call +1
sym src/lib/features/auto-organize/auto-organize.logic.ts:623 fn toFileName(text: string): string L7 | `text` as a file name: each character a file name cannot hold (`/ \ : * ? " < > |` and control characters) becomes `-`, then spaces are trimmed and leading dot…
sym src/lib/features/auto-organize/auto-organize.logic.ts:647 fn renameTarget(rename: RuleRename, record: PropertyIndexRecord, vaultPath: string): { name: string } | { failure: string } | null L31 | The name, without extension, `rename` gives the note in `record`, or why it gives none, or null when it resolves to an empty name (nothing to do).
by src/lib/features/auto-organize/auto-organize.logic.ts:renameTarget <- src/lib/features/auto-organize/auto-organize.service.ts:442 in applyRename call
sym src/lib/features/auto-organize/auto-organize.logic.ts:684 fn isAlreadyNamed(basename: string, name: string): boolean L4 | True when a note named `basename` already carries `name`: the name itself or `<name> N` for any number N, compared case-insensitively.
by src/lib/features/auto-organize/auto-organize.logic.ts:isAlreadyNamed <- src/lib/features/auto-organize/auto-organize.service.ts:462 in applyRename call
sym src/lib/features/auto-organize/auto-organize.logic.ts:690 fn numberedName(name: string, n: number): string L3 | The `n`th name a rename tries: `name`, then `name 2`, `name 3` and so on.
by src/lib/features/auto-organize/auto-organize.logic.ts:numberedName <- src/lib/features/auto-organize/auto-organize.service.ts:467 in applyRename call
sym src/lib/features/auto-organize/auto-organize.logic.ts:701 fn resolveComputedProperties(current: Property[], owned: OwnedProperty[], ctx: EvalContext, onFail?: (property: OwnedProperty, reason: string) => v… L21 | `owned` with each `expr` replaced by its result as `value`, so the two passes of a frontmatter write see one value.
by src/lib/features/auto-organize/auto-organize.logic.ts:resolveComputedProperties <- src/lib/features/auto-organize/auto-organize.service.ts:590 in withRuleProperties call +1
sym src/lib/features/auto-organize/auto-organize.logic.ts:729 fn ruleRecordStats(indexed: PropertyIndexRecord | undefined, content: string, now: number): [mtime: number, ctime: number, size: number] L8 | The `mtime`, `ctime` and `size` a rule's note record gets: the index record's, as of its last refresh, when both its times are above 0 (a note created this ses…
by src/lib/features/auto-organize/auto-organize.logic.ts:ruleRecordStats <- src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:172 in preview=$derived call
by src/lib/features/auto-organize/auto-organize.logic.ts:ruleRecordStats <- src/lib/features/auto-organize/auto-organize.service.ts:287 in evaluateAndMove call +1
sym src/lib/features/auto-organize/auto-organize.logic.ts:739 interface OwnedProperty L6 | A property consequence of one run, owned by the rule that named its key first.
by src/lib/features/auto-organize/auto-organize.logic.ts:OwnedProperty <- src/lib/features/auto-organize/auto-organize.service.ts:39 in (module) import
sym src/lib/features/auto-organize/auto-organize.logic.ts:753 fn ownedProperties(matched: AutoOrganizeRule[]): OwnedProperty[] L10 | The property consequences of the matching rules, one per canonical key, in rule order then list order.
by src/lib/features/auto-organize/auto-organize.logic.ts:ownedProperties <- src/lib/features/auto-organize/auto-organize.service.ts:348 in evaluateAndMove call +1
sym src/lib/features/auto-organize/auto-organize.logic.ts:782 fn propertiesToWrite(current: Property[], owned: OwnedProperty[], onSkip?: (property: OwnedProperty) => void): OwnedProperty[] L22 | The owned properties that would change `current` (parsed frontmatter): `if-missing` when the key is absent or empty (`false` and `0` are present), `always` whe…
by src/lib/features/auto-organize/auto-organize.logic.ts:propertiesToWrite <- src/lib/features/auto-organize/auto-organize.service.ts:593 in withRuleProperties call +2
sym src/lib/features/auto-organize/auto-organize.logic.ts:818 fn applyPropertyWrites(current: Property[], writes: OwnedProperty[]): Property[] L24 | `current` with each write applied: a `remove` deletes the key, an `add` writes the merged list, any other write sets its value.
by src/lib/features/auto-organize/auto-organize.logic.ts:applyPropertyWrites <- src/lib/features/auto-organize/auto-organize.service.ts:600 in withRuleProperties call +1
sym src/lib/features/auto-organize/auto-organize.logic.ts:851 fn propertyWriteSkipReason(filePath: string, content: string, vaultPath: string, protectedFolders: string[]): string | null L19 | Why a rule must not write properties to this note, or null when it may: not Markdown, inside one of `protectedFolders` (vault-relative, matched case-insensitiv…
by src/lib/features/auto-organize/auto-organize.logic.ts:propertyWriteSkipReason <- src/lib/features/auto-organize/auto-organize.service.ts:382 in runRuleAction call +3
sym src/lib/features/auto-organize/auto-organize.logic.ts:875 fn isInExcludedFolder(filePath: string, vaultPath: string, excludedFolders: string[]): boolean L23 | Checks if a file path is inside any excluded folder.
by src/lib/features/auto-organize/auto-organize.logic.ts:isInExcludedFolder <- src/lib/features/auto-organize/auto-organize.service.ts:216 in registerAutoOrganizeHook call
sym src/lib/features/auto-organize/auto-organize.logic.ts:903 fn isAlreadyInDestination(filePath: string, vaultPath: string, destination: string): boolean L13 | Checks if a file is already in the rule's destination folder.
by src/lib/features/auto-organize/auto-organize.logic.ts:isAlreadyInDestination <- src/lib/features/auto-organize/auto-organize.service.ts:319 in evaluateAndMove call +1
sym src/lib/features/auto-organize/auto-organize.logic.ts:921 fn validateExpression(expression: string): string | null L9 | Validates a rule's expression by attempting to parse it.
sym src/lib/features/auto-organize/auto-organize.logic.ts:936 fn resolveDestination(template: string, record: PropertyIndexRecord, vaultPath: string): string L29 | Resolves template variables in a destination string.
by src/lib/features/auto-organize/auto-organize.logic.ts:resolveDestination <- src/lib/features/auto-organize/auto-organize.service.ts:318 in evaluateAndMove call +2
sym src/lib/features/auto-organize/auto-organize.logic.ts:969 fn generateRuleId(): string L3 | Generates a unique rule ID based on timestamp + random suffix.
by src/lib/features/auto-organize/auto-organize.logic.ts:generateRuleId <- src/lib/features/auto-organize/AutoOrganizeSection.svelte:51 in addRule call
## locals
local src/lib/features/auto-organize/auto-organize.logic.ts:74 fn ruleMatches(expression: FilterItem, ctx: EvalContext): boolean L8
local src/lib/features/auto-organize/auto-organize.logic.ts:231 fn isTextOrTextList(value: unknown): value is string | string[] L3
local src/lib/features/auto-organize/auto-organize.logic.ts:236 fn isRulePropertyValue(value: unknown): value is RuleValue L3
local src/lib/features/auto-organize/auto-organize.logic.ts:244 fn addItems(key: string, value: RuleValue | undefined): string[] L4
local src/lib/features/auto-organize/auto-organize.logic.ts:250 fn withoutTagHash(key: string, item: string): string L3
local src/lib/features/auto-organize/auto-organize.logic.ts:261 fn listAfterAdd(key: string, existing: Property['value'] | undefined, items: string[]): string[] | null | 'not-a-list' L15
local src/lib/features/auto-organize/auto-organize.logic.ts:436 fn isInGatedFolder(path: string, vaultPath: string, gates: CreateGates): boolean L8
local src/lib/features/auto-organize/auto-organize.logic.ts:457 fn inputsRead(expr: string, fileFields: Set<string>): string[] L11
local src/lib/features/auto-organize/auto-organize.logic.ts:469 fn collectInputs(node: ASTNode, fileFields: Set<string>, found: Set<string>): void L33
local src/lib/features/auto-organize/auto-organize.logic.ts:508 fn volatileProblem(expr: string, mode: RuleProperty['mode']): string | null L5
local src/lib/features/auto-organize/auto-organize.logic.ts:528 fn localDateText(date: Date, withTime: boolean): string L5
local src/lib/features/auto-organize/auto-organize.logic.ts:632 fn localDateName(date: Date, withTime: boolean): string L5
local src/lib/features/auto-organize/auto-organize.logic.ts:765 fn sameValue(a: Property['value'] | undefined, b: RuleValue | undefined): boolean L7
local src/lib/features/auto-organize/auto-organize.logic.ts:806 fn propertyType(value: RuleValue): PropertyType L6
## calls
call src/lib/features/auto-organize/auto-organize.logic.ts:39 in filterProblem -> src/lib/features/collection/expression/evaluator.ts:validateExpression call
call src/lib/features/auto-organize/auto-organize.logic.ts:41 in filterProblem -> src/lib/features/auto-organize/auto-organize.logic.ts:hasBlankValue call
call src/lib/features/auto-organize/auto-organize.logic.ts:41 in filterProblem -> src/lib/features/collection/toolbar/filter.logic.ts:parseExpressionToRow call
call src/lib/features/auto-organize/auto-organize.logic.ts:45 in filterProblem -> src/lib/features/collection/toolbar/filter.logic.ts:isFilterObject call
call src/lib/features/auto-organize/auto-organize.logic.ts:49 in filterProblem -> src/lib/features/auto-organize/auto-organize.logic.ts:filterProblem call
call src/lib/features/auto-organize/auto-organize.logic.ts:61 in hasBlankValue -> src/lib/features/collection/toolbar/filter.logic.ts:isUnaryOperator call
call src/lib/features/auto-organize/auto-organize.logic.ts:75 in ruleMatches -> src/lib/features/collection/expression/evaluator.ts:evaluateExpression call
call src/lib/features/auto-organize/auto-organize.logic.ts:76 in ruleMatches -> src/lib/features/auto-organize/auto-organize.logic.ts:filterProblem call
call src/lib/features/auto-organize/auto-organize.logic.ts:78 in ruleMatches -> src/lib/features/collection/collection.logic.ts:evaluateFilter call
call src/lib/features/auto-organize/auto-organize.logic.ts:106 in findMatchingRule -> src/lib/features/auto-organize/auto-organize.logic.ts:ruleMatches call
call src/lib/features/auto-organize/auto-organize.logic.ts:133 in findMatchingRules -> src/lib/features/auto-organize/auto-organize.logic.ts:ruleMatches call
call src/lib/features/auto-organize/auto-organize.logic.ts:154 in countMatchingNotes -> src/lib/features/auto-organize/auto-organize.logic.ts:validateExpression call
call src/lib/features/auto-organize/auto-organize.logic.ts:155 in countMatchingNotes -> src/lib/features/auto-organize/auto-organize.logic.ts:filterProblem call
call src/lib/features/auto-organize/auto-organize.logic.ts:161 in countMatchingNotes -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/features/auto-organize/auto-organize.logic.ts:162 in countMatchingNotes -> src/lib/features/auto-organize/auto-organize.logic.ts:findMatchingRules call
call src/lib/features/auto-organize/auto-organize.logic.ts:183 in isRefusedKey -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call
call src/lib/features/auto-organize/auto-organize.logic.ts:195 in isBooleanOnlyKey -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call
call src/lib/features/auto-organize/auto-organize.logic.ts:214 in ruleValueEditor -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call
call src/lib/features/auto-organize/auto-organize.logic.ts:237 in isRulePropertyValue -> src/lib/features/auto-organize/auto-organize.logic.ts:isTextOrTextList call
call src/lib/features/auto-organize/auto-organize.logic.ts:246 in addItems -> src/lib/features/auto-organize/auto-organize.logic.ts:withoutTagHash call
call src/lib/features/auto-organize/auto-organize.logic.ts:263 in listAfterAdd -> src/lib/core/frontmatter/properties.logic.ts:isEmptyPropertyValue call
call src/lib/features/auto-organize/auto-organize.logic.ts:267 in listAfterAdd -> src/lib/features/auto-organize/auto-organize.logic.ts:withoutTagHash call
call src/lib/features/auto-organize/auto-organize.logic.ts:298 in sanitizeRuleProperties -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call
call src/lib/features/auto-organize/auto-organize.logic.ts:305 in sanitizeRuleProperties -> src/lib/features/auto-organize/auto-organize.logic.ts:volatileProblem call
call src/lib/features/auto-organize/auto-organize.logic.ts:314 in sanitizeRuleProperties -> src/lib/features/auto-organize/auto-organize.logic.ts:addItems call
call src/lib/features/auto-organize/auto-organize.logic.ts:314 in sanitizeRuleProperties -> src/lib/features/auto-organize/auto-organize.logic.ts:isTextOrTextList call
call src/lib/features/auto-organize/auto-organize.logic.ts:315 in sanitizeRuleProperties -> src/lib/features/auto-organize/auto-organize.logic.ts:isRulePropertyValue call
call src/lib/features/auto-organize/auto-organize.logic.ts:325 in isValidCreatePath -> src/lib/core/filesystem/fs.logic.ts:isMarkdownFile call
call src/lib/features/auto-organize/auto-organize.logic.ts:344 in sanitizeCreateNote -> src/lib/features/auto-organize/auto-organize.logic.ts:isValidCreatePath call
call src/lib/features/auto-organize/auto-organize.logic.ts:347 in sanitizeCreateNote -> src/lib/features/auto-organize/auto-organize.logic.ts:isValidTemplatePath call
call src/lib/features/auto-organize/auto-organize.logic.ts:350 in sanitizeCreateNote -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRuleProperties call
call src/lib/features/auto-organize/auto-organize.logic.ts:379 in createTargetProblem -> src/lib/features/auto-organize/auto-organize.logic.ts:normalizeVaultRelativePath call
call src/lib/features/auto-organize/auto-organize.logic.ts:387 in createTargetProblem -> src/lib/features/auto-organize/auto-organize.logic.ts:isInExcludedFolder call
call src/lib/features/auto-organize/auto-organize.logic.ts:417 in countNotesToCreate -> src/lib/features/auto-organize/auto-organize.logic.ts:validateExpression call
call src/lib/features/auto-organize/auto-organize.logic.ts:418 in countNotesToCreate -> src/lib/features/auto-organize/auto-organize.logic.ts:filterProblem call
call src/lib/features/auto-organize/auto-organize.logic.ts:425 in countNotesToCreate -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/features/auto-organize/auto-organize.logic.ts:426 in countNotesToCreate -> src/lib/features/auto-organize/auto-organize.logic.ts:findMatchingRules call
call src/lib/features/auto-organize/auto-organize.logic.ts:427 in countNotesToCreate -> src/lib/features/auto-organize/auto-organize.logic.ts:isInGatedFolder call
call src/lib/features/auto-organize/auto-organize.logic.ts:428 in countNotesToCreate -> src/lib/features/auto-organize/auto-organize.logic.ts:resolveDestination call
call src/lib/features/auto-organize/auto-organize.logic.ts:429 in countNotesToCreate -> src/lib/features/auto-organize/auto-organize.logic.ts:createTargetProblem call
call src/lib/features/auto-organize/auto-organize.logic.ts:430 in countNotesToCreate -> src/lib/features/auto-organize/auto-organize.logic.ts:normalizeVaultRelativePath call
call src/lib/features/auto-organize/auto-organize.logic.ts:442 in isInGatedFolder -> src/lib/features/auto-organize/auto-organize.logic.ts:isInExcludedFolder call
call src/lib/features/auto-organize/auto-organize.logic.ts:453 in volatileInputs -> src/lib/features/auto-organize/auto-organize.logic.ts:inputsRead call
call src/lib/features/auto-organize/auto-organize.logic.ts:460 in inputsRead -> src/lib/features/collection/expression/parser.ts:parse call
call src/lib/features/auto-organize/auto-organize.logic.ts:465 in inputsRead -> src/lib/features/auto-organize/auto-organize.logic.ts:collectInputs call
call src/lib/features/auto-organize/auto-organize.logic.ts:470 in collectInputs -> src/lib/features/auto-organize/auto-organize.logic.ts:collectInputs call +3
call src/lib/features/auto-organize/auto-organize.logic.ts:510 in volatileProblem -> src/lib/features/auto-organize/auto-organize.logic.ts:volatileInputs call
call src/lib/features/auto-organize/auto-organize.logic.ts:521 in exprProblem -> src/lib/features/auto-organize/auto-organize.logic.ts:volatileProblem call
call src/lib/features/auto-organize/auto-organize.logic.ts:521 in exprProblem -> src/lib/features/collection/expression/evaluator.ts:validateExpression call
call src/lib/features/auto-organize/auto-organize.logic.ts:547 in computeRuleValue -> src/lib/features/collection/expression/evaluator.ts:evaluateExpression call
call src/lib/features/auto-organize/auto-organize.logic.ts:555 in computeRuleValue -> src/lib/features/auto-organize/auto-organize.logic.ts:localDateText call
call src/lib/features/auto-organize/auto-organize.logic.ts:555 in computeRuleValue -> src/lib/features/auto-organize/auto-organize.logic.ts:volatileInputs call
call src/lib/features/auto-organize/auto-organize.logic.ts:559 in computeRuleValue -> src/lib/features/auto-organize/auto-organize.logic.ts:isTextOrTextList call +1
call src/lib/features/auto-organize/auto-organize.logic.ts:564 in computeRuleValue -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call
call src/lib/features/auto-organize/auto-organize.logic.ts:594 in renameProblem -> src/lib/features/collection/expression/evaluator.ts:validateExpression call
call src/lib/features/auto-organize/auto-organize.logic.ts:596 in renameProblem -> src/lib/features/auto-organize/auto-organize.logic.ts:inputsRead call
call src/lib/features/auto-organize/auto-organize.logic.ts:601 in sanitizeRename -> src/lib/features/auto-organize/auto-organize.logic.ts:renameProblem call
call src/lib/features/auto-organize/auto-organize.logic.ts:654 in renameTarget -> src/lib/features/auto-organize/auto-organize.logic.ts:resolveDestination call
call src/lib/features/auto-organize/auto-organize.logic.ts:659 in renameTarget -> src/lib/features/collection/expression/evaluator.ts:evaluateExpression call
call src/lib/features/auto-organize/auto-organize.logic.ts:666 in renameTarget -> src/lib/features/auto-organize/auto-organize.logic.ts:localDateName call
call src/lib/features/auto-organize/auto-organize.logic.ts:666 in renameTarget -> src/lib/features/auto-organize/auto-organize.logic.ts:volatileInputs call
call src/lib/features/auto-organize/auto-organize.logic.ts:675 in renameTarget -> src/lib/features/auto-organize/auto-organize.logic.ts:toFileName call
call src/lib/features/auto-organize/auto-organize.logic.ts:710 in resolveComputedProperties -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call
call src/lib/features/auto-organize/auto-organize.logic.ts:711 in resolveComputedProperties -> src/lib/core/frontmatter/properties.logic.ts:isEmptyPropertyValue call
call src/lib/features/auto-organize/auto-organize.logic.ts:713 in resolveComputedProperties -> src/lib/features/auto-organize/auto-organize.logic.ts:computeRuleValue call
call src/lib/features/auto-organize/auto-organize.logic.ts:756 in ownedProperties -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRuleProperties call
call src/lib/features/auto-organize/auto-organize.logic.ts:757 in ownedProperties -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call
call src/lib/features/auto-organize/auto-organize.logic.ts:788 in propertiesToWrite -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call
call src/lib/features/auto-organize/auto-organize.logic.ts:791 in propertiesToWrite -> src/lib/core/frontmatter/properties.logic.ts:isEmptyPropertyValue call
call src/lib/features/auto-organize/auto-organize.logic.ts:793 in propertiesToWrite -> src/lib/features/auto-organize/auto-organize.logic.ts:sameValue call
call src/lib/features/auto-organize/auto-organize.logic.ts:797 in propertiesToWrite -> src/lib/features/auto-organize/auto-organize.logic.ts:addItems call
call src/lib/features/auto-organize/auto-organize.logic.ts:797 in propertiesToWrite -> src/lib/features/auto-organize/auto-organize.logic.ts:listAfterAdd call
call src/lib/features/auto-organize/auto-organize.logic.ts:823 in applyPropertyWrites -> src/lib/utils/frontmatter-aliases.ts:canonicalizeKey call +3
call src/lib/features/auto-organize/auto-organize.logic.ts:828 in applyPropertyWrites -> src/lib/features/auto-organize/auto-organize.logic.ts:addItems call
call src/lib/features/auto-organize/auto-organize.logic.ts:828 in applyPropertyWrites -> src/lib/features/auto-organize/auto-organize.logic.ts:listAfterAdd call
call src/lib/features/auto-organize/auto-organize.logic.ts:834 in applyPropertyWrites -> src/lib/features/auto-organize/auto-organize.logic.ts:propertyType call
call src/lib/features/auto-organize/auto-organize.logic.ts:857 in propertyWriteSkipReason -> src/lib/core/filesystem/fs.logic.ts:isMarkdownFile call
call src/lib/features/auto-organize/auto-organize.logic.ts:863 in propertyWriteSkipReason -> src/lib/core/frontmatter/properties.logic.ts:detectLossyFrontmatter call
call src/lib/features/auto-organize/auto-organize.logic.ts:865 in propertyWriteSkipReason -> src/lib/core/frontmatter/properties.logic.ts:extractRawFrontmatter call
call src/lib/features/auto-organize/auto-organize.logic.ts:866 in propertyWriteSkipReason -> src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties call
call src/lib/features/auto-organize/auto-organize.logic.ts:867 in propertyWriteSkipReason -> src/lib/core/frontmatter/properties.logic.ts:normalizeTypeCasing call
call src/lib/features/auto-organize/auto-organize.logic.ts:924 in validateExpression -> src/lib/features/collection/expression/parser.ts:parse call
