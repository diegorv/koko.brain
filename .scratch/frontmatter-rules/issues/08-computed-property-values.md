# 08: Property values can be computed with the expression engine

**What to build:** a property consequence can take its value from an expression, evaluated by the same engine as the filter, instead of a literal. Examples:
- `due: today() + "7d"`;
- `title: file.basename`;
- `area: file.folder.split("/").last()`.

Read the PRD and Issues 01 and 07 first. Paths use the names after Issue 06 (`features/auto-organize/`).

**Blocked by:** 07

**Status:** ready-for-agent

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

- [ ] Failing test first, in the service test: `{ key: 'title', expr: 'file.basename', mode: 'if-missing' }` writes the note's base name.
- [ ] `{ key: 'due', expr: 'today() + "7d"', mode: 'if-missing' }` writes `YYYY-MM-DD` seven days ahead; an expression with `now()` writes a date-time.
- [ ] An expression that throws, or returns null, writes nothing and logs once.
- [ ] `always` with `now()`, `file.mtime` or `file.ctime` is dropped on load and refused in Settings; `if-missing` with them is accepted.
- [ ] A filter `file.size > 0` matches a note that has an index record, and `file.mtime` equals that record's mtime.
- [ ] Settings: the switch saves `expr`, an invalid expression shows the validator's error, and the preview shows the active note's result.
- [ ] Docs updated. Frontend gate passes.

## Notes

- **Owner decisions, 2026-11-10 survey:**
  - volatile values only with `if-missing`;
  - dates as `YYYY-MM-DD` unless `now()`;
  - read the real stats from the index;
  - a switch plus a preview in Settings.
- The research warns against `{var}` or `<% %>` template syntax: use the one engine (`.scratch/frontmatter-rules/research/validation-01.md` M6).

## Comments
