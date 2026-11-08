# 119: Lifecycle clause, the archived override and value pickers

**Origin:** `tasks-view` Issue 28, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/tasks-view/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** After Issues 13 and 14 the Sources panel takes folder, type, note tag, heading and property clauses, but every value is typed by hand, and archived notes can never be sourced. Finish the panel (PRD "Sourcing rules", assumption A4).

- **Lifecycle clause:** `{ kind: 'lifecycle', state: 'inbox' | 'organized' | 'favorite' | 'archived' }`, read from the row's `organized`, `archived` and `favorite` flags (`NoteEntry.ts:34-98`, carried on `TaskRow` since Issue 12). `organized`, `favorite` and `archived` match when that flag is true. `inbox` matches `!organized && !archived && noteType !== 'Type'`, the rule of `isInboxEntry` (`src/lib/features/type-definitions/inbox-workflow.logic.ts:10-12`, which the rail's Inbox lens uses, `rail-shell/lens.logic.ts:305`); a row is never a `.view`. Do not add a second definition: `buildTaskRows` (Issue 12) sets `inbox: isInboxEntry(entry)` on each `TaskRow`, and the clause reads `row.inbox`. Add the field there if Issue 12 has landed without it. The clause has no "Not" switch. The state is picked from a dropdown.
- **Archived override:** a card that holds a lifecycle `archived` clause lifts the default archived exclude for the rows that card matches. Every other exclude (type definitions, templates, system folder and the listed folders, notes, tags and types) still wins, and rows matched only by other cards still lose to the archived exclude, as `.view` filters do (view-unification Issue 19).
- **Value pickers.** Next to each clause's value field, a chevron button (`aria-label="Suggestions"`) opens a `DropdownMenu` of suggestions; picking one sets the field. The user can still type a value that is not listed. Suggestions come from a pure `sourceSuggestions(rows)` in `task-query.logic.ts` over `tasksStore.rows` (every note with tasks, before sources and excludes), each list de-duplicated case-insensitively and sorted:
  - folders: every `folder` and each of its parent folders, without `''`;
  - note tags: `noteTags`;
  - types: `noteType`, without `null`;
  - headings: the texts in `headings` (empty while Issue 12's rows carry no headings);
  - property keys: the keys of `properties`;
  - property values for a chosen key: the scalar values and list elements seen for it, as strings.

**Blocked by:** 117

**Status:** ready-for-agent

**Answered:** PRD B6 (a), so Issue 13 stands as written (owner, 2026-11-06).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `task-query.logic.test.ts`: each lifecycle state, including an inbox row that is a type definition (no match); a lifecycle `archived` card bringing an archived note's tasks back while the templates exclude still removes a template in an archived note; the archived exclude still applying to a row matched only by another card. Fails today (no lifecycle clause).
- [ ] `sourceSuggestions` returns folders (with parents), tags, types, headings, keys and the values for a key from a fixed row set, de-duplicated and sorted.
- [ ] `TasksView.test.ts` with real stores: picking a folder from a folder clause's suggestions sets that value and limits the list; the property value suggestions list the values seen for the chosen key.

## Notes

- **Size:** M. Split out of Issue 13.
