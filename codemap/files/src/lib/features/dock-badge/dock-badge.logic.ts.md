# file card src/lib/features/dock-badge/dock-badge.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/dock-badge/dock-badge.logic.ts ' codemap/files
file src/lib/features/dock-badge/dock-badge.logic.ts logic L17 module src/lib/features/dock-badge in1 t3
## imports
imp src/lib/features/dock-badge/dock-badge.logic.ts:1 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/dock-badge/dock-badge.logic.ts:2 -> src/lib/features/type-definitions/inbox-workflow.logic.ts getInboxCount
## imported-by
imp src/lib/app/AppShell.svelte:10 -> src/lib/features/dock-badge/dock-badge.logic.ts dockBadgeCount
## reach
in2 src/lib/features/dock-badge/dock-badge.logic.ts 1 files in 1 modules: src/routes(1)
out2 src/lib/features/dock-badge/dock-badge.logic.ts 2 files in 2 modules: src/lib/contracts(1) src/lib/features/type-definitions(1)
## tests
test src/tests/lib/features/dock-badge/dock-badge.logic.test.ts imports src/lib/features/dock-badge/dock-badge.logic.ts mirror
test src/tests/lib/features/rail-shell/Rail.test.ts imports src/lib/features/dock-badge/dock-badge.logic.ts
test src/tests/lib/features/rail-shell/lens.logic.test.ts imports src/lib/features/dock-badge/dock-badge.logic.ts
## symbols
sym src/lib/features/dock-badge/dock-badge.logic.ts:14 fn dockBadgeCount(enabled: boolean, entries: NoteEntryV2[]): number | null L4 | Computes the value to display on the macOS dock badge.
by src/lib/features/dock-badge/dock-badge.logic.ts:dockBadgeCount <- src/lib/app/AppShell.svelte:74 in $effect@66 call
## calls
call src/lib/features/dock-badge/dock-badge.logic.ts:16 in dockBadgeCount -> src/lib/features/type-definitions/inbox-workflow.logic.ts:getInboxCount call
