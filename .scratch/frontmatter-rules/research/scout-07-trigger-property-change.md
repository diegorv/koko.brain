# Scout 07: "On property change" as a rule trigger

Scope: properties panel, meta-bind widgets, direct YAML edits, kanban, and the question of where a per-key change (old value, new value) can come from. Read-only research at the checkout of 2026-11-10. Everything below is cited as `path:line`; things I did not verify are marked UNVERIFIED.

## 1. Bottom line

1. There is no event, store or IPC payload anywhere that exposes a per-key change with old and new value. Every "something changed" signal in the app is either a bare path, a boolean, or the new content only (section 2).
2. The editor has no concept of "a property changed". Every user path (panel, meta-bind, Cmd+D/Cmd+E, typing YAML) ends as "the note's content string changed", then flows through the same pipeline: tab content, then a debounced save, then `notifyAfterSave`, then `applyNoteChange`, then the registered per-file consumers. So "on property change" is best modelled as "on content change where the parsed properties differ", and the diff is derived, not subscribed to (section 3).
3. The cleanest hook is a `NoteChangeConsumer` (`core/filesystem/note-change.service.ts:26`), not an after-save observer. It sees every source (save, edit, watcher, create, fs, restore, task), and for the property-index consumer ordering it can read the previous record before the collection consumer overwrites it. The after-save observer (what Auto Move uses) sees fewer sources and has already lost the old record (section 3.3).
4. Kanban is not a trigger source today: nothing in `src/lib/plugins/kanban` writes note frontmatter (section 4.5).
5. The reaction floor is set by the existing debounces (0 to 2 s, section 5). A rule must not act before the user's typing pause, must skip unparseable frontmatter, and needs a loop guard. Any rule write to the active note also hits the open caret Issue (section 6).

## 2. What exists today and why none of it carries a diff

| Signal | Where | What it carries | Why it is not enough |
|---|---|---|---|
| `propertiesStore` | `src/lib/features/properties/properties.store.svelte.ts:4-34` | Parsed `Property[]` of the ACTIVE note and its `sourcePath` | `setProperties` replaces the list wholesale (`:24-27`). No previous value kept. Only the active note, only while `PropertiesView` is mounted (it re-parses in a 300 ms debounce, `PropertiesView.svelte:104-118`). |
| `collectionStore.propertyIndex` | `src/lib/features/collection/collection.store.svelte.ts:41-46` | `Map<path, PropertyIndexRecord>` (`properties: Map<string, unknown>`, `collection.types.ts:77-96`) | `updateRecord` overwrites the record and bumps `version`. The caller `updateNoteInIndex` reads `existing` only for mtime/ctime/size (`collection.service.ts:152-162`). The old record is dropped on the spot. |
| `applyNoteChange` | `src/lib/core/filesystem/note-change.service.ts:197-269` | `{ kind, source, path, content }` | New content only. `markIndexed(path, content)` runs BEFORE the fan-out (`:233` vs `:268`), so `lastIndexedContent` (`utils/index-dedupe.ts`) holds the new content by the time any consumer runs. |
| `NoteChangeConsumer.upsert` | `note-change.service.ts:26-33` | `(path, content)` | No source, no previous content. Must be synchronous (`:29`). |
| `addAfterSaveObserver` | `src/lib/core/editor/editor.hooks.ts:19, 67-92` | `(filePath, content)` | New content only. `applyNoteChange(... 'save' ...)` runs synchronously first (`:81`, policy row `note-change.service.ts:90`), so the property index already holds the NEW record when observers run (`:85-92`). |
| Rust `UpdateResult` | `src-tauri/src/vault/index.rs:33-54` | `changed: bool`, `affected`, `upserted`, `removed`, `full_rescan` | Paths and one boolean. No property diff. `get_index_delta` returns post-update records (indexing rules item 12, `docs/agents/indexing-watcher-rules.md:31`). |
| `vault-index-updated` | indexing rules items 2 and 12 | Version bump, then `UpdateResult` | Throttled: about 2 s after an isolated event, at most once per 10 s in a burst (indexing rules item 12). Far too slow for "right away" and carries no values. |
| Mods save hook | `src/lib/plugins/mods/mods-host.service.ts:559` | Path only (`addAfterSaveObserver((path) => ...)`) | Not a source of values either. |

Conclusion: the old value must be captured by whoever wants it, at a point before it is overwritten.

## 3. Where a per-key diff can be derived

### 3.1 Option A: consumer registered BEFORE the collection consumer, reading `propertyIndex`

- `fanOut` iterates consumers in registration order, synchronously (`note-change.service.ts:167-179`).
- Consumers are registered in `initializeVault` in this order: collection, file-icons, then path-change consumers (`src/lib/app/lifecycle/app-lifecycle.service.ts:258-260`).
- The collection consumer is the one that overwrites the record (`collection.service.ts:182-190`).
- A new "frontmatter-rules" consumer registered first in that list would, inside `upsert(path, content)`, read `collectionStore.propertyIndex.get(path)` (the OLD record: from Rust at boot, then from the TS mirror `buildNoteRecord`), build the new record with `buildNoteRecord(path, content)` (`collection.logic.ts:22-43`, the same function Auto Move uses at `auto-move.service.ts:154`), and diff `old.properties` against `new.properties`.
- Pros: no extra memory (the index already holds every note's properties); covers every source because every source routes through `applyNoteChange` (indexing rules item 6, `:13`); correct at vault open (the index is seeded from Rust before edits, so the first edit of a note does not look like "everything is new"); external YAML edits arrive through the `watcher` source with `consumers: 'always'` (`note-change.service.ts:92`), so they diff too.
- Cons: ordering is load-bearing and silent. The registry doc already warns that a forgotten registration is a silent no-op (indexing rules item 6, `:15`). A comment plus a test asserting the order would be needed. A reorder in `app-lifecycle.service.ts` breaks the diff with no error.
- Old record is Rust-projected on first read, new record is TS-built. `projectDerivedProperties` mirrors the Rust projection and is pinned by a golden fixture (`collection.logic.ts:45-62`), but any drift shows up as a spurious diff on the first edit of a note. I read only `collection.logic.ts:53-62` of that function: UNVERIFIED which derived keys exist beyond `_type` casing and the lifecycle flags. The diff must either run on the projected map (what expressions evaluate) or exclude derived keys explicitly.
- `buildNoteRecord` values: YAML scalars, arrays, booleans, numbers. Deep equality is needed for arrays. How dates are represented after `parseFrontmatterProperties` is UNVERIFIED.

### 3.2 Option B: the engine keeps its own snapshot

- `Map<path, Map<watchedKey, value>>`, updated after each evaluation. Independent of consumer order.
- Cons: first sighting of a note has no previous value, so the engine must seed it (from `propertyIndex` at vault ready) or define "first sighting = created". Memory is O(notes x watched keys), small if only keys named by rules are kept. Seed and invalidation (path changes, vault switch, `resetHooks`) become new lifetimes to manage.
- Only worth it if consumer ordering is judged too fragile.

### 3.3 Option C: `addAfterSaveObserver` (the Auto Move hook)

- Registered at `auto-move.service.ts:94-127`. It sees only `notifyAfterSave` callers: `writeTab` (`editor.service.ts:196`), `updateNoteFrontmatter` on a closed note (`frontmatter-write.service.ts:161`), and deep-link actions (`deep-link-actions.ts:78, 216`).
- It does NOT see: watcher changes (`watcher-handler.service.ts:115` calls `applyNoteChange` directly, and `editor.service.ts:449` syncs a reloaded tab with `schedule: 'none'`), link-updater rewrites (`link-updater.service.ts:71` calls `applyNoteChange` with source `save` but not `notifyAfterSave`), note creation (`note-creator.service.ts:118`), explorer create (`fs.service.ts:216`), Trash restore (`trash.service.ts:257`) and task writes (`task-write.service.ts:29`). So "on note create" and "external YAML edit" cannot be built on it.
- The old record is gone (section 2), so it would need Option B's snapshot anyway.

Recommendation: Option A for property diffs, with an ordering test. Fallback to B if the owner rejects order-dependence.

### 3.4 What the consumer does NOT know

- `upsert(path, content)` has no `source` (`note-change.service.ts:30`). The engine cannot tell a panel toggle from typing from an external edit from a bulk task write. If per-origin latency or per-origin rules are wanted (for example "react at once to discrete controls, after a pause for typing"), the consumer signature needs a `source` argument: a change to `core/` (`:26-33` and `:168-172`). Flag for the owner; I did not find another channel for origin.
- Dedupe: a `save` upsert whose (path, content) the `edit` source already indexed does not reach the consumers (`consumers: 'deduped'`, `note-change.service.ts:90, 230`). Good: the engine is not invoked twice for the same bytes. But the `save` Rust IPC still runs (`:231`), irrelevant here.
- `edit` upserts exist only for the ACTIVE tab's content (layout effect reads `editorStore.activeTabContent`, `src/routes/(app)/+layout.svelte:147-167`, 1000 ms debounce, then `updateIndexesForFile`, `index-updater.service.ts:24-44`) and yield a macrotask first (`note-change.service.ts:263-266`). They carry UNSAVED content.

## 4. Every path by which a property changes, and what it fires

All paths below end in "tab content changed, autosave later, then `applyNoteChange`". Timing detail is in section 5.

### 4.1 Properties panel (`PropertiesView.svelte`, `PropertyField.svelte`, `properties.service.ts`)

- Text, number and date fields commit on EVERY keystroke: the `Input` uses `oninput={handleValueChange}` (`PropertyField.svelte:135-143`), which calls `commitValue` (`:60-62`, `:64-82`). Booleans commit on `onchange` (`:123-131`). List add/remove commit once per action (`:84-96`, blur also commits, `:196`). The type dropdown commits once (`PropertiesView.svelte:188-189`).
- A commit goes `onUpdate` to `updateProperty` (`properties.service.ts:124-133`) to `commitChanges` (`:83-109`): refuses lossy frontmatter (`:87-96`), sets the store, rebuilds content, arms `skipNextParseFor` (`:100`) and calls `syncExternalContentToEditor(activePath, newContent, false, 'frontmatter')` (`:106`).
- Consequence for a rule: while the user types in a panel text field, the tab content (and so the parsed value) takes every intermediate value (`s`, `st`, `sta`...). Only the 500 ms frontmatter autosave timer, reset by each keystroke (`editor.service.ts:230, 244-246`), keeps those intermediate values from reaching the consumers.
- Panel feedback: the skip flag is armed only by the panel's own commit. A rule write arrives as a plain content change, so `PropertiesView`'s effect re-parses it after 300 ms (`:104-118`) and the panel input shows the rule's value, even while the user's cursor is in that input. An always-set rule on the key being typed would overwrite the user's text under their hands.

### 4.2 Meta-bind widgets (`core/markdown-editor/extensions/live-preview/widgets.ts`)

- All writers go through `dispatchMetaBindUpdate` (`:868-895`): `detectLossyFrontmatter` check (`:874`), `setPropertyByBindTarget`, `rebuildContent`, then one CodeMirror transaction replacing the frontmatter block (`:893`).
- Select and toggle commit immediately on `change` (`MetaBindToggleWidget`, `:989-993`; select widget at `:792`). Number and date inputs commit on blur or Enter only, not per keystroke (`:1059-1080`), and `input` just validates (`:1078`). So meta-bind is a discrete trigger, unlike the panel text field.
- The transaction is a normal user transaction: the editor's update listener sees `docChanged`, computes `fmChanged` and calls `onDocChanged` (`setup/editor-extensions.ts:171-191`), which is `onContentChange(content, fmChanged)` (`MarkdownEditor.svelte:128`). With `fmChanged = true` it arms the 500 ms frontmatter timer (`editor.service.ts:254-257`).
- The same `rebuildContent` path serves the meta-bind `updateMetadata` button action (comment at `widgets.ts:853-855`).

### 4.3 Direct YAML edits in the editor

- Each keystroke inside the frontmatter block, or above its closing fence, calls `onContentChange(content, true)`: the test is `fromA <= fmEnd` on the start document (`editor-extensions.ts:176-189`). It updates tab content per keystroke and arms the 500 ms timer (`editor.service.ts:254-257`). The timer is `debounce(saveDirtyTabs, 500)` with NO `maxWait` (`:230`), unlike the body timer (`:227`, 2000 ms with a 10 s maxWait): continuous typing in YAML never autosaves until a 500 ms pause.
- Hazard: mid-edit YAML is often invalid (`tags: [a,`). `parseFrontmatterProperties` on a block that does not parse yields `[]` (the doc comment at `widgets.ts:857-858` says "a block that does not parse parses to `[]`"). A naive diff would then see every key "removed". The engine must run `detectLossyFrontmatter(content)` (`core/frontmatter/properties.logic.ts:405`) first and skip on any non-null reason: this is exactly what Auto Move does for icons (`auto-move.service.ts:203-207`) and what every write path refuses anyway (`frontmatter-write.service.ts:125-126`, `properties.service.ts:87-96`).
- Corollary: a note whose frontmatter has comments, nested values, duplicate keys, anchors or integers beyond 2^53 is "lossy" and no rule can ever write to it (`LossyFrontmatterReason`, `frontmatter-write.service.ts:30`). The rule engine will silently never apply to those notes unless it reports it. Owner question 5.
- External editors (VS Code, git pull) reach the engine through the `watcher` source. For an open tab, `editor.service.ts:449` also syncs the tab with `markSaved: true`.

### 4.4 Other writers that change properties (all via `updateNoteFrontmatter` or the panel)

These are also property changes the engine would see (the engine cannot tell them from a user edit):
- Lifecycle toggles Cmd+D / Cmd+E (`_favorite`, `_organized`, `_archived`): `lifecycle.service.ts:25-52` through `updateNoteFrontmatter`; for an open tab it saves at once (`frontmatter-write.service.ts:131-134`), so the consumer sees the change within tens of ms.
- Icon and color writes (`file-icons/frontmatter-icon.service.ts:43`): the rule engine's own icon actions will arrive back through this same pipeline.
- Event calendar (`event-calendar.service.ts:759`), Todoist sync (`todoist-sync/sync-now.service.ts:903`), bookmark migration (`bookmark-migration.service.ts:80`), rail list prefs (`rail-shell/list-prefs.service.ts:44`, writes a type definition note), the mods API (`mod-app.service.ts:4, 53`).
- A closed note is written to disk and goes through `notifyAfterSave` (`frontmatter-write.service.ts:160-161`); an open tab is patched and saved (`:131-140`).

### 4.5 Kanban

- `src/lib/plugins/kanban` never writes a note's frontmatter. `KanbanView.svelte:55-89` serializes the board and calls `onContentChange(newMarkdown)` for the `.kanban` tab itself. The only frontmatter references in `kanban.service.ts` and `kanban.logic.ts` are `stripFrontmatter` of a linked card's content for preview (`kanban.service.ts:10, 82`) and preserving a preamble verbatim (`kanban.types.ts:98`, `kanban.logic.ts:82-90`).
- The collection consumer also drops non-Markdown files, so a `.kanban` has no property record at all (`collection.service.ts:175-187`).
- So "a kanban move changes a property" has no implementation behind it today. If the owner means something specific (cards that are wikilinks to notes, where moving a card between lanes should set a note's property), that is a new feature in the kanban plugin and would be an additional writer, not an existing trigger. I scanned `src/lib/plugins/kanban` and `src/lib/features/collection` (the latter for table cell edits; its writers target `.view` YAML, for example `key-edit.logic.ts:1-30`) only. Other places could exist: UNVERIFIED.

## 5. Reaction timing: what the existing pipeline already imposes

Time from the user's last action until consumers see the change (consumers = the per-file `fanOut`, section 3):

| Origin | Tab content updated | Autosave | Consumers see it |
|---|---|---|---|
| Cmd+D / Cmd+E, `updateNoteFrontmatter` on open tab | at once (`frontmatter-write.service.ts:132`) | immediate `saveFileByPath` (`:133`) | about immediately via `notifyAfterSave` (`editor.hooks.ts:81`) |
| Panel boolean / list / type dropdown | at once | 500 ms (`editor.service.ts:230`) | about 500 ms |
| Panel text / number / date typing | every keystroke | 500 ms after the LAST keystroke | 500 ms after the last keystroke (`edit` at 1000 ms is deduped, `index-updater.service.ts:29`) |
| Meta-bind select / toggle | at once | 500 ms | about 500 ms |
| Meta-bind number / date | at blur or Enter | 500 ms | about 500 ms after commit |
| Typing YAML in the editor | every keystroke | 500 ms after last keystroke, no maxWait | about 500 ms after a pause |
| Typing in the body | every keystroke | 2000 ms, maxWait 10 s | `edit` at 1000 ms (unsaved, active tab only), then `save` at 2000 ms (deduped if unchanged) |
| External edit | n/a | n/a | watcher debounce 500 ms (indexing rules item 4) plus the TS handler |

Auto Move adds its own debounce on top of the save: `settingsStore.autoMove.debounceMs`, default 3000 (`core/settings/settings.store.svelte.ts:112`, applied at `auto-move.service.ts:116-123`). So today a move happens 3.5 to 5 s after the last frontmatter edit.

How fast can a rule react without fighting typing:

- Structural answer: the pipeline already waits for a typing pause (500 ms for frontmatter, 1000 ms `edit`, 2000 ms body). A consumer hook therefore never fires per keystroke, even for the panel's per-keystroke commits. That is the main reason to hook the consumer rather than the tab content (reacting to `editorStore.activeTab.content` would fire per keystroke).
- A rule on property change fires only when the diff of watched keys is non-empty. Body typing produces an empty diff, so it never triggers a write, and the 1 s `edit` upserts during body typing are harmless for property-change rules.
- A rule on save with "fill if missing" fires on every upsert until the property exists, then stops (idempotent: `next === base` returns without writing, `frontmatter-write.service.ts:129`).
- Floor for "right away": about 0.5 s after the last frontmatter edit (panel, meta-bind, YAML), tens of ms for lifecycle toggles and other `updateNoteFrontmatter` writers. I would not add a second long debounce for these; a short trailing debounce (a few hundred ms, coalescing several upserts of one path) is enough. I have not measured typing cadence or the cost of an evaluation, so I give no millisecond figure for the engine debounce (the owner's memory also says unmeasured latency numbers should not be quoted).
- Typed text still produces transient states after a 500 ms pause: `status: do` becomes a "change" to `do`. A rule that matches on the new value (`status == "done"`) does not match; a rule that ALWAYS SETS something whenever `status` changes would act on a half-typed value. Acceptable when rules react to what the note holds after the pause, but the owner should know it.
- A rule write to the ACTIVE note flushes the user's unsaved body edit as a side effect: `updateNoteFrontmatter` patches the tab and saves it at once (`frontmatter-write.service.ts:88-90, 131-134`). It keeps the body edit and the tab content is read synchronously at the start of the attempt (`:116-119`), so no keystroke is lost at that instant. A later failed save restores the base only if the tab was not edited meanwhile (`:137`).

## 6. Constraints a design must respect

1. **Caret blocker.** Every rule write to the open tab goes through `syncExternalContentToEditor` (`frontmatter-write.service.ts:132`) then `bumpExternalContentSignal` (`editor.service.ts:88-90`), and `replaceDoc` keeps the caret at its old numeric offset (`.scratch/open-itens/issues/001-caret-selection-follow-their-text-when-frontmatter.md`). A rule adding N characters above the caret while the user is typing in the body puts the caret N characters off; the next keystrokes land in the wrong place and autosave persists it. Property-change rules fire mostly while the user is editing frontmatter or toggling lifecycle keys (caret usually in the panel or the YAML), but "on save" and "on create" rules fire during body typing. Issue 001 must land before rules write to the active note.
2. **Unparseable or lossy frontmatter: skip, do not diff.** Section 4.3. Both the diff and the write must be guarded; Auto Move's precedent is a quiet debug log (`auto-move.service.ts:203-207`).
3. **Consumers must be synchronous** (`note-change.service.ts:29`). The engine consumer must only compute the diff and schedule the evaluation; the write (`updateNoteFrontmatter`, async) happens in the scheduled callback. The registry says `save` must stay synchronous (indexing rules item 6, `:17`), so no awaiting inside the consumer.
4. **Layering.** `core/` must not import `features/` (ADR-0003, indexing rules item 6, `:15`), so the engine registers itself like `registerCollectionNoteChangeConsumer` and is wired and unwound in `initializeVault` / `teardownVault`. Consumers are vault-lifetime (`app-lifecycle.service.ts:258-260`).
5. **Do not grow a second owner of "bytes changed"** (indexing rules item 6, `:13`). The engine reads changes through `applyNoteChange`'s consumer list and writes back through `updateNoteFrontmatter`, which already routes through `notifyAfterSave` and so `applyNoteChange` again. It must not call per-file updaters directly.
6. **Serialize writes per path.** `updateNoteFrontmatter` documents that concurrent calls on one closed note race and the last write wins (`frontmatter-write.service.ts:95-98`). Multiple rules matching one note must be merged into a single `mutate` call (the mutate runs twice if a tab opens during the read, so it must be pure, `:95`).
7. **Self-trigger loop.** The engine's own write returns through `notifyAfterSave` to the consumer, with a diff made of the engine's own keys. Two safe properties exist: an unchanged write is a no-op (`:129`), and fill-if-missing stops after one pass. Two things are not safe by themselves: always-set rules whose results feed each other's conditions can oscillate forever (A: `y == 2` sets `x = 1`; B: `y == 2` sets `x = 2`), rewriting the user's file indefinitely. Because this is data on disk, a per-path cap on engine writes per window, or an "ignore diffs the engine just wrote" guard (like `skipNextParseFor`, `properties.service.ts:28`, which names the path it armed for), is warranted. The cap is a design decision for the owner.
8. **Property-change vs "always set" on the same key.** If a rule has "always set K" and its trigger is "K changed", the user can never edit K. See owner question 2.
9. **Do not fire on unsaved content by accident.** The `edit` source feeds consumers unsaved active-tab content 1 s after typing (`+layout.svelte:147-167`). If the engine consumer evaluates it, the write uses `updateNoteFrontmatter`, which then saves the tab at once and so shortens the body's 2 s autosave cadence. Decision: evaluate on `edit` upserts too (faster, active tab only) or ignore them and wait for `save` (the consumer cannot tell them apart without a `source` argument, section 3.4).
10. **Bulk writers.** Todoist sync, task writes, link rewrites and event calendar each fan out many notes through the same consumers (`task` and `watcher` run with `consumers: 'always'`, `note-change.service.ts:92, 98`). Selecting rules by watched-key intersection with the diff first (cheap Map compare) keeps this near-free when nothing changed; an evaluation that matches writes one file per note.
11. **Tests.** Project rules forbid mocking stores and `.logic.ts` (`CLAUDE.md` quick reference 1). A diff function belongs in a `.logic.ts` taking two `Map<string, unknown>`; the consumer-order dependency needs a test with the real `registerNoteChangeConsumer` registry and the real collection store.

## 7. Suggested shape for the property-change trigger (for the cross-scout synthesis)

- One `diffProperties(prev, next)` pure function (new `.logic.ts`) returning `{ key, old, new }[]` with deep equality for arrays, run on the projected `PropertyIndexRecord.properties` maps.
- One consumer registered before the collection consumer; it skips non-Markdown (same rule as `collection.service.ts:175-187`), skips lossy frontmatter, computes the diff, drops it when empty, and schedules a per-path trailing debounce that then evaluates the same rule set the other triggers use (so "on save", "on property change", "on create/move/rename" share one evaluation path).
- Create, move and rename arrive on the same consumer registry (`create`, `fs`, `restore` sources and `registerPathChangeConsumer`, indexing rules item 6), which is the other triggers' scout's area; I note only that the same consumer sees `create` and `fs` upserts and would treat a note with no previous record as "created".
- First upsert for a path with no old record: treat as "no diff" for property-change rules (otherwise opening a vault or a new note fires every rule) and let the create/save triggers handle it.

## 8. Open questions only the owner can answer

1. Should "on property change" react to changes made by integrations (Todoist sync `sync-now.service.ts:903`, event calendar, the engine's own earlier rule, mods) or only to edits the user made? The consumer cannot tell them apart without a `source`/origin argument, which is a core API change (`note-change.service.ts:26-33`).
2. When an always-set rule owns key K and the user edits K by hand (panel, YAML, meta-bind), who wins? Options: rule rewrites after the pause (user cannot edit K), or the key the user just changed is exempt in that pass (needs the diff to exclude it), or always-set rules are not allowed to use "K changed" as their own trigger.
3. Latency target: is "about 0.5 s after the last frontmatter edit, immediate for toggles" the meaning of "right away", or is a visible pause (Auto Move's 3 s) acceptable for property-change rules?
4. Should rules evaluate unsaved content (the `edit` source, 1 s, active tab) or only saved content?
5. Notes with comments, nested values, duplicate keys or anchors in the frontmatter can never be written to. Silent skip with a debug log (Auto Move today), a one-time toast, or a status indicator on the rule?
6. Rules acting on notes changed outside the app (git pull, another editor, the watcher source): allowed to write to those files, or restrict to edits made in the app?
7. Does the owner want the engine write cap (section 6, item 7) as a hard per-path limit, and what should happen when it trips (log only, disable the rule, toast)?
8. "Kanban moves that change a property": which flow is meant? The kanban plugin writes no note properties today (section 4.5); a card-move-sets-property feature would be a new writer in the kanban plugin, separate from this trigger.
9. Is the dependency on consumer registration order (Option A) acceptable, or should the engine own a snapshot (Option B) for robustness?

## 9. Not verified

- Whether `parseFrontmatterProperties` returns `[]` or throws on every malformed block shape (I relied on the comment at `widgets.ts:857-858` and the `unparseable` branch of `detectLossyFrontmatter`, `properties.logic.ts:409-412`).
- How date-like values are represented in `PropertyIndexRecord.properties` and whether Rust and TS projections agree for them (only `collection.logic.ts:22-62` read).
- Whether a rule write that lands while a meta-bind number or date input has focus rebuilds that widget (the widget `eq()` compares `bindTarget` and `currentValue`, `widgets.ts:946-958`, so a write of another key should keep it; not exercised).
- Cost of expression evaluation per rule per upsert: not measured.
- Behaviour of background-tab edits (the `edit` source reads the active tab only, `+layout.svelte:147-150`); a background tab is rewritten only by `updateNoteFrontmatter`-style writers.
