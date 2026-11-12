# Cross-ticket state chain: Tasks view Issues 108 to 115 (plus 243)

Scope: I walked the codebase ticket by ticket along the chain 108, 242, 110, 234, 236, 109, 111, 238, 239, 113, 112, 240, 241, 115, with 243 after 242 and 030, then the related 116, 121, 122, 123, 124, 129, 198, 205. For each ticket I listed what it expects to exist already and checked that an earlier ticket delivers that exact name and shape. Inputs: the ticket texts in `.scratch/open-itens/issues/`, `dossier-*.md` and `refute-*.md` in this folder, and the code at HEAD `d2304ac9e`.

Labels: **(F)** means verified in code at HEAD. **(T)** means read in ticket text, cited as `NNN:line`, the line number inside `.scratch/open-itens/issues/NNN-*.md`. **(I)** means inference. No predecessor has landed (F: `src/lib/features/tasks/` holds no `task-query.logic.ts`), so everything about post-ticket state is (T) or (I).

The per-ticket refutations already list most single-ticket defects. This file adds the hand-offs between tickets: names that two tickets spell differently, state that one ticket removes while a later one still reads it, and tests a later ticket has to migrate without being told. Where a refutation already proposes the fix, I cite it and add only the cross-ticket part.

## Baseline at HEAD (F)

- Store fields: `fileTaskGroups`, `dateFilter`, `sectionTag` (default `#to-list`), `hideCompleted`, `isLoading`. `reset()` restores all five (`src/lib/features/tasks/tasks.store.svelte.ts:4-12`, `:27-33`).
- Service: `buildTaskIndex` writes the store only inside the request guard (`src/lib/features/tasks/tasks.service.ts:74-76`). `fromV2` is module-private (`:20-48`). `afterTaskWrite(path, updatedContent)` (`:176-179`). `resetTasks` bumps the counter, resets the store and closes the tab (`:227-231`).
- View: `filteredGroups` reads `tasksStore.fileTaskGroups` (`src/lib/features/tasks/TasksView.svelte:46-52`). `computeTaskStats` counts `checked` (`src/lib/features/tasks/tasks.logic.ts:91-105`).
- Tests: `TasksView.test.ts` has a one-task `group()` builder that returns `FileTaskGroupV2` (`src/tests/lib/features/tasks/TasksView.test.ts:34`). `tasks.service.test.ts` has its own `group()` (`src/tests/lib/features/tasks/tasks.service.test.ts:45`). The section IPC is pinned in `tasks.service.test.ts:103-109` and `:196-211`, `task-toggle-dirty-buffer.test.ts:29` and `:144`, and `src/tests/lib/contracts/ipc.test.ts:91-92`.
- Section IPC surface: `src/lib/contracts/commands.ts:105-106` and `:269`, `e2e/mocks/tauri-core.ts:162-164` and `:483`, `e2e/mocks/vault-index.ts:489-495`. The e2e spec clears the section tag at `e2e/specs/tasks-view.spec.ts:20`, `:31`, `:42` and `:69`.

## Findings

### High

**H1. 115: every IPC-shaped mock that 108 to 241 add to `TasksView.test.ts` breaks at the fetch move, and 115 names none of them.**
- What is wrong: 115 lists only "the `get_tasks_in_section_v2` / `get_all_tasks_v2` cases in `tasks.service.test.ts` and the refetch check in `task-toggle-dirty-buffer.test.ts`" (T `115:42`). By then `TasksView.test.ts` holds component tests from 108 (two-task focus test, AC3 that mocks both commands, AC4), 234 (sort, scroll, flush, alert), 236, 109, 111, 238, 239, 113, 112, 240 and 241. Each one serves tasks by mocking `invoke` for `get_all_tasks_v2` or `get_tasks_in_section_v2` (F: today's pattern, `TasksView.test.ts:34`, `:77-92`). Once `buildTaskIndex` reads `get_all_vault_entries_v2`, all of them see no tasks. 108 AC3 needs a full rewrite: it relies on Rust returning `[]` for the section and a note for the unfiltered call (T `108:42`), and after 115 the section rule runs in TS over headings. `refute-115.md` S3 raises this as should-fix only. Across the chain it is what decides whether 115 fits in one run.
- Evidence: T `115:42`, T `110:32` (the shared fixture builder replaces the group builder in `TasksView.test.ts`), F `TasksView.test.ts:34`.
- Exact ticket edits:
  - 110, append to the fixture bullet (`110:32`): "The fixture file is `src/tests/lib/features/tasks/tasks.fixture.ts` (not `.test.ts`). Besides the builder it exports `mockTaskFetch(groups: FileTaskGroupV2[], opts?: { section?: FileTaskGroupV2[] })`, which installs the `invoke` answers for the task fetch commands. Every `TasksView.test.ts` case serves tasks only through it. Issue 115 swaps its body to serve `get_all_vault_entries_v2` with `taskHeadings`, so the component tests move in one place."
  - 108, 234, 236, 109, 111, 238, 239, 113, 112, 240, 241: add one line to each criteria list: "Component tests serve tasks through Issue 110's `mockTaskFetch`, never through an inline `invoke` mock of a task fetch command." (For 108, which lands before 110, use: "110 moves these tests onto its fixture", as 110 already says.)
  - 115, replace `115:42` with: "Tests that change on purpose: `mockTaskFetch` in `tasks.fixture.ts` serves entries (a section argument becomes headings in the entries); the `get_*_tasks_v2` cases in `tasks.service.test.ts` (including Issue 108's `hasLoaded` cases, Issue 234's sort and error cases, Issue 111's `rows` case and Issue 242's `sectionTags` case); the refetch check in `task-toggle-dirty-buffer.test.ts`; Issue 108's empty-state test (the section is now headings in a snapshot entry); Issue 111's `buildTaskRows` cases in `task-query.logic.test.ts`, whose input changes from groups to entries (see M10). `grep -rn "get_all_tasks_v2\|get_tasks_in_section_v2" src/tests` lists nothing after the change, apart from tests of the command map, which Issue 121 owns."

**H2. 236, 111 and 112: three refutations give three incompatible sources for the "M" of "N of M open".**
- What is wrong: 236 takes M from `tasksStore.fileTaskGroups` (T `236:13`), and `refute-236.md` S2 adds a `noteTaskCounts(tasks)` helper over it. 111's `rowsByNote(rows: VisibleRow[])` must return `total` "before any filter" from filtered rows, which it cannot do (T `111:19`). `refute-111.md` M1 fixes this with `noteTaskCount` and `noteOpenCount` on every `TaskRow`. 112's `groupTaskRows` has the same gap (T `112:20`), and `refute-112.md` M1 fixes it with a different design: a `totals: ReadonlyMap` parameter built in the store. Applying both refutations gives a row field that nothing reads, or a map that duplicates it. Applying neither leaves "M" impossible to compute from 111 on. 236's N (open count) needs the same answer: under 112 it is not `count` (`refute-112.md` M2).
- Evidence: T `236:13`, `111:19`, `112:20`; `refute-111.md` M1, `refute-112.md` M1, `refute-236.md` S2.
- Exact ticket edits (pick the row-field design, which survives 115 and 116 unchanged):
  - 236: keep `noteTaskCounts(tasks): { open, total }` in `tasks.logic.ts` over the note's group in `fileTaskGroups` (`refute-236.md` S2).
  - 111, `111:15` and `111:19`: apply `refute-111.md` M1. `buildTaskRows` sets `noteTaskCount` and `noteOpenCount` on each row through 236's `noteTaskCounts`, and `rowsByNote` reads them from the first row.
  - 112, `112:20`: replace "Note groups also carry `total`, ..., as Issue 111's `rowsByNote` does" with "Note groups also carry `filePath`, `folder`, `modifiedAt`, `total` and `open`, read from the first row's `noteTaskCount` and `noteOpenCount` (Issue 111). `groupTaskRows` keeps its four parameters." Drop `refute-112.md` M1's `totals` parameter. Keep its M5 test, rewritten to read the row fields.
  - 115, add to the `buildTaskRows` bullet: "`noteTaskCount` and `noteOpenCount` are counted after the heading filter (the rows the section keeps), as Rust's section result was before."

**H3. 111: readers of `fileTaskGroups` that 108, 109, 234 and 236 add are never moved to `rows`, and they go silently empty at 115.**
- What is wrong: 111 says "`fileTaskGroups` stays until Issue 121 removes it; after this Issue nothing renders from it" (T `111:23`). It names no reader to move. By then the branch will have these readers:
  - 108's `explainEmptyTasks({ groups })`, where `groups` is `tasksStore.fileTaskGroups` (T `108:17`). 111 does change it to `rows` (T `111:20`), which is the one reader it covers.
  - 109's `today` derived over `fileTaskGroups` (`refute-109.md` S4).
  - 234's "no list loaded" condition (`refute-234.md` M4 proposes `fileTaskGroups.length === 0`).
  - 236's M, read from `fileTaskGroups` (T `236:13`).

  115 then stops calling `setFileTaskGroups` (T `115:9`). Any reader left behind reads `[]` forever. The failed-refresh alert would replace the list on every failure, the header would read "N of 0 open", and `today` would never recompute. No predecessor test would catch it, because those tests mock the IPC that 115 removes.
- Evidence: T `111:23`, `115:9`, `236:13`, `108:17`; F `tasks.service.ts:76` (the only writer), F `TasksView.svelte:46-52` (today's reader).
- Exact ticket edits:
  - 111, append to `111:23`: "Move every reader of `tasksStore.fileTaskGroups` in `src/lib` to `rows` or the row fields: the empty state's input (Issue 108), the `today` derived (Issue 109), the failed-refresh alert's 'no list loaded' check (Issue 234, becomes `rows.length === 0`) and the header counts (Issue 236, become the row fields of H2). After this Issue, `grep -n fileTaskGroups src/lib` finds only the store, its setter call in `buildTaskIndex` and `fromV2`."
  - 115, add a criterion: "`grep -rn fileTaskGroups src/lib` finds only the store definition (Issue 121 deletes it). Nothing outside the store reads it."

**H4. 116 reads and writes `tasksView.sectionTag`, which only 243 creates, but 116 is not blocked by 243, and 243 waits on 030.**
- What is wrong: 116's default source is "one heading card ... per section tag saved by Issue 243 (`parseSectionTags` of `tasksView.sectionTag`)", and it writes the card texts back to `tasksView.sectionTag` (T `116:14`). 116 is blocked only by 115 (T `116:23`). 115 is blocked by 241 and 074 (T `115:28`), not by 243. 243 is blocked by 242 and 030 (T `243:13`), and 030 is `ready-for-agent`, not done. So 116 can launch with no `tasksView` key in `AppSettings`, no opaque-value pass-through in `parseSettings` (`refute-243.md` M2) and no load seam in `initializeVault` (`refute-243.md` M3). Its agent would either build 243 inside 116 or stop. 115's keep-list has the same problem (`refute-115.md` M7). 123 does wait on 030 (T `123` Blocked by), so persistence there is safe, but 116 writes into the key before 123.
- Evidence: T `116:14`, `116:23`, `115:28`, `243:13`.
- Exact ticket edits: 116, change `**Blocked by:** 115` to `**Blocked by:** 115, 243`. 115, apply `refute-115.md` M7 (make 243 conditional).

### Medium

**M1. 111 and 238 disagree on who deletes `filterByDate`.** After 111, nothing calls `filterByDate` (F: its only caller is `TasksView.svelte:47`). The owner's orphan rule then makes 111 delete it. 238 still says it "removes ... `filterByDate`" and that "the edited options keep `filterByDate`'s cases" (T `238:11`). Whichever way the 111 agent goes, one of the two tickets is wrong. Edit: apply `refute-111.md` M7 to 111 (delete it, port its three cases to `applyEditedCutoff`) and its matching 238 edit. In 238, also rewrite the `fromV2` comment pointer: after 111 that comment names a deleted function (F `tasks.service.ts:16-18`). 111 should update it, and 238 should then drop "update it" from `238:11`.

**M2. 111 deletes 110's open-rule regression tests instead of porting them.**
- What is wrong: 110's failing-first tests pin the B2 rule on `filterCompletedTasks` and `computeTaskStats`: with hide-closed on, `[/]`, `[?]`, `[>]` and `[!]` stay visible, a closed parent with an in-progress child stays, and only done and cancelled count as closed (T `110` criteria 1 and 4; `refute-110.md` S2). 111 deletes `filterCompleted`, `filterCompletedTasks`, `hasUncheckedDescendants` and `computeTaskStats` "with their cases in `tasks.logic.test.ts`" (T `111:28`). It ports none of those cases to `applyQuickFilters`. The headline bug of 110 would then have no test.
- Exact edit, append to `111:28`: "Before deleting, port Issue 110's open-rule cases to `applyQuickFilters` in `task-query.logic.test.ts`, with rows built as Rust sends them (`checked: true` for every status but todo): under Open, in-progress, question, forwarded and important rows pass; done and cancelled fail; a done parent with an open in-progress child stays dimmed. Name them in the commit as moved, not dropped."

**M3. 108's `allTime` action kind and its tests reach 238 unnamed.** Neither 110 nor 111 removes `allTime` (T `111:20` keeps the date stage "as in Issue 108"). 238 never mentions it, and it has no "Tests that change on purpose" list. Edit: apply `refute-238.md` M1 and M2 as written. They are correct across the chain. Also confirm in 110 that the action kind stays `showCompleted` and only the label changes (`refute-110.md` S4). 111 depends on that kind (T `111:30`).

**M4. 234's path comparator lives in the service, but 112 and 115 need the same comparator in `.logic.ts`.**
- What is wrong: 234 sorts in `buildTaskIndex` (T `234:13`). 112 sorts flat rows by `relPath` and folders "by path" in `task-query.logic.ts` (T `112:15`, `112:10`). `pure-logic.test.ts` forbids a `.logic.ts` from importing a service (`refute-112.md` S2). 115 has to sort again in `buildTaskRows`, because the snapshot comes back in byte order (`refute-115.md` S12). That makes three sites for one rule, plus the tie-break from `refute-234.md` S9.
- Exact edit: 234, replace the sort bullet's comparator with "`compareTaskPaths(a, b)`, exported from `tasks.logic.ts`: one module-level `Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })`, ties broken by raw code-unit order. `buildTaskIndex` sorts with it; `tasks.logic.test.ts` covers `note 9`/`note 10` and `A.md`/`a.md`." 112, `112:15`: "paths compare with `compareTaskPaths` (Issue 234)". 115: "`buildTaskRows` sorts notes with `compareTaskPaths`".

**M5. 234's reset generation has no name, and 241 needs it in service code, captured before the awaited write.** 234 says "The service exposes a reset generation the view checks" (T `234:15`). 241 needs it for the Undo vault check (T `241:13`). 116 removes the textbox and the debounce flush (T `234` Notes), the only 234 consumer, so a view-local counter would vanish. Edit: apply `refute-234.md` S2 (`getTasksResetGeneration()`, kept when 116 removes the textbox) and `refute-241.md` M5 (capture it before `setTaskStatus` awaits).

**M6. 113, 112, 240 and 241 each patch the "next current row" rule in prose, against different orders.**
- What is wrong:
  - 113 says "the next surviving row, else the previous one" with no order, and has no fallback for "no current row" (T `113:10`, `113:7`; `refute-113.md` M2).
  - 112 says the rule works "unchanged, in DOM order". Under a flat grouping, note order and DOM order differ (`refute-112.md` M7).
  - 240 needs the successor computed over all group rows, collapsed included, and the tab stop computed over rendered rows only (`refute-240.md` M2, M3).
  - 241 widens the focus guard to "`<body>` or inside the view" (T `241:14`; `refute-241.md` S9).

  Four agents editing one effect inside a component will each break the previous rule. No pure test pins it.
- Exact edit:
  - 113: adopt `refute-113.md` S2, extended. Export `nextCurrentRow(order: string[], prevOrder: string[], current: string | null): string | null` and `tabStopRow(rendered: string[], order: string[], current: string | null): string | null` from `tasks-keys.logic.ts`, both keyed `filePath:lineNumber`. `order` is every row in display order (before 112, `visibleRows` order; from 112 on, the flattened `tasksStore.groups` rows).
  - 112: "`order` becomes the flattened `groups` rows."
  - 240: "`order` keeps collapsed and capped rows; `rendered` leaves them out; the `tabStopRow` fallback becomes 'first rendered row after it in `order`, else the last rendered row'."
  - 241: "the focus guard change is made once, in the effect that calls `nextCurrentRow`."

**M7. The trailing-strip helper and the raw-path predicate need one name, which 109 must export.** 241 copies "the raw `task.text` without its trailing block id and Todoist anchor (Issue 109's stripping)" (T `241:10`). 109 says "Use a local regex in `tasks.logic.ts`" and exports nothing (T `109:10`). `refute-109.md` S3 names the helper `stripTaskTrailers`, while `dossier-241.md` names it `stripTrailingTaskIds`. 239's search haystack (`taskDisplayText`) and 112's breadcrumb (`refute-112.md` S4) also need `taskDisplayText` to take a `TaskRow`, which requires `refute-109.md` M2's `Pick<TaskItem, 'text' | 'metadata'>` signature. Edit: in 109, export `stripTaskTrailers(text)` and `usesRawTaskText(task)` and type both on `Pick<TaskItem, 'text' | 'metadata'>`. In 241, `241:10` reads "`stripTaskTrailers(task.text)` (Issue 109)". Drop `stripTrailingTaskIds`.

**M8. "Default" for each quick filter is defined in 239, but 113 and 238 need it first.** 111 types `statuses?: TaskStatus[]` and never says whether "cleared" means `[]` or `undefined` (T `111:16`). 113's palette label tests "statuses is empty" (T `113` palette bullet). 238's "Any" must store `undefined` (`refute-238.md` S2). 239 defines a `changedQuickFilters` helper (`refute-239.md` M2), and 126 and 129 extend the normalization. If 113 and 238 each guess, 239's Reset shows after a palette run or after picking Any. Edit: move `refute-239.md` M2's rule into 111: "`DEFAULT_QUICK = { show: 'open' }`. Every setter writes `undefined` for an empty list or blank text, never `[]` or `''`. `isQuickFieldDefault(quick, field)` in `task-query.logic.ts` is the one test for 'at its default'." 113, 238 and 239 then extend it: 238 adds `due`, 239 adds `priorities`, `tags` and `search`, and 239 uses it for Reset and `Filters (n)`.

**M9. e2e fixture and timing hand-offs.**
- (a) 242's last criterion says "add a second tagged heading to the fixture vault" (T `242:27`). 110 keeps its section-tag clearing steps because "the fixture tasks sit under no `#to-list` heading" (T `110` e2e bullet), and the spec comment at `e2e/specs/tasks-view.spec.ts:17-19` says the same (F). Edit: apply `refute-242.md` M3 (a test-local note, no fixture edit) and `refute-110.md` S5.
- (b) 115's e2e fix names only the wikilinks test and 242's two-tag test (`refute-115.md` M9). 109's 500 px chip test, in its refuted form, also writes a note inside the test (`refute-109.md` S9). Edit, 115 Gate line: "every e2e test that writes a note and emits `vault-index-updated` before reading the Tasks view (find them with `grep -n "fs.writeFile" e2e/specs/tasks-view.spec.ts`) gets `{ timeout: 12_000 }` on its first Tasks assertion".
- (c) 242's new e2e test lands before 110's `waitForTimeout` purge. Edit, 242: "no `waitForTimeout` in the new test (Issue 110 removes the rest)".

**M10. 115 reuses the name `buildTaskRows` with a different input and does not list 111's tests that follow it.** 111 defines `buildTaskRows(groups: FileTaskGroup[], vaultPath)` with path-field tests (T `111:15`; criteria at the end of 111). 115 redefines it as `buildTaskRows(entries, vaultPath, overlay)` (T `115:8`). Its tests-that-change list does not mention the 111 cases (T `115:42`). Edit: covered by the H1 replacement for `115:42`. Add "the path-field and note-count cases keep their expectations; only the input becomes `NoteEntryV2[]`".

**M11. 121's removal list is stale at HEAD and misses what 242 adds.**
- Stale references at HEAD (F): 121 cites `commands.ts:82` and `:227`; the entries are at `src/lib/contracts/commands.ts:105-106` and `:269`. It cites `tauri-core.ts:152-154` and `:450`; the entries are at `e2e/mocks/tauri-core.ts:162-164` and `:483`. It cites `vault-index.ts:478-484`; the mock is at `e2e/mocks/vault-index.ts:489-495`.
- Missing: `src/tests/lib/contracts/ipc.test.ts:91-92` (`@ts-expect-error sectionTag is required`), and what 242 adds: the two-tag and nested Rust tests in `vault_test.rs`, any per-tag scan helper, and the heading-rule e2e mock (`refute-242.md` M1, M2).
- Edit, 121: drop the line numbers and name the files plus a grep. "Remove `get_tasks_in_section_v2` and everything that exists only for it, as `grep -rn "get_tasks_in_section\|tasks_in_section\|getTasksInSection\|sectionTags" src src-tauri e2e docs/agents` lists them after Issue 242: the command, its helpers (including any multi-tag scan Issue 242 added), the Rust tests Issue 242 added next to `tasks_in_section_reads_only_notes_with_tasks`, the e2e mock function and handler, the `ipc.test.ts` `@ts-expect-error` case and the typed map entries." Also change "no other test changed" to "no test outside that list changed".

**M12. 243 and 234 interact in whatever order they land, and neither ticket says how.** 243 launches "between two chain Issues once 030 is done" (T `243` Notes). 234 makes `onDestroy` flush a pending tag through `updateSectionTagFilter` (T `234:15`). 243 makes that function save (T `243:9`). If 243 lands first, 234's flush also writes `settings.json`, and its reset-guard test (type, `resetTasks()`, unmount) does not check that settings stay unchanged. If 234 lands first, `refute-243.md` S4 covers it. Edit: 234, add "If Issue 243 has landed, the reset-guard test also asserts `settingsStore.tasksView` is unchanged." 243: apply `refute-243.md` S4. The saved empty string (`refute-243.md` M7) also crosses 108: 108's Clear tag writes `''`, and the owner's 2026-11-12 rule covers only the default. That still needs an owner line before 243 launches.

**M13. 116 migrates only `.fill('')` e2e sites, but 242, 243, 108 and 234 leave more behind.** 116 removes the textbox and `tasksStore.sectionTag` (T `116:14`). Its only migration criterion rewrites `sectionTagInput.fill('')` sites into Clear clicks (T `116:36`). These are left out:
- 242's e2e test that types two tags (a typed value cannot become a Clear click);
- 243's load and save tests (load into `sectionTag`);
- 108's Clear tag and rule-sentence tests;
- 234's flush and textbox-sync tests;
- every `describeTaskRule` case from 108, 242, 111, 238 and 239, which `describeTaskQuery` replaces.

116 also adds "Loading tasks..." gated on `vaultStore.indexReady` (T `116:17`), next to 108's "Indexing tasks..." gated on `hasLoaded` (T `108:8`). Two loading strings with two conditions. Edit, 116: add a "Tests that change on purpose" list naming those five groups. Replace "Loading tasks..." with "keep Issue 108's 'Indexing tasks...' and its `hasLoaded` gate; add `!vaultStore.indexReady` to that gate".

### Low

- **L1. 115's reset list is incomplete.** It lists "rows, quick filters, scroll offset, error, current row, collapsed groups" (T `115:26`) and leaves out 108's `hasLoaded`, 112's `group` and `sort`, `sectionTag`, and 115's own overlay (cleared in `resetTasks`, `refute-115.md` M6). Edit: add them, and add "and `resetTasks()` clears the overlay and dismisses Issue 241's Undo toast".
- **L2. Status order differs across four surfaces.** 110's table (todo, in-progress, done, cancelled, question, important, forwarded; T `110:15`), 111's checkbox list (which `refute-111.md` M4 pins to 110's order), 112's Status groups (open statuses first; T `112:13`) and 241's radio (T `241:11`). Edit: define `TASK_STATUSES` in 110 in 112's order and use it for 111's menu and 112's groups. 241 stays a four-item subset in that order.
- **L3. `tasksStore.group` vs `tasksStore.groups` (112, T `112:7`) sit next to `fileTaskGroups`.** Three near-identical names read by 240 and the view. Edit, 112: name the field `groupBy`, with `setGroupBy`.
- **L4. 240 says "Issue 123 decides persistence" (T `240:7`); 123 holds no collapse state.** Apply `refute-240.md` S1.
- **L5. 116's help pointer "the Section filter row (`:101`)" (T `116:35`)** points at the Date row at HEAD (F `help/documentation/10-tasks-and-todoist.md:101`; the Section row is `:103`), and 238 removes that row first. Edit: "the Section filter row of the Filters table".
- **L6. 113 says "Shift held gives `null`" for every key (T `113:8`), and 241 adds Shift+F10.** If 113's logic test iterates a key list with Shift, 241 changes that assertion on purpose. Edit, 241: "Issue 113's 'Shift gives null' case keeps its keys; F10 is added as the one exception" (`refute-241.md` S2).
- **L7. 074 may add required `heading` / `taskHeadings` fields (its own "pick one").** If it lands mid-chain with required fields, every `Task` literal in the chain's new tests needs them. Edit, 074: "if the fields are required, add them in Issue 110's `tasks.fixture.ts` builder" (one site, given H1).
- **L8. 236's palette check `tasks-palette.test.ts` (`refute-236.md` M5) duplicates 198's later architecture test.** 198 does not say to retire it. Edit, 198: "remove `src/tests/lib/features/tasks/tasks-palette.test.ts` once this test covers `src/lib/features/tasks/`".
- **L9. 129 and 116 name `TaskQuery`; 111 to 239 never name the quick-filter type.** Edit, 111: "export `type TaskQuickFilters` from `task-query.logic.ts`; Issue 116's `TaskQuery.quick` is that type".

## Things two tickets both create or both delete

| Thing | Tickets | Status |
|---|---|---|
| `filterByDate` deletion | 111 (orphan rule), 238 (explicit) | conflict, M1 |
| `fromV2` deletion | 115 (orphan rule, `refute-115.md` S6), 121 (explicit) | conflict; pick one in 115 |
| `TaskItem` | 115 "stops being used" (T `115:9`), 121 "stays" | contradiction, `refute-115.md` M8 |
| Path comparator | 234 (service), 112 (logic), 115 (logic) | duplicated, M4 |
| Successor and fallback rule | 113, 112, 240, 241 | patched four times, M6 |
| "M" total | 236, 111, 112 (three designs) | H2 |
| Quick default rule | 111 (implicit), 113, 238, 239 (explicit) | M8 |
| Section IPC e2e mock | 242 rewrites, 121 deletes | fine, if 121 is named by grep (M11) |
| Count line | 110 rewrites in the body, 236 keeps it, 111 moves it to the toolbar | consistent |
| `describeTaskRule` / `explainEmptyTasks` | 108 creates, 242/110 edit, 111 moves, 238/239 extend, 116 replaces | consistent, but 116 lists no migration (M13) |
| `showCompleted` kind | 108 creates, 110 relabels, 111 removes | consistent once 110 says the kind stays (M3) |
| `allTime` kind | 108 creates, 238 must remove | unnamed, M3 |
| Section textbox, debounce flush, sync | 108/242 edit, 234 flush and sync, 116 removes | 116 migration gap, M13 |

## Confidence changes

- **115: stays low**, and the cross-chain view makes it worse. Its scope silently includes migrating every component test that 108 to 241 add (H1), the readers left on `fileTaskGroups` (H3) and the `buildTaskRows` tests (M10). With H1's `mockTaskFetch` seam in 110, it would rise to medium.
- **111: lower, from medium to medium-low.** It is the hinge of the chain: it inherits four `fileTaskGroups` readers (H3), the "M" design (H2), the 110 regression tests it must port (M2), the `filterByDate` conflict (M1) and the quick default rule (M8).
- **112: lower.** Two refutations give it opposite `total` designs (H2), and its successor-order rule needs a function that 113 does not define (M6).
- **116: lower.** It is missing a blocker (H4), and its migration list covers only `.fill('')` sites (M13).
- **121: lower, from high (S) to medium.** Every line reference is already stale at HEAD, and it does not name what 242 adds (M11).
- **238: slightly lower.** It assumes `filterByDate` survives 111, and the `allTime` kind is unnamed (M1, M3).
- **241: unchanged (medium).** Its predecessor names (generation, strip helper, current-row rule) are all unpinned (M5, M6, M7), but each fix belongs in an earlier ticket.
- **108: raise, from medium to medium-high.** It depends on nothing earlier, and its cross-chain duties are only to pin names (`setHasLoaded`, the predicate 110 rewrites, the `allTime` and `showCompleted` kinds) that the refutations already supply.
- **236: unchanged (medium).** Its inputs from 110 (`isTaskOpen`) and 234 (path order) are well defined. Its output (`noteTaskCounts`, `noteFolder`, header hooks) is what H2 and `refute-111.md` M3 build on, so its refute edits should land in the ticket before 111 is specified.
- **243: unchanged (medium), with a launch condition.** Its interaction with 234 depends on landing order (M12), and 116 must wait for it (H4).

## Not checked

- Nothing was run. Every post-ticket state is inferred from ticket text and the refutations.
- I did not check whether `vitest`'s `vi.mock` factory sharing works for an exported `mockTaskFetch` helper. The helper only calls `vi.mocked(invoke).mockImplementation`, which every test file already does locally (F `TasksView.test.ts:77-92`).
