# Scout 03: the note record the rule engine evaluates

Scope: `buildNoteRecord` / `projectDerivedProperties`, `PropertyIndexRecord`, the Rust `NoteRecord`, how Auto Move builds its record, which fields exist at evaluation time, and whether a record is cheap for a note that is not open. Read-only; nothing was run.

## 1. Summary for the design

- The engine does not see a note, it sees a `PropertyIndexRecord` (`collection.types.ts:77-96`): eight file fields plus a flat `properties` Map. There is no `links`, no `backlinks`, no body, no tasks, no word count. Everything a frontmatter rule can match on must be expressible through that Map and the `file.*` accessors.
- There are two producers of that record, and they are not identical: Rust `project_note_record` (index snapshot) and the TS mirror `buildNoteRecord` (content in hand). Auto Move uses the TS one with fake timestamps and size.
- A record for a note that is not open is cheap through three routes (section 5). The best one for "evaluate right now, off-tab" is `get_index_delta({ paths: [p] })`, which is fresh, one IPC, and returns the Rust record AND the full `NoteEntry` (links, relationships) for that one path. For content already in hand (save, create, frontmatter write), `buildNoteRecord` is synchronous and needs no IPC.
- Derived keys (`organized`, `archived`, `favorite`, `tags`, `_type` casing) and alias canonicalisation (`icon` -> `_icon`) make naive "is this key missing?" checks wrong. A fill-only-if-missing action must test the SOURCE key on the parsed frontmatter, not `record.properties`.

## 2. The record shape

`PropertyIndexRecord` (`src/lib/features/collection/collection.types.ts:77-96`):

| Field | Type | Notes |
|---|---|---|
| `path` | string | absolute |
| `name` | string | with extension |
| `basename` | string | without extension |
| `folder` | string | ABSOLUTE parent folder, no trailing slash |
| `ext` | string | with leading dot |
| `mtime`, `ctime` | number | milliseconds |
| `size` | number | bytes |
| `properties` | `Map<string, unknown>` | frontmatter + derived keys |

Rust `NoteRecord` (`src/lib/contracts/generated/NoteRecord.ts:15-57`, source `src-tauri/src/vault/entry.rs:68-113`) is the same shape with `properties: { [key in string]: JsonValue }`. `collection.service.ts:44-60` (`fromV2`, not exported) converts it to the Map. Units are already ms server-side (`commands/vault.rs:1034-1035`, `saturating_mul(1000)`).

What the evaluator reads (`expression/evaluator.ts`):

- `file.name|basename|path|folder|ext|size` straight from the record; `file.ctime|mtime` as `new Date(ms)` (`evaluator.ts:193-214`).
- `file.tags` and `file.hasTag(...)` read `properties.get('tags')` (`evaluator.ts:204, 565-571`). `hasTag` is case-insensitive, variadic "any of".
- `file.inFolder(x)` is `record.folder.toLowerCase().startsWith(x.toLowerCase())` on the ABSOLUTE folder (`evaluator.ts:572-575`); documented in `help/documentation/12-collection.md:409-424`. A vault-relative argument never matches; `contains(file.folder, "work/people")` or `file.folder.endsWith(...)` are the workable forms (the lifecycle rules use `endsWith`, `type-lifecycle-rules.ts:39,52`). A rule UI that offers "in folder" must either hand the engine an absolute prefix or add a vault-relative accessor.
- `file.hasProperty(k)` is `properties.has(k)` (`evaluator.ts:576-579`). `file.properties` is the whole Map as an object. `file.asLink()` renders `[[abs path]]`.
- Bare identifier / `note.x` / `property.x` read `properties.get(canonical(name))`; the only identifier alias is `type` -> `_type` (`evaluator.ts:93-100, 143-150`).
- Time: `now()` and `today()` are read from the wall clock at evaluation (`evaluator.ts:361-367`), not stored in the record.
- Not present anywhere in `expression/*.ts`: any link, backlink, outgoing-link, task, word-count or body accessor (grep for `links|outgoing|backlink|relationship` hits only a doc comment at `evaluator.ts:84`).

## 3. Properties: what is in the Map

Both producers apply the same projection, pinned by the golden fixture `src-tauri/tests/fixtures/note-record-projection.json` (read by `src-tauri/tests/vault_file_ops_test.rs` and `src/tests/lib/features/collection/collection.service.test.ts`). TS side `collection.logic.ts:22-77`, Rust side `commands/vault.rs:989-1039`.

1. Frontmatter keys, canonicalised. Alias table is identical in `src/lib/utils/frontmatter-aliases.ts:6-23` and `src-tauri/src/vault/aliases.rs`: `type`, `organized`, `archived`, `favorite`, `order`, `favorite_index`, `sort`, `icon`, `sidebar_label`, `sidebar label`, `color`, `title_color`, `template`, `view`, `visible`, `list_properties_display` all map to the `_`-prefixed key. TS applies it in `computeAndCache` (`properties.logic.ts`, `convertToProperty(canonicalizeKey(rawKey), value)`); Rust applies it in `project_document` (`parsing.rs:799`). Consequences for the engine:
   - Icons and colors live under `_icon`, `_color`, `_title_color` (`frontmatter-icon.service.ts:17`). `file.hasProperty('icon')` is always false and the identifier `color` resolves to null even for a note that wrote `color: red`, because only `type` is aliased in the evaluator. Rule expressions and "is it missing" checks must use the canonical names.
2. `_type`: rewritten with first-letter-uppercase (`normalizeTypeCasing`, `properties.logic.ts:812`; `entry.rs:399-406`). A bare `type:` becomes `""` on both sides (`vault.rs:1007-1010`; pinned by the "null type" fixture case). `type == "person"` is made case-insensitive in `evaluateBinary` (`evaluator.ts:263-272`); other string compares are case-sensitive.
3. Lifecycle flags `organized` (default true), `archived`, `favorite` (default false): ALWAYS present as bare keys, derived from `_organized/_archived/_favorite` booleans only (`collection.logic.ts:63-65`; `vault.rs:1012-1014`). A non-boolean source reads as the default. So `file.hasProperty('archived')` is always true; the source keys `_archived` etc. are present only when the note wrote them.
4. `tags`: ALWAYS present, REPLACED by the merged frontmatter plus inline set, deduped case-insensitively (`collection.logic.ts:69`; `vault.rs:1018`; `extractAllTags` in `utils/tag-extraction.ts:150-165` and Rust `extract_tags_strict` `parsing.rs:513-527`, documented as exact mirrors). The frontmatter-only `tags` value is not recoverable from the record. A "fill tags if missing" action cannot use the record to decide.
5. Relationship keys `_belongs_to`, `_related_to`, `_has_many`: replaced by arrays of wikilink TARGET NAMES (alias and heading stripped, not paths), set only when at least one target exists (`collection.logic.ts:73-76`; `vault.rs:1019-1027`). Absent key therefore means "no targets", whatever was written. Other relationship fields (any frontmatter key holding wikilinks) are NOT projected: in the record they are the raw `"[[X]]"` string or list; the resolved form exists only in `NoteEntry.relationships` (`entry.rs`, `relationships: BTreeMap<String, Vec<String>>`).
6. Values: strings, numbers, booleans, string lists. Dates are strings (`ISO_DATE_REGEX` only tags the Property type in `convertToProperty`, which the Map drops); the evaluator turns them into dates on comparison (`date-value.logic.ts`, doc `12-collection.md:75`). Nested mappings: dropped on TS, `null` on Rust.

### Known TS vs Rust divergences (a rule can match differently on the two paths)

From `kb-api.v1.ts:60-130` and the code:
- Nested map key: absent on TS (`hasProperty` false), `null` on Rust (`hasProperty` true).
- Bare `key:` / `key: null`: `""` on TS (`convertToProperty`, `properties.logic.ts:194-196`), `null` on Rust (only `_type` is special-cased, `vault.rs:1007`). `hasProperty` is true for both; `isEmpty()` is the form that agrees.
- List items: TS stringifies every item (`properties.logic.ts:177-182`, `[1,2]` becomes `["1","2"]`); Rust keeps numbers.
- YAML 1.2 octal `0o17` and `.inf/.nan`: different typing (documented in `kb-api.v1.ts`).
- The record a rule sees therefore depends on the trigger: save, edit, create, restore, watcher-through-consumer and frontmatter write use TS `buildNoteRecord`; a throttled delta, a whole read, or `get_index_delta` give the Rust record. The design should pick ONE producer per evaluation and not mix, or accept the list above as a documented limit.

## 4. How Auto Move builds its record today

`auto-move.service.ts:152-154`:

```
const record = buildNoteRecord(filePath, content, Date.now(), Date.now());
```

- Source of truth is the `content` string captured by the after-save observer (`auto-move.service.ts:96`), evaluated after `settingsStore.autoMove.debounceMs` (`:123`). Later saves clear and re-arm the per-path timer with newer content (`:113-125`), so the content is the latest save, but it is not re-read at fire time.
- `mtime` and `ctime` are both `Date.now()`, `size` is the default `0` (`collection.logic.ts:22-28`). So in an Auto Move expression `file.size` is always 0 and `file.ctime` is "now", never the real creation time; `file.mtime` is approximately right only because it runs just after a save. The index record has the real values (`update_note_in_index_inner` stats ctime and size, `vault.rs` near line 340). This is a latent wrong-result for any rule that uses `file.ctime` or `file.size` (for example "created more than 30 days ago"). Unverified whether any existing user rule does; the lifecycle generated rules do not (`type-lifecycle-rules.ts`).
- The record is built before the rule runs and never rebuilt; after a move the same `record` feeds `resolveDestination` (`:167`), and `{type}`/`{status}` template variables read `properties` (`auto-move.logic.ts:122-123`).
- Guards that exist: `isViewFile` and the settings flag (`:97-98`), excluded folders (`:107`). There is NO `isMarkdownFile` guard: `notifyAfterSave` is called by the editor for any saved tab (`editor.service.ts:196`), so a `.canvas`/`.kanban` save is evaluated with a content blob that has no frontmatter. Whether such a save reaches it in practice was not verified. The Collection consumer does guard (`collection.service.ts:182-191`). A new rule feature should guard on `isMarkdownFile` from the start.
- Rule matching: `findMatchingRule` (`auto-move.logic.ts:17-35`), first match wins, `evaluateExpression(rule.expression, { record, formulas: {} })`, a throwing rule is skipped and reported through `onError`. `formulas` is always empty, so `formula.x` never resolves in rules.
- Icon after move: `setIconForPath` only when `rule.icon` is set, after `detectLossyFrontmatter(content)` on the same stale `content` (`:199-214`). The check uses the pre-move content, which is fine only because a move does not change bytes.

## 5. Is the record cheap for a note that is not open?

Four routes, in order of cost.

A. In-memory property index, `collectionStore.propertyIndex.get(path)` (`collection.store.svelte.ts`, `collection.service.ts:152-162`). O(1), no IPC. It holds a Rust-projected record for every note after the whole read, and the TS consumer overwrites it on each note change:
   - Freshness: `registerCollectionNoteChangeConsumer` upserts on every `applyNoteChange` with content (sources `save`, `edit`, `watcher`, `create`, `fs`, `restore`, `task`; `note-change.service.ts:84-92`), Markdown only (`collection.service.ts:185-188`). `save` skips consumers on a dedupe hit (same path and bytes already indexed).
   - The upsert preserves `mtime/ctime/size` from the existing record, or `0` when none exists (`collection.service.ts:154-160`). A newly created note, until the next delta, has `ctime = mtime = size = 0` in this index.
   - Rust-projected values (real timestamps, Rust parser) arrive only through `vault-index-updated`, throttled: 2 s after an isolated event, at most once per 10 s in a burst (`tauri-listeners.service.ts:105-109, 281-283`).
   - After a rename or move the OLD key is dropped by `forgetNote` (`path-change.service.ts:~300`, last loop) and the NEW key is not written by `applyPathChange`. It appears only with the throttled delta. A rule triggered by move/rename cannot count on route A for the new path.
B. `call('get_index_delta', { paths: [path] })` (`commands.ts:124`, `commands/vault.rs:1088-1097`). One IPC, a read lock, no disk read, and it returns `{ entries: NoteEntry[], records: NoteRecord[] }` for the path. Fresh as of the last `update_note_in_index` (which `save`, `watcher`, `restore` and the `edit` row run before consumers). It is NOT throttled. It also gives what the record lacks: `entry.outgoingLinks` (resolved by `get_outgoing_links_v2` separately, raw in the entry), `entry.relationships`, `entry.tasks`, `wordCount`, `snippet`. `fromV2` would have to be exported or the mapping repeated.
   - For rename/move: `rename_note` re-keys the entry synchronously in Rust (`vault.rs:1300-1360`, emits the event), so after `await call('rename_note')` in `applyPathChange` (`path-change.service.ts`, the `rename_note` block) route B at the new path is exact, with the old mtime/ctime/size (rename keeps them). But `PathChangeConsumer.pathChanged` is synchronous and runs BEFORE `rename_note` and before the link rewrite (`path-change.service.ts:176-182`). A rename/move trigger therefore needs either an async/debounced evaluation that then reads route B, or a new hook after the Rust re-key. A folder move is reported once for the folder; children are not enumerated for consumers (`childPaths` is local to `applyPathChange`).
C. Read file plus `buildNoteRecord(path, content, mtime, ctime, size)` (`readTextFile` is what `updateNoteFrontmatter` already does for a closed note, `frontmatter-write.service.ts:121`). It costs a disk read and a body-wide tag regex; the caller must supply timestamps and size (no stat in `buildNoteRecord`), so it should copy them from route A or B. The frontmatter parse itself is LRU-cached by raw YAML (capacity 16, `properties.logic.ts:232-243`, rule 11 in `docs/agents/indexing-watcher-rules.md`), so building twice from the same content (record, then the writer's `parseFrontmatterProperties`) parses YAML once.
D. Open note: `tab.content` (may hold unsaved edits) through `buildNoteRecord`. The index itself only follows typing at the layout content-effect's 1 s debounce (`index-updater.service.ts`, `edit` source), and a frontmatter-only edit autosaves at 500 ms (`indexing-watcher-rules.md` rule 7), after which `notifyAfterSave` runs. So a "property changed" trigger has two natural hook points: the `save` observer (500 ms after a properties-panel or YAML edit) or a consumer on the `edit` row (1 s). Anything faster must read the tab content directly.

Cost of a build from content (route C and D, and every save-path build): one `extractRawFrontmatter`, a cached YAML parse, plus `extractAllTags` which runs two regex passes and code/comment stripping over the whole body (`tag-extraction.ts:88-100, 150-165`). The code comment in `index-updater.service.ts:25-27` quotes "about 5-15 ms of per-file parsing" for the per-file indexes; I did not measure the record build alone. For a rule set that never mentions `tags`/`file.hasTag`, `tags` could be skipped, but `buildNoteRecord` has no such option today.

Vault-wide cost: `collectionStore.updateRecord` copies the whole Map per upsert (`collection.store.svelte.ts`, `new Map(propertyIndex)`), O(N) per save and per rule-driven write. That already exists for each Auto Move icon write; a rules feature that rewrites frontmatter on many notes in a loop (for example "re-run on all notes") multiplies it.

## 6. Constraints a design must respect

1. Evaluate on a record, write through the frontmatter writer. The record is a lossy read view (types, key order, comments, aliases, nested maps are gone). Writes go through `updateNoteFrontmatter(path, mutate)` (`frontmatter-write.service.ts:99-163`), which re-reads the tab or disk, refuses lossy frontmatter (`detectLossyFrontmatter`), and returns the written content. That returned string is the correct input for rebuilding a record after an action (chaining or re-checking), with one `buildNoteRecord` call and no IPC.
2. "Fill only if missing" must be decided on the parsed source properties of the same content the write will use (`parseFrontmatterProperties(base)`), keyed by CANONICAL key, never on `record.properties`: derived keys are always present (`organized`, `archived`, `favorite`, `tags`), `tags` is merged, relationship keys vanish when empty, and `icon`/`color` aliases are renamed. Define "missing" explicitly (absent vs `""`/null/`[]`); `isEmpty()` semantic is the only one stable across both producers.
3. Action keys that map to derived record keys need a table: setting `archived` must write `_archived`; `tags` has an inline half the writer cannot touch; `_type` is read normalised but written as given.
4. Re-evaluation after the rule's own write: `updateNoteFrontmatter` ends in `notifyAfterSave` for a closed note (`:161`) and `saveFileByPath` for an open tab (`:133`), both of which fire the after-save observers, including a rule observer. "Fill if missing" converges because the second pass finds the key; "always set" converges only when the value is a constant (the writer returns the base unchanged when `next === base`, `:129`). An "always set" with a value computed from `now()` or `file.mtime` would loop. This overlaps other scouts' areas; recorded here because it is a record-freshness question: the second evaluation sees the record rebuilt from the written content.
5. `file.ctime` and `file.size` are wrong in Auto Move's record. A shared rule core must either take timestamps/size from the index (route A/B) or accept that rules cannot use them. If Auto Move is moved onto a shared builder, that is a behaviour change for existing `file.ctime`/`file.size` rules; flag it.
6. Markdown only. Guard with `isMarkdownFile` (a `.view` body is bare YAML and `buildNoteRecord` reads no properties from it, `collection.service.ts:177-181`).
7. `file.folder` is absolute: UI that stores a folder condition must write an expression the engine can evaluate (`file.inFolder("<abs>")` needs the vault root baked in and breaks if the vault moves; `contains(file.folder, "x")` is root-independent).
8. No link data in the engine. If a rule should match "links to X" or "has backlinks", that is an engine extension (new `file.*` accessors), plus a record field fed from `NoteEntry.outgoingLinks`; the TS `buildNoteRecord` path cannot produce resolved links without the vault index. Relationship ARRAYS of the three system keys work today (`_belongs_to.contains("Project")` over target names).
9. Rule evaluation can mutate `record.properties` transiently (`evaluateListHigherOrder` swaps in a copy with `value`/`index` and restores it in `finally`, `evaluator.ts:520-559`). The `finally` restores the original Map even when a rule throws, and evaluation is synchronous, so evaluating directly on a shared `collectionStore` record is safe today. Do not introduce an `await` inside an evaluation.
10. Dates: `now()` is evaluated at rule time, so "not modified for 30 days" style rules are only evaluated when something triggers them. No trigger fires for a note that is never touched; a scheduled sweep would be a separate feature.

## 7. Recommendation on the record (input to the Auto Move relationship question)

- A shared rule core should own one function, "record for path P given optional content", with this precedence: content in hand -> `buildNoteRecord` with timestamps/size taken from the index record when it exists; otherwise route B (`get_index_delta`) for a path whose content is not in hand. It must not default `ctime`/`mtime` to `Date.now()`.
- The core stays pure (`.logic.ts`): input `PropertyIndexRecord` + parsed source properties, output a list of planned frontmatter changes. Reading the record and writing through `updateNoteFrontmatter` belong in the service layer, matching the existing Auto Move split (`auto-move.logic.ts` pure, `auto-move.service.ts` effects).
- Both Auto Move and the new rules read the same Collection engine and the same record, so a shared core is natural on this axis: the engine, the record builder and the error reporting (`findMatchingRule`'s `onError`) are already shared. What differs is first-match-wins (Auto Move) versus a likely apply-all set for frontmatter actions; that is a semantics question for the other scouts.

## 8. Open questions only the owner can answer

1. Should rules be allowed to use `file.ctime` and `file.size`? If yes, Auto Move's current wrong values should be fixed in the same change (behaviour change for existing rules). If no, say so in the rule editor.
2. How should "missing" be defined for fill-only-if-missing: key absent only, or also `""`, null and `[]`? (An empty `tags: []` or a bare `status:` is common after the Properties panel adds a key.)
3. Is link-based matching (links to, linked from, has backlinks) wanted? It needs an engine extension and a Rust-backed record field; it cannot come from the current record.
4. For the move/rename trigger: is a short asynchronous delay acceptable (evaluate after the Rust re-key, reading route B), or must it run in the same turn as the move? The synchronous `pathChanged` hook runs before the re-key (`path-change.service.ts:176-182`).
5. For the property-change trigger: is the existing 500 ms frontmatter autosave debounce "immediately" enough, or must it fire on the tab buffer before save?
6. For a folder move, should every child note be evaluated? Consumers are told about the folder once, so enumerating children needs the `childPaths` list that `applyPathChange` keeps local.

## Not verified

- Whether `.canvas`/`.kanban`/other non-Markdown saves reach `evaluateAndMove` in practice (the observer lacks an `isMarkdownFile` guard; no run, no test inspected).
- Real-world cost of a record build on a large note (no measurement; figure above is a code comment).
- `auto-move.service.test.ts` was not read, so I do not know whether a test pins the `Date.now()` ctime/mtime behaviour.
- The exact line of the `forgetNote` sweep in `path-change.service.ts` (read from the displayed excerpt ending at the file's last loop; cited as the last loop of `applyPathChange`).
