# 116: The Tasks query holds sources and default excludes (the textbox still drives the heading cards)

**Origin:** `tasks-view` Issue 13, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/tasks-view/`. Split on 2026-11-12 by the deep dive (`.scratch/tasks-view-ux/research/deep-dive/SUMMARY.md` section 4, `dossier-116.md`, `cross-persistence-sources.md`, `cross-state-chain.md`) into this Issue (116a: query, excludes, sentence) and Issue 245 (116b: the Sources panel and the textbox removal). Issue numbers in this text are open-itens numbers; the PRD's Issue 07 is 111, 08 is 112, 12 is 115 and 244, 13 is this Issue and 245, 16 is 123, 17 is 124 and 247.

**What to build:** Today the only sourcing rule is the section tag textbox, and nothing can be excluded, so templates, the system folder, archived notes and type definitions all supply tasks. Add the query model the Sources panel (Issue 245) will edit, apply the default excludes, and describe the whole query in one sentence. The textbox stays in this Issue: each tag it holds becomes a heading card.

**Before editing, on the branch:** `grep -rn "sectionTag\|parseSectionTags\|matchesHeading\|matchesNestedTag\|describeTaskRule\|explainEmptyTasks\|visibleRows\|tasksView\|loadSavedTasksView" src/lib src/tests e2e help`. Issues 108 to 244 and 243 shaped these names; adapt to what landed.

**Model** (in `src/lib/features/tasks/task-query.logic.ts`, the PRD's "One query model" shapes):

```ts
type TaskSourceClause =
	| { kind: 'folder'; path: string; negate?: boolean }
	| { kind: 'type'; type: string; negate?: boolean }
	| { kind: 'noteTag'; tag: string; negate?: boolean }
	| { kind: 'heading'; text: string; match: 'tag' | 'substring' };
interface TaskSource { clauses: TaskSourceClause[] }   // ANDed; cards are ORed
interface TaskExcludes { archived: boolean; typeDefinitions: boolean; templatesFolder: boolean; systemFolder: boolean; folders: string[]; notes: string[]; tags: string[]; types: string[] }
interface TaskQuery { version: 1; sources: TaskSource[]; exclude: TaskExcludes; quick: TaskQuickFilters }
```

`TaskQuickFilters` is Issue 111's type (extended by 238 and 239). `groupBy` and `sort` (Issue 112) stay separate store fields. Export `defaultTaskExcludes()` (the four switches on, empty lists), `headingSources(tags: string[]): TaskSource[]` (one card per tag, each holding `{ kind: 'heading', text: tag, match: 'tag' }`; `[]` for no tag) and `defaultTaskQuery()` (`headingSources(['#to-list'])`, the default excludes, `DEFAULT_QUICK`).

**Matching.** `selectSourceRows(rows: TaskRow[], sources: TaskSource[], exclude: TaskExcludes, folders: { templates: string; system: string }): TaskRow[]`, pure. A row passes when no exclude matches it and (`sources` is empty, or some card has every clause matching). Normalize the clause and exclude values once per call, not per row.
- **Folder:** the path is vault-relative with leading and trailing `/` trimmed; it matches when `row.folder === path` or `row.folder` starts with `path + '/'` (recursive). Case-sensitive.
- **Type:** `row.noteType` equals `type`, case-insensitive. A null `noteType` never equals.
- **Note tag:** some `row.noteTags` entry matches through Issue 239's `matchesNestedTag(chosen, tag)` (`work` matches `work/client`, not `workshop`, case-insensitive), with a leading `#` stripped from both sides first.
- **Heading:** `matchesHeading(row.headings, [text], match)` (Issue 115). With `match: 'tag'` a tag also matches its nested tags (owner Q2): `#to-list` matches a heading tagged `#to-list/today`; `#to-listing` and `(#to-list)` do not.
- `negate` flips a folder, type or note tag clause. A clause whose value is empty after trimming is inactive: it matches every row, and `negate` is ignored, so a clause being typed never blanks the list. A card with no clauses matches every row.
- The heading clause is evaluated per task row (its ancestor headings); the other clauses read note fields every row of a note shares.
- **Excludes always win** (Issue 119 adds the archived override): `archived` drops `row.archived`; `typeDefinitions` drops `row.noteType === 'Type'` (the rule of `isTypeDefinition` in `features/type-definitions/type-definitions.logic.ts`; inline it with a comment naming that rule, do not import it, or `feature-cycle.test.ts` gains a tasks to type-definitions pair); `templatesFolder` and `systemFolder` drop rows under `folders.templates` and `folders.system` with the folder rule (an empty setting excludes nothing); `folders` uses the folder rule, `notes` compares `relPath` exactly, `tags` the note tag rule, `types` the type rule.
- **Note counts.** `selectSourceRows` sets `noteTaskCount` and `noteOpenCount` (Issue 111) on each kept row over the kept rows of its note, so Issue 236's "N of M open" counts what the sources keep, as it counted the section's rows before.

**Where it runs.**
- The heading filter leaves the fetch: Issue 244's `buildTaskRows(entries, vaultPath, sectionTags, overlay)` drops its `sectionTags` parameter and keeps every task, and `buildTaskIndex` stops passing `parseSectionTags(tasksStore.sectionTag)`. `tasksStore.rows` holds every task row of the snapshot; `noteTaskCount` and `noteOpenCount` are then recomputed by `selectSourceRows` (below).
- `tasksStore` gains `query: TaskQuery` (`$state`, default `defaultTaskQuery()`), `setSources(sources)` and `setExclude(exclude)`. The `quick` getter reads `query.quick`, and `setQuick` / `resetQuick` write into it. `reset()` restores `defaultTaskQuery()`.
- The `visibleRows` derived runs `selectSourceRows(rows, query.sources, query.exclude, { templates: settingsStore.templates.folder, system: settingsStore.templates.systemFolder })` before the quick filters. A store may read `settingsStore` (precedent: `event-calendar-view.store.svelte.ts`); `task-query.logic.ts` gets the folders as an argument (`pure-logic.test.ts`).
- **The textbox drives the cards.** `tasksStore.sectionTag` stays. `setSectionTag(text)` also sets `query.sources` to `headingSources(parseSectionTags(text))`, so an empty textbox lists every note for the session, as today (owner Q1). `updateSectionTagFilter` keeps Issue 243's save of the text as typed, and stops calling `buildTaskIndex`: a source change re-derives `visibleRows` with no fetch. In this Issue only `setSectionTag` and tests call `setSources`.
- Issue 243's `loadSavedTasksView` stays the single load point, unchanged: it sets the tag, which sets the cards. Keep `getTasksResetGeneration` (Issue 234), which Issue 241's Undo uses.

**One sentence.** `describeTaskQuery(query)` in `task-query.logic.ts` replaces `describeTaskRule`, reads the quick part from `query.quick`, and keeps any other argument Issues 238 and 239 added (for example `today`). Parts, in this order:
- the status part of Issue 111 (`Open tasks`, ...);
- the source part: when every card holds exactly one heading clause with `match: 'tag'` (the textbox case), the heading wording Issues 108, 242 and 244 left (` under headings containing #to-list or #work`). Otherwise ` from every note` for no cards, else ` from notes ` plus each card's clauses joined with ` and `, cards joined with `; or `. Clause words: `in folder X` / `not in folder X`, `of type X` / `not of type X`, `tagged #x` / `not tagged #x`, `under a heading tagged #x` (tag match), `under a heading containing "x"` (substring). Inactive clauses are left out;
- the exclude part: `, except ` plus the active ones joined with `, `: `archived notes`, `type definitions`, `templates`, `the system folder`, then `folder X`, `note X`, `tag #x`, `type X` for each listed value. The switches are named whatever the folder settings hold;
- the due, priority, tag and search parts of Issues 238 and 239.

Example, the default query: "Open tasks under headings containing #to-list, except archived notes, type definitions, templates, the system folder".

**Empty state** (`explainEmptyTasks`, which takes the query in place of `sectionTag` and the separate quick fields), stages in pipeline order:
1. `rows` is empty: "No tasks in this vault yet", no action.
2. The sources keep no row: in the textbox case, the Issue 108 and 242 message "No task sits under a heading containing #to-list or #work" with Clear tag; otherwise "No note matches the sources", with no action until Issue 245 adds "Edit sources".
3. The excludes drop every row the sources kept: "Every matching note is excluded", with no action until Issue 245 adds "Edit excludes". Until Issue 245 the excludes are the defaults and the UI cannot change them; the sentence names them.
4. The quick filter stages of Issues 111, 238 and 239, run over the rows the sources and excludes keep.

**Loading.** Keep Issue 108's "Indexing tasks..." and its `hasLoaded` gate, and add `!vaultStore.indexReady` to that gate, so an empty snapshot before the index is ready does not read "No tasks in this vault yet". `mountTasksView` (Issue 110's fixture) calls `vaultStore.markIndexReady()` so the existing component tests still see the list.

**Counts:** the total only. No per-card counts.

**Blocked by:** 244, 243

**Status:** resolved

**Answered:** PRD B6 (a), the option this Issue is specified for (owner, 2026-11-06). Owner, 2026-11-12: Q1, `#to-list` stays the default section filter and the view never defaults to every task (an empty textbox still lists every task for the session); Q2, a heading tag also matches its nested tags; the split into this Issue (query, excludes, sentence; the textbox still drives the cards) and Issue 245 (panel, textbox removal), blocked by 244 and 243.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts` because the section filter moves from the fetch into the query and the rule sentence changes. relay-lite's configured checks do not run e2e: the build step runs this spec before its last commit and reports its pass count, and the reviewer runs it again as a probe and cites the result. Do not run the whole e2e suite. Targeted checks include the source scans that read this feature: `src/tests/lib/pane-toolbar.test.ts`, `menu-item-anatomy.test.ts`, `chrome-type-scale.test.ts`, `chrome-state-styles.test.ts`, `src/tests/lib/features/tasks/tasks-palette.test.ts` and `src/tests/lib/architecture/{pure-logic,layer-rules,feature-cycle}.test.ts` (the `feature-cycle` baseline must not change).

**Tests that change on purpose** (name them in the commit): every `describeTaskRule` case from Issues 108, 242, 111, 238 and 239, which becomes a `describeTaskQuery` case with the default exclude part appended; exact sentence assertions in the `TasksView*.test.ts` files; Issue 244's `buildTaskRows` heading-filter and counts-after-the-heading-filter cases, which move to `selectSourceRows`; service tests that expect a fetch after `updateSectionTagFilter`, and Issue 234's destroy-flush component test in `TasksView.test.ts` where it asserts a fetch after the flush (it keeps asserting `tasksStore.sectionTag`); the `tasks.store.test.ts` `reset()` cases (the default query). Component tests keep serving tasks through Issue 110's `mockTaskFetch` (entries since Issue 244) and mounting through `mountTasksView`.

- [x] Failing test first, `task-query.logic.test.ts`: each clause kind; `negate`; an empty value inactive, negated or not; AND inside a card; OR across cards; no cards and an empty card match every row; folder recursion (`Projects` matches `Projects` and `Projects/ACME`, not `Projects2`) and slash trimming; the note tag nested rule with and without `#`; each default exclude; an excluded folder winning over a card that names it; each list exclude; an empty template or system folder setting excluding nothing; `noteTaskCount` and `noteOpenCount` over the kept rows. With `defaultTaskQuery()` and the default folders, a task in `_system/templates/` and one in an archived note are dropped and a task under a `## Inbox #to-list` heading elsewhere is kept. At least one case builds its rows with the real `buildTaskRows` from entries (Issue 244), so the note tag and heading formats are the snapshot's. Fails today (no `selectSourceRows`).
- [x] `describeTaskQuery`, exact strings: the default query; the textbox case with `#to-list #work`; two general cards; no cards; all excludes off; listed excludes; excludes plus a quick filter.
- [x] `explainEmptyTasks`: each new stage with its exact message, and the order (sources before excludes before quick filters).
- [x] `tasks.store.test.ts` (real stores): the default `query`; `setSectionTag('#a b')` gives two heading cards and `setSectionTag('')` gives `[]`; the `quick` getter follows `setQuick`; `visibleRows` follows `setSources`, `setExclude` and a `settingsStore.updateTemplates({ folder: 'X' })` change; `reset()` restores `defaultTaskQuery()`.
- [x] `TasksView.test.ts` with real stores: a task in `_system/templates/T.md` is not listed by default and is listed after `tasksStore.setExclude({ ...defaultTaskExcludes(), templatesFolder: false })`; with `tasksStore.setSources` holding a folder card for `Projects`, only `Projects` tasks are listed and the sentence says "from notes in folder Projects"; typing `#work` in the textbox limits the list with no new fetch.
- [x] `TasksView.test.ts`: while `vaultStore.indexReady` is false and the rows are empty, "Indexing tasks..." shows and no empty-state message does.
- [x] `help/documentation/10-tasks-and-todoist.md`, the Section filter row of the Filters table: archived notes, type definitions and notes in the templates and system folders no longer supply tasks, and the rule sentence names them.
- [x] The e2e spec passes unchanged: Issue 242's two-tag test still sees both tagged tasks and not the untagged one. The fixture vault has no `_system` folder and no archived note, so the excludes hide no fixture task.
- [x] `layer-rules.test.ts` stays green with no new baseline entry.

## Notes

- **Size:** M. The panel, the textbox removal and the write-back of heading cards are Issue 245.
- Run order (deep dive X7): after 244 and 243. Issue 245 follows this Issue; 121, 122 and 129 are blocked by 244, not by this Issue.
- A source that drops a parent task but keeps its child leaves the child without a dimmed parent. Accepted; say so in a comment, no test needed.
- `visibleRows` re-runs `selectSourceRows` on every query change. Fine for thousands of rows when values are normalized once per call; revisit only if a `TASK-PROFILE` log shows a stall.
- Paths in clauses and excludes are vault-relative; `filePath` stays the only path passed to IPC (indexing rule 9).

## Comments

- 2026-11-12: the default source follows the saved section tags (Issues 242 and 243) and stays `#to-list` without them; the reference to the closed audit Issue 78 (227) was removed.
- 2026-11-12: split by the deep dive (SUMMARY 116 and section 4; cross-persistence H1, H2, M6, M7, L6; cross-state H4, M13; dossier-116). This Issue keeps the query model, `selectSourceRows`, the default excludes, `describeTaskQuery` and the new empty-state stages, with the textbox still driving the heading cards; the panel, the textbox removal, the write-back and the e2e migration moved to Issue 245. Blocked by 244 and 243. Pinned `matchesHeading(row.headings, [text], match)` with the Q2 nested rule, empty clauses as inactive, `#` stripped on both sides of a note tag through Issue 239's `matchesNestedTag`, the inlined `noteType === 'Type'`, note counts over the kept rows, the clause and exclude wording, Issue 108's loading text with `!indexReady` added to its gate, and a "Tests that change on purpose" list. Dropped the stale line references.
- 2026-11-12: consistency review: Issue 234's destroy-flush component test joins the "Tests that change on purpose" list, since `updateSectionTagFilter` stops fetching here.
- 2026-11-12: delivered from branch issue/116-sources-panel-and-excludes. The Tasks query now holds sources (heading, folder, note and note tag cards) and the default excludes (archived notes, type definitions, templates and system folders); `selectSourceRows` filters the snapshot rows, `describeTaskQuery` writes the rule sentence and `explainEmptyTasks` gains the sources and excludes stages; the textbox still drives the heading cards. Review round 1: APPROVED with five nits, all kept with no code change (see review.md "## Resolution"). Full vitest suite: first run 1 failed (an auto-organize timing test this branch does not touch, which passed on its own), second run 627 files, 16256 passed, 54 skipped, 0 failed; e2e tasks-view.spec.ts 13 passed in review.
