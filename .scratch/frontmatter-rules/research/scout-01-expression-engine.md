# Scout 01: the expression engine as the shared rule engine

Scope: `src/lib/features/collection/expression/` (tokenizer, parser, evaluator, methods.logic, date-value.logic, duration.logic, expression.types) and its three consumers. Read-only research at HEAD `2e2cc5b60`. Nothing was run (no tests, no builds). Statements marked "not verified" were not confirmed in code.

## 1. Summary for the decision

- The engine is a pure, synchronous, read-only evaluator: string -> AST (`parse`) -> value (`evaluate`) against `EvalContext = { record: PropertyIndexRecord, formulas }` (`evaluator.ts:10-16`). It can express a match condition well. It cannot express "property X changed", "created", "moved" or "renamed": the context holds exactly one record, no previous value, no event (`evaluator.ts:10-16`).
- It already has two production consumers with different error policies (collection filters/formulas, Auto Move) and a third surface that only reads its types (collection-block-widget, via `executeQuery`). One engine for the new feature is realistic with no new engine at all for the "match" half.
- The engine does not need to move to `core/` or `utils/`. A new feature under `features/` may import `features/collection/expression/*` because feature -> feature imports are allowed while acyclic (ADR-0003 amendment, `docs/adr/0003-four-layer-source-taxonomy.md:37`), and `auto-move -> collection` already exists in `feature-cycle-baseline.json`. Moving is only justified if a `core/` file must evaluate expressions; none does today, and triggers can use registration APIs (section 7).
- Four real gaps to close before the engine is a safe shared rule engine: (a) previous-value/event context for the change triggers, (b) a shared parse cache and a single `validateExpression` (today there are two with different strength, and Auto Move's UI uses the weaker one), (c) null-hostile method calls throw instead of returning false, (d) Auto Move builds its record with fake `ctime`/`mtime`/`size` (section 5).

## 2. What a rule can express today

### Syntax (tokenizer.ts, parser.ts)

- Literals: numbers (`tokenizer.ts:41-50`; `1.2.3` is read as one token and becomes `NaN`), strings with `'`, `"` and smart quotes plus backslash escapes (`:52-73`), `true`/`false` (`:157`), array literals `[a, b]` (`parser.ts:187-199`).
- Operators: `+ - * / % == != > < >= <= && || !` and unary `-` (`tokenizer.ts:21-22`). Precedence low to high: `||`, `&&`, comparison, additive, multiplicative, unary, postfix (`parser.ts:4-6`). No ternary (use `if(c, a, b)`), no `in`, no bracket indexing (`LeftBracket` is only an array literal opener, `parser.ts:187`).
- Identifiers are ASCII only: `[A-Za-z_][A-Za-z0-9_-]*` with a hyphen followed by a letter continuing the identifier (`tokenizer.ts:131-155`). Consequences: `a-b` is one identifier (write `a - b`); a property named with accents, spaces or non-ASCII letters throws `Unexpected character` (`tokenizer.ts:165`) and cannot be referenced at all, except through `file.hasProperty("name")` which takes a string (`evaluator.ts:576-579`) or `file.properties` (object of everything, `evaluator.ts:205-211`).
- Member access and calls: `a.b`, `f(x)`, `a.method(x)`, `(expr).method(x)`. A static path call (`status.lower()`, `file.hasTag("x")`) becomes a dotted-callee `call` node; a computed receiver (`now().format("YYYY")`) becomes a `methodCall` node (`parser.ts:109-157`).

### Names a rule can read (evaluator.ts)

- Bare identifier: formula by name, else `record.properties.get(canonical(name))` or `null` (`:143-150`). The only alias is `type` -> `_type` (`:93-95`); every other alias in the docs (`icon`, `color`, ...) is frontmatter-side only (`help/documentation/12-collection.md:387`).
- Namespaces `note.x` / `property.x` (same lookup, `:168-171`), `formula.x` (`:166-167`), `file.*` (`:163-165`).
- `file.*` fields (`:194-214`): `name`, `basename`, `path`, `folder`, `ext`, `size`, `ctime` (Date), `mtime` (Date), `tags`, `properties`. Anything else returns `null`. There is no `file.links`, `file.backlinks`, `file.embeds`, `file.hasLink` (not verified beyond reading `resolveFileProperty` and `evaluateFileMethod`, which have no such cases).
- `file.*` methods (`:563-588`): `hasTag(...)` (variadic, any-match, case-insensitive), `inFolder(path)` (prefix on the ABSOLUTE folder, case-insensitive), `hasProperty(key)` (raw key, no alias), `asLink(display?)`. Any other name throws `Unknown file method`.
- Record keys the projection adds (`collection.logic.ts:53-77`, mirrored from Rust `project_note_record`): `_type` casing normalised, `organized` / `archived` / `favorite` booleans ALWAYS present (defaults true/false/false), `tags` = frontmatter + inline `#tags`, and `_belongs_to` / `_related_to` / `_has_many` rewritten as arrays of wikilink targets (alias and heading dropped). So `_belongs_to.contains("AWS")` works (Issue 01 relies on this), but `archived` is never absent: `isEmpty(archived)` is always false, and "missing" must be tested on the raw key (`_archived`).
- Relationships: a rule sees only the target NAMES of the current note. There is no dereference (no way to read a property of the note a `_belongs_to` points at) and no reverse lookup. Not possible in this engine without a new context field (an index lookup), which would break the "record only" purity.
- Nested frontmatter objects are not readable: `parseFrontmatterProperties` skips them (`properties.logic.ts:333-334`), and `resolvePropertyPath` documents the same limit (`evaluator.ts:590-596`). Record values are `string | number | boolean | string[]` (`properties.types.ts:8`); a frontmatter date is a STRING, so `due.year` is `null`; use `date(due).year` (`evaluator.ts:368-378`, `methods.logic.ts:234-242`).

### Functions (evaluator.ts:290-298, 347-470)

Plain functions (the `PLAIN_FUNCTIONS` set): `if now today date number contains startsWith endsWith isEmpty max min list duration link image icon html badge progress color escapeHTML`. The display ones (`link image icon html badge progress color`) return `{ __display: ... }` objects (`expression.types.ts:86-115`), meaningful only to the table renderer; a rule action must never use them as a value.

### Methods and fields (methods.logic.ts:62-246)

Dispatch is by runtime type (`getRuntimeType`, `:51-59`), type registry first, then `any`:

- string: `lower title trim replace split slice matches` (`matches` = case-insensitive regex, errors -> false); field `length`.
- number: `abs round ceil floor toFixed`.
- date: `format relative date time`; fields `year month day hour minute second millisecond`.
- list: `contains sort unique join flat slice`, plus `filter(expr)` / `map(expr)` handled in the evaluator with `value`/`index` injected (`evaluator.ts:520-560`); field `length`.
- object: `keys values isEmpty`.
- any: `contains startsWith endsWith isEmpty isTruthy isType toString`.

Dates: `now()`, `today()`, `date("YYYY-MM-DD")` (local midnight, day-precision compare, `date-value.logic.ts:13-24`, `evaluator.ts:649-685`), Date +/- duration string via `parseDuration` ("1d", "2 weeks", "1h 30m", `duration.logic.ts:51-71`; month = 30 d, year = 365 d), Date - Date = milliseconds (`evaluator.ts:245-254`).

Semantics worth knowing: `==` is JS loose equality, case-sensitive for strings, except `type`/`_type` against a literal (case-insensitive, `evaluator.ts:263-272`); `contains`/`startsWith`/`endsWith` are case-insensitive; `&&`/`||` short-circuit and return the operand, not a boolean (`:231-240`); `/` and `%` by zero return `null` (`:278-279`); `null` coerces to 0 in arithmetic (`toNumber`, `:624-629`); truthiness is `null/undefined/0/''/false` = false (`:632-636`).

### Time-dependent rules

`now()` / `today()` are evaluated at evaluation time. There is no timer or "date arrives" trigger anywhere, so a rule such as `due < today()` only fires on the next trigger that touches the note, never at midnight. State this limit once in the design.

## 3. Error handling and parse caching

### Errors

- Tokenizer and parser throw `Error` (unterminated string, unexpected character/token, missing paren: `tokenizer.ts:68,165`, `parser.ts:22,24,162,201,207`).
- The evaluator throws on: unknown plain function (`evaluator.ts:468`), unknown `file.` method (`:586`), unknown method for the receiver's runtime type (`methods.logic.ts:269`), circular formulas at depth 10 (`evaluator.ts:18,218-220`), unknown binary operator (impossible from the parser).
- Null-hostile methods: a type-specific method (`lower`, `trim`, `format`, `round`, ...) on a `null` receiver finds no `null` registry and no `any` entry, so it THROWS `Unknown method: lower` (`methods.logic.ts:255-270`). `status.lower() == "done"` throws on every note without `status`. Pinned by `evaluator.test.ts:238` (context) and called out in `type-lifecycle-rules.ts:28-31`. A rule engine that treats throw as "no match" hides this as silent non-matching; a rule that throws on most notes looks identical to a rule that is simply false.
- Missing args are not validated: `contains()` / `if()` evaluate `args[0]` which is `undefined`, so `evaluate(undefined)` throws a `TypeError` (reading `.type`), not a clean message (inferred from `evaluator.ts:355,386`; not exercised).
- Only `PLAIN_FUNCTIONS` are statically checkable; method names and `file.*` methods are not (`evaluator.ts:300-304`).

### Three error policies already coexist

| Consumer | Policy | Evidence |
|---|---|---|
| Collection query, filters | Fail the whole query before reading rows when an expression does not parse or calls an unknown plain function (`filterError`), using `validateExpression` | `collection.logic.ts:139-141,227-250` |
| Collection, per-record evaluation | A throw while evaluating = filter false | `collection.logic.ts:317-338,347-363` |
| Collection formulas | Parse failure or throw = column value `null` | `collection.logic.ts:147-154,172-182` |
| Auto Move | Throw = rule skipped; reported through an optional `onError` callback the service wires to `error('AUTO-MOVE', ...)` | `auto-move.logic.ts:17-35`, `auto-move.service.ts:159-161` |

### Two different `validateExpression`

- `evaluator.ts:306-315`: parses AND checks every plain function name; returns `string | undefined`.
- `auto-move.logic.ts:87-95`: rejects empty, only parses; returns `string | null`. The Auto Move settings row uses THIS one (`AutoMoveRuleRow.svelte:17,41`), so `statuz()` or `bogus(1)` shows as valid in Settings and then throws at every save. A shared rule core should expose one validator (the stronger one) and the empty-expression check should live in the caller.

### Parse caching

- `parse()` itself has no cache (`parser.ts:8`). `evaluateExpression` re-parses on every call (`evaluator.ts:75-78`); this is what Auto Move uses, so every rule is tokenized and parsed on every evaluation (`auto-move.logic.ts:26`).
- `evaluateFormula` re-parses the formula text at every reference (`evaluator.ts:224`).
- Caching exists only per `executeQuery` call: a local `Map<string, ASTNode>` for filter strings (`collection.logic.ts:158,347-356`) and a pre-parsed formula list (`:147-154`). Nothing survives across calls.
- ASTs are plain immutable data and `evaluate` never mutates them (read `evaluator.ts:38-69`), so a module-level `Map<string, ASTNode | Error>` cache (bounded, keyed by expression text) is safe and trivially testable. It matters more for the new feature than for Auto Move: a property-change trigger may evaluate every rule per edit, not per save.
- Evaluator side effects to know: `.filter()` / `.map()` temporarily REPLACE `ctx.record.properties` with a copy plus `value`/`index`, restored in `finally` (`evaluator.ts:527-557`). Safe because evaluation is synchronous, but it mutates the record object passed in, and `executeQuery` passes shared index records directly in its filter step (`collection.logic.ts:161-170`). A rule engine must not share a record across async boundaries during evaluation. `dayPrecisionDates` is a module-level `WeakSet` (`evaluator.ts:649`), harmless.

## 4. Who uses the engine and how

| Module | What it imports | How |
|---|---|---|
| `collection/collection.logic.ts` | `evaluate`, `validateExpression`, `EvalContext`, `parse`, `isDisplayValue`, `ASTNode` (`:10-12`) | Query pipeline (collect, filter, formulas, sort, limit). Also `filterCitesArchived` walks the AST (`:266-310`), and `toolbar/filter.logic.ts` converts AST <-> visual filter rows and writes expression strings back (`filter.logic.ts:304-400`). The AST shape is therefore an API for the toolbar UI; adding node types means checking those switches. |
| `collection/collection-block-widget.ts` | Only `isDisplayValue` (`:6`) plus `executeQuery`/`formatCellValue` (`:4`) | Renders display values; no direct evaluation. |
| `auto-move/auto-move.logic.ts` | `evaluateExpression`, `EvalContext`, `parse`, `PropertyIndexRecord` (`:2-4`) | `findMatchingRule`: first truthy enabled rule wins (`:17-35`), `formulas: {}` (`:25`). |
| `auto-move/auto-move.service.ts` | `buildNoteRecord` from `collection.logic` (`:6`) | Builds the record from the saved content (`:154`). |
| `auto-move/type-lifecycle-rules.ts` | none directly | Generates expression STRINGS (`type == "X" && _archived == true ...`, `:32-52`) fed to the same `findMatchingRule`; shows that generated rules on the engine is an accepted pattern. |

Not consumers: QueryJS (`plugins/queryjs/kb-api.ts:1`, `queryjs.logic.ts:1` import only the `PropertyIndexRecord` type). No Rust evaluator exists for this language (a `grep -il expression src-tauri/src` run failed on a shell glob, so this is not verified; the doc and code comments describe Rust only as the producer of the projected record).

Test files that pin the engine: `src/tests/lib/features/collection/expression/{tokenizer,parser,evaluator,methods,date-value,duration}.test.ts`, `src/tests/lib/features/auto-move/{auto-move.logic,type-lifecycle-rules}.test.ts`, `collection-block-widget.test.ts`.

## 5. Record freshness: a trap for rule evaluation on triggers

`auto-move.service.ts:154` builds the record with `buildNoteRecord(filePath, content, Date.now(), Date.now())`. Signature `buildNoteRecord(path, content, mtime = 0, ctime = 0, size = 0)` (`collection.logic.ts:22-28`). So inside Auto Move today `file.mtime` and `file.ctime` are "now" and `file.size` is 0. A rule like `file.ctime < date("2026-01-01")` never matches there, and `file.size > 1000` never matches, while the same text works in a Collection filter (which reads the Rust-projected index record). This is an existing latent bug in the shared-engine promise ("the same language"): documented in `22-auto-move.md` as "the same language as Collection filters". A new feature must build its record from one helper that takes real stat values (e.g. from the existing index record, as `updateNoteInIndex` does at `collection.service.ts:150-165`, which preserves `mtime/ctime/size` of the existing record) and not from `Date.now()`. Worth a separate ticket for Auto Move; not fixed here.

Also: `buildNoteRecord` is the TS mirror of Rust's projection and is pinned by a golden fixture (`collection.logic.ts:41-52` doc). A rule evaluated on either record kind sees the same keys, which is the property that makes one engine safe.

## 6. Can it express "property X changed"?

No. `EvalContext` carries one record. Unknown names fail soft: `prev.status` today resolves to `null` without throwing (the identifier `prev` is a null property, `dispatchField(null, ...)` returns `undefined`, then the dotted-path fallback looks up a key literally named `prev.status`, `evaluator.ts:174-181`), so a rule written with a not-yet-supported `prev.` namespace would silently never match. A new namespace must be added with a validator check, not left to fall through.

Options, from least to most engine change:

1. **Edge-trigger by double evaluation, zero engine change.** Evaluate the same expression on the previous record and the new record; fire when `before == false && after == true`. Covers "note started matching" (status became `done`). Does not cover "property changed to anything" or "changed from A to B" unless the user writes both sides in the expression, and it cannot express a rule that should fire on every change of `status` regardless of value. It also means the "match" is edge-triggered on the property-change trigger but level-triggered on the save trigger: two semantics the owner must choose between (see open questions).
2. **Add `previous?: PropertyIndexRecord | null` to `EvalContext` plus a `prev` namespace and a `changed("key")` plain function.** Touch points (all small, all in one folder): `EvalContext` (`evaluator.ts:10-16`), `resolveMember` switch (`:163-172`), `resolvePropertyPath` (`:604-621`, because `prev.status.lower()` parses as a dotted-callee call), `PLAIN_FUNCTIONS` + `evaluateCall` switch (`:294-298,353`), `findUnknownFunction` is automatic through `PLAIN_FUNCTIONS`. Define `changed(k)` as deep inequality of canonical values current vs previous (list order-insensitive or not: owner decision), `null` previous (note creation) => all `prev.*` null and `changed(k)` true when the current value is non-empty. Collection passes no `previous`, so existing behaviour is unchanged and `changed()` / `prev.x` would be rejected or null there; the validator needs a per-consumer flag so a Collection filter using `changed()` is reported instead of silently false.
3. **Event identifiers in the expression (`event == "create"`)**: not recommended. Triggers (save, property change, create, move, rename) are better as a per-rule `triggers` list evaluated by the dispatcher, with the expression kept a pure predicate on the record. If an expression needs the old path (rename, move), `prev.file.path` / `prev.file.folder` come for free under option 2 if `prev` reuses `resolveFileProperty`.

Where the previous record would come from is outside this scout's area, but two facts shape the choice: `NoteChangeConsumer.upsert(path, content)` receives only the new bytes (`core/filesystem/note-change.service.ts:26-32`), and `collectionStore.updateRecord` replaces the old record in place (`collection.store.svelte.ts:41-46`). A previous-record snapshot has to be taken by the consumer (own `Map<path, record>`) or read from `collectionStore.propertyIndex` before the collection consumer overwrites it, which makes consumer registration order significant. Flag for the trigger scout.

## 7. Making it the single shared rule engine: location and layers

### Constraints (verified)

- `scripts/import-graph.mjs` / `layer-rules.test.ts`: `core->features`, `core->plugins`, `features->plugins`, `utils->non-utils` are violations; feature -> feature is allowed while acyclic (`layer-rules.test.ts:135-141`, ADR-0003 `:37`).
- `layer-baseline.json` holds exactly 3 entries, all `utils -> core` (`app-channel.ts`, `debug.ts` x2), and `BASELINE_SIZE = 3` (`layer-rules.test.ts:32`). The CLAUDE.md text listing `core->features` / `features->plugins` debt is stale against this file: today no such baseline entries exist, so any new inversion fails the ratchet immediately. A new `core/` file importing the engine from `features/collection` would FAIL, not be baselined.
- `feature-cycle-baseline.json`: `featureCycleEdges` is empty and `FEATURE_CYCLE_EDGES_SIZE = 0` (`feature-cycle.test.ts:36`); any cycle fails. Existing pairs relevant here: `auto-move -> collection`, `auto-move -> file-icons`, `auto-move -> type-definitions`, `type-definitions -> collection`, `rail-shell -> collection`. Constraint: `collection` must never import the new feature or `auto-move` (cycle), and a shared helper must not live in `auto-move` if `collection` or the new feature must reach it and `auto-move` imports either back.
- `pure-logic.test.ts` (ADR-0004): `.logic.ts`, `.types.ts` and top-level `utils/*.ts` must not reach stores, services, Svelte or Tauri through the import graph. The engine passes today: `evaluator.ts` (not named `.logic.ts`) is pulled in by `collection.logic.ts` and `auto-move.logic.ts`, so it is walked transitively. It imports only `utils/color-presets`, `utils/clamp` and the `PropertyIndexRecord` type from `../collection.types` (`evaluator.ts:1-8`). A rule-core helper must keep these imports (no `debug()` from `utils/debug.ts`, which is a forbidden "utils service" target; error reporting stays callback-based like `onError`).
- Naming: `.logic.ts` only for real pure logic (CLAUDE.md). `parser.ts`, `tokenizer.ts`, `evaluator.ts` do not follow it; renaming is churn with no benefit, do not do it.

### Placement options

| Option | Cost | Verdict |
|---|---|---|
| A. Keep in `features/collection/expression/`; new feature imports it (`#lib/features/collection/expression/evaluator.js`) | None. Adds one acyclic feature pair (`frontmatter-rules -> collection`), shown in the `featurePairs` diff for review (`feature-cycle.test.ts:41-44` rewrites it without failing). | Recommended. Already the pattern Auto Move uses. |
| B. Move to `core/expression/` | 7 source files, 6 test files under `src/tests/lib/features/collection/expression/`, imports in `collection.logic.ts`, `collection-block-widget.ts`, `CollectionTableView.svelte` (`isDisplayValue`), `auto-move.logic.ts`; `PropertyIndexRecord` would also have to move or be replaced by a structural `{ path, name, basename, folder, ext, mtime, ctime, size, properties }` type, since `core` cannot import `features/collection/collection.types`. Display helpers (`badge`, `progress`, ...) are table-rendering concerns that would move into core with it. | Only if a `core/` file must evaluate expressions. None does today: hooks (`addAfterSaveObserver` in `core/editor/editor.hooks`, `registerNoteChangeConsumer` in `core/filesystem/note-change.service`) already invert the dependency, and `app/lifecycle` wires them (ADR-0003 `:92`). Not recommended now. |
| C. Move to `utils/expression/` | Same moves as B; `utils` rules allow it (pure, imports only `utils`), but top-level `utils/*.ts` are pure starts and subfolders only by `.logic.ts` suffix. Same `PropertyIndexRecord` problem. | Not recommended; no consumer needs the depth. |

### What "shared rule core" should contain (placement A)

The engine is already shared. What is duplicated or missing is the thin layer around it, which today lives half in `auto-move.logic.ts` and half in `collection.logic.ts`. A small module next to the engine (suggested name `features/collection/expression/rule-eval.logic.ts`, only if two consumers use it) would hold:

1. `compileExpression(text)`: parse with a bounded module-level cache; returns `{ ast } | { error }`.
2. One `validateExpression` (the `evaluator.ts:306` one) with an options object for the per-consumer function allowlist (so `changed()` is valid only where a previous record is supplied).
3. `matchesRecord(text, ctx, onError)`: compile, evaluate, truthiness, swallow-with-callback (this is the body of `findMatchingRule`'s loop and of `evaluateFilterCached`'s string branch, `auto-move.logic.ts:24-32`, `collection.logic.ts:347-363`).
4. A value-expression evaluator for action values (`evaluate` result coerced to a frontmatter value: string, number, boolean, `string[]`, Date -> `YYYY-MM-DD` string; reject display objects and `null`). Not needed if values are literals; needed only if the owner wants computed values (`now().format("YYYY-MM-DD")`, `file.basename`).

Selection semantics stay in each feature: Auto Move is first-match-wins (`auto-move.logic.ts:17-35`); frontmatter rules will probably be all-matching (apply every matching rule), which is why a shared `findMatchingRule` is the wrong abstraction and a shared `matchesRecord` is the right one. Per-action "fill only if missing / always set" is action data, not expression data: "missing" is "absent, null, '' or empty list on the CANONICAL key" (Issue 01 rule 4, `canonicalizeKey` in `utils/frontmatter-aliases.ts`), not `isEmpty(x)` in the expression, because the projected record always carries `archived`/`organized`/`favorite` and the expression-side alias table has only `type` (`evaluator.ts:93-95`).

### Recommendation for the relation to Auto Move, from the engine's side

The engine does not force either answer; it works the same for a new feature or an extension. What it does say: the part that must be shared is the match layer (items 1-3 above), not the rule list or the selection policy. Evidence for keeping selection separate: Auto Move is first-match-wins and its Issue 01 already needs a special case so a property-only rule cannot block later move rules (`.scratch/auto-move-default-properties/issues/01-...md` Behavior 5); an all-matching engine does not have that problem. Defer the final call to the other scouts (persistence, triggers, UI), but any option is compatible with placement A.

## 8. Risks and constraints a design must respect

1. Rule loops: writing a property fires `notifyAfterSave`, which re-evaluates after the debounce (Issue 01 behavior 6). "Always set" actions whose expression stays true re-write forever only if the written value differs each time; an idempotent write (same value) must be skipped before touching the file. The engine cannot detect this; it is dispatcher logic.
2. `changed()` / `prev.*` must not leak to Collection filters unvalidated (section 6).
3. Null-hostile methods (section 3): rule authoring will hit `status.lower()` on notes without `status` constantly. Either teach the UI/docs `isEmpty(status) || ...` guards, or make the dispatcher return null/false for type-specific methods on `null` receivers. The second is an engine behavior change and affects Collection filters (today they also throw -> false, so the observable change there is nil for filters, but a formula column would stop being `null` and become a value: needs a decision and tests).
4. Record freshness (section 5): do not reuse `Date.now()` stat values.
5. Expression-side name resolution differs from write-side canonical keys; rules need one place that maps rule keys to canonical keys before both reading ("missing") and writing.
6. Non-ASCII property names cannot be written in expressions (section 2); rules on such keys must use `file.hasProperty("...")` or are unsupported.
7. Any AST node addition must be checked in `findUnknownFunction` (`evaluator.ts:318-336`), `astCitesArchived` (`collection.logic.ts:281-310`, exhaustive switch, a new node type breaks the type check) and `toolbar/filter.logic.ts` (`astToFilterRow`). Adding a function or namespace (not a node type) avoids all three.
8. Tests must follow CLAUDE.md: real stores, no mocks of `.logic.ts`; engine changes need tokenizer/parser/evaluator test additions in `src/tests/lib/features/collection/expression/`.

## 9. Questions only the owner can answer

1. On the property-change trigger, should a rule fire when the note STARTS matching (edge, option 1 in section 6), or whenever the property changed AND the note matches (needs `changed()`, option 2)? Concretely: `status == "done"` and `status` is edited from `done` to `done` via a YAML retype: fire or not?
2. Do you need rules that read the old value (`prev.status == "todo" && status == "done"`) or is `changed("status")` enough?
3. Are action values literals only, or computed from expressions (`now().format("YYYY-MM-DD")`, `file.basename`, `date(due) + "7d"`)? Computed values add item 4 of section 5.
4. Is it acceptable that date-based rules (`due < today()`) only fire when something touches the note and never at midnight?
5. Should `type`, `archived`, `favorite`, `organized` (always-present projected keys) be usable in "fill only if missing" targets, or must action keys be raw frontmatter keys (`_archived`)?
6. Do you want property names with non-ASCII letters or spaces to be supported in expressions? Supporting it means tokenizer change (backtick or `note["..."]` syntax).
7. Should a throwing expression be surfaced to the user (a toast or a status badge on the rule), as Collection does with `filterError`, or only logged, as Auto Move does today?
8. May I treat the stale `file.ctime`/`file.mtime`/`file.size` in Auto Move (section 5) as a bug to ticket separately, or is "now" intentional?
