# Validated 07: scout 13 (tests inventory) and scout 14 (performance)

Adversarial check of `scout-13-tests-inventory.md` and `scout-14-performance.md` against the code on `main` (HEAD `23f6c1f91`). Read-only; nothing was run. Paths are relative to the repo root.

Headline: most of the factual claims in both scouts check out, but a lot of their line numbers are off by 1 to 5 lines. The biggest problem is something neither scout found. An owner-answered PRD for this redesign already exists (`.scratch/archived/tasks-view/PRD.md`, owner answers dated 2026-11-06). About 20 of its Issues sit in `.scratch/open-itens/issues/` (numbers 108 to 129, plus 074 and 075), most of them `ready-for-agent`. Several scout recommendations repeat those Issues, and one contradicts them: scout 14's main recommendation, virtualizing with `VList`, goes against a PRD non-goal and a stated assumption.

## Confirmed

### Scout 13

| Claim | Evidence |
|---|---|
| Component test uses real `tasksStore`/`editorStore`/`settingsStore`/`vaultStore`, and mocks only `invoke`, `listen`/`emit`, `plugin-fs`, plus a `ResizeObserver` stub | `src/tests/lib/features/tasks/TasksView.test.ts:7-19,24-28` |
| 8 component tests: 6 on row clicks, 2 negative Todoist guards | `TasksView.test.ts:54-189`, `:191-243` |
| `textSpan()` takes the first `span` under any `[data-task-row]`, so a span added before the text breaks it | `TasksView.test.ts:96` |
| `circleButton()` takes the first `button` in the row | `TasksView.test.ts:133` |
| Open vs ticked is told apart by `svg circle` being present (lucide `Circle` vs `CircleCheckBig`) | `TasksView.test.ts:143-145,157`; `TasksView.svelte:182-186` |
| `beforeEach` forces `setSectionTag('')` | `TasksView.test.ts:64,200` |
| The important-task test needs `setHideCompleted(false)` because the fixture's `checked` is `status !== 'todo'` | `TasksView.test.ts:41,140` |
| E2E spec has 8 tests; 5 clear the textbox found by role and `/section tag/i` | `e2e/specs/tasks-view.spec.ts:20,31,42,69,99` |
| Test 3 duplicates test 2 (same regex, `.first()`) | `tasks-view.spec.ts:13-27` vs `:29-38` |
| Hide toggle is found by `button[title*="completed"]` | `tasks-view.spec.ts:47`; title at `TasksView.svelte:114` |
| The scroll test couples to bits-ui `data-slot="scroll-area-viewport"` and guards `min-h-0` | `tasks-view.spec.ts:66-87`; `TasksView.svelte:137` |
| No fixture task sits under a `#to-list` heading; `#plan` is a note-level tag | `e2e/fixtures/test-vault.ts:101-110,118-124` |
| Store test pins `#to-list`, `hideCompleted: true`, `dateFilter: 'all'`, uses `as any`, and has no computed-getter tests because the store has no computed getters | `tasks.store.test.ts:12-13,18,44,54-55`; `tasks.store.svelte.ts:14-19` |
| Logic suites: filterCompletedTasks 6, filterCompleted 4, filterByDate 3, computeTaskStats 2, parseTaskTextSegments 6 | `tasks.logic.test.ts:22-268` |
| `toggleTarget` table, 7 statuses | `task-status.logic.test.ts:6-14` |
| Service suite: real stores; mocks `invoke`, `debug.js`, `svelte-sonner`; race tests; the `after a task write` block | `tasks.service.test.ts:7-19,118-187,372-457` |
| Service fixture `group()` has only `description` and `tags: []` metadata, and duplicates the component test's `group()` | `tasks.service.test.ts:45-59`; `TasksView.test.ts:34-48` |
| No shared task fixture in `src/tests/fixtures/` | directory listing |
| `pane-toolbar.test.ts` lists `TasksView.svelte` and requires exactly one `class="..."` holding `pane-toolbar` with no override classes | `src/tests/lib/pane-toolbar.test.ts:20,30,35-37,46-50` |
| `tasks:toggle` "Toggle Tasks View" | `src/lib/app/commands.ts:197-204` |
| Keybinding tests: Cmd+Shift+T registered, handler calls `toggleTasksTab` once | `global-keybindings.test.ts:212,527-533` |
| Lifecycle tests: `buildTaskIndex` never runs at startup or vault open; `resetTasks` runs on teardown | `app-lifecycle.service.test.ts:565,647,1027,1212` |
| `FileTaskGroup` is allow-listed in ipc-mirrors | `ipc-mirrors.test.ts:25-26` |
| The E2E mock's section filter uses NOTE-level tags and returns every task of a matching note; Rust filters by containing heading text and re-reads disk | `e2e/mocks/vault-index.ts:489-495`; `src-tauri/src/commands/vault.rs:732-758`; `src-tauri/src/vault/parsing.rs:1721-1765` |
| `write_task_lines` throws in the E2E mock | `e2e/mocks/tauri-core.ts:180` |
| Rust section tests exist | `src-tauri/tests/commands/vault_test.rs:1067-1100+`; `src-tauri/tests/vault_task_test.rs` |
| TESTING.md citations (mock allowlist/blocklist, suite coverage, store coverage, litmus test, E2E rules, gate) | `docs/TESTING.md:13-27,31,108-111,123-128,136-137,162-171,190,198` |
| A `$derived`-behind-getter caching assertion needs jsdom | `docs/adr/0034-derived-allowed-behind-store-getters.md:13-14,48` (cited by the scout as TESTING.md:25, but the ADR is the source) |
| Untested today: date pills, hide toggle rendering, debounce, empty/loading text, stats line, file header click, date format, indent, the version-bump effect | No matching assertions in any tasks test file |

### Scout 14

| Claim | Evidence |
|---|---|
| F1: one `$effect` on `vaultIndexVersion` calls `buildTaskIndex` inside `untrack` | `TasksView.svelte:73-78` |
| F2: mounted only while the Tasks tab is active; not built at vault init | `src/lib/app/EditorView.svelte:40,72-73`; `app-lifecycle.service.ts:407-410` |
| F3: `setLoading(true)` on every call, IPC picked by trimmed tag, a latest-wins guard, a second loop to count tasks | `tasks.service.ts:55,66-79` |
| F4: `fromV2` copies every task and metadata field; the store replaces `fileTaskGroups` wholesale | `tasks.service.ts:20-48`; `tasks.store.svelte.ts:21` |
| F5: default `#to-list`, not persisted (open Issue 227) | `tasks.store.svelte.ts:8,30`; `.scratch/open-itens/issues/227-tasks-help-says-default-view-lists-only.md` |
| F6: `get_tasks_in_section_v2` copies candidates under a read lock, then `read_to_string` per note with tasks on `spawn_blocking`, no cache | `vault.rs:672-683,694-730,742-758`; doc comment `tasks.service.ts:88-95` |
| F7: `get_all_tasks_v2` is a sync `#[tauri::command] pub fn` that clones every entry's tasks and sorts; the repo treats async as off-main-thread | `vault.rs:651-660`; `index.rs:1070-1084`; `vault.rs:737-738,1205-1210`. That Tauri runs sync commands on the main thread is from memory, backed by repo comments only. |
| F8: the view reads only `text`, `checked`, `indent`, `lineNumber`, `status`; `metadata` is shipped and unused | `TasksView.svelte:169-213` |
| F9: ordering is `modifiedAt` desc, done in Rust | `vault.rs:728`; `index.rs:1082` |
| F10: throttle of 2000 ms / 10 000 ms; TasksView is named as a consumer | `src/lib/app/tauri-listeners.service.ts:106,109,137,275-288` |
| F11: a toggle refetches right away, and Rust also emits `vault-index-updated`, so a second throttled refetch follows | `tasks.service.ts:162,176-179`; `vault.rs:854-856` |
| F12: 400 ms debounce; an earlier scan is not cancelled in Rust | `TasksView.svelte:34-40`; `tasks.service.ts:74,96-99` |
| F13: date and hide filters are client-side `$derived` | `TasksView.svelte:46-54` |
| F14/F16: no windowing; both `each` blocks are keyed; the inner segment `each` is unkeyed | `TasksView.svelte:137-222,149,169,194` |
| F15: `parseTaskTextSegments` runs in the template with no memoization | `TasksView.svelte:194`; `tasks.logic.ts:130-161` |
| F17: `{#if isLoading}` replaces the whole list on every refetch | `TasksView.svelte:139-143`. Open Issue 108 reports the same defect independently. |
| F19: Rust `checked` is true for any status other than `todo`; hide-completed keys on it | `src-tauri/src/vault/task.rs:25-26`; `tasks.logic.ts:40`. Open Issue 110 reports the same. |
| F20: `virtua` 0.54.1; `VList` is used only in `RailNoteList.svelte` (grouped flat array with `getKey`) | `package.json:76`; `node_modules/virtua/package.json:3`; `src/lib/features/rail-shell/RailNoteList.svelte:4,683,834,899` |
| F21: virtualizers wrap rows in positioning divs | `src/lib/features/note-list/NoteRowMenu.svelte:199` (the scout gave no folder) |
| F22: `VList` props have no sticky header; `Virtualizer` has `scrollRef` and `scrollToIndex` | `node_modules/virtua/lib/svelte/VList.type.d.ts`; `Virtualizer.type.d.ts:44,134` |
| F23: no `content-visibility` or `IntersectionObserver` in `src/lib` | grep, no hits |
| R2/R3/R5/R6: indexing rules 2, 6, 12 as cited | `docs/agents/indexing-watcher-rules.md:5,13,31`; `tauri-listeners.service.ts:291-295` |
| Rec 8: `timeAsync` logs `buildTaskIndex completed in Xms`; `CmdTrace` wraps both commands | `src/lib/utils/debug.ts:41-50`; `vault.rs:655,746` |

## Refuted or corrected

### Scout 13

1. **Line numbers in TasksView.test.ts are off by 1 to 5 throughout.** Correct values: first describe at `:54` (not 52), second at `:191` (not 189), `setSectionTag('')` at `:64,200` (not 62,195), `[data-task-row]` waits at `:90,222` (not 76,207), `textSpan` at `:96` (not 83), aria-label selector at `:117` (not 114), first-button at `:133` (not 131), `svg circle` at `:145,157` (not 140,155), wikilink at `:178` (not 175), negative guards at `:226-233,235-242`.
2. **E2E line numbers are also off.** The textbox fills are at `:20,31,42,69,99`, not `:14,...,91`; the hide toggle is at `:47`, not 43; test ranges start at `:5,13,29,40,66,89,114,130`.
3. **"Fixed sleeps in 4 tests" is wrong: there are 3.** `waitForTimeout` appears only in tests 2, 3 and 4 (`tasks-view.spec.ts:22,33,44,49,57`). The scroll test and the links test use auto-waits.
4. **pane-toolbar line numbers are invented.** The file is 51 lines long: the regex is at `:30`, the test at `:46-50` (not "29-33" and "51-59").
5. **`commands.test.ts:33` is not a Tasks reference.** Only `:26-27` mock `toggleTasksTab`.
6. **`#plan` is at `test-vault.ts:110`**, not `:112-113`.
7. **"Whether the E2E mock fills metadata was not checked" can now be answered.** It fills `description`, `dueDate` (from 📅 only) and `tags: []` (`e2e/mocks/vault-index.ts:152-193`). Priority, scheduled, start and tags never appear, so metadata chips other than due dates cannot be E2E-tested without extending the mock. Open Issues 074 and 075 already plan to extend this parser.
8. **The open question on `pnpm build` is under-sourced.** It is not only TESTING.md:198. `docs/adr/0030-pnpm-build-in-precommit-gate.md` (status active) makes build part of every frontend gate. CLAUDE.md rule 6, which is newer and explicit, limits it to dependency changes and leaves the rest to CI. CLAUDE.md governs. Each existing Issue also carries its own `Gate:` line, which settles it per ticket.

### Scout 14

1. **"`fromV2` re-copies all 14 metadata fields" is wrong: there are 13.** They are description, 11 optional fields and tags (`tasks.service.ts:31-45`; `task.rs:86-130`).
2. **F11: "the throttled bump arrives 2 s later" is imprecise.** The wait is 2 s at minimum and up to 10 s when a refresh ran recently (`tauri-listeners.service.ts:280-283`). Toggles do not call `requestPromptIndexRefresh`, so the prompt path at `:298` does not apply.
3. **F10: "ANY note save bumps it" needs a qualifier.** Rust emits only when `UpdateResult.changed` (`vault.rs:371-372`). In practice an edited save still emits.
4. **P4 (optimistic patch that drops the immediate refetch) goes against a documented, tested decision.** The doc comment says the clicked checkbox "must not look unclicked" during the throttle (`tasks.service.ts:114-116`), and `tasks.service.test.ts:277` pins "refetches the Tasks store on a changed toggle without any vaultIndexVersion bump". The owner-answered design already exists: Issue 115 adds an overlay keyed `filePath:lineNumber` plus `requestPromptIndexRefresh()` before the toggle IPC. Do not ticket P4 separately.
5. **P6, "drop `description` (duplicate of `text`)", is wrong.** `description` is `text` with the signifiers stripped (the scout's own F8 says so). The calendar (`event-calendar-tasks.logic.ts:59`, `EventTaskChip.svelte:28-41`) and the Todoist scan (`todoist-sync/vault-scan.service.ts:32`) consume it, and row chips (Issue 109) need it. Removing it would break consumers and buy nothing.
6. **R1 is half right.** A second TS mirror would break rule 1, but a cache already exists and is allowed: `getVaultEntries()` (rule 12; ADR 0025 amendment 2026-08-19, "a cache, not a mirror"). Issue 115 moves the Tasks view onto it. "Tasks cannot use the snapshot because it has no headings" is true today, but Issue 074 adds `NoteEntry.task_headings` and `Task.heading`.
7. **Rec 2 / P2 (virtualize with `VList`) conflicts with the PRD.** `.scratch/archived/tasks-view/PRD.md:38` lists "virtualization" under non-goals. Assumption A9 (`:129`) says "No virtualization. A group shows 50 rows, then 'show N more'", and Issue 112 implements that cap (`112-group-and-sort.md:32`). A9 is a vetoable assumption, not an owner answer, so virtualization is a question for the owner, not a slice. It would also replace bits-ui `ScrollArea` and break the E2E scroll test (`tasks-view.spec.ts:75`) and Issue 112's collapse design.
8. **Rec 4 / P3c / P11 (store headings per task and drop the disk read) is already decided and ticketed.** PRD B6 (a), owner 2026-11-06: Issue 074 (Rust records headings, `INDEX_SCHEMA_VERSION` bump), Issue 115 (heading rule in TS over the entries snapshot) and Issue 121 (remove `get_tasks_in_section_v2`). The scout presents these as unexplored options and asks the owner whether to do them. Its answer to open question 6 is already on file.
9. **Rec 7 / P5 (make `get_all_tasks_v2` async) misses that the view will stop calling it once Issue 115 lands.** Its remaining callers are the calendar (`event-calendar.service.ts`) and the Todoist scan (`todoist-sync/vault-scan.service.ts`); the scout did not name them. It may still be worth doing for those, but not as a Tasks-view slice.
10. **Rec 1 / P1 (keep the list while loading) is Issue 108**, already specified down to the spinner markup, the `role="status"`, and the pane-toolbar constraint. It is not a new slice.
11. **Open question 4 (should in-progress and important count as completed) is already answered:** PRD B2 (a), Issue 110.

## Missed by scouts

1. **An existing PRD and backlog cover this exact redesign.** See `.scratch/archived/tasks-view/` (PRD.md, spec.md, mockup.html, research/, ledger.md) and the open Issues that came from it: 074, 075, 108 (mounted list, rule sentence, empty states), 109 (row chips), 110 (open/closed rule), 111 (quick filters), 112 (group, sort, collapse, 50-row cap), 113 (keyboard and a11y), 115 (entries snapshot and overlay), 116 to 119 (sources, property clause, grouping by type/property/heading, lifecycle), 120 (tag filter), 121 (remove section command), 123 (persist view state, needs-triage), 124 (saved views and the `#to-list` migration), 125 (smart lists), 126 (modified marker), 129 (Todoist state, needs-triage). Issues 021 and 114 are resolved, and the current `TasksView.svelte` already reflects tasks-view Issues 01, 02 and 03. Any new tickets from this research must be diffed against these, or they will duplicate decided work.
2. **The section-filter default is already decided.** Issue 108 keeps `#to-list` "until Issue 17 (PRD decision B1)", and Issue 124 is the `#to-list` migration. The scouts' main open question, which default to use, has a planned answer. Scout 13's advice to decide the default first matches Issue 124's place in the chain.
3. **Line references in the existing Issues are stale.** Issue 108 cites `TasksView.svelte:169-170`, `:171-172`, `:174-176` and `:154-163`, but the file is now 223 lines, and those elements sit at `:139-140`, `:141-142`, `:144-146` and `:126-132`. Issue 110 cites `:127`, `:209`, `:218`, and Issue 112 cites `EditorView.svelte:71-72` (now `:72-73`). Whoever runs these Issues has to re-locate the code; a relay build step will, but a hand-written ticket copied from them would carry the drift.
4. **Every existing Issue that touches selectors names its E2E breakage.** Issue 110 changes the hide title and so breaks `button[title*="completed"]`; Issue 108 adds `aria-label="Section tag"` and keeps `/section tag/i` working. Scout 13's "stable hooks" recommendation should go into those Issues rather than become a separate refactor ticket.
5. **The section textbox has no label today.** Its accessible name comes only from `placeholder="section tag"` (`TasksView.svelte:126-132`). Playwright's role query works through the placeholder fallback. Issue 108 fixes this.
6. **The E2E mock's `getTasksInSection` returns all of a note's tasks, not only those in the section.** On top of the note-tag vs heading mismatch scout 13 found, this means a section-filter E2E would pass even if the heading boundary logic were wrong. Issue 121 deletes this mock handler, and Issue 115 moves the view onto `get_all_vault_entries_v2`, which the mock already serves.
7. **`timeAsync` logs "completed in" even for a superseded call** (`tasks.service.ts:74` returns early inside the timed block; `debug.ts:47-49`). Timings taken from the log for scout 14's measurement plan can include requests whose result was dropped.
8. **Remount behavior.** The store keeps `fileTaskGroups` across tab switches (module-level `$state`), but every remount still shows "Indexing tasks..." because the mount effect calls `buildTaskIndex`. Once Issue 108 lands, the previous data shows at once on remount. That makes the return-to-tab case the cheapest win, and neither scout spelled it out.
9. **Live Preview rules do not apply.** `docs/agents/live-preview-rules.md` has no Tasks-view content; the view is not a CodeMirror surface. No conflict either way.

## Net recommendations that survive

1. Start from the existing backlog, not new tickets. Use `.scratch/archived/tasks-view/PRD.md` and the open Issues listed above as the base. New slices from this research should only cover gaps the PRD does not address, and should be checked against it before writing.
2. Do Issue 108 first. It is the scouts' P1, has no blockers, is frontend only, and its failing test is already written out.
3. Fold scout 13's test-hardening into the Issues that touch the markup, not into a standalone refactor. Add `data-task-text` and `data-task-toggle` hooks (or role/label queries), replace the first-`span`, first-`button` and `svg circle` lookups in `TasksView.test.ts`, swap `waitForTimeout` for auto-waits, delete the duplicate E2E test 3, and add one `clearSectionFilter(page)` helper. Do this in Issue 108 or 109, which already edit the row and the spec.
4. Add a shared task fixture builder under `src/tests/fixtures/` with realistic metadata (due, scheduled, priority, tags, every status). Replace the two duplicated `group()` builders when Issue 109 (chips) or 110 (statuses) first needs it. Extend the E2E mock parser only where an Issue already asks for it (074, 075).
5. Keep the first fetch on mount (lifecycle tests lock it), keep `untrack()` in the effect, and route every new write through a Rust command plus `settleTaskWrite` (indexing rule 6). Issue 122 (row edits, needs-triage) is where that applies.
6. Ask the owner about virtualization; do not ticket it. Today's answer is PRD non-goal plus assumption A9 (50-row cap with "show N more", Issue 112). Revisit only if the owner's real numbers (`buildTaskIndex completed in` and `Tasks: N files, M tasks` in the session log) show a problem the cap does not solve.
7. Leave `get_all_tasks_v2` async-ness out of the Tasks redesign. After Issue 115 the view does not call it. If it matters for the calendar or the Todoist scan, it is a separate, measured Rust ticket.
8. An equality check before writing the store (scout 14 Rec 3) is low value. After Issue 108 the keyed `each` blocks update in place, and after Issue 115 an unchanged refetch reads a memo. Skip unless profiling shows re-render cost.

## Not checked

Nothing was executed. Not verified: whether the E2E mock's `entry.tags` include the leading `#` (it decides whether typing `#plan` in E2E matches the mock at all), Tauri's main-thread rule for sync commands beyond the repo's own comments, and the PRD's full text beyond the sections cited.
