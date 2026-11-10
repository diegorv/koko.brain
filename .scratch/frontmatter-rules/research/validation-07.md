# Validation 07: scout 13 (performance / indexing) and scout 14 (prior art)

Adversarial pass over `scout-13-performance-indexing.md` and `scout-14-prior-art-web.md`. Both reports exist. Read-only; code read at HEAD `2e2cc5b60`. Nothing was run, built or timed. For scout 14, three primary sources were re-fetched (Auto Note Mover `main.ts`, Notion database automations, Auto-Properties listing, Conditional Properties README); the rest of scout 14 was checked for internal consistency and against Kokobrain code where it makes claims about Kokobrain.

## 1. Refuted

### R1. "A frontmatter-only rule write yields `plan.is_noop()` in `update_semantic_file`" (scout 13 section 3.2, rule 10 bullet)

Wrong for the main case of this feature. Semantic chunk keys carry the absolute `line_start` (`src-tauri/src/semantic/update_plan.rs:4-6`: "Chunk keys carry the absolute `line_start` ... a newline above a section re-keys every later chunk"). `is_noop()` is true only when every chunk keeps its key AND hash (`update_plan.rs:31-33`, `:52-55`). The chunker skips frontmatter but keeps absolute line numbers (`chunker.rs:65`, `window_chunks(path, &lines[start_line..], start_line, ...)` at `:71`). So:

- "Fill if missing" adds a key: frontmatter grows by one line, every chunk is re-keyed, the plan is `reuse` + `delete` for every chunk of the note (no ONNX inference, but a vector copy and row rewrite per chunk, `semantic.rs:1340-1350` onward).
- The canonical rewrite (R3) can also change the frontmatter line count (block list to flow list), with the same effect.
- Only an in-place value change that keeps the line count is a true no-op plan.

Correct statement: a frontmatter-only write never runs inference (hashes match), but it is a DB rewrite of all chunk rows of the note whenever the frontmatter line count changes. Cost per row not measured.

### R2. "History is the safety net: the snapshot of the pre-write content is already in History from the user's last save" and "a bulk pass adds N full-content rows ... the 'before' content is kept by the previous row" (scout 13 sections 4.3, 6.2)

Refuted on three counts:

1. Snapshots are taken ONLY by the after-save observer (`file-history.service.ts:192-197`; `saveSnapshotForFile` has no other caller, grep of `src/lib`). The watcher path calls `applyNoteChange({source: 'watcher'})` and never `notifyAfterSave` (`watcher-handler.service.ts:115-119`), so externally edited, synced or git-pulled notes have no "before" row. Creators also do not snapshot (they use `applyNoteChange('create'/'fs')`, per scout 06).
2. History is pruned at every vault open with default retention: `cleanup_history({ retentionDays })` (`app-lifecycle.service.ts:287-291`), default `retentionDays: 7` (`settings.store.svelte.ts:104`). `cleanup_history` deletes every row older than retention + 30 days, including the latest one for a path (`history.rs:153-167`, `history_repo.rs:82-89` `DELETE FROM snapshots WHERE created_at < ?1`). A note not saved in-app in the last ~37 days has no row at all.
3. History can be off: the hook is registered only when `settingsStore.history.enabled` (`app-lifecycle.service.ts:280-285`).

So for a bulk pass most notes get only the "after" row; the pre-write content is not recoverable from History. ADR-0021's "not pruned by default" (`docs/adr/0021-file-history-sqlite-snapshots.md:49`) is stale against the code; scout 13's growth arithmetic (~18 MB permanent) is transient (pruned within ~37 days), and the "undo net" claim does not hold.

### R3. "`updateNoteFrontmatter` already returns before any write when `next === base`", used as the convergence / no-op guarantee (scout 13 sections 1.4, 4.4; scout 14 section 3.3 "writing the same value should be a no-op write")

The early return exists (`frontmatter-write.service.ts:128-129`), but `next` is the CANONICAL serialization, not the original bytes. `serializeProperties` emits lists as flow style always (`properties.logic.ts:610-614`), re-quotes changed scalars by ADR-0029 rules and coerces `key:` / `key: null` to `key: ""` (`docs/adr/0029-frontmatter-yaml-canonical-form.md`, "Empty values" and "Lists"). Unchanged scalars keep their source token (`properties.logic.ts:616-619`), lists and nulls do not. Consequence: a `mutate` that changes nothing semantically still writes a note whose YAML is non-canonical (block lists, `key:` empties). It converges after one write (the result is canonical), so this is not an infinite loop, but:

- a "no-op" rule evaluation on a hand-written note rewrites unrelated lines (diff noise, a History row, an FTS rewrite, a semantic re-key per R1);
- the in-memory "would anything change" check that scout 13 recommends (constraint 4) is REQUIRED, not an optimization, if the owner does not want rules to reformat notes they did not change.

Scout 13 listed `rebuildContent` byte stability as "not verified"; it is now verified as not byte-stable for non-canonical input.

### R4. "Keep only the notes where at least one action would change something", decided on `collectionStore.propertyIndex` records (scout 13 section 6.1 step 4, constraint 4)

The index record is not the frontmatter. `projectDerivedProperties` (`collection.logic.ts:53-77`) rewrites and adds keys: `_type` is case-normalized (`:56-59`), `organized` / `archived` / `favorite` are always present with defaults (`:63-65`), `tags` is always present and merges inline body tags (`:69`), and `_belongs_to` / `_related_to` / `_has_many` become arrays of wikilink targets (`:73-76`). The Rust projection is pinned identical by the golden fixture (`:45-52`), so it has the same shape. Deciding "missing" or "already equal" on that record gives wrong answers:

- fill-if-missing `tags`: never "missing" on the record (always set, possibly `[]` or inline-only tags);
- always-set `_belongs_to: "[[AWS]]"`: the record holds `["AWS"]`, so the value always looks different and the note is rewritten every pass;
- always-set `_type: person`: the record holds `Person`, so it looks equal while disk differs.

Correct approach: match on the record (that is what the expression engine reads), but decide the action outcome on `parseFrontmatterProperties(content)` of the actual bytes, on the canonical key (Issue 01 rule 4 already says "canonical key", `.scratch/auto-move-default-properties/issues/01-...md:31`). A bulk pass can still pre-filter on the record for keys the projection does not touch.

### R5. Citation "rule 17" for "save must stay synchronous" (scout 13 sections 3.2 and 7 item 7)

`docs/agents/indexing-watcher-rules.md` has 12 rules. The cited text is rule 6, third sub-bullet (`indexing-watcher-rules.md:17`, line 17 of the file, not rule 17). The substance is right (`note-change.service.ts:190-193`).

### R6. Minor line drift in scout 13 (substance right, numbers off)

- `watcher-handler.service.ts`: function at `:35` (not 33), skip branch `:50` (not 48-51), full rebuild `:76-87` (not 77-90), incremental `:94-125`.
- `collection.service.ts`: `propertyIndexNeedsWholeRead` is at `:118-120` (scout says 153-157); `followViewIndexPathChange` at `:197-205`.
- `collection.logic.ts`: `evaluateFilterCached` at `:347`, `evaluateFilter` at `:317`, `astCitesArchived` at `:270` / `:282-306`.

### R7. Scout 14, Auto Note Mover: "Running after Obsidian re-parsed the file means ... the check does not run on every raw write"

Unsupported inference. Re-fetched `main.ts`: `metadataCache.on('changed', (file) => fileCheck(file))` with no debounce or timer anywhere; `fileCheck` runs synchronously per event. Whether `changed` fires less often than raw writes depends on Obsidian internals the scout did not cite. The listeners, rename guard (`oldPath.split('/').pop() === file.basename + '.' + file.extension` then `return`), first-match `break`, and the "tag and pattern both set never matches" edge are confirmed.

### R8. Scout 14 section 3.1: "No surveyed tool offers on-save, on-property-change, and on-create/move/rename in one rule engine"

True only for the ~14 tools sampled, several read from search summaries only ([S] grade, scout's own section 6). It is an absence claim over a convenience sample; do not cite it as "no prior art exists".

## 2. Confirmed key claims

Scout 13:

- `evaluateExpression` re-parses on every call: `evaluator.ts:75-78`. No cache in `src/lib/features/collection/expression/` (grep for cache/LRU: none). `parse` and `evaluate(node, ctx)` are both exported (`parser.ts:8`, `evaluator.ts:38`), so a compiled-AST core needs no engine change. The collection module already caches per query (`collection.logic.ts:158`, `:347-357`).
- Auto Move per evaluation: `buildNoteRecord(filePath, content, Date.now(), Date.now())` with `size = 0` (`auto-move.service.ts:154`, defaults `collection.logic.ts:22-28`), regenerates lifecycle rules each time (`:156`), first match wins (`auto-move.logic.ts:17-35`). The evaluator exposes `file.size/ctime/mtime` from the record (`evaluator.ts:201-203`), so the file-metadata mismatch between save-time and index records is real.
- `tags` is the only record key derived from the body (`collection.logic.ts:69`); everything else derives from frontmatter.
- Gate order in the Auto Move observer: `.view`, master switch, any rules, vault, excluded folders, then a per-path debounce (default 3000 ms, `settings.store.svelte.ts:112`): `auto-move.service.ts:96-126`.
- Write path legs: closed note `readTextFile` (`frontmatter-write.service.ts:121`), lossy check (`:125`), `exists` (`:143`), `writeTextFile(..., { create: false })` (`:153`), `notifyAfterSave` (`:161`); open tab patches content with `'none'` and saves at once (`:131-140`), which flushes pending body edits (`editor.service.ts:187-204`, `saveFileByPath` writes the whole tab content).
- `notifyAfterSave` order: `markRecentSave`, `applyNoteChange('save')` with NO `vaultPath`, `notifyContentInvalidated`, then observers (`editor.hooks.ts:67-92`). FTS5 and semantic on save come from the search after-save observer (`search.service.ts:301-330`), not from the owner, matching rule 6.
- Per-source policy table (`note-change.service.ts:89-99`); `watcher` is `consumers: 'always'` so a dedupe hit does not help echoes (`:92`, `:230`).
- Rust `update_note_in_index` stats the file, takes the write lock, emits only when `result.changed` (`vault.rs:341`, `:358-383`; `index.rs:542`).
- FTS5 leg: one transaction DELETE + INSERT of the whole content (`search_index.rs:216-232`, `:305-315`); no hash skip. Scout's open question "does FTS strip frontmatter" is now answered: no. `insert_entry` stores the raw `content` in both `notes_content` and `notes_fts` (`src-tauri/src/db/fts_repo.rs:48-72`). A Rust-only bulk writer that skips this leg leaves frontmatter text stale in text search.
- File History: SHA-256 dedupe against the latest hash, else full-content INSERT (`history.rs:67-88`); optional backup when `snapshotBackupEnabled` (`file-history.service.ts:120-123`).
- Self-save markers: 15 s TTL (`editor.hooks.ts:24`), not consumed (`watcher-handler.service.ts:47-49`), skip only when ALL file paths are marked (`editor.hooks.ts:47-49`), incremental threshold 10 (`watcher-handler.service.ts:13`), full rebuild above it (`:76-83`).
- `propagate_type_rename`: one write lock, `write_atomic` + `update_note_in_index_inner` per member, one folded emit (`vault.rs:397-475`). `renameType` rewrites open tabs first and calls the command (`type-definitions.service.ts:221-241`) and does not `markRecentSave` member paths, so the echo claim holds.
- Refresh throttle: `REFRESH_DELAY_MS = 2000`, `REFRESH_MIN_INTERVAL_MS = 10_000`, `INCREMENTAL_REFRESH_MAX_PATHS = 200` (`tauri-listeners.service.ts:106-116`); window wait clamped to [2 s, 10 s] (`:280-283`); above 200 distinct paths, whole-vault `fullRefresh` (`:273`, `:207-217`).
- Rename / move: path-change consumers run once, synchronously, for the folder (`path-change.service.ts:176-182`); children are snapshotted from `fsStore.fileTree` before `diskOp` (`:149-151`) and are not passed to consumers; Rust `rename_note` re-keys and emits (`vault.rs:1300-1337`, `:1381-1403`); `forgetNote` on the old paths last (`path-change.service.ts:233-235`). No collection path-change consumer re-keys `propertyIndex` records (the only one is `collection-view-index`, `collection.service.ts:212-214`), so the new path appears in `propertyIndex` only after the throttled delta refresh. Scout's claim stands.
- `parseFrontmatterProperties` LRU capacity 16 keyed by raw frontmatter, clone on hit, caches failures (`properties.logic.ts:223-240`, `:266-310`).
- Doc numbers cited are quoted correctly: ADR-0009:19 "5-15 ms", `index-updater.service.ts:27`, ADR-0018:13 "Even at 3 ms", ADR-0017:37 "~400 ms", ADR-0031:49 "~800 ms".

Scout 14 (re-fetched primary sources):

- Notion: "Database automations can't be triggered by other automations"; a failing automation "will be paused" and must be re-enabled manually; triggers Page added / Property edited / Every {frequency}; ~3 s window for multiple edited triggers.
- Auto-Properties: triggers Modify / Open / Focus / Manual; "No overwrite: Skips the rule if the property already has a non-empty value"; "Auto-add: Creates the property in frontmatter if it doesn't exist yet"; V1 rules "will unfortunately be erased in the update to V2.0"; nothing documented on frontmatter writes retriggering Modify.
- Conditional Properties: manual, current file, single rule, scheduled (minimum 5 min), no on-save/edit trigger documented; rules run in list order and later rules see earlier changes in the same scan; `is empty` on a missing property returns false; Add value behaves as Overwrite for checkbox/date/datetime.
- Kokobrain-side claims in scout 14: `updateNoteFrontmatter` refuses lossy frontmatter (`frontmatter-write.service.ts:125-126`, reasons at `properties.logic.ts:380-387`), stricter than `processFrontMatter`. Kokobrain's icon resolver already uses "frontmatter icon first, then the type's icon" (`file-icons/icon-resolver.ts:57-58`), matching scout 14's recommendation 7.

## 3. Missed

1. **External edits never reach after-save observers.** The watcher path (`watcher-handler.service.ts:115-119`) does not call `notifyAfterSave`, so Auto Move today, and any rule trigger built on the after-save hook, does not fire for YAML edited in another editor, sync or git pull. The owner's "on property change (YAML edit)" is in-app only unless the design adds a watcher seam, and a watcher-triggered write is exactly the echo case (self-save marker set by the rule write, then the external batch may be mixed). Scout 14 question 4 asks the owner; scout 13 never states that the current hook cannot see these events.
2. **Volatile match conditions, not just volatile values.** The engine has `now()`, `today()` (`evaluator.ts:361-366`) and relative-date formatting from `Date.now()` (`methods.logic.ts:24-26`). A rule CONDITION using them changes its match with no event, and scout 13's "skip when frontmatter unchanged" pre-filter (section 2.5) would wrongly skip it. The dependency walker must mark these rules as always re-evaluate (or forbid them in rule conditions). Scout 13 and 14 discuss volatile values only.
3. **Two different `validateExpression` functions.** Auto Move validates by parse only (`auto-move.logic.ts:87-95`); the evaluator's version also rejects unknown functions (`evaluator.ts:306-315`). A rule with an unknown function passes Auto Move validation and throws on every evaluation (logged per save via `onError`). A compile-once core should validate with the evaluator's version.
4. **Truthiness differs between Auto Move and collection filters.** Auto Move matches on JS truthiness (`if (result)`, `auto-move.logic.ts:27`); collection filters use `toTruthy` (`collection.logic.ts:481-485`, same in `evaluator.ts:632-636`), which differs for `NaN` (JS falsy, `toTruthy` true). Collection also swallows errors as "no match" (`collection.logic.ts:355-357`) where Auto Move reports them. A shared core must pick one "match" definition; with "one engine" as a goal, `toTruthy` plus error reporting is the consistent choice.
5. **Lossy-frontmatter check is an uncached full YAML parse, run twice per rule write.** `detectLossyFrontmatter` does `parseDocument` + `visit` on every call with no cache (`properties.logic.ts:405-440`). Auto Move runs it before the icon write (`auto-move.service.ts:203`) and the writer runs it again (`frontmatter-write.service.ts:125`). Scout 13 listed its cost as unread.
6. **Writing `_order` forces a directory-tree reload.** The content order map is built from `entry.frontmatter['_order']` (`folder-notes.logic.ts:47-56`); a changed order calls `loadDirectoryTree` (`tauri-listeners.service.ts:197-205`). Scout 13 left "which keys feed `buildContentOrderMap`" unverified; the answer is `_order` only. A rule that sets `_order` on many notes pays a tree reload per refresh window.
7. **Auto Move's gate is broader than "has lifecycle rules".** `hasLifecycleRules = typeDefinitionsStore.typeMetadataMap.size > 0` (`auto-move.service.ts:101`) is true for any vault with type definitions, even when no type has `archiveTo`, so the 3 s timer and the record build run on every save in such vaults. A shared core should gate on the real compiled rule count.
8. **Closed-note writes are not serialized by the editor.** `saveTails` serializes tab saves per path only (`editor.service.ts:163-179`); the closed-note branch writes directly and the doc comment says "callers must serialize writes per path" (`frontmatter-write.service.ts:95-97`). Scout 13 constraint 6 says this but attributes it to scout 06 only; it is a documented contract of the writer.
9. **`propertyIndex` can hold unsaved content.** The `edit` source fans out to the collection consumer on a 1 s debounce of unsaved typing (`note-change.service.ts:91`, `:263-268`), so a bulk pass matching on `propertyIndex` sees an open dirty tab's unsaved values. The writer also uses tab content (`frontmatter-write.service.ts:118-119`), so the two agree, but the "candidate selection from disk-equivalent records" framing in scout 13 section 6.1 is not exact.
10. **Icons after a rename (lead, not verified).** No file-icons path-change consumer is registered (registrations listed via grep of `registerPathChangeConsumer`); `forgetNote` removes the old path from `fileIconsStore` through the note-change consumer, and nothing visible re-adds the new path before the next save, watcher batch or full rebuild. Auto Move's post-move `setIconForPath` masks this for rules with an icon. Check before relying on "icons follow a move" for a rename trigger.
11. **Throttle arithmetic edge.** Scout 13's "one note per ~50 ms keeps a window under 200 at 10 s" lands exactly at 200; the fallback is `> 200` (`tauri-listeners.service.ts:273`), so it is at the edge with no margin, and any other activity in the window (typing saves, watcher) pushes it over. Use a clear margin if the ceiling matters.

## 4. Corrections a designer must know

1. **Decide action outcomes on the note's parsed frontmatter, not on the index record.** Match with the expression engine against the record; compute "missing" / "already equal" from `parseFrontmatterProperties(bytes)` on canonical keys (R4). Never compare against `tags`, `_type`, lifecycle flags or relationship keys as projected.
2. **Skip the writer call entirely when no action changes a value.** `next === base` is not a semantic no-op check: the writer canonicalizes YAML (flow lists, `""` for empties), so calling it with nothing to do reformats hand-written notes once (R3). This also decides whether "always set" with an equal value touches the file.
3. **Do not promise undo through File History.** Snapshots come only from in-app saves, are pruned at vault open (default: nothing older than ~37 days survives), and can be disabled (R2). If the owner wants a bulk pass to be undoable, the pass must snapshot the pre-write bytes itself (for example by calling the existing `save_snapshot` with the base content before writing; not built today, and that would be a design decision to put in front of the owner).
4. **Semantic cost of adding a key is a re-key of every chunk of the note**, not a no-op (R1). Cheap compared with inference, still a DB rewrite per write; matters for a bulk pass and for loops.
5. **The after-save hook does not see external edits** (Missed 1). If "on property change" must include YAML edited outside the app, that is a new watcher-side seam with its own echo rules, and should go to the owner as a scope question.
6. **Compile once with the evaluator's `validateExpression`, use `toTruthy` for matching, report errors** (Missed 3, 4). Tag rules that read `now()` / `today()` / `file.mtime` / `file.size` as volatile so no "unchanged" pre-filter skips them (Missed 2).
7. **Rename / move: read the note from disk and enumerate folder children yourself, in the synchronous `pathChanged` callback** (confirmed scout 13 section 3.3). `propertyIndex` does not hold the new path until the next delta refresh (2 to 10 s).
8. **Any writer that bypasses `updateNoteFrontmatter` must `markRecentSave` every path and run the FTS5 leg**, because FTS5 stores the frontmatter text (confirmed, `fts_repo.rs:48-72`). The precedent `propagate_type_rename` does neither.
9. **Scout 14's loop-safety assumptions transfer only partly.** Notion's "automations do not trigger automations" is a structural breaker; Issue 01 rule 6 chooses the opposite (chaining through the save). With R3 in mind, convergence in Kokobrain needs both an in-memory "nothing to change" skip and, for always-set actions with volatile values, a guard or a ban. The owner has not decided which.

## 5. Not verified

- No timings of any kind; every cost above is counted from code.
- Whether the semantic `reuse` path is measurably slower than `is_noop` (R1) was not measured.
- Missed 10 (icons after rename) was inferred from the registration list, not traced through `fileIconsStore` consumers and the tree code.
- Scout 14 sources graded [S] by the scout (MD Butler, Metadata Menu, Templater limits, forks, Tana details) were not re-fetched.
- Mods `onNoteSaved` and Todoist per-write costs (scout 13 table 4.1, from scout 06) were not re-read.
