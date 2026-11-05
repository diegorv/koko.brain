VERDICT: CHANGES_REQUESTED

# Issue 35 review: ADR-0032 recorded, ADR-0029 and ADR-0009 amended

Reviewed `git diff main...HEAD` (341f9280, 1ec63284, 8a1ab589). The diff touches only `docs/adr/` and `.scratch/`, so no source, no test file and no gate applies. `pnpm check` was not run because the diff does not touch the frontend.

The ADR content is accurate and complete against every acceptance criterion. The changes requested below are small factual fixes. They have to land before merge: `docs/adr/README.md` (Rules) says an active ADR may only get typo and link fixes once it is merged, so a wrong fact cannot be corrected later.

## Evidence base

- Re-ran both inventory greps on the worktree tree: `grep -rn "features/event-calendar" src/lib` (8 hits outside the feature: 5 core, 2 command-palette, 1 plugin) and `grep -rnE "['\"](\\\$|#)lib/features/" src/lib/features/event-calendar` (10 hits). Also checked: no `$lib/plugins/` import in the feature, no `../../` relative import, no `#lib/` specifier, no `src/routes` import of the feature.
- Checked every line anchor the ADR and both amendments cite, against the worktree tree. All are correct except finding 3: `event-calendar-event.logic.ts:81-85, 110-113, 278-279, 367-370`, `settings.logic.ts:64-69`, `note-change.service.ts:17, 92-94`, `trash.service.ts:145-146`, `frontmatter-write.service.ts:68, 94`, `event-calendar.service.ts:598, 650`, `type-definitions.service.ts:174-200`, `watcher.rs:74-82`, `EditorTabs.svelte:55`, `frontmatter-aliases.ts:17`, and `PropertyField.svelte:123` (date input).
- Checked the behaviour claims against the code. `updateNoteFrontmatter`: lossy check before mutate, tab branch, closed branch with `exists` + `notifyAfterSave`, no re-create. `createEvent`: `template-lossy` is thrown inside `buildContent` before any write. `duplicateEvent`: copies the bytes unchanged when the frontmatter is lossy. The six lossy reasons are at `properties.logic.ts:198-203`, the six hues at `settings.logic.ts:41`, and the rename hint at `EventCalendarSection.svelte:220`.
- Checked the precedent claim of `ADR-0032:56` against `git show c3ef20b7^` (the parent of the feature's first commit). See finding 1.
- Test probe, as support for the `restore` claims and not as a gate: `./node_modules/.bin/vitest run src/tests/lib/core/filesystem/note-change.service.test.ts src/tests/lib/core/trash/trash.service.test.ts` passed 2 files and 58 tests after `svelte-kit sync`. `note-change.service.test.ts:86` covers the `restore` row. The test verdict rests on those two files only. The diff itself adds or changes no test file.

## Acceptance criteria

- [x] **Decision and rejected alternatives: met.** `0032:15-17` states in bold that events are event-typed notes. Alternatives `0032:99` (sidecar JSON, plus localStorage) and `0032:100` (promoting `plugins/calendar` and `periodic-notes`).
- [x] **Event type name (D25) and `event_title` (D6): met.** `0032:25-29` covers `settingsStore.eventCalendar.eventTypeName`, the `normalizeEventTypeName` fallback, `resolveEventTypeName` and why it is a setting (`renameType`). `0032:31-35` covers `event_title`: stored only when it differs from the filename, the display rule, and why `title` and `color` were rejected.
- [x] **Inventory built from the two greps, `#lib/` covered: met.** `0032:52-86`. It records the escaped pattern that was actually run, explains why the plan's literal pattern matches nothing on BSD grep, covers `#lib/features/`, and notes that no file uses `#lib/`. My grep re-run matches the tables row for row. The one gap is cosmetic: row `0032:75` leaves out the type-only `FrontmatterWriteReason` (finding 4).
- [x] **Grouping as the plan expects: met.** Core to event-calendar has the five plan files with correct lines. Feature to feature: `command-palette.service.ts:32-33`; event-calendar to `features/properties` (logic and writer); event-calendar to `features/type-definitions` (`type-sidebar.logic`, store, `createTypedNote`, plus the `EventCalendarSection.svelte:14-16` extras the grep found). Plugin to feature: `CalendarPanel.svelte:13`. `EditorTabs.svelte:55` is explained and not listed.
- [x] **`restore` note-change source: met.** `0032:48-50`, and `0032:109` in Consequences.
- [x] **"Relation to ADR-0029" section: met.** `0032:88-95`. `updateNoteFrontmatter` and calendar creation refuse lossy frontmatter, and the existing writers keep the drop. Its writer list matches ADR-0029 "Trigger window" (`0029:82`).
- [x] **README row after 0031: met.** `docs/adr/README.md:139`.
- [x] **ADR-0029 Consequences ends with a matching amendment: met.** `0029:101` is the last Consequences bullet before the Citation map. It names the same two refusing paths and says the other Trigger-window writers keep the drop.
- [x] **ADR-0009 amendment at "The five sources": met.** `0009:50`, right after the `:48` paragraph: there are now six sources, and `restore` has `rust: 'always'` because no `create_note` ran and the delete had already removed the note from Rust.
- [x] **Docs-only diff, one commit in the full format: met.** 1ec63284 touches only `docs/adr/` and has Context, Problem, Solution, Behavior, Files with line ranges and the Co-Authored-By trailer. The other two commits are workflow bookkeeping in `.scratch/`.

## Findings

1. **Low, factual error.** `docs/adr/0032-calendar-events-are-event-typed-notes.md:56` says "`global-keybindings.ts` already imported four features and two plugins". Before the feature (`git show c3ef20b7^:src/lib/core/keybindings/global-keybindings.ts`, lines 9-19), the file imported five features (quick-switcher, search, tasks, command-palette, file-history) and three plugins (graph-view, quick-capture, one-on-one). The `tauri-listeners.service.ts` half ("a plugin and four features") is correct. **Fix:** change it to "five features and three plugins".
2. **Low, incomplete owner list.** `docs/adr/0032-calendar-events-are-event-typed-notes.md:41-46`, "Writes go through the existing owners", names `updateNoteFrontmatter`, `createTypedNote`, `deleteItem` and `restoreItem`. The feature also writes through two other owners: `renameItem` (an edit that changes the title renames the note, `event-calendar.service.ts:418`) and `createFile` (duplicate, `event-calendar.service.ts:652`). The service's own header (`event-calendar.service.ts:5-9`) lists both. An ADR that says writes go "only through the existing owners" should name all of them. **Fix:** add a bullet: "A title edit renames the note through `renameItem`; Duplicate writes the copy through `createFile` (`fs` source)."
3. **Low, wrong citation range.** `docs/adr/0032-calendar-events-are-event-typed-notes.md:50` and `:123` cite `indexRestoredNote` at `trash.service.ts:221-230`. The function spans `:221-234`; line 230 is only the `applyNoteChange` call. **Fix:** change it to `:221-234` in both places, or cite `:230` as the `applyNoteChange` call.
4. **Info, optional.** `docs/adr/0032-calendar-events-are-event-typed-notes.md:75` lists `updateNoteFrontmatter, FrontmatterWriteError` for `event-calendar.service.ts:27`, but the line also imports `type FrontmatterWriteReason` from the same module. No new edge between modules is missing. **Fix (optional):** add `FrontmatterWriteReason` (type) to the row.

## Not findings (checked)

- `docs/adr/README.md` Rules say "Active ADRs are never edited" and to supersede instead. This diff appends dated amendment notes to ADR-0009 and ADR-0029. The Issue and plan Task 34 require that, and it has precedent (`0009:69`, and `0025:76` and `:175` for "Amendment 2026-08-19"). No action.
- `CLAUDE.md:274` still lists five sources. Issue 34 (user docs) owns that change, so it is out of scope here.
- Scope: no file outside the Issue's Touches list, apart from `.scratch` bookkeeping.

## Resolution

All four findings accepted and fixed in ADR-0032; none rejected. Each was checked against the tree before editing.

1. Precedent count changed to "five features and three plugins" (confirmed against `git show c3ef20b7^:src/lib/core/keybindings/global-keybindings.ts:9-19`).
2. Added the owner bullet: a title edit renames through `renameItem` (`event-calendar.service.ts:418`), Duplicate writes through `createFile` (`event-calendar.service.ts:652`, which calls `applyNoteChange` with source `fs` in `fs.service.ts:131`).
3. `indexRestoredNote` range changed to `trash.service.ts:221-234` in both places.
4. Added `FrontmatterWriteReason` (type) to the `event-calendar.service.ts:27` row.
