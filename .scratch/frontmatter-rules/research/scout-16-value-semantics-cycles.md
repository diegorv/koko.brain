# Scout 16: value semantics, multi-rule behavior, idempotence and cycles

Area: what "missing", "set" and "append" mean for each property value type the app supports, how several matching rules combine, and how a rule set can loop. Every claim about current behavior cites `path:line` read in this session. Items I could not verify are in "Not verified".

## 1. Findings that change the design (read this first)

1. **A fill-only ruleset cannot loop; an always-set ruleset can.** Fill-only is monotone (a key goes from missing to populated and is never touched again), so the number of writes per note is bounded by the number of distinct keys the rules write. Cycles need an always-set action (or a remove-key action) whose condition reads a key that an action writes. Section 5.
2. **Today's termination relies entirely on idempotence of the write, not on any loop guard.** Auto Move has no guard: the after-save observer only debounces per path (`auto-move.service.ts:96-126`, default 3000 ms, `settings.store.svelte.ts:111-113`), and its icon write goes through `updateNoteFrontmatter`, which calls `notifyAfterSave` (`frontmatter-write.service.ts:155`), which re-triggers the same observer. The loop ends only because the second write is byte-identical and `updateNoteFrontmatter` returns early (`frontmatter-write.service.ts:122-123`, `if (next === base) return base`) and `writeTab` skips a non-dirty tab (`editor.service.ts:189`). Any new action with a non-idempotent value (a timestamp, a counter, a value that differs from what the parser reads back) turns this into an unbounded write/save/index/search/history loop at one iteration per debounce.
3. **"Missing" must be decided on the parsed frontmatter `Property[]`, never on `PropertyIndexRecord.properties`.** The record is a projection that rewrites and invents keys (section 2.3). A check against the record gives wrong answers for `tags`, `organized`, `archived`, `favorite`, `_type` and the relationship keys.
4. **"Match" and "act" are different questions, and the engine only answers the first.** Condition truthiness (`toTruthy`, `evaluator.ts:632`) treats `0`, `false` and `''` as false; the "missing" definition (`isEmptyPropertyValue`, `properties.logic.ts:464`) treats only `''`, null, absent and `[]` as empty. `0` and `false` are populated values for fill-only.
5. **Recommendation on multi-rule: split the two behaviors.** Move keeps first-match-wins (one destination). Property actions run all-match, in list order, one pass, with a per-key "claim on match" rule (section 4.3). This removes the shadowing problem Issue 01 patches with its "property-only rule only counts when it has something to do" rule (`.scratch/auto-move-default-properties/issues/01-...md`, Behavior 5).
6. **Recommendation on loops: three layers, all cheap.** (a) Evaluate to an in-memory fixed point and write once. (b) Skip the re-evaluation that the engine's own write triggers, by remembering the exact bytes it wrote per path. (c) A hard pass cap plus a visited-state check that aborts without writing and logs once. Section 5.4.

## 2. Value types and what "missing" means today

### 2.1 Property model

`Property.value` is `string | number | boolean | string[]`, `type` is `'text' | 'list' | 'number' | 'date' | 'boolean'` (`properties.types.ts`, whole file). `date` is only a read-side label: `convertToProperty` assigns it when a string matches `ISO_DATE_REGEX` (`properties.logic.ts:40`, `:198-200`). The serializer never writes a date type; a `date` property is a plain string scalar (`serializeProperties`, `:603-625`). So there is no distinct "date value" to set, only a string of the right shape.

### 2.2 Missing, per shape (parse side, `convertToProperty` `properties.logic.ts:173-204`)

| YAML in the note | Parsed `Property` | Empty per `isEmptyPropertyValue` (`:464-468`) | Notes |
|---|---|---|---|
| key not present | no entry | n/a (absent) | expression reads `null` (`resolveIdentifier`, `evaluator.ts:143-151`, `?? null`) |
| `key:` / `key: null` / `key: ~` | `{ value: '', type: 'text' }` (`:194-196`) | yes | ADR 0029 "Empty values": serializer rewrites as `key: ""`. Absent and null-valued are distinct in the YAML but both read as missing for fill. Only an absent key satisfies `x == null`; a `key:` note reads `''`, and `'' == null` is false (`looseEqual`, `evaluator.ts:688-705`, JS `==`). |
| `key: ""` | `''` | yes | |
| `key: "~"` | `'~'` | no | quoted tilde is a string (ADR 0029 quoting table) |
| `key: []` | `[]`, type list | yes | |
| `key: [""]` or `[null]` | `['']` | **no** | list items map null to `''` (`:178`); length is 1, so `isEmptyPropertyValue` is false. An edge, but a list holding one blank item counts as populated. |
| `key: " "` | `' '` | no | whitespace is data |
| `key: 0`, `key: false` | number / boolean | no | populated for fill; falsy for a condition (`toTruthy`, `:632-636`) |
| nested mapping value | **dropped from the array** (`:286-296`, logged) | n/a | the key looks absent although it exists in the YAML. Safe only because `detectLossyFrontmatter` returns `nested` for it (`:431-434`) and `updateNoteFrontmatter` refuses (`frontmatter-write.service.ts:117-118`). A fill action must never reach the write without that refusal. |
| alias twin (`icon:` and `_icon:`) | collapsed to one canonical entry, populated beats empty, two populated keep the first and log (`dedupeCanonicalKeys`, `:481-503`) | per canonical key | two populated twins is `alias-collision`, lossy, refused (`:444-458`). One populated plus one empty twin is not lossy and the write collapses them to the canonical key. |

The same definition of "empty" exists in four places: `isEmptyPropertyValue` (`properties.logic.ts:464`, not exported), `isEmptyYamlNode` (`:390`, not exported), the evaluator's plain `isEmpty(x)` (`evaluator.ts:400-405`) and the `any.isEmpty` method (`methods.logic.ts:206-210`). They agree (null, undefined, `''`, `[]`). A rule engine should reuse one of them rather than add a fifth; `isEmptyPropertyValue` is the one that sees the parsed frontmatter, so it would need exporting.

### 2.3 Why the record cannot decide "missing"

`buildNoteRecord` copies the parsed properties, then `projectDerivedProperties` (`collection.logic.ts:53-77`, private) changes them:

- `_type` is re-cased (`:56-59`): frontmatter `person` reads as `Person` in the record. Equality against `_type` is case-insensitive for literals (`evaluator.ts` `isTypeIdentifier` path in `evaluateBinary`).
- `organized`, `archived`, `favorite` are **always set** on the record, defaulting to `true` / `false` / `false` (`:63-65`, `boolFlag` `:101-108`). The canonical `_organized` key stays absent when the note has none. "Fill `_organized` if missing" must test the frontmatter key `_organized`, not the bare `organized`.
- `tags` is always set to the merged frontmatter plus inline `#tags` (`:69`). A note with an empty or absent `tags:` key but a `#tag` in the body has a non-empty `tags` in the record.
- `_belongs_to`, `_related_to`, `_has_many` become target arrays with alias and heading stripped, only when at least one target is found (`:73-76`). The frontmatter may hold `"[[AWS|x]]"` as a string.

Consequences: (1) fill/append decisions and dedupe of wikilinks must read `parseFrontmatterProperties(content)`; (2) a progressive in-memory evaluation must not patch the record's `Map` after an action, because `organized`, `tags` and the relationship arrays would go stale (setting `_archived: true` would leave `archived` false). Rebuild with `buildNoteRecord(path, rebuildContent(...))` per step instead (the parse is LRU-cached, `properties.logic.ts:223-241`, capacity 16).

### 2.4 Key aliases: two different alias tables

- Frontmatter keys are canonicalized on parse and on serialize through `ALIAS_MAP` (`utils/frontmatter-aliases.ts:6-23`, `canonicalizeKey`): `type`, `organized`, `archived`, `favorite`, `order`, `favorite_index`, `sort`, `icon`, `sidebar_label`, `sidebar label`, `color`, `title_color`, `template`, `view`, `visible`, `list_properties_display`.
- Expression identifiers alias **only `type` -> `_type`** (`IDENTIFIER_ALIASES`, `evaluator.ts:93-95`). A condition `isEmpty(icon)` reads the key `icon`, which no record ever holds (the parser stored `_icon`), so it is always true. Same for `color`, `order`, `sort`, `view`, `template`, `visible`. `favorite`, `organized`, `archived` work only because the projection adds those bare keys (`collection.logic.ts:63-65`). Rule authors must write `_icon`, `_color`, `_title_color` in conditions. This is a documentation and validation point, and a reason for the action side to canonicalize the key itself (Issue 01 Behavior 4 already says so).

## 3. What "set" means per value type (write side)

Write path facts a design must respect:

- Every write is a full re-serialize of the block through `serializeProperties` (`properties.logic.ts:603-625`) via `updateNoteFrontmatter` (`frontmatter-write.service.ts:99-158`): keys canonicalized and deduped, key order = array order (an appended key lands at the end), lists always flow style (`serializeProperties` `:610-614`, ADR 0029 "Lists"), strings quoted by the ADR 0029 table.
- A string is quoted when a plain scalar would read back as another type: `"42"`, `"true"`, `"[[AWS]]"` (ADR 0029 quoting table; `properties.logic.test.ts:655` pins `[[Foo-Bar]]`). So `type: 'text'` with value `"42"` writes a **string**; to write a YAML number or boolean the property must carry a `number` or `boolean` value (`setPropertyByBindTarget`, `properties.logic.ts:651-665`, does this for typeof number/boolean). Issue 01 Behavior 3 ("Values are written as text properties") is correct for the fill-relationship case but means a rule cannot write `priority: 1` or `done: true` as such. An action value model that is only a string is a decision, not a default.
- List items are coerced to strings (ADR 0029 "Lists"; `convertToProperty` `:175-184`). A list of numbers round-trips as strings.
- A number or boolean whose value is unchanged keeps its original spelling (`serializeProperties` `originalRaw`, `:616-618`); a changed one is canonical.
- `mutate` passed to `updateNoteFrontmatter` must be pure and can run twice (`frontmatter-write.service.ts:95-97`, `:145-147`), and concurrent calls on one closed note race, so writes must be serialized per path (`:95-98`).
- A no-op `mutate` does not guarantee no write. `next` is rebuilt from the parsed properties (`:121`) and compared to `base` (`:122`). If the block is not already in canonical form (alias key such as `color:`, a bare `key:`, single quotes, different spacing) the rebuild differs from `base` and the note is rewritten even when the rule changed nothing. This is an inference from `rebuildContent` canonicalizing everything; I did not run it. Consequence: a rule that has nothing to do must be skipped **before** calling `updateNoteFrontmatter`, which is also what Issue 01 Behavior 5 requires. Never rely on the `next === base` early return to avoid touching a note.

### 3.1 Per type: fill-only vs always-set

| Type | Fill only if missing | Always set | Hazards |
|---|---|---|---|
| text | write when absent or empty | overwrite | Always-set removes the user's ability to edit the field by hand: the Properties panel commits every keystroke through a 500 ms autosave (`properties.service.ts:83-109`, `docs/agents/indexing-watcher-rules.md` item 7), then the after-save hook re-evaluates after the debounce. The user's edit is overwritten after about 3 s. Also, a user who clears a filled default (empty string) gets it refilled, because empty counts as missing (Issue 01 Behavior 4). That is intended for fill, but state it in the UI. |
| number, boolean | same, value typed | same | value must be typed, see above. Condition `x` is false for `0` and `false`; use `isEmpty(x)` or `x == null`. |
| date (string) | same | same | Value must be a string of shape `YYYY-MM-DD` (or with time) to read back as `date` (`ISO_DATE_REGEX`, `properties.logic.ts:40`). Dynamic values: a coarse one (`today`, day precision) is idempotent within a day; a value with a time component, or anything derived from `now()` or `file.mtime`, changes on every evaluation and **never reaches a fixed point under always-set** (each write bumps mtime and re-triggers). Under fill-only a dynamic value is harmless (written once). The evaluator's `now()` and `today()` return `Date` (`evaluator.ts` `evaluateCall`), so an expression-valued action needs an explicit Date-to-string rule; `resolveDestination` templates already use `{year}`/`{month}` from `new Date()` (`auto-move.logic.ts:117-126`). |
| list | write the whole list when absent or empty (`[]`) | see 3.2 | A populated list that lacks the rule's item is **not** missing; fill leaves it alone. That is usually surprising for `tags` or `_related_to`. |
| wikilink (string or list holding `"[[X]]"`) | as text/list | see 3.3 | Must be authored as a string `"[[X]]"`. Unquoted `[[X]]` in YAML parses to a nested list, which `foldUnquotedWikilinks` folds back on read (`properties.logic.ts:113-167`), and the serializer always writes it quoted. A rule config is JSON (`auto-move.service.ts:55-59`), so the string is unambiguous. |

### 3.2 Always-set on a list: replace vs append

There are two different intents and the app already has helpers for both:

- **Replace**: `doc.set(key, flow seq)` with the rule's items (`serializeProperties` `:610-614`). Destroys user-curated entries. Idempotent. Order is the rule's order, so an unordered "same set" comparison would still rewrite; compare serialized bytes (as `updateNoteFrontmatter` does) or compare as ordered lists.
- **Ensure-contains (append if absent)**: `ensureFrontmatterLink` (`properties.logic.ts:519-548`, used by `one-on-one.service.ts:96` and `note-action-bar.service.ts:79`) is exactly this for a wikilink. It treats a link as present when the target stem matches case-insensitively, ignoring folder prefix, `.md`, `|alias`, `#heading` (`:536-538`), returns `content` unchanged when present (`:538`), and when the existing value is a plain non-link string it keeps it next to the link in a list (`:541-543`). `computeAddRelationshipValue` (`:779-795`) does the append: undefined gives the bare link, an array gets the link pushed, a string containing `[[` becomes `[existing, link]`, a plain string is **replaced** by the link (`:794`, a silent loss that `ensureFrontmatterLink` works around with `keepsPlain`). A rules engine that offers "append" should reuse `ensureFrontmatterLink`'s dedupe test, not `computeAddRelationshipValue` alone.
- Neither helper removes anything, so "append" is monotone and cannot oscillate with itself. Replace is not monotone.

Recommendation: per-action modes are the owner's two (fill if missing, always set). For lists and relationship keys, "always set" is dangerous as replace. Either name the list variant explicitly (`replace` vs `add if absent`) or restrict always-set to scalars in v1. This is an open question (section 8).

### 3.3 Wikilinks and renames

An always-set wikilink value fights the rename link-updater: `replaceWikilinks` rewrites wikilinks in note content on rename (`link-updater.logic.ts:86`, applied over the whole `content`; I found no frontmatter exclusion by grep but did not read the function body). After renaming target `AWS` to `Amazon`, notes carrying `_belongs_to: "[[Amazon]]"` would be rewritten back to `[[AWS]]` by an always-set rule on the next save. Fill-only does not do this (the key is populated). The updater writes with `writeTextFile` + `applyNoteChange`, not `notifyAfterSave` (`link-updater.service.ts:58`, `:71`), so the rewrite itself does not trigger rule evaluation; the fight appears at the next user save. Wikilink values are the strongest argument for fill-only as the default mode.

### 3.4 Removing a key

No current feature removes a key from a rule. The icon writer does remove: `setFrontmatterIcon` with no color calls `removeProperty` for `_color` and `_title_color` (`frontmatter-icon.service.ts:26-31`, `:57-66`), so Auto Move's icon is today "always set, replace the three icon keys as a unit", and a rule icon without a color clears a manually chosen color on every matching save (`auto-move.service.ts:200-214`). Two consequences for the new feature: (1) icon, color and title color should be three independent actions with their own mode, not a triple; (2) the owner said nothing is reverted when a rule stops matching, so a remove action only makes sense as an explicit action, and it is the one action that, combined with fill, can ping-pong (rule A fills `x` when missing, rule B removes `x` when `y`): within one in-memory pass the result is order-dependent, across saves it flips if the passes are not merged. I recommend leaving remove-key out of v1.

## 4. Multiple matching rules

### 4.1 Current behavior

`findMatchingRule` returns the first enabled rule whose expression is truthy; a throwing rule is reported and skipped (`auto-move.logic.ts:17-35`). The service builds `[...userRules, ...lifecycleRules]` (`auto-move.service.ts:156-157`), so user rules shadow the generated archive/unarchive rules (`type-lifecycle-rules.ts:26-59`). First-match-wins is right for a move (one destination) and is the reason Issue 01 needs Behavior 5.

### 4.2 Options for property actions

| Option | Behavior | Verdict |
|---|---|---|
| A. First match only (as Auto Move) | One rule acts per save | Wrong for properties: one note often deserves several independent defaults (folder default plus type default). Forces Issue 01's fall-through hack. |
| B. All match, list order, last writer wins per key | Later rule overrides earlier | Terminates, but top of the list has the lowest priority for conflicts. Opposite to Auto Move's "top wins". |
| C. All match, list order, **first claimant wins per key** | Each matching rule claims its keys; a later rule skips a claimed key | Consistent with "top wins". Needs the claim definition below. Recommended. |

### 4.3 Claim definition (this is the subtle part)

Claim a key **when the rule matches** (and the action is applicable to the key), not when it actually writes.

Counter-example showing why claim-on-write breaks idempotence: rule A `always x=1`, rule B `always x=2`, both conditions true.
- Pass 1: A writes 1 and claims x; B skipped. Result x=1.
- Evaluation 2 (re-triggered by the write): A finds x already 1, writes nothing, so claims nothing; B now writes 2.
- Evaluation 3: A writes 1. Infinite ping-pong, one write per debounce.

With claim-on-match, evaluation 2 has A match and claim x (no-op), B skipped, fixed point. Corollary: a matching fill-only rule above an always-set rule for the same key shadows it while the key is populated. That is the priority reading of list order and should be shown in the UI ("overridden by rule N").

Under option B (last wins) the same pair also reaches a fixed point (x=2 each pass), provided all matching rules run in one pass on one working copy. So both B and C are safe if and only if the whole ordered pass is applied to one working copy and written once. They are not safe if each rule writes separately: the A-write/B-write pair re-triggers evaluation between them.

### 4.4 Condition visibility: snapshot or progressive

Do later rules' conditions see earlier rules' output in the same pass?

- **Snapshot** (all conditions on the pre-pass record): simple, order of rules affects only conflicts, but chains (rule B conditioned on what A sets) need a second pass.
- **Progressive** (each rule sees the working copy, rebuilt through `buildNoteRecord`): behaves like a script, no second pass for ordered chains, but results depend on order and a fixed-point iteration is still wanted for unordered chains.

Issue 01 Behavior 6 chooses "chaining happens through the save": the write's `notifyAfterSave` re-evaluates after the debounce and the move rule sees the new property. That costs a disk write, an index update, a file-history snapshot, a search update and a mods-host callback per hop (all registered through `addAfterSaveObserver`: `file-history.service.ts:192`, `search.service.ts:303`, `sync-scheduler.service.ts:90`, `mods-host.service.ts:559`), 3 s apart. An in-memory iteration to a fixed point does the same chaining with one write. Recommendation: iterate passes progressively until a pass changes nothing, cap and cycle-check (section 5.4).

### 4.5 Move rules in the same engine

If one rule type carries both a destination and property actions, evaluate in this order: (1) property pass to a fixed point in memory, (2) pick the first matching rule that has a destination against the final state, (3) move, (4) write the final props at the new path (Issue 01 Behavior 2: write after the move, so the write's after-save is not scheduled for a path that no longer exists). A move does not call `notifyAfterSave`: `moveItem` goes through `applyPathChange` (`fs.service.ts:307-327`, no `notifyAfterSave` in the body). So a move alone never re-triggers rules; only the property write does.

## 5. Idempotence, oscillation and loop control

### 5.1 What terminates today

Chain: evaluate -> `setIconForPath` -> `setFrontmatterIcon` -> `updateNoteFrontmatter`. If bytes change, tab path: `syncExternalContentToEditor` then `saveFileByPath` then `writeTab` writes and calls `notifyAfterSave` (`frontmatter-write.service.ts:125-135`, `editor.service.ts:187-196`); closed path: `writeTextFile` then `notifyAfterSave` (`:150-155`). `notifyAfterSave` runs the observer, which debounces and evaluates again (`auto-move.service.ts:96-126`). The second evaluation reproduces the same bytes, `next === base`, nothing is written, the chain ends. The observer has no "was this my own write" check and no counter.

Note the observer gets the saved `content` and evaluates against a stale snapshot if the user kept typing during the debounce window: `evaluateAndMove` builds the record from the `content` captured at save time (`auto-move.service.ts:119`, `:154`) while `updateNoteFrontmatter` mutates the live tab content (`frontmatter-write.service.ts:107-121`). For fill-only, re-check "missing" inside `mutate` against the fresh props so a key the user just typed is not overwritten. For always-set, the condition was decided on stale content; accept it or re-read the tab content and re-evaluate before writing.

### 5.2 Cycle taxonomy

| Case | Example | Loops? |
|---|---|---|
| Fill-only, any conditions | A: `isEmpty(x)` fill `y`; B: `isEmpty(y)` fill `x` | No. Each write populates a key, writes are bounded by distinct keys. Both fill each other from nothing: first pass fills both (or only the first, in a snapshot pass), then nothing is missing. |
| Always-set, conditions independent of written keys | A: folder rule sets `x=1` | No. Fixed after one write. |
| Always-set, same key, two matching rules | A `x=1`, B `x=2` | No in one ordered pass written once (4.3). Yes if each rule writes separately, or claim-on-write. |
| Always-set, condition reads the key it writes | `status == "open"` sets `status = "closed"` and `status == "closed"` sets `status = "open"` | Yes, period 2. Snapshot passes: closed, open, closed across saves. Progressive single pass: A then B returns to `open` and nothing is written, which is a silent no-op, not a loop. |
| Cross-key always-set | A: `y == "a"` sets `x = "b"`; B: `x == "b"` sets `y = "c"`; C: `y == "c"` sets `x = "a"` | Converges (y=c, x=a stops all three). A reciprocal pair "when y then x, when x then y" with different values has no fixed point. |
| Self-negating action | condition `isEmpty(x)` with always-set `x` | Converges (x populated, condition false). Not a loop, but note that the rule stops matching and nothing is reverted (owner decision). |
| Non-idempotent value | timestamp, `now()`, counter, `file.mtime` under always-set | Yes: every write changes the value the next evaluation writes. |
| Writer outside the engine | a mod save hook (`mods-host.service.ts:559`) or another feature that rewrites the same key | Yes, and the engine cannot see it. Out of scope to detect; log-only. |
| Auto Move move chains | rule A moves to X, rule B moves back | Not via save (moves fire no after-save). Issue 02 (evaluate on move) would introduce it; its triage question already names it (`.scratch/auto-move-default-properties/issues/02-...md`). |

Cost of an unbounded loop: each iteration writes the file, runs `applyNoteChange`, the file-history snapshot, the search update and every mod save hook (observer list above). `autoMove.enabled` defaults to false (`settings.store.svelte.ts:111`), which limits blast radius only for users who never turned it on.

### 5.3 Static detection: partial and advisory only

Conflicts are undecidable in general (arbitrary expressions, formulas, `file.properties`). A cheap lint is possible because the engine exposes the AST: `parse` returns an `ASTNode` and `validateExpression` already walks it for unknown functions (`evaluator.ts` `findUnknownFunction`, `validateExpression`). A walk collecting identifiers and `note.`/`property.` member names gives the keys a condition reads; compare with the keys the rule's actions write. Report: (1) rule reads and always-sets the same key, (2) two rules always-set the same key, (3) fill and always-set on one key. Reading through `file.properties`, formulas or dotted fallbacks (`resolveMember` fallback, `evaluator.ts:157-190`) escapes the lint. Treat the lint as a hint in the settings UI, not as the safety mechanism.

### 5.4 Recommended runtime guard (three layers)

1. **In-memory fixed point, single write.** Per trigger, per path: working props = parsed frontmatter; repeat { for each enabled rule in order, evaluate the condition on `buildNoteRecord(path, rebuildContent(working))`, apply actions subject to claims } until a pass changes nothing. Then one `updateNoteFrontmatter` with a pure `mutate` that sets the final computed values (re-checking fill-only keys against fresh props). Reuses the existing write path unchanged. The cap can follow the evaluator's precedent, `MAX_FORMULA_DEPTH = 10` (`evaluator.ts:18`, throws "Circular formula reference detected" at `:166`-style depth check in `evaluateFormula`).
2. **Visited-state check.** Keep the set of serialized working states per trigger. A repeat that is not the previous state, or reaching the cap, is a cycle: write nothing, log once with `error('AUTO-MOVE', ...)` naming the path and the rules that changed state in the repeating segment (matches Issue 01 Behavior 7: logged, not toasted per autosave). Writing nothing keeps the note in its last user-authored state; nothing is "reverted" because nothing was written.
3. **Do not re-evaluate the engine's own bytes.** Remember `lastEngineWrite: Map<path, string>` (the `next` returned by `updateNoteFrontmatter`, `frontmatter-write.service.ts:99-104`). In the observer, skip when `content === lastEngineWrite.get(path)`, and clear the entry on any other content. This is exact (a user edit changes the bytes) and needs no new hook argument: the observer already receives `content` (`editor.hooks.ts` `AfterSaveObserver`). With layer 1, chaining no longer needs the write-triggered re-evaluation, so skipping it is safe. This also makes the engine's termination independent of byte-level idempotence of every action.

I am not proposing a per-path write counter or a rate limiter: layers 1 to 3 already bound a bad ruleset to one aborted evaluation per user edit, and extra machinery would be speculative.

## 6. Constraints a design must respect (checklist)

- Canonicalize action keys with `canonicalizeKey` before the missing check and the write (`utils/frontmatter-aliases.ts`).
- Decide "missing" on `parseFrontmatterProperties` output, using the shared empty definition (`isEmptyPropertyValue`, export it or reuse the evaluator's `isEmpty`).
- Refuse on lossy frontmatter, never toast per autosave (`detectLossyFrontmatter`, `properties.logic.ts:405-461`; `auto-move.service.ts:203-206` already skips quietly).
- Skip a rule with nothing to do before calling `updateNoteFrontmatter` (section 3).
- Serialize writes per path (`frontmatter-write.service.ts:95-98`); the Auto Move debounce is per path already (`debounceTimers`, `auto-move.service.ts:22`).
- Action values: decide whether they are strings only, or typed (number, boolean, list). Typed values are required to write non-string YAML; lists are flow-style string lists.
- Dynamic values (dates, `now()`) only with fill-only, or with day precision.
- Do not mutate `record.properties` between steps; rebuild the record (section 2.3).
- Wikilink values: always the string `"[[X]]"`; fill-only by default; dedupe by `ensureFrontmatterLink`'s stem test.
- The caret blocker (`.scratch/open-itens/issues/001-...md`) applies to every write on the active note; a single write per trigger (layer 1) halves the exposure compared with write-per-hop chaining.

## 7. Not verified

- Whether a no-op `mutate` on a non-canonical block really rewrites the note (inferred from `attempt` lines 121-123 and `rebuildContent`; no test run, per the rules of this task).
- Whether `replaceWikilinks` rewrites links inside frontmatter values (grep found no frontmatter handling; body not read).
- That `moveItem`/`applyPathChange` never calls `notifyAfterSave` anywhere below the code I read (`fs.service.ts:307-327` calls only `applyPathChange`; I did not read `path-change.service.ts` in full).
- Line numbers for `evaluateFormula`'s depth check: cited as the `MAX_FORMULA_DEPTH` precedent at `evaluator.ts:18`, the throw site is in `evaluateFormula` (read, not line-numbered).
- Behavior of the Rust projection for the same keys beyond what the TS mirror comment states (`collection.logic.ts:45-52`); not read.
- Yaml behavior for date-shaped strings beyond ADR 0029's claim that ISO strings stay bare.

## 8. Questions only the owner can answer

1. **Priority on a shared key.** When two matching rules write the same key, should the top rule win (recommended, claim-on-match) or the bottom rule (script semantics, last wins)? And should a matching fill-only rule above an always-set rule shadow it while the key is populated?
2. **Lists and relationship keys under "always set".** Replace the whole list, or only ensure the item is present? Offer both under different names, or restrict always-set to scalars in v1?
3. **Value types.** Is a string-only action value acceptable (Issue 01's model), or must a rule write numbers and booleans as YAML numbers and booleans?
4. **Dynamic values.** Should actions support computed values (today's date, `file.basename`, an expression result)? If yes, restricted to fill-only or day precision under always-set?
5. **Remove key.** Confirm it stays out of v1.
6. **Cycle outcome.** On a detected cycle: write nothing and log once (recommended), or write the first pass result and log? Should the Settings UI also show a visible warning on the offending rules?
7. **Chaining model.** Is "in-memory fixed point, one write" acceptable instead of Issue 01 Behavior 6 ("chaining happens through the save")? It changes the spec of Issue 01 (Behavior 5 and 6 and their acceptance test "property-only rule then move rule").
8. **Always-set vs hand edits.** Is it acceptable that an always-set property cannot be edited by hand on a matching note (overwritten about 3 s after the save)?
