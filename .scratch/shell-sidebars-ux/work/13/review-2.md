VERDICT: APPROVED

# Issue 13 re-review, round 2

Reviewed the fixes after the first review commit: `git diff 2f4ac330b..HEAD` (9e9a93450, 81c6ea580). Source change: `src/lib/features/rail-shell/FilesNavigator.svelte` (+22/-3); test change: `src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts` (+59/-1); plus the review resolution.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | `FilesNavigator.svelte:185-189` adds `absorbWhileClosing`, identical in logic to `context-menu-content.svelte:24-28`, wired as `onpointermovecapture`, `onpointerleavecapture`, `onmousedowncapture`, `onclickcapture` on the header `DropdownMenu.Content` (`:350-357`). `dropdown-menu-content.svelte` spreads `restProps` onto `DropdownMenuPrimitive.Content`, so the handlers reach the element that carries `data-state`. Tests `FilesNavigator.menu.test.ts:766-804` assert one `create_note` on a second click during the exit animation, and that the New folder rename input keeps focus after pointermove + mousedown on the closing menu. Probe: with the four handler lines deleted, both tests fail (2 failed, 67 passed); restored with `git checkout`, worktree clean. The guard only acts while `data-state="closed"`, so open-menu behavior is unchanged (all other header-menu tests pass). Local placement keeps other dropdowns unchanged, which is in scope. |
| 2 | nit | resolved | `FilesNavigator.svelte:172` now reads "once the menu has given focus back". |
| 3 | nit | rejection stands | No change asked; the "Create in Projects/" heading matches the prototype and the discovery default. Left for the owner. |

## Acceptance criteria re-checked

- [met] Failing test first, `src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts`: the header has a "+" named "New in folder"; its menu lists exactly the folder context menu's labels minus mod items, in the same order, with New kanban board registered through the real `railRegistryStore`. — Unchanged by the fixes; the label-list test still passes in `FilesNavigator.menu.test.ts` (69/69).
- [met] With `Projects` picked, New note from the header creates `Projects/Untitled.md` (`fs.service` and Tauri mocked, nothing else), opens it and keeps `Projects` picked; with the root picked it creates at the root; New folder starts the inline rename of the created folder. — The guard touches this path; the create/open/pick and New folder rename tests pass, and the new tests confirm a second click creates only once and the rename input keeps focus.
- [met] `menu-item-anatomy`, `chrome-state-styles` and `rail-shell.boundary` tests pass; E2E `rail-shell.spec.ts:836-880` and `file-operations.spec.ts:5-9` pass untouched (no e2e looks up the renamed labels; the Files-menu lookups are "New note" and "New table"). — The three unit suites pass (run below). No `e2e/` file changed in the fix; E2E not run in this step.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (235 files, 0 errors, 0 warnings). Targeted vitest files pass; the full suite is deliver's to run.

## Findings

None open or new.

- Test helper `holdExitAnimation()` (`FilesNavigator.menu.test.ts:753-761`) patches `HTMLElement.prototype.getAnimations` and removes it in `onTestFinished`, so it does not leak into later tests (the remaining tests in the file pass after it). No test was weakened or deleted; the only other test-file change is the `onTestFinished` import.
- Scope: no creep. No layer-baseline entry, no `BASELINE_SIZE` change, no composition root, no `src-tauri/` change.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts src/tests/lib/features/rail-shell/FilesNavigator.test.ts src/tests/lib/features/rail-shell/FilesNavigator.new-view.test.ts src/tests/lib/menu-item-anatomy.test.ts src/tests/lib/chrome-state-styles.test.ts src/tests/lib/features/rail-shell/rail-shell.boundary.test.ts`: exit 0, 6 files, 138 passed.
- Guard-removal probe on `FilesNavigator.menu.test.ts`: exit 1, the two new tests fail; source restored.
- Not checked: E2E and the menu in the running app (real exit animation timing).
