# 08: Property values can be computed with the expression engine

**What to build:** a property consequence can take its value from an expression, evaluated by the same engine as the filter, instead of a literal. Examples:
- `due: today() + "7d"`;
- `title: file.basename`;
- `area: file.folder.split("/").last()`.

Read the PRD and Issues 01 and 07 first. Paths use the names after Issue 06 (`features/auto-organize/`).

**Blocked by:** 07

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

### Behavior

1. **Type.** `RuleProperty` gets an alternative to `value`: `expr: string`. Exactly one of the two must be present; an entry with both or neither is dropped on load. `remove` ignores both.
2. **Evaluation.** The expression is evaluated against the same record as the filter, with `vaultPath` (`EvalContext`). The result is written with its own type:
   - a string, number, boolean or list is written as is;
   - a date is written as `YYYY-MM-DD`, unless the expression contains `now()`, which writes the full ISO date and time.
   
   With `add`, the items of the result are added.
3. **Failures.** A result of `null` or `undefined`, or an expression that throws, writes nothing for that key. It is logged once per rule per session.
4. **Volatile values.** An `always` action whose `expr` uses `now()`, `file.mtime` or `file.ctime` is refused, on load (dropped and logged) and in Settings (inline error, not saved). With `if-missing`, they are allowed, for example to stamp a creation date once.
5. **Real file stats.** Rules today build the record with `buildNoteRecord(filePath, content, Date.now(), Date.now())`, which gives size 0 (`auto-organize.service.ts`). Read `mtime`, `ctime` and `size` from the property index record for the path when it exists (`collectionStore.propertyIndex`). Fall back to now, now and the content length. This also fixes filters that use `file.mtime`, `file.ctime` and `file.size`.
6. **Settings.** Each property row gets a "value / expression" switch:
   - an expression is validated with the evaluator's validator;
   - it shows a preview of the result for the active note: "Result for <note>: ...", or "no value".

### Docs

The help page gets a "Computed values" section with the three examples above and the volatile rule. The trap line Issue 06 added for `file.mtime`, `file.ctime` and `file.size` changes: in rules they are now the file's real values once the note is indexed.

### Acceptance

- [x] Failing test first, in the service test: `{ key: 'title', expr: 'file.basename', mode: 'if-missing' }` writes the note's base name.
- [x] `{ key: 'due', expr: 'today() + "7d"', mode: 'if-missing' }` writes `YYYY-MM-DD` seven days ahead; an expression with `now()` writes a date-time.
- [x] An expression that throws, or returns null, writes nothing and logs once.
- [x] `always` with `now()`, `file.mtime` or `file.ctime` is dropped on load and refused in Settings; `if-missing` with them is accepted.
- [x] A filter `file.size > 0` matches a note that has an index record, and `file.mtime` equals that record's mtime.
- [x] Settings: the switch saves `expr`, an invalid expression shows the validator's error, and the preview shows the active note's result.
- [x] Docs updated. Frontend gate passes.

## Review amendments (2026-11-10)

From the scout and adversarial reviews in `.scratch/frontmatter-rules/research/issue-review-08*.md` and `issue-review-cross.md`. **These override the Behavior and Acceptance above where they differ.** The run order and the shared gates are in `PRD.md`, "Run order and gates for Issues 07-13".

1. **Failures** (Behavior 3) also include a non-finite number (`NaN`) and an invalid date. `"a" + "b"` is `NaN`, because `+` does not join text (`evaluator.ts:248-251,277`). The help page says to use `["a", "b"].join("")`. Add an acceptance case.
2. **Volatile values** (Behavior 4): refuse `now()`, `file.mtime`, `file.ctime` **and `file.size`** with `always` **or `add`**. With `add`, each save would append a new item.
3. **Lifecycle keys:** on `_organized`, `_archived` and `_favorite`, only a boolean result is written. Any other result is a failure (PRD Decision 10).
4. **`add` with `expr`** (amends Issue 07 Behavior 1): an `add` needs a `value` or an `expr`. Only a string or `string[]` result is added; any other result is a failure. `remove` rows show no value/expression switch.
5. **Dates** (Behavior 2): written as the **local** `YYYY-MM-DD`, or the local `YYYY-MM-DDTHH:mm:ss` when the expression uses `now()`. Never `toISOString()`: that is UTC, and it is read back as text (`properties.logic.ts:40`).
6. **Example fixed:** `.last()` does not exist (`methods.logic.ts:140-169,269`). Use `file.folder.split("/").slice(-1).join("")`, and add an acceptance case for it.
7. **Real stats** (Behavior 5): a record whose `mtime` or `ctime` is `<= 0` counts as missing, so use the fallback. A new note's index record is 0 until the Rust delta lands (`collection.service.ts:153-160`), and `created: file.ctime` would otherwise stamp 1970. The values are "as of the last index refresh". Drop the claim that this fixes `file.mtime` filters, and keep the help-page trap for `file.mtime`.
8. **Tests** with `today() + "7d"` pin a date range with no DST change (for example 2026-06-10). The help page gets one line: durations are fixed hours, so across a DST change the result can be a day off.

9. **Carried over from Issue 07's review (open nit):** in Settings, `fitted` (`src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:64`) turns any one-item list into a plain value when the key is renamed or the mode is switched. That also catches a hand-written `always` list, which silently changes the rule. Only flatten a list that came from `add` mode. Add a test: an `always` row with `["a"]` keeps its list after a key rename.

## Notes

- **Owner decisions, 2026-11-10 survey:**
  - volatile values only with `if-missing`;
  - dates as `YYYY-MM-DD` unless `now()`;
  - read the real stats from the index;
  - a switch plus a preview in Settings.
- The research warns against `{var}` or `<% %>` template syntax: use the one engine (`.scratch/frontmatter-rules/research/validation-01.md` M6).

## Comments

- 2026-11-11, branch `issue/08-computed-property-values`: rule properties take an `expr` computed by the expression engine (dates as `YYYY-MM-DD` unless `now()`, volatile values only with `if-missing`, real stats from the index), with a Settings switch and preview. Fix round after review 1: a refused expression is saved with the mode the user switches to (db312a1be). Review round 1: APPROVED; round 2: APPROVED (one optional minor nit left: a key rename after a refused expression is also refused). Targeted checks: `pnpm check` 0 errors; auto-organize tests 382 passed. Full suite at db312a1be: 609 files, 15194 tests passed, 54 skipped.
