# 013: The Filter panel cannot write an empty or unparseable filter

**Origin:** `view-engine-fixes` Issue 07, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/view-engine-fixes/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** three ways the live Filter panel writes a filter that breaks the view:
- **Add filter persists an empty row.** `addFilter` appends `createEmptyFilterRow(...)` (`src/lib/features/collection/toolbar/FilterPanel.svelte:73-85`), and the rail and the editor persist each change at once (`RailNoteList.svelte:304-357`, `CollectionView.svelte:380-388`). The list empties and the file is rewritten before a value is typed.
- **The picker offers keys the language cannot reference.** It lists every indexed key (`filter.logic.ts:221-236`) and emits the name unquoted (`:41-46`). A key with a space or a non-ASCII letter does not parse ("Unexpected token after expression"). The error status then hides Sort and Filter (`RailNoteList.svelte:192`), and the only way out is Open view.
- **Date values are not escaped** (`filter.logic.ts:71-78`; `quoteString` escapes only strings, `:549-552`), so a `'` in a date value breaks the expression.

Fix:
- A row whose operator takes a value and has none is a draft: the panel shows it, the live toolbars do not persist it.
- The **filter** picker leaves out keys the tokenizer cannot read as one identifier (ASCII letters, digits, `_`, and `-` followed by a letter). The Sort pickers keep them: they read from the same `getAllKnownProperties` list (`CollectionView.svelte:214-218`, `RailNoteList.svelte:175`), and sorting by an exact key such as `due date` works (`collection.logic.ts:423`). So filter the list where `FilterPanel` receives it, not inside `getAllKnownProperties`.
- Date values go through the same escaping as strings.

**Blocked by:** 012, 010

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first:
  - `src/tests/lib/features/collection/toolbar/` (the filter-logic test file): a date value containing `'` emits an expression that `validateExpression` accepts; the filter picker over a record with `due date` and `título` offers neither, while the Sort picker still offers `due date`.
  - `src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts`: Add filter writes nothing (the mocked write is not called), and the list still renders its rows.

## Notes

- Blocked by 01 only because both edit `CollectionView.svelte`.
- Urgent for the owner: their vault has property names with accents or spaces (2026-11-06), so picking one in the Filter panel locks the rail's Sort and Filter today.
- **Other feature:** never in parallel with view-editor 04, which also edits `RailNoteList.svelte`. relay-lite does not enforce this.
- The view-editor dialog already blocks blank values on Save; this Issue is about the live toolbars.
- **Size:** M.
