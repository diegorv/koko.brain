# Dossier: Issue 010, Filters report unknown methods and per-note failures

Checked at HEAD `1198d8e7b` (2026-11-12). Read-only; nothing run. "Verified" = read in code. "Inference" = reasoning, not observed.

## 1. Still present?

Verdict: present exactly. No commit has touched this since the Issue was written. `git log -S"Unknown method" -- src/lib/features/collection` only finds the initial import. The last commits on `collection.logic.ts` (`179cca328`, `107bcf35a`, `fcf78e578`) touch other things (object-rule filter in auto-organize, `file.inFolder`, parse errors).

Claim by claim (Issue line refs are stale; current ones):

| Claim | Verified at HEAD |
|---|---|
| `validateExpression` checks only parse + plain function names | `src/lib/features/collection/expression/evaluator.ts:308-318`, `findUnknownFunction` `:320-338`. A dotted callee (`!node.callee.includes('.')`, `:323`) is skipped; a `methodCall` node only recurses into receiver and args. Issue said `:300-332`. |
| Methods dispatch on runtime type and throw | `methods.logic.ts:255-269`, `throw new Error(\`Unknown method: ${method}\`)` at `:269`. Lookup order: type registry, then `any`, then throw. `getRuntimeType` `:51-57` has no `null` registry, so a missing property (receiver `null`) throws for every method not in `any`. |
| `file.hasLink` throws | `evaluateFileMethod` default: `throw new Error(\`Unknown file method: ${method}\`)` (`evaluator.ts:565-597`, cases `hasTag :567`, `inFolder`, `hasProperty`, `asLink :590`). Issue said `:563-584`. |
| `evaluateFilterCached` turns a throw into false | `collection.logic.ts:359-386`; `catch { return false; }` at `:368-370`. Issue said `:347-358`. |
| Inside `not:` the failure keeps the note | `:382-384`: `filterObj.not.every((item) => !evaluateFilterCached(...))`, a thrown leaf is `false`, so `!false` keeps the row. (Issue said `:370-371`.) |
| `filter`/`map` handled in the evaluator | `evaluator.ts:492` (`evaluateMethodCall`) and `:510` (`evaluateMethodCallNode`), Issue said `:490`, `:508`. Only when the receiver is an Array. For a non-list receiver they fall to `dispatchMethod` and throw. |
| Rail hides Sort and Filter on an error | Now `RailNoteList.svelte:200` (`viewToolbarReady` requires `!resolved.status`). Issue said `:192`. |

Existing pieces the fix builds on (verified):
- `executeQuery` (`collection.logic.ts:132-217`) already returns early with `filterError` before reading any record (`:143-147`), using `findFilterError` -> `validateExpression` (`:228-245`).
- `QueryResult.filterError` (`collection.types.ts:107-117`) is consumed in: `CollectionView.svelte:687` (Filter error box), `collection-block-widget.ts:142`, `lens.logic.ts:809-822` -> `resolveViewLens` (`:855-870`) -> `status: {kind:'error'}`, `mod-query.service.ts:35` (throws), `FilterRow.svelte:44` (shows the reason on a raw row).
- `view-files.md:137` already documents the bug with the marker `(changes: open-itens/010)`; `:351` item 9 lists it without a marker. The Issue's pointer "(changes: view-engine-fixes/02)" matches nothing in the repo (grep). Use the real marker.

Method inventory the validator must accept (verified from `methodRegistry`, `methods.logic.ts:62-228`, and docs `12-collection.md:~322-330`, which agree):
- string: lower, title, trim, replace, split, slice, matches
- number: abs, round, ceil, floor, toFixed
- date: format, relative, date, time
- list: contains, sort, unique, join, flat, slice
- object: keys, values, isEmpty
- any: contains, startsWith, endsWith, isEmpty, isTruthy, isType (and whatever else `any` holds past `:155`; derive names from the object keys, never hand-list)
- evaluator-only: `filter`, `map` (list); `file.` methods hasTag, inFolder, hasProperty, asLink.
- The built-in lifecycle rules emit `file.folder.endsWith(...)` (`type-lifecycle-rules.ts:41,54`): receiver path `file.folder`, name `endsWith` from `any`. The validator must pass it (split on the LAST dot, treat only `objectPath === 'file'` as the file namespace, like `evaluateMethodCall`, `evaluator.ts:476-480`).

## 2. Impact for this owner

- Trigger (inference): the owner writes or edits a `.view` filter by hand (or an agent does) with a typo'd or invented method (`hasLink`, `containsAll`, `reverse`, `lower` on a non-string), or relies on a method on a property that is a number, list or absent in some notes.
- Today: the rail list, the `.view` tab and inline blocks silently drop those notes (all notes if the method name itself is wrong). Same wrong-empty list, no message.
- Frequency (inference): low-to-medium. It needs a hand-written expression with a method call. The Filter panel only emits plain functions (`filter.logic.ts` templates: `contains()`, `startsWith()`, `isEmpty()` ...), so panel-built filters never hit it. `.view` rail views are daily for the owner, but the filter text is usually written once.
- Severity: wrong data shown (list looks plausible but is short or empty), not data loss. Nothing is written by this path. The one write-adjacent consumer is Auto Organize (`filterProblem`, `auto-organize.logic.ts:39,521,594` call the evaluator's `validateExpression`), which would start rejecting unknown methods at rule-edit time: a safety gain.
- Matches the stated goal (bugs only on `.view` rail views): yes, it is a bug fix in a daily surface. It also unblocks 012, 013, 067, 144, 131, 132 (their text lists 010 as a blocker), which is most of its queue value.
- Important unknown for impact: how many notes lack the filtered property (see 6, D2). If the owner has filters like `status.lower() == 'x'`, the count line could read in the hundreds.

## 3. Complexity and risk

Size: M (Issue says M; I agree, mostly because of 4 UI surfaces plus docs). Algorithmically S.

Files touched:
- `src/lib/features/collection/expression/evaluator.ts`: `validateExpression`, `findUnknownFunction`, new exported `FILE_METHODS`. Central: the expression engine, used by every filter, formula, Auto Organize rule, mod `query.*`. The change is in a pure pre-check, not in `evaluate`, so runtime behavior is unchanged.
- `src/lib/features/collection/expression/methods.logic.ts`: export the set of method names derived from `methodRegistry` keys (read-only addition).
- `src/lib/features/collection/collection.logic.ts`: `evaluateFilterCached` (+ `executeQuery` filter loop and return). Hot path: runs per record per query; keep the added work to a boolean flag.
- `src/lib/features/collection/collection.types.ts`: `QueryResult` gets `failedCount?: number`.
- `src/lib/features/rail-shell/lens.logic.ts` (`ViewQueryResult :775`, `queryViewLens :798`, `resolveViewLens :855`), `rail-shell.types.ts:63` (`ResolvedLens`), `RailNoteList.svelte` (render).
- `src/lib/features/collection/CollectionView.svelte:587` (count span), `collection-block-widget.ts:~158-160` (header) and its CSS in `core/markdown-editor/extensions/live-preview/styles.ts` (the `cm-lp-collection-*` classes live there).
- Docs: `help/documentation/12-collection.md`, `docs/agents/view-files.md`.

What else reads these:
- `validateExpression` callers: `collection.logic.ts:240` (`findItemError`), `FilterRow.svelte:44`, and `auto-organize.logic.ts:15` (aliased `findExpressionError`, used by `filterProblem` at `:39`, `:521`, `:594`). Auto Organize's own `validateExpression` (`:921`) is parse-only and unaffected, so `countMatchingNotes` string rules keep running; only object rules (`filterProblem`) gain the new check.
- `executeQuery` callers: `CollectionView.svelte:269`, `collection-block-widget.ts:124`, `lens.logic.ts:809`, `mod-query.service.ts:45,53`. A new optional field is non-breaking for all.
- `queryViewLens` callers: `view-lens.service.ts:36` (navigator count; unaffected, it uses `lens.notes.length`) and `RailNoteList.svelte:279`. No view-editor preview exists at HEAD (grep), so the Issue's "preview gets it through queryViewLens" has nothing to wire today.

Regression risks:
1. A method name missing from the accept-list turns a working view into an error. Mitigation: derive names from the registry at module load, drift test against the `evaluateFileMethod` switch (same pattern as the existing `PLAIN_FUNCTIONS` source-reading test, `evaluator.test.ts:843-849`), and a table test of every documented method.
2. Built-in/generated expressions (lifecycle rules, Filter panel output, `help/` examples, mod `query.*` expressions) must keep validating. Test them through `validateExpression`.
3. Counting wrong things: see D1 (non-note index records).
4. Auto Organize: an existing user rule with an unknown method is now reported as broken at validation instead of silently never matching or throwing at run. Rule stays unmatched either way; low risk.
5. Visible change per the Issue: a view with a bad method goes from "No notes here" to an error and loses Sort/Filter in the rail (`:200`). Already broken; acceptable.
- Not touched: `dispatchMethod`, `evaluate`, core write paths, Rust, CodeMirror decorations. The block widget change is DOM-only in `renderView`, which re-runs on every `toDOM()` from the cached `QueryResult` (live-preview-rules.md rule 2: the cache holds data, so `failedCount` rides in the cached result with no new cache).

## 4. Implementation plan (test-first, one context)

Decisions first (see 6): D1 count after the row rule; D2 do not change dispatch for null receivers; D3 keep `or`/`not` outcomes. The plan below assumes those.

1. Validator tests (fail first). `src/tests/lib/features/collection/expression/evaluator.test.ts`, extend `describe('validateExpression')` (`:823`):
   - reject (reason contains `Unknown method "hasLink"` / `"reverse"`): `file.hasLink('x')`, `x.reverse()`, `file.contains('a')`, `now().reverse()` (methodCall node), `if(true, x.reverse(), 1)` (nested in args), `[x.reverse()]`.
   - accept: `status.lower()`, `tags.filter(value != 'x')`, `tags.map(value)`, `file.hasTag('a')`, `file.inFolder('/v')`, `file.hasProperty('a')`, `file.asLink()`, `file.folder.endsWith("x")`, `file.mtime.format('YYYY')`, `now().format('YYYY')`, `(a + b).round()`.
   - `it.each([...FILE_METHODS])` and `it.each` over every registry key: accepted.
   - drift test: cases of `evaluateFileMethod` (slice source between `function evaluateFileMethod(` and the next top-level function) equal `FILE_METHODS`.
   - keep the existing `Unknown function: foo` assertions green.
   Run it, see it fail.
2. Implement in `evaluator.ts`: `export const FILE_METHODS = new Set(['hasTag','inFolder','hasProperty','asLink'])`; in `methods.logic.ts` export `KNOWN_METHOD_NAMES` (union of `Object.keys` of every registry entry); in the evaluator a `LIST_HIGHER_ORDER = ['filter','map']`. Replace `findUnknownFunction` with a finder returning the full reason: for `call` with a dot, split at the last dot (same as `evaluateMethodCall`), `objectPath === 'file'` -> must be in `FILE_METHODS`, else must be in `KNOWN_METHOD_NAMES` or filter/map; for `methodCall`, check `node.method` the same way and recurse into receiver and args; keep `Unknown function: <name>` for plain callees. Message for methods: `Unknown method "<name>"` (the Issue's text; note it differs in style from `Unknown function: x`, harmless).
3. Count tests (fail first). `collection-logic.test.ts`, new `describe` near `:790`:
   - `status.lower() == 'a'` over records where one `status` is a number: `failedCount === 1`, the other records evaluate normally.
   - `failedCount` is 0/undefined when nothing threw; a record with a missing property is counted once even when two leaves throw (per record, not per leaf).
   - `and: [false-leaf, throwing-leaf]` short-circuits: not counted.
   - D3: `or: [throwing, true]` keeps the row and is not counted; `not: [throwing]` keeps the row and is not counted (documents today's outcome).
   - D1: records the row rule drops (a `.view` record, a system-folder note, an archived note) that throw are not counted, using a `rowSet` stub that drops them (the real rule is `viewRowSet`/`blockRowSet`, `lens.logic.ts:717,749`).
4. Implement counting in `collection.logic.ts`: give `evaluateFilterCached` a way to report a throw (extra optional callback param `onLeafError`; `evaluateFilter` already has that signature at `:328`). In the filter loop of `executeQuery` keep `threw` per record; after both filters, if `threw && !matched` push to `failed`. After the row set step: `failedCount = rowSet ? rowSet(failed, {...view, limit: undefined}, definition).length : failed.length` (limit removed so it does not truncate the count). Return `{ records, columns, failedCount }`. Add `failedCount?: number` with JSDoc to `QueryResult`. Add one shared pure formatter in `collection.logic.ts`: `describeUnevaluated(n)` -> `'1 note could not be evaluated'` / `'N notes could not be evaluated'`, undefined for 0.
5. Rail tests (fail first). `RailNoteList.view.test.ts`, near `:836`: a `.view` with `filters: "status.lower() == 'a'"` and one note with numeric `status`; assert an element (`[data-note-list-failed]`) has text `1 note could not be evaluated` and the list still shows the matching notes and the toolbar. Plus `lens.logic.test.ts` near `:1532`: `queryViewLens(...)?.failedCount` and `resolveViewLens(...).failedCount`. Implement: `ViewQueryResult.failedCount`, `ResolvedLens.failedCount?`, `RailNoteList.svelte` renders the line inside/under the rule strip (`:826-830`), not in the header count span, which is hidden under `@max-[12rem]` (`:725`).
6. Editor tab test (fail first). `CollectionView.test.ts` (not `.view-writes.test.ts`), modeled on the `resultsText()` helper (`:623`): mount YAML whose filter throws on one record, assert the text. Implement next to `{queryResult.records.length} results` (`CollectionView.svelte:587`).
7. Inline block test (missing from the Issue). `collection-block-widget.test.ts`: header or a sibling element shows the message; also on a cache hit (second `toDOM()`). Implement in `renderView` (`collection-block-widget.ts:~156`), add the CSS class beside `cm-lp-collection-error` in `styles.ts` (and its `styles.test.ts` expectations). Read `docs/agents/live-preview-rules.md` before this step.
8. Docs: `help/documentation/12-collection.md` § Expression Language Reference (~`:264`) and the Filter Panel paragraph at `:73`: add "unknown method" to the list of errors, and one sentence on the count line. `docs/agents/view-files.md`: rewrite `:137` (drop the "silently left out" for unknown names; keep the null/number-receiver caveat, now "counted"), item 9 at `:351`, and the `:125` line if needed; remove the `(changes: open-itens/010)` marker.
9. Gate: `pnpm check` + `pnpm vitest run` (frontend only; no Rust). Commit per the repo's rule (full-format message, Co-Authored-By trailer as the session reminder says), then the post-delivery opus review only if run through relay-lite.

## 5. Acceptance criteria review

Wrong or stale:
- All `file:line` refs in the Issue are off by 8-20 lines (table in section 1). A fresh agent should re-grep instead of trusting them.
- "update the `(changes: view-engine-fixes/02)` item": the actual marker is `(changes: open-itens/010)` at `docs/agents/view-files.md:137`; item 9 at `:351` has none.
- "The view-editor preview gets it through `queryViewLens`": no such preview exists at HEAD; drop it or defer to view-editor 03/04.
- "Missing one of these would turn a working view into an error": correct and the key risk; the Issue's own list of non-registry names (filter, map, hasTag, inFolder, hasProperty, asLink) is complete against `evaluator.ts`.

Missing:
- No test for the inline block surface although the text promises it.
- No definition of what "records that threw" means for `or`/`not`/short-circuit, nor whether non-note index records (`.view`, system folder, type definitions, archived) count. They are in the property index and the row rule removes them AFTER the query (`lens.logic.ts:717-734`, `:749-762`), so a naive count in the filter loop over-counts (inference from reading; `.view` and type definitions lack most user properties, so a method-on-property filter throws on them).
- No placement rule for the rail message; the header count span is hidden below 12rem.
- No `lens.logic.test.ts` pass-through test, no FilterRow/Auto Organize check that the new reason surfaces (`FilterRow.svelte:44` gets it for free; assert once).
- Plural/singular wording and the zero case.

Untestable as written: "show `N notes could not be evaluated` next to the count" (no selector named); fix by naming `data-note-list-failed`.

## 6. Open decisions for the owner (ask once, before building)

- D1, what counts: records the filter threw on AND that the row rule would show (recommended; needs the extra `rowSet(failed, ...)` call). Cheaper alternative: count raw index records; over-counts `.view`, type-definition, system-folder and archived entries.
- D2, noise from missing properties (verified): `status.lower()` on a note with no `status` has a `null` receiver and throws (`methods.logic.ts:255-269`), so a view with such a filter would report every listed-type note that lacks `status` as "could not be evaluated", though the user sees nothing wrong. Options: (a) accept and document "guard with `!isEmpty(x) && x.lower()...`" (recommended; no engine change); (b) make null-receiver calls return null. Reject (b): Auto Organize deliberately relies on that throw so a `not:` rule does not match notes lacking the property (`auto-organize.logic.ts:~58-66` comment, `ruleMatches`), and a move rule changing semantics is a data-moving risk. Say this limit once in the docs.
- D3, `or`/`not` outcomes: keep as today (recommended, matches the Issue); the alternative (a thrown leaf drops the record everywhere) changes what existing views list.

## 7. Run order and file sharing

- Blockers: none (Issue and ledger say none; `ledger.md:47`).
- It blocks 012, 013, 067, 144 (ledger), and the notes say VE-02 (010) before VD-03 (131) and VD-04 (132).
- Hot-code series group: `RailNoteList` / `lens.logic.ts` / `CollectionView.svelte` (`priority-2026-11-08.md:63`). Never parallel with another Issue in that group: 009 (CollectionView.svelte), 012 (CollectionView.svelte), 067 (`collection.logic.ts`, `evaluator.ts`, `collection-block-widget.ts`), 068 (`collection.logic.ts`), 070. The Issue says it can run in parallel with 009 because they share no test file, but both edit `CollectionView.svelte`; the proposed queue puts 009 first and 010 later, which resolves it (the 010 edit there is two lines at `:587`).
- Queue position `010 -> 012` is right: 010 then 012 (012 edits `CollectionView.svelte` and the `.view-writes` test, no overlap with 010's `CollectionView.test.ts`). Do 067 -> 068 after 010 too: 067 edits `evaluator.ts` and `executeQuery`/`collection-block-widget.ts`, the same functions 010 changes, so rebasing 067 onto a merged 010 is cheaper than the reverse.
- Does not share files with 004, 015, 062, 028, 003, 002 (editor, live-preview `widgets.ts`, lib.rs, properties). `collection-block-widget.ts` and `styles.ts` are in the live-preview family but not `widgets.ts`.

## Not verified

No tests were run. The `any` registry's full key list was read only up to `isType` (`methods.logic.ts:155`); the plan derives names programmatically so this does not matter. I did not confirm that `.view`/type-definition records throw on a method filter in a running app (inference from the evaluator code).
