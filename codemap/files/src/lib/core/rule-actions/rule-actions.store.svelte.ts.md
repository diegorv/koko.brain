# file card src/lib/core/rule-actions/rule-actions.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/rule-actions/rule-actions.store.svelte.ts ' codemap/files
file src/lib/core/rule-actions/rule-actions.store.svelte.ts store L62 module src/lib/core/rule-actions in3 t5 | Actions an Auto Organize rule can run.
## imported-by
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:28 -> src/lib/core/rule-actions/rule-actions.store.svelte.ts ruleActionsStore
imp src/lib/features/auto-organize/auto-organize.service.ts:12 -> src/lib/core/rule-actions/rule-actions.store.svelte.ts ruleActionsStore
imp src/lib/plugins/mods/mods-host.service.ts:8 -> src/lib/core/rule-actions/rule-actions.store.svelte.ts ruleActionsStore
## reach
in2 src/lib/core/rule-actions/rule-actions.store.svelte.ts 4 files in 3 modules: src/lib/app(2) src/lib/features/auto-organize(1) src/lib/plugins/mods(1)
out2 src/lib/core/rule-actions/rule-actions.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/rule-actions/rule-actions.store.test.ts imports src/lib/core/rule-actions/rule-actions.store.svelte.ts mirror
test src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts imports src/lib/core/rule-actions/rule-actions.store.svelte.ts
test src/tests/lib/features/auto-organize/auto-organize.no-chain.test.ts imports src/lib/core/rule-actions/rule-actions.store.svelte.ts
test src/tests/lib/features/auto-organize/auto-organize.service.test.ts imports src/lib/core/rule-actions/rule-actions.store.svelte.ts
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports src/lib/core/rule-actions/rule-actions.store.svelte.ts
## symbols
sym src/lib/core/rule-actions/rule-actions.store.svelte.ts:9 interface RuleActionTarget L6 | The note a rule runs an action on
sym src/lib/core/rule-actions/rule-actions.store.svelte.ts:17 interface RuleAction L16 | An action a rule can run
sym src/lib/core/rule-actions/rule-actions.store.svelte.ts:38 store ruleActionsStore L25 | Live registry of the actions a rule can run
by src/lib/core/rule-actions/rule-actions.store.svelte.ts:ruleActionsStore <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:124 in actionMissing=$derived member +2
by src/lib/core/rule-actions/rule-actions.store.svelte.ts:ruleActionsStore <- src/lib/features/auto-organize/auto-organize.service.ts:391 in runRuleAction mcall
by src/lib/core/rule-actions/rule-actions.store.svelte.ts:ruleActionsStore <- src/lib/plugins/mods/mods-host.service.ts:563 in createModContext mcall
## store
store src/lib/core/rule-actions/rule-actions.store.svelte.ts:38 ruleActionsStore esc:0
mem src/lib/core/rule-actions/rule-actions.store.svelte.ts:40 get ruleActionsStore.list r:src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:124,src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:130 w-via:register,reset | Every registered action, in registration order
mem src/lib/core/rule-actions/rule-actions.store.svelte.ts:45 do ruleActionsStore.get w:src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:126,src/lib/features/auto-organize/auto-organize.service.ts:391 | The registered action with `id`, or undefined
mem src/lib/core/rule-actions/rule-actions.store.svelte.ts:50 do ruleActionsStore.register w:src/lib/plugins/mods/mods-host.service.ts:563 | Registers an action, replacing one with its id; the cleanup removes only this registration
mem src/lib/core/rule-actions/rule-actions.store.svelte.ts:59 do ruleActionsStore.reset w:- | Drops every registration
