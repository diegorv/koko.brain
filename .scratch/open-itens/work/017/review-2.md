VERDICT: APPROVED

# Re-review 2: Issue 017 (external change to an open note is kept in File History)

Reviewed the fixes `git diff efc677349..HEAD` (4cd51e22f, plus the resolution commit a10684313) in the worktree, against the findings in `review.md`.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | editor.service.ts:506 records `readSavedContent` after `waitForTabSave` and before `readTextFile`; :521-528 skips the reload branch when `tab.savedContent` changed during the read, and hands `diskContent` to the keeper only when it differs from `readSavedContent`, the current `savedContent` (filtered at :520) and `tab.content`. All three orderings from the finding have tests (editor.service.test.ts 'never reloads from a read that an auto-save overtook (tab clean after it)', '... (tab dirty after it)', 'keeps an external version read while an auto-save overtook the read, and does not load it'), each driving a real `saveFileByPath` while a deferred `readTextFile` is pending. Red verified by me: with efc677349's editor.service.ts and file-history.service.ts swapped in, all three fail; restored with `git checkout`, `git status` clean. |
| 2 | minor | resolved | Both toasts in `keepExternalVersion` (editor.service.ts:555-562) pass `{ id: 'external-change:<path>' }`. Test 'gives the warning toast one id per note, so a repeated batch replaces it' and the added id assertion in 'keeps the typing and shows an error toast when the snapshot fails'; both fail on the pre-fix code. |
| 3 | nit | resolved | file-history.service.ts:198-203: the keeper throws 'No vault open' when `vaultStore.path` is null; `saveSnapshotForFile` and the after-save observer are unchanged. Tests in file-history.service.test.ts ('registers a keeper that rejects without saving when no vault is open') and editor.service.test.ts ('shows the error toast, not the kept-in-File-History one, when no vault is open'); both fail on the pre-fix code, which the fix report had not checked. |
| 4 | nit | rejection stands | The finding asked for no change; none was made. |

## Acceptance criteria

- [met] Failing test first, in src/tests/lib/core/editor/editor.service.test.ts (reloadExternallyChangedTabs describe, real editorStore, only Tauri mocked): a dirty tab with savedContent 'base' and content 'base plus mine' whose file now reads 'base plus external'; reloadExternallyChangedTabs([path]) invokes save_snapshot with 'base plus external' and the tab keeps 'base plus mine'. It fails today (no snapshot). — The test from the build step is untouched by the fixes and passes; the new guard does not affect it (savedContent does not change during its read).
- [met] A toast names the note and says the version changed outside the app was kept in File History. — Message text unchanged, only the `{ id }` option added (editor.service.ts:558); the no-vault case now shows the error toast instead of a false "kept" claim.
- [met] A clean tab still reloads from disk as today, and no snapshot is taken when the disk content equals savedContent. — The clean path (editor.service.ts:534-536) is reached as before when no save overtook the read; 'silently reloads a clean tab' and the two no-snapshot tests pass. A clean tab whose savedContent did not change during the read cannot hit the new branch.
- [met] The existing 'skips dirty tabs, editor always wins' test keeps its assertion (the tab still wins) and gains the snapshot check. — Not changed by the fixes; passes.
- [met] Gate, frontend only: pnpm check + pnpm vitest run. — `pnpm check` exit 0 (237 files, 0 errors, 0 warnings); targeted vitest passes (see Checks run). The full suite is deliver's to run.

## Findings

1. **nit** src/lib/core/editor/editor.service.ts:521-528. When an auto-save overtakes the read and an external write lands after that save but before the read, the read's external bytes are kept in File History with the "your edits stay" warning, and the tab is not reloaded even if it is clean after the save. The next watcher batch for that external write reloads the clean tab, so nothing is lost and the version is in File History; the toast wording is just slightly off for that rare ordering. No change required.

## Checks run

- `pnpm check`: exit 0, 237 files, 0 errors, 0 warnings.
- `pnpm vitest run` on src/tests/lib/core/editor/editor.service.test.ts, src/tests/lib/core/editor/editor.hooks.test.ts, src/tests/lib/features/file-history/file-history.service.test.ts, src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts, src/tests/lib/architecture/layer-rules.test.ts: 5 files, 287 tests passed, exit 0.
- Red probe: efc677349's editor.service.ts and file-history.service.ts with the branch tests: 7 failed / 137 passed, exactly the tests the fixes added or extended. Sources restored, worktree clean.
- No test weakened or deleted: the fixes only add tests and one assertion. The 'no snapshot of v1' checks in the overtaken-read tests are narrower than "no invoke" because the auto-save itself legitimately snapshots 'v2'.
- Scope: the fixes touch only `reloadExternallyChangedTabs` / `keepExternalVersion` and the keeper registration. `writeTab` and the frontmatter path are untouched (Issue 153).
- Layer baseline: unchanged (no entry added, BASELINE_SIZE not raised, no composition root added).
- Not run: the full suite (deliver's), codemap.test.ts (CI only).

## Resolution

1. nit (editor.service.ts:521-528): not changed. The finding itself requires no change: nothing is lost, the external version is in File History, and the next watcher batch reloads the clean tab. Rewording the toast for this rare ordering would add a branch for a cosmetic case.
