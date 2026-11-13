# 118 discovery: group by type, property, heading

No `spec.md` in `.scratch/tasks-view-ux/`; the Issue and the archived PRD (`.scratch/archived/tasks-view/PRD.md` "Parents", "Grouping and sorting") are the spec. Header actions repeat 117's folder pattern (`.scratch/tasks-view-ux/work/117/`); only the differences are listed.

## Files that change
- `src/lib/features/tasks/task-query.logic.ts`: `TaskGroupKey` (:682) gains `'type' | { property: string } | 'heading'`; `collapseKey` (:692) keys a property grouping `property:<name>:<key>`; `flatGrouping` (:819) gets `type` and property cases; `groupTaskRows` (:871) routes `heading` to a new `headingGroups` beside `noteGroups` (:784). New `propertyKeyOptions(rows)`, `onlyThisType`, `hideType` (beside `onlyThisFolder` :413).
- `src/lib/features/tasks/TasksView.svelte`: `GROUP_OPTIONS` (:117) adds Type; the Display menu (:886-894) adds a Property `DropdownMenu.Sub` and a Heading radio; `groupActions` (:321) adds the type actions; `taskRow`'s `flat` (:1073) is false for heading groups.
- `help/documentation/10-tasks-and-todoist.md`: Display menu text (:15), header actions (:116-122).

## Plan (commits)
1. discovery.md.
2. Failing `task-query.logic.test.ts` groupTaskRows suites for type, property, heading and collapseKey; then the logic.
3. Failing tests for `onlyThisType` / `hideType` / `propertyKeyOptions`; then the functions.
4. Failing component tests; then the view. 5. Help doc.

## Tests (prior art)
- `task-query.logic.test.ts` `groupTaskRows` (`mixed`, `summary`, `t`, `sections`, `parentOutside`) and `group header actions` (`query`, `onlyThisFolder` cases).
- `TasksView.test.ts` was split: Display > Property goes in `TasksView.grouping.test.ts` (`groupBy`, submenu opened by ArrowRight as `openSub` in `TasksView.row-edit.test.ts`), Hide this type in `TasksView.sources.test.ts` `group header actions` (`headerButtons`, `action`), as 117 did.

## Defaults taken
- Type groups key on the exact `noteType` (two casings stay two groups); null keys as '' with label "No type", last. Labels sort lower-cased (`byLowerCase`).
- Property value label: string, number, boolean as `String(v)`; an object as `JSON.stringify(v)`; a list as its elements by that rule, `null` and '' elements dropped, sorted lower-cased, joined ", ". Missing key (own keys only, as `propertyTest`), `null`, '', `[]` key '' with label "(empty)", last.
- The Property submenu lists the own frontmatter keys of `tasksStore.sourceRows` (as the Tag menu reads), sorted lower-cased; "No properties in these tasks" (disabled) when none.
- Heading groups key on `JSON.stringify([filePath, ...headings])`, so two sibling headings with the same text under the same parent in one note share a group (rows do not carry the heading index, and `buildTaskRows` tests assert they must not). Label: `<last heading>, <relPath without .md>`, or `noteTitle` before the first heading. Groups in incoming order (path, then document), rows in document order, dimmed parents kept, count excludes dimmed; a group with only dimmed rows (a parent under another heading than its child) is left out. No breadcrumbs, rows indented.
- `onlyThisType` / `hideType` compare types trimmed and ignoring case (as the type clause and exclude do); unchanged query (same object) for '' or an already present type. "No type" gets no actions.
- Display labels: "Type", "Property", "Heading".

## Risks
- Submenu look and hover not checked by eye (no app run).
