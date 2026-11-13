# Issue 07 discovery: property actions `remove` and `add`

Builds on Issue 01 (`work/01/`): same planner (`ownedProperties` -> `propertiesToWrite` -> `applyPropertyWrites`), same single `updateNoteFrontmatter` call inside `writingPaths`, same test helpers. Only the modes differ.

## Files that change

- `src/lib/features/auto-organize/auto-organize.types.ts:14-25`: `RuleValue` alias; `RuleProperty.value` optional (a `remove` has none); `mode` gains `'remove' | 'add'`.
- `src/lib/features/auto-organize/auto-organize.logic.ts`
  - `:197-219` `ruleValueEditor(key, value, mode)`: `none` for `remove`, `items` for `add`; `RuleValueEditor` gains both. New `parseRuleItems(text)` (comma split, trim, drop blanks) for Settings.
  - `:226-239` `sanitizeRuleProperties`: `remove` skips the value and lifecycle checks and is returned as `{ key, mode }` (a stray value is stripped); `add` needs a string or `string[]` with at least one non-blank item, else dropped. `todoist_project` stays refused for every mode.
  - `:281-287` `propertiesToWrite(current, owned, onSkip?)`: `remove` when the key exists (any value); `add` when an item is missing; an `add` on a number or boolean calls `onSkip` and writes nothing.
  - `:301-310` `applyPropertyWrites`: `remove` filters the key out; `add` writes the merged list (`list` type).
- `src/lib/features/auto-organize/auto-organize.service.ts:315-318`: first `propertiesToWrite` pass gets an `onSkip` that logs `error` once per rule id per session (new set, cleared in `resetAutoOrganize`); the `mutate` pass gets none.
- `src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte`: mode menu labels `remove` / `add to list`; `remove` hides the value field; `add` shows a text field of comma-separated items saved as `string[]`; a mode change coerces the value (drop it for `remove`, `''` when the target mode cannot take the old value, `false` for a lifecycle key); `commitKey` does not coerce `remove` / `add` rows.
- `help/documentation/22-auto-organize.md:62,192,248-274`: modes table, one example each, lifecycle default, `_archived` folder note, inline tags, `remove tags` warning, Settings editor rows.

## Add semantics (`listAfterAdd`)

Items: trimmed, blanks dropped; on canonical key `tags` a leading `#` is stripped from items and from existing values when comparing. Absent or empty value: new list. List: append missing items in order. Single string: `[old, ...missing]`, no write when nothing is missing. Number or boolean: skip. A nested map never reaches the planner (lossy gate, amendment 4).

## Tests (test-first)

- `auto-organize.service.test.ts` `describe('rule properties')`: acceptance `tags: [a]` -> `[a, work]`, unchanged at `[a, work]` (fails today, `add` is dropped by the loader check); absent key; single string; number logs once over two saves (copy `logs a failed property write once per rule`); remove present / absent; remove `_archived`; higher `if-missing` on `tags` blocks lower `add`; load drops a boolean `add` and strips a remove's value.
- `auto-organize.logic.test.ts`: sanitize, `propertiesToWrite`, `applyPropertyWrites`, `ruleValueEditor`, `parseRuleItems` cases.
- `AutoOrganizeRuleRow.test.ts` `Set properties`: picking `remove` saves `{ key, mode: 'remove' }` and hides the value field; picking `add to list` and typing `a, , b` saves `['a', 'b']`.

## Defaults taken

- The skip log is `error` (visible, like the failed-write log), keyed by rule id, message names rule, key and note.
- A stray `value` on a `remove` is stripped on load, so the next save does not keep a misleading `{ tags, value: draft, remove }`.
- `add` values are stored as written (no normalization on load); trimming happens when applied. Settings always saves `add` items as a list.
- Help examples go in the Set properties section, not in `## Examples` (not run by `auto-organize-doc-examples.test.ts`).

## Risks

- `RuleProperty.value` optional: every `if-missing` / `always` use relies on `sanitizeRuleProperties` (via `ownedProperties`) having checked it.
- Settings row `doesNothing` follows the loader, so a `remove` row with a key counts as a consequence.
