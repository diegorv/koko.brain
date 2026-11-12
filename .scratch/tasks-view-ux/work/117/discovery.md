# 117 discovery: property clause, group header actions

No `spec.md` in `.scratch/tasks-view-ux/`; the Issue is the spec. 112 (rows carry `properties`) and 245 (Sources panel, `.scratch/tasks-view-ux/work/245/`) have landed. This repeats 245's panel pattern; only the differences are listed.

## Files that change
- `src/lib/features/tasks/task-query.logic.ts`: `TaskSourceClause` (:291-299) gains `{ kind: 'property'; key; op; value? }`; `clauseTest` (:409-438) gets its case; `clauseWords` (:862-881) its words (the `negate` read at :863 narrows to the kinds that have one). New pure `onlyThisFolder`, `hideFolder`, `hideNote` returning a new `TaskQuery`.
- `src/lib/features/tasks/SourcesPanel.svelte`: `CLAUSE_KINDS` (:24) adds Property; `emptyClause` / `clauseValue` / `withValue` (:57-96) handle it; the row (:189-239) shows a Key field, an op dropdown and a Value field (hidden for `exists`); the Not switch stays off property clauses (`isNot` is the negation).
- `src/lib/features/tasks/TasksView.svelte`: `groupHeader` (:655-693) adds the actions at the end of the Note header and of the Folder header.
- `help/documentation/10-tasks-and-todoist.md`: Sources section (:101-117) and grouping text.

## Plan (commits)
1. discovery.md.
2. Failing `task-query.logic.test.ts` property suite (each op on string, number, boolean, list, missing key, empty values, object) and sentence words; then the clause in logic + panel.
3. Failing tests for `onlyThisFolder` / `hideFolder` / `hideNote` (no cards, one card, two cards, already present); then the functions.
4. Failing component tests; then the header buttons.
5. Help doc.

## Tests (prior art)
- `task-query.logic.test.ts` `selectSourceRows` folder/type suites (`note`, `select`, `card` helpers) and `describeTaskQuery`.
- Component tests go in `TasksView.sources.test.ts`, not `TasksView.test.ts`: the Sources panel tests and their helpers (`only`, `type`, `addClause`, `until`, `EXCEPT`) live there since 245 split the file. Real stores, IPC mocked through `mockTaskFetch` (`entries` with `frontmatter`).

## Defaults taken
- A property clause is inactive (matches every row) when its key is blank after trim, or when its op is not `exists` and its value is blank after trim. The key is trimmed, then matched case-sensitively; the value is trimmed and compared ignoring case.
- `isNot` on an object value passes (negation of `is`, which never matches an object). `exists` on an object or `{}` passes (only `null`, `''`, `[]` count as empty). List elements that are objects or null never match `is` / `contains`; `null` scalar never matches either.
- Sentence words: `where status is active`, `where status is not active`, `where status contains act`, `where status is set`.
- The panel's op dropdown is a DropdownMenu radio group, as the view's other menus; switching to `exists` keeps the typed value (hidden, ignored), so switching back restores it.
- "Only this folder" leaves a card alone when it already holds the same active, non-negated folder clause; `hideFolder` / `hideNote` return the query unchanged (same object) when the value is already listed.
- The Vault root folder group (key '') gets no actions: a '' folder clause or exclude is inactive, so both would do nothing.
- Note groups read the note's `relPath` from the group's first row (every note group has one).
- Actions are text buttons in a wrapper that is `opacity-0` until the header is hovered or holds focus, so they stay in the Tab order and show when tabbed to.
- "Only this folder" goes through `setTaskSources` (as the panel does), so a tag card it widens stops being remembered as a tag, as adding any clause in the panel already does.

## Risks
- Hover and focus styling are not checked by eye (no app run).
- Hiding the focused group removes its button; the view's order effect then moves focus to the next row, as for any removed row.
