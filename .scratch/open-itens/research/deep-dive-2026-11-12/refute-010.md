# Refutation: Issue 010, Filters report unknown methods and per-note failures

Checked at HEAD `318b6e9b5` (2026-11-12). Read-only, nothing run. "Verified" means read in code at HEAD. "Inference" means reasoning that was not observed.

## Verdict

- **The bug is still present (verified).** `validateExpression` (`src/lib/features/collection/expression/evaluator.ts:308-318`) checks parsing and plain callees only. `findUnknownFunction` (`:320-338`) skips every dotted callee (`:323`) and never checks `methodCall.method` (`:325-326`). At runtime `dispatchMethod` throws `Unknown method: <m>` (`methods.logic.ts:255-269`), and `evaluateFileMethod` throws `Unknown file method: <m>` (`evaluator.ts:565-597`). `evaluateFilterCached` catches the throw and returns `false` (`collection.logic.ts:359-370`). Inside `not:` the row is kept (`:383`). `executeQuery` returns `{ records, columns }` with no failure count (`:223`).
- **Impact for this owner: low to medium (inference).** The Filter panel writes only plain functions (`toolbar/filter.logic.ts:50-86`: `contains(`, `startsWith(`, `isEmpty(`), so filters built in the panel never hit this. A filter hits it only when it is typed by hand, or written by an agent or a mod, and calls a method. When the method name itself is wrong, every note drops out with no message, on a daily surface (rail `.view`). That case is cheap to fix and safe. The per-note count has less value and, as written, can be noisy (see Must-fix 1).
- **Complexity:** the two halves differ. The validator half is S: one pure pre-check, no change at runtime. The count half is M: it touches the per-record filter loop (the hot path), `QueryResult`, `ViewQueryResult`/`ResolvedLens`, and three UI surfaces, and its counting rule is not defined.
- **Risk:** low for the validator. The only views it changes are already broken, but it also changes two other contracts the Issue does not mention: the stable mod `query.*` API, and Auto Organize's Settings refusals (Must-fix 3). Medium for the count, because its semantics are undefined.
- **Can a fresh relay-lite agent implement it from the text alone?** Not safely. It would have to guess what counts as a failure, the result field's name, where the text goes, and the doc marker (the Issue names a marker that does not exist). The Notes also contradict each other about the order relative to 009.
- **Recommendation: run-after-edits.** Apply the Must-fix edits. The preferred edit is to split the count into its own Issue, which leaves 010 as an S, low-risk validator fix.

## Must-fix edits to the Issue text

### 1. The count has no defined rule, and as written it would be noisy. Split it out (preferred) or define it.

Evidence (verified):
- A missing property resolves to `null` (`evaluator.ts:616-630`). `getRuntimeType(null)` is `'null'` (`methods.logic.ts:51-52`). No `null` registry exists, and `any` has no `lower`, so `status.lower()` throws on every note that has no `status`. `docs/agents/view-files.md:137` already says so ("drops every note whose `status` is a number, a list or empty").
- `and:` items short-circuit (`collection.logic.ts:377-378`, `every`). So `and: ["status.lower() == 'a'", "_type == 'Project'"]` throws on every note in the vault that lacks `status`, while the reverse order throws only on Projects. A naive count therefore depends on item order and can read in the hundreds.
- The property index holds `.view` records, type definitions, system-folder notes and archived notes. The row rule removes them only after the filter step (`rail-shell/lens.logic.ts:717-734` `viewRowSet`, `:749-762` `blockRowSet`). A count taken inside the filter loop (`collection.logic.ts:167-176`) includes records the user never sees.
- No owner decision on any of this is recorded in the Issue.

**Preferred edit (split).** Replace the second bullet of "What to build" ("`executeQuery` returns how many records threw...") and the three count-related test bullets with nothing. Add to Notes:

> - **Out of scope:** counting per-note failures ("N notes could not be evaluated"). It moves to a new Issue, `needs-info`, because what counts is an owner decision: a note with no `status` throws on `status.lower()` (`methods.logic.ts:51-57`, `:255-269`), `and:` short-circuits so the count depends on item order (`collection.logic.ts:377-378`), and the row rule drops `.view`, type-definition, system-folder and archived records only after the filter (`lens.logic.ts:717-762`). 131 (view-editor 03) reads that count and must be blocked by the new Issue, not by 010.

Change **Size:** to `S`. Retitle to "Filters report unknown methods". Remove "per-note failures are counted" from the help-doc criterion.

**Fallback, if the owner keeps one Issue.** Replace the second bullet with:

> - `executeQuery` returns `unevaluatedCount: number` on `QueryResult` (`collection.types.ts:107-117`, JSDoc required). A record counts when at least one filter leaf threw on it and the filters then excluded it. A record a throwing leaf does not exclude (inside `or:` beside a true item, or inside `not:`) is listed today and is not counted. Count after the row rule: run the failed records through the same `rowSet` with `{ ...view, limit: undefined }`, so `.view` files, type definitions, system-folder notes and uncited archived notes never count; with no `rowSet`, count them all. A missing property counts (`status.lower()` on a note without `status`), and `and:` order changes the count; both are documented, and dispatch is not changed (Auto Organize relies on the throw, `auto-organize.logic.ts:64-80`). Text: `1 note could not be evaluated` / `N notes could not be evaluated`; nothing is rendered at 0. The rail list (selector `[data-note-list-unevaluated]`, outside the header count span, which is hidden below 12rem at `RailNoteList.svelte:725`), the `.view` tab (a separate element after `{n} results` at `CollectionView.svelte:587`; the test helper `resultsText()` at `CollectionView.test.ts:622-623` matches a span ending in `results`, so the text must not join that span) and the inline block (`collection-block-widget.ts:138-146`, beside `cm-lp-collection-error`; read `docs/agents/live-preview-rules.md` rule 2: the count rides in the cached `QueryResult`, with no new cache) all show it. `queryViewLens` returns it on `ViewQueryResult` (`lens.logic.ts:775-823`) and `resolveViewLens` on `ResolvedLens`.

and add the test bullets: `collection-block-widget.test.ts` (text shown, also on a cache hit); `lens.logic.test.ts` (`queryViewLens(...).unevaluatedCount`); `collection-logic.test.ts` (a `.view` record and an archived record that throw are not counted when a row set drops them; `or: [throwing, "true"]` keeps the row uncounted).

### 2. The validator rule is underspecified, and the obvious implementations are wrong.

Evidence (verified): dotted callees are split at the last dot, and only `objectPath === 'file'` is the file namespace (`evaluator.ts:478-485`). `file.<anything else>` throws even when a registry has that name, so `file.contains('a')` throws at runtime (`:595-596`). `methodCall` nodes (computed receivers such as `now().format()`) are created by the parser (`parser.ts:141-150`) and dispatch through the registry (`evaluator.ts:507-516`). The built-in lifecycle rules emit `file.folder.endsWith(...)` (`auto-organize/type-lifecycle-rules.ts:41`, `:54`). `dispatchMethod` uses an own-property check, so `constructor` and `hasOwnProperty` throw (`methods.logic.ts:248`, `:259-266`; tested at `methods.test.ts:665-674`). `any` also holds `toString` (`methods.logic.ts:221`).

Replace the first bullet of "What to build" with:

> - `validateExpression` reports `Unknown method "<name>"` for a method no call could reach. For a dotted callee, split at the last dot as `evaluateMethodCall` does (`evaluator.ts:478-480`). When the object path is exactly `file`, only the `evaluateFileMethod` cases are valid (`hasTag`, `inFolder`, `hasProperty`, `asLink`, `evaluator.ts:565-597`): export them as `FILE_METHODS`, with a source-reading drift test like the one for `PLAIN_FUNCTIONS` (`evaluator.test.ts:843-849`). Any other object path, and every `methodCall` node, accepts a name that is an own key of any `methodRegistry` entry (`methods.logic.ts:62-228`; derive the names from the registry, never a hand list, and never use `in`, which would accept `constructor`), plus `filter` and `map` (`evaluator.ts:492`, `:510`). Keep `Unknown function: <name>` for plain callees.

Add to the evaluator test bullet: rejected `file.contains('a')`, `now().reverse()`, `x.constructor()`, `if(true, x.reverse(), 1)`; accepted `file.folder.endsWith('x')`, `now().format('YYYY')`, `x.toString()`, and an `it.each` over every registry key and every `FILE_METHODS` name.

### 3. Contracts and docs that change and are not listed.

Evidence (verified):
- The mod API documents today's behavior as **stable**: "An error while evaluating the expression on one note (a method on a missing property, an unknown method) counts as no match for that note" (`help/documentation/mods/13-api-reference.md:136`), and "A typo in a method name (`file.hasTagg("x")`) matches nothing and does not reject" (`help/documentation/mods/10-querying-the-index.md:17`). After the fix, `query.matches` and `query.notes` reject (`plugins/mods/mod-query.service.ts:34-36`).
- Auto Organize uses the same validator for object-rule filters (`auto-organize.logic.ts:36-53`, `filterProblem`), property expressions (`:519-522`, `exprProblem`, which refuses the save in `AutoOrganizeRuleProperty.svelte:113`) and renames (`:594`, `renameProblem`; on load a refused rename is kept raw and logged, `auto-organize.service.ts:164-170`). `help/documentation/22-auto-organize.md:309` gives `.last()` as an example of an expression that fails at runtime. After the fix, Settings refuses to save it.

Add to "What to build":

> - This also changes two other callers of `validateExpression`. Mod `query.matches` / `query.notes` reject an unknown method instead of not matching (`mod-query.service.ts:34-36`). Auto Organize refuses one when a rule, property expression or rename is saved (`auto-organize.logic.ts:39`, `:521`, `:594`). Add one `filterProblem("file.hasLink('x')")` assertion to the auto-organize logic tests and one rejection test to the mod query tests.

Add criteria:

> - [ ] `help/documentation/mods/13-api-reference.md:136` and `help/documentation/mods/10-querying-the-index.md:17`: an unknown method rejects like an unknown function; a method that fails on one note's value still counts as no match.
> - [ ] `help/documentation/22-auto-organize.md:309`: an unknown method such as `.last()` is refused when the rule is saved.

Add to Notes, under Visible change: "Vault mods that call `query.*` with an unknown method start rejecting. The mod sources live outside this repo and were not checked."

### 4. The doc marker the Issue names does not exist.

Evidence (verified): `grep "view-engine-fixes/02" docs/agents/view-files.md` finds nothing. The item is `docs/agents/view-files.md:137` with `(changes: open-itens/010)`, and item 9 at `:351` has no marker.

Replace the criterion with:

> - [ ] `docs/agents/view-files.md:137`: unknown method names are a filter error; drop the `(changes: open-itens/010)` marker (keep the caveat that a method missing for one note's value type leaves that note out). Update item 9 at `:351` the same way.

### 5. The Notes contradict each other about 009.

Evidence (verified): the Notes say 010 "can run in parallel with view-editor 01 (no shared file)" and, two lines later, "Shares `CollectionView.svelte` with 01, which runs after this one". View-editor 01 is 009 (`priority-2026-11-08.md:83`). The owner's queue runs 009 before 010, and the series rule puts every VE and VD Issue in one group (`priority-2026-11-08.md:63`).

Replace both sentences with:

> - Shares `CollectionView.svelte` with 009 (view-editor 01) and `collection.logic.ts` / `evaluator.ts` / `collection-block-widget.ts` with 067 and 068: run in series with all three, never in parallel (`priority-2026-11-08.md:63`).

## Should-fix edits

- **Stale line references.** At HEAD: `evaluator.ts:308-338` (was `:300-332`), `:492` / `:510` (was `:490` / `:508`), `:565-597` (was `:563-584`); `collection.logic.ts:359-386`, catch at `:368-370`, `not` at `:383` (was `:347-358`, `:370-371`); `RailNoteList.svelte:200` (was `:192`). `methods.logic.ts:255-269` is still correct.
- **"The view-editor preview gets it through `queryViewLens`."** No preview exists at HEAD. The preview is 131's work (`131-sections-and-live-preview.md:20`, `:27`). If the count stays in 010 (fallback), say "`queryViewLens` returns it on `ViewQueryResult` for 131's preview". If it is split, delete the sentence.
- **131 does not depend on the count in its Blocked by.** 131's text says it runs after view-engine-fixes 02 and "relay-lite does not enforce this" (`131-sections-and-live-preview.md:51`), and its ledger row lists only `011` (`ledger.md:147`). Add the new count Issue (or 010, under the fallback) to 131's Blocked by. This edit is outside 010's file but follows from it.
- **067 is blocked by 010 in the ledger (`ledger.md:104`), yet the owner's queue runs 067 first.** `refute-067.md` already covers this (replace that blocker with a series note). If that edit is not made, 010 must move ahead of 067 in the queue.
- **Accepted-name tests pass today.** `status.lower()` and the other accepted shapes return undefined at HEAD, so only `file.hasLink('x')` and `x.reverse()` are red first. That is fine for TDD, but the Issue should say which assertions are expected to fail first, so an agent does not take a green accept-list for a broken test.

## Dossier errors (`dossier-010.md`)

- **Wrong attribution of Auto Organize call sites.** It says "`filterProblem`, `auto-organize.logic.ts:39,521,594`". Only `:39` is `filterProblem`. `:521` is `exprProblem` (property expressions, refused in Settings at `AutoOrganizeRuleProperty.svelte:113`) and `:594` is `renameProblem` (also run at load, `auto-organize.service.ts:165`). Its claim that "only object rules gain the new check" is therefore wrong: property expressions and renames gain it too.
- **Misses the stable mod API contract.** It lists `mod-query.service.ts:35 (throws)` as a consumer but does not see that `help/documentation/mods/13-api-reference.md:136` and `mods/10-querying-the-index.md:17` promise today's no-reject behavior for unknown methods. It also misses `22-auto-organize.md:309`.
- **The `any` registry.** It read only up to `isType` and guessed at the rest. `any` also holds `toString` (`methods.logic.ts:221`). Its plan derives names from the registry, so this does no harm, but it does not warn about `in` versus own keys (`constructor`, `hasOwnProperty`; `methods.test.ts:665-674`).
- **HEAD.** It cites `1198d8e7b`. HEAD is now `318b6e9b5`, a docs-only commit, and its line numbers still hold.
- **Correct and verified:** the stale-ref table, the marker mismatch, the missing inline-block test, the rail count span hidden at `@max-[12rem]` (`RailNoteList.svelte:725`), the over-count from row-rule records (D1), the noise from missing properties (D2), and Auto Organize relying on the throw inside `not` (`auto-organize.logic.ts:64-80`). It surfaces D1 to D3 as owner decisions but still presents a full single-Issue plan. Under this owner's preference for low complexity, splitting is the cleaner answer.

## Not verified

- Whether the owner's `.view` files or vault mods (sources outside this repo, not searched) call methods in filters. That determines both the real impact and who is hit by the mod `query.*` rejection.
- No test was run. The "fails today" claims come from reading `validateExpression` and `executeQuery` only.
