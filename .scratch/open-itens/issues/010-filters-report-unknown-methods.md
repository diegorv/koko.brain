# 010: Filters report unknown methods

**Origin:** `view-engine-fixes` Issue 02, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/view-engine-fixes/`. Issue numbers in the text below are this folder's numbers; `priority-2026-11-08.md` in this folder maps them to the origin numbers.

**What to build:** `validateExpression` checks only parsing and plain function names (`src/lib/features/collection/expression/evaluator.ts:308-338`): `findUnknownFunction` skips every dotted callee (`:323`) and never checks a `methodCall` node's method. Methods dispatch on the value's runtime type and throw when absent (`methods.logic.ts:255-269`), `evaluateFileMethod` throws on any other `file.` method (`evaluator.ts:565-597`), and `evaluateFilterCached` turns a throw into `false` (`collection.logic.ts:359-386`, catch at `:368-370`). So a filter such as `file.hasLink('x')` or `x.reverse()` drops every note with no error, in the rail, the `.view` tab and inline blocks. Inside `not:` the same failure keeps the note instead (`:383`).

- `validateExpression` reports `Unknown method "<name>"` for a method no call could reach. For a dotted callee, split at the last dot, as `evaluateMethodCall` does (`evaluator.ts:478-480`). When the object path is exactly `file`, only the `evaluateFileMethod` cases are valid (`hasTag`, `inFolder`, `hasProperty`, `asLink`): export them as `FILE_METHODS`. Any other object path, and every `methodCall` node (a computed receiver such as `now().format()`), accepts a name that is an own key of any `methodRegistry` entry (`methods.logic.ts:62-228`), plus `filter` and `map`, which the evaluator handles for lists (`evaluator.ts:492`, `:510`). Derive the registry names from its keys, never a hand list, and never test with `in`, which would accept `constructor` (`dispatchMethod` uses an own-key check, `methods.logic.ts:248`). Keep `Unknown function: <name>` for plain callees.
- This also changes two other callers of `validateExpression`. Mod `query.matches` and `query.notes` reject an unknown method instead of not matching (`src/lib/plugins/mods/mod-query.service.ts:34-36`). Auto Organize refuses one when a rule filter, a property expression or a rename is saved (`auto-organize.logic.ts:39` `filterProblem`, `:521` `exprProblem`, `:594` `renameProblem`).
- Runtime evaluation does not change: `dispatchMethod` and `evaluate` stay as they are. A method that exists but not for one note's value type (`status.lower()` on a number or a missing `status`) still leaves that note out; counting those notes is Issue 250.

**Blocked by:** none

**Status:** ready-for-agent

**Answered:** owner, 2026-11-12: the per-note failure count moves to Issue 250 (needs-info), and this Issue keeps only the validator. Vault mods that call `query.*` with an unknown method start getting an error instead of no match; accepted. Nothing open.

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first, in `src/tests/lib/features/collection/expression/evaluator.test.ts` § `validateExpression`:
  - Red today: `file.hasLink('x')`, `x.reverse()`, `file.contains('a')`, `now().reverse()`, `x.constructor()` and `if(true, x.reverse(), 1)` each return a reason containing `Unknown method "<name>"`.
  - Guards (green today, must stay green): `status.lower()`, `tags.filter(value != 'x')`, `tags.map(value)`, `file.hasTag('a')`, `file.inFolder('/v')`, `file.hasProperty('a')`, `file.asLink()`, `file.folder.endsWith('x')` (what the lifecycle rules emit, `type-lifecycle-rules.ts:41`, `:54`), `now().format('YYYY')` and `x.toString()` return none, plus an `it.each` over every registry key and every `FILE_METHODS` name. The existing `Unknown function: <name>` assertions stay green.
  - A drift test: `FILE_METHODS` equals the cases of `evaluateFileMethod`, read from the source like the `PLAIN_FUNCTIONS` test (`evaluator.test.ts:843-849`).
- [ ] `src/tests/lib/features/auto-organize/auto-organize.logic.test.ts`: `filterProblem("file.hasLink('x')")` returns a reason. `src/tests/lib/plugins/mods/mod-query.service.test.ts`: `query.matches` with `file.hasLink('x')` rejects with the `Invalid filter` message.
- [ ] `help/documentation/12-collection.md` § Expression Language Reference: an unknown method is an error, like an unknown function.
- [ ] `help/documentation/mods/13-api-reference.md:136` and `help/documentation/mods/10-querying-the-index.md:17`: an unknown method rejects like an unknown function; a method that fails on one note's value still counts as no match for that note.
- [ ] `help/documentation/22-auto-organize.md:309`: an unknown method such as `.last()` is refused when the rule is saved.
- [ ] `docs/agents/view-files.md:137`: unknown method names are a filter error; drop the `(changes: open-itens/010)` marker, and keep the caveat that a method missing for one note's value type leaves that note out (add `(changes: open-itens/250)` to that caveat). Update gotcha 9 at `:351` the same way.

## Notes

- **Visible change:** a view whose filter calls a method that does not exist lists 0 notes today and shows a filter error after this, which also hides the rail's Sort and Filter (`RailNoteList.svelte:200`). Such a view is already broken, so this is ready-for-agent. Issue 141 differs because the shapes it turns into errors list notes today.
- **Mods:** vault mods that call `query.*` with an unknown method start rejecting. The mod sources live outside this repo and were not checked. No `.view` under `help/`, `e2e/` or `src/tests/fixtures/` calls a method missing from the registry (cross-tests-relay M8), so the shipped examples keep working.
- **Out of scope:** the per-note failure count ("N notes could not be evaluated"), now Issue 250. 131 needs that count and should wait for 250, not for this Issue.
- **Series:** views chain `068 -> 009 -> 070 -> 010 -> 067 -> 012 -> 047`. This Issue edits `evaluator.ts` and `methods.logic.ts`, which 067, 047 and 098 also edit; run it in series with them, never in parallel. It no longer touches `CollectionView.svelte`, `RailNoteList.svelte` or `lens.logic.ts`.
- **Size:** S.

## Comments

- 2026-11-12: deep dive (`research/deep-dive-2026-11-12/`, refute-010). Split the per-note count into Issue 250 and retitled. Spelled out the validator rule (last-dot split, `file.` namespace, own registry keys, `filter`/`map`) with red and guard tests. Added the mod `query.*` and Auto Organize contract changes and their docs. Fixed the doc marker (it is `view-files.md:137`, not "view-engine-fixes/02") and the stale line numbers. Replaced the contradictory 009 parallel note with the series note; 010 shares no file with 009.
