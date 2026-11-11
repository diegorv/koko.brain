# Issue 08 discovery: computed property values (`expr`)

Builds on Issue 07 (`work/07/`): same planner (`ownedProperties` -> `propertiesToWrite` -> `applyPropertyWrites`), same single `updateNoteFrontmatter` call, same test helpers (`rule`, `saveAndRun`, `lastWrite`). What differs: an owned `expr` is resolved to a literal `value` once, before the planner, so the two `mutate` passes see the same value.

## Files that change

- `features/auto-organize/auto-organize.types.ts:17-32`: `RuleProperty.expr?: string`.
- `features/auto-organize/auto-organize.logic.ts`
  - `:284-301` `sanitizeRuleProperties(raw, onRefused?)`: non-remove entries need exactly one of `value` / `expr`; blank or non-string `expr` dropped; `expr` with `always` / `add` that reads `now()`, `file.mtime`, `file.ctime`, `file.size` dropped and reported through `onRefused`; `add` on a lifecycle key dropped (as with a literal).
  - new `volatileInputs(expr)` (AST walk: `now` call, `file.mtime|ctime|size` member or dotted callee), `exprProblem(expr, mode)` (evaluator `validateExpression` + volatile refusal; for Settings), `computeRuleValue(property, ctx)` (evaluate + convert: string / finite number / boolean / text list as is, valid Date as local `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss` with `now()`; lifecycle keys boolean only; `add` text or text list only; anything else a failure with a reason), `resolveComputedProperties(owned, ctx, onFail)`, `ruleRecordStats(indexed, content, now)` (index stats when `mtime > 0 && ctime > 0`, else now, now, UTF-8 length).
  - `propertyType` unchanged: a date text is serialized as a plain scalar and reads back as `date` (`properties.logic.ts:40`).
- `features/auto-organize/auto-organize.service.ts`
  - `:95-99` `withValidProperties` passes `onRefused` -> `error(...)` naming rule and key.
  - `:210` record from `buildNoteRecord(filePath, content, ...ruleRecordStats(collectionStore.propertyIndex.get(filePath), content, Date.now()))`.
  - `:300-329` `writeRuleProperties` gets the record; after the gate, resolves owned `expr`s with `resolveComputedProperties`; a failure is logged once per rule per session (new set, cleared in `resetAutoOrganize`) and the key writes nothing (still owned).
- `AutoOrganizeRuleProperty.svelte`: a "Value / Expression" Select on non-remove rows; expression field commits on change, validated by `exprProblem`, inline error and no save when refused (commit and mode change); preview "Result for <note>: ..." / "no value" for `editorStore.activeTab`, record built like the service. `fitted` keeps `expr` and flattens a one-item list only when the old mode was `add` (amendment 9).
- `help/documentation/22-auto-organize.md`: "Computed values" under Set properties; trap line at `:179`.

## Tests (test-first)

- `auto-organize.service.test.ts` `describe('computed values')` in `rule properties`: `file.basename` (first, fails today: the loader drops a value-less entry), `today() + "7d"` with system time 2026-06-10, `now()` date-time, folder slice example, throw / null / NaN each write nothing and log once over two saves, lifecycle key text result fails, `add` with `file.tags`-like list; load drops `always`+`now()`, `add`+`file.size`, both/neither, keeps `if-missing`+`file.ctime`; real stats: `file.size == 512` with an index record, `number(file.mtime)` equals the record's mtime, a `ctime: 0` record falls back to now.
- `auto-organize.logic.test.ts`: `volatileInputs`, `exprProblem`, `computeRuleValue`, `ruleRecordStats`, sanitize cases.
- `AutoOrganizeRuleRow.test.ts` `Set properties`: switch saves `expr`; invalid expr shows the validator error, not saved; `always` + `now()` refused; preview with an active tab; `always` `["a"]` keeps its list after a key rename.

## Defaults taken

- A list result is written only when every item is text; other lists are a failure (literal lists are text-only too).
- Switching to Expression saves `{ key, expr: '', mode }` (blank `expr` is dropped by the loader and ignored by runs, like a blank key); switching back gives the key's default value.
- `onRefused` logs only the volatile refusal; other invalid entries stay silently dropped as today.
- Expression text is not parsed on load beyond the volatile walk; a parse error fails at run time (logged once).

## Risks

- `editorStore.activeTab` is in the same window as Settings (`app/SettingsPanel.svelte`), so the preview reads the last active note.
- The record is the pre-move one, so `file.folder` in an expr of a moving rule is the old folder (documented).
