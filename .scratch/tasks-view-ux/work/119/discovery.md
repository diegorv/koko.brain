# 119 discovery: lifecycle clause, archived override, value pickers

No `spec.md` in `.scratch/tasks-view-ux/`; the Issue is the spec. 117 (property clause) has landed. This repeats 117's clause pattern (`.scratch/tasks-view-ux/work/117/`); only the differences are listed.

## Files that change
- `src/lib/features/tasks/task-query.logic.ts`: `TaskRow` (:16-49) gains `inbox`; `buildTaskRows` (:261-279) sets `inbox: isInboxEntry(entry)` (import from `#lib/features/type-definitions/inbox-workflow.logic.js`, a `.logic.ts`; adds the acyclic `tasks -> type-definitions` pair, which `feature-cycle.test.ts` writes into `feature-cycle-baseline.json`). `TaskSourceClause` (:296-314) gains `{ kind: 'lifecycle'; state }`; `clauseTest` (:463-494) and `clauseWords` (:947-972) get its case. `excludeTest` (:526) leaves the archived switch to `selectSourceRows` (:561-583), which lifts it per card holding a lifecycle `archived` clause. `explainEmptyTasks` stage 3 (:1111) runs sources and excludes together, so the override also holds there. New pure `sourceSuggestions(rows)`.
- `src/lib/features/tasks/SourcesPanel.svelte`: `CLAUSE_KINDS` (:25) adds Lifecycle; `emptyClause`/`clauseValue`/`withValue` (:68-113) handle it; the row shows a state dropdown (like the op dropdown, :222-238) and no Not switch; each text field gets a Suggestions chevron with a `DropdownMenu` over `sourceSuggestions(tasksStore.rows)`.
- `help/documentation/10-tasks-and-todoist.md`: Sources section (:101-117).

## Plan (commits)
1. discovery.md.
2. Failing logic tests (lifecycle states, inbox type definition, archived override, other excludes still win, archived exclude on rows matched by another card, sentence words, explainEmptyTasks); then the clause, `inbox` field and override.
3. Failing `sourceSuggestions` tests; then the function.
4. Failing component tests; then the panel's state dropdown and suggestion menus.
5. Help doc.

## Tests (prior art)
- `task-query.logic.test.ts` `selectSourceRows` suites (`note`, `select`, `card`), `buildTaskRows` "fills the note fields", `describeTaskQuery`, `explainEmptyTasks` stage 3.
- Component tests go in `TasksView.sources.test.ts` (the Sources panel tests and helpers `only`, `type`, `addClause`, `until`, `EXCEPT` live there since 245 split `TasksView.test.ts`), real stores, `mockTaskFetch` with `entries`.

## Defaults taken
- A new lifecycle clause starts at `inbox` (the first state), so it is active at once: it has no empty value.
- Sentence words: `in the inbox`, `that are organized`, `that are favorites`, `that are archived`. The excludes part still says `archived notes` while the switch is on: it still applies to the other cards.
- Suggestion buttons: `aria-label="Suggestions"` next to every value field (folder, type, note tag, heading, property value). The property Key field gets one too, named `Key suggestions`, so a property row has no two buttons of the same name.
- Property value suggestions read the clause's key trimmed, matched exactly (as the clause matches it); none for a blank key. Each list: first spelling wins, sorted case-insensitively (`taskTagOptions`' rule). An empty list shows a disabled `No suggestions` item.
- Note tags are listed as `noteTags` holds them (no `#`).

## Risks
- Menu layout with long lists relies on the dropdown's own max height and scroll; not checked by eye (no app run).
