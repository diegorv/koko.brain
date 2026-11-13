# file card src/lib/features/type-definitions/inbox-workflow.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/type-definitions/inbox-workflow.logic.ts ' codemap/files
file src/lib/features/type-definitions/inbox-workflow.logic.ts logic L24 module src/lib/features/type-definitions in4 t2
## imports
imp src/lib/features/type-definitions/inbox-workflow.logic.ts:1 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/type-definitions/inbox-workflow.logic.ts:2 -> src/lib/features/type-definitions/type-sidebar.logic.ts isListableNote
## imported-by
imp src/lib/features/dock-badge/dock-badge.logic.ts:2 -> src/lib/features/type-definitions/inbox-workflow.logic.ts getInboxCount
imp src/lib/features/rail-shell/Rail.svelte:25 -> src/lib/features/type-definitions/inbox-workflow.logic.ts getInboxCount
imp src/lib/features/rail-shell/lens.logic.ts:17 -> src/lib/features/type-definitions/inbox-workflow.logic.ts isInboxEntry
imp src/lib/features/tasks/task-query.logic.ts:5 -> src/lib/features/type-definitions/inbox-workflow.logic.ts isInboxEntry
## reach
in2 src/lib/features/type-definitions/inbox-workflow.logic.ts 23 files in 6 modules: src/lib/features/rail-shell(10) src/lib/features/tasks(6) src/lib/app(4) src/lib/features/search(1) src/lib/plugins/calendar(1) +1 modules: q impact src/lib/features/type-definitions/inbox-workflow.logic.ts --depth 2
out2 src/lib/features/type-definitions/inbox-workflow.logic.ts 7 files in 5 modules: src/lib/core/filesystem(2) src/lib/features/collection(2) src/lib/contracts(1) src/lib/features/file-icons(1) src/lib/features/type-definitions(1)
## tests
test src/tests/lib/features/type-definitions/inbox-workflow.logic.test.ts imports src/lib/features/type-definitions/inbox-workflow.logic.ts mirror
test src/tests/lib/features/properties/lifecycle.logic.test.ts imports src/lib/features/type-definitions/inbox-workflow.logic.ts
## symbols
sym src/lib/features/type-definitions/inbox-workflow.logic.ts:10 fn isInboxEntry(entry: NoteEntryV2): boolean L3 | Whether an entry belongs to the lifecycle inbox: not organized, not archived, and a listable note (`isListableNote`: not a Type Definition, not a `.view`).
by src/lib/features/type-definitions/inbox-workflow.logic.ts:isInboxEntry <- src/lib/features/rail-shell/lens.logic.ts:291 in toLensNote call +1
by src/lib/features/type-definitions/inbox-workflow.logic.ts:isInboxEntry <- src/lib/features/tasks/task-query.logic.ts:291 in buildTaskRows call
sym src/lib/features/type-definitions/inbox-workflow.logic.ts:18 fn getInboxCount(entries: NoteEntryV2[]): number L7 | Returns the inbox count: entries that are not organized, not archived, and listable notes (not a Type Definition, not a `.view`).
by src/lib/features/type-definitions/inbox-workflow.logic.ts:getInboxCount <- src/lib/features/dock-badge/dock-badge.logic.ts:16 in dockBadgeCount call
by src/lib/features/type-definitions/inbox-workflow.logic.ts:getInboxCount <- src/lib/features/rail-shell/Rail.svelte:61 in inboxCount=$derived call
## calls
call src/lib/features/type-definitions/inbox-workflow.logic.ts:11 in isInboxEntry -> src/lib/features/type-definitions/type-sidebar.logic.ts:isListableNote call
call src/lib/features/type-definitions/inbox-workflow.logic.ts:21 in getInboxCount -> src/lib/features/type-definitions/inbox-workflow.logic.ts:isInboxEntry call
