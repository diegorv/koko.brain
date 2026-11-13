# Design A: one Automations engine, Auto Move becomes the `move` action

Designer A, 2026-11-10. Built on scouts 01-16 and validations 01-08 in this folder. Where a validator corrected a scout, the validator's version is used and the validation file is cited. Code citations were spot-checked at HEAD `2e2cc5b60` (`auto-move.service.ts:94-215`, `auto-move.types.ts`, `auto-move.store.svelte.ts`, `path-change.service.ts:30-80,145-236`, `note-creator.service.ts:33-38,100-118`, `app-lifecycle.service.ts:254-303,443-448,669`, `editor.hooks.ts:10,67`, `fs.service.ts:208,216`, `properties.logic.ts:464`). Nothing was run.

## 0. The proposal in one paragraph

There is one feature, one rule list, one config file, one Settings section and one runner. A rule (called an **automation** here, naming is an owner call, section 1) is `{ condition, triggers, actions[] }`. Actions are `move` (today's Auto Move destination) and `set` (any frontmatter key, which covers `_icon`, `_color` and `_title_color`), and each `set` carries its own `mode`: `ifMissing` or `always`. One per-path runner handles every trigger (save, property change, create, move/rename). For a note it computes, in memory and on a single copy, every property change from every matching automation (all-match, list order, first claimant wins per key) until nothing changes. It then picks at most one move (first match wins, user automations before type-generated archive automations), moves the note, and writes all property changes once through `updateNoteFrontmatter`. Auto Move's code becomes the `move` action and the runner. The existing `auto-move-rules.json` is migrated one way into a new versioned file, and the old file is left on disk untouched.

The strongest argument for this shape is not taste. The code says a single runner per path is required for correctness:
- Two features with their own debounce race on a closed note, and the last write wins (`frontmatter-write.service.ts:95-97`; validation-08 M5, validation-02 M4).
- Auto Move's icon write deletes `_color`/`_title_color` (`frontmatter-icon.service.ts:26-31`, called at `auto-move.service.ts:209`). With any second writer of those keys it loops forever, whether that writer fills or always sets them (validation-05 R1, validation-03 Missed 1). Only a single owner of the icon keys removes the loop.

Design A gets both for free, because there is only one owner.

## 1. Domain model and names

`CONTEXT.md` does not exist (`docs/agents/domain.md:5-12`; verified with `ls`). No glossary constrains the names, so the terms below are proposals to record with the domain-modeling skill once the owner picks them. Collisions found by scout-15 section 2: "rule" (Auto Move rule, generated lifecycle rule, `RESERVED_KEY_RULES`, layer rules) and "lifecycle" (the three flags in ADR 0026, and Auto Move's generated rules).

| Term (proposal) | Meaning | Replaces / relates to |
|---|---|---|
| **Automation** | One user-defined entry: name, enabled, condition, triggers, ordered actions. User label "Automations" (Settings section). | "Auto Move rule" |
| **Condition** | A Collection expression string, evaluated on the note record (`features/collection/expression/`). | `AutoMoveRule.expression` |
| **Trigger** | When an automation is evaluated: `save`, `propertyChange`, `create`, `pathChange` (move or rename). | the after-save hook only |
| **Action** | `move` (destination template) or `set` (key, typed value, mode). | `destination`, `icon` |
| **Mode** | Per `set` action: `ifMissing` (absent, `null`, `''` or `[]` on the canonical key, the Issue 01 Behavior 4 definition) or `always`. | Issue 01 `defaultProperties` (ifMissing only) |
| **Run** | One evaluation of the whole list for one path: property fixed point, at most one move, at most one write. | `evaluateAndMove` |
| **Claim** | The first matching automation in list order that has a `set` action for key K owns K for this run. Later automations skip K. | new |
| **Type automation** | An automation generated from a type definition's `_archive_to`. Read-only, appended after user automations. | "lifecycle rule" in `type-lifecycle-rules.ts` |

"Auto Move" survives in user copy as the name of the `move` action ("Move to folder"), and `help/documentation/22-auto-move.md` becomes a short redirect page. I do not propose "Frontmatter rules" as the user label, because the app's user word is "Properties" (scout-15 section 2). That is owner question Q1.

## 2. Where the code lives (layer rules)

- **One feature folder, `src/lib/features/automations/`.** Today's `features/auto-move/` files move into it with `git mv` in a dedicated refactor slice (S4). Until S4 lands, the code stays in `features/auto-move/` and only grows there.
  - Why rename at all: an agent reading `features/auto-move/` for icon or property behavior is misled.
  - Cost: `feature-cycle.test.ts` rewrites `featurePairs` (`auto-move -> collection|file-icons|type-definitions` becomes `automations -> ...`, validation-08 Confirmed). The diff of that JSON must be committed.
  - The rename is skippable. Everything else in this design works with the old folder name.
- **Imports stay acyclic.**
  - The feature imports `features/collection/expression` (the engine, unchanged in place, scout-01 option A), `features/collection/collection.logic.ts` (`buildNoteRecord`), `features/file-icons` (picker, value validation), `features/type-definitions` (metadata for type automations), `core/frontmatter`, `core/filesystem` and `core/editor`.
  - No feature may import `automations` back. In particular `features/properties` must not, or the pair `properties -> automations` appears. The property-change trigger therefore arrives through a core hook, never through a call from the panel (validation-01 M12, validation-05 M8).
- **Nothing goes in `core/` that imports the engine.** `layer-baseline.json` holds only the 3 `utils -> core` entries, so a `core -> features` import fails at once (validation-05 M9, validation-01 Confirmed). Core gains only registries, inverted the usual way: a create-content transformer (S7) and an optional `previousContent` argument on the after-save observer (S6).
- **File split inside the feature, following CLAUDE.md conventions:**
  - `automations.types.ts`: `Automation`, `Action`, `Trigger`, `Mode`, `AutomationsConfig`.
  - `automation-plan.logic.ts` (pure): compile cache, `matches`, property fixed point, claims, move pick, semantic diff. It imports only pure modules: the evaluator, `collection.logic.ts`, `core/frontmatter/properties.logic.ts` and `utils/frontmatter-aliases.ts`. `pure-logic.test.ts` walks the graph from it (scout-01 section 7).
  - `automation-config.logic.ts` (pure): normalizer and the v1 -> v2 migration.
  - `automations.store.svelte.ts`: today's store with `automations` in place of `rules`. Every getter tested (ADR 0034).
  - `automations.service.ts`: load/save, runner, trigger registration.
  - `type-automations.ts`: today's `type-lifecycle-rules.ts`, emitting `Automation` objects.
  - `AutomationsSection.svelte`, `AutomationCard.svelte`, `ActionList.svelte`, `ActionRow.svelte`.

## 3. Data shape and config migration

### 3.1 New file: `.kokobrain/automations.json`

```json
{
  "version": 2,
  "automations": [
    {
      "id": "rule-1731234567",
      "name": "AWS folder",
      "enabled": true,
      "condition": "file.folder.endsWith(\"/work/topics/AWS\")",
      "triggers": ["save", "pathChange", "create"],
      "actions": [
        { "kind": "set", "key": "_belongs_to", "value": "[[AWS]]", "mode": "ifMissing" },
        { "kind": "set", "key": "_icon", "value": "lucide:cloud", "mode": "ifMissing" }
      ]
    },
    {
      "id": "rule-1731234999",
      "name": "Done tasks to archive",
      "enabled": true,
      "condition": "file.inFolder(\"/vault/tasks/\") && status == \"done\"",
      "triggers": ["save", "propertyChange"],
      "actions": [
        { "kind": "move", "destination": "Archive/{year}" },
        { "kind": "set", "key": "_color", "value": "gray", "mode": "always" }
      ]
    }
  ],
  "excludedFolders": ["_inbox-raw"]
}
```

Design choices:
- **Icons and colors are `set` actions on their real keys.** There is no `AutoMoveIcon`-style parallel shape. ADR 0027 moved icons into frontmatter so that every frontmatter feature sees them, and scout-15 3.2 argues not to model them twice.
  - The Settings UI offers "Set icon", "Set color" and "Set title color" presets. They render the IconPicker or a swatch and produce `set` actions on `_icon`, `_color` and `_title_color`.
  - The sidebar refreshes with no extra call: the `file-icons` note-change consumer runs on the write's after-save (validation-06 Missed 1, validation-05 Confirmed).
- **The value type comes from the JSON type.**
  - `string` is written as text, `number` as a number, `boolean` as a boolean, `string[]` as a list.
  - This fixes Issue 01's string-only limit: `"true"` would be written quoted and `boolFlag` ignores it (scout-15 finding 4, validation-08 Correction 6).
  - Dates are strings of ISO shape (`date` is a read-side label only, scout-16 2.1).
  - No objects and no `null`.
- **Values are literals only in v1.** If computed values come later, they come from the Collection engine. `{year}`-style templates stay legal only in `move.destination`, and `<% %>` is never accepted in actions (validation-01 M6, scout-09 finding 4).
- **`triggers` is per automation** (scout-14 recommendation 2, scout-11 Q2). An automation with no triggers is inert, and the UI says so.
- **`move` has no mode.** At most one `move` action per automation, and the normalizer drops extras with a log.
- **A key deny-list in the normalizer and the UI:** `todoist_project` always (scout-09 3.1; the mechanism in validation-05 R2 is corrected, the advice stands). The UI also warns, without blocking, on `always` for `_type`, `_organized`, `_archived`, `_favorite` and the calendar keys `date`, `start`, `end`, `all_day`, `event_color`, `end_date` (scout-10 2.4, scout-09 3.2-3.3, validation-05 R8).

### 3.2 Loader and normalizer (`automation-config.logic.ts`)

- Per entry:
  - drop anything that is not an object;
  - require a string `id`, a string `condition` and a boolean `enabled`;
  - keep only known trigger names;
  - keep only actions with a known `kind`, a non-empty canonicalizable key, a supported value type and a known `mode` (default `ifMissing`);
  - drop deny-listed keys.

  Each drop is logged once. Today a `null` entry throws in the observer on every save and breaks the Settings render (validation-06 R1).
- Keys are canonicalized at load (`canonicalizeKey`, `utils/frontmatter-aliases.ts:29`), so `organized` becomes `_organized`. The UI shows the canonical form.
- **Corrupt JSON:** copy the bytes to `automations.broken-<stamp>.json`, toast once and load empty. The store then refuses to save until the user acts, which is the open Issue 031 fix built in. This uses the `settings.json` precedent `resetBrokenSettingsFile` (scout-11 F4.3).
- Unknown top-level keys and unknown per-automation fields are kept on save (scout-11 constraint 8).
- A `version` greater than 2 is refused read-only, using the theme-package precedent (`theme-package.logic.ts:6,19`).

### 3.3 Migration from `auto-move-rules.json` (v1, unversioned)

At load:
1. If `automations.json` exists, use it.
2. Otherwise, if `auto-move-rules.json` exists, migrate it in memory, write `automations.json`, and leave the old file byte for byte. It is never read again once the new file exists. An older app build still finds its own file, so a downgrade is safe, and nothing is deleted.
3. Otherwise, start empty.

Per v1 rule (`auto-move.types.ts:14-27`):

| v1 field | v2 | Behavior change? |
|---|---|---|
| `id`, `name`, `enabled` | same | no |
| `expression` | `condition` | no |
| (none) | `triggers: ["save"]` | no: save is today's only trigger |
| `destination` non-blank | `{ kind: "move", destination }` | no |
| `destination` blank (`''`) | **no move action** | **yes.** Today it moves the note to the vault root (`auto-move.logic.ts:128-129`; validation-06 Missed 3). Issue 01 Behavior 1 already decided "empty means no move". Owner confirms (Q4). |
| `icon.iconPack` + `iconName` | `{ kind:"set", key:"_icon", value:"pack:name", mode:"always" }` | no for `_icon` (today it is always set on every matching save, `auto-move.service.ts:199-214`) |
| `icon.color` set | `{ kind:"set", key:"_color", value, mode:"always" }` | no |
| `icon.textColor` set | `{ kind:"set", key:"_title_color", value, mode:"always" }` | no |
| `icon.color` / `textColor` absent | nothing | **yes.** Today these keys are REMOVED on every matching save (`withIconColors`, `frontmatter-icon.service.ts:26-31`). Design A stops removing them: it is the H1 loop source, it conflicts with "nothing is reverted", and no action removes keys in v1 (scout-16 3.4). Owner confirms (Q5). |
| `excludedFolders` | same, normalized (trim slashes) | **yes, a fix.** `'_templates/'` never matched before (validation-01 Confirmed, `auto-move.logic.ts:41-63`) |

Settings: `settings.autoMove.enabled` and `debounceMs` (`settings.types.ts:287-292,408`) stay in `settings.json` under the same key. The persisted key is not renamed, which avoids a settings migration. The cost is a legacy name in the code, documented in its JSDoc. If the owner wants the rename, `parseSettings` reads `automations` with a fallback to `autoMove` (merge by spread, scout-11 F1).

Help example vault: `help/examples/auto-move-features/auto-move-rules.json` gets an `automations.json` sibling, and `examples-scoping.test.ts:231` is extended to the new file name. Today it matches only the `auto-move-rules.json` suffix (validation-06 Missed 11), and an unscoped example that writes frontmatter would stamp every note of a copied vault.

Raw-write ratchet: the entry for `auto-move.service.ts` (`raw-write-ratchet.test.ts:32`) moves to the new service path with the same reason.

## 4. The run: evaluation model (pure planner)

`planRun(input) -> Plan`, in `automation-plan.logic.ts`.

Input:
- `path`: absolute;
- `content`: read at fire time (section 5.6);
- `stats`: `{ mtime, ctime, size }`;
- `triggers`: `Set<Trigger>`, the union of what fired during the debounce;
- `automations`: user automations, then type automations;
- `vaultPath`.

Output: `{ move: { destination: string } | null, changes: { key, value, type }[], aborted?: { reason, automationIds } }`.

Steps:
1. **Select.** Keep automations that are enabled and whose `triggers` intersect the input set.
2. **Compile.** Parse each condition through a module-level cache keyed by the condition string, which is reset when the config changes. `evaluateExpression` re-parses on every call (`evaluator.ts:75-78`), and the collection caches per query (`collection.logic.ts:347-357`). Validate with the strong validator (`evaluator.ts:306-315`), not Auto Move's parse-only one (`auto-move.logic.ts:87-95`). Match with `toTruthy` (`evaluator.ts:632-636`), which keeps Collection semantics (validation-01 M4). A throwing condition counts as no match and is reported once per automation per session (section 9).
3. **Property fixed point.** The working copy is `parseFrontmatterProperties(content)` on canonical keys. Repeat until a pass changes nothing, with a cap of 10 passes (the `MAX_FORMULA_DEPTH` precedent, `evaluator.ts:18`):
   - Rebuild the record: `buildNoteRecord(path, rebuildContent(working, body, content), stats)`. Do not patch `record.properties`, because `organized`, `tags` and the relationship arrays are derived (scout-16 2.3, validation-02 Correction 1).
   - For each selected automation in order, if its condition matches, it claims every key of its `set` actions that is not already claimed. This claim on match, not on write, is what makes conflicting `always` rules converge (scout-16 4.3). For each key it claimed:
     - `ifMissing`: set the value when the working value is missing. Use the shared empty definition: export `isEmptyPropertyValue` (`properties.logic.ts:464`, private today) rather than add a fifth copy (scout-16 2.2).
     - `always`: set the value when it differs, with deep equality for lists.
   - Track the serialized working state of each pass. A repeat that is not the previous state, or reaching the cap, means `aborted = { reason: 'cycle' | 'cap', ... }` and the plan is empty (scout-16 5.4 layer 2).
4. **Move.** Pick the first selected automation, in order, that has a `move` action and whose condition matches the record after step 3. Type automations are last. Resolve the destination with today's `resolveDestination` and `isAlreadyInDestination` (`auto-move.logic.ts:69-130`).
5. **Re-plan at the destination.** If a move was picked, rerun step 3 with the record at the destination path (`file.folder` changed). Folder-keyed `set` actions then apply in the same run, with no second save, which is the Issue 01 motivating case. Only one move per run.
6. **Diff.** `changes` holds the canonical keys whose final working value differs semantically from the parsed original. An empty `changes` with no move means the run does nothing. This semantic no-op check is required, not an optimization: a no-op `mutate` still rewrites non-canonical YAML once (validation-01 R1, validation-07 R3, validation-03 R9).

What this replaces in the Issue 01 spec:
- Behavior 5 (a property-only rule matches only when it has something to do) is gone. Moves and sets are selected separately, so a property-only automation can never shadow a move or a type automation.
- Behavior 6 (chaining through the save) is replaced by the in-memory fixed point. This is owner question Q6, scout-16 Q7.

Mode interactions, documented in the UI:
- A matching `ifMissing` automation above an `always` automation on the same key shadows it while the key is populated. The card shows "overridden by N".
- An `always` key cannot be edited by hand on a matching note. The next save re-applies it (scout-16 3.1).

## 5. Triggers: one runner, four entry points

### 5.1 Runner (`automations.service.ts`)

- **`pending: Map<path, { triggers: Set<Trigger>, timer }>`.** A new trigger for a path adds to the set and re-arms the timer. The delay is the shortest delay among the triggers in the set: `debounceMs` (default 3000, `settings.store.svelte.ts:112`) for `save` and `pathChange`, and a short fixed delay for `propertyChange` (section 5.3).
- **`queue: Map<path, Promise>`.** Runs for one path are chained, using the `serializeListWrite` pattern (`rail-shell/list-prefs.service.ts:28-37`). This is the per-path serialization `updateNoteFrontmatter` asks of callers (`:95-97`), across all triggers, moves included.
- **`lastEngineWrite: Map<path, string>`** holds the bytes the run wrote. The save observer skips when the content it receives equals that entry (scout-16 5.4 layer 3). The match is on bytes, never on the path, so a user autosave queued behind the engine's write is never swallowed (validation-03 Missed 7).
- **`ownMoves: Set<"from\0to">`** is set around the runner's own `moveItem` call. The path-change consumer consumes it, following the `asOwnPathChange` / `takeOwnPathChange` pattern (`event-calendar.service.ts:583-601`). Both the move call and the consumer live in this feature, so no core marker is needed (contrast validation-04 Missed 5, which applies only when another module's moves must be recognized).

The run, executed in the queue:
1. Re-resolve the path: a pending entry follows path changes (5.4).
2. Read content: the open tab's content, else `readTextFile`.
3. Apply the guards (5.6).
4. Take `stats` from `collectionStore.propertyIndex.get(path)`, falling back to the record captured at path-change time (validation-01 M9). This replaces `Date.now()` twice and size 0 (`auto-move.service.ts:154`).
5. `planRun`.
6. If there is a move: `mkdir -p`, then `moveItem` wrapped in `ownMoves`.
7. If there are `changes`: one `updateNoteFrontmatter(targetPath, mutate)`. The `mutate` is pure and re-applies each change against the fresh `props`: an `ifMissing` key is re-checked and skipped if the user filled it during the debounce, and keys it does not own are never removed (validation-03 Correction 3). Record the returned bytes in `lastEngineWrite`.
8. Catch `FrontmatterWriteError` and the plain fs error of a vanished path without toasting (validation-03 Missed 9, scout-08 4.2.6), and log.

### 5.2 Save trigger

- **Hook:** `addAfterSaveObserver` (`editor.hooks.ts`). Register it in `initializeVault` where Auto Move registers today (`app-lifecycle.service.ts:443-448`), and unregister it in `teardownVault` (`:669`).
- **The observer stays synchronous.** It filters, then schedules (indexing-watcher rule 6, `docs/agents/indexing-watcher-rules.md:15-17`).
- **It sees:** editor autosaves, `updateNoteFrontmatter` closed-note writes, deep-link writes and creates, and mod `vault.write` (`notifyAfterSave` call sites, validation-01 Confirmed).
- **It does not see:** link rewrites, type renames, watcher edits, task writes, explorer/note-creator creates and moves (validation-05 C6, validation-07 Missed 1). That is documented, not fixed.
- Toggling off cancels pending timers. Today it does not (`auto-move.service.ts:134-146`; scout-02 3.8).

### 5.3 Property-change trigger

There is no per-key change signal anywhere (scout-07 section 2, validation-04 Confirmed). Design A derives it on the save path, with one additive core change.
- **Core change:** `AfterSaveObserver = (filePath, content, previousContent?: string) => void` (`editor.hooks.ts:10`). `notifyAfterSave` passes it through (`:67`).
  - `writeTab` passes `tab.savedContent` from before the write (`editor.service.ts:187-196`).
  - `updateNoteFrontmatter` passes `base` (`frontmatter-write.service.ts:116-128,161`; validation-03 R6 confirms `base` is in hand).
  - Deep links and mods pass nothing.

  Existing observers ignore the third argument, so the change is additive.
- **Detection:** `propertyChange` fires when `previousContent` is present and the canonical parsed frontmatter of the two versions differs (`parseFrontmatterProperties`, compared per canonical key). The raw frontmatter is diffed, never the projected record, so typing `#tag` in the body does not count (validation-04 R2). When `previousContent` is absent, only `save` is added.
- **Latency:** the property-change delay is short (proposal: 300 ms, unmeasured), added to the existing 500 ms frontmatter autosave (`editor.service.ts:230`). That gives about 0.8 s after the last frontmatter keystroke in the panel, the YAML or meta-bind, and about 0.3 s after a Cmd+D/Cmd+E toggle, which saves at once. The `save` trigger in the same set keeps `debounceMs`. The pending entry takes the shortest delay, so an automation with both triggers runs at the property-change cadence when properties changed.
- **Why not a `NoteChangeConsumer`:** it has no `source`, sees unsaved `edit` content, skips save dedupe hits, misses the watcher's full-rebuild and 15 s self-save windows, and cascades through link rewrites (validation-04 R1, R5, R8; validation-03 Missed 6; validation-08 R2).
- **Why not a seam in `syncExternalContentToEditor`:** it would fire per keystroke from the panel (`PropertyField.svelte:64-82,135-143`), and the panel writes are not saved yet.
- **Out of scope in v1:** YAML edited outside the app (watcher). It needs its own echo rules (scout-08 section 7, validation-07 Missed 1). Owner question Q9.

### 5.4 Move / rename trigger

- **Hook:** `registerPathChangeConsumer({ name: 'automations', pathChanged })` (`path-change.service.ts:73`). Registered vault-lifetime in the `unregisterNoteChangeConsumers` list (`app-lifecycle.service.ts:258-275`) and pinned by a lifecycle test (ADR 0003 Consequences).
- **`pathChanged(from, to)` runs synchronously, mid-operation** (`path-change.service.ts:173-182`, before the link rewrite, the tree move and `rename_note`). It must:
  1. return if `to === null`;
  2. return after consuming an `ownMoves` mark (the runner's own move, which is already re-planned in step 5 of section 4);
  3. **re-key** every pending entry for `from` and for `from + '/'` prefixes onto `to`. This also fixes today's stale-timer bug for the save trigger (validation-01 M3, validation-08 M7);
  4. capture `collectionStore.propertyIndex.get(from)` stats while that record still exists (validation-01 M9);
  5. schedule `pathChange` for `to` with `debounceMs`. The delay outlasts the async tail of `applyPathChange`, and the run reads content at fire time, never from the index, where `to` arrives only with the throttled delta (validation-02 Correction 2).
- **Folder move or rename:** a single event for the folder (`path-change.service.ts:41-48`). At fire time, enumerate Markdown descendants under `to + '/'` from `fsStore.fileTree`, and schedule each one up to a cap. The proposal is 50, unmeasured; above the cap, log and toast once that N notes were not evaluated. Owner question Q10.
- **Moves by other modules** (Todoist `sync-now.service.ts:960`, the event calendar `:734`, mods `mod-vault.service.ts:60,67`) are counted in v1, because they carry no mark (validation-04 Missed 5). Rules only write frontmatter, which Todoist and the calendar do not read for these notes. The event calendar's rename-then-write (`event-calendar.service.ts:732-759`) finishes well inside the 3 s debounce, so no overlap is expected. That timing was not measured. Owner question Q11.
- **Trash restore and `duplicateItem`** do not go through `applyPathChange` and are not triggers (validation-04 Confirmed).
- The runner's own move never re-triggers: it carries the `ownMoves` mark, and the write after it is skipped by `lastEngineWrite`. A ping-pong such as "Auto Move X -> Y, then Y -> X" is impossible (scout-08 5.2).

### 5.5 Create trigger

- **Seam:** a new core registry, `registerNoteContentTransformer(fn)`, with `fn: (path, content) => string`. It is synchronous, must not throw (wrapped: on a throw, log and return the original), and has one slot, like `registerCalendarDailyNoteOpener`.
  - It is called in `openOrCreateNote` after `buildContent` and before `create_note` (`note-creator.service.ts:101-103`, the documented pre-write seam at `:33-38`), and in `createFile` before `call('create_note')` (`fs.service.ts:208`).
  - It is registered vault-lifetime from `initializeVault` and covered by a lifecycle test.
  - `indexing-watcher-rules.md` rule 6 gets one sentence under "Consumers register".
- **The transformer runs only `set` actions** of automations with the `create` trigger, through `planRun` with `triggers: {create}`, a record from the content in hand and zero stats. `buildNoteRecord` works on a path that does not exist yet (scout-08 3A). Benefits:
  - one write;
  - no tab yet, so no caret blocker 001;
  - no after-save echo;
  - Rust indexes the final content.
- **`move` actions are ignored on create in v1.** The note is moved by a later `save` or `pathChange` run when the automation has those triggers. Owner question Q12.
- **Coverage:** `openOrCreateNote` reaches templates, periodic notes, quick capture, 1:1, wikilink create and typed notes; `createFile` reaches the explorer, Cmd+N, "+ New here", the calendar and typed notes (validation-05 R4). Deep-link creates already fire after-save and get `save` automations. That is a different trigger set, documented, with no dedupe needed because there is no second write when nothing changes (validation-01 R2, validation-06 R3). Mod `vault.create`, Todoist closed notes, duplicates and restores are not create triggers in v1. Owner question Q12.
- **Builders that already stamp keys** (`_organized: false`, `_type`, `_belongs_to`) run before the transformer, so `ifMissing` respects them and `always` overrides them (scout-09 section 5).
- **Guards:** non-Markdown files are skipped. Content that starts with `---` but matches no block is left as is: an empty `---\n---` block or a missing closing fence would stack a second block (validation-04 R3, open Issues 005 and 022).

### 5.6 Shared guards (every trigger, in this order)

1. The master switch (5.7) is on, and the config is loaded and not in the broken read-only state.
2. `isMarkdownFile(path)` (`fs.logic.ts:65`). This gate prevents the YAML block being prepended to JSON, canvas or kanban files (validation-01 M1, validation-02 M1), and it closes open Issue 054 for moves too.
3. Not in a default exclusion: `_system/`, `.kokobrain/`, hidden folders, the configured templates folder (read from `settingsStore.templates.folder`, never a hard-coded `_templates`, validation-05 R7), type definition notes (`isA === 'Type'`, `type-definitions.logic.ts:91-93`).
4. Not in the user's `excludedFolders` (normalized).
5. **The block is found and not lossy:** `detectLossyFrontmatter(content) === null`, and the content does not start with `---` unless `FRONTMATTER_REGEX` matches (validation-04 Correction 3). Lossy notes are skipped quietly, with a debug log (`auto-move.service.ts:201-207` precedent).
6. On `save` and `propertyChange` only: content is not equal to `lastEngineWrite.get(path)`.

### 5.7 Master switch

There is one switch, "Enable automations" (persisted as `settings.autoMove.enabled`, default off, `settings.store.svelte.ts:110-113`), plus a per-automation `enabled`. Consequence: the switch also gates type automations (`_archive_to` moves), as it does today (`22-auto-move.md:124`). A user who enables the switch for property defaults also gets `_archive_to` moves for types that define it. That is intended configuration, but it is new exposure for users who kept Auto Move off. Owner question Q3. The alternative is a second switch for type automations.

The gate becomes "any compiled automation for this trigger", not "any type definition exists" (`auto-move.service.ts:100-102`; validation-07 Missed 7).

## 6. Loop and oscillation protection (summary of layers)

| Layer | Mechanism | Stops |
|---|---|---|
| 1 | In-memory fixed point, one write per run (section 4) | rule-to-rule chains costing one save, snapshot and reindex per hop; separate writes of conflicting rules |
| 2 | Claim on match per key | `always x=1` vs `always x=2` ping-pong (scout-16 4.3) |
| 3 | Visited state plus a 10-pass cap, abort without writing, log once | reciprocal always-set chains with no fixed point |
| 4 | Semantic no-op check before the writer | canonicalization rewrites of notes the rules leave unchanged (validation-07 R3) |
| 5 | `lastEngineWrite` byte echo skip | re-evaluation of the engine's own save; termination no longer depends on byte idempotence |
| 6 | `ownMoves` mark, one move per run | move chains through path-change events |
| 7 | Single owner of `_icon`/`_color`/`_title_color` (the Auto Move icon path is removed) | the H1 loop (validation-05 R1) |
| 8 | Literal values only in v1 | volatile always-set values (`now()`, mtime), which never converge (scout-16 5.2) |

Outside the engine's reach, documented and not guarded:
- a vault mod writing the same key from `onNoteSaved` (`mods-host.service.ts:554-579`);
- type rename, which does not rewrite conditions that name the old type (scout-09 H8).

Conditions using `now()` / `today()` change their match without any event (validation-07 Missed 2). Design A has no "skip when frontmatter unchanged" pre-filter on `save`, so they are evaluated on every save. That is correct, and the docs say date conditions fire only when the note is touched (scout-01 Q4).

Settings lint (advisory, AST walk as in `findUnknownFunction`, scout-16 5.3):
- an automation always-sets a key its condition reads;
- two automations always-set one key (the card shows "overridden by N");
- an unknown identifier that is not in `getAllKnownProperties` (validation-06 R2: a typo makes `!stauts` true, so the rule matches every note);
- alias keys in conditions (`icon`, `color`, `order`) that never resolve (validation-01 M5).

## 7. Interaction with other frontmatter writers and Todoist

- **Properties panel.** A rule write landing within 300 ms of a panel commit is skipped by the panel's single-use skip flag. The next panel keystroke then rebuilds the block from the stale store and drops the rule's keys (validation-05 R6, validation-08 M4). This is open Issue 105 (CONFIRMED_BY_TEST, data loss) and Issue 008. With the property-change delay, a rule write lands at least about 0.8 s after the last panel keystroke, but resumed typing re-opens the window. **The Issue 105 skip-flag fix blocks S6.** It belongs to the panel, not to the engine.
- **Lifecycle toggles** go through `updateNoteFrontmatter`, so they fire `propertyChange` within about 0.3 s. Setting `_archived: true` and a type automation together give a move in the same run. The `requestPromptIndexRefresh` nudge (`vault.store.svelte.ts:114-116`) is called by the runner after a write that changed `_favorite`, `_organized`, `_archived`, `_rail`, `_type` or `_icon`, or after a move, so the rail and lists do not lag 2-10 s (validation-02 M6).
- **Todoist (ADR 0037):**
  - `todoist_project` is deny-listed.
  - Rule writes on notes with anchored tasks schedule a sync cycle through the observer (`sync-scheduler.service.ts:90-98`, 30 s minimum spacing). One write per run keeps this bounded.
  - The closed-note write race with `write_task_lines` (scout-09 H4) is plausible and unproven, needs a closed note and a millisecond window, and is not guarded in v1 (Q13).
  - Frontmatter growth shifts task line numbers. First-anchor writes then go stale and retry next cycle, at the cost of a delay and no corruption (scout-09 3.1).
- **Event calendar.** Always-set on calendar keys is warned in the UI. Fill-only on other keys is safe (scout-09 3.2).
- **Explicit organization.** It stamps `_organized: false` before the create transformer, so it composes. The UI warns that `ifMissing _organized: false` on save sends every matched old note to the Inbox (scout-15 3.2).
- **File History.** Each run that writes adds one snapshot (`file-history.service.ts:192`). It is not an undo net: history is pruned at about 37 days, can be disabled, and has no row for externally edited notes (validation-07 R2).
- **Link rewrite.** It does not fire after-save, so no cascade into backlink sources (validation-04 R8 holds only for consumer-based triggers, which Design A avoids). An `always` wikilink value fights a rename of its target on the next save (scout-16 3.3). The UI recommends `ifMissing` for wikilink values.
- **Semantic and FTS cost.** Adding a key re-keys all of a note's semantic chunks (no inference) and rewrites FTS (validation-07 R1). Once per run, acceptable.

## 8. Open-itens 001 (caret) and other blockers

- **001 applies to every write to an open tab** (`syncExternalContentToEditor` -> `MarkdownEditor.svelte:627`). It also affects background tabs (validation-06 Missed 8).
  - Design A does not make it worse for existing Auto Move users. The migrated icon actions write exactly what the icon path writes today, and they stop deleting colors.
  - Any slice that adds new writes to open notes (S3 set actions on save, S5, S6) is blocked by 001.
  - S7 (create, pre-write) is not blocked by 001.
  - Meta-bind's ranged transaction (`widgets.ts:868-895`) is the in-repo alternative (validation-05 M4). Design A does not take it: it would be a second write seam, and 001 is ready-for-agent and small.
- **005 / 022 (empty block stacking).** The shared guard skips such notes (5.6 step 5). With the guard in place, S3 does not depend on them, but folder-note-like notes get no rules until 022 lands. Listed as a co-requisite, not a blocker.
- **105 skip flag** blocks S6 (section 7).
- **054** (Markdown only) is absorbed by S2.
- **031 / 079** (config hygiene) are absorbed by S2/S3 for the new file. Their Auto Move-file versions become moot once S2 lands. Close them with S2 or keep them as sequencing (owner).
- **169** (icon reader through Rust) is independent. Design A does not hook the file-icons consumer (validation-03 Missed 2).

## 9. Errors and visibility

- **Condition errors** go to `error()` (Sentry) once per automation id per session, then to the debug log. Today it is one Sentry event per rule, note and save (validation-01 M10). The Settings card shows a red "failed on N notes this session" chip from a store counter (tested getter).
- **Write refusals and skips** (lossy, broken block) are debug-logged, never toasted per autosave (Issue 01 Behavior 7).
- **A move onto an existing target** stays silent as today (`auto-move.service.ts:189-195`). Open Issue 082 (toast naming the note) applies unchanged.
- **Cycle abort:** `error()` once per path and automation set per session, plus a card warning.

## 10. Settings UI

One section replaces "Auto Move" in the Vault group (`settings.logic.ts:279`). The section id changes from `autoMove` to `automations`, which touches `SettingsSection` (`settings.types.ts:359`), `sectionIcons` and `sectionComponents` (`SettingsPanel.svelte:44-91`), and the hard-coded id lists in `settings.logic.test.ts:372,384` and `SettingsPanel.test.ts:23` (scout-11 F1).

Layout:
- **Top:** the enable switch, `debounceMs` (relabelled "Delay after save or move"), and one line: "Nothing is undone when an automation stops matching" (scout-11 F7).
- **List:** cards in evaluation order. The displayed order is the evaluated order (scout-14 3.4).
  - **Card header:** name, enable switch, up/down, delete (from `AutoMoveRuleRow.svelte:64-101`).
  - **Condition:** an expression input with the error DERIVED from the value (`$derived`, fixing the persisted-invalid green check, `AutoMoveRuleRow.svelte:37-43,114-121`), the strong validator, and the lint warnings from section 6.
  - **Triggers:** four toggles: "On save", "When properties change", "When created", "When moved or renamed". `components/ui/` has no checkbox (validation-06 Missed 10): use `Switch`, or generate `checkbox` with the shadcn-svelte CLI.
  - **Actions:** an "Add action" dropdown with Move to folder, Set property, Set icon, Set color, Set title color.
    - Each row has its editor and a mode `Select` ("Only if missing" / "Always"; `move` has none).
    - Property key input with suggestions from `getAllKnownProperties`, minus the `file.*` pseudo-keys (`filter.logic.ts:223`; scout-11 F6), and shown in canonical form.
    - Value type `Select` (text, number, yes/no, list).
    - Icon via `IconPicker` (`IconPicker.svelte:17-36`). Colors via the picker's color-only mode (`onColorsChange`), or an extracted swatch row, validated with the readers' `;` / `url(` rule (`file-icons.logic.ts:162-164`). Note that `_color` palette names map to theme tokens and `_title_color` takes raw CSS keywords (validation-03 R8).
  - **Inline hints:** "does nothing" (no triggers or no actions), "overridden by N", deny-listed key, and always-set warnings on lifecycle and calendar keys.
- **Read-only block:** "From type definitions", listing the generated type automations (scout-11 Q8).
- **Excluded folders:** the chip list, unchanged UI, normalized storage.
- **Saving:** flush on destroy instead of clearing the timer (Issue 079, `AutoMoveSection.svelte:25-27`). Section switches unmount the component too (validation-06 Missed 9).
- **Card size:** today's row is 165 lines with one field. Split into `AutomationCard`, `TriggerToggles`, `ActionList` and `ActionRow` from the start (scout-11 F2).
- **Deferred (S8):** a "N notes match" preview, a "would change N notes" dry run, and "Apply to existing notes". The bulk pass is a TS loop over the runner, sequential, skipping the active dirty tab until 001 lands (scout-13 6.2-6.4, validation-07 Correction 3).

## 11. Docs

- New `help/documentation/22-automations.md`; `22-auto-move.md` becomes a pointer page. Contents:
  - conditions (underscore keys in conditions, `file.folder` is absolute and `inFolder` has no separator check, from validation-02 M11 and validation-08 M2);
  - triggers and their real coverage (what is not seen: watcher, link rewrite, type rename, machine creates);
  - actions and modes, the definition of missing, the claim rule, `always` vs hand edits, wikilink values;
  - the one-move rule;
  - the migration (empty destination, icon colors no longer removed);
  - `file.mtime`/`file.ctime`/`file.size` accuracy;
  - lossy notes skipped;
  - mods loop caveat.
- Update `19-settings.md:9,236-245` (section name, new file), `28-mods.md:304,308` and `mods/07-events-and-reactivity.md` (the "which writes fire it" table gains create-transformed notes, which still fire nothing), `01-getting-started.md:136`, `12-collection.md:266`, and `25-types-and-relationships.md:267,345`.
- **ADRs:**
  - A new ADR "Automations: one rule engine for moves and frontmatter" records the single list, the claim rule, the fixed point and the config file. It relates to ADR 0019, which gets a new `.kokobrain/` file.
  - An ADR 0029 amendment: the "Trigger window" gains automatic writers on save, property change, create and move.
  - An ADR 0003 amendment, or a note in the new ADR, for the create-transformer registry and the `previousContent` hook argument.
- `docs/agents/indexing-watcher-rules.md` rule 6 gets a one-sentence note for the transformer registry.

## 12. Test strategy

The rules apply throughout: real stores, no mocks of stores or `.logic.ts` (CLAUDE.md QR 1, `docs/TESTING.md`). Mock only `@tauri-apps/plugin-fs`, typed `call()` and DOM services.

1. **S0 characterization first** (the CLAUDE.md "Removing or Refactoring Code" checks). A service test drives the REAL chain:
   - the real `editor.hooks` registry, the real `updateNoteFrontmatter` and the real `applyPathChange`/`moveItem`, with a mocked plugin-fs and `call`;
   - it pins today's moves: first match, the lifecycle archive and unarchive moves, excluded folders, already-in-destination;
   - it pins icon application including color removal, the lossy skip, and the move-failure skip.

   Today the service test mocks `editor.hooks`, `fs.service` and `file-icons.service` (`auto-move.service.test.ts:6-29`), so this chain is untested (validation-01 Confirmed). Each later slice states which pinned behaviors it changes on purpose.
2. **`automation-plan.logic.ts`:** happy path, empty and null inputs, errors. Cases:
   - both modes on every value type;
   - the definition of missing, including `[""]` counting as populated (scout-16 2.2);
   - canonical keys;
   - the claim rule against the A/B always counter-example;
   - fixed-point chains;
   - cycle and cap abort;
   - one move per run, and re-planning at the destination;
   - type automations last;
   - `toTruthy` on `NaN`;
   - a throwing condition;
   - the semantic no-op on non-canonical YAML (block list in, plan empty).
3. **`automation-config.logic.ts`:**
   - the normalizer for every malformed shape in validation-06 R1;
   - migration fixtures: an empty destination, an icon with and without colors, unknown fields, and the shipped help example;
   - a version above 2 refused.
4. **Service and runner** (real stores: `editorStore`, `collectionStore`, `settingsStore`):
   - one write per run (assert the file bytes, and that the history observer saw one save);
   - the echo skip;
   - a user autosave queued behind the engine's write still triggers;
   - timers re-keyed on rename, folder rename enumeration and the cap, own moves ignored;
   - cancel on disable;
   - the vanished-path error;
   - the Markdown guard (a `.json` file through mod write is untouched);
   - the empty-block guard;
   - broken config backup;
   - the H1 regression: an `_icon` automation and a `_color` automation converge in one write.
5. **Core hooks:**
   - `previousContent` delivered by `writeTab` and `updateNoteFrontmatter` (`editor.hooks` test);
   - the transformer is called by both creators, a throw does not block creation, and non-Markdown is skipped;
   - lifecycle registration and teardown tests for the observer, the path-change consumer and the transformer (ADR 0003).
6. **Architecture tests:**
   - `feature-cycle` `featurePairs` diff committed;
   - `pure-logic` passes for the two new `.logic.ts` files;
   - raw-write ratchet entry moved;
   - `examples-scoping` covers `automations.json`.
7. **Components:** `AutomationCard`, `ActionRow`, `TriggerToggles` with `mount` and the `ResizeObserver` polyfill pattern (`AutoMoveRuleRow.test.ts`). Cover the derived error, add/remove/reorder of actions, mode switching and the hints.
8. **E2E (S3):** one happy path via `bash scripts/e2e.sh`. Configure an automation, save a note in the folder, and assert the property is RENDERED in the Properties panel (CLAUDE.md QR 8).

## 13. Slice plan (independently shippable Issues)

Each slice is one relay-lite Issue with a frontend gate (`pnpm check` + `pnpm vitest run`) unless noted. Each new Issue supersedes the corresponding part of `auto-move-default-properties/01` and `02`. Those two are closed with a pointer, subject to owner approval (Q2).

| # | Issue | Delivers | Blocked by | Blocks |
|---|---|---|---|---|
| S0 | Auto Move characterization tests on the real chain | tests only, no behavior change | none | S2 |
| S1 | Automation types, planner and config normalizer/migration (pure, unwired) | `automations.types.ts`, `automation-plan.logic.ts`, `automation-config.logic.ts`, exported `isEmptyPropertyValue`, full logic tests | none | S2 |
| S2 | Auto Move runs on the Automations runner and `automations.json` | migration on load; runner with per-path queue, fire-time read, real stats, Markdown guard (closes 054), timers that follow path changes and cancel on disable, broken-file backup and flush on destroy (031/079 for the new file), icon as `set` actions (stops color removal); Settings card edits `move` and icon actions in the new shape. Owner-visible changes: Q4, Q5 | S0, S1, owner answers Q2, Q4, Q5 | S3, S5 |
| S3 | Set-property actions, modes and all-match claims, plus the action editor | `set` for any key and value type, `ifMissing`/`always`, deny-list and warnings, lint hints, E2E. Covers and replaces Issue 01 | S2, **001**; 022 recommended | S5, S6, S7, S8 |
| S4 | Rename `features/auto-move` to `features/automations`, Settings section rename, docs page and ADR | pure move plus copy; `featurePairs` diff | S3 (or after S2) | none |
| S5 | Move/rename trigger | path-change consumer, own-move mark, folder enumeration with cap. Covers and replaces Issue 02 | S2 (S3 for set actions), **001**, owner Q10, Q11 | none |
| S6 | Property-change trigger | core `previousContent` argument, canonical frontmatter diff, short delay, lifecycle refresh nudge | S3, **001**, **Issue 105 skip-flag fix**, owner Q7 | none |
| S7 | Create trigger | core `registerNoteContentTransformer`, wired in `openOrCreateNote` and `createFile` | S3, 022 for template-born empty blocks, owner Q12 | none |
| S8 | Preview, dry run and "Apply to existing notes" | bulk pass with progress and cancel | S3, owner Q14 | none |

S2 ships value alone: the bugs fixed are the stale timer, Markdown-only, the color-deleting loop and config loss. S3 alone delivers the owner's main case (save-triggered fill and set). S5, S6 and S7 are independent of each other after S3.

## 14. Real weaknesses of Design A

1. **It refactors a working, user-facing feature before delivering the new one.** S0 to S2 rewrite Auto Move's evaluation, storage and Settings before any property action ships. Issue 01 (ready-for-agent today) waits behind three slices. "Extend Auto Move" would ship the owner's motivating case sooner.
2. **The config migration is the first schema version in `.kokobrain`.** It needs a normalizer, a backup, a downgrade story and example-vault coverage. Hand-editing the new shape is harder than the flat v1 file.
3. **Intentional behavior changes for existing users:** an empty destination no longer moves to the vault root, the icon no longer deletes colors, excluded folders are normalized, and non-Markdown files are no longer moved. Each is a fix, but each changes what an existing config does.
4. **One list, two selection semantics.** List order means "priority per key" for `set` and "first match" for `move`. That is harder to explain than two lists, and the card UI must make it visible ("overridden by", "moves here").
5. **One master switch couples moves and property writes,** including `_archive_to` moves (Q3).
6. **Per-automation triggers apply to moves too.** A `propertyChange` move can move the active note about 0.8 s after the user toggles a property. The tab follows the move (`updateTabAfterRenameOrMove`), but it is more abrupt than today's 3 s after a save.
7. **Two small core API changes** (the `previousContent` hook argument and the create transformer). Both are additive and both need lifecycle tests. The owner's "no core changes for corner cases" rule is not triggered, because these are the requested triggers, but they still need the owner's yes.
8. **The Settings card grows a lot.** The component split is mandatory, and component test volume grows with it.
9. **The in-memory fixed point changes Issue 01's agreed chaining model** (Behavior 6), so the owner must re-approve it (Q6).
10. **Renaming the folder** (S4) is churn with no user value. It is optional and deliberately last.

Why the alternatives do not escape these:
- A **separate feature** still needs the per-path runner shared with Auto Move to avoid the closed-note race and the icon-key loop (validation-08 M5, validation-05 C1). In practice that means it extends Auto Move's runner anyway, plus a second list, config, section and switch.
- A **shared core with two lists** removes weakness 4. It keeps two configs, two Settings sections and the cross-list priority question (a property list and a move list writing `_archived`). The runner still has to be shared.

## 15. Open questions only the owner can answer

1. **Q1. Names.** "Automations" (proposed) vs "Rules" vs "Property rules" for the section and the concept. Keep the `auto-move` folder name or rename it (S4)?
2. **Q2. Supersede Issues.** Is it OK to supersede `auto-move-default-properties/01` (ready-for-agent) and `02` (needs-triage) with S3 and S5, and to fold 054 into S2?
3. **Q3. Master switch.** One switch, which also enables `_archive_to` type moves, or a separate switch for type automations?
4. **Q4. Empty destination.** A migrated rule with an empty destination: drop the move (Issue 01 semantics) or keep "move to the vault root"?
5. **Q5. Migrated icon actions.** Stop deleting `_color`/`_title_color` (recommended)? Keep their mode `always` (today's behavior, so a manual icon change on a matched note is reverted) or switch them to `ifMissing`?
6. **Q6. Chaining model.** In-memory fixed point with one write per run, replacing Issue 01's "chaining through the save"?
7. **Q7. Property-change latency.** Is about 0.8 s after the last frontmatter keystroke (about 0.3 s for toggles) "immediately"? Does `propertyChange` also apply to changes made by integrations (Todoist, calendar, mods, the engine's earlier runs)? The design cannot tell them apart without a source argument.
8. **Q8. Lists and value types.** Value types: text, number, yes/no, list. Under `always`, a list is replaced. Is an "add item if absent" mode wanted in v1 (the `ensureFrontmatterLink` stem dedupe, after exporting it: validation-08 R5)?
9. **Q9. External YAML edits.** Watcher-delivered YAML edits as `propertyChange` in a later slice, or never?
10. **Q10. Folder moves.** Evaluate descendants up to a cap? Which cap and which message above it?
11. **Q11. Machine renames.** Do renames and moves made by Todoist, the calendar or mods trigger `pathChange` (proposed yes)?
12. **Q12. Create coverage.** Include mod creates, Todoist notes, duplicates and restores? Should `move` actions on `create` run after creation (a second operation) or wait for the next save or move?
13. **Q13. Todoist race.** Accept the unproven Todoist closed-note race (scout-09 H4) in v1, or skip notes with anchored tasks while a cycle runs?
14. **Q14. Bulk pass.** Is "Apply to existing notes" (S8) wanted? With which vault size in mind (scout-13 Q1)?
15. **Q15. Error reporting.** Sentry once per automation per session (proposed), or local log only?
16. **Q16. One-time reformat.** Is a one-time canonical reformat of a note's YAML acceptable the first time an automation really changes a value there? The semantic no-op check means unchanged notes are never rewritten.

## 16. Not verified

- No timings. The 300 ms property-change delay, the folder cap of 50 and the 10-pass cap are proposals, not measurements.
- Whether Tauri handles the un-awaited Rust index update before a later read (validation-02 R2). Design A never reads Rust right after a save, so it does not depend on it.
- Whether plugin-fs offers a cheap `stat` that could replace index-record stats. I did not check the API, and I propose index stats with a fallback instead.
- The event-calendar rename-then-write timing relative to the 3 s debounce was reasoned, not measured.
- The owner's installed vault mods (outside the working directory): whether any of them writes frontmatter from `onNoteSaved`.
