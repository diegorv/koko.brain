# Scout review: Issue 07 (property actions: remove and add to list)

Scope: read-only. Code read at main `17892c5ed` (Issues 01, 02, 04 delivered; 03 in progress; 06 not landed). Post-06 names map to today's `auto-move` names: `features/auto-organize/auto-organize.logic.ts` is `src/lib/features/auto-move/auto-move.logic.ts`, and so on. All paths below are today's.

Issue 07 cites no `path:line`. Its code facts are behavior claims about Issue 01's design and about the frontmatter stack. Each is verified below.

## 1. Fact check

| # | Claim in Issue 07 | Verdict | Evidence |
|---|---|---|---|
| 1 | `RuleProperty.mode` is today `'if-missing' \| 'always'`, and `RuleProperty` is the type Issue 07 extends | CONFIRMED | `auto-move.types.ts:14-24` (`mode` at `:23`; `value` is required at `:18`) |
| 2 | "Ownership keeps Issue 01's rule: the first matching rule that names a key owns it for the run" | CONFIRMED | `auto-move.logic.ts:187-196` (`if (!byKey.has(key)) byKey.set(...)`), doc comment `:180-186`. A higher `if-missing` that writes nothing still owns the key |
| 3 | "`todoist_project` stays refused, as in Issue 01" | CONFIRMED | `auto-move.logic.ts:109` (`REFUSED_KEYS`), applied in `sanitizeRuleProperties` at `:166`. Keys are compared canonically (`:165`) |
| 4 | "On load: an `add` entry needs a string or `string[]`, and is dropped otherwise" is implementable at the existing load point | CONFIRMED, but the current loader cannot take it as is | `sanitizeRuleProperties` (`:157-170`) drops any mode other than `if-missing`/`always` at `:163`. It requires `isRulePropertyValue` (`:147-150`) for every entry, which accepts string, number, boolean and `string[]`. So a boolean `add` would pass the value check today, and a `remove` with no `value` is dropped at `:164`. See section 3, item A |
| 5 | "A remove on `_organized`, `_archived` or `_favorite` is allowed" | CONFIRMED as intent, but today's loader would drop it | `:167` drops any boolean-only key whose value is not a boolean. A `remove` entry has no value, so it dies at `:164` first, and at `:167` even if `:164` is relaxed |
| 6 | "Remove on those keys means back to the default: organized, not archived, not a favorite" | CONFIRMED for the index and the Inbox. NUANCE for archive | Defaults: `lifecycle.logic.ts:24-26` (`isOrganized`: only a boolean `false` is not organized), `entry.rs:251-254` (`unwrap_or(true)`), `collection.logic.ts:63-65` and `:101-108` (`boolFlag`: `_organized` falls back to true, `_archived` and `_favorite` to false). Nuance: the generated unarchive rule matches `_archived == false` literally (`type-lifecycle-rules.ts:52`, test `type-lifecycle-rules.test.ts:42`). Evaluator equality is `a == b` (`evaluator.ts:714`), and a missing `_archived` is not `false`. So a rule that removes `_archived` from an archived note does not trigger the type's unarchive move. The note stays in its archive folder and reads as not archived. `always` + `_archived: false` does unarchive. The help text must not promise "back out of the archive" for `remove` |
| 7 | "`remove` deletes the canonical key when the note has it, whatever its value. A note without the key is not written" | CONFIRMED, implementable | `updateNoteFrontmatter` mutates `Property[]` and returns early when `rebuildContent` equals the base (`frontmatter-write.service.ts:128-129`). Parsed keys are already canonical (`properties.logic.ts:297`, `dedupeCanonicalKeys` at `:481-503`), so a filter on the canonical key is exact. Side effect: removing the last property drops the whole block, `rebuildContent` returns the bare body (`properties.logic.ts:689-692`). No `---` remains; this is fine but should be a tested case |
| 8 | "`add`: items compare as exact strings, the existing order is kept" | CONFIRMED, implementable | Parsed list items are always strings (`properties.logic.ts:174-184`; numbers in a list become `'1'`). `deep-link.logic.ts:419-455` (`injectTagsIntoContent`) is a precedent: it merges with `includes`, keeps order. It differs from Issue 07 on a single-string value, which it replaces |
| 9 | "If the key is absent or empty, a new list is created with the items" | CONFIRMED, with an ordering trap | A `key:` or `key: null` parses to `''` text (`properties.logic.ts:194-196`). The emptiness test (`isEmptyPropertyValue`, `:464-468`) must run before the "single string becomes a list" branch, or `tags: ""` becomes `['', 'work']` |
| 10 | "If the current value is a single string, it becomes a list: the old string, then the new items" | CONFIRMED | A scalar parses to `{ type: 'text' \| 'date', value: string }` (`properties.logic.ts:198-203`). A `date`-typed string is also a string and would be listed too |
| 11 | "If the current value is a number, a boolean or a map, nothing is written" | PARTLY WRONG | Number and boolean are readable (`properties.logic.ts:186-192`). A **map is unreachable**: nested mappings are dropped from the parse (`:286-296`), and `detectLossyFrontmatter` returns `nested` for them (`:431-433`). `propertyWriteSkipReason` (`auto-move.logic.ts:263-264`) then skips the whole note with a quiet `debug` (`auto-move.service.ts:311-313`) before any `add` planning. So a map case never reaches the planner; it needs no code and no test, and it does not produce the once-per-rule log |
| 12 | "the skip is logged once per rule per session" | CONFIRMED as a pattern, NO ready mechanism | The only once-per-rule set is `reportedWriteFailures` (`auto-move.service.ts:49`, reset `:350`), used by `reportWriteFailure` (`:326-335`) for failed writes, via `error()`. A skip is detected inside the pure planner, not the service. Needs its own set (sharing would suppress one log with the other) and a way for the planner to return skips. Also `propertiesToWrite` runs twice, once on the content read (`:315`) and once inside `mutate` (`:318`), so the skip must be collected on the first pass only. Which logger (`debug` or `error`) the acceptance "logs once" means is not stated; `error()` also reports to Sentry (CLAUDE.md Debugging) |
| 13 | "`tags` works with `add` and `remove`, but only on the frontmatter `tags` list. Inline `#tags` in the body are never touched" | CONFIRMED | The writer rewrites only the YAML block and keeps the body (`frontmatter-write.service.ts:128`, `extractBody`). Filters see a merged list (`collection.logic.ts:67-69`, `extractAllTags`), but the write path reads `parseFrontmatterProperties`, which is the frontmatter only. An inline `#work` plus `add work` still adds `work` to the frontmatter |
| 14 | "Tags are compared without a leading `#`" | CONFIRMED consistent with the app | Both tag readers strip one leading `#` and outer quotes: `tag-extraction.ts:60-64` (inline array), `:66-69`, and Rust `parsing.rs:261-266` (`clean_tag_value`). The YAML parse only keeps a `#` when the item is quoted (`"#a"`); an unquoted `[#a]` is not valid YAML and is skipped as lossy. Nothing in `src/` already exports a tag normalizer, so the implementer writes one. Open points in section 3, item G |
| 15 | "Settings: the mode menu offers `remove` and `add to list`. A `remove` row hides its value field. An `add` row takes comma-separated items" | CONFIRMED feasible, but a new editor is needed | Mode menu: `AutoMoveRuleProperty.svelte:35` (`MODE_LABELS: Record<RuleProperty['mode'], string>`, so TS forces the new keys) and `:149-161`. Value editor selection: `ruleValueEditor` (`auto-move.logic.ts:137-144`) returns `'json'` for any non-string, and the `json` branch is a disabled input (`AutoMoveRuleProperty.svelte:132-138`). A list value is read-only today, pinned by `AutoMoveRuleRow.test.ts:302` and the help text at `22-auto-move.md:60`. An `add` row must be editable while an `always` list stays read-only |
| 16 | "Help page, `22-auto-organize.md`: the modes table gets `remove` and `add`" | CONFIRMED | Modes table at `help/documentation/22-auto-move.md:82-85`. Other lines that go stale: `:46` ("pick the mode, if missing or always"), `:51-60` (value-field table and "Numbers and lists have no editor"), `:85` ("A list is replaced as a whole"), `:95` (what is ignored), Configuration File example at `:241-282` |
| 17 | "Failing test first, in the service test" | CONFIRMED, helpers exist | `src/tests/lib/features/auto-move/auto-move.service.test.ts:566-640`: `describe('rule properties')` with `captureObserver`, `lastWrite`, `rule()`, `saveAndRun()`, `NOTE`. They use the real `updateNoteFrontmatter` and mock only fs, hooks, `moveItem`, `setIconForPath` and `debug` (`:7-30`). The once-only log test to copy is `:825-835`. Post-06 path: `src/tests/lib/features/auto-organize/auto-organize.service.test.ts` |
| 18 | "Load: an `add` with a boolean value is dropped" | CONFIRMED as test target | Load path: `loadAutoMoveConfig` -> `withValidProperties` (`auto-move.service.ts:81,92-96`) -> `sanitizeRuleProperties`. Existing load test: `auto-move.service.test.ts:106-132` |

No fact in the Issue is outright false apart from item 11's "map" (unreachable, not wrong in effect). Item 6 needs the unarchive nuance in the docs.

## 2. Touchpoints the Issue does not name

Today's names, with post-06 equivalents implied.

**Types**
- `auto-move.types.ts:14-24` `RuleProperty`. `value` becomes absent for `remove`. Making `value` merely optional widens `RuleProperty['value']` everywhere it is used as an indexed type (see next). A discriminated union is cleaner and anticipates Issue 08, which adds `expr` as an alternative to `value` and says `remove` ignores both (Issue 08 Behavior 1).
- `auto-move.logic.ts:173` `export interface OwnedProperty extends RuleProperty`. An interface cannot extend a union. If `RuleProperty` becomes a union this must become a type alias with an intersection.
- Other uses of `RuleProperty['value']`: `auto-move.logic.ts:137` (`ruleValueEditor` parameter), `:147` (`isRulePropertyValue`), `:199` (`sameValue`), `:221` (`propertyType`), and `AutoMoveRuleProperty.svelte:55` (`setValue`).

**Pure planner, `auto-move.logic.ts`**
- `sanitizeRuleProperties` `:157-170`: accept `remove` with no value (skip the value check at `:164` and the boolean-only check at `:167` for it); for `add`, require string or `string[]`; decide whether to strip a stray `value` from a `remove` entry so it does not persist on the next save (`saveAutoMoveConfig` writes `autoMoveStore.rules`, `auto-move.service.ts:109-113`).
- `ownedProperties` `:187-196` spreads `...property`, so `remove` entries pass through unchanged. No change needed beyond types.
- `propertiesToWrite` `:212-218`: today a two-way branch (`if-missing`, else `always` compare). It needs `remove` (write when the canonical key exists, empty value included) and `add` (write when any item is missing; a number or boolean current value is a skip, not a write). It must also expose skips for the once-per-rule log.
- `applyPropertyWrites` `:232-241`: `remove` must filter the key out (`removeProperty` at `properties.logic.ts:711-713` matches exact keys, fine because parsed keys are canonical). `add` must build the merged list. Type is `list` (`propertyType`, `:221-226`).
- `ruleValueEditor` `:129-144` and its type `RuleValueEditor`: needs an `add`-aware result (a list-items editor), which means a signature change (it takes `key, value`, not mode). Its tests: `auto-move.logic.test.ts:557-583`.
- `propertyWriteSkipReason` `:251-269`: unchanged; it is where the map case ends (item 11).

**Service, `auto-move.service.ts`**
- `writeRuleProperties` `:297-323`: the pre-check at `:315-316` and the mutate at `:318` both call `propertiesToWrite`. Skip reporting must not run in the second, pure call (`updateNoteFrontmatter` can run `mutate` twice, `frontmatter-write.service.ts:95-96`).
- New once-per-rule set for skips, cleared in `resetAutoMove` (`:338-353`) next to `reportedWriteFailures`.
- No change to `evaluateAndMove` ordering, `writingPaths` (`:46,257-267`) or the debounce. A `remove` or `add` write goes through the same `updateNoteFrontmatter` call, so no-chain protection already covers it.

**Settings UI**
- `AutoMoveRuleProperty.svelte`: `MODE_LABELS` `:35`; `showTypeChooser` `:40` (Text/Yes-no chooser must hide for `add` and `remove`); `commitKey` `:43-53` (it forces booleans and strings by key; needs to stay correct with `remove`); the value editor block `:107-147` (hide on `remove`, new editor for `add`); mode `Select` `:149-161`.
- Mode changes keep the old value (`:152`). Switching a row from a boolean `always` to `add` leaves a boolean value, which load and `ownedProperties` then drop silently. The row must coerce the value on a mode change, as `commitKey` already does for key changes.
- `AutoMoveRuleRow.svelte`: `addProperty` `:82-84` creates `{ key: '', value: '', mode: 'if-missing' }`; `doesNothing` `:65` uses `sanitizeRuleProperties`, so it follows the loader automatically. Issue 03 rewrites this component's filter area; Issue 06 renames it. Issue 07 is blocked by 06, so only the property block matters.
- Tests: `AutoMoveRuleRow.test.ts` (mode choice helper `choose(row, 'Property mode', ...)` used at `:175`; the read-only list test at `:302`), harness `src/tests/fixtures/AutoMoveRuleRowHarness.svelte`.

**Persistence**
- Rules persist through `saveAutoMoveConfig` (`auto-move.service.ts:101-119`) as plain JSON. Nothing to change; `undefined` values vanish in `JSON.stringify`. Settings saves go through the 500 ms debounced `updateRule` (`AutoMoveSection.svelte:40-65`).

**Tests that must grow**
- `auto-move.logic.test.ts`: `sanitizeRuleProperties` (`:462-501`), `propertiesToWrite` (`:622-659`), `applyPropertyWrites` (`:661-687`), `ruleValueEditor` (`:557-583`), `ownedProperties` (`:503-531`).
- `auto-move.service.test.ts`: new modes inside `describe('rule properties')`, and a load test next to `:106`.
- `auto-move.no-chain.test.ts` (`:60-155`) already proves a rule write does not re-run rules. One `remove` or `add` case there is cheap insurance but not required.
- CLAUDE.md rule: every computed store getter needs a test; no store change here.

**Docs**
- `help/documentation/22-auto-move.md` (post-06 `22-auto-organize.md`): the lines in item 16, the "Setting Properties" notes at `:104-116`, and a statement that `tags` add/remove touches only frontmatter. Issue 06 rewrites this page before 07 runs, so 07 edits the rewritten page; line numbers will move.
- Issue 06 also requires every example rule in the help to be valid and evaluated by a test. 07's two examples (add `tags`, remove a key) should follow the same rule if 06 adds the examples file and test. `help/examples/auto-move-features/` today has `auto-move-rules.json` at its root, not under `.kokobrain/` (listing: `README.md`, `Inbox`, `auto-move-rules.json`), and `examples-scoping.test.ts:405-407` requires a path predicate on each example rule.

**Not affected (checked)**
- Mods contract: only `settings.autoMove` and `updateAutoMove` are documented (`help/documentation/mods/09-raw-app.md:927,945`). No mod API exposes rules or `RuleProperty`.
- Layer and cycle baselines: `feature-cycle-baseline.json:4-6` lists `auto-move -> collection | file-icons | type-definitions`. 07 needs no new cross-feature import if the tag normalizer lives in `auto-move.logic.ts`. `layer-rules.test.ts` is unaffected.
- Rust and `src-tauri/`: no DTO or IPC change; the gate is frontend only, as the Issue says. `raw-write-ratchet.test.ts:32` only whitelists the config JSON write.
- e2e and `scripts/`: no reference to the feature.
- Todoist: `todoist_project` stays refused; the Todoist tags check (`todoist-sync/fields.logic.ts:322`) concerns task lines, not note frontmatter.

## 3. Behaviors that are impossible, bigger than they look, or underspecified

A. **The loader is the biggest hidden change.** `sanitizeRuleProperties` (`auto-move.logic.ts:157-170`) validates value before mode-specific rules. A `remove` with no `value` is dropped at `:164` today, and a `remove` on `_organized` would be dropped again at `:167`. The order of checks must change: mode first, then per-mode value rules, with the boolean-only check applying only to modes that carry a value. Behavior 1 and Behavior 2's `_archived` clause depend on this, and the Issue does not say it.

B. **Type change ripples.** See section 2. About ten sites reference `RuleProperty['value']` or `property.value`. Using the discriminated union that Issue 08 also needs avoids doing this twice.

C. **`remove` on `tags` removes the whole key, not one tag.** Behavior 2 deletes the canonical key "whatever its value", and Behavior 4 says `tags` "works with `add` and `remove`". A reader can take that as "remove the tag `work`". The tag-name comparison in Behavior 4 only matters for `add`. The help example and the Settings label must make clear that `remove` on `tags` clears all frontmatter tags. (No decision is reopened here; this is wording for the implementer and the docs.)

D. **`add` on a boolean-only key.** `_organized`, `_archived` and `_favorite` accept only booleans (Issue 01 Behavior 1, `auto-move.logic.ts:121,167`). An `add` there has a string value and is dropped on load, but Settings shows a yes/no switch for those keys (`ruleValueEditor`, `:139`) and the mode menu offers `add`. The Issue does not say whether `add` on those keys should be hidden in Settings or just dropped on load. Smallest reading: drop on load, as `sanitizeRuleProperties` already does via the boolean check.

E. **Empty `add` items.** `{ mode: 'add', value: '' }` or `value: []` is a valid string or `string[]`. A new Settings row starts with `value: ''` (`AutoMoveRuleRow.svelte:83`). If the user sets a key and switches to `add` before typing items, the rule would add `''` to a list on every save of every matching note (the rule starts disabled, PRD Decision 13, but is live once enabled). Blank items should be ignored by the planner or dropped by the loader. The Issue does not say.

F. **Case and dedupe mismatch with the app's tag reader.** Behavior 3 compares exact strings. The Rust and TS tag extractors dedupe case-insensitively (`parsing.rs:513-527`, `tag-extraction.ts:131-146`). `tags: [Work]` plus `add work` writes `[Work, work]`, and the index shows one tag. Acceptable under the settled "exact strings"; worth one sentence in the docs.

G. **Tags written and compared.** The Issue says tags are compared without a leading `#`. It does not say what is written when the rule's item is `#work` (strip the `#`, which matches how the app reads tags, or write it as given). It also does not say whether the comparison strips from existing items, from the wanted items, or both. A rule item `#work` against existing `["#work"]` (quoted, so readable) is the only case where it matters.

H. **Canonicalization on write.** Any changing write rewrites the whole YAML block as flow lists with canonical quoting (ADR 0029, PRD Decision 11; serializer `properties.logic.ts:603-625`, `flow = true` at `:612`). `add` to `tags: [1, 2]` writes `["1", "2", "x"]`. A block list becomes a flow list. The tag readers handle flow lists (`tag-extraction.ts:59-69`) and `lineWidth: 0` stops wrapping, so tags stay readable on one line.

I. **Wikilink items.** `add` of `[[AWS]]` onto `_belongs_to: "[[A]]"` makes a list of two quoted strings. The serializer quotes `[[` items (Issue 01 Behavior 7 relies on this for scalars; a test for list items is worth adding). Do not put exactly one unquoted list inside a list: the parser folds that shape back to `[[X]]` (`properties.logic.ts:157-166`).

J. **Lifecycle remove nuance.** See item 6 of section 1: `remove` on `_archived` does not satisfy `_archived == false` in the generated unarchive rule.

K. **Not much bigger than it looks.** The write path (`updateNoteFrontmatter`), the gates, the chaining guard and the ordering are reused as is. The work is the loader, the planner, one Settings editor and tests. The risky parts are A, B and E.
