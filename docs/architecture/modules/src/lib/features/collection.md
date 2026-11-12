---
summary: "Property index of notes, .view and inline collection query engine, and their table and calendar views."
---

## Responsibility

Owns the in-memory property index (every note and .view file with its frontmatter properties, projected from the Rust vault index) and keeps it current from whole reads and per-path deltas. Owns the query engine that runs a collection definition (filters, sorts, formulas, columns) over that index, the .view YAML parsing and editing, the expression language for filters and formulas, and the table, calendar and linear-calendar renderers for .view editor tabs and inline collection code blocks. It does not own the Rust index or its commands, the rail's list rule for which rows a view shows (injected through view-row-set.port.ts), or file-tree and editor tab state.

## Key files

- `src/lib/features/collection/collection.store.svelte.ts`: Reactive property index (propertyIndex, isIndexReady, version) and the session-only remembered view index per collection path.
- `src/lib/features/collection/collection.service.ts`: Whole-index read over IPC, delta application, note-change and path-change consumers, and createCollectionFile.
- `src/lib/features/collection/collection.logic.ts`: buildNoteRecord and executeQuery: turn a definition and the index into a QueryResult.
- `src/lib/features/collection/view-row-set.port.ts`: Port through which the app installs the rail's row rule, so editor and inline blocks match the rail's counts.
- `src/lib/features/collection/collection-block-widget.ts`: CodeMirror widget for collection blocks: query cache keyed by block content, DOM rebuilt per render, row and lane caps.
- `src/lib/features/collection/CollectionView.svelte`: Editor for a .view file: view switcher, toolbar panels, and table, calendar and linear-calendar bodies.
- `src/lib/features/collection/yaml-parser.ts`: Parses a .view or block YAML body into a CollectionDefinition and returns updated YAML for view edits.
- `src/lib/features/collection/expression/parser.ts`: Parser for the filter and formula expression language; tokenizer, evaluator and methods sit alongside it in expression/.

## State

- collectionStore.propertyIndex: Map of note path to PropertyIndexRecord, replaced (not mutated) on every change, with isIndexReady and a monotonic version counter that is not reset on vault switch.
- collectionStore viewIndexByPath: session-only, non-reactive Map from collection path to last used view index.
- Module state in collection.service.ts: deltaLog, wholeReadsInFlight and wholeReadFailed, used to replay deltas that land during a whole read.
- collectionCache in collection-block-widget.ts: Map from block YAML content to version, view and result, cleared on vault teardown (clearCollectionCache from app-lifecycle).
- The only file written is a new .view through createFile.

## Collaborators

- `IPC:get_all_property_records`: buildPropertyIndex loads the whole property index.
- `IPC:get_index_delta`: Invoked from src/lib/app/tauri-listeners.service.ts; its records reach applyPropertyDelta here.
- `event:vault-index-updated`: Listened to in src/lib/app/tauri-listeners.service.ts, which chooses between applyPropertyDelta and a whole buildPropertyIndex. This folder does not listen directly.
- `src/lib/core/filesystem`: note-change and path-change consumers, createFile, file-type helpers, parseWikilinks.
- `src/lib/core/vault`: Vault path and requestPromptIndexRefresh before a new .view is written.
- `src/lib/core/editor`: openFileInEditor and reloadExternallyChangedTabs from CollectionView and the block widget.
- `src/lib/core/frontmatter`: parseFrontmatterProperties and normalizeTypeCasing inside buildNoteRecord; PropertyType.
- `src/lib/core/markdown-editor`: FencedBlockRenderer, the type the block renderer implements for live preview.
- `src/lib/app`: boot registers the view row-set port; app-lifecycle builds the index, registers consumers, clears the block cache and resets; watcher-handler and tauri-listeners rebuild or apply deltas; EditorView mounts CollectionView; editor-host registers the block renderer.
- `src/lib/features/rail-shell`: Rail list and navigators read collectionStore and call createCollectionFile; lens.logic.ts uses executeQuery and supplies the row rule that boot installs in the port.
- `src/lib/features/type-definitions`: Uses yaml-parser, toolbar filter logic and collectionStore from ViewDialog and the type note list logic.
- `src/lib/features/auto-organize`: Uses buildNoteRecord, evaluateFilter, the expression parser and evaluator, and FilterPanel to match notes against rules.
- `src/lib/plugins/queryjs`: Reads collectionStore for query snapshots and uses PropertyIndexRecord types.
- `src/lib/plugins/mods`: Runs executeQuery, reads getViewRowSetPort and collectionStore.

## Subfolders

- `src/lib/features/collection/expression`: Expression language for filters and formulas: tokenizer, parser, evaluator, built-in methods, duration and date value logic, shared AST types.
- `src/lib/features/collection/toolbar`: Filter, sort, properties, formula and calendar config panels and rows, with their pure logic and toolbar.types.ts.

## Gotchas

- The index is replaced, not mutated: setPropertyIndex, updateRecord and removeRecord each build a new Map. The version counter is never reset, including in reset(), because the block widget cache compares it across vault switches.
- A delta is logged for replay only while a whole read is in flight, so a delta that lands during buildPropertyIndex is replayed on top of the snapshot and not rolled back.
- A failed whole read sets wholeReadFailed, so propertyIndexNeedsWholeRead stays true until a later read succeeds. buildPropertyIndex catches and logs its own errors instead of rethrowing.
- Only Markdown notes are upserted from the note-change consumer. A .view body is bare YAML, so buildNoteRecord would replace its Rust-projected record with an empty one. .view records come from Rust through the delta path.
- updateNoteInIndex keeps the previous mtime, ctime and size and rebuilds only properties from content. File metadata is authoritative only in the Rust index.
- The row rule is injected, not imported, because collection may not import rail-shell. Without a registered port, CollectionView and the block widget run the plain query and counts can differ from the rail's list.
- The inline block widget rebuilds its DOM on every toDOM() because rows carry click listeners. Only the QueryResult is cached, keyed by block content, with the version inside the entry.
- COLLECTION_ROW_CAP and LINEAR_CALENDAR_LANE_CAP limit rendering only. The cached QueryResult stays complete and the footer shows the full number.
- The remembered view index per path is a plain Map and follows the file through the path-change consumer.
- createCollectionFile requests a prompt index refresh before writing, because create_note emits an event and a view with no entry yet would otherwise show in the Views list.
