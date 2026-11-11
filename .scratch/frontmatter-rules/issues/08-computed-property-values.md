# 08: Property values can be computed with the expression engine

**What to build:** a property consequence can take its value from an expression, evaluated by the same engine as the filter, instead of a literal. Examples: `due: today() + "7d"`; `title: file.basename`; `area: file.folder.split("/").last()`. Read the PRD, Issue 01 and Issue 07 first.

**Blocked by:** 07

**Status:** needs-triage

### Proposal

- `RuleProperty` gets an alternative to `value`: `expr: string`. Exactly one of the two is present; an entry with both or neither is dropped on load.
- The expression is evaluated against the same record as the filter, with `vaultPath` (`EvalContext`). The result is written with its own type: string, number, boolean, list, or a date as an ISO `YYYY-MM-DD` string.
- A result of `null`, `undefined` or an error writes nothing for that key. It is logged once per rule per session.
- Modes: `if-missing` and `always` work. `add` adds the result's items. `remove` ignores `expr`.

### Questions for triage

1. **Volatile values.** `now()`, `file.mtime` and `file.ctime` change on every save, and in rules mtime and ctime are the moment of the save (Issue 06 documents this). With `always`, the note would be rewritten on every save, with a File History snapshot and a reindex each time. The recommended answer: refuse `now()`, `file.mtime` and `file.ctime` in an `always` expression, at load and in Settings, and allow them with `if-missing`.
2. **Dates.** Should a date result be written as `YYYY-MM-DD`, or with the time when the expression returns one? The recommended answer: a date only, unless the expression contains `now()`.
3. **Should the real mtime and ctime be read** from the index here, so `file.mtime` means the file's date? Today rules build the record with `Date.now()` (`auto-organize.service.ts`, `buildNoteRecord`). The recommended answer: yes, read them from the property index when the note has a record there, falling back to now. That also fixes the trap Issue 06 documents.
4. **Settings:** a "value / expression" switch on each property row, with the same validator and an inline preview of the result for the active note?

### Acceptance (draft, final after triage)

- [ ] `{ key: 'title', expr: 'file.basename', mode: 'if-missing' }` writes the note's base name.
- [ ] `{ key: 'due', expr: 'today() + "7d"', mode: 'if-missing' }` writes a date seven days ahead.
- [ ] An expression that throws or returns null writes nothing and logs once.
- [ ] The volatile rule from question 1 is enforced as decided.
- [ ] Docs and Settings updated. Frontend gate passes.

## Notes

- **Origin:** owner request on 2026-11-10, after the MVP. The research warns against `{var}` or `<% %>` template syntax: use the one engine (`.scratch/frontmatter-rules/research/validation-01.md` M6).

## Comments
