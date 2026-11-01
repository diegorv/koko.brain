VERDICT: APPROVED

# Re-review (round 2): Issue 12, Types navigator and type lens

Reviewed `git diff 2f93abde..HEAD` (d94d631c, 50729edf, 708084e4, a440433f) in the worktree.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `stepTypesPickCheck` (`src/lib/features/rail-shell/lens.logic.ts:267-279`) resets on every path change and arms only after it sees `indexReady === false`. It records `entriesVersion` at the first ready observation and runs on the first snapshot above that, once. I traced the lifecycle: `initializeVault` calls `vaultStore.resetIndexReady()` at entry (`app-lifecycle.service.ts:140`), which also suppresses bump-driven readiness (`vault.store.svelte.ts:104,125-128`), and `markIndexReady()` runs only after this vault's `buildIndex` (`:316`). `typeDefinitionsStore.setEntries` has one writer, the throttled refresh (`tauri-listeners.service.ts:149`), and that refresh lands about 2 s after `scan_vault_v2`'s event, so after `markIndexReady`. Scenario A: path B arrives while A is ready, so the gate is not armed, and nothing runs until B's reset re-arms it. Scenario B: a tail snapshot from A that lands before ready is the version recorded at ready, so it is skipped. Both are covered by the pure tests (`lens.logic.test.ts:366-473`), which also cover once per open, no vault, the disabled shell and a reopen. The AppShell effect (`AppShell.svelte:128-143`) passes `vaultStore.path`, `indexReady`, `entriesVersion` and `isRailShell`, and keeps the fix inside `untrack`. The E2E fallback test still passes. |
| 2 | minor | rejection stands | The fallback runs once per vault open. The unit tests (`staleTypesPickFix`) and the E2E "a saved type that no longer exists falls back" check it. Mid-session the stale pick is visible and one click fixes it. A rule based on consecutive snapshots would add state tied to the throttle, for a rare case. This is the documented discovery default. |
| 3 | minor | rejection stands (owner to confirm) | The Issue text reads "then Untyped when `showUntypedNotes` is on", with no count condition. It is a documented default, and the change would be one line in `typeNavigatorRows`. |
| 4 | minor | resolved | `e2e/specs/rail-shell.spec.ts:387-392` restarts with the saved settings file after the drag and polls that the navigator width is within 3 px of the resized width. The drag widened it by more than 60 px (`:372`), so a pane that ignored `navigatorSize` would fail. The E2E passes on my run. |
| 5 | nit | resolved | `TypesNavigator.test.ts:187,192,197,206`: each menu action now also asserts `menuIsOpen() === false`, which is rendered state. The rename test keeps its rendered "This will update 2 notes" assertion. |
| 6 | nit | rejection stands | Pinning `tabTextActive` on `fileExplorerAccent` in `READABILITY_PAIRS` would let `withReadableContrast` recolour `tabTextActive` across the whole tab bar in custom themes. The New here button and the other tab-bar header buttons share the same unpinned hover. Issue 08 deferred the same item to a theme-token Issue. |

## Acceptance criteria re-checked

- [met] The picked type survives a restart; renaming the type keeps it picked; a type that no longer exists falls back to the default item — The restart and rename parts are unchanged from review 1 (both met). The fallback now runs once per vault open, gated by `stepTypesPickCheck` on this vault's own index readiness (`lens.logic.ts:267-279`, `AppShell.svelte:128-143`). Seven gate tests cover first open, a vault switch and a tail refresh. The E2E fallback test passes (16/16 in `rail-shell.spec.ts`).
- [met] The navigator pane resizes and its size persists; Cmd+1 / Cmd+2 hide and show it with the note list — The E2E now checks both sides of persistence: the saved `navigatorSize` grows, and after a restart the pane opens within 3 px of the resized width (`rail-shell.spec.ts:387-392`). The Mod+1 / Mod+2 hide and show assertions are unchanged. The E2E passes.
- [met] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter — The new gate is a pure `.logic.ts` function with direct tests, including the empty (`vaultPath: null`) and no-run paths. The menu tests now assert rendered state (menu closed) next to the service-seam calls. No store getter was added. No test was weakened or deleted: the diff only adds assertions and tests.

## Findings

None open or new.

Notes, not findings:
- A rare race remains open: a tail refresh fetch that starts during B's scan and resolves just after `markIndexReady` could be the snapshot the check runs on. It needs a refresh in flight exactly at scan completion. The result is visible and recoverable, so under the repo's rare-race rule it is not worth more state.
- No scope creep. The fix commits touch only the gate, its tests, the E2E size check and the menu assertions.

## Checks I ran (worktree root, each read from its own exit status)

- `pnpm check`: exit 0 (218 files, 0 errors, 0 warnings).
- `pnpm vitest run src/tests/lib/features/rail-shell src/tests/lib/core/layout`: exit 0, 10 files, 225 tests passed. This includes `lens.logic.test.ts` and `TypesNavigator.test.ts`.
- `bash scripts/e2e.sh e2e/specs/rail-shell.spec.ts`: exit 0, 16 passed.
- I did not run the full suite or `pnpm build`; deliver runs them. Nothing under `src-tauri/` changed.
- The worktree was clean before I wrote this file.
