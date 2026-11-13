# Design C: the minimal path (grow Auto Move, do not build a second feature)

Designer C, 2026-11-10. Read-only. Built on scout reports 01-16 and validation reports 01-08 in this folder; where a validator corrected a scout, the validator's version is used. Code citations are at HEAD `2e2cc5b60` and were re-opened for the hook points named below (`auto-move.service.ts`, `auto-move.types.ts`, `editor.hooks.ts`, `path-change.service.ts:38-73`, `note-creator.service.ts:28-120`, `fs.service.ts:196-224`, `app-lifecycle.service.ts:250-268,438-448`, `evaluator.ts`, `properties.logic.ts` exports). Research files are cited as `scout-NN` / `val-NN`.

## 0. Verdict

The smallest change that meets the goal and keeps one engine is: **Auto Move rules become the one rule list for both moves and frontmatter actions**, in the same feature folder, the same config file and the same Settings section. Issue 01 is rewritten before it ships (`defaultProperties` does not exist in `src/` today, so nothing needs migrating), and Issue 02 is rescoped as the move/rename trigger.

"Minimal" does not mean "Issue 01 as written plus three fields". The validators proved that Issue 01's evaluation model (first match wins, a property-only rule falls through when it has nothing to do, chaining happens through the save) oscillates as soon as "always set" exists (section 5.1). So the minimal path still has to change how rules are evaluated. The change is small: a pure planner of about 100 lines in `auto-move.logic.ts`. Everything else stays where it is: the store, the loader, the debounce, excluded folders, the row UI, the help page and the examples test.

Where minimal stops being enough (section 15): a reaction faster than about 1 s, rules triggered by a key *changing* rather than by note state, external edits, folder moves, computed values and bulk backfill. Each of these needs a core API change or a new mechanism. None of them is required by the owner's stated goal.

## 1. The correctness floor (not optional, whatever the shape)

These come from validated findings. A "minimal" design that skips any of them ships a known bug.

| # | Requirement | Why (evidence) |
|---|---|---|
| F1 | All actions of one evaluation go into ONE `updateNoteFrontmatter` call, and an evaluation runs only after the previous one for that path has settled | Concurrent closed-note writes lose updates; callers must serialize (`frontmatter-write.service.ts:95-97`; val-08 M5). One runner per path is the strongest code argument for staying inside Auto Move (val-02 M4). |
| F2 | Decide "nothing to do" on the parsed properties BEFORE calling the writer | `next === base` (`frontmatter-write.service.ts:128-129`) compares bytes after a full re-serialize, so a no-op `mutate` still rewrites non-canonical YAML once (val-01 R1, val-07 R3). |
| F3 | Decide "missing" and "equal" on `parseFrontmatterProperties(content)` with canonical keys, never on `PropertyIndexRecord.properties` | The projection always adds `organized`/`archived`/`favorite`/`tags`, re-cases `_type` and rewrites relationship keys (`collection.logic.ts:53-77`; val-07 R4, val-05 M3). |
| F4 | Gate actions on `isMarkdownFile` (`fs.logic.ts:65`), not only `isViewFile` | Kanban, canvas, mod and deep-link writes of non-Markdown files reach after-save, and `rebuildContent` would prepend YAML to them (val-01 M1, val-02 M1). |
| F5 | Skip quietly when the frontmatter is lossy, and also when the content starts with `---` but no block is matched (missing closing fence, empty `---\n---`) | `detectLossyFrontmatter` returns null when there is no block, and the writer then stacks a second block (`properties.logic.ts:39,46,405-407,689-696`; val-04 R3, val-08 M3; open Issues 005 and 022). |
| F6 | No action removes a key. Auto Move's legacy icon must stop deleting `_color` / `_title_color` | `withIconColors` deletes colors that were not passed (`frontmatter-icon.service.ts:26-31`). With any rule writing `_color` this loops with fill-only too, every `debounceMs` (val-05 R1, val-03 Missed 1). |
| F7 | Evaluate on content read when the timer fires, at the path where the note is then | Timers capture stale content and the old path (`auto-move.service.ts:112-125`); a rename inside the window makes the write fail with a raw read error (val-01 M3, val-04 Missed 2). |
| F8 | The configuration loader normalizes every entry (drops `null`, requires a string `id` / `expression`, a boolean `enabled`, valid action fields) | A `null` rule today throws inside the observer on every save, which `error()` sends to Sentry, and it also breaks the Settings render (val-06 R1). |

## 2. Domain model and names

`CONTEXT.md` does not exist (`docs/agents/domain.md:5-12`; scout-15 section 0), so these terms are a glossary gap to record when the feature is built:

| Term | Meaning | Why this word |
|---|---|---|
| **Auto Move rule** (unchanged in code), shown to users as **rule** | One entry of `.kokobrain/auto-move-rules.json`: condition, optional destination, optional actions | Keeps the existing type, file and tests. A user-facing rename of the Settings section is copy only (owner decision O1). |
| **condition** | The rule's `expression`, evaluated by the Collection engine against the note record | Users already know "expression" from Collection filters. The field name `expression` stays. |
| **destination** | Optional. An empty or blank string means "no move" (Issue 01 Behavior 1) | Unchanged meaning, except that empty no longer means the vault root. |
| **property action** | "Write this value to this frontmatter property". Icons and colors are property actions on `_icon`, `_color`, `_title_color` | The UI says "property", as in the Properties panel. The data names the real key, not a parallel shape like `AutoMoveIcon` (ADR 0027 rationale, scout-15 3.2). |
| **mode** `ifMissing` / `always` | Per action: write only when the canonical key is absent or empty, or write whenever the value differs | These are the owner's two semantics. Avoids "default" (it implies fill-only) and "set" (it implies overwrite). |
| **evaluation** | One run of every enabled rule against one note: actions to a fixed point, then at most one move, then at most one write | Distinct from "trigger", which is what starts an evaluation. |
| **trigger** | save, path change (move or rename), create | Owner's list. "Property change" is not a separate trigger in this design (section 7.2). |

Words to avoid as bare nouns: "lifecycle" (it means both the three flags of ADR 0026 and the generated `_archive_to` rules) and "default". Generated rules keep the name **lifecycle rule** in code only.

## 3. Where code lives (layer rules)

- Everything stays in `src/lib/features/auto-move/`. It already imports `features/collection` (the engine), `features/file-icons` and `features/type-definitions`, so **no new feature pair is created and there is no cycle risk** (`feature-cycle-baseline.json`: `featureCycleEdges: []`; scout-15 3.1). It also needs nothing from `features/properties`, so the forbidden pair `properties -> auto-move` combined with a back-import never arises (val-05 M8).
- New pure code goes in `auto-move.logic.ts` (or a sibling `auto-move-actions.logic.ts` if the file grows). It may import `core/frontmatter/properties.logic.ts`, `utils/frontmatter-aliases.ts` and `features/collection/expression/*`, all of which are pure (`pure-logic.test.ts` walks `.logic.ts` imports).
- Two private helpers need exporting:
  - `isEmptyPropertyValue` (`properties.logic.ts:464`), so that "missing" has one definition, not a fifth (scout-16 2.2).
  - `toTruthy` (`evaluator.ts:632`), so that rule matching uses the same truthiness as Collection filters (val-01 M4; they differ only on `NaN`).
- One new core seam, for create only: a create-content transform registry next to `createFile`, for example `src/lib/core/filesystem/create-content-transform.ts`, imported by `fs.service.ts` and `note-creator.service.ts`. Core cannot import features (`layer-baseline.json` holds only the three `utils -> core` entries, so a `core -> features` import fails at once; val-05 M9). Auto Move therefore registers a callback from the composition root, as the note-change and path-change consumers do (`app-lifecycle.service.ts:258-268`).
- No Rust change, no IPC DTO change. The gate is frontend only (`pnpm check` + `pnpm vitest run`).

## 4. Rule data shape and config migration

```ts
/** One frontmatter write a rule performs when it matches. */
export interface PropertyAction {
	/** Frontmatter key; canonicalized with canonicalizeKey on load and on edit. */
	key: string;
	/** Typed value; the type decides the YAML written (serializeProperties keys off Property.type). */
	value: string | number | boolean | string[];
	/** 'ifMissing': write only when the canonical key is absent or empty. 'always': write when it differs. */
	mode: 'ifMissing' | 'always';
}

export interface AutoMoveRule {
	id: string;
	name: string;
	expression: string;
	/** Vault-relative folder template; '' or blank means the rule never moves a note. */
	destination: string;
	enabled: boolean;
	/** Property actions applied whenever the rule matches, in order. */
	actions?: PropertyAction[];
	/** Legacy; normalized into actions on load and no longer written on save. */
	icon?: AutoMoveIcon;
}
```

Decisions inside the shape:

- **Typed values, four types: text, number, boolean, list.** Issue 01's string-only values cannot write `_archived: true` or `_favorite: true`. A text `"true"` is serialized quoted and `boolFlag` ignores it (`properties.logic.ts:603-625`; val-08 Corrections 6). A JSON value is typed by itself, so the file needs no separate `type` field: `typeof` plus `Array.isArray` maps to `Property.type`. List items are strings, because the serializer coerces them anyway (ADR 0029 "Lists").
- **Wikilinks are text values** written as `"[[X]]"`. JSON makes the string unambiguous, and the serializer always quotes it (scout-16 3.1).
- **Constant values only in v1.** No `{folder}`-style templates and no `<% %>`. If computed values come later, they come from the Collection engine (one engine; val-01 M6) and only with a volatility rule (section 8).
- **Deny-list:** an action on `todoist_project` is dropped on load and refused in the UI, because it re-parents Todoist project notes (scout-09 3.1; mechanism corrected by val-05 R2, the deny advice holds). Other keys are owner decision O9.
- **Loader normalizer** (`normalizeAutoMoveConfig`, pure, in logic). It:
  - drops non-object rules and requires a string `id` and `expression` and a boolean `enabled`;
  - defaults a missing `destination` to `''`;
  - keeps only actions with a non-empty string `key`, a value of an allowed shape and a valid `mode` (an unknown mode becomes `ifMissing`, the safe one);
  - canonicalizes keys and drops denied keys;
  - translates a legacy `icon` into actions (section 6.3).

  It runs inside `loadAutoMoveConfig` (`auto-move.service.ts:42-65`) before `setConfig`.
- **No version field.** The repo's convention is "optional field, absent means default" (scout-11 F4.1). The only one-way step is the legacy `icon` translation: the next save writes `actions` and no `icon`. An older app build would then see a rule with no icon. The owner is the only user (owner memory), so this is acceptable, but it is listed as O3.
- **Unknown top-level keys are still dropped on save** (`auto-move.store.svelte.ts:22-26`, `auto-move.service.ts:78-81`). Per-rule unknown fields survive. This is unchanged; it is out of scope.
- **Broken-file safety.** A corrupt file today resets the rules to empty, and the next UI edit writes that empty config over the file (`auto-move.service.ts:61-64`; open Issue 031). A larger, hand-edited schema raises the stakes. Land 031 (blocked by 030) before the UI slice, not inside this feature.

## 5. Evaluation model: ordering, conflicts, move

### 5.1 Why Issue 01's model cannot be kept

Issue 01 Behavior 5: a property-only rule counts as a match only when it has something to do. Behavior 6: chaining happens through the save. Add one "always" action and it oscillates. Take rule A, `always x = 1`, and rule B, `always x = 2`, both matching:

- Evaluation 1: A has work, writes 1.
- Echo: A has nothing to do and falls through. B has work, writes 2.
- Echo: A has work again, writes 1.

That is one write, one File History row, one reindex and one Todoist schedule per `debounceMs`, forever. Scout-16 4.3 shows the same failure for "claim on write". The fall-through hack exists only because a single first-match list carries additive actions (scout-02 3.1).

### 5.2 The minimal replacement

A pure function `planEvaluation(input) -> { finalProps, changedKeys, moveRule, cycle }`, where `input` holds the path, the content, the rules, the lifecycle rules, the vault path and `stats`.

1. **Two selection modes in one list.**
   - Actions are **all-match**: every enabled matching rule applies its actions, in list order.
   - The move is **first-match among rules with a non-empty destination**: user rules first, then lifecycle rules (`auto-move.service.ts:156-157`).

   A rule with no destination can therefore never shadow a move rule or a lifecycle archive rule, and Issue 01 Behavior 5 disappears.
2. **Conflicts: the first claimant wins per key, and a rule claims its keys when it matches**, whether or not its action writes anything (scout-16 4.3). This is the same "top wins" reading as moves. A matching `ifMissing` rule above an `always` rule for the same key therefore shadows it. The UI can show that later (slice F).
3. **Fixed point in memory.**
   - Start from the parsed properties of the content.
   - Each pass rebuilds the record from `rebuildContent(working, body)` through `buildNoteRecord` (never patch the record's Map; scout-16 2.3), evaluates every condition on that snapshot, and applies the actions subject to the pass's claims.
   - Repeat until a pass changes nothing. The cap is 10 passes, the precedent being `MAX_FORMULA_DEPTH = 10` (`evaluator.ts:18`).
   - A repeated state, or reaching the cap, is a **cycle**: plan no write and no move, and log once.

   Rules chained on each other's output (Issue 01's "fill `_belongs_to`, then a move rule on `_belongs_to.contains("AWS")`") resolve in one evaluation, with one write and no echo.
4. **Move, then actions at the destination.**
   - The move rule is chosen against the final record.
   - When it moves, the planner rebuilds the record at the target path and runs the fixed point again from the current working copy. Claims start over and earlier changes stay, because nothing is reverted. This lets folder-keyed actions of the destination apply now and not at the next save.
   - At most one move per evaluation, as today.
   - Then **one write at the final path** (Issue 01 Behavior 2: write after the move).
5. **Matching uses `toTruthy`**, and a throwing rule is reported and skipped, as today (`auto-move.logic.ts:17-35`).
6. **Record stats:**
   - `file.mtime`, `file.ctime` and `file.size` come from the existing index record (`collectionStore.propertyIndex.get(path)`, the same pattern as `collection.service.ts:152-162`), not from `Date.now()` and 0 (`auto-move.service.ts:154`; val-06 Missed 5, val-08 M2).
   - The record for a create comes from a not-yet-written path and has no stats. Document that `file.*` times are "now" there.

### 5.3 What changes for existing Auto Move configs

| Today | After | Risk |
|---|---|---|
| Empty destination moves to the vault root | Empty means no move. A template that resolves to `''` (for example `{parent}`) still means the root | Issue 01 already decided this. A half-filled rule was a bug. |
| Only the first matching rule acts | The first matching rule with a destination moves. Every matching rule applies its actions | The only visible change is the legacy icon (section 6.3, O3). |
| A rule throwing at runtime is skipped | Same | None. |
| JS truthiness | `toTruthy` | Differs on `NaN` only. |

## 6. Per-action modes

### 6.1 Semantics

For each action, on canonical key `k = canonicalizeKey(action.key)`:

- `ifMissing`: write when `k` is absent, or `isEmptyPropertyValue(value)` is true, meaning `''`, a bare `key:`, `null` or `[]` (Issue 01 Behavior 4). `0`, `false` and `[""]` count as populated (scout-16 2.2).
- `always`: write when the current value differs from the action's value. Scalars compare by type and value. Lists compare ordered: a reordered list differs, and so it is replaced.
- Neither mode removes a key or reverts anything when a rule stops matching (owner decision).
- Type mismatch: `always` with a number value on a note holding `"5"` (text) writes the number. `ifMissing` leaves it alone, because the key is populated.

### 6.2 Inside the writer

The service calls `updateNoteFrontmatter(finalPath, mutate)` only when `changedKeys` is non-empty (F2). `mutate` is pure and re-applies the per-key decisions to the *fresh* `props` the writer hands it: `ifMissing` re-checks emptiness, and `always` sets. A key the user typed in the meantime is therefore never overwritten by a fill (scout-16 5.1). If the fresh props already satisfy every action, `mutate` returns the array unchanged. The writer may then canonicalize once; that needs a user edit racing inside a few ms, and it is accepted as rare.

### 6.3 Icons and colors are three independent property actions

- `_icon` takes `pack:name` (a bare name reads as lucide). `_color` and `_title_color` take a color string, validated with the readers' rule (no `;`, no `url(`; `file-icons.logic.ts:162-164`).
- The write goes through the same single `mutate`, not through `setIconForPath`. The icon store refreshes through the `file-icons` note-change consumer that `notifyAfterSave` runs (`file-icons.service.ts:240-272,299-305`; val-05 confirmed, val-06 Missed 1). This avoids the icon helpers' toasts on every autosave and their coupling of the three keys.
- Legacy `icon: { iconPack, iconName, color?, textColor? }` is normalized on load into `_icon` always, plus `_color` always only if `color` is set, plus `_title_color` always only if `textColor` is set. **Two behavior changes**, both needing the owner (O3):
  - Colors are no longer wiped. This is required by F6.
  - The icon now applies from every matching rule, not only from the rule that moved the note.

  The alternative that keeps the second point as it is today: apply translated legacy actions only when their rule is the selected move rule. It costs one flag on the translated actions and keeps a special case forever. I recommend the plain translation.
- `_icon` with `ifMissing` writes on any note without its own `_icon`, even one that shows an inherited type icon, because "missing" is about the key (`icon-resolver.ts:64-77`; val-08 M10). Document it. A "skip if the type provides an icon" option is not in v1 (O10).

## 7. Triggers and exact hook points

One scheduler and one runner per path, inside `auto-move.service.ts`:

- `scheduleEvaluation(path)` debounces per path in the existing `debounceTimers` map (`auto-move.service.ts:22`).
- When the timer fires, `runEvaluation(path)` chains onto a per-path promise tail (the `serializeListWrite` pattern, `rail-shell/list-prefs.service.ts:28-37`), so two evaluations of one path never overlap (F1).
- `runEvaluation`:
  1. re-checks `settingsStore.autoMove.enabled`;
  2. reads the content from the open tab if there is one, else with `readTextFile` (F7), and returns quietly if the file is gone;
  3. applies the gates: Markdown (F4), excluded folders, type-definition notes, the templates folder (`settingsStore.templates.folder`, default `_system/templates`, `settings.store.svelte.ts:98`; not a hard-coded `_templates`, val-05 R7), and the lossy or unmatched block check (F5);
  4. plans the evaluation;
  5. moves if planned;
  6. writes once.

  Move gates (excluded folders, Markdown) stay as today, except that the Markdown gate also applies to moves: fold in open Issue 054, or land it first.

### 7.1 Save (exists, rewired)

- Hook: the after-save observer `registerAutoMoveHook` (`auto-move.service.ts:94-127`), registered by `toggleAutoMoveHook(true)` (`app-lifecycle.service.ts:443-447`). The observer keeps only the cheap gates and calls `scheduleEvaluation(filePath)`. The captured `content` is no longer used.
- Fix in passing: `toggleAutoMoveHook(false)` clears pending timers. It does not today (`:134-146` vs `:218-231`), and an engine that writes frontmatter should not fire after the user switched it off.
- Gate fix: `hasLifecycleRules` should be "some type has `archiveTo`", not `typeMetadataMap.size > 0` (`auto-move.service.ts:101`; val-07 Missed 7). Otherwise every save in a typed vault schedules an evaluation.

### 7.2 Property change: covered by the save trigger, honestly bounded

Every in-app property change already ends in `notifyAfterSave` (val-08 R1, val-03 correction 1):

| Change | Path to `notifyAfterSave` |
|---|---|
| Properties panel | 500 ms frontmatter autosave via `writeTab` (`properties.service.ts:83-109`) |
| Meta-bind | CodeMirror transaction, then the same 500 ms autosave (`widgets.ts:868-895`) |
| YAML typed in the editor | 500 ms autosave, no maxWait (`editor.service.ts:227-251`) |
| Cmd+D / Cmd+E and the icon picker | `updateNoteFrontmatter`, which saves at once (`frontmatter-write.service.ts:131-141,161`) |

So the minimal design adds no property-change hook. Latency is the 500 ms autosave plus `debounceMs`:

- about 3.5 s at the default of 3000 (val-01 M8);
- about 1 s at the UI minimum of 500 (`AutoMoveSection.svelte:29-31`).

If "immediately" means about 1 s, the only change is guidance to lower `debounceMs`, plus slice E. The open Properties panel skip-flag bug (Issue 105 section "Properties panel skip flag swallows the only re-parse", `:136-155`; Issue 008) becomes routine at a short debounce: a rule write inside the panel's 300 ms re-parse window can be erased by the next panel keystroke (val-02 M2, val-08 M4). **The 105 skip-flag fix blocks a short default.** It does not block the 3 s default.

What this cannot do is section 15, items 1-2.

### 7.3 Move and rename (rescoped Issue 02)

- Hook: `registerPathChangeConsumer` (`path-change.service.ts:73`). `pathChanged(from, to)` is synchronous. It runs after `diskOp` and after tabs are re-pathed, and before the link rewrite and `rename_note` (`:173-182`).
- Register it in the vault-lifetime consumer list at `app-lifecycle.service.ts:258-268` and gate on `enabled` inside. A dynamic toggle is not needed; the after-save hook keeps its dynamic toggle.
- Behavior:
  - `to === null` (delete): cancel the timers for `from` and for `from + '/'`.
  - Single Markdown note: cancel the timer at `from`, then `scheduleEvaluation(to)`. The debounce and the fire-time read cover the mid-flight state (val-08 M8): by then the link rewrite and `rename_note` are done, and the evaluation reads the note itself, so it never depends on the index at `to` (val-04 Missed 7).
  - Folder (reported once, `:41-48`): re-key pending timers under `from + '/'` to `to + '/'`. **Do not evaluate the children in v1** (O7). A folder rename can touch hundreds of notes, and each would get a write and a History row.
- Own moves: wrap Auto Move's `moveItem` call (`auto-move.service.ts:190`) in a module-local own-change mark consumed by the consumer, copying `asOwnPathChange` / `takeOwnPathChange` (`event-calendar.service.ts:583-601`). Skipping is correct because the evaluation already re-ran the actions at the target (5.2 step 4). It also stops the move chains that today ride on the icon echo (val-04 R6).
- Other programmatic renames fire the consumer: event calendar `:734`, Todoist `sync-now.service.ts:960`, mods `mod-vault.service.ts:60,67`. They then get evaluated after the debounce. That is harmless, because rules only write frontmatter, Todoist owns only `todoist_project` (denied) and evaluations are idempotent. The event calendar writes its fields right after its rename. Our write comes `debounceMs` later through the same writer, so the closed-note race window is the debounce, not zero. Low risk, documented.
- Active note renamed: the write takes the tab branch, so blocker 001 applies.

### 7.4 Create

- Hook: a pre-write content transform.
  - In `openOrCreateNote`, apply it to the result of `buildContent` (`note-creator.service.ts:101`, just before `create_note` at `:103`).
  - In `createFile`, apply it to `content` before `create_note` (`fs.service.ts:208`).

  The registry is `registerCreateContentTransform(fn: (path, content) => string)` in `core/filesystem/`. It is wired in the vault-lifetime list in `app-lifecycle.service.ts` and pinned by `app-lifecycle.service.test.ts`; ADR 0003 requires a test for every registration because a missing one is silent.
- The Auto Move transform:
  1. gates on `enabled`, Markdown, excluded folders and the templates folder;
  2. skips lossy or unmatched blocks;
  3. runs `planEvaluation` with **actions only, no move**;
  4. returns `rebuildContent(finalProps, body, content)`, or the original content when nothing changes.

  It must not throw. The registry wraps each transform in try/catch and logs with `error`, because "a throw propagates and no file is written" (`note-creator.service.ts:33-38`; val-04 confirmed).
- Effects:
  - One write and no second save.
  - No tab exists yet, so **blocker 001 does not apply to this slice**.
  - Rust `create_note` indexes the final content.
  - The transform runs after `buildContent`, so the `_organized: false` stamp from explicit organization is already present and `ifMissing` rules see it.
- Coverage:
  - Covered: Cmd+N, templates, periodic notes, typed "New X", quick capture through `openOrCreateNote`, the explorer, the Quick Switcher and calendar events through `createFile` (val-05 R4).
  - Covered by the save trigger already: deep-link creates, which fire after-save (val-01 R2). The overlap is free, because the second evaluation finds nothing to do.
  - Not covered, by choice: mod `vault.create`, Todoist pull, `duplicateItem` and Trash restore (O8).
- Moves on create stay as today: the first save moves the note.

### 7.5 Out of scope for v1

- External edits (watcher). There is no content for bulk batches, own operations look external, and there are self-save skips (val-03 Missed 4, val-07 Missed 1, scout-08 7).
- Bulk "apply to existing notes". File History is not an undo: snapshots come only from in-app saves, are pruned at about 37 days and can be disabled (val-07 R2).

Document both.

## 8. Loop and oscillation protection

What makes this design terminate, from strongest to weakest:

1. **One fixed point and one write per evaluation**, with a cycle check that writes nothing and logs once per rule set (5.2). This covers every pure rule-vs-rule cycle, including conditions that read their own keys (scout-16 5.2 taxonomy).
2. **The semantic no-op skip** (F2). The write's own echo evaluates, finds `changedKeys` empty and writes nothing. No bytes-based own-write map is needed: a path-only guard could swallow a queued user save (val-03 Missed 7), and the no-op skip makes the echo cost one parse.
3. **Constant values only** (section 4). `always` with a volatile value (`now()`, `file.mtime`) is impossible to configure in v1. Conditions may still use `today()`. That only changes *whether* a rule matches, never the value, so it settles.
4. **No key removal anywhere**, including the legacy icon (F6). This removes the Auto Move color loop for both modes (val-05 R1).
5. **The own-move mark** on the path trigger (7.3), plus at most one move per evaluation.

Not guarded, and documented:

- A vault mod that writes frontmatter from `onNoteSaved` can ping-pong with an `always` rule (`mods-host.service.ts:554-579`; the mods guide already warns, `28-mods.md:180`).
- A sync tool rewriting values from another device.

Error volume: runtime rule errors and cycle reports go through `error()` and so to Sentry. With three triggers this multiplies (val-01 M10). Report once per `(rule id, expression)` per session, and log the rest with `debug`. This is part of slice F, and its default is owner decision O11.

## 9. Interaction with other frontmatter writers

| Writer | Interaction with rules | Design response |
|---|---|---|
| Todoist sync | Owns `todoist_project` only. A rule write on a note with anchored tasks schedules a cycle (`sync-scheduler.service.ts:90-98`). A frontmatter line added between scan and write makes a first-anchor edit stale, so the batch retries next cycle (scout-09 3.1) | Deny `todoist_project`. The no-op skip bounds the scheduling. One delayed cycle is accepted. |
| Todoist `writeProjectId` on an open tab | Patches without saving (`sync-now.service.ts:895-901`). A rule write saves the whole tab early | Harmless: the edits are already in `tab.content`. |
| Lifecycle toggles and `_archive_to` | A rule writing `_archived` feeds a lifecycle move | Now resolved inside one evaluation (the move is chosen on the final record). An improvement over chaining through the save. |
| Explicit organization | Stamps `_organized: false` at create | `ifMissing` on `_organized` composes. `always` on lifecycle flags undoes user clicks (scout-10 2.4). UI warning; O9. |
| Properties panel | Skip-flag race can erase a rule write (Issue 105/008) | Blocks a short debounce, not v1 at 3 s. |
| Meta-bind | Ranged CodeMirror transaction, caret-safe (`widgets.ts:868-895`) | No change. Rule writes use the writer, not meta-bind. |
| Event calendar | `always` on `date`/`start`/`end` overrides drags while its optimistic overlay is pending (scout-09 3.2). `event_color` is not `_color` | Docs warning. Recommend `ifMissing` for event keys. |
| Link rewrite on rename | Rewrites frontmatter wikilinks raw, with no after-save (`link-updater.service.ts:58,71`) | An `always` wikilink rule rewrites it back at the next save (scout-16 3.3). Default new actions to `ifMissing`, and warn on `always` for values containing `[[`. |
| Type rename | Raw rewrite of `_type`, no after-save. Expressions naming the old type are not updated | Docs. Not fixed here. |
| Icon picker | Writes through `setIconForPath`, which still deletes colors when called without them | Out of scope. That is user intent in the picker. A rule's `always` `_icon` reverts a manual pick, which is the documented meaning of `always`. |
| File History | One snapshot per rule write (`file-history.service.ts:192`) | Accepted. One write per evaluation keeps it to one per user edit at most. |
| Mods | New: the path trigger causes after-save writes on rename, so `onNoteSaved` fires after a rename | Update the "Which writes fire it" table in `help/documentation/mods/07-events-and-reactivity.md`. |

## 10. Blockers and the open-itens 001 caret

- **001 (caret follows its text):** every write to an open tab goes through `syncExternalContentToEditor`, then `replaceDoc`, which puts the caret back at its old offset (`MarkdownEditor.svelte:182-186,627`). Effect by slice:
  - It blocks slice A1 (save trigger), C (rename of the active note) and E.
  - It does not block D (create transform: no tab yet).
  - It also affects today's Auto Move icon, background tabs (val-06 Missed 8) and the Properties panel itself (val-06 Missed 7). Skipping the active note does not make writes safe, so I propose no workaround. One write per evaluation at least halves the exposure compared with chaining through the save.
- **054 (Markdown only):** land it before A1, or fold it in (A1 adds the same guard).
- **005 / 022 (empty block):** A1 carries the local "no matched block" skip (F5). Once 022 lands, a note with an empty `---\n---` block is matched and gets the rule's keys. Until then such notes are skipped, not corrupted.
- **105 skip flag / 008:** blocks slice E only.
- **031 (+030), 079:** recommended before A2 (UI), because they touch the same loader and section.

## 11. Settings UI

Same section (`AutoMoveSection.svelte`), same row component, split so it does not triple in size (scout-11 F2):

- New `RuleActionList.svelte` and `RuleActionRow.svelte` in `features/auto-move/`. Each action row has:
  - the key input, normalized to the canonical key on blur, with a hint when it changed (`organized` -> `_organized`);
  - a type `Select` (Text, Number, Yes/No, List);
  - a value control by type: `Input`, `Switch`, or a comma list;
  - a mode `Select` ("Only if missing" / "Always");
  - up, down and remove buttons.

  All of these use existing `components/ui` primitives (`select`, `switch`, `input`, `button`). No new shadcn component is needed (val-06 Missed 10).
- Icon and color: "Add icon" creates an `_icon` action edited with `IconPicker`. "Add color" uses its color-only mode by passing `onColorsChange` with no `currentPack` (`IconPicker.svelte:143-149`). Both default to the `always` mode, which matches today's icon behavior; the owner may prefer `ifMissing` (O3).
- Expression validation: switch to the evaluator's `validateExpression` (`evaluator.ts:306-315`) and derive the error with `$derived` from `rule.expression`. This also fixes the green check shown for a persisted invalid expression (`AutoMoveRuleRow.svelte:37-43`; scout-11 F3), in a component this slice already rewrites.
- Hints, inline and non-blocking:
  - "does nothing": no destination and no actions (Issue 01);
  - "`always` on a lifecycle flag undoes manual toggles";
  - "`always` with a wikilink fights renames";
  - "condition reads `icon`/`color`, use `_icon`/`_color`" (val-01 M5, val-06 Missed 6).
- Copy changes:
  - `AutoMoveSection.svelte:150-153` becomes "Every matching rule applies its properties, top rule first. The first matching rule with a destination moves the note."
  - The enable switch text says it runs both properties and moves, and that it also enables `_archive_to` lifecycle moves (O2).
  - The debounce description ("after save") mentions moves, renames and creates.
  - The section description says "Nothing is reverted when a rule stops matching" once (scout-11 F7).
- Persistence is unchanged: structural edits save at once, text edits are debounced 500 ms. Flush on destroy is Issue 079.
- No per-rule trigger checkboxes in v1. Every rule runs on every trigger (O6).

## 12. Docs and ADRs

- `help/documentation/22-auto-move.md`:
  - rename the identity line ("organize notes into folders" -> "organize notes and set their properties");
  - field table and the evaluation model;
  - a new "Setting properties" section: the AWS example from Issue 01, the modes, conflicts and the top rule winning, the triggers and their latency, no revert;
  - caveats: `_` keys in conditions; first write canonicalizes YAML; lossy and empty-block notes skipped; external edits and folder moves not covered; `file.*` times on create;
  - the configuration-file example;
  - fix the ".md only" line, which becomes true.
- `help/documentation/19-settings.md:236-245`: switch scope.
- `help/documentation/mods/07-events-and-reactivity.md`: the rename row (9).
- `docs/agents/indexing-watcher-rules.md` rule 6: one sentence under "Consumers register" naming the create-content transform registry as a pre-write seam that is not a note-change owner.
- ADR 0029 amendment: "Trigger window" says normalization fires only on UI mutations (`docs/adr/0029-...md:80-82`; val-08). Rule writes are a new automatic re-serializer, but only when a rule changes a value (F2).
- ADR 0003: no new pair; the registry follows the existing inversion pattern. No ADR change.
- New ADR, when built (not speculative): "Auto Move rules are the single rule engine for moves and frontmatter actions: actions all-match, move first-match, one write per evaluation."
- `help/examples/auto-move-features/auto-move-rules.json`: add one action-only example with a path predicate. `examples-scoping.test.ts:231-235` already covers the file name, which is one reason the minimal path wins here (val-06 Missed 11).

## 13. Test strategy (real stores, no mocks of stores or `.logic.ts`)

- **`auto-move.logic.test.ts`** (pure planner and normalizer). Happy path, empty and null inputs, and error cases for:
  - `ifMissing` vs `always` per type;
  - the missing definition (`''`, bare key, `[]`, `0`, `false`, `[""]`);
  - canonical keys (`organized` -> `_organized`; condition `icon` resolves to null);
  - all-match plus first claimant per key;
  - `ifMissing` above `always` shadows it;
  - the fixed-point chain (Issue 01 AWS case in one evaluation);
  - cycle detection (A: open -> closed, B: closed -> open) planning no write;
  - move selection skipping rules without a destination, lifecycle rule after a property-only rule, actions re-run at the destination;
  - `toTruthy` on `NaN`;
  - normalizer: `null` entries, missing fields, unknown mode, denied key, legacy icon translation.
- **`auto-move.service.test.ts`.** Today it mocks `editor.hooks`, `fs.service` and `file-icons.service` (`:6-29`), so the write -> after-save -> re-evaluate chain is untested (val-01). New cases use:
  - the real `editor.hooks` registry, the real `updateNoteFrontmatter` and the real stores (`autoMoveStore`, `settingsStore`, `editorStore`, `collectionStore`);
  - mocks only for `@tauri-apps/plugin-fs` and `call()`, as an in-memory fake file map whose bytes are asserted;
  - `moveItem` either mocked as a side-effect service or, for C, real `applyPathChange` with a stub `diskOp`.

  Assert on file bytes and on store state, never on calls alone:
  - save -> one write with the expected YAML;
  - the echo save writes nothing (same bytes, history mock untouched);
  - a non-canonical note that already satisfies its rules is not rewritten (block list kept);
  - lossy, empty-block and missing-fence notes: no write, no toast;
  - `.canvas` / `.kanban` / `.json`: nothing;
  - a `todoist_project` action dropped;
  - move then actions written at the new path;
  - rename inside the debounce window: evaluation at the new path, no error;
  - toggle off cancels pending timers;
  - two quick evaluations of one path do not overlap (the second sees the first's write).
- **Create transform.**
  - `note-creator.service` and `fs.service` tests: a registered transform shapes the written content.
  - A throwing transform still creates the note and logs.
  - No transform leaves the content unchanged.
  - `app-lifecycle.service.test.ts` pins the registration and the teardown.
- **Path trigger.** Real `registerPathChangeConsumer` with `applyPathChange` and a stub `diskOp`: own move skipped, folder re-key, delete cancel.
- **Components.** `AutoMoveRuleRow.test.ts` and new action-row tests (jsdom, real store): add, edit and remove an action, mode and type switching, canonical-key hint, derived expression error, "does nothing" hint.
- **Examples.** `examples-scoping.test.ts` keeps working because the file name does not change.
- **E2E.** One happy path through `bash scripts/e2e.sh`: create a rule in Settings, edit a note in the folder, assert the property appears in the rendered Properties panel. There is no Auto Move spec today (scout-15 3.7).
- **Never weaken.** The existing Auto Move tests that pin the icon deleting colors must be changed only with the owner's approval (O3), since that behavior change is deliberate.

## 14. Slice plan

Each Issue below is independently shippable. Questions marked O must be answered before an Issue is written: an "owner decision in Notes" criterion makes relay-lite come back blocked (owner memory).

| Slice | Content | Blocked by | Blocks | Needs owner |
|---|---|---|---|---|
| P1 | Existing open-itens 001 (caret) | - | A1, C, E | - |
| P2 | Existing 054 (Markdown only), or fold into A1 | - | A1 | - |
| P3 | Existing 031 (+030) broken config backup; 079 flush on destroy | 030 | A2 (recommended) | - |
| P4 | Existing 105 skip-flag fix / 008 | - | E | - |
| **A1** (rewrites Issue 01) | `PropertyAction` type and normalizer. Planner (all-match actions, claims, fixed point, cycle, first-match move, actions at destination). Runner (fire-time read, per-path tail, gates F4/F5, templates and type-definition exclusion, real stats, toggle clears timers). One write. Save trigger. JSON-only (no UI). Help page section | P1, P2 | A2, B, C, D, E, F | O1, O2, O4, O5, O9 |
| **A2** | Settings UI for actions (sub-components, typed values, modes, hints, derived validation, copy). Help screenshots and text | A1 (P3 recommended) | B (UI part) | - |
| **B** | Icons and colors as actions. Legacy `icon` translation; no color removal; IconPicker icon and color-only modes in the action list | A1, A2 | - | O3, O10 |
| **C** (rescopes Issue 02) | Path-change trigger: consumer, cancel and re-key timers, own-move mark, single notes only, mods doc row | A1, P1 | - | O6, O7 |
| **D** | Create trigger: core create-content transform registry in two primitives, lifecycle-pinned. Auto Move transform with actions only | A1 | - | O8 |
| **E** | Faster property reaction: recommend or lower the `debounceMs` default and its copy (no new hook) | A1, P1, P4 | - | O5 |
| F (optional) | Report runtime errors once per rule; conflict lint ("overridden by rule N", "reads the key it always-sets"); switch for lifecycle moves if O2 says so | A1 | - | O2, O11 |

Critical path: P1 -> A1 -> {A2, C, D}. D can be built right after A1, and could ship before P1 is ready if A1 were split into "planner plus create" first. I do not recommend that ordering, because the save trigger is the owner's main case.

## 15. Where minimal stops being enough

1. **"Immediately" below about 1 s, or per origin.** The after-save path is bounded below by the 500 ms autosave, and it cannot tell a panel toggle from body typing. A per-origin or sub-second reaction needs a `NoteChangeConsumer` with a `source` argument, which is a core API change (`note-change.service.ts:26-33`; val-04 R5, val-08 R2). That hook also sees unsaved `edit` content, link rewrites and watcher echoes, and the projected `tags` change while typing in the body (val-04 R2). That is a design of its own, not an increment.
2. **Transition semantics ("when `status` changes to done").** This design is state-based: a condition plus "nothing reverted". `status == "done"` with `ifMissing` on `done_date` is the state-based equivalent, but only with constant values, because computed dates are not in v1. A real "on change of K, from X to Y" needs a previous value, which no current signal carries (scout-07 section 2).
3. **External edits and bulk backfill.** These need a watcher seam with echo rules, and a pre-write snapshot for undo (val-07 R2, Corrections 3).
4. **Folder moves.** Children are not evaluated. Doing it needs enumeration, a cap or confirmation, and a decision on N writes.
5. **Computed values.** These need value expressions on the Collection engine, a Date-to-string rule and a volatility ban on `always`.
6. **Identity and coupling.** Auto Move's single `enabled` switch also enables `_archive_to` moves. The feature folder and type names say "move" while most rules may only set icons. A second switch and a label rename are cheap, but they accumulate: after slices B-F the folder is a general rule feature in all but name. The honest upside is that this path moves incrementally toward the "shared core" shape without a big-bang refactor. Renaming `features/auto-move` to a neutral name later is mechanical, because nothing else imports its internals (only `app-lifecycle.service.ts:77` and the Settings panel).
7. **Mixed semantics in one list.** First-match for moves and all-match for actions is a real cognitive cost. The UI copy and the conflict lint (F) carry it. If the owner finds it confusing in use, that is the signal to split the list into two sections over one shared planner, which is design A/B territory.
8. **Performance at scale is not measured.** The planner evaluates rules × passes with a fresh `parse` per call (`evaluator.ts:75-78`). With tens of rules a compiled-AST cache (`parse` and `evaluate` are already separate exports) is a small follow-up. I give no latency figures.

## 16. Owner decisions (answer before writing Issues)

- O1. Accept "extend Auto Move" as the one engine, with Issue 01 rewritten (Behaviors 5 and 6 replaced by all-match actions, a first-match move and an in-memory fixed point; `defaultProperties` becomes `actions`) and Issue 02 rescoped as slice C? Should the user-facing section be renamed (for example "Rules")?
- O2. One switch for moves, lifecycle `_archive_to` moves and property actions, or a separate lifecycle-moves switch?
- O3. Legacy `icon`: translate it into `always` actions that stop wiping colors and apply from every matching rule (recommended), or keep "icon only from the moving rule"? What default mode should new icon and color actions get?
- O4. Value types in v1: text, number, boolean, list. Is `always` on a list a replace, with "add to list" left for later?
- O5. Is "about 1 s with `debounceMs` at 500" what "immediately" means? If not, section 15.1 applies.
- O6. Should every rule run on every trigger (v1), or do rules need per-rule trigger choices?
- O7. Folder move or rename: skip the children in v1 (recommended), or evaluate them with a cap?
- O8. Create coverage: `openOrCreateNote` and `createFile` only, or also mod create and Todoist pull?
- O9. Deny-list beyond `todoist_project`: forbid `always` on `_type`, `_organized`, `_archived`, `_favorite`, or allow it with a warning?
- O10. Should `ifMissing` on `_icon` skip notes that already show an inherited type icon?
- O11. Runtime rule errors: Sentry once per rule per session (recommended), per occurrence, or local log only?
- O12. Is the one-time YAML canonicalization of a note acceptable the first time a rule actually changes it (ADR 0029 amendment)?

## 17. Not verified

- I did not run anything. Cycle behavior, the no-op skip and the transform ordering are derived from code and the validators' traces.
- I did not re-check that `collection.logic.ts:481-485` uses a local truthiness copy rather than `evaluator.ts:632`. Exporting `toTruthy` may then also mean deduping that copy.
- Whether `openOrCreateNote` call sites already apply explicit organization inside `buildContent` or inside the template: the ordering claim in 7.4 assumes it happens before `:101`, per ADR 0026 and scout-10 2.3, not traced per call site.
- That a `features/auto-move` registration in the vault-lifetime list at `app-lifecycle.service.ts:258-268` keeps the existing lifecycle test's assertions intact. The test file exists; its body was not read.
- Planner cost per evaluation (not measured).
