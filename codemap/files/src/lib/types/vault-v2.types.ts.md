# file card src/lib/types/vault-v2.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/types/vault-v2.types.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols
file src/lib/types/vault-v2.types.ts types L36 module src/lib/types in32 t0 | Vault IPC types under the `*V2` names the app imports.
## imports
imp src/lib/types/vault-v2.types.ts:18 -> src/lib/contracts/index.ts type:JsonValue,type:WikiLink,type:NoteEntry,type:RelationshipBacklink,type:OutgoingLink,type:OutgoingUnlinkedMention,type:UpdateResult,type:TaskStatus,type:TaskPriority,type:RecurrenceRule,type:TaskMetadata,type:Task,type:TaskHeading,type:TagAggregate,type:FileTaskGroup,type:ToggleTaskResult,type:NoteRecord
## imported-by
imp src/lib/core/filesystem/folder-notes.logic.ts:2 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/core/markdown-editor/editor-host.ts:4 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/core/markdown-editor/extensions/wikilink/completion.ts:4 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2,type:FrontmatterValue
imp src/lib/core/vault/vault-entries.logic.ts:1 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/core/vault/vault-entries.service.ts:3 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/backlinks/backlinks.logic.ts:2 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/backlinks/backlinks.store.svelte.ts:2 -> src/lib/types/vault-v2.types.ts type:RelationshipBacklinkV2
imp src/lib/features/collection/collection.service.ts:10 -> src/lib/types/vault-v2.types.ts type:NoteRecordV2
imp src/lib/features/dock-badge/dock-badge.logic.ts:1 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/event-calendar/event-calendar-event.logic.ts:13 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/event-calendar/event-calendar-tasks.logic.ts:7 -> src/lib/types/vault-v2.types.ts type:FileTaskGroupV2,type:TaskStatusV2
imp src/lib/features/event-calendar/event-calendar.service.ts:33 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/file-icons/file-icons.logic.ts:3 -> src/lib/types/vault-v2.types.ts type:FrontmatterValue
imp src/lib/features/note-list/note-row.types.ts:1 -> src/lib/types/vault-v2.types.ts type:FrontmatterValue
imp src/lib/features/outgoing-links/outgoing-links.service.ts:8 -> src/lib/types/vault-v2.types.ts type:OutgoingLinkV2
imp src/lib/features/properties/NoteInfo.svelte:7 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/properties/lifecycle-filter.logic.ts:1 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/properties/lifecycle-filter.service.ts:2 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/properties/note-info.logic.ts:2 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/rail-shell/lens.logic.ts:1 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/rail-shell/rail-shell.types.ts:3 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/tasks/task-headings.logic.ts:2 -> src/lib/types/vault-v2.types.ts type:TaskHeadingV2
imp src/lib/features/tasks/task-query.logic.ts:1 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/type-definitions/inbox-workflow.logic.ts:1 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/type-definitions/type-definitions.logic.ts:1 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2,type:FrontmatterValue
imp src/lib/features/type-definitions/type-definitions.service.ts:4 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/type-definitions/type-definitions.store.svelte.ts:1 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/type-definitions/type-sidebar.logic.ts:3 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/type-definitions/type-sidebar.logic.ts:30 -> src/lib/types/vault-v2.types.ts type:FrontmatterValue
imp src/lib/plugins/graph-view/graph-view.logic.ts:5 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/plugins/one-on-one/one-on-one.logic.ts:4 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/plugins/queryjs/kb-api.ts:2 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/plugins/queryjs/queryjs.logic.ts:3 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
## reach
in2 src/lib/types/vault-v2.types.ts 88 files in 20 modules: src/lib/features/rail-shell(17) src/lib/features/event-calendar(16) src/lib/app(10) src/lib/core/markdown-editor(8) src/lib/features/tasks(6) +15 modules: q impact src/lib/types/vault-v2.types.ts --depth 2
out2 src/lib/types/vault-v2.types.ts 52 files in 1 modules: src/lib/contracts(52)
## tests
test src/tests/lib/types/vault-v2.types.test.ts imports-type src/lib/types/vault-v2.types.ts mirror
test e2e/mocks/tauri-core.ts imports-type src/lib/types/vault-v2.types.ts
test e2e/mocks/vault-index.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/e2e/task-headings-parity.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/fixtures/calendar-vault.fixture.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/fixtures/event-notes.fixture.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/fixtures/recent-view.fixture.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/fixtures/tasks.fixture.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/fixtures/vault-entries.fixture.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/help/queryjs-contract.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/help/queryjs-features-scoping.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/help/type-definitions-views.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/app/commands.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/app/tauri-listeners.service.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/contracts/contracts.types.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/core/filesystem/link-updater.service.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/backlinks/backlinks.logic.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/collection/collection.service.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/collection/yaml-parser.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/event-calendar/EventCalendarView.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/event-calendar/event-calendar-event.logic.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/event-calendar/event-calendar-tasks.logic.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/event-calendar/event-calendar.model.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/event-calendar/event-calendar.service.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/file-icons/file-icons.logic.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/file-icons/file-icons.service.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/file-icons/icon-resolver.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/note-list/NoteRowMenu.show-in-views.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/properties/NoteInfo.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/properties/lifecycle-filter.logic.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/rail-shell/Rail.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/rail-shell/RailNoteList.properties.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/rail-shell/RailNoteList.search.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/rail-shell/RailNoteList.sort.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/rail-shell/RailNoteList.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/rail-shell/lens.logic.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/search/search.service.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/tags/tags.service.test.ts imports-type src/lib/types/vault-v2.types.ts
test src/tests/lib/features/tasks/TasksView.collapse.test.ts imports-type src/lib/types/vault-v2.types.ts
more tests 17 not shown: src/tests/lib/features/tasks(11) src/tests/lib/features/type-definitions(3) src/tests/lib/plugins/queryjs(3): q tests src/lib/types/vault-v2.types.ts
## symbols
sym src/lib/types/vault-v2.types.ts:19 reexport FrontmatterValue = src/lib/contracts/generated/serde_json/JsonValue.ts:JsonValue L1
sym src/lib/types/vault-v2.types.ts:20 reexport WikiLinkV2 = dto:WikiLink L1
sym src/lib/types/vault-v2.types.ts:21 reexport NoteEntryV2 = dto:NoteEntry L1
sym src/lib/types/vault-v2.types.ts:22 reexport RelationshipBacklinkV2 = dto:RelationshipBacklink L1
sym src/lib/types/vault-v2.types.ts:23 reexport OutgoingLinkV2 = dto:OutgoingLink L1
sym src/lib/types/vault-v2.types.ts:24 reexport OutgoingUnlinkedMentionV2 = dto:OutgoingUnlinkedMention L1
sym src/lib/types/vault-v2.types.ts:25 reexport UpdateResultV2 = dto:UpdateResult L1
sym src/lib/types/vault-v2.types.ts:26 reexport TaskStatusV2 = dto:TaskStatus L1
sym src/lib/types/vault-v2.types.ts:27 reexport TaskPriorityV2 = dto:TaskPriority L1
sym src/lib/types/vault-v2.types.ts:28 reexport RecurrenceRuleV2 = dto:RecurrenceRule L1
sym src/lib/types/vault-v2.types.ts:29 reexport TaskMetadataV2 = dto:TaskMetadata L1
sym src/lib/types/vault-v2.types.ts:30 reexport TaskV2 = dto:Task L1
sym src/lib/types/vault-v2.types.ts:31 reexport TaskHeadingV2 = dto:TaskHeading L1
sym src/lib/types/vault-v2.types.ts:32 reexport TagAggregateV2 = dto:TagAggregate L1
sym src/lib/types/vault-v2.types.ts:33 reexport FileTaskGroupV2 = dto:FileTaskGroup L1
sym src/lib/types/vault-v2.types.ts:34 reexport ToggleTaskResultV2 = dto:ToggleTaskResult L1
sym src/lib/types/vault-v2.types.ts:35 reexport NoteRecordV2 = dto:NoteRecord L1
