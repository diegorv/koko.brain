# file card src/lib/features/auto-organize/auto-organize.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/auto-organize/auto-organize.store.svelte.ts ' codemap/files
file src/lib/features/auto-organize/auto-organize.store.svelte.ts store L59 module src/lib/features/auto-organize in3 t5
## imports
imp src/lib/features/auto-organize/auto-organize.store.svelte.ts:1 -> src/lib/features/auto-organize/auto-organize.types.ts type:AutoOrganizeRule,type:AutoOrganizeConfig
## imported-by
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:45 -> src/lib/features/auto-organize/auto-organize.store.svelte.ts autoOrganizeStore
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:12 -> src/lib/features/auto-organize/auto-organize.store.svelte.ts autoOrganizeStore
imp src/lib/features/auto-organize/auto-organize.service.ts:14 -> src/lib/features/auto-organize/auto-organize.store.svelte.ts autoOrganizeStore
## reach
in2 src/lib/features/auto-organize/auto-organize.store.svelte.ts 2 files in 1 modules: src/lib/app(2)
out2 src/lib/features/auto-organize/auto-organize.store.svelte.ts 2 files in 2 modules: src/lib/features/collection(1) src/lib/features/file-icons(1)
## tests
test src/tests/lib/features/auto-organize/auto-organize.store.test.ts imports src/lib/features/auto-organize/auto-organize.store.svelte.ts mirror
test src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts imports src/lib/features/auto-organize/auto-organize.store.svelte.ts
test src/tests/lib/features/auto-organize/AutoOrganizeSection.test.ts imports src/lib/features/auto-organize/auto-organize.store.svelte.ts
test src/tests/lib/features/auto-organize/auto-organize.no-chain.test.ts imports src/lib/features/auto-organize/auto-organize.store.svelte.ts
test src/tests/lib/features/auto-organize/auto-organize.service.test.ts imports src/lib/features/auto-organize/auto-organize.store.svelte.ts
## symbols
sym src/lib/features/auto-organize/auto-organize.store.svelte.ts:9 store autoOrganizeStore L51 | Reactive store for auto-organize rules and excluded folders
by src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:106 in createCount=$derived member
by src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore <- src/lib/features/auto-organize/AutoOrganizeSection.svelte:58 in addRule mcall +16
by src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore <- src/lib/features/auto-organize/auto-organize.service.ts:118 in loadAutoOrganizeConfig mcall +12
## store
store src/lib/features/auto-organize/auto-organize.store.svelte.ts:9 autoOrganizeStore esc:0
mem src/lib/features/auto-organize/auto-organize.store.svelte.ts:11 get autoOrganizeStore.rules r:7 w-via:setConfig,addRule,updateRule,removeRule,reorderRules,+1 | Ordered list of all rules (first-match wins)
more r 7 not shown: src/lib/features/auto-organize(7): q store src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore.rules
mem src/lib/features/auto-organize/auto-organize.store.svelte.ts:13 get autoOrganizeStore.excludedFolders r:10 w-via:setConfig,setExcludedFolders,reset | Folder paths excluded from auto-organize evaluation
more r 10 not shown: src/lib/features/auto-organize(10): q store src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore.excludedFolders
mem src/lib/features/auto-organize/auto-organize.store.svelte.ts:15 get autoOrganizeStore.isConfigLoaded r:- w-via:setConfig,reset | Whether the config has been loaded from disk
mem src/lib/features/auto-organize/auto-organize.store.svelte.ts:17 get autoOrganizeStore.enabledRules r:src/lib/features/auto-organize/auto-organize.service.ts:213,src/lib/features/auto-organize/auto-organize.service.ts:297 w-via:setConfig,addRule,updateRule,removeRule,reorderRules,+1 | Only enabled rules, preserving order
mem src/lib/features/auto-organize/auto-organize.store.svelte.ts:22 do autoOrganizeStore.setConfig w:src/lib/features/auto-organize/auto-organize.service.ts:118,src/lib/features/auto-organize/auto-organize.service.ts:123,src/lib/features/auto-organize/auto-organize.service.ts:127,src/lib/features/auto-organize/auto-organize.service.ts:134 | Replaces all state from a loaded config
mem src/lib/features/auto-organize/auto-organize.store.svelte.ts:29 do autoOrganizeStore.addRule w:src/lib/features/auto-organize/AutoOrganizeSection.svelte:58 | Appends a new rule to the end of the list
mem src/lib/features/auto-organize/auto-organize.store.svelte.ts:34 do autoOrganizeStore.updateRule w:src/lib/features/auto-organize/AutoOrganizeSection.svelte:63 | Merges partial updates into an existing rule by id
mem src/lib/features/auto-organize/auto-organize.store.svelte.ts:39 do autoOrganizeStore.removeRule w:src/lib/features/auto-organize/AutoOrganizeSection.svelte:68 | Removes a rule by id
mem src/lib/features/auto-organize/auto-organize.store.svelte.ts:44 do autoOrganizeStore.reorderRules w:src/lib/features/auto-organize/AutoOrganizeSection.svelte:77,src/lib/features/auto-organize/AutoOrganizeSection.svelte:86 | Replaces the entire rules array (for drag reorder)
mem src/lib/features/auto-organize/auto-organize.store.svelte.ts:49 do autoOrganizeStore.setExcludedFolders w:src/lib/features/auto-organize/AutoOrganizeSection.svelte:94,src/lib/features/auto-organize/AutoOrganizeSection.svelte:100 | Replaces the excluded folders list
mem src/lib/features/auto-organize/auto-organize.store.svelte.ts:54 do autoOrganizeStore.reset w:src/lib/features/auto-organize/auto-organize.service.ts:775 | Resets all state to initial values
