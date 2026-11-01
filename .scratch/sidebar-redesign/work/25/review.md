VERDICT: CHANGES_REQUESTED

# Issue 25 review: Remove the classic shell

Reviewed `git diff main...HEAD` (7 commits, d6439952..e301ab17) in the worktree, against the Issue, PRD Rollout step 4 / Q6 (no `spec.md` exists) and ADR 0033.

## Acceptance criteria

- [not met] Every removed component, function and setting has the CLAUDE.md proof in the commit: callers traced, and the replacement path named with the store it updates — Most removals carry it: the commit bodies of 3a6bfac6, 1210c448 and f6c5b0ff trace callers for KeybindingsSection, `cycleSidebarMode` / `nextSidebarMode`, `keybindings.logic.ts`, the classic panels, `searchStore.isOpen` / `toggleSearch`, `fsStore.expandedDirs` / `pendingCreationPath`, and `countNavItems` and the other orphans, and c6d57bf2 does the same for `onDayDblClick`. The proof for `migrateShellToRail` (3a6bfac6) is wrong. It says `mergeLayout` replaces it and "still writes `settingsStore.layout`", but `migrateShellToRail` also reset `navigatorSize` / `noteListSize`, and `rightSidebarSize` 25 -> 20, for any layout not yet moved to the rail. `mergeLayout` does none of that (finding 1). This is the "same Rust command != same effect" trap in CLAUDE.md.
- [met] Old settings with `sidebarMode`, `shell`, the cycle keybinding and the classic pane sizes load without errors and are not written back — `settings.service.test.ts` "drops the classic shell keys from an old settings file and does not write them back" checks that the store and the written JSON have no `keybindings` and none of the six layout keys. `settings.logic.test.ts` `mergeLayout` covers the happy path, stale keys, and undefined / null / string / array input. `loadSettings` builds the top-level object key by key with no `...parsed` spread, so top-level `keybindings` cannot leak (settings.service.ts:55-160). The e2e test in `e2e/specs/rail-shell.spec.ts:303` covers the same in the app. All of these pass.
- [not met] The palette, the Settings keybindings section and the help pages no longer mention Cycle Sidebar View or the modes — The palette entry and the Settings section are gone. `command-palette.service.test.ts:197` and `CommandPalette.test.ts:105` (rendered, no ⌘⇧E) pass. `help/documentation/` has no "Cycle Sidebar View", Classic layout or sidebar-mode text left. But `help/examples/type-definitions-features/README.md:76` still says "Switch to type sidebar mode (click the grid icon in the file explorer header)", and line 80 points at the classic "Open / Archived / Favorites tabs" (finding 2).
- [met] The Calendar tab's Cmd+Shift+C no longer needs the cycle-binding conflict check — `global-keybindings.ts` registers `key: 'c', meta, shift` and calls `toggleEventCalendarTab()` with no `keybindingsEqual` guard. `global-keybindings.test.ts:217` and `:528` pass; `:528` opens and closes the Calendar tab and checks `editorStore`.
- [not met] The full E2E suite passes — Not run in this review: the gate is `bash scripts/e2e.sh`, which deliver runs. The build report claims 290/290, which I did not verify. This does not hold back the verdict by itself.
- [met] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter — The changed tests use the real `settingsStore`, `searchStore`, `editorStore` and the persistence effect. No store or `.logic.ts` is mocked. `mergeLayout` has happy, stale-key and non-object cases. No store getter was added. The rendered checks are `GeneralSection.test.ts` (no Classic picker) and `CommandPalette.test.ts`. One test is missing: the pane-size case in finding 1.
- [met] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme — There is no new UI, only removals. SearchPanel keeps its former rail markup (`bg-file-explorer-bg text-file-explorer-fg`, `bg-tab-bar`, `var(--divider)`). I did not check it per theme.

## Checks run in this review

- `pnpm check`: exit 0, 212 files, 0 errors, 0 warnings.
- Targeted vitest, 38 files, exit 0, 1222 tests passed. My test verdict rests on these files:
  - `src/tests/help/{examples-scoping,queryjs-features-scoping,templates-script-paths,type-definitions-views}.test.ts`
  - `src/tests/lib/core/filesystem/{fs.service,fs.service.race-audit,fs.store}.test.ts`
  - `src/tests/lib/core/keybindings/global-keybindings.test.ts`
  - `src/tests/lib/core/layout/{layout.logic,layout.service,tauri-listeners.service}.test.ts`
  - `src/tests/lib/core/settings/{GeneralSection,SettingsPanel,settings-persistence,settings.logic,settings.service,settings.store}.test.ts`
  - `src/tests/lib/features/command-palette/{CommandPalette,command-palette.service}.test.ts`
  - `src/tests/lib/features/deep-link/deep-link.service.test.ts`
  - `src/tests/lib/features/event-calendar/EventCalendarView.test.ts`
  - `src/tests/lib/features/note-action-bar/{NoteActionBar,note-action-bar.logic}.test.ts`
  - `src/tests/lib/features/rail-shell/{FilesNavigator,FilesNavigator.menu,RailNoteList,RailNoteList.view,TypesNavigator,lens.logic,neighbourhood.service,view-lens.service}.test.ts`
  - `src/tests/lib/features/search/{SearchPanel,open-search.service,search.store}.test.ts`
  - `src/tests/lib/features/tags/TagsView.test.ts`
  - `src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts`
  - `src/tests/lib/plugins/calendar/{CalendarGrid,calendar.logic}.test.ts`
- Probe for finding 1: a temporary vitest file, deleted afterwards. `mergeLayout(DEFAULT_SETTINGS.layout, <3.0.12 layout with rightSidebarSize: 25>)` returns `rightSidebarSize` 25 where 20 was expected, so the test fails.
- Not run: `pnpm build`, the full vitest suite and the E2E suite (deliver runs them). `src-tauri/` is unchanged, so no cargo test was needed.

## Findings

1. **major**, `src/lib/core/settings/settings.logic.ts:11` (`mergeLayout`), with `settings.service.ts:79`. Removing `migrateShellToRail` silently drops Issue 23's pane-size reset (31a4ab47 "a layout moved from Classic gets the rail default pane sizes"), and that reset is still needed.
   - The flip commit c993b6ad is not in any release: it is not an ancestor of tag `3.0.12` or `nightly`. So every existing user upgrades from 3.0.12 straight to this build without the one-time move.
   - In 3.0.12, `loadSettings` writes the merged defaults back, so every 3.0.12 settings.json carries `layout.rightSidebarSize: 25`. The new code keeps that 25 where the rail default is 20, which leaves the editor narrower than the ~640 px at 1440 px that `e2e/specs/sidebars.spec.ts` "Default pane sizes" guards. That spec only checks a vault with no saved sizes, so it cannot catch this.
   - Fix: before the stale keys are dropped, keep the size rule for a saved layout without `railMigrated: true` and with `shell !== 'rail'`. That means `navigatorSize` and `noteListSize` from the defaults, and `rightSidebarSize` 25 -> the default. It can live in `mergeLayout` or in `loadSettings`.
   - Add a `settings.logic.test.ts` case with the 3.0.12 layout shape (`sidebarMode`, `leftSidebarVisible`, `leftPaneSize`, `middlePanelSize`, `rightSidebarSize: 25`, no `shell`) and a layout already on the rail (`railMigrated: true`, sizes kept).
   - Fix the 3a6bfac6-style proof in the squash message. If dropping the reset is intended, get the owner's sign-off and say so in the commit, since the build report's "keeps its old navigator and note-list sizes" understates it: released users have no rail sizes, only the old right-sidebar 25.
2. **minor**, `help/examples/type-definitions-features/README.md:76`. This help example still says "Switch to type sidebar mode (click the grid icon in the file explorer header)". Line 80 refers to "The Open / Archived / Favorites tabs underneath", which were the classic TypeNoteList tabs, and lines 16 and 56 say "type sidebar". Fix: point at the Types rail item and the note list, and drop the tabs sentence.
3. **minor**, help pages still name deleted classic UI:
   - `help/documentation/08-periodic-notes-and-calendar.md:231` ("Sidebar Panels -- Calendar panel and properties"; page 07 no longer has a calendar panel)
   - `help/documentation/README.md:30` ("calendar panel") and `:46` ("type sidebar")
   - `help/documentation/25-types-and-relationships.md:313` (`_favorite_index`: "Sort order of notes in Favorites tab")
   - `help/documentation/25-types-and-relationships.md:66` and `:314`: `_sort` is "Sort mode for notes in type sidebar sections", which contradicts `:192` on the same page ("a type definition's `_sort` does not change it")
   - `help/documentation/12-collection.md:155` ("the type sidebar's note list")

   Fix: reword these in rail terms, or mark the two fields as having no effect in the rail.
4. **minor**, `src/lib/features/command-palette/command-palette.service.ts:79,90,101,112`. "New File", "New Folder", "New Canvas" and "New Kanban Board" still set `fsStore.renamingPath`. Its only remaining reader is `NoteRowMenu`, which handles notes in the current list. For a folder (`:90`) nothing reads it now. The classic tree's open-after-rename (`pendingCreationPath`) was the only thing that made these commands visible. The rail on main already behaved this way, so this is not a regression of this branch, but with Classic gone nothing covers it. Fix: file a follow-up (open the created file, or show its folder in the Files navigator).
5. **nit**, `src/lib/core/filesystem/fs.service.ts:147` and `:224`. The JSDoc of `createFolder` ("and auto-expands it") and `moveItem` ("auto-expands the ...") is stale now that `fsStore.expandDir` is gone. Fix: drop the clause.
6. **nit**, `CLAUDE.md:63`. The Project Structure line still lists `file-explorer` under `core/`, and `src/lib/core/file-explorer/` is deleted. Fix: remove it from the list.
7. **nit**: write-only state left behind, as the build report also says: `fsStore.selectedFilePath` (still set by `editor.service`), calendarStore `selectedDateKey` / `setSelectedDateKey` / `dayFileCounts` / `selectedDateFiles`, and the unused `subFilter` parameter of `getNotesForSelection` / `getNotesForViewPaths`. Fix: a follow-up Issue, so it is tracked rather than only noted in a report.
8. **nit**, `docs/adr/0026-*.md:58`. The 2026-11-01 amendment still says the classic modes "stay selectable (Settings > Sidebar > Layout > Classic) until ADR 0033's contract step removes them". It is now historical. Fix: add one line pointing at ADR 0033's contract amendment.

## Resolution

1. **Fixed** in 68dd1c2c. `mergeLayout` (`src/lib/core/settings/settings.logic.ts:4-31`) keeps Issue 23's size rule for a saved layout that has a classic key (`shell`, `sidebarMode`, `leftSidebarVisible`, `leftPaneSize`, `middlePanelSize`), no `railMigrated: true` and a `shell` other than `rail`: `navigatorSize` and `noteListSize` come from the defaults, and `rightSidebarSize` 25 becomes the default. The classic-key condition replaces the old `railMigrated` marker: those keys are dropped on write-back, so the reset runs once, and a layout this build wrote keeps a user-chosen 25. Tests in `src/tests/lib/core/settings/settings.logic.test.ts:299-336` cover the 3.0.12 layout shape (failed before the fix, 2 of 74), a custom right size, layouts already on the rail (`railMigrated: true`, or `shell: 'rail'`) and a written-back layout. ADR 0033's contract amendment mentions the reset (e4480821). The squash message should replace 3a6bfac6's "mergeLayout replaces it" proof with this.
2. **Fixed** in b67ebf93: the example README points at the Types rail item, the Types navigator and the note list header; the tabs sentence is gone.
3. **Fixed** in b67ebf93: every named line, plus the other "type sidebar" mentions found by `grep -rn "type sidebar" help` (18-trash.md:33, 19-settings.md:140,147,164, 25-types-and-relationships.md:35,554, examples/SCOPING.md:74, and the other alias-table rows). `_sort` on a type definition and `_favorite_index` are marked as having no effect in the rail, which matches `lens.logic.ts` (`listEntries` and the type lens sort newest change first). Left alone: the `fileExplorerBorder` description in 26-theming.md:112 and two example notes' body text that mention a type sidebar as content.
4. **Follow-up filed** in 28943abc: `.scratch/sidebar-redesign/issues/27-palette-new-commands-show-created-item.md` (needs-triage).
5. **Fixed** in e4480821: the `createFolder` and `moveItem` JSDoc no longer say auto-expand.
6. **Not changed, deferred to the owner.** Removing `file-explorer` from the `CLAUDE.md:63` Project Structure line is correct (`src/lib/core/file-explorer/` is deleted), but this fix agent does not edit `CLAUDE.md` on a workflow's instruction: agent configuration files change only on the owner's request. The one-word edit is left for the main session or the owner.
7. **Follow-up filed** in 28943abc: `.scratch/sidebar-redesign/issues/28-remove-write-only-classic-state.md` (needs-triage, blocked by 25). Readers re-checked: `CalendarNavigator.svelte:142` passes its own `dayCounts` / `pickedDay`, and `lens.logic.ts:284,567` never pass `subFilter`.
8. **Fixed** in e4480821: ADR 0026 has a contract amendment pointing at ADR 0033's.

Issues 27 and 28 are new; the ledger is the main session's to update.
