# module card src/lib/core/rule-actions
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/core/rule-actions ' codemap/modules
module src/lib/core/rule-actions core files 1 in-modules 2 out-modules 0 pub 1/3 ipc 0/0 card ~0.5k
## neighbors
dep src/lib/features/auto-organize -> src/lib/core/rule-actions 2
dep src/lib/plugins/mods -> src/lib/core/rule-actions 1
in2 src/lib/core/rule-actions 1 modules: src/lib/app(3)
out2 src/lib/core/rule-actions 0 modules: -
## entry files
entry src/lib/core/rule-actions/rule-actions.store.svelte.ts ext-in3 src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte src/lib/features/auto-organize/auto-organize.service.ts src/lib/plugins/mods/mods-host.service.ts
## files
file src/lib/core/rule-actions/rule-actions.store.svelte.ts store L62 module src/lib/core/rule-actions in3 t5 | Actions an Auto Organize rule can run.
## public
sym src/lib/core/rule-actions/rule-actions.store.svelte.ts:38 store ruleActionsStore L25 | Live registry of the actions a rule can run
## stores
store src/lib/core/rule-actions/rule-actions.store.svelte.ts:38 ruleActionsStore esc:0
## debt
-
