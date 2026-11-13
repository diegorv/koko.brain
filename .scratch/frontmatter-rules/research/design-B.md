# Design B: shared rule core plus a separate Property Rules feature

Designer B, 2026-11-10. Read-only design built on `scout-01` to `scout-16` and `validation-01` to `validation-08` (validators win where they disagree with scouts). Code citations were spot-checked at HEAD `2e2cc5b60`: `auto-move.service.ts:90-231`, `auto-move.types.ts`, `path-change.service.ts:14-80`, `note-creator.service.ts:25-133`, `fs.service.ts:198-224`, `app-lifecycle.service.ts:252-264,438-448`, `settings.types.ts:284-293`, `docs/agents/indexing-watcher-rules.md`. Everything else is cited through the research file that verified it.

## 0. The argument in one page

The approach: move the generic rule machinery (expression match, triggers, scheduling, exclusions, loop guards, config load/save) into one leaf module that both Auto Move and a new Property Rules feature use. Auto Move keeps its rule shape, config file, store, Settings section and master switch. Property Rules gets its own rule list, file, section and switch, with all-match semantics and per-action fill/set.

The research changes what "shared core" has to mean. A shared library alone is not enough. Two findings force the runtime to be shared too:

1. **Two independently debounced writers race on one closed note.** `updateNoteFrontmatter` leaves per-path serialization to the caller (`frontmatter-write.service.ts:95-97`). A separate feature with its own debounce next to Auto Move's would issue concurrent writes, or write to a path Auto Move just moved away from (validation-02 M4, validation-08 M5).
2. **Auto Move's icon action already fights any rule that writes `_color` or `_title_color`.** `withIconColors` deletes the color keys when the rule has no color (`frontmatter-icon.service.ts:26-31`, called with optional colors at `auto-move.service.ts:209`). The two writes loop with either fill or set semantics (validation-05 R1, scout-09 H1). Only one owner of those keys per evaluation stops it.

So the core in Design B is **one runner per path**. It schedules, re-reads, matches, plans every frontmatter action of every rule set in one in-memory pass, performs at most one move, and makes at most one `updateNoteFrontmatter` call. The features are **rule set providers**: they own data, UI and the policy for choosing rules, and they do not own triggers or writes.

Why this beats the alternatives on the owner's criteria:

- **One engine, one domain.** There is one expression match layer, one trigger dispatcher, one write path, one loop guard and one definition of "missing" (Section 6). Nothing is duplicated.
- **Auto Move is not bent.** It stays first-match-wins, move-centric, behind its own "moves notes" switch, and its config file contract (`.kokobrain/auto-move-rules.json`, `help/documentation/22-auto-move.md:157-177`) is unchanged. Issue 01's fall-through special case (Behavior 5) and its chaining through the save (Behavior 6) are no longer needed. Both exist only because one first-match list has to carry additive actions (scout-02 3.1, scout-16 4.2).
- **Property Rules gets the semantics it needs.** All matching rules apply, top of the list wins per key, and its own switch is independent of moves (scout-10 2.5, scout-15 3.4).

The real weaknesses are listed in Section 14. The biggest: the "separate feature" is separate only in data, UI and switch. Correctness forces a shared runtime. That costs a refactor of working Auto Move code before the owner gets anything new.

## 1. Domain model and names

`CONTEXT.md` does not exist (`docs/agents/domain.md:5-12`, scout-15 0.1). The names below are proposals and should go through `/grill-with-docs` when the owner accepts them. They avoid the bare words "rule" and "lifecycle", which are already overloaded (scout-15 section 2).

| Term | Meaning | Code name |
|---|---|---|
| **Note rule** | The shared part of any rule: id, name, condition expression, enabled flag. | `NoteRuleBase` |
| **Rule set** | One feature's ordered rule list, plus its gates (switch, excluded folders, accepted triggers) and its selection policy. Two exist: Auto Move rules (first match, move) and Property Rules (all match, frontmatter). | `RuleSetProvider` |
| **Trigger** | What asks for an evaluation: `save`, `propertyChange`, `create`, `move`, `rename`. | `RuleTrigger` |
| **Property action** | Write one frontmatter key: `{ key, value, type, mode }`. Icons and colors are property actions on `_icon`, `_color` and `_title_color`. The real keys are named, with no parallel icon model (ADR 0027 via scout-15 3.2). | `PropertyAction` |
| **Mode** | `fill` ("Only if missing": absent, null, `''` or `[]` on the canonical key, Issue 01 Behavior 4) or `set` ("Always"). | `ActionMode` |
| **Claim** | The first matching rule in run order that owns a key for one pass. Later rules skip that key. | internal |
| **Run** | One serialized evaluation of one path, carrying the set of triggers that asked for it. | internal |
| **Pass** | One iteration over all participating rules inside a run's fixed point. | internal |
| **Property Rules** | The new user-facing feature. The label follows the panel word "Properties" (scout-15 2). Naming is an owner call. | `features/property-rules/` |

Unchanged: Auto Move rule (`AutoMoveRule`, `auto-move.types.ts:14-27`) and lifecycle rule (generated from `_archive_to`, `type-lifecycle-rules.ts`).

## 2. Where the code lives (layer and cycle rules)

```
src/lib/features/note-rules/                 shared core: a leaf feature
  note-rules.types.ts        NoteRuleBase, RuleTrigger, PropertyAction, RuleSetProvider, RunContext
  rule-match.logic.ts        compileExpression (bounded AST cache), validateRuleExpression, matchesRecord
  property-plan.logic.ts     canonical keys, isMissing, planActions (claims + fixed point), applyPlan (pure mutate), hasEffect
  rule-gates.logic.ts        default exclusions, excluded-folder match (slash-normalized), isWritableFrontmatter
  rule-config.logic.ts       per-entry normalizer, versioned parse
  rule-config.service.ts     load/save of a .kokobrain JSON with broken-file backup (both features use it)
  note-rules.service.ts      provider registry, per-path scheduler and queue, runner, the three trigger hooks, own-write and own-move guards
  RuleExpressionField.svelte / RuleRowHeader.svelte   shared Settings pieces (slice S7)
src/lib/features/property-rules/             new feature: provider + data + UI
src/lib/features/auto-move/                  keeps types, store, UI, config; its service becomes a provider
```

Constraints checked:

- **`core/` cannot import `features/`.** `layer-baseline.json` holds only the 3 `utils -> core` entries, so a new `core -> features` edge fails at once (validation-01 confirmed, validation-05 M9). The core therefore cannot live in `core/`, because it imports `features/collection/expression`. It lives in `features/note-rules/`, as option A of scout-01 section 7 recommends.
- **No feature cycles.** `featureCycleEdges` is empty (`feature-cycle.test.ts:36-44`). New acyclic pairs:
  - `auto-move -> note-rules`
  - `property-rules -> note-rules`
  - `property-rules -> file-icons` (IconPicker)
  - `note-rules -> collection` (engine, `buildNoteRecord`)
  - `note-rules -> type-definitions` (to exclude definition notes, `type-definitions.logic.ts:91`)

  `note-rules` must never import `auto-move`, `property-rules` or `properties`; it reaches them only through the provider registry. `feature-cycle.test.ts` rewrites `featurePairs` on disk, so that JSON diff is committed (validation-08).
- **Pure logic stays pure.** `.logic.ts` files may import only the engine, `core/frontmatter/properties.logic.ts` and `utils/` (`pure-logic.test.ts`). Errors are reported through an `onError` callback, never through `debug()` (scout-01 7).
- **Core changes, each a registry or an additive parameter wired from `app/lifecycle` (ADR-0003):**
  - `core/editor/editor.hooks.ts`: `AfterSaveObserver` gains an optional third argument `previous?: string` (Section 4.2).
  - `core/note-creator/create-transform.ts`: a new registry `registerCreateContentTransform`, called by `openOrCreateNote` (`note-creator.service.ts:101-103`) and `createFile` (`fs.service.ts:208`) (Section 4.3).
  - Nothing else in `core/`.

## 3. Rule data shape and config migration

### 3.1 Property Rules file: `.kokobrain/property-rules.json`

```json
{
  "version": 1,
  "rules": [
    {
      "id": "rule-1731234567",
      "name": "AWS folder belongs to AWS",
      "expression": "file.folder.endsWith(\"/work/topics/AWS\")",
      "enabled": true,
      "triggers": ["save", "propertyChange", "create", "move", "rename"],
      "actions": [
        { "key": "_belongs_to", "value": "[[AWS]]", "type": "text", "mode": "fill" },
        { "key": "_icon", "value": "lucide:cloud", "type": "text", "mode": "fill" },
        { "key": "_color", "value": "orange", "type": "text", "mode": "set" }
      ]
    }
  ],
  "excludedFolders": []
}
```

- **`type`** is `text | number | boolean | list`. The serializer keys off `Property.type`, and a text `"true"` is written quoted and ignored by `boolFlag` (validation-08 correction 6, scout-16 3). `date` is a read-side label only and is written as text (scout-16 2.1). A list value is `string[]`; items are coerced to strings.
- **Values are literals in v1.** Computed values would bring a third template dialect next to `{var}` and `<% %>` (validation-01 M6), and volatile values never converge under `set` (scout-16 5.2). This is an owner question.
- **`triggers`** is per rule. The default for a new rule is all five triggers.
- **`version`** is used because no `.kokobrain` config has one today (scout-11 F4.1) and prior art lost user rules in a schema change (scout-14 3.5 item 4).
- **Per-entry normalizer on load.** It drops `null` entries, requires a string `id` and `expression` and a boolean `enabled`, drops actions with an unknown `type` or `mode`, and canonicalizes `key` with `canonicalizeKey`. Today a `null` Auto Move entry throws on every save, reports to Sentry and breaks the Settings render (validation-06 R1).
- **Corrupt file.** The loader copies the bytes to `property-rules.broken-<stamp>.json`, toasts, and loads empty. This follows the `settings.json` precedent (`settings.service.ts:60-65,210-226`, scout-11 F4.3). The shared `rule-config.service.ts` gives Auto Move the same behavior, which also covers Issue 031.
- **Bookkeeping.** The new writer needs an entry in `raw-write-ratchet.test.ts` (scout-02, config section). `examples-scoping.test.ts:231` must also scan `property-rules.json` under `help/examples/`, or an unscoped example rule copied into a real vault stamps every note (validation-06 M11).

### 3.2 Auto Move file: unchanged

There is no migration. `AutoMoveRule.icon` keeps its stored shape (`auto-move.types.ts:2-11`). At run time Auto Move's provider translates it into property actions in `set` mode (Section 5.3).

### 3.3 Issue 01 `defaultProperties`

Issue 01 is not shipped (scout-11 constraint 6). Design B re-scopes it: the fill-if-missing capability ships as Property Rules (slice S3), and Auto Move gets no `defaultProperties` and no "empty destination means no move". **Operational risk:** 01 is `ready-for-agent`, and a relay run of 01 before the owner decides would create the two-systems state this design avoids. If 01 ships anyway, a one-time load migration of `defaultProperties` into Property Rules actions with `mode: fill` is lossless (scout-11 constraint 6), but it crosses two files and needs the version bump.

### 3.4 Settings (`settings.json`)

- **New field.** `propertyRules: { enabled: boolean }`, default `false`. `parseSettings` merges nested objects by spread, so no migration is needed (scout-11 F1).
- **Delays.** Delays belong to the core (Section 4.5). Recommendation: move `autoMove.debounceMs` to `noteRules.saveDelayMs`, with a one-line parse-time fallback from the old key. The alternative is to keep it under `autoMove`, so the delay after a body save keeps its current home. This is an owner question.

## 4. Trigger architecture

All triggers feed one entry point: `requestRun(path, trigger, delayMs)`. The core keeps one `pending: Map<path, { timer, triggers: Set<RuleTrigger> }>`. A new request for a pending path merges its trigger into the set and shortens the timer when its delay is smaller. When the timer fires, the run goes onto a per-path promise chain (the `serializeListWrite` pattern, `rail-shell/list-prefs.service.ts:28-37`, validation-02 confirmed).

### 4.1 Save

- **Hook.** One after-save observer, owned by `note-rules`, registered where Auto Move's is today. Today that is step 6, after the bookmark migration (`app-lifecycle.service.ts:443-445`; the order is deliberate, scout-02 1.1). Teardown unregisters it and clears every pending timer.
- **Sync gates.** In order:
  1. Some provider is enabled and has compiled rules. Count real rules: Auto Move's `typeMetadataMap.size > 0` gate fires in every vault with types (validation-07 M7).
  2. `isMarkdownFile(path)`. Kanban, canvas and mod JSON reach after-save today (validation-02 M1, validation-01 M1). This implements Issue 054 for Auto Move too.
  3. The own-write guard: skip when `content === lastEngineWrite.get(path)`, and delete the entry otherwise. The guard compares bytes, not paths, so a user save queued behind the engine's write still runs (validation-03 Missed 7).
- **Then.** `requestRun(path, 'save', saveDelayMs)`.
- **At fire time the runner re-reads the content:** `editorStore` tab content if the note is open, else `readTextFile`. A missing file drops the run quietly. Today Auto Move matches on bytes captured at save time (validation-04 Missed 2).

### 4.2 Property change ("immediately")

Every property edit already ends in a save:

| Edit | Reaches after-save | Source |
|---|---|---|
| Properties panel | 500 ms autosave | `properties.service.ts:104`, validation-03 correction 1 |
| Meta-bind | 500 ms autosave | `widgets.ts:868-895` |
| YAML typed in the editor | 500 ms after a pause | `editor.service.ts:230` |
| Lifecycle toggles, icon writers | at once | `updateNoteFrontmatter` |

So "property change" is a save whose canonical frontmatter differs from the previous saved version. No new edit seam is needed, and none should be added: note-change consumers see unsaved `edit` text, link rewrites and watcher echoes, and they miss full rebuilds (validation-04 R1, R5; validation-03 correction 7).

- **Where the previous version comes from.** An additive optional `previous?: string` on `AfterSaveObserver`:
  - `writeTab` passes `tab.savedContent` before `markSavedByPath` overwrites it (scout-06 2.1).
  - `updateNoteFrontmatter`'s closed branch passes `base` (validation-03 R6).
  - Deep-link and mod writers pass nothing.

  Existing observers ignore the argument. The fallback, an engine-owned snapshot map, needs seeding and invalidation lifetimes (scout-07 3.2), so it is rejected.
- **Diff.** Compare `parseFrontmatterProperties(previous)` with `parseFrontmatterProperties(content)` by canonical key, deep-equal for arrays. Never diff the projected record: `tags` merges inline body tags, so body typing of `#foo` would look like a property change (validation-04 R2). When `previous` is absent, the save counts as `save` only.
- **Then.** `requestRun(path, 'propertyChange', PROPERTY_CHANGE_DELAY_MS)`. Every after-save is also a `save` trigger, so one save can carry both.
- **Delay.** Short. It must not land inside the Properties panel's 300 ms re-parse window while that skip flag can still swallow a re-parse (Issue 105, validation-05 R6). With Issue 105 fixed, a few hundred ms is enough. No figure is quoted as measured (owner memory: latency numbers only from measurement).

### 4.3 Create

**A pre-write content transform in the two core creators** (scout-08 option A). The same table-driven planner runs synchronously on the rendered content before `create_note`.

- **Benefits.** One write, no tab yet, so the caret blocker 001 does not apply. Rust indexes the final bytes. There is no after-save echo.
- **Registry.** `core/note-creator/create-transform.ts` exports `registerCreateContentTransform(fn: (path, content) => string)`. It is called in `openOrCreateNote` after `buildContent` (`note-creator.service.ts:101`) and in `createFile` before `call('create_note')` (`fs.service.ts:208`). The registry wraps each transform in try/catch and falls back to the untransformed content, so a rule error never blocks creation (`buildContent` throws by contract, `note-creator.service.ts:33-38`, scout-08).
- **Coverage.** Cmd+N, "+ New here", Quick Switcher, typed notes, templates, periodic notes, quick capture, 1:1, calendar events (scout-09 section 5, validation-05 R4).
- **Not covered:** mod `vault.create` and Todoist pull (they call `create_note` directly), and `duplicateItem` and Trash restore. Deep-link creates are already covered by after-save (validation-01 R2). A deep-link create gets `save` only, never a second `create` run, so there is no double evaluation.
- **Only rules whose `triggers` include `create` participate.** Auto Move does not take part in create; it moves after the first save, as today.

### 4.4 Move and rename

**A vault-lifetime path-change consumer** owned by `note-rules` (`registerPathChangeConsumer`, `path-change.service.ts:73`). It is synchronous and void (`:38-49`), so it only re-keys and schedules.

- `to === null`: cancel pending runs for `from` and for `from + '/'`.
- **Otherwise, always:** re-key pending timers and `lastEngineWrite` entries from `from` to `to`, children included. Auto Move's timers go stale on a rename today (validation-01 M3, scout-08 4.2.5).
- **Own moves.** When the path change is the runner's own move, return after re-keying. The runner marks its own `moveItem` with a module-local `{from, to}` mark, the `asOwnPathChange` pattern (`event-calendar.service.ts:583-601`). It continues the same run at the new path itself (Section 5).
- **Otherwise,** classify `rename` (same parent) or `move`, and `requestRun(to, trigger, PATH_CHANGE_DELAY_MS)`.
  - The delay must outlast `applyPathChange`'s remaining awaits: link rewrite, tree move, `rename_note` (`path-change.service.ts:173-209`, validation-08 M8).
  - A folder arrives once. At fire time the runner enumerates Markdown children under `to + '/'` from the file tree, with a cap that the owner sets (scout-08 question 3).
- **Programmatic renames by the event calendar, Todoist and mods also fire this consumer** (scout-08 5.3). Default: they count, since property actions only write frontmatter, which Todoist ignores (scout-09 3.1). This is an owner question.
- **Auto Move on move and rename (Issue 02).** The Auto Move provider declares whether its rules accept `move` and `rename`. Ping-pong is impossible inside one run because the runner moves at most once per run and skips its own path changes (Section 7).

### 4.5 Delays and switches

- **Per trigger kind, owned by the core:**
  - `save`: `saveDelayMs`, default 3000 as today (`settings.store.svelte.ts:112`).
  - `propertyChange`: short.
  - `create`: synchronous.
  - `move` and `rename`: short deferral.
- **Every run evaluates every enabled provider,** each filtered by the rule's own `triggers`. Consequence: after a frontmatter edit, Auto Move now moves after the short delay instead of 3.5 s. That is the owner's "right away", but it changes Auto Move's timing; it is flagged in Section 12.
- **Switches.** Each provider has its own switch (`autoMove.enabled`, `propertyRules.enabled`). The core re-checks them at fire time, so turning a feature off also stops runs already pending; today a pending Auto Move timer still moves (scout-02 3.8). `toggleAutoMoveHook` goes away: the Settings toggle only writes the setting.

### 4.6 External edits (watcher): out of scope for v1

The watcher payload has paths only and no event kind. Own renames and link rewrites look external, and bursts above 10 files skip per-file work (scout-08 section 7, validation-07 M1). This is documented as a limit. A later "apply rules to existing notes" command with a preview is the backfill path (scout-14 recommendation 6).

## 5. The run (the heart of the design)

```
run(path, triggers):
  1. resolve: content = open tab content ?? readTextFile(path); missing file -> stop
  2. gates:   markdown; default exclusions; each provider's excluded folders on the current path
  3. writable = isWritableFrontmatter(content):
       (content does not start with "---")
       OR (a block matches FRONTMATTER_REGEX AND detectLossyFrontmatter(content) === null)
  4. record = buildNoteRecord(path, content, stats from collectionStore.propertyIndex.get(path) ?? defaults)
  5. plan = writable ? planActions(propertyProviders + moveProvider's icon, triggers, record, props) : none
  6. move  = moveProvider.chooseMove(recordOf(final working props), triggers)  // first match, user rules then lifecycle
  7. if move: mark own path change; newPath = moveItem(...); on throw, stop (logged by moveItem)
  8. if hasEffect(plan, props): next = updateNoteFrontmatter(newPath ?? path, props => applyPlan(props, plan));
                                lastEngineWrite.set(path, next)
```

- **Step 3 is not `detectLossyFrontmatter` alone.** Content that starts with `---` but matches no block (an empty `---\n---` block, or a missing closing fence) passes the lossy check, and `rebuildContent` would stack a second block (validation-04 R3, Issues 005 and 022). Skipping it makes 005 and 022 non-blocking for this feature. A note with no frontmatter at all gets a new block, which is intended.
- **Step 4 uses real stat values.** Today Auto Move fakes `mtime`, `ctime` (`Date.now()`) and `size` 0 (`auto-move.service.ts:154`, validation-06 Missed 5).
- **Step 5 decides "missing" on parsed canonical `Property[]`.** Matching runs on the record, but the projected record invents `organized`, `archived`, `favorite` and `tags`, re-cases `_type` and turns relationship keys into target arrays (validation-02 correction 1, validation-07 R4).
- **Step 6 runs on the final planned state.** A move rule on a property just planned matches in the same run. This replaces Issue 01 Behavior 6 ("chaining through the save"): one write instead of one write per hop, each 3 s apart, each with a snapshot and a reindex (scout-16 4.4).
- **Step 7 then step 8.** The move comes first and the write lands at the new path, so the write's after-save never schedules work for a path that no longer exists (Issue 01 Behavior 2). Because everything is one serialized sequence, the race in validation-02 M4 cannot happen.
- **Step 8 calls the writer only when a planned value differs semantically** from the parsed value. The writer's `next === base` check compares canonical bytes, so a no-op call would still reformat hand-written YAML once (validation-01 R1, validation-07 R3).
- **`applyPlan` is pure.** It re-checks `fill` against the fresh props it receives, since `mutate` can run twice (`frontmatter-write.service.ts:95`). All keys, icons and colors included, go into the one `mutate`. The icon index follows through the `file-icons` note-change consumer, with no `setIconForPath` (validation-05 confirmed, validation-06 Missed 1).
- **Refusals** (`FrontmatterWriteError`) are caught and logged with `debug`, never toasted. Today Auto Move toasts when the frontmatter changed during its debounce (validation-03 Missed 9).
- **Performance.** ASTs are cached in a bounded module-level map keyed by expression text; `evaluate(node, ctx)` is exported (validation-07 confirmed). With literal values, a run costs one record build per pass. The parse cache (LRU 16) covers repeats.

### 5.1 Planning: ordering, claims, fixed point

- **Run order.** Property Rules in list order, then the legacy icon actions of the Auto Move rule the move provider matched.
- **Claims.** In each pass, a matching rule claims every key it has an action for, whether or not it writes. Claim-on-write breaks idempotence: two `set` rules on one key would ping-pong (scout-16 4.3).
- **Progressive conditions.** Each rule's condition sees the working copy as rebuilt so far (`buildNoteRecord` on `rebuildContent(working)`; never patch `record.properties`, scout-16 2.3).
- **Repeat passes until a pass changes nothing,** with a cap of 10 (the `MAX_FORMULA_DEPTH` precedent, `evaluator.ts:18`) and a visited-state set. On a repeat or at the cap, write nothing and log once per path and rule set per session.
- **The guarantee this buys:** a run writes only a state on which the plan is a fixed point. Re-running on the written bytes is a no-op, so termination does not depend on the own-write guard or on byte-level idempotence. The guard only saves the re-evaluation. The exceptions are conditions reading `now()`, `today()`, `file.mtime` or `file.size`. They can change match without any event (validation-07 Missed 2), but every change still needs a new user event, and none of them loops.

### 5.2 Match semantics

- **One truthiness function:** `toTruthy` (`evaluator.ts:632-636`). It keeps Collection unchanged and differs from Auto Move's JS truthiness only on `NaN` (validation-01 M4).
- **One validator for the UI:** the strong `validateExpression` (`evaluator.ts:306-315`), plus warnings:
  - a condition identifier that is not a known property (`getAllKnownProperties`, `filter.logic.ts:223`), because a typo such as `!stauts` matches every note (validation-06 R2);
  - alias identifiers that always read null (`icon`, `color`, `order`), with `_icon`, `_color`, `_order` suggested (scout-16 2.4).
- **Runtime throws** go to `error()` once per rule per session and to `debug` after that. Today a broken rule sends one Sentry event per rule per note per save (validation-01 M10). This is an owner question.

### 5.3 Auto Move as a provider

Behavior the provider preserves, with a regression test for each before the refactor (CLAUDE.md "Removing or Refactoring Code"):

- first match wins (`auto-move.logic.ts:17-35`);
- user rules before the regenerated lifecycle rules (`auto-move.service.ts:156-157`);
- excluded folders on the pre-move path (`:107`);
- an existing target is skipped quietly (`:189-195`);
- the icon is applied even when the note is already in the destination (`:199-214`);
- lossy frontmatter skips the icon quietly (`:203-207`);
- the icon action is "always set", and it removes `_color` and `_title_color` when the rule has none (`frontmatter-icon.service.ts:26-31`).

The last point is kept in the refactor, as a `remove` effect only on unclaimed keys. Because claims span providers in one pass, a Property Rule that sets `_color` claims it first, so the H1 loop disappears without changing the legacy icon's behavior for anyone who does not also use Property Rules. Dropping the removal (so "nothing is reverted" holds everywhere) is a separate owner decision (Section 13).

## 6. Per-action fill versus set

| Value type | `fill` writes when | `set` writes when | Notes |
|---|---|---|---|
| text, number, boolean | the canonical key is absent, null, or `''` | the value differs | `0` and `false` count as populated for `fill` (scout-16 1.4). Reuse `isEmptyPropertyValue` (`properties.logic.ts:464`, export it) rather than add a fifth "empty" definition. |
| list | absent or `[]` | the ordered list differs | A populated list that lacks the item is not missing. "Add if absent" (the `ensureFrontmatterLink` stem test, which needs extracting, validation-08 R5) is an owner question; v1 ships fill and set only. |
| wikilink text | as text | as text | Always quoted (`"[[X]]"`). `set` fights the rename link rewriter (scout-16 3.3), so `fill` is the default mode for new actions. |

Key policy:

- **Deny-listed in both modes:** `todoist_project` (scout-09 3.1, validation-05 C7).
- **Warn in the editor for `set`:** `_type`, `_organized`, `_archived`, `_favorite`, the calendar keys `date`/`start`/`end`/`end_date`/`all_day`/`event_color` (scout-09 3.2-3.3, validation-05 R8), and `_order`, which forces a tree reload per refresh window (validation-07 Missed 6).
- **Warn for `fill` on `_organized`:** a missing key reads as organized, so filling `false` sends old notes into the Inbox (scout-15 0.6).
- **Warn for `fill` on `_icon`:** it overrides an inherited type icon (validation-08 M10).

Whether any of these become hard blocks is an owner question.

## 7. Loop and oscillation protection, summarized

| Loop | Stopped by |
|---|---|
| A rule set with no fixed point (always-set ping-pong, period-2 status flips, reciprocal keys) | Fixed point with a pass cap and a visited-state check inside one run. Nothing is written; one log line (Section 5.1). |
| Own write re-triggering the core | Byte-exact `lastEngineWrite` guard, and the write is a fixed point anyway |
| Own move re-triggering a path-change run | Own path-change mark; at most one move per run |
| Auto Move icon vs a color rule (H1) | Cross-provider claims in one pass |
| Two same-key `set` rules with disjoint triggers (for example a save-only rule and a move-only rule) | Not a loop, since it flips once per user event. The editor shows "same key set by rules N and M with different triggers". |
| External writers: a mod's `onNoteSaved` writing the same key, the calendar, Todoist | Not detectable by the core. Mods are documented as out of the guard (scout-09 H6). |

## 8. Interaction with other frontmatter writers and Todoist sync

- **Properties panel skip flag** (Issue 105, Issue 008). Any rule write to the active note within 300 ms of a panel commit can be dropped by the panel's next commit (validation-02 M2, validation-05 R6). The fix belongs to the panel. It blocks slice S5 (property change). Save-triggered runs land after the 300 ms window, as today's Auto Move icon does.
- **Todoist.**
  - `todoist_project` is deny-listed.
  - Every rule write to a note with anchored tasks schedules a Todoist cycle (`sync-scheduler.service.ts:90-98`). That is bounded, because runs converge.
  - The closed-note race with Rust `write_task_lines` (scout-09 H4) is plausible but not proven end to end, and only a shared chain inside `updateNoteFrontmatter` would close it. Design B does not change the core writer (owner rule: no core changes for corner cases) and asks instead.
  - Todoist renames fire the move/rename trigger. That is harmless for frontmatter-only actions.
- **Event calendar.** `renameAndWrite` renames, then writes the target (`event-calendar.service.ts:732-759`). The core's path-change run is deferred and re-reads content, but a closed-note overlap with the calendar's write is still possible (scout-09 H3). Mitigation: the core does not schedule a `move` or `rename` run for notes with `_type: Event`, unless the owner wants it.
- **Lifecycle toggles and Auto Move archiving.**
  - A Property Rule that sets `_archived: true` and the generated archive rule now act in the same run: plan, then move on the final state.
  - Lists lag by the throttle unless the core calls `vaultStore.requestPromptIndexRefresh()` after a write that touched `_organized`, `_archived`, `_favorite`, `_type` or `_icon`, or after a move (validation-02 M6, scout-09 3.3). Recommended, one line.
- **Link rewriter and type rename** fire no after-save (validation-05 M1, C6). Backlink sources are not re-evaluated after a rename, and expressions that name a renamed type are not rewritten. Both are documented as limits.
- **File History.** One snapshot per rule write. It is not an undo net for rule writes: snapshots come only from in-app saves, are pruned after about 37 days, and can be off (validation-07 R2).
- **Mods.** Rule writes fire `onNoteSaved`. The "Which writes fire it" table in `help/documentation/mods/07-events-and-reactivity.md` gains rule writes, and create-transform notes get no extra event (validation-06 correction 10).

## 9. Caret blocker (open-itens 001)

- Every `updateNoteFrontmatter` call on an open tab goes through `syncExternalContentToEditor`, which keeps the caret at its old numeric offset (`MarkdownEditor.svelte:627`, `:182-186`). Background tabs are affected too (validation-06 Missed 8). Skipping the active note is therefore not a workaround.
- Issue 001 is size S, `ready-for-agent`, and the fix direction is known (map the selection through the change set).
- In Design B, 001 blocks every slice that adds writes to open notes: S3, S5 and S6. It does not block:
  - S1, which adds no new writes;
  - S2, which keeps today's icon write path, already exposed today;
  - S4, the create transform, which writes before any tab exists.
- One write per run halves the exposure compared with write-per-hop chaining (scout-16 6).
- Do not route rule writes through a ranged CodeMirror transaction as a workaround (validation-05 M4). That would be a second write seam for the active tab; fix 001 instead.

## 10. Settings UI

- **New section "Property Rules"** in the Vault group next to Auto Move. Touch points:
  - `settings.types.ts:359`
  - `settings.logic.ts:255-300`
  - `SettingsPanel.svelte:44-64,71-91`
  - `settings.logic.test.ts:372,382`
  - `SettingsPanel.test.ts:23`
  - `19-settings.md:9`

  (scout-11 F1.)
- **Section body:**
  - master switch, default off;
  - delay after save, if the owner moves it to the core (Section 3.4);
  - the rules list;
  - excluded folders: the chip list pattern, with entries normalized for slashes (scout-02, validation-01: `'_templates/'` never matches today);
  - one line of copy: "All matching rules apply, top first. A rule that stops matching changes nothing back."
- **Rule row**, split into sub-components so it does not grow `AutoMoveRuleRow`'s 165 lines (scout-11 F2):
  - `RuleRowHeader` (name, switch, up, down, delete);
  - `RuleExpressionField`: error derived with `$derived` from the strong validator. That fixes the green check shown for a persisted invalid expression (`AutoMoveRuleRow.svelte:37-43`, scout-11 F3), and it carries the unknown-identifier warnings;
  - trigger toggles: there is no checkbox in `components/ui/`, so use `Switch` or generate a shadcn checkbox (validation-06 Missed 10);
  - an action list.
- **Action row:**
  - a kind `Select` (Property, Icon, Color, Title color). Icon and colors are sugar for the fixed keys;
  - a key input with suggestions from `getAllKnownProperties`, minus `file.*` pseudo-properties, canonicalized on blur;
  - a type `Select`;
  - a value control per type;
  - a mode `Select` ("Only if missing" / "Always"), default "Only if missing".

  Icon uses `IconPicker` (`IconPicker.svelte:17-36`). Color-only needs `onColorsChange` wired (scout-11 F5). The color vocabulary differs per key: `_color` maps palette names to theme tokens, `_title_color` uses raw CSS (validation-03 R8, correction 10); say which applies.
- **Inline hints, none of which block saving:** "does nothing", "overridden by rule N" (claims), "condition reads a key this rule sets".
- **Save pattern:** structural edits save at once, text edits are debounced, and `onDestroy` flushes instead of clearing, the Issue 079 bug (validation-06 Missed 9).
- **Auto Move keeps its section.** Adopting the shared row pieces there is optional slice S7.

## 11. Docs

- **New `help/documentation/30-property-rules.md`.** It covers:
  - triggers and delays;
  - fill vs set per type;
  - claims and order;
  - "nothing is reverted";
  - expression gotchas: underscore keys, `file.folder` is absolute, `inFolder` has no separator check (validation-02 M11);
  - default exclusions;
  - lossy notes skipped;
  - first write canonicalizes YAML;
  - external edits not seen;
  - the AWS example.
- **`22-auto-move.md`:**
  - it shares the rule engine;
  - Markdown only (fixes the `:183` mismatch);
  - timing after property changes;
  - one move per run;
  - real `file.*` stats.
- **Other help pages:**
  - `19-settings.md`: the new section;
  - `28-mods.md` and `mods/07-events-and-reactivity.md`;
  - `25-types-and-relationships.md`: lifecycle-key warnings.
- **ADRs:**
  - a new ADR for the shared rule core: providers, one runner per path, claims, fixed point, one write. Write it when slice S2 is built (`docs/adr/README.md:102`);
  - an ADR 0029 amendment: an automatic writer on save extends the "Trigger window" (validation-08 confirmed);
  - an ADR 0019 amendment: the new `.kokobrain` file.
- **`docs/agents/indexing-watcher-rules.md` rule 6:** one sentence for the create-transform registry and the `previous` argument.
- **`CONTEXT.md`:** the terms in Section 1, through `/grill-with-docs`.

## 12. Test strategy

The rules: real stores; never mock `.logic.ts` or stores. Mock only Tauri (`@tauri-apps/plugin-fs`, `call`) and DOM services. Every suite covers the happy path, empty or null input, and errors. Every computed getter is tested. For each test, ask whether it could pass while the problem is still there.

- **Pure logic** (`src/tests/lib/features/note-rules/`):
  - `rule-match`: cache hit, `NaN` truthiness, throw goes to `onError`, the strong validator, unknown-identifier warning.
  - `property-plan`:
    - fill and set per type;
    - canonical keys (`organized` -> `_organized`);
    - `0` and `false` populated;
    - `[""]` populated;
    - inline `#tag` does not make `tags` "present";
    - claims across rules and across providers;
    - progressive conditions;
    - fixed point reached;
    - period-2 cycle aborts with no plan;
    - cap reached;
    - deny-list;
    - `hasEffect` false on a non-canonical but equal block.
  - `rule-gates`: Markdown only, `---\n---` skipped, missing closing fence skipped, lossy skipped, no frontmatter allowed, templates folder read from settings (validation-05 R7), type definitions excluded.
  - `rule-config`: `null` entries, unknown kinds, a version above the supported one.
- **Runner and service tests.** They use the real `editor.hooks` registry, the real `updateNoteFrontmatter`, the real `applyPathChange` with a stub `diskOp`, the real `openOrCreateNote` with `call('create_note')` captured, an in-memory fs mock, and fake timers. Today's Auto Move service test mocks `editor.hooks`, `fs.service` and `file-icons.service`, so the write-to-after-save chain is untested (validation-01 confirmed). These tests must not do that.

  Cases:
  - save, then exactly one write, then the echo is skipped: assert the file bytes and a write count of 1;
  - user save queued behind the engine write still runs;
  - rename during the debounce re-keys and evaluates the new path;
  - own move does not schedule a second run;
  - move then write lands at the new path;
  - the switch turned off cancels a pending run;
  - a create transform error still creates the note;
  - property change detected only on frontmatter diffs, and body `#tag` typing is not one.
- **Auto Move parity.** Add the Section 5.3 regression tests to `auto-move.service.test.ts` first, run them green against today's code, then refactor. Tests that relied on the mocked hook are adapted, never deleted. Lifecycle generation tests stay as they are.
- **Lifecycle test.** Registration in `initializeVault` and teardown in `teardownVault` are pinned, because a missed registration is silent (ADR-0003, indexing rule 6).
- **Components.** `PropertyRuleRow` and `PropertyActionRow` mounted with the real store (pattern: `AutoMoveRuleRow.test.ts`, jsdom, `ResizeObserver` polyfill).
- **E2E (one happy path, `bash scripts/e2e.sh`).** Enable Property Rules, add a rule, edit a note, and assert the property shown in the Properties panel and the frontmatter text.
- **Architecture.** Commit the `featurePairs` diff; `layer-rules`, `pure-logic` and `raw-write-ratchet` stay green; extend `examples-scoping`.

## 13. Slice plan

Each slice is one Issue under `.scratch/frontmatter-rules/issues/`.

| # | Slice | Ships on its own | Blocked by | Blocks |
|---|---|---|---|---|
| S0 | **Auto Move regression pins** (tests only): the Section 5.3 behaviors against today's code | yes | none | S1 |
| S1 | **Auto Move runs on the shared runner.** `note-rules` core (provider registry, scheduler, per-path queue, after-save hook, path-change re-keying and cancel only, gates, shared config service with broken-file backup). Auto Move becomes a provider; `toggleAutoMoveHook` and its timers are removed. Deliberate behavior changes: Markdown only (closes 054), real stats, re-read at fire time, timers follow renames, the switch cancels pending runs, corrupt-file backup (covers 031). | yes; no new writes | S0 | S2 |
| S2 | **Planner and one write per run.** Claims, fixed point, `hasEffect`, own-write guard. Auto Move's icon runs through it with parity (`set`, colors removed only on unclaimed keys). Fixes the stale-content toast (validation-03 Missed 9). | yes; same writes as today, fewer of them | S1 | S3 |
| S3 | **Property Rules feature, save trigger.** Types, store, normalizer, `.kokobrain/property-rules.json`, provider, Settings section and rows, docs page, ADR, E2E. | yes | S2, **001** | S4, S5, S6, S7 |
| S4 | **Create trigger.** Core create-transform registry in both creators. | yes | S3 (not 001) | none |
| S5 | **Property-change trigger.** The `previous` argument on `AfterSaveObserver`, canonical frontmatter diff, short delay. | yes | S3, **001**, **105 skip flag** | none |
| S6 | **Move and rename triggers.** Path-change runs, own-move mark, folder children with a cap, Auto Move opt-in per Issue 02. | yes | S3, **001** | none |
| S7 | **Shared Settings pieces adopted by Auto Move.** `RuleExpressionField` (strong validator, derived error), `RuleRowHeader`. | yes | S3 | none |
| later | "Apply rules to existing notes" with a preview; watcher coverage; "add if absent" for lists; computed values | separate Issues | owner | none |

Existing Issues to re-scope:

- `auto-move-default-properties/01` is superseded by S3; hold it from relay runs until the owner decides.
- `02` becomes S6.
- `open-itens/054` is closed by S1.
- `031` is covered by S1.
- `005` and `022` are not blockers, because of the run's step 3 gate.

## 14. Real weaknesses of Design B

1. **Upfront refactor of working code with no user value.** S0 to S2 rewire Auto Move (observer, timers, icon path) before anything new ships. That is the riskiest class of change in CLAUDE.md ("Removing or Refactoring Code"). The mitigation is S0, but the cost is real and front-loaded.
2. **"Separate feature" is a thin separation.** Correctness forces a shared scheduler, per-path queue, planner and claim order (Section 0). What stays separate is config, store, UI, switch and selection policy. A skeptic can fairly say that this is Design A (extend Auto Move) with a second settings screen, and the user does see two places to define rules about notes.
3. **Cross-provider precedence is a hidden rule.** Property Rules claim before Auto Move's icon. It is documented, but it is not visible in either list.
4. **Duplicated user-facing knobs:** two excluded-folder lists and two switches. Sharing the exclusions in the core is possible, but it bends Auto Move's "never moved" copy.
5. **Auto Move timing changes.** After a frontmatter edit, moves happen after the short delay instead of about 3.5 s, because runs are shared (Section 4.5). A move of the open note mid-edit is more abrupt. The alternative, per-provider delays in one runner, reintroduces two runs per save and loses cross-provider claims in the same pass.
6. **Two core API changes**: the `previous` argument and the create-transform registry. They are small and additive, but they are core, and the owner has refused core changes for corner cases before. Neither is a corner case here, and the choice is still the owner's.
7. **A provider abstraction sized for two consumers,** and shaped by Auto Move's quirks (first match, generated lifecycle rules, legacy icon removal). If Auto Move were ever folded into Property Rules (moves as an action), the abstraction would have been a detour.
8. **More registry and test touch points** than extending Auto Move: a settings section, a config file, a ratchet entry and an examples test.

## 15. Questions only the owner can answer

1. Accept the shared runtime (one runner, one write per run), knowing that it makes "separate feature" mean separate data, UI and switch only?
2. Re-scope Issue 01 into Property Rules, and hold it from relay runs until then?
3. Legacy Auto Move icon: keep "removes `_color` and `_title_color` when the rule has none" (parity), or drop the removal so that nothing is ever reverted?
4. Where does the delay after a body save live: the core (`noteRules.saveDelayMs`, migrated from `autoMove.debounceMs`) or Auto Move? Is a short shared delay after property changes acceptable for Auto Move moves?
5. One shared excluded-folder list or one per feature? And is the default exclusion set right: `_system/`, `.kokobrain/`, the templates folder from settings, type definitions, non-Markdown?
6. Action values: typed literals only in v1, or computed values (dates, `file.basename`)?
7. Lists under "Always": replace, or also offer "add if absent"?
8. Key policy: hard block or warning for `set` on `_type`, `_organized`, `_archived`, `_favorite` and the calendar keys? `todoist_project` is always blocked.
9. Create: are mod and Todoist creates (not covered by the transform) fine to pick up rules only at their first save? Should duplicates and restores count?
10. Move and rename: count calendar, Todoist and mod renames? Should Auto Move rules accept move and rename (Issue 02)? What cap applies to folder moves?
11. Runtime rule errors: Sentry once per rule per session, or the local log only?
12. Do you accept one File History snapshot per rule write, and the first write canonicalizing a hand-written YAML block?
13. Should runs skip the closed-note window against Todoist `write_task_lines`, or should a shared per-path chain go inside `updateNoteFrontmatter` (a core change)?

## 16. Not verified by this designer

- The runner, claims and fixed-point behavior are a design. Nothing was prototyped or run.
- The `previous` argument assumes `writeTab` still holds `tab.savedContent` before `markSavedByPath` (scout-06 2.1). I did not re-read `editor.service.ts:187-196`.
- I did not re-verify that the file tree reflects a folder move by the time a deferred path-change run fires (scout-08 4.2.2). The children enumeration depends on it.
- Whether icons follow a rename without a write (validation-07 Missed 10) is still a lead. S6 should check it.
