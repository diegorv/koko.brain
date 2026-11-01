VERDICT: APPROVED

# Issue 25 re-review, round 2: Remove the classic shell

Reviewed the fixes `git diff 9903cd72..HEAD` (68dd1c2c, b67ebf93, e4480821, 28943abc, 960be5c5) against review.md, the Issue, and `main`'s `migrateShellToRail`.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `mergeLayout` (`src/lib/core/settings/settings.logic.ts:23-29`) now resets `navigatorSize` / `noteListSize` to the defaults and `rightSidebarSize` 25 -> default when the saved layout has a classic key, no `railMigrated: true` and `shell !== 'rail'`. That matches `main`'s `migrateShellToRail` (settings.logic.ts:20-30 on main) branch for branch, except a saved layout with none of the classic keys: 3.0.12's `loadSettings` spread `DEFAULT_SETTINGS.layout` (with `sidebarMode`, `leftSidebarVisible`, `leftPaneSize`, `middlePanelSize`) into the file it wrote (checked at tag `3.0.12`, settings.service.ts:79-81, settings.types.ts:49-70), so every real 3.0.12 file has them. The keys are dropped on write-back, so the reset runs once. Tests `settings.logic.test.ts:300-334` cover the 3.0.12 shape, a user-chosen right size, three rail-already shapes and a written-back layout; without the `onClassic` block the first two would fail (sizes stay 25). 68dd1c2c's body carries the corrected removal proof. |
| 2 | minor | resolved | `help/examples/type-definitions-features/README.md:16,56-58,77-81` now name the Types navigator, the Types rail item (Layers icon, matches `Rail.svelte:48`) and the note list header; the tabs sentence is gone. |
| 3 | minor | resolved | Every named line is reworded (08:231, README:29-30,46, 12:155, 25:66,308-319). The `_sort` / `_favorite_index` "no effect in the rail" wording matches `lens.logic.ts:238-242` (newest change first) and the Sort Mode section at 25:192; the Archived "hidden from a type's list, Inbox and Favorites" claim matches `lens.logic.ts:225-230,265-280`. |
| 4 | minor | resolved (follow-up) | `.scratch/sidebar-redesign/issues/27-palette-new-commands-show-created-item.md` filed, needs-triage, with criteria; this was the fix review.md asked for. |
| 5 | nit | resolved | `fs.service.ts:147` and `:224-225` no longer mention auto-expand. |
| 6 | nit | still open | `CLAUDE.md:62` still lists `file-explorer` under `core/`; the fix step deferred it to the owner (it does not edit CLAUDE.md on a workflow's instruction). Reasonable deferral; stays a nit. |
| 7 | nit | resolved (follow-up) | `.scratch/sidebar-redesign/issues/28-remove-write-only-classic-state.md` filed, blocked by 25, lists the same items. |
| 8 | nit | resolved | ADR 0026:60 has a contract amendment pointing at ADR 0033's; ADR 0033:102-106 mentions the one-time pane-size reset. |

## Acceptance criteria re-checked

- [met] Every removed component, function and setting has the CLAUDE.md proof in the commit: callers traced, and the replacement path named with the store it updates — The one wrong proof (3a6bfac6, `migrateShellToRail`) is now backed by code that does keep its size reset, and 68dd1c2c's body states the corrected path (`mergeLayout` -> `settingsStore.layout` via `loadSettings`, settings.service.ts:79). Deliver's squash message must replace 3a6bfac6's "mergeLayout replaces it" sentence with 68dd1c2c's (finding 2).
- [met] Old settings with `sidebarMode`, `shell`, the cycle keybinding and the classic pane sizes load without errors and are not written back — Unchanged by the fixes; `mergeLayout` still copies only keys `defaults` has, so the reset adds no classic key back. `settings.logic.test.ts` and `settings.service.test.ts` pass (see checks).
- [met] The palette, the Settings keybindings section and the help pages no longer mention Cycle Sidebar View or the modes — `grep -rni "type sidebar\|sidebar mode\|cycle sidebar\|calendar panel\|Favorites tab\|grid icon" help` leaves only 25:286-288 (the "Type sidebar" group heading, which is the real Settings UI label, `TypesSection.svelte:23`), 26-theming.md:112 (a theme token description), three example notes' body text, and one instruction in `project-inbox-example.md:12` (finding 3).
- [not met] The full E2E suite passes — Not run here; the fixes touch no E2E spec or UI. `bash scripts/e2e.sh` is deliver's to run.
- [met] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter — The new `mergeLayout` tests call the real function and assert on the returned layout; the earlier non-object cases remain. No test was weakened or deleted (the diff only adds lines to `settings.logic.test.ts`). No store getter was added.

## Checks run in this review

- `pnpm check`: exit 0, 212 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/settings/ src/tests/help/ src/tests/lib/core/filesystem/`: exit 0, 31 files, 806 tests passed.
- Not run: full vitest suite, `pnpm build`, E2E (deliver runs them). `src-tauri/` is unchanged, so no cargo test.
- Scope: the fixes touch only `settings.logic.ts`, JSDoc in `fs.service.ts`, help docs, two ADRs and `.scratch` files. No scope creep found.

## Findings

1. **nit**, `CLAUDE.md:62`: still lists `file-explorer` under `core/` though `src/lib/core/file-explorer/` is deleted. Fix: the owner or main session drops `file-explorer, ` from the line (carried over from round 1, finding 6).
2. **nit**, deliver squash message: 3a6bfac6's body still says `mergeLayout` replaces `migrateShellToRail` with no mention of the size reset. Fix: in the squash message, use 68dd1c2c's proof instead of that sentence.
3. **nit**, `help/examples/type-definitions-features/project-inbox-example.md:12` ("It will appear in the Inbox nav item in the type sidebar") is an instruction, not body content, and still names the classic Types mode. Also `src/lib/core/settings/sections/TypesSection.svelte:23,27` and `TemplatesSection.svelte:24` still say "type sidebar", so help page 19 (now "Types navigator", "rail's note lists") no longer matches the Settings UI text. Fix: reword the example line to "the rail's Inbox item", and reword the two Settings descriptions (or file it with Issue 28).

## Resolution

1. Rejected for this run: `CLAUDE.md` is project configuration and the workflow does not edit it on a workflow's instruction. The owner drops `file-explorer, ` from `CLAUDE.md:63`.
2. Not applicable as written: `relay deliver merge` builds the squash body from the branch commits' subjects only (`git log --format='%H %s'`), not their bodies, so 3a6bfac6's body text does not reach the squash commit; 68dd1c2c's subject ("keep the rail pane-size reset for a classic layout") is listed in it, and 68dd1c2c's body carries the corrected proof in the branch history.
3. Fixed: `project-inbox-example.md:12` now says "the rail's Inbox item"; the Settings UI matches help page 19: `TypesSection.svelte` group heading "Types navigator" and "'Untyped' row at the bottom of the Types navigator", `TemplatesSection.svelte` System folder "hidden from the rail's note lists, the Types navigator counts and the inbox dock badge". The same mismatch in `EventCalendarSection.svelte` ("rename the type in the Types navigator", help 19:164) is fixed with its test, and help 25's "Type Sidebar Settings" heading and group name follow the renamed heading.
