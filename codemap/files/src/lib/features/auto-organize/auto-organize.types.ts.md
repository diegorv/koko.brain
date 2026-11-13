# file card src/lib/features/auto-organize/auto-organize.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/auto-organize/auto-organize.types.ts ' codemap/files
file src/lib/features/auto-organize/auto-organize.types.ts types L116 module src/lib/features/auto-organize in7 t0
## imports
imp src/lib/features/auto-organize/auto-organize.types.ts:4 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId
imp src/lib/features/auto-organize/auto-organize.types.ts:81 -> src/lib/features/collection/collection.types.ts type:FilterItem
## imported-by
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:20 -> src/lib/features/auto-organize/auto-organize.types.ts type:RuleProperty
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:29 -> src/lib/features/auto-organize/auto-organize.types.ts type:AutoOrganizeRule,type:RuleCreateNote,type:RuleProperty,type:RuleRename
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:15 -> src/lib/features/auto-organize/auto-organize.types.ts type:AutoOrganizeRule
imp src/lib/features/auto-organize/auto-organize.logic.ts:1 -> src/lib/features/auto-organize/auto-organize.types.ts type:AutoOrganizeRule,type:RuleCreateNote,type:RuleProperty,type:RuleRename,type:RuleRunAction,type:RuleValue
imp src/lib/features/auto-organize/auto-organize.service.ts:41 -> src/lib/features/auto-organize/auto-organize.types.ts type:AutoOrganizeConfig,type:AutoOrganizeRule
imp src/lib/features/auto-organize/auto-organize.store.svelte.ts:1 -> src/lib/features/auto-organize/auto-organize.types.ts type:AutoOrganizeRule,type:AutoOrganizeConfig
imp src/lib/features/auto-organize/type-lifecycle-rules.ts:2 -> src/lib/features/auto-organize/auto-organize.types.ts type:AutoOrganizeRule
## reach
in2 src/lib/features/auto-organize/auto-organize.types.ts 2 files in 1 modules: src/lib/app(2)
out2 src/lib/features/auto-organize/auto-organize.types.ts 1 files in 1 modules: src/lib/features/collection(1)
## tests
test src/tests/help/auto-organize-doc-examples.test.ts imports-type src/lib/features/auto-organize/auto-organize.types.ts
test src/tests/help/auto-organize-switch-back.test.ts imports-type src/lib/features/auto-organize/auto-organize.types.ts
test src/tests/help/examples-scoping.test.ts imports-type src/lib/features/auto-organize/auto-organize.types.ts
test src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts imports-type src/lib/features/auto-organize/auto-organize.types.ts
test src/tests/lib/features/auto-organize/auto-organize.logic.test.ts imports-type src/lib/features/auto-organize/auto-organize.types.ts
test src/tests/lib/features/auto-organize/auto-organize.no-chain.test.ts imports-type src/lib/features/auto-organize/auto-organize.types.ts
test src/tests/lib/features/auto-organize/auto-organize.service.test.ts imports-type src/lib/features/auto-organize/auto-organize.types.ts
test src/tests/lib/features/auto-organize/auto-organize.store.test.ts imports-type src/lib/features/auto-organize/auto-organize.types.ts
## symbols
sym src/lib/features/auto-organize/auto-organize.types.ts:2 interface AutoOrganizeIcon L10 | Icon assignment applied to moved files
sym src/lib/features/auto-organize/auto-organize.types.ts:14 type RuleValue L1 | A literal rule property value; its JSON type decides the YAML type written
by src/lib/features/auto-organize/auto-organize.types.ts:RuleValue <- src/lib/features/auto-organize/auto-organize.logic.ts:1 in (module) import
sym src/lib/features/auto-organize/auto-organize.types.ts:17 interface RuleProperty L22 | A property a matching rule writes to, or removes from, the note's frontmatter
by src/lib/features/auto-organize/auto-organize.types.ts:RuleProperty <- src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:20 in (script) import
by src/lib/features/auto-organize/auto-organize.types.ts:RuleProperty <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:29 in (script) import
by src/lib/features/auto-organize/auto-organize.types.ts:RuleProperty <- src/lib/features/auto-organize/auto-organize.logic.ts:1 in (module) import
sym src/lib/features/auto-organize/auto-organize.types.ts:41 interface RuleCreateNote L17 | A note a matching rule creates when it does not exist yet
by src/lib/features/auto-organize/auto-organize.types.ts:RuleCreateNote <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:29 in (script) import
by src/lib/features/auto-organize/auto-organize.types.ts:RuleCreateNote <- src/lib/features/auto-organize/auto-organize.logic.ts:1 in (module) import
sym src/lib/features/auto-organize/auto-organize.types.ts:64 interface RuleRename L6 | The name a matching rule gives the note, without its extension: exactly one of `name` and `expr`.
by src/lib/features/auto-organize/auto-organize.types.ts:RuleRename <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:29 in (script) import
by src/lib/features/auto-organize/auto-organize.types.ts:RuleRename <- src/lib/features/auto-organize/auto-organize.logic.ts:1 in (module) import
sym src/lib/features/auto-organize/auto-organize.types.ts:72 interface AutoOrganizeRule L29 | A single auto-organize rule: a filter plus rename, move, property and create-note consequences
by src/lib/features/auto-organize/auto-organize.types.ts:AutoOrganizeRule <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:29 in (script) import
by src/lib/features/auto-organize/auto-organize.types.ts:AutoOrganizeRule <- src/lib/features/auto-organize/AutoOrganizeSection.svelte:15 in (script) import
by src/lib/features/auto-organize/auto-organize.types.ts:AutoOrganizeRule <- src/lib/features/auto-organize/auto-organize.logic.ts:1 in (module) import
by src/lib/features/auto-organize/auto-organize.types.ts:AutoOrganizeRule <- src/lib/features/auto-organize/auto-organize.service.ts:41 in (module) import
by src/lib/features/auto-organize/auto-organize.types.ts:AutoOrganizeRule <- src/lib/features/auto-organize/auto-organize.store.svelte.ts:1 in (module) import
by src/lib/features/auto-organize/auto-organize.types.ts:AutoOrganizeRule <- src/lib/features/auto-organize/type-lifecycle-rules.ts:2 in (module) import
sym src/lib/features/auto-organize/auto-organize.types.ts:103 interface RuleRunAction L6 | A mod action a matching rule runs on the note, after every other consequence
by src/lib/features/auto-organize/auto-organize.types.ts:RuleRunAction <- src/lib/features/auto-organize/auto-organize.logic.ts:1 in (module) import
sym src/lib/features/auto-organize/auto-organize.types.ts:111 interface AutoOrganizeConfig L6 | Persisted auto-organize configuration stored in .kokobrain/auto-organize-rules.json
by src/lib/features/auto-organize/auto-organize.types.ts:AutoOrganizeConfig <- src/lib/features/auto-organize/auto-organize.service.ts:41 in (module) import
by src/lib/features/auto-organize/auto-organize.types.ts:AutoOrganizeConfig <- src/lib/features/auto-organize/auto-organize.store.svelte.ts:1 in (module) import
