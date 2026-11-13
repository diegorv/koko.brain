# Scout 02: Auto Move end to end

Scope: `src/lib/features/auto-move/*`, `.kokobrain/auto-move-rules.json`, the tests under `src/tests/lib/features/auto-move/`, the two `auto-move-default-properties` Issues and `help/documentation/22-auto-move.md`. Read-only. Nothing was run. Where I could not verify something, it says so.

## 1. How Auto Move works today (verified)

### Pipeline

1. **Boot.** `initializeVault` loads the config in step 3 (`app-lifecycle.service.ts:303`, `loadAutoMoveConfig`). It registers the hook in step 6 only when `settingsStore.autoMove.enabled` (`app-lifecycle.service.ts:443-445`, `toggleAutoMoveHook(true)`). The comment at `:295-296` shows the order is deliberate: the bookmarks migration runs before the hook is registered so that favoriting cannot move a note. `teardownVault` calls `resetAutoMove` (`:669`).
2. **Trigger.** `registerAutoMoveHook` (`auto-move.service.ts:94-127`) adds an after-save observer through `addAfterSaveObserver` (`core/editor/editor.hooks.ts`). The observer fires for everything that calls `notifyAfterSave`, not only the editor autosave. Callers: `editor.service.ts:196` (`writeTab`), `frontmatter-write.service.ts:161` (closed-note branch of `updateNoteFrontmatter`), `deep-link-actions.ts:78,216`, `deep-link.service.ts:277,296,313,337`, `mod-vault.service.ts:135`.
3. **Cheap gates, synchronous, in the observer** (`auto-move.service.ts:97-110`):
   - `.view` files are skipped (`isViewFile`). Nothing else is filtered by extension. The docs claim "only `.md` files" (`22-auto-move.md:183`), but the code only excludes `.view`. For `.canvas`/`.kanban` I could not verify whether they ever reach `notifyAfterSave`. The mod write path does run Auto Move "for every file it writes, Markdown or not" (`28-mods.md:304`).
   - `settingsStore.autoMove.enabled`.
   - Has at least one enabled user rule, or `typeDefinitionsStore.typeMetadataMap.size > 0` (`:100-102`). The lifecycle condition is "any type definition exists", not "any type has `archiveTo`".
   - `vaultStore.path` present.
   - `isInExcludedFolder(filePath, ...)` on the SAVE path (`:107`).
4. **Debounce.** One `setTimeout` per file path in `debounceTimers` (`:22`, `:112-125`). A new save clears the previous timer. Delay is `settingsStore.autoMove.debounceMs` (default 3000, `settings.store.svelte.ts:110-113`; UI clamps 500..30000, `AutoMoveSection.svelte:29-31`). The timer closure captures the `content` of the LAST save.
5. **Evaluate** (`evaluateAndMove`, `:152-215`):
   - `buildNoteRecord(filePath, content, Date.now(), Date.now())` (`:154`). So `file.mtime` and `file.ctime` are "now", and `file.size` is 0 (default param in `collection.logic.ts:22-28`). Rules on `file.ctime`, `file.mtime` or `file.size` do not see real values in Auto Move.
   - Rule list = enabled user rules, then `generateLifecycleRules(typeMetadataMap)` regenerated on every evaluation (`:156-157`). User rules win on order.
   - `findMatchingRule` (`auto-move.logic.ts:17-35`): first enabled rule whose `evaluateExpression` is truthy. A throwing rule is reported through `onError` and skipped. `evaluateExpression` re-parses the string on every call (`evaluator.ts:75-78`); there is no AST cache.
   - Destination: `resolveDestination` (`:102-130`), `isAlreadyInDestination` (`:69-81`), `mkdir -p` of the destination, `moveItem` (`fs.service.ts:307-327`, goes through `applyPathChange`). An existing target file makes `moveItem` throw (`targetExistsError`); the service swallows it with a bare `return` (`:189-195`). `moveItem` logs the cause. No toast.
   - Icon (`:199-214`): runs after the move, on the post-move path, and also when the note is already in the destination. A lossy-frontmatter pre-check (`detectLossyFrontmatter(content)`, `:203`) skips the icon quietly. Failures are only `error()`-logged.
6. **Result.** There is exactly one action set per evaluation: at most one move and at most one icon, from one rule.

### Icon application (how "frontmatter things" already exist inside Auto Move)

- `rule.icon: AutoMoveIcon { iconPack, iconName, color?, textColor? }` (`auto-move.types.ts:2-11`).
- `setIconForPath` -> `setFrontmatterIcon` (`file-icons.service.ts:118-134`, `frontmatter-icon.service.ts`) -> `updateNoteFrontmatter` with a pure `mutate`. Keys written: `_icon` (`pack:name`), `_color`, `_title_color`.
- Semantics today: **always set**, and it also REMOVES `_color`/`_title_color` when the rule has no color (`withIconColors`, `frontmatter-icon.service.ts:~24-29`). So an Auto Move icon with no color wipes a color the user set by hand. Whoever adds per-action "fill only if missing" must decide what the existing icon action does: keeping "always set" as the default for the old `icon` field preserves behavior.
- A write that changes nothing returns without writing (`frontmatter-write.service.ts`, `if (next === base) return base;`). That idempotence is what stops the icon from looping (see 3.3).
- A refused write (`FrontmatterWriteError`) is TOASTED inside `writeIconFrontmatter`, except `save-failed`. Auto Move pre-checks lossiness to avoid a toast per autosave (`auto-move.service.ts:201-207`).

### Config

- File: `<vault>/.kokobrain/auto-move-rules.json`, shape `{ rules: AutoMoveRule[], excludedFolders: string[] }` (`auto-move.types.ts:29-35`, `auto-move.service.ts:33-88`). `enabled` and `debounceMs` live in `settings.json` (`AutoMoveSettings`, `settings.types.ts:286-292`).
- Loader (`:42-65`): missing or blank file gives defaults. Parsed `rules` and `excludedFolders` are taken as-is when they are arrays; there is NO per-rule field validation. A rule with a missing `expression` or `destination` is caught later (expression: `findMatchingRule` onError; destination: `resolveDestination` would throw on `.replace` of undefined, caught by the timer's try/catch, `:119-122`, logged).
- Corrupt JSON: logged with `error()` (which goes to Sentry) and the store gets empty defaults (`:61-64`). The next UI edit calls `saveAutoMoveConfig`, which serializes the empty store over the file. So a corrupt or hand-edited-wrong file is overwritten with an empty config the first time the user touches the Settings screen. I did not find a test for this; `auto-move.service.test.ts:91` only checks the "handles corrupt JSON gracefully" load.
- Save (`:70-88`): `mkdir` if needed, `writeTextFile(JSON.stringify(config, null, 2))`. Not atomic. The file is on the raw-write allowlist (`raw-write-ratchet.test.ts:32`: "auto-move config JSON in .kokobrain, not a note"). A second config file written the same way needs its own ratchet entry.
- Settings UI save pattern (`AutoMoveSection.svelte:33-87`): structural changes (add, remove, reorder) save at once; text-input changes save after a 500 ms debounce.
- The help example vault ships `help/examples/auto-move-features/auto-move-rules.json`. `examples-scoping.test.ts:231-234` and `:351-359` fail any rule in a file named `auto-move-rules.json` whose expression lacks a path predicate (`PATH_PREDICATE_RE`). A new rules file in `help/examples/` that is not named `auto-move-rules.json` is not covered by that scan, so a new feature needs its own case there.

### Excluded folders

- Pure folder-prefix match on the vault-relative folder, case-insensitive (`isInExcludedFolder`, `auto-move.logic.ts:41-63`). Entries are not normalized: a trailing or leading slash in a stored entry would not match (`'_templates/'`). The UI only trims whitespace (`AutoMoveSection.svelte:89-96`). Not tested for slashes (list of logic tests: `auto-move.logic.test.ts:189-233`).
- Checked once at observer time, on the pre-move path. The destination is not checked, and the timer does not re-check. A rule can therefore move a note INTO an excluded folder (fine) and a note moved out of one is evaluated on its next save.
- UI copy says "never be automatically moved" (`AutoMoveSection.svelte:179`); docs say "no evaluation, no moves" (`22-auto-move.md:107`). For a frontmatter feature the same list would presumably also have to mean "no property writes"; that needs the owner's word (open question 2).

### Lifecycle rules (`type-lifecycle-rules.ts`)

- Generated from `typeMetadataMap` entries that have `archiveTo`. Not stored, not shown in Settings.
- Archive: `type == "X" && _archived == true [&& !file.folder.endsWith(<segment>)]`, destination `archiveTo`. Unarchive: only for `{folder}/<segment>`: `type == "X" && _archived == false && file.folder.endsWith(<segment>)`, destination `{parent}`.
- Order: all user rules first, then lifecycle rules (`auto-move.service.ts:157`). Because of first-match-wins, a user rule that matches every note blocks lifecycle archiving. This is exactly the hazard Issue 01 rule 5 works around for property-only rules.
- They have no `icon` and (in Issue 01) no `defaultProperties`. A move-only subsystem sitting on the same `AutoMoveRule` type.

## 2. Generic rule machinery vs move-specific

| Piece | Where | Generic or move-specific |
|-------|-------|--------------------------|
| `AutoMoveRule` fields `id`, `name`, `expression`, `enabled` | `auto-move.types.ts:14-24` | Generic |
| `AutoMoveRule.destination` | `:21-22` | Move-specific, and required today |
| `AutoMoveRule.icon` | `:25-26` | Frontmatter action (already "set `_icon`/`_color`/`_title_color`"), but applied through `setIconForPath` and described as "after moving" |
| `AutoMoveConfig.rules`, `excludedFolders` | `:29-35` | Rules generic; `excludedFolders` is generic in structure but worded for moves |
| `findMatchingRule` (iteration, `enabled` filter, try/catch + `onError`) | `auto-move.logic.ts:17-35` | Generic evaluation loop, but "return the FIRST match" is a policy: move needs exclusivity, additive property/icon actions do not |
| `validateExpression` (parse only) | `:87-95` | Generic. A stricter `validateExpression` that also flags unknown functions already exists in the engine (`evaluator.ts:306-315`); the Auto Move row does not use it |
| `isInExcludedFolder` | `:41-63` | Generic |
| `isAlreadyInDestination`, `resolveDestination` (`{folder}`, `{parent}`, `{basename}`, `{type}`, `{status}`, `{year}`, `{month}`) | `:69-130` | Move-specific |
| `generateRuleId` | `:135-137` | Generic |
| Store: `setConfig`, `addRule`, `updateRule`, `removeRule`, `reorderRules`, `enabledRules`, `setExcludedFolders`, `reset` | `auto-move.store.svelte.ts` | Entirely generic; no move vocabulary except the name |
| Config load/save of `.kokobrain/auto-move-rules.json` | `auto-move.service.ts:33-88` | Generic mechanics; file name and shape are the public contract users back up (`22-auto-move.md:157-177`) |
| Hook register / toggle / reset, per-path debounce map | `:94-146`, `:217-231` | Generic trigger scheduling (save trigger only) |
| `evaluateAndMove`: record build, rule list, lifecycle rule merge | `:152-165` | Generic up to "which rule matched" |
| `evaluateAndMove`: dest resolution, mkdir, `moveItem`, post-move path | `:167-197` | Move-specific |
| `evaluateAndMove`: icon block | `:199-214` | Frontmatter action, but with an early-`return` structure that assumes it is last |
| `type-lifecycle-rules.ts` | whole file | Move-specific, type-driven rule source |
| `AutoMoveSection.svelte`: enable switch, debounce field, rules list, excluded folders | `:106-217` | Mostly generic; text ("determines the destination folder", "never be automatically moved", "Enable Auto Move ... move notes") is move-worded |
| `AutoMoveRuleRow.svelte`: name, enable switch, up/down, delete, expression with live validation | `:62-128` | Generic |
| `AutoMoveRuleRow.svelte`: Destination input | `:130-138` | Move-specific |
| `AutoMoveRuleRow.svelte`: icon picker button and `IconPicker` | `:139-165` | Frontmatter action UI |

Summary: roughly everything above the "what to do with a match" step is generic. Only `destination`, `resolveDestination`, `isAlreadyInDestination`, the lifecycle generator and the move block of `evaluateAndMove` are move-specific. The two icon pieces are already a frontmatter action wearing move-flavoured docs and labels. The one structural assumption that is NOT generic is "at most one rule acts per evaluation".

## 3. Constraints and hazards a design must respect

### 3.1 First-match-wins does not fit additive frontmatter actions

- Move is exclusive by nature (a note has one destination). Properties, icons and colors are additive: a note in `work/topics/AWS` may want a `_belongs_to` default (folder rule) and a type-based `_icon` (another rule).
- Issue 01 keeps first-match-wins and patches around it: a property-only rule "only counts as a match when it has something to do" and falls through otherwise (Behavior 5), and the chain is closed by re-evaluation after the write's own after-save (Behavior 6). That is a workable but fragile model: two property rules on one note take two saves (each write re-triggers the debounce), the 2nd rule is shadowed until the 1st is satisfied, and rule order silently decides which defaults a note gets first.
- Design question for the research recommendation: evaluate "all matching property/icon actions merged, plus first-matching move" instead. I did not find anything in the code that prevents it: `findMatchingRule` is a 20-line loop and the record is built once per evaluation.

### 3.2 One write per evaluation

- `updateNoteFrontmatter` documents that concurrent writes on a closed note race and the last wins, so "callers must serialize writes per path" (`frontmatter-write.service.ts`, doc of `updateNoteFrontmatter`). Today a move plus icon is `moveItem` then one frontmatter write, so there is no conflict.
- Adding a property action next to the icon action as two separate `updateNoteFrontmatter` calls means two writes, two `notifyAfterSave` calls and two new debounce cycles. Merge all actions of one evaluation into ONE `mutate` (pure; it runs twice when a tab opens during the read, per the same docstring) and one write.
- On an open note the write patches the tab and saves at once (`:131-132`, `saveFileByPath` flushes any pending body edit early). On a closed note it writes the file, syncs a tab opened meanwhile, and calls `notifyAfterSave` (`:161`).

### 3.3 Self-trigger loop

- Chain: rule writes frontmatter -> `notifyAfterSave` (`frontmatter-write.service.ts:161`, or `writeTab` `editor.service.ts:196`) -> Auto Move observer -> new debounce -> evaluate again. Today this terminates because the second evaluation's write is a no-op (`next === base` returns without writing, so no after-save).
- "Fill only if missing" is naturally idempotent. "Always set" is idempotent only for constant values. Two rules that set the same key to different values, or any computed value (e.g. a `{now}` or `{year}` template), will oscillate once per debounce, forever. The design needs either a constraint (static values only; one writer per key per evaluation) or a per-evaluation guard. Issue 01 says "No extra loop is needed, and none must be added" (Behavior 6); that holds for fill-only and fails for always-set.
- With "nothing is reverted when a rule stops matching" there is no flip-flop between a rule and its inverse, which removes the main oscillation source. The remaining one is two matching rules writing the same key with different "always" values. Worth stating as a rule: first writer per key wins within one evaluation, or reject conflicting rules in the UI.

### 3.4 Triggers beyond save

- **Save (exists):** the debounce map and observer above.
- **Property change "immediately":** every property edit that ends in a save already reaches the observer, so on-save covers it after the debounce. I did NOT verify how the properties panel edits (direct `updateNoteFrontmatter`, or tab content plus autosave) or how long autosave waits, so "immediately" is not yet shown to be reachable through the existing hook; it may need a shorter debounce for this source or a direct call. Open question 3.
- **Create / move / rename:** there is no hook in Auto Move. `moveItem` calls `applyPathChange` (`fs.service.ts:313`), which does NOT call `notifyAfterSave`; after Auto Move's own move there is no re-evaluation except through the icon write. The documented extension point is `registerPathChangeConsumer` in `path-change.service.ts` (`docs/agents/indexing-watcher-rules.md` item 6, third sub-bullet): consumers are called synchronously after `diskOp` succeeds and before the link rewrite, once per change, and a FOLDER change is reported once, for the folder, not per child. Registration must be wired in `initializeVault` and unwound in `teardownVault`; forgetting it is a silent no-op. `core/` must not import `features/` (ADR-0003), so the consumer registers itself from the lifecycle wiring.
- Consequences for rename/move: (a) the path-change consumer gets paths, not content, so it must read the note (tab content first, else `readTextFile`) before building the record; (b) Auto Move's own `moveItem` goes through the same `applyPathChange`, so a path-change trigger fires on Auto Move's own moves and "rules can chain moves" (Issue 02's own concern) is real, not hypothetical; the design needs an "own move" mark; (c) a moved folder needs the children walked out of `fsStore.fileTree` (the rules doc says `applyPathChange` does that walk for index dedupe), which a note-level consumer would not get for free.
- **Create:** note creators and `fs.service::createFile` go through `applyNoteChange` with `source: 'create'`/`'fs'` (rules doc item 6) and do not call `notifyAfterSave` (the callers listed in 1.2 do not include them). I did not trace the creator code itself, so which hook to use for "on create" is unverified. Newly created notes from templates arrive with their own frontmatter, which matters for "fill only if missing".
- Moves made outside the app arrive through the watcher (`vault-files-changed`), which has its own incremental/full rebuild branches (rules doc item 4); out of scope for Auto Move today and probably should stay out.

### 3.5 Decision from stale content

- The timer captures the content of the last save (`:116-119`) and the matching decision is made on it. The user may have typed more during the debounce. For moves that is an accepted lag. For "fill only if missing", the missing check must be recomputed inside the pure `mutate` on the freshly read properties (Issue 01 Behavior 3-4 already does this). Do not decide "missing" from the captured record.
- The record has fake `mtime`/`ctime`/`size` (see 1.5), so any new feature that exposes `file.*` fields shares that limitation.

### 3.6 Per-action semantics (owner decision: "fill only if missing" vs "always set")

- Existing icon action = always set, and clears colors if the rule has none. A per-action flag must default the old `icon` field to its current behavior so existing `auto-move-rules.json` files do not change meaning (Issue 01 Behavior 9 applies the same rule to `defaultProperties`: old configs load unchanged).
- "Missing" in Issue 01 = absent, `null`, `''`, or empty list on the canonical key (`canonicalizeKey`, `utils/frontmatter-aliases.ts`; I did not open that file). "Always set" needs the symmetric definition of "already equal" so no-op writes stay no-ops.
- Value typing: Issue 01 writes text properties only; a wikilink value must be quoted or it parses as a nested list (Issue 01 Behavior 3). Colors/icons are plain strings. Booleans, numbers, dates and lists are not covered by anything I read.

### 3.7 Active note and the caret blocker

- Blocker `.scratch/open-itens/issues/001-...md`: every external replace of the open document keeps the caret at its OLD numeric offset (`MarkdownEditor.svelte:627`, `replaceDoc` `:182-186`). `updateNoteFrontmatter` on an open tab goes through `syncExternalContentToEditor(path, next, false, 'none')` (`frontmatter-write.service.ts:131-132`).
- That path is already taken today by the Auto Move ICON (when the active note matches a rule with `icon`, about 3 s after a save). So the caret bug affects the existing icon action too, and ANY frontmatter rule action on the active note, not only `defaultProperties`. The blocker therefore gates the whole feature for notes being edited. Shipping rules that write to the open note before 001 lands reproduces the bug.

### 3.8 Error paths

- Move errors: swallowed, logged by `moveItem`; the note stays, and each subsequent save retries (no backoff, no toast).
- Rule evaluation errors: logged per rule per note (`:159-161`), through `error()` (Sentry). A generated lifecycle rule that threw on every note shipped unnoticed before (`auto-move.logic.ts:9-16` comment); the reporter now exists.
- Frontmatter write refused: icon is pre-checked for lossy frontmatter and skipped with a debug log; other `FrontmatterWriteError`s are toasted by the icon service. Issue 01 Behavior 7 chooses "logged, not toasted per autosave" for property writes. The two actions would then report errors differently unless unified.
- Turning Auto Move off does not cancel pending timers: `toggleAutoMoveHook(false)` unsubscribes the observer only (`:140-144`); `debounceTimers` is cleared only in `resetAutoMove` (`:225-228`). A save just before the toggle still evaluates and moves. Small, but for a feature that writes frontmatter the same applies.
- Enabled-switch scope: `settingsStore.autoMove.enabled` gates the whole hook (`:98`); it is off by default (`settings.store.svelte.ts:110-113`). If frontmatter rules live in the same feature they inherit that switch and the setting copy "Automatically move notes ..." (`AutoMoveSection.svelte:111`). Owner question 4.

### 3.9 Performance

- The observer runs synchronously on every save of every file; the cheap gates are before the timer (good). `generateLifecycleRules` runs on every evaluation and `evaluateExpression` re-parses every rule's expression text on every call (`evaluator.ts:75-78`). With N user rules plus lifecycle rules it is N parses per debounced save. No measurement found; I did not measure.
- Additional property rules multiply this. Pre-parsing each rule once (cache by expression string) is possible because `parse` is already separate from `evaluate`, but that is a design choice, not a verified need.
- `typeMetadataMap.size > 0` as the lifecycle gate means vaults with type definitions that have no `archiveTo` still pay one record build plus rule generation per saved note.

### 3.10 Layering and cycles

- `src/tests/lib/architecture/feature-cycle-baseline.json:3-7` already lists `auto-move -> collection`, `auto-move -> file-icons`, `auto-move -> type-definitions`. A separate feature that imports the Collection expression engine, `file-icons` and `core/frontmatter/frontmatter-write.service` adds more feature-pair edges; extending Auto Move adds none. `feature-cycle.test.ts` fails on new cycles; I did not read what it does with new non-cyclic pairs.
- `core/` -> `features/` imports are debt (CLAUDE.md layer baseline `layer-baseline.json`); a path-change consumer in a feature registers from `initializeVault`, as in the rules doc.

## 4. Tests that exist and their limits

- `auto-move.logic.test.ts` (384 lines): `findMatchingRule` (first match, disabled, invalid expression, onError reporting), `isInExcludedFolder`, `isAlreadyInDestination`, `validateExpression`, `resolveDestination` (including `{parent}` and the real `buildNoteRecord` parse path), `generateRuleId`. No test of slash-normalized excluded entries.
- `auto-move.service.test.ts` (564 lines): load/save config, hook registration, observer skips (disabled, no rules, `.view`, excluded folder), move after debounce, icon applied when already in destination, lossy frontmatter (icon skipped, move kept), move failure skips icon, icon IO error keeps move, toggle and reset. By test names I found no test that a second save resets the debounce timer, and none for pending timers after a toggle off.
- The service test mocks `@tauri-apps/plugin-fs`, `editor.hooks`, `fs.service` (`moveItem`) and `file-icons.service` (`setIconForPath`) (`auto-move.service.test.ts:7-29`). That means no test exercises the real `write -> notifyAfterSave -> observer -> re-evaluate` chain, which is the mechanism Issue 01 relies on (Behavior 6). Its acceptance bullet "after the fill and the write-triggered re-evaluation, the note ends in Archive/AWS" cannot pass with `addAfterSaveObserver` mocked to a no-op: the test needs a real observer registry (or a harness that feeds the captured observer from the write) and the real `updateNoteFrontmatter`. CLAUDE.md allows mocking only Tauri APIs, side-effect services and DOM services, so `updateNoteFrontmatter` and `editor.hooks` should be real in those tests, with the fs plugin mocked.
- `auto-move.store.test.ts`, `AutoMoveRuleRow.test.ts`, `type-lifecycle-rules.test.ts`: store CRUD, row rendering, lifecycle generation. `examples-scoping.test.ts:405-` loads the shipped example rules through `findMatchingRule` and `resolveDestination`.

## 5. The two spec Issues, in terms of this machinery

- **Issue 01** (`ready-for-agent`, blocked by caret Issue 001): adds `defaultProperties` (key -> string, fill only if missing) to `AutoMoveRule`, makes `destination` optional (`trim() === ''` means no move), orders move first then fill, writes through `updateNoteFrontmatter` with a pure `mutate`, adds the "property-only rule counts as match only when it has something to do" fall-through, and the UI row and docs.
  - It is a partial instance of the owner's goal: ONE action (fill missing props), ONE trigger (save), ONE semantic (fill only). It also moves the empty-destination default: today a new rule starts with `destination: ''` (`AutoMoveSection.svelte:54`) and `resolveDestination('')` is `''`, which is the vault root; Issue 01 changes the meaning of an empty destination for existing rules that were half-filled.
  - Its fall-through rule exists only because the engine is first-match-wins. If evaluation moved to "all matching additive actions + first matching move", Behavior 5 and 6 largely disappear (no shadowing, no waiting for the write-triggered second pass).
  - It does not cover: always-set, colors/icons as a property action (those exist separately as `icon`), triggers other than save, per-action semantics.
- **Issue 02** (`needs-triage`, blocked by 01): evaluate on move and rename. Its four questions are answered partially by this scout: own-move chaining is real (3.4b); the safe hook is the path-change consumer registry (3.4) and it carries no content; watcher moves are a separate path (3.4); "evaluate on next save" is the current behavior.
- Both Issues assume the feature stays inside Auto Move. The owner's new goal (properties, icons, colors, three trigger families, per-action semantics) makes them subsets; their Behavior sections are a useful spec for the fill-if-missing action and for the move/rename trigger constraints either way.

## 6. Docs touchpoints for any change

- `help/documentation/22-auto-move.md`: field table (`:27-33`), first-match-wins wording (`:23`), "Applying Icons After Move" (`:115-117`), Configuration File example (`:157-177`), and the note that only `.md` files are evaluated (`:183`, which does not match the code, see 1.3).
- Also referencing Auto Move: `01-getting-started.md:136`, `12-collection.md:266`, `19-settings.md:9,236-245`, `25-types-and-relationships.md:267,345`, `28-mods.md:304,308`. `AutoMoveSection.svelte` copy at `:111`, `:122-124`, `:150-153`, `:178-180`.

## 7. Recommendation input from this area (not a decision)

From the Auto Move side, the evidence favors one rule list on the existing config file over a second feature, with these structural changes regardless of the final shape:

1. Split "does the rule match" (generic, already shared: `findMatchingRule`, `validateExpression`, record build, exclusions, store, config, debounce) from "what the rule does" (move, icon, set properties). The first group has no move vocabulary beyond names.
2. Treat move as the one exclusive action (first match wins among rules that have a destination) and the frontmatter actions as additive across all matching rules, merged into a single `updateNoteFrontmatter` write per evaluation. This removes the need for Issue 01's property-only fall-through and the "second pass through the save" chaining.
3. Keep the legacy `icon` field meaning unchanged (always set, clears absent colors) and give new actions an explicit per-action mode (`ifMissing` default for properties, `always` available) so old configs load unchanged.
4. Add triggers as separate entry points feeding the same `evaluate(path, content, source)`: save (exists), path change (via `registerPathChangeConsumer`, with an own-move mark), create (unverified hook). Content comes from the tab or a read, not from the caller.
5. Blocker 001 must land first for any action that writes to the open note.

If instead the owner wants a clean separation (a new feature reusing the engine), the pieces to extract are exactly the "generic" rows in section 2; the cost is a new config file (raw-write ratchet entry, example-vault coverage), a second settings section, a second hook with its own debounce map, and an interaction problem: two features writing the same note on the same save (see 3.2 and 3.3).

## 8. Open questions only the owner can answer

1. Should frontmatter actions run when "Enable Auto Move" is off (today it is off by default and described as moving notes)? One switch, or an independent switch per action family?
2. Do Auto Move's excluded folders also exclude frontmatter actions, or does the new feature need its own exclusion list?
3. "On property change, immediately": is the existing after-save path plus the 3 s default debounce acceptable, or should property-driven writes use a much shorter delay? (Panel edit path not verified.)
4. When several matching rules write the same key with different always-set values, which wins: first by order, last, or reject at config time?
5. Should one matching rule's property actions stack with another matching rule's (additive across rules), or only the first matching rule acts as today?
6. Should the existing rule `icon` get a "fill only if missing" option, and should its current "clear `_color` when the rule has no color" behavior stay?
7. Which value types must property actions support beyond strings (booleans, numbers, dates, lists, wikilinks)?
8. For create/move/rename: is acting on notes created by templates or imports expected, given those already carry frontmatter (matters for always-set)?

## 9. Not verified

- Whether `.canvas` / `.kanban` saves reach `notifyAfterSave` (the code lets them through if so; docs say they never move).
- Properties-panel write path and autosave timing (for "immediately").
- The note-creation code path and which hook fires there; the content of `path-change.service.ts` beyond the rules doc.
- `canonicalizeKey` / `frontmatter-aliases.ts` internals and `detectLossyFrontmatter` rules beyond how they are called.
- Real cost of per-save rule parsing; no measurements taken.
