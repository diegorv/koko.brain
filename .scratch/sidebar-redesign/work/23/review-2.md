VERDICT: APPROVED

# Re-review (round 2): Issue 23, the rail shell becomes the default

Reviewed the fix commits `git diff 7d7e49e0..HEAD` (098b257a, 31a4ab47, 56667f07, d22cc339, 746c4883, 73fa299e) in the worktree, against `.scratch/sidebar-redesign/work/23/review.md`.

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|---|---|---|---|
| 1 | major | 02-file-explorer.md:19 promised a toast for a taken name | resolved | Line 19 now says Kokobrain adds a number (for example `Untitled 1.md`). That matches `generateUniqueName` (src/lib/core/filesystem/fs.logic.ts:215-244), which builds `<base> <n><ext>` with case-insensitive comparison. |
| 2 | major | Migrated Classic users kept the old 15/22/25 pane sizes | resolved | `migrateShellToRail` (settings.logic.ts:15-31) now takes `defaults`. A saved shell other than `rail` (Classic or no shell) resets `navigatorSize` and `noteListSize`, and resets `rightSidebarSize` only when it is still 25. An unmarked `shell: 'rail'` layout keeps its sizes, and `railMigrated: true` still returns `layout` unchanged. Its only caller, settings.service.ts:79, passes `DEFAULT_SETTINGS.layout`. The new logic tests (settings.logic.test.ts:275-300) and the new `loadSettings` case (settings.service.test.ts:394-412) assert the real store state and the JSON written back: 14/20/20 from Classic, 15/22/25 kept for Rail. |
| 3 | nit | search.spec.ts selected rows by `.h-20` | resolved | SearchResult.svelte:135 has `data-search-result`. search.spec.ts:29,37,43 select on it. SearchResult.test.ts:189-197 asserts the attribute on a rendered row. rail-shell.spec.ts:837,883 and SearchPanel.test.ts:61 still use `.h-20`, but they predate this branch, so I did not count them against it. |
| 4 | nit | Stray blank line in ADR 0026 | resolved | The blank line from the earlier diff is removed. The ADR 0026 diff against main is now only the 2026-11-01 amendment (3 lines added). |
| 5 | nit | Classic calendar E2E cases deleted | resolved | calendar-plugin.spec.ts:80-113 adds a top-level `Calendar plugin (classic shell)` describe with `test.use({ shell: 'classic' })`. The file-level `clockTime`/`timezoneId` still apply there. Two cases are restored word for word from main: the files/types Open Calendar header loop and the double-click day view. The classic fixture vault pins `shell: 'classic', railMigrated: true` (e2e/fixtures/test-vault.ts:47-49), so the migration does not move those cases to Rail. Main's "Open Calendar opens at the selected date" case was not restored, but the rail case "Open Calendar tab opens the Calendar tab at the picked day" covers the same behavior, and the original finding did not name it. |

## Acceptance criteria re-checked

- [met] A new install starts in the rail shell; an existing Classic setting migrates to Rail exactly once, and a user who switches back stays on Classic — the size reset changes nothing in the once-only logic: `railMigrated: true` still returns early (settings.logic.ts:21), and the switch-back tests in settings.logic.test.ts and settings.service.test.ts still pass. A migrated Classic user now opens at the 14/20/20 defaults (settings.service.test.ts:394-412).
- [met] The file explorer, types and calendar help pages describe the rail shell; no page promises behavior the app lacks — the one false claim (the toast) is gone. 02-file-explorer.md:19 now matches `generateUniqueName`. The other pages are unchanged since round 1, where their claims held.
- [met] ADR 0033 is `active` (frontmatter and the README index), with code citations updated to the shipped files; ADR 0026 carries the dated amendment — the fixes touched ADR 0026 only to drop the stray line. The 2026-11-01 amendment is still there. ADR 0033 is unchanged since round 1.
- [met] The sidebar, file explorer, calendar and search E2E specs pass in the rail shell — the rail selectors in search.spec.ts now use `data-search-result`, which SearchResult.svelte:135 renders. The restored classic cases are pinned to `classic` and do not change the rail runs. I did not run the E2E: `bash scripts/e2e.sh` is deliver's gate.
- [met] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter — the new tests use the real `settingsStore` and real `migrateShellToRail`, and they assert store state, the written JSON and rendered DOM. No test was weakened or deleted: the existing `migrateShellToRail` cases only gained the third argument. No store getter was added.

## Findings

No open or new findings.

Observation, not a finding: `rightSidebarSize` is used by both shells, so a migrated user who goes back to Classic and had the old default of 25 now gets 20. That is the same default a new Classic install gets, so I accept it.

## Checks I ran

- `pnpm check`: exit 0, 221 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/settings/ src/tests/lib/features/search/SearchResult.test.ts src/tests/lib/features/search/SearchPanel.test.ts src/tests/lib/core/app-lifecycle/`: exit 0, 24 files, 517 tests passed.
- Not run: the full `pnpm vitest run`, `pnpm build` and `bash scripts/e2e.sh`. Deliver runs those.
- No src-tauri/ change, so cargo test does not apply. No source code was changed in this step.
