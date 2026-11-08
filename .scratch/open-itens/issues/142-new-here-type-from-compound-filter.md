# 142: New here infers the type from a compound `&&` filter

**Origin:** `view-engine-fixes` Issue 14, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/view-engine-fixes/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** `viewNoteType` skips raw rows (`src/lib/features/rail-shell/lens.logic.ts:879-893`), and `parseFilterToGroups` keeps a string with `&&` as one raw row (`src/lib/features/collection/toolbar/filter.logic.ts`). The help's own example `filters: 'type == "Project" && status == "active"'` (`help/documentation/25-types-and-relationships.md:396`) therefore makes **New here** create a plain note, which the view does not list.

- In `parseFilterToGroups`, when the filter (or an `and:` item) is a string, split it on top-level `&&` (outside parentheses and strings) into `and` rows, each parsed as today. Strings with `||` or parentheses that span the split stay one raw row.
- Split there, not in `parseExpressionToRow`: `filter-logic.test.ts:179-182` pins that `parseExpressionToRow` keeps a `&&` string raw, and changing that needs owner approval.

**Blocked by:** 141

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first:
  - `src/tests/lib/features/rail-shell/lens.logic.test.ts`: `'type == "Project" && status == "active"'` gives the type `Project`.
  - The filter-logic test file: the split gives two editable rows; `"(a || b) && c"` gives a raw row and an editable row; a `&&` inside a string literal does not split.

## Notes

- **Size:** S-M.
