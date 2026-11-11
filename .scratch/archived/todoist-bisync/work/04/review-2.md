VERDICT: APPROVED

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | minor | Active-tab fallback to the string path during a tab switch had no test | resolved | `note-writer.service.test.ts` "patches the tab string during a tab switch, while the view still holds the previous note" calls `setActiveIndex` without `flushSync`, asserts the view still holds `Other note\n`, writes, flushes, and checks the result, the view text, both tabs' content, the other tab staying clean, and the other note after switching back. Mutation check run by this review (temporary, reverted with `git checkout`): changing `note-writer.service.ts:69` to `const onView = view !== null;` makes this test fail (1 failed, 16 skipped under `-t "during a tab switch"`), so it guards the branch it was added for. |
| 2 | nit | `anchors()` duplicated the private `idValues()` | resolved | `anchor.logic.ts:24` now exports `idValues`. `task-line-edits.logic.ts` imports it (line 10) and uses it at lines 60, 61, 87 and 95. The private `anchors()` is gone and `ID_TOKEN_RE` is no longer imported there. The behavior is the same: the old body was identical. |
| 3 | nit | `svelte-sonner` mocked in `note-writer.service.test.ts` | resolved | The `vi.mock('svelte-sonner', ...)` line is removed and the suite passes without it. The test now mocks only `@tauri-apps/*` modules. |

## Acceptance criteria re-checked

- [met] Failing tests first with real editor stores (jsdom), mocking only Tauri boundaries. — With the `svelte-sonner` mock gone, `note-writer.service.test.ts` mocks only `@tauri-apps/api/core`, `@tauri-apps/plugin-fs` and `@tauri-apps/plugin-dialog`, and still uses the real stores and the mounted editor. It passes.
- [met] Active tab (has a CodeMirror view): the change is one guarded transaction that first checks the anchor's line equals the expected line in the live document; a mismatch returns `stale` and changes nothing. Autosave persists it. — The fixes leave `note-writer.service.ts` unchanged. The new test covers the guard's fallback (view text differs from the tab's), and the mutation check above shows it fails when the guard is removed.
- [met] Gate: frontend. — `pnpm check` exits 0 (0 errors, 0 warnings). `pnpm vitest run src/tests/lib/features/todoist-sync/ src/tests/lib/architecture/` exits 0 (22 files, 304 tests). Deliver runs the full `pnpm vitest run`.

## Checks run by this review

- Fix diff `d4adc039f..HEAD` (daab9c2a3): `anchor.logic.ts` (1 line, export), `task-line-edits.logic.ts` (swap to `idValues`), `note-writer.service.test.ts` (mock dropped, one test added), and the review file's Resolution. No test was deleted or weakened, and nothing outside the Issue changed.
- `idValues` callers in `anchor.logic.ts` (lines 34, 47) are unchanged. Exporting it widens the module's API by one pure function and nothing else.
- Layer baseline and composition roots are untouched.
- The worktree was clean before and after the mutation check.

## Findings

None open or new.
