# Validation 02: scout-03 (note record) and scout-04 (frontmatter write path)

Adversarial check at HEAD `2e2cc5b60`. I read both reports and opened the code behind every claim that a design would rely on. Nothing was run except one `node -e` regex check, noted where it is used. Both scout files exist.

Verdict: both reports hold up on the core mechanics. The record shape, the projection, the `updateNoteFrontmatter` branches, canonicalization, the after-save chain, path-change ordering and the caret bug all match the code. The errors are: one wrong claim about relationship keys, one freshness claim that depends on an un-awaited IPC, a create-trigger table that is incomplete, latency figures that leave out the 3 s Auto Move debounce, and the empty-block defect, which is framed as new but is already tracked and already reachable. Scout 04 also missed one real data-loss interaction with the Properties panel (M2).

## Refuted

### R1. Scout 03 §3.5 and §6.2: "relationship keys vanish when empty"

Claim: `_belongs_to` / `_related_to` / `_has_many` are "set only when at least one target exists ... Absent key therefore means 'no targets', whatever was written". §6.2 repeats that "relationship keys vanish when empty".

Why it is wrong: `buildNoteRecord` first copies EVERY parsed key into the Map (`collection.logic.ts:36-39`). `projectDerivedProperties` then only OVERWRITES the key when it finds targets (`:73-76`); it never deletes it. Rust does the same: `project_note_record` starts from `entry.frontmatter.clone()` and inserts the target array only when it is non-empty (`src-tauri/src/commands/vault.rs:1007-1027`).

What the record actually holds:
- With targets: an array of target names.
- Written without wikilinks: the raw value. `_belongs_to: "plain"` stays `"plain"`. `_belongs_to: ""` stays `""` on TS and is `null` on Rust for a bare key (`parsing.rs:807`).
- Not written at all: absent.

Absent therefore means "not written". It does not mean "no targets". The type of the value is mixed: an array or a raw string.

### R2. Scout 03 §5B: `get_index_delta` is "fresh as of the last `update_note_in_index`", which the save path runs "before consumers"

The Rust update is fired and not awaited. The call is `call('update_note_in_index', ...).catch(...)` (`note-change.service.ts:236-240`), and `notifyAfterSave` itself calls `void applyNoteChange(...)` (`editor.hooks.ts:81`). An after-save observer that calls `get_index_delta` is therefore ordered after the update only if Tauri handles the two invokes in the order they were sent. I did not verify that. Route B is safe after an AWAITED Rust command, such as `rename_note` in `applyPathChange` (`path-change.service.ts:209`). It is not proven safe right after a save. For save, create and frontmatter-write triggers, use the content in hand.

### R3. Scout 04 §6 trigger table, "Note create": "no after-save observer fires for a freshly created note until its first save"

This is true only for some creation paths:
- **Fire `notifyAfterSave`:**
  - deep-link silent create (`deep-link.service.ts:333-337`)
  - deep-link prepend, append and overwrite (`:277`, `:296`, `:313`)
  - deep-link capture (`deep-link-actions.ts:216`)
  - daily-note append (`deep-link-actions.ts:78`)
  - a mod's `vault.write` (`mod-vault.service.ts:135`)
- **Fire no observer:** these use `applyNoteChange` with source `create` or `fs`:
  - note creator (`note-creator.service.ts:118`)
  - explorer `createFile` (`fs.service.ts:216`)
  - mod `vault.create` (`mod-vault.service.ts:~108-111`)
  - Todoist `closed-note-writer.service.ts:79`
  - the folder-note placeholder, which uses `applyNoteChange` source `save` (`file-icons.service.ts:~104`)

Today Auto Move already runs on some creates and not on others. An "on create" trigger has to pick a seam that covers both families, or say which ones count.

### R4. Scout 04 §1 and §7: latency "500 ms (frontmatter) or 2 s (body)" and rules firing "0.5 to ~3 s after the user pauses typing"

These figures leave out the rule debounce. Auto Move's `debounceMs` defaults to 3000 (`settings.store.svelte.ts:112`) and is added after the save (`auto-move.service.ts:116-123`). The save debounces are 500 ms for frontmatter and 2000 ms for body, with `maxWait` 10 s (`editor.service.ts:227-230`). A save-triggered rule built like Auto Move therefore lands:
- 3.5 s after a pause in a frontmatter edit
- 5 s after a pause in body typing
- up to about 13 s into a continuous typing run

### R5. Scout 04 §8.1, §9 and §10.7: the empty `---`/`---` block is presented as an unverified defect that rules would newly expose

The defect is real. I confirmed the regex with `node -e`:
- `"---\n---\n"` and `"---\n---\nbody"` do not match.
- `"---\n---\nbody\n---\nmore"` matches with raw `"---\nbody"`. That raw is not a mapping, so `detectLossyFrontmatter` returns `unparseable` and the write is refused (safe).
- `"---\n\n---\nbody"` matches with raw `""` (safe).

But the defect is not new to rules:
- It is already tracked as `.scratch/open-itens/issues/005-empty-frontmatter-block-matched-writers-never-stack.md` (ready-for-agent).
- It is reachable today. `ensureFolderNote` writes the `'---\n---\n'` placeholder (`file-icons.service.ts:~100-103`), then `setIconForPath` writes through `updateNoteFrontmatter` (`:139-141`).
- `file-icons.service.test.ts:150-162` mocks exactly that placeholder and never asserts the second write's bytes.

The rules design should list 005 as a blocker or co-requisite. It should not plan a new repro.

### R6. Line drift (minor, already corrected here)

| Cited | Actual |
|---|---|
| `notifyAfterSave` at `editor.hooks.ts:76` / `:76-100` | `:67` / `:67-92` |
| `frontmatter-icon.service.ts:46` | `:43` |
| `commitChanges` at `properties.service.ts:77-103` | `:83-108` |
| Collection Markdown guard at `collection.service.ts:182-191` | `:186-194` |

Scout 03 §4 says "after a move the same record feeds `resolveDestination` (:167)". In fact `resolveDestination` runs at `:167`, BEFORE `moveItem` at `:190`. What reaches the post-move icon step is the stale `content` (`:203`), not a re-used record.

### R7. Scout 03 §3, "Known TS vs Rust divergences ... from `kb-api.v1.ts:60-130`"

`kb-api.v1.ts:108-111` documents only three divergences: octal, `.inf`/`.nan`, and nested maps. Two of the scout's items are true from code but undocumented:
- A bare key reads `""` on TS (`properties.logic.ts:194-196`) and `null` on Rust (`parsing.rs:807`).
- List items are stringified on TS (`:177-181`) but keep numbers on Rust (`parsing.rs` `Seq` arm).

The scout also missed one divergence, listed as M10.

## Confirmed key claims

Scout 03:
- **Record shape.** `PropertyIndexRecord` (`collection.types.ts:77-96`): absolute `path` and `folder`, `ext` with its dot (`fs.logic.ts:59-62`), timestamps in ms, `properties` as a Map. Rust converts seconds to ms with `saturating_mul(1000)` (`vault.rs:1034-1035`). `fromV2` is not exported (`collection.service.ts:44-60`).
- **Derived keys.** `organized`, `archived`, `favorite` and `tags` are always present. `tags` is replaced by the merged frontmatter and inline set (`collection.logic.ts:63-69`, `vault.rs:1012-1018`). `_type` casing is normalized, and a bare `type:` becomes `""` (`vault.rs:1004-1010`).
- **Evaluator aliasing.** The evaluator aliases only `type` to `_type` (`evaluator.ts:93-100`), so the identifiers `icon` and `color` resolve to null. `file.hasProperty` is `properties.has` (`:576-579`). `file.inFolder` is a prefix test on the absolute folder (`:572-575`, documented in `help/documentation/12-collection.md:409-424`). `now()` and `today()` read the wall clock (`:361-367`). The expression engine has no link, backlink or body accessor.
- **Auto Move's record.** Auto Move builds its record with `buildNoteRecord(filePath, content, Date.now(), Date.now())` (`auto-move.service.ts:154`), so `size` is 0 and `ctime` is "now". The real values exist in Rust (`vault.rs:341`, `read_file_metadata`). No test pins this: `auto-move.service.test.ts` has no `ctime`, `mtime` or `size` case.
- **Auto Move guard.** Auto Move has no `isMarkdownFile` guard, only `isViewFile` (`:97`). The resulting reach is shown in M1.
- **Route A.** `updateNoteInIndex` keeps `mtime`, `ctime` and `size` from the existing record, or 0 when there is none (`collection.service.ts:151-161`). `updateRecord` copies the whole Map on each upsert (`collection.store.svelte.ts:42-44`).
- **Throttle.** `vault-index-updated` refreshes are throttled to 2 s, with at most one per 10 s in a burst (`tauri-listeners.service.ts:105-109`, `:276-289`).
- **Path change.** `pathChanged` is synchronous and runs before the link rewrite and before `rename_note` (`path-change.service.ts:176-182` vs `:190`, `:209`). A folder change arrives once, for the folder (`:43-44`). `forgetNote` evicts the old keys at the end (`:233-235`). The new key reaches the property index only through the delta, because the collection's only path-change consumer moves view indexes (`collection.service.ts:200-205`). `rename_note` re-keys synchronously, keeps the old `mtime`, `ctime` and `size` (`vault.rs:1300-1340`), and emits the event.
- **Parse cache.** It is an LRU of 16, keyed by raw YAML, and returns clones (`properties.logic.ts:223-241`).
- **Shared-record safety.** `evaluateListHigherOrder` swaps `record.properties` and restores it in `finally` (`evaluator.ts:520-559`). The store Map is not deep-proxied: `$state` holds a `Map`, which Svelte does not proxy. So evaluating on a store record is safe as long as evaluation stays synchronous.

Scout 04:
- **The two branches** of `updateNoteFrontmatter` (`frontmatter-write.service.ts:99-163`):
  - It runs the lossy gate before anything else (`:125`).
  - A no-op rule returns early with `next === base` and writes nothing (`:129`).
  - An open tab is synced with `'none'` and saved at once (`:131-141`).
  - A closed note gets an `exists` re-check, restarts when a tab opened during the read, writes with `create: false`, then calls `notifyAfterSave` (`:143-162`).
  - `mutate` must be pure. Per-path serialization is left to the caller (`:95-97`).
- **Canonicalization.** The read path canonicalizes (`properties.logic.ts:297`) and dedupes (`:309`). `serializeProperties` dedupes again (`:609`). On a populated collision the first entry wins and the later one is logged (`:494-499`). `updatePropertyValue` and `removeProperty` match the exact key (`:711-729`). `setPropertyByBindTarget` is the canonical-aware upsert (`:651-665`). `isEmptyPropertyValue` and `isEmptyYamlNode` are private.
- **Serializer.** Only `type === 'list'` gets a flow sequence (`:610-614`). Other values go through `doc.set` with the raw JS value (`:620`). An unchanged number or boolean keeps its source spelling when `original` is passed (`:616-619`), and `updateNoteFrontmatter` passes `base`.
- **Icon helpers.** `withIconColors` REMOVES `_color` and `_title_color` when they are absent (`frontmatter-icon.service.ts:26-31`). `upsertProperty` and `withIconColors` are private.
- **Save path.** `saveFileByPath` queues per path (`editor.service.ts:163-179`) and writes `tab.content` as it is at write time (`:191`). `syncExternalContentToEditor` bumps the signal only for the active tab (`:71-92`).
- **Panel and meta-bind.** The Properties panel and meta-bind bypass `updateNoteFrontmatter`:
  - The panel uses `commitChanges` with `syncExternalContentToEditor(..., false, 'frontmatter')` (`properties.service.ts:106`).
  - Meta-bind uses `dispatchMetaBindUpdate`, which dispatches a CodeMirror change (`widgets.ts:868-895`).
- **Caret and undo.** The caret stays at its numeric offset, and `replaceDoc` passes `addToHistory.of(false)` (`MarkdownEditor.svelte:170-188`, `:625-645`). This matches open-itens 001, which is still ready-for-agent.
- **Lifecycle side effect.** `_archived: true` matches the generated lifecycle archive rule `type == "X" && _archived == true` (`type-lifecycle-rules.ts:39-45`). So a rule that writes `_archived` causes a move on the next after-save evaluation.
- **Per-path queue pattern.** `serializeListWrite` is a per-path promise queue to copy (`rail-shell/list-prefs.service.ts:28-37`).
- **Mods.** Mods already expose `updateNoteFrontmatter` (`mod-app.service.ts:53`).

## Missed

- **M1. Non-Markdown saves reach every after-save observer.**
  - The kanban, canvas and collection views write through `onContentChange` and `onContentChangeForPath` (`EditorView.svelte:80,84,89`; `editor.service.ts:254-268`). Both end in `writeTab`, then `notifyAfterSave` (`:187-196`).
  - Auto Move skips only `.view` (`auto-move.service.ts:97`). So `.kanban` and `.canvas` saves ARE evaluated, and a broad rule (`true`, `file.inFolder(...)`) can move them.
  - This resolves scout 03's "not verified" item. A new rule runner must guard with `isMarkdownFile`.
- **M2. The Properties panel can wipe a rule's write (data loss, derived from code, not executed).**
  - The mechanism:
    1. Panel edits rebuild the active note's frontmatter from `propertiesStore.properties`, not from the tab (`properties.service.ts:124-132`, `:97-106`).
    2. The panel re-reads the tab 300 ms after any content change, unless the skip flag armed by its own last commit is still set (`PropertiesView.svelte:104-117`, `properties.service.ts:37-41`, `:100`).
    3. If a rule writes the active note inside that 300 ms window after a panel keystroke, the debounced re-parse is skipped, so the store keeps the pre-rule properties.
    4. The next panel keystroke then rewrites the block from the stale store and drops the rule's keys. The drop is not in CodeMirror undo history.
  - It is the same mechanism as `.scratch/open-itens/issues/008-properties-panel-commit-that-changes-nothing-does.md`, which cites Issue 121 for the full skip-flag problem.
  - With a save trigger the window is narrow: the rule fires at least 3.5 s after the last keystroke, so the user has to start typing again. With an "immediately on property change" trigger it is the normal case.
  - Any immediate trigger needs this fixed first (or the rule must write through the panel's store).
- **M3. Every rule write runs the full after-save fan-out.**
  - What it triggers:
    - a File History snapshot (`file-history.service.ts:190-196`). `save_snapshot` skips unchanged content, and optional backup `.md` files are written when the setting is on (`:117-123`).
    - the search FTS and semantic update (`search.service.ts:303`)
    - the Todoist auto-sync observer (`sync-scheduler.service.ts:90`)
    - mods' `onNoteSaved` (`mods-host.service.ts:559`)
    - Auto Move
  - A vault mod that writes frontmatter from `onNoteSaved` can ping-pong with rules, outside any loop guard in the rule core.
  - File History is the only undo the owner gets for a rule write, since CodeMirror undo excludes it.
- **M4. Two debounced features race on moves.**
  - Suppose a separate frontmatter-rules feature keeps its own debounce next to Auto Move's, and Auto Move moves the note while the rule write is pending.
  - `updateTabAfterRenameOrMove` has already re-pathed the tab (`path-change.service.ts:173`), so `findTab(oldPath)` misses and the closed branch runs `readTextFile(oldPath)`. That read error propagates raw (`frontmatter-write.service.ts:121`), or the write gets `missing`.
  - Running "match, then move, then write" as one sequence per path in one runner avoids this. That is a concrete argument for a shared runner.
- **M5. Auto Move's own moves fire the path-change consumers.**
  - Auto Move moves through `moveItem`, then `applyPathChange` (`auto-move.service.ts:190`). So a move/rename trigger also fires on Auto Move's moves (Issue 02, first triage question).
  - Without a guard this can loop: move, then rule write, then after-save, then another move.
- **M6. A throttle bypass exists.** `vaultStore.requestPromptIndexRefresh()` (`vault.store.svelte.ts:114-116`) makes the next refresh skip the 2 s / 10 s throttle. `list-prefs.service.ts:43` uses it. Use it when a rule write must show in the rail or a Collection view quickly, especially after a move, where the new path is missing from the property index until the delta.
- **M7. Icon-index freshness after a bare write (scout 04 left this unverified): confirmed.**
  - `registerFileIconsNoteChangeConsumer` (`file-icons.service.ts:299-305`) calls `updateFrontmatterIconForFile` on upsert (`:240-270`). For a folder note it also updates the parent-directory key (`:259-266`).
  - So a rule core can write `_icon` and `_color` in the same `mutate` as other keys and does not need `setIconForPath`.
  - Caveat: the icon index parses with its own line-based reader (`file-icons.logic.ts:83-130`), not with `parseFrontmatterProperties`.
- **M8. Existing Auto Move icon semantics conflict with the owner's rules.**
  - On every matching save, an icon rule without a color REMOVES the user's `_color` and `_title_color` (`withIconColors`). That conflicts with "nothing is reverted" and with fill-only-if-missing.
  - Icon failures are toasted (`writeIconFrontmatter`, `frontmatter-icon.service.ts:38-50`), not only logged, and only the lossy case is pre-checked, on stale `content` (`auto-move.service.ts:203`).
  - Moving Auto Move's icon onto a shared core changes both behaviors for existing rules. Flag this to the owner.
- **M9. Truthiness and parse cost.**
  - `findMatchingRule` uses JS truthiness (`auto-move.logic.ts:27`), while Collection filters use `toTruthy` (`collection.logic.ts:481-485`). They differ only for `NaN`.
  - `evaluateExpression` re-parses on every call (`evaluator.ts:75-78`). A runner that evaluates N rules on every save should cache ASTs the way `evaluateFilterCached` does (`collection.logic.ts:347-375`).
- **M10. TS and Rust resolve alias twins differently.**
  - TS `dedupeCanonicalKeys` keeps the first populated value, and a populated twin beats an empty placeholder (`properties.logic.ts:481-503`). Rust `project_document` is a `BTreeMap` insert, so the last one wins (`parsing.rs:799`).
  - Example: `color: red` then a bare `_color:`. TS gives `_color: red`, Rust gives `_color: null`.
  - This is not lossy by `detectLossyFrontmatter`, which flags only two populated twins (`:453-456`), so the write proceeds while the record depends on which producer built it.
- **M11. `inFolder` has no separator check.** `file.inFolder("/v/work")` also matches `/v/workshop` (`evaluator.ts:572-575`). A UI-generated folder condition should compare `file.folder ==` or add a trailing `/`.
- **M12. Issue 01 already answers some "owner questions".**
  - "Missing" is defined as absent, null, `''` or an empty list, checked on the canonical key (Issue 01 Behavior 4).
  - The value of a wikilink is the string `[[X]]` (Issue 01 Behavior 3).
  - Scout 03 open question 2 and scout 04 open question 4 partly duplicate these. They stay open only if the new feature means to differ from Issue 01.
- **M13. A rule that removes every key strips the block.** `rebuildContent` returns the bare body when `properties` is empty (`properties.logic.ts:690-692`). Fill and set actions never hit this, but any later "remove property" action would.

## Corrections a designer must know

1. **The record is a read view. Decide "missing" in `mutate`.** Decide fill-vs-set inside `mutate` from its `props` argument, on canonical keys. Never decide it from `record.properties`:
   - Derived flags and `tags` are always present.
   - Relationship keys hold either target arrays or the raw written value (R1).
   - TS and Rust disagree on bare keys, list item types and alias twins (R7, M10).
2. **Do not read Rust right after a save.** Not for save, create or frontmatter-write triggers; the Rust update is not awaited (R2). Build the record from the content in hand, and take `mtime`, `ctime` and `size` from the existing index record. For move and rename, evaluate after the awaited `rename_note`, through a new hook or a short deferral. The synchronous `pathChanged` hook runs too early.
3. **One runner per path.** Match, move, then write in a single serialized sequence. Two independently debounced features (Auto Move plus a separate rules feature) race on moves (M4). Auto Move's own moves also fire path-change consumers, so the move trigger needs a self-origin guard (M5).
4. **"On create" has two families of creation paths** (R3). Some fire `notifyAfterSave` and some only `applyNoteChange`. A create trigger needs a seam both reach, or an explicit list of the creates that count.
5. **Blockers to list:**
   - open-itens 001: caret
   - open-itens 005: the empty block, already reachable via folder icons (R5)
   - the open-itens 008 / Issue 121 Properties-panel skip flag (M2), which matters for any "immediately on property change" trigger
6. **Latency.** A save trigger lands 3.5 to 5 s after the user pauses, up to about 13 s while typing continuously (R4). Measure "immediately" against that when the owner decides.
7. **Guard on `isMarkdownFile`.** Kanban, canvas and view saves reach every after-save observer today (M1).
8. **Every rule write fans out to the whole after-save chain:** File History, search, Todoist, mods and Auto Move. Loop termination relies on `next === base` (`frontmatter-write.service.ts:129`), so "always set" must use constant values or the engine needs a per-event guard. A mod writing from `onNoteSaved` is outside that guard (M3).
9. **Icons and colors in one `mutate`.** Write `_icon`, `_color` and `_title_color` in the same `mutate` as the other keys. The icon index follows by itself (M7). Do not reuse `withIconColors`: it deletes colors (M8). Adopting fill semantics for Auto Move's icon action changes existing behavior, so ask the owner.
10. **Write path discipline.** Write only through `updateNoteFrontmatter`. Pass correctly typed JS values, and `type: 'list'` for arrays. Canonicalize rule keys before matching. Pre-check `detectLossyFrontmatter` on the content the write will use, and log refusals instead of toasting them (Issue 01 Behavior 7). Note that Auto Move's icon path toasts today.

## Not verified

- Whether Tauri 2 handles two sync-command invokes from one JS turn in the order they were sent (R2). I did not check the docs.
- The M2 data-loss sequence and the R5 corrupted bytes come from reading code. Neither was executed. Only the regex behavior was checked, with `node -e`.
- Whether `PropertyField.svelte` keeps local state while focused, which would change how visible M2 is. I did not read it in full.
