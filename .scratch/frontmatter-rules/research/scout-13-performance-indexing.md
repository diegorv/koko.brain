# Scout 13: performance and index constraints

Scope: `docs/agents/indexing-watcher-rules.md` (rules 1-12), the cost of evaluating N rules per save / property change / rename, parse caching, write storms, watcher echo, and a bulk "apply rules to existing notes" pass. Read-only research, nothing was run, no timing was measured. Evidence is cited as path:line at HEAD (`2e2cc5b60`). Numbers appear only where a doc or a code comment states them, and each says so. Where a number is missing, the report says "not measured".

Builds on `scout-06-trigger-after-save.md` (the hook, the callers, the loop matrix). Not repeated here except where a cost depends on it.

## 1. Summary for the design

1. Evaluating rules is probably not the dominant cost, but that cannot be stated as a number (no benchmark exists for the expression engine). The path is: one `buildNoteRecord` per note, one `parse` per rule, one tree walk per rule. The costs that matter are the WRITE side effects. Every rule write is a full "save": 7 IPC calls minimum on a closed note, a full-content File History snapshot row, an FTS5 delete+insert of the whole note, a `vault-index-updated` event, and a throttled whole-snapshot refresh (section 4).
2. `evaluateExpression` re-parses the expression string on every call (`evaluator.ts:75-78`: `const ast = parse(expression); return evaluate(ast, ctx);`). There is no parse cache in the engine. Auto Move therefore re-parses every enabled rule for every evaluation, plus every generated lifecycle rule (`auto-move.logic.ts:26`, `auto-move.service.ts:156-161`, `type-lifecycle-rules.ts` regenerates the rule list on every `evaluateAndMove`). The collection module already has the cure: `evaluateFilterCached` with a per-query `Map<string, ASTNode>` (`collection.logic.ts` around `:340-360`). A shared rule core should parse each expression once and reuse the AST (section 2).
3. The cheapest possible gate order for a save is: master switch and "any rules" check, `.view` skip, excluded folder, cheap per-rule pre-filters (frontmatter changed? does the rule read body-derived fields?), then record build, then evaluation. Auto Move already does the first four (`auto-move.service.ts:97-110`); the record build and evaluation sit inside a 3 s per-path debounce timer so they run once per quiet period, not per save.
4. The write storm is bounded by one thing: the engine must not write when nothing would change. `updateNoteFrontmatter` already returns before any write when `next === base` (`frontmatter-write.service.ts:128-129`), but it has paid a `readTextFile` for a closed note by then (`:121`). A bulk pass or a rename trigger must decide "would anything change" on an in-memory record first and only call the writer for the notes that need it.
5. Watcher echo of the app's own writes is suppressed only when ALL paths of a batch are recent saves (`editor.hooks.ts:47-49`, `watcher-handler.service.ts:48`). Writes through `updateNoteFrontmatter` call `notifyAfterSave` and so mark the path (`editor.hooks.ts:68`). A write that does not (a Rust-side bulk writer like `propagate_type_rename`, `vault.rs:397-441`) is echoed by the watcher and, above 10 Markdown files, takes the FULL rebuild branch (section 5).
6. A bulk pass has two shapes with opposite tradeoffs (section 6): a TS loop over `updateNoteFrontmatter` (correct for open tabs, full fan-out per note, N history rows) or one Rust command like `propagate_type_rename` (one lock, one event, no TS consumers, no FTS/semantic/history, open tabs must be handled TS-side first). I recommend the TS loop with a pre-filter on the in-memory property index, bounded concurrency of 1, and a "batch" scope flag so the per-write side effects that can be coalesced are (section 6.3). The owner decides the scale threshold.

## 2. Cost of evaluating N rules

### 2.1 What one evaluation does (verified)

For one note, `evaluateAndMove` (`auto-move.service.ts:152-161`):

1. `buildNoteRecord(filePath, content, Date.now(), Date.now())` (`collection.logic.ts:22-43`): `getFileName`, `getFileExtension`, then `parseFrontmatterProperties(content)`, then `projectDerivedProperties`. The last one calls `extractAllTags(content)` (`collection.logic.ts:69`; `tag-extraction.ts:131-146`), which runs frontmatter tag extraction plus an inline `#tag` extraction over the WHOLE note body. So the record build is O(note size), not O(frontmatter size), because of `tags`.
2. `generateLifecycleRules(typeMetadataMap)` rebuilds rule objects with string interpolation, one or two per type that has `archiveTo` (`type-lifecycle-rules.ts:25-65`).
3. `findMatchingRule` loops the rules; for each enabled rule, `evaluateExpression` = tokenize + recursive-descent parse + evaluate (`evaluator.ts:75-78`, `parser.ts:8-9`). First match wins (`auto-move.logic.ts:22-34`).

With R rules, a miss costs R parses and R evaluations. A hit stops early. A feature that applies EVERY matching rule (the owner's model: several rules may fire, per-action fill/always) cannot early-exit, so it pays all R on every evaluation.

### 2.2 Parse caching

- Expression engine: no cache. `grep` of `src/lib/features/collection/expression/*.ts` for cache/LRU found nothing. Parse is a pure function of the string.
- Collection filter path: has one. `evaluateFilterCached(filter, ctx, parseCache)` keeps a `Map<string, ASTNode>` shared across all records of one query (`collection.logic.ts` `:340-360` in the read; the non-cached twin `evaluateFilter` at `:322` re-parses). Another site parses once up front into `[name, parse(expr)]` pairs (`collection.logic.ts:150`).
- Frontmatter YAML: `parseFrontmatterProperties` is an LRU of capacity 16 keyed by the raw frontmatter substring (`properties.logic.ts:223-224`, `:232-240`; rule 11 of the indexing doc). The cache stores frozen clones and returns a fresh `cloneProperty` copy per hit, so a hit costs a clone, not a YAML parse. It also caches failures (`:266`, `:272`, `:278`, `:302`).
- Consequence for a rule write: `updateNoteFrontmatter` calls `parseFrontmatterProperties(base)` (`frontmatter-write.service.ts:128`) on the same text `buildNoteRecord` just parsed, so while the entry is in the 16-slot LRU the write does not re-parse YAML. A bulk pass over hundreds of distinct notes churns the LRU (capacity 16), so each note is a miss; the cache buys nothing there, it only helps the evaluate-then-write sequence for ONE note.

Recommendation: the shared rule core compiles each rule's expression once (on config load and on edit, keyed by the expression string) and keeps the AST. `validateExpression` already parses at edit time (`auto-move.logic.ts:87-95`), so the parse can be reused for validation and for evaluation. Invalidate on config change only. This removes R parses per evaluation. How much that saves is not measured; the per-file figure the docs give for the whole per-file indexing is "~5-15 ms" (comment in `index-updater.service.ts:27` and ADR-0009 line 19), which is the entire consumer fan-out, not the rule engine.

### 2.3 Where the record can come from (avoid building it twice)

- At save time the collection consumer has already built the same record from the same bytes: `registerCollectionNoteChangeConsumer` -> `updateNoteInIndex` -> `buildNoteRecord` -> `collectionStore.updateRecord` (`collection.service.ts:152-162`, `:182-191`). Auto Move builds a second one 3 s later (`auto-move.service.ts:154`). For a 4 KB note that is cheap, for a bulk pass it is an extra full-body tag scan per note.
- `collectionStore.propertyIndex` holds a record for every Markdown note (built by `buildPropertyIndex`, patched by `applyPropertyDelta`, `collection.service.ts:128-148`). A bulk pass can evaluate every rule against these records with zero disk reads and read a file only for the notes that match and need a write. The TS and Rust projections are kept identical by a golden fixture (`collection.logic.ts:45-52`: `src-tauri/tests/fixtures/note-record-projection.json`), so a rule matches the same way on a Rust-projected record as on a `buildNoteRecord` record, with ONE exception below.
- Difference to design around: Auto Move builds its record with `mtime = ctime = Date.now()` and `size = 0` (`auto-move.service.ts:154`; defaults of `buildNoteRecord`, `collection.logic.ts:22-28`). The evaluator exposes `file.size`, `file.ctime`, `file.mtime` (`evaluator.ts:201-203`). So a rule on `file.size` or `file.mtime` evaluates differently on save (fake values) than in a bulk pass over the index (real values). Same note, different match. A shared core must pick one source of file metadata. The index record (real stat values, per `existing?.mtime` in `updateNoteInIndex`, `collection.service.ts:154-160`) is the correct one; the Auto Move behavior is a latent inconsistency, not something I verified to be reachable in practice (no rule in the repo's tests was checked).
- Staleness of the index record: the TS record is refreshed synchronously on `save`, `edit` and `watcher` sources through the consumer fan-out (policy table `note-change.service.ts:89-99`), and from Rust deltas after the throttled refresh. It is NOT refreshed for a path that was just renamed (section 3.3).

### 2.4 Evaluation by trigger

| Trigger | Evaluations per user action | Source of content | Note |
|---|---|---|---|
| On save | one per note per 3 s quiet period (Auto Move's `debounceMs`, default 3000, `settings.store.svelte.ts:112`, per scout 06) | the `content` captured by the observer | the observer sync part is a few checks (`auto-move.service.ts:97-125`) |
| On property change | one per frontmatter edit if the trigger is the 500 ms frontmatter autosave; one per keystroke if it hooks the editor content change (`onContentChange`, `editor.service.ts:254-257`, fires on EVERY keystroke) | in-memory tab content | a per-keystroke evaluation must be gated on "frontmatter text changed", see 2.5 |
| On create | one | content the creator just wrote | creators call `applyNoteChange('create'/'fs')`, no after-save observer (scout 06 section 3.3) |
| On rename / move of a note | one | read from disk (see 3.3) | `pathChanged(from, to)` carries no content (`path-change.service.ts:48`) |
| On rename / move of a FOLDER | one per child note | read from disk | `pathChanged` fires ONCE for the folder, not per child (`path-change.service.ts:42-45`); the child list is a private snapshot inside `applyPathChange` (`:149-151`) and is not passed to consumers |

### 2.5 Cheap pre-filters worth having

These are design options, not existing code, except where cited.

- Rule dependency set. `collection.logic.ts` already walks the AST to answer "does this expression cite `archived`" (`astCitesArchived`, `:270`, `:300-312`). The same walker can compute per rule: which identifiers it reads, whether it reads `file.*`, whether it reads `tags` (the only record key derived from the body, `collection.logic.ts:69`). Then:
  - a property-change trigger skips every rule whose identifiers do not include a changed key;
  - a save whose raw frontmatter substring is byte-identical to the previous one skips every rule that reads only frontmatter keys. The substring comparison is the same key the YAML LRU uses (`properties.logic.ts:223`), so the "previous frontmatter" can be a one-entry-per-path map of strings. Memory: one frontmatter string per open or recently saved path; not measured, and the indexing doc quotes ~50 B per path only for the dedupe map's signature (rule 8), which stores full content, so that number is not comparable.
  - `file.folder` / `file.name` rules need to run on rename/move only, not on every save.
- Skip lossy frontmatter once (cheap string checks) before building anything: `detectLossyFrontmatter(content)` (`auto-move.service.ts:203`, precedent at `:201-207`). It is called per evaluation; `properties.logic.ts` implements it, its cost was not read.
- Skip when the note is in the excluded folders list: that check is prefix matching over `excludedFolders` per save (`auto-move.logic.ts:41-63`), O(E) lowercase comparisons, no allocation beyond the lowercase strings.

## 3. Index constraints (rules 1-12 applied)

### 3.1 What the engine may read

- Rule 1: vault metadata lives in Rust `VaultIndex`; the TS side does not mirror it, with documented caches. The rule engine must not grow a second mirror. It should read `collectionStore.propertyIndex` (an existing TS projection, rule 12 calls the QueryJS snapshot "a cache, not a mirror") or the note's own content. It must not add a new per-path store of record snapshots.
- Rule 12: the Rust entries snapshot is a cache served up to ~2 s after an isolated event and up to 10 s during a burst (`REFRESH_DELAY_MS = 2000`, `REFRESH_MIN_INTERVAL_MS = 10_000`, `tauri-listeners.service.ts:106-109`, and the long comment `:120-174`). A bulk pass that reads `getVaultEntries()` / `propertyIndex` therefore sees rule writes made seconds ago only after the refresh. Evaluate on the record built from the content just written, not on a re-read of the index, when a pass chains rules (rule A sets K, rule B matches K). The `requestPromptIndexRefresh()` escape hatch exists (`tauri-listeners.service.ts:~290`, rule 12) but is for user clicks; a bulk pass should not call it per write.
- Consumers that run before the bump keep a direct `invoke` (rule 12). A rules engine that runs at vault open (a "catch up" pass) is such a consumer and must not read the memoized snapshot before `markIndexReady()`.

### 3.2 What the engine must not own

- Rule 6: `applyNoteChange` is the ONE owner of "a note's bytes changed". The engine never calls `update_note_in_index`, `update_search_index_file` or the per-file updaters. It writes through `updateNoteFrontmatter`, which reaches `applyNoteChange` via `notifyAfterSave` (open tab: `saveFileByPath` -> `writeTab` -> `notifyAfterSave`, `editor.service.ts:187-197`; closed note: `frontmatter-write.service.ts:161`). The raw-write ratchet test enforces the writer (`raw-write-ratchet.test.ts`, per scout 06).
- Rule 6, sub-point: `save` must stay synchronous (`note-change.service.ts:190-193`, rule 17). The engine must not await inside `notifyAfterSave`; it defers with a timer like Auto Move and the mods host.
- Rule 6, sub-point: "Forgetting the registration is a SILENT no-op." A property-change or create trigger implemented as a `NoteChangeConsumer` must be registered in `initializeVault` and unwound in `teardownVault` (`app-lifecycle.service.ts:258-270`, `:589-590`), and must not import into `core/`. The consumer interface is `upsert(path, content)`, synchronous, and does not expose the source (`note-change.service.ts:26-33`). It also fires for the debounced `edit` source on unsaved keystrokes (1 s, `index-updater.service.ts`, `edit` row of `SOURCE_POLICY`), so a consumer-based trigger would evaluate on unsaved content; it needs the source or a different seam. Auto Move deliberately uses the after-save observer instead.
- Rule 8: the dedupe map. A rule write changes bytes, so `markIndexed` records the new content and the next identical `save` skips the TS consumers (`note-change.service.ts:229-233`). Fine. The engine must never call `clearIndexedEntry` or `isAlreadyIndexed` itself.
- Rule 7: frontmatter-only edits use the 500 ms timer, body edits 2000 ms, mutually exclusive (`editor.service.ts:227-251`). A rule write through `updateNoteFrontmatter` on an open tab uses `'none'` and saves at once (`frontmatter-write.service.ts:132-133`), so it flushes the user's pending body edit early: an extra save, snapshot and reindex mid-typing (scout 06 section 4.3).
- Rule 10: semantic embedding skips unchanged chunks by content hash, and the chunker strips YAML frontmatter before chunking (`chunker.rs:53-65`, `skip_frontmatter` at `:409-423`; test `chunk_strips_frontmatter` at `:789`). So a frontmatter-only rule write yields `plan.is_noop()` in `update_semantic_file` (`semantic.rs:1331-1338`): no ONNX inference, only `get_chunk_hashes_for_path`, a hash comparison and `update_stored_mtime`. The "~200-500 ms saved per save" in rule 10 is the doc's number for the avoided inference. The leg is not free (a SQLite read and a stored-mtime write per write) but it is cheap and bounded.
- Rule 11: the properties parse cache, capacity 16, covered in 2.2.

### 3.3 Rename and move specifics

- After `diskOp`, `applyPathChange` calls each path-change consumer synchronously, rewrites links, then re-keys Rust (`rename_note`) and FTS/semantic (`rename_in_search_index`), then `forgetNote` on the OLD paths (`path-change.service.ts:145-236`). `forgetNote` fan-outs a removal to the TS consumers, so `collectionStore` drops the old key (`collection.service.ts:189`). Nothing upserts the NEW path into `collectionStore.propertyIndex`; the record for the new path appears only when the next `vault-index-updated` refresh patches it (`applyPropertyDelta`, up to ~10 s later in a burst, `tauri-listeners.service.ts:106-109`). Verified by reading `applyPathChange` end to end; I did not run it. Consequence: a rename/move trigger that looks the note up in `propertyIndex` right after the move will miss. It must read the file from disk (as Issue 02 of the spec already implies) or build a record from the content. A rename changes `file.name`, `file.basename`, `file.folder` (`resolveDestination` reads `record.basename`/`record.folder`, `auto-move.logic.ts:107-122`), so a rule on those fields must be re-evaluated.
- A folder rename or move is one `pathChanged(from, to)` for the folder (`path-change.service.ts:42-45`). To evaluate its children the engine must enumerate them itself: prefix scan over `collectionStore.propertyIndex` keys on `from + '/'` (precedent: `followViewIndexPathChange` iterates `collectionStore.viewIndexPaths()` and tests `path.startsWith(prefix)`, `collection.service.ts:193-205`). That is O(N) over indexed notes per folder move, once. After `forgetNote` the old keys are gone, so the scan has to run in the synchronous `pathChanged` callback, before `forgetNote`, or use the new prefix against the Rust-patched index later. Order matters and is easy to get wrong.
- The rule write after a rename touches the note at its NEW path. Issue 01 of the spec already encodes this ("move first, then fill", `.scratch/auto-move-default-properties/issues/01-...:` rule 2), because a write before the move would schedule an evaluation on the old path.

## 4. Write storm accounting

### 4.1 What ONE rule write costs on a closed note (verified by reading each leg)

| Leg | Where | Calls |
|---|---|---|
| Read file | `frontmatter-write.service.ts:121` | 1 fs IPC (`readTextFile`) |
| Existence check | `:143` | 1 fs IPC |
| Write | `:153` | 1 fs IPC (`writeTextFile`, `create: false`) |
| Mark self-save | `editor.hooks.ts:68` | none (in-memory, 15 s timer, `RECENT_SAVE_TIMEOUT_MS = 15000`, `:24`) |
| Rust VaultIndex | `note-change.service.ts:239` (`update_note_in_index`, `rust: 'always'` for `save`) | 1 IPC. Rust stats the file (mtime, ctime, size, `vault.rs:341`, `:365`), builds a `NoteEntry`, takes the index WRITE lock, compares old and new entry (`index.rs:542` `changed = old_entry != Some(&entry)`), emits `vault-index-updated` when `changed` (`vault.rs:372-382`) |
| TS consumers | `fanOut('upsert')` (`note-change.service.ts:268`): collection (`buildNoteRecord` again, `collection.service.ts:182-191`) and file-icons (`updateFrontmatterIconForFile`, early-skip when the icon is unchanged, `file-icons.service.ts:240-256`) | 0 IPC, CPU on the main thread |
| Content invalidation | `notifyContentInvalidated()` (`editor.hooks.ts:83`) | 0 IPC; marks backlinks unlinked-dirty, clears the QueryJS cache and the kanban linked-content cache (`boot.ts:39-41`). Re-rendering of open QueryJS blocks after the clear is not measured. |
| Observers (sync part) | `editor.hooks.ts:85-91` | |
| File History | `file-history.service.ts:190-197` -> `save_snapshot` | 1 IPC. SHA-256 of the full content, dedupe against the latest hash for the path, then `INSERT INTO snapshots (file_path, content, hash, size, created_at)` with the FULL content (`history.rs:67-88`, `history_repo.rs:29-43`). Plus, when `snapshotBackupEnabled`, up to 3 fs calls (`exists`, `mkdir`, `writeTextFile`, `file-history.service.ts:129-160`) |
| Search (FTS5) | `search.service.ts:300-324` -> `update_search_index_file` | 1 IPC; one transaction that DELETEs the row and re-INSERTs it from the whole content (`search_index.rs:228-231`, `index_entry` at `:305-315`). There is no hash skip on the FTS leg. |
| Search (semantic) | `update_semantic_file` | 1 IPC; frontmatter-only change is a no-op plan (3.2) |
| Auto Move | re-arms the per-path 3 s timer (`auto-move.service.ts:113-125`) | the re-evaluation converges (scout 06 section 5) |
| Mods `onNoteSaved` | late observer, `setTimeout(0)` per mod (scout 06) | per installed mod with the hook |
| Todoist | 5 s timer if sync enabled and the note has an anchored line (scout 06) | |

Minimum count on a closed note: 3 fs + 1 index + 1 snapshot + 2 search = 7 IPC. With backup enabled, up to 10. On an open tab the read/exists legs drop out, and `saveFileByPath` writes through `writeTextFile` (1 fs call, `editor.service.ts:194`), giving 5 IPC plus the `syncExternalContentToEditor` work.

I counted calls from the code. No latency per call was measured. ADR-0018 line 13 uses "3 ms per round-trip" explicitly as an illustrative figure ("Even at 3 ms"); do not treat it as a benchmark.

### 4.2 Downstream of the Rust event

- `vault-index-updated` -> throttled refresh -> `get_index_delta(paths)` -> patch of the entries memo, `typeDefinitionsStore`, content order, `collectionStore` property index (`tauri-listeners.service.ts:219-266`). Cost is per distinct changed path in the window, with a hard switch: a window above `INCREMENTAL_REFRESH_MAX_PATHS = 200` paths takes the whole-vault `fullRefresh` (`buildPropertyIndex` + `getVaultEntries`, `:106-116`, `:268-275`). The doc comment records why that fallback is bad: "Two whole-vault payloads deserialized on the main thread per one-note save stalled it (Issue 65)" (`tauri-listeners.service.ts`, comment above `registerVaultIndexUpdatedListener`). So a bulk pass touching more than 200 notes inside one refresh window flips the app into the expensive path once. The window length is at least 2 s and, during a burst, at most 10 s between refreshes (`:106-109`, `:277-289`), so a pass that writes ~20 notes per second crosses 200 inside one 10 s window; a pass slower than ~20 notes per 10 s does not.
- `directory tree`: `publishContentOrder` calls `loadDirectoryTree` only when the content order changed (`tauri-listeners.service.ts:~200`); a frontmatter write does not change it unless the rule changes something the order depends on (not verified which keys feed `buildContentOrderMap`).

### 4.3 History growth

File History inserts one full-content row per distinct content (`history_repo.rs:37-39`). ADR-0021 states the cost model: "At ~10 KB average note size ... 50 new snapshot-worthy versions per day across 1 800 notes would accumulate ~500 MB/year of history ... not pruned by default" (`docs/adr/0021-file-history-sqlite-snapshots.md:49`, `:64`). A retention command exists (`cleanup_history(retention_days)`, `history.rs:147-165`). Implication: a one-time bulk pass over N notes adds N full-content rows (the "before" content is kept by the previous row, so the pass adds the "after"). Using ADR-0021's own ~10 KB average, 1 800 notes is about 18 MB for one pass; that arithmetic is mine from the ADR's figure, not a measurement.

It is also the safety net: the snapshot of the pre-write content is already in History from the user's last save, so a bad rule can be undone per note from History. Skipping snapshots for rule writes would remove that net; I do not recommend it.

### 4.4 Loop and echo amplification

- A rule write re-fires every after-save observer including Auto Move itself (scout 06 section 5). Convergence relies on `next === base`. Each non-converging cycle costs the full row of 4.1. A volatile "always set" value (timestamp, counter) costs 7+ IPC, a history row and a reindex per cycle, every 3 s per note (debounce), plus the 500 ms/2000 ms autosave re-arm. This is the single biggest performance hazard in the feature; scout 06 listed the guard options (forbid, or an origin flag).
- Two rules writing the same key differently ping-pong forever without first-match-wins or a cap.
- Frontmatter serialization that is not byte-stable (quoting/ordering) would defeat the `next === base` check; an in-memory semantic comparison before calling the writer ("would any value change?") is safer. `rebuildContent` byte stability was not verified (`properties.logic.ts` not read for this). ADR-0029 (frontmatter YAML canonical form) is the likely authority; not read.

## 5. Watcher echo

Verified chain:

1. The native watcher debounces 500 ms from the last real event and emits one `vault-files-changed` per burst (ADR-0031 item 3, `watcher.rs:38`). The ADR gives worst-case event-to-UI latency "~800 ms: 500 ms in Rust plus the 300 ms lifecycle debounce at `app-lifecycle.service.ts:333-344`" (ADR-0031 consequences section).
2. `rebuildAllIndexes(changedPaths)` (`watcher-handler.service.ts:33`) drops directories and mod code, then skips when `changedPaths.length > 0 && (filePaths.length === 0 || areAllRecentSaves(filePaths))` (`:48-51`). Recent-save markers are set by `markRecentSave`, called from `notifyAfterSave` and by creators (`editor.hooks.ts:37-44`, `:68`), with a 15 s TTL because "macOS watcher events from a single save can span 10+ seconds" (`editor.hooks.ts:19-23`). The markers are not cleared on consumption (`watcher-handler.service.ts:46-47`).
3. Otherwise: 1-10 Markdown files take the incremental path (`INCREMENTAL_THRESHOLD = 10`, `:13`): one `read_files_batch` then `applyNoteChange({source: 'watcher'})` per file, with `vaultPath` so FTS5 and semantic are updated too (`:100-123`). The `watcher` policy runs consumers and Rust `always`, so each echoed file repeats the index IPC and the FTS5 rewrite (`note-change.service.ts:92`). A dedupe hit does not help: `watcher` is `consumers: 'always'`.
4. More than 10 Markdown files: FULL rebuild: `rebuildIndex()` (`scan_vault_v2_cached`, mtime reconciliation, emits a `fullRescan` update), `buildPropertyIndex()`, `buildFrontmatterIconIndex()`, `notifyContentInvalidated()` (`watcher-handler.service.ts:77-90`). ADR-0017 records "~400 ms full rescan" on a "1 870-note vault" for the old JS watcher's rescan (`0017...md:37`); that number is for the legacy design and is a rough scale only. The full rebuild also produces a `fullRescan` payload, which makes the listener run the whole-vault reads (`tauri-listeners.service.ts:268-275`).

What this means for the rules engine:

| Writer | Marks self-save? | Echo outcome |
|---|---|---|
| `updateNoteFrontmatter`, any note | yes, through `notifyAfterSave` | skipped when all paths in the batch are recent saves, but only while the markers live (15 s) |
| A Rust bulk writer like `propagate_type_rename` (`vault.rs:397-441`, `write_atomic` then `update_note_in_index_inner`) | no | watcher echo of N files; N > 10 means full rebuild on top of the one `vault-index-updated` the command already emitted. The `*.tmp-<digits>-<digits>` temp files of `write_atomic` are filtered by `is_write_atomic_temp` (indexing doc rule 5), the renamed result is not. |
| A bulk pass over a long window | yes per write | a batch is skipped only if EVERY path in it is marked. A mixed batch (one rule-written note plus one real external edit) is not skipped; the incremental path then also re-reads the rule-written note once (cheap, but the FTS5 rewrite repeats). A bulk pass longer than 15 s is fine: each batch contains recently written paths. The risk is a delayed OS event arriving after the marker expired, which falls into the full rebuild only if more than 10 such stragglers sit in one batch; not measured. |

Design constraint: if any bulk writer bypasses `updateNoteFrontmatter`, it must call `markRecentSave(path)` for every path it wrote, exactly as creators do (`editor.hooks.ts:29-36` doc comment: "should also be called directly when creating files outside the normal save flow"). Forgetting it is a silent regression: no error, just a full rebuild and a whole-vault refresh after every bulk pass.

## 6. Bulk "apply rules to existing notes"

### 6.1 Candidate selection (no disk)

1. Take `collectionStore.propertyIndex` (`Map<path, PropertyIndexRecord>`), complete after `buildPropertyIndex` (`collection.service.ts:100-148`). It only exists when `collectionStore.isIndexReady` and the last whole read did not fail (`propertyIndexNeedsWholeRead`, `:153-157`); a pass must refuse to run, or wait, otherwise.
2. Skip `.view` and non-Markdown paths, skip excluded folders, apply any folder/type scope the user chose.
3. For each record, evaluate each compiled rule once against the record. This is O(N x R) pure CPU with zero IPC, using precompiled ASTs. No benchmark exists in the repo for N x R evaluation. The only per-file figure available is "~5-15 ms" for the whole per-file consumer fan-out (`index-updater.service.ts` comment, ADR-0009), which includes more than the rule engine; so the evaluation pass alone is expected to be below that per note but this is an inference, not a measurement. The pass should yield to the event loop between chunks (`yieldToEventLoop` precedent, `note-change.service.ts:164`, uses `setTimeout(r, 0)`).
4. Keep only the notes where at least one action would change something ("fill if missing" and the key is already present, or "always set" and the value is already equal, are no-ops). This is the same semantic check as in 4.4 and it prevents a bulk pass from reading and rewriting notes it would not change.

### 6.2 Write shapes

| | A. TS loop over `updateNoteFrontmatter` | B. One Rust command (precedent `propagate_type_rename`) |
|---|---|---|
| Open tabs and unsaved edits | handled: patches tab content and saves (`frontmatter-write.service.ts:131-140`) | not handled: Rust sees disk only. `renameType` rewrites open tabs TS-side FIRST for exactly this reason (`type-definitions.service.ts:215-240`) |
| Index (VaultIndex) | per note through `notifyAfterSave` | one write lock for the whole loop, `UpdateResult::absorb` folds N results into one `vault-index-updated` (`vault.rs:411-440`, `:464-474`) |
| TS consumers (collection, file icons, QueryJS invalidation) | per note | none; they catch up only through the throttled delta refresh. `propagate_type_rename` does not call `applyNoteChange`. Icons (`_icon`, `_color`) in `fileIconsStore.frontmatterIcons` would not update until a rebuild |
| FTS5 / semantic | per note | none in the precedent (`update_note_in_index_inner` only, `vault.rs:432-433`). Frontmatter text may be part of the FTS5 `content` column (`index_entry` passes the full `content`, `search_index.rs:305-315`); whether the FTS tokenizer or `insert_entry` strips frontmatter was not verified. If it does not, FTS goes stale for the touched keys until the next reconcile (mtime based). |
| File History | one full-content snapshot per note | none; the pass would bypass the undo net |
| Watcher echo | suppressed per path by the markers | not suppressed unless the command's caller marks every path; N > 10 triggers the full rebuild (section 5) |
| Atomicity / lock | per note, independent; a failure leaves earlier notes done | one pass, one lock, per-file failures logged and skipped (`vault.rs:412-431`) |
| Cost scale | per note: 7 IPC minimum (4.1) | one IPC |

Recommendation from the performance lens only: A, because B drops History, the TS consumers and open tabs and each of those is an invariant (rule 6: "ONE owner"). B becomes attractive only if the owner's vaults make A unacceptably slow, which cannot be answered from this repo (no measurement). Surfaced as an open question.

### 6.3 Making A cheap enough

- Sequential, concurrency 1 (the owner's machine runs one heavy check at a time; writes to different closed notes do not race, but `saveTails` serialization and the 16-slot parse LRU both assume light parallelism). The per-path serialization requirement is in scout 06 constraint 3.
- Yield between notes so the main thread is not starved (the same reason the `edit` row yields, `note-change.service.ts:263-266`).
- Stay under the refresh window ceiling: if the candidate count can exceed `INCREMENTAL_REFRESH_MAX_PATHS = 200` per 10 s, chunk with a pause so the listener keeps the incremental branch (a throttle of one note per ~50 ms keeps a window under 200 at 10 s; the 50 ms is my arithmetic from 10 s / 200, not a measured sweet spot).
- Coalesce what can be coalesced and is safe: `notifyContentInvalidated()` runs once per write (`editor.hooks.ts:83`) and clears the QueryJS and kanban caches N times. A batch scope that fires it once at the end would require changing core, which the owner has said not to do for rare cases (memory: no core changes for corner cases). A bulk pass is not rare for a feature whose name is "apply to existing notes", but the cost of N cache clears was not measured; do not change core on a guess. Flag it as an open question.
- Show progress and a cancel; report "N notes would change" before writing (a dry run is free given 6.1).
- Never run the pass while the vault is initializing (`markIndexReady` precondition, rule 12).

### 6.4 Active tab and the caret blocker

The one open tab the user is typing in is the only place where a rule write is visible mid-keystroke. `.scratch/open-itens/issues/001-caret-selection-follow-their-text-when-frontmatter.md` (cited in the goal) applies to a bulk pass too if it reaches the active tab. A bulk pass should skip the active dirty tab, or defer it until 001 lands. Verified from the spec Issue 01 text; the underlying `syncExternalContentToEditor` behavior is in `editor.service.ts:71-92` (it bumps `externalContentSignal`; the caret handling itself I did not read).

## 7. Constraints a design must respect (checklist)

1. Parse each rule expression once; recompile on config change only (2.2). Do not reuse `evaluateExpression` in a hot loop as is.
2. Gate before building: master switch, no rules, `.view`, excluded folders, frontmatter-unchanged for frontmatter-only rules, lossy frontmatter (2.5).
3. Use one source of file metadata for the record, preferably the index record's real values; Auto Move's `Date.now()`/`size 0` record differs from index records for `file.*` rules (2.3).
4. Decide "would anything change" on the in-memory record before calling `updateNoteFrontmatter`; the writer's `next === base` early return is a backstop that still costs a read on a closed note (4.4).
5. Never write outside `updateNoteFrontmatter` unless every path is `markRecentSave`d and the layers in 6.2 are accounted for (5, 6.2).
6. Serialize writes per path across ALL triggers; one shared per-path queue or debounce map, not one per trigger (scout 06 constraint 3).
7. Keep `notifyAfterSave` synchronous; the engine defers with a timer and catches its own async errors (rule 6/17, scout 06 constraints 1-2).
8. Register any note-change or path-change consumer in `initializeVault` and unwind in `teardownVault`; a missing registration is a silent no-op (rule 6).
9. A rename or move trigger reads from disk (or builds a record from content), not from `propertyIndex`, because the new path is not in the TS index until the next delta (3.3). A folder move needs the engine to enumerate children itself.
10. Cap or forbid non-converging writes (volatile values, conflicting rules) because each cycle costs the full 4.1 row plus a history row (4.4).
11. Bulk pass: keep the vault-index-updated window under `INCREMENTAL_REFRESH_MAX_PATHS = 200` or accept one whole-vault refresh (4.2); skip the active dirty tab until 001 lands (6.4); dry-run first (6.3).
12. Do not add a new TS mirror of vault metadata (rule 1) and do not move caches into the rules store beyond compiled ASTs and a bounded previous-frontmatter map.

## 8. Not verified

- No timing of any kind: expression parse/evaluate, `buildNoteRecord`, a full rule write, the QueryJS re-render after `notifyContentInvalidated`. The repo has no benchmark for the expression engine (searched `src/lib/features/collection/expression/` and the docs listed; did not search `src/tests` for perf tests).
- Whether the FTS5 insert (`fts_repo::insert_entry`) strips frontmatter, and so whether a Rust-only bulk writer would leave FTS stale for frontmatter keys.
- `rebuildContent` byte stability and `detectLossyFrontmatter` cost (`properties.logic.ts`, only grepped for the cache).
- Which keys feed `buildContentOrderMap` (so whether a rule write can force `loadDirectoryTree`).
- Whether the mods host or `SemanticIndexStatus` add per-write cost beyond what scout 06 listed.
- `isModCodePath` and the watcher's behavior for delayed events older than 15 s with more than 10 stragglers.
- Real-world vault sizes: the only sizes in the docs are the "1 870-note vault" in ADR-0009/0017/0018 and the "1 800 notes" in ADR-0021. The owner's actual note count is unknown to me.
- Whether any existing test pins the number of IPC calls per save.

## 9. Questions only the owner can answer

1. Vault scale: roughly how many notes, and how many would a typical "apply to existing notes" pass touch (10, 100, 1 000+)? It decides between a TS loop (A) and a Rust command (B), and whether the 200-path refresh ceiling matters.
2. Is it acceptable for a bulk pass to add one History snapshot row per touched note (about 10 KB each by ADR-0021's average)? The alternative, skipping snapshots for rule writes, removes the per-note undo.
3. Should "apply to existing notes" run only on demand (a button with a dry run and a count), or also automatically when a rule is created or edited? Automatic runs on edit would repeat the pass on every keystroke in the rule editor unless debounced; I assume on demand.
4. May the bulk pass skip the active dirty tab (or defer it) until the caret blocker 001 is fixed?
5. Is a measured baseline wanted before the design is fixed (for example, timing a save with 1, 10 and 50 rules on a 1 800-note vault), given that every number above is derived from code reading? If yes, that is a separate task: the owner's machine would have to run it.
6. Are volatile "always set" values (timestamps, counters) in scope? If yes, an origin guard is mandatory for performance, not just correctness (4.4).
