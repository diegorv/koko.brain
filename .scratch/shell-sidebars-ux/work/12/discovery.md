# Discovery: Issue 12, the rail note list says why it is empty

No `spec.md` exists for shell-sidebars-ux; the Issue and `research/verdict-nl-empty-states.md` (T1) are the spec.

## Files that change

- New `src/lib/components/EmptyState.svelte`: `title`, `hint`, `icon` (component), `action { label, onclick }`, `compact`, `spinner`, `class`, rest props. Title `<p data-empty-state-title>`, hint `<p data-empty-state-hint>`, button `data-empty-state-action`. Imports only lucide and `#lib/utils.js` (`cn`).
- New `src/lib/features/rail-shell/list-empty.logic.ts`: `explainEmptyList(input)` and one `LIST_EMPTY_COPY` table (lens copy, action labels, view-status copy). Precedent `explainEmptyTasks` (`task-query.logic.ts:1436`).
- `src/lib/features/rail-shell/RailNoteList.svelte`:
  - `:815` grouped branch becomes `groupedItems && !(searching && notes.length === 0)`.
  - `:844-851` Loading and Missing through `EmptyState` (spinner; Missing hint); `:855-858` Error gains the hint inside `role="alert"`.
  - `:872-879` replaced by one branch rendering `explainEmptyList(...)` with the hook its `state` names (`data-note-list-searching | -no-matches | -empty`).
  - New `hiddenArchivedCount` derived (`resolveLens(shownLens, ctx, providers, 'all').notes.length`, only for a type or Untyped list empty under `active`) and `runEmptyAction` (query, `filterOpen`, `archivedFilter`). No header edits.
- `help/documentation/25-types-and-relationships.md:448-457`, `docs/adr/0003-four-layer-source-taxonomy.md:66` (layout list) and `CLAUDE.md` layer table: `components/` outside `ui/`.

## Plan

1. Failing `list-empty.logic.test.ts`, then the logic. Commit.
2. `EmptyState.test.ts`, then the component. Commit.
3. Failing `RailNoteList.search.test.ts` Today no-match case and the other component cases (`RailNoteList.test.ts`, `.view.test.ts`), then the wiring; move the text pins listed in the Issue to the title element. Commit.
4. Help, ADR-0003, CLAUDE.md. Commit.

## Prior art

- Mount, `settle`, `pickArchived`: `RailNoteList.toolbar.test.ts:327-345`; FTS pending: `RailNoteList.toolbar.test.ts:430-445` (`mockImplementation(() => new Promise(() => {}))`).
- View seeding with filters: `RailNoteList.view.test.ts` fixtures; write check via `writeTextFile` mock.

## Defaults taken

- `explainEmptyList` also returns `state: 'searching' | 'no-matches' | 'empty'` so the component picks the hook and `compact`; `action` is the id, labels come from the copy table.
- `{label}` in the type copy is the type's name (`lens.target`, e.g. "Project"), not its plural sidebar label ("Projects"), so "No Project notes yet" and "All 1 Project notes are archived" read as sentences; Untyped uses "Untyped".
- A provider lens (Calendar day) and Today (not searching) never reach the flat branch with copy of their own: unknown kind gives "Nothing to show here", no hint.
- `hiddenArchivedCount` reads the unsearched list (`resolved.notes`); searching wins anyway.
- Today's empty group keeps its existing "Nothing here" markup.

## Risks

- bits-ui Popover opened by `filterOpen = true` from a button outside it: the click lands before the popover exists, so no outside-click close; the test checks it is still open after a tick.
- One frame of no-match before `fullTextLoading` flips true (the FTS effect runs after render); the test reads after settle.
