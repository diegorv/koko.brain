# Coverage check of breakdown.md

HEAD 085b23c5d (= origin/main). Read-only review. `breakdown.md` was not edited. Method: a script parsed the ID table, the 47 tickets (Proposals, Size, Blocked by, Files lines) and the Deferred tables; `git diff --name-only origin/main...origin/mvp-claude` (172 paths) was intersected with every path in the ticket bodies; each live Issue folder was grepped for the files the tickets edit; citations were read at HEAD.

## 1. ID coverage

All 119 requested IDs appear exactly once in the ID table (no missing, no duplicate, no extra). The call counts in the table (QUICK 36, QUICK-PART 66, DEFER 16, DONE 1) match the "Counts" line. Every numeric "Counted in" ticket lists that ID in its Proposals line, and every ID in a Proposals line is either counted there or named in "Also". Calls match the slice verdict calls wherever a verdict table or header exists (71 of 119 compared by table row, 10+ by header; no difference). Ticket numbers are 01..47 with no gap.

Labelling defects (do not change the tickets, only the table and the counts):

- P111, P47 and P129 are `QUICK` in the table but the Deferred section lists a remainder for each (P111 date input chrome, P47 note-property and `formula.*` keys, P129 empty-cell hover hint). They are QUICK-PART. Counts become QUICK 33, QUICK-PART 69.
- P16, P131, P148, P149 and P170 are `QUICK-PART` with no row in Deferred for the unshipped remainder (P16 and P170 are covered by "Parts dropped"; P131, P148, P149 are not covered anywhere).
- P174 is `QUICK-PART` with no ticket in this folder ("fold into shell-sidebars-ux 06"), while the Deferred table lists P174 as "own ticket". The two statements conflict. The two unused `Separator` imports exist (`BacklinksPanel.svelte:6`, `OutgoingLinksPanel.svelte:6`, one `Separator` occurrence each), so the slice is real, but it sits in nobody's checklist yet.

## 2. Rule violations by tickets

- Ticket 34 edits `help/documentation/19-settings.md`, which is on origin/mvp-claude. The ticket says "separate hunk from `:261-279`", but the stated rule is "no file that mvp-claude changes", and the preamble claims no ticket does. Either drop the help hunk from 34 or move it to a follow-up after mvp-claude merges.
- Write paths. The rule says no write to `.kanban`, `.view`, `.canvas`, frontmatter, the settings schema or a vault file. These tickets add a new UI trigger for an existing write: 03 (rename rewrites `%% kanban:settings` and suffixes titles), 12 ("Move to" moves cards in the `.kanban` file), 16 (new canvas card creation and cascade), 24 (Alt+Arrow reorder writes the `.view` sort; `docs/agents/view-files.md` states a re-serialize drops every YAML comment, so each keyboard reorder can drop comments like the drag path, open-itens 071; the ticket does not say so), 27 (restore catch), 28 ("Install and apply" writes the active theme), 47 (Undo re-writes the rules file and `appearance`). The breakdown preamble admits "goes through a write path that already exists", which is weaker than the stated QUICK rule. For the owner's daily kanban and canvas use, 03, 12 and 16 should carry an explicit owner nod or be labelled as writes. 47 is called "lowest value" and re-inserts rules that move notes: it is the best candidate to move to DEFER.
- Ticket 03 suffixes a typed lane title that matches another lane ("Done" becomes "Done 2") and does the same for Add lane. That is a visible behaviour change in a daily-use file and is not in the Owner questions list.
- Ticket 05 changes draft persistence in Quick Capture (a daily-use feature): the stored draft is replaced by `withoutWritten(text, body)` before a 600 ms hold, Esc during the hold, and a Discard control. It is the only quick ticket that can lose typed capture text on a bug. Needs the owner's attention or a split (copy and "Saving..." state first; draft restore, Discard and the hold second).
- Ticket 46 adds a new source-mode line decoration, which the QUICK definition lists under "no editor decoration rework". It does not touch live preview decorations, so it is borderline, but it is not mentioned as an exception. Its acceptance says "the theme has a `.cm-source-frontmatter` rule" with no file named (the legacy `cm-callout` class has no theme rule anywhere under `src/lib`; `styles.ts` is in the 04 -> 07 -> 08 -> 23 chain, `highlight-styles.ts` is not). Name the file; if it is `styles.ts`, add the edge.
- Tickets 07, 08 and 23 change widget DOM and `callout-field.ts` decoration attributes in live preview. Rules 2 and 11 are handled in 07; the QUICK rule excludes decoration rework, so state that these are widget and style edits only.

## 3. Test claims that are wrong at HEAD

- Ticket 04 says `kb-ui.test.ts:754` and `kb-api.test.ts:719` stay green. `kb-ui.test.ts:752-755` ("returns the table element") asserts `expect(result).toBe(container.firstElementChild)` at `:753`; with a scroll div as the container's first child that line fails. The test must change on purpose (the ticket should say so and keep `result.tagName === 'TABLE'`). `kb-api.test.ts:719` is fine (`table.tagName`). `kb-ui.test.ts:619` and the paginated tests at `:380-437` read `container.firstElementChild` as the wrapper; the paginated wrapper rule ("gets the same scroll and is still returned") is ambiguous about which element is the container's first child.
- Ticket 33 names `filter.logic.test.ts`; the file is `src/tests/lib/features/collection/toolbar/filter-logic.test.ts`.
- Ticket 02: `EditorSection.test.ts:84-91` exists and the ticket states it is rewritten on purpose; the comment there says raw typing is "deliberate (live preview)". Fine, but the live-preview behaviour of fonts while typing a two-digit size (type `2`, then `4`) now skips the intermediate state; state it.

No ticket mocks a store or a `.logic.ts`. Every ticket has a "Failing test first" bullet and it is its first acceptance bullet. Mocks named: `kanban.service.js`, `svelte-sonner`, `@tauri-apps/plugin-opener`, `@tauri-apps/plugin-fs` `readFile`, `theme-catalog.service` network call, fs under the real mods host: all boundary mocks.

## 4. Blocked-by edges and shared files

Edges checked against shared files: all listed edges name a real shared file. No cycle (the graph is acyclic; ticket 25's edge on shell-sidebars-ux 16 is external).

Same file, no edge (flag):

- 32 and 47: both edit `auto-organize.logic.ts` and its test (32 changes the message at `:511`, 47 adds an insert-at-index helper). 47 is blocked by 30, 31, 28 but not 32. Add 32 to 47's Blocked by.
- 42 and 43: both edit `help/documentation/27-calendar.md` and `EventTimeGrid.test.ts`; both depend only on 41. Order them (43 after 42, or vice versa).
- 41 and 44: both edit `e2e/specs/calendar-plugin.spec.ts` (41 the title comma pins, 44 `:25,35-40` and the label-goes-back-to-today test). No edge.
- 10 and 39 share `app.css` (edge present). 10, 39 and shell-sidebars-ux 34 (adds `@utility pane-band` near `app.css:151`) are not in the "never in parallel" list.

Live-folder overlaps missing from "Never in parallel with a live Issue on the same file" (shell-sidebars-ux Issues that are ready-for-agent):

- 07 `widgets.ts` with shell-sidebars-ux 33 (it edits the mousedown sites at `widgets.ts:341-349,:675-681`).
- 06 `AppOverlays.svelte` with shell-sidebars-ux 08 (mounts a picker at `:20-22`; 06 edits `:17`).
- 26 `Rail.svelte` with shell-sidebars-ux 34 (`Rail.svelte:270`) and 30 (hints, needs-info).
- 40 `NoteRow.svelte` also with shell-sidebars-ux 24 and 31 (the list names 15 and 19 only); `SearchResult.svelte` with 19 (a follow-up note names `:179-182`).
- 10 and 39 `app.css` with shell-sidebars-ux 34.
- 45 `TasksView.svelte` with shell-sidebars-ux 20 (mentioned in passing; check it is read-only).

## 5. Size: tickets likely larger than one agent

The breakdown says every ticket is "S: one fresh agent, a few files". By file count and number of separate behaviours these are not:

- 41: 9 source files, 3 existing E2E specs plus a new one, doc, a new Tooltip.Provider pattern across two grids, and 6 behaviours (slot sizing, title, cell fill, daily-note reveal, tooltip, E2E).
- 43: 8 source files, a new constant, a dialog group, a lock icon on three components, popover caption, EventForm touched state.
- 44: container query layout, a11y names, today style, week buttons, toast, a new Today button, weekend styling, an E2E rewrite.
- 45: six proposals in one 1000-line-class component with about 20 test lookups renamed.
- 31: six behaviours in the 549-line rule row (stable keys, variables, names, Off state, focus after add, E2E).
- 30: five concerns (copy, hint, toast, excluded folders with datalist and "missing", names).
- 28: three independent fixes (row key handling, catalog and Install and apply, theme editor discard and restore).
- 27: six files and four concerns (errors, orientation, diff summary, list button).
- 13: add row moved out of the scroll list, upward suggestion placement, empty and filtered counts, a collapsed 40 px rail: layout rework, closer to M.
- 19: about 13 files (mechanical), 22: 5 source files plus new test file.

Suggest splitting 41, 43, 44, 45, 31, 30, 28, 13, or marking them "S+" so the owner sees the real count of agent runs.

## 6. Other risks not stated

- Ticket 39 deletes `tabBar` from the Default overrides. `--tab-bar` / `bg-tab-bar` feeds 9 more files besides `EditorTabs.svelte` (`AppShell`, `EditorView`, `CalendarNavigator`, `RailNoteList`, `SearchPanel`, `FilesNavigator`, `Rail`, `TypesNavigator`, `resizable-handle`). The ticket title says "tab strip" but it darkens every pane header band on Default, in every vault. State the blast radius and add it to the by-eye check.
- Ticket 04 wraps `kb.table` output in a scroll div inside `kb.container`; a vault QueryJS script that relies on the table being a direct child (selectors such as `:scope > table`, or `container.firstElementChild`) changes behaviour. Low risk, not stated beyond "empty scroll div if the script moves the table".
- Overlap with open-itens 059: it (name taken) is listed under "fully covered" but ticket 37 does the opposite design (announce, do not refuse). It is not covered; marking it wontfix is an owner decision.
- Ticket 10 changes `button.svelte` and the base `outline-ring` for the whole app, so two ring strengths exist after it; the ticket says so. mvp-claude tests pin the old ring on AppShell, Rail, TasksView and MyPeopleSection; none of those are in 10's scan scope, so they stay green, but a later sweep must edit them.

## 7. Citation spot-check (25 read at HEAD, all matched unless noted)

1. `KanbanView.svelte:128-133` handleAddLane sets editing lane; `KanbanLane.svelte:157-163` focus and select: matches.
2. `mods-host.service.ts:425-430` abort listener cancels the run synchronously: matches.
3. `app-lifecycle.service.ts:296-300` `cleanup_history` with `retentionDays`: matches.
4. `canvas.logic.ts:205-209` whitelist of editable data keys (text, file, url, label, color): matches; `TextNode.svelte:22-24` `editing` flag cleared with `editing: undefined`: matches.
5. `search.store.svelte.ts:16,46` and `SearchPanel.svelte:283-287` (P16 item 1 DONE): matches.
6. `src/routes/(app)/+layout.svelte:36` `applyStoredTheme()` and `theme.service.test.ts:224-230`: matches (commit 7dd276998 exists).
7. `kanban.logic.ts:437-438` moveItem refuses a missing target lane: matches.
8. `AppOverlays.svelte:17` `richColors`: matches.
9. `theme.logic.ts:141,155`, `app.css:236,292-293,495`: match; tab bar to editor luminance ratio recomputed as 2.08 (matches).
10. `button.svelte:7,12`, `dialog-content.svelte:38`: match.
11. `auto-organize.service.ts:220-223` excluded-folder skip: matches; `auto-organize.logic.ts:511` message exists (already says "if missing").
12. `NoteActionBar.svelte:148,157,175` titles with "Cmd+": match; `layer-rules.test.ts:167` is the app-inbound rule: matches.
13. `event-calendar-view.logic.ts:242-254`, `EventCalendarView.svelte:173-178`: match.
14. `kb-ui.ts:526-538` pager handlers and `queryjs-block-widget.ts:217` mousedown pattern: match.
15. `AppearanceSection.svelte:172-178` row keydown: matches (`:177`).
16. `TodoistSection.svelte:120-148` Root project row: matches.
17. `KanbanView.svelte:488-496` native sort select: matches; bits-ui `menu.svelte.js:1593-1599` and `select.svelte.js:705-717`: match.
18. `mods-host.service.ts:758,843,873,1126,1077` literals and the listener-before-await comment: match.
19. `CollectionTableView.svelte:39` `overflow-auto`, `FilterPanel.svelte:113-115` and `:73-85`: match.
20. `NoteRow.svelte:70`, `SearchResult.svelte:171`, `CalendarNavigator.svelte:88`, `EventCalendarView.svelte:284`, `BuildInfo.svelte:49-52`: match.
21. Test pins: `Rail.test.ts:451-457`, `KanbanView.test.ts:71-76,246-254`, `GraphView.test.ts:73`, `CollectionView.test.ts:755`, `TasksView.grouping.test.ts:40`, `ModsStatusList.test.ts:116-133`: match. `kb-ui.test.ts:754` is the `tagName` line; the failing line is `:753` (section 3).
22. `.scratch/archived/live-preview-audit/repro/interactions/widget-click.test.ts:105-115`: matches.
23. `ModStatusEntry` has no `description`; `ModManifest.description` exists (`mods.logic.ts:145-146`): matches the ticket premise.
24. `moveItem` and the three-dot mvp diff: `merge-base` equals origin/main, so the three-dot diff is the full mvp-claude change.

## 8. Not verified

No tests, builds or git state changes were run. Contrast numbers other than the tab bar ratio, container-query behaviour, WKWebView details and every by-eye result were not recomputed.
