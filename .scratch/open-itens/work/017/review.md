VERDICT: CHANGES_REQUESTED

# Review: Issue 017 (external change to an open note is kept in File History)

Reviewed `git diff main...HEAD` (3a5156bb4, 8dbba9e3e, plus the discovery commit 7440b8273) in the worktree.

## Acceptance criteria

- [met] Failing test first, in src/tests/lib/core/editor/editor.service.test.ts (reloadExternallyChangedTabs describe, real editorStore, only Tauri mocked): a dirty tab with savedContent 'base' and content 'base plus mine' whose file now reads 'base plus external'; reloadExternallyChangedTabs([path]) invokes save_snapshot with 'base plus external' and the tab keeps 'base plus mine'. It fails today (no snapshot). — Test 'keeps the external version of a dirty tab in File History and keeps the typing' (editor.service.test.ts:1461-1479) uses the real editorStore, vaultStore and `registerFileHistoryHook`, mocks only `invoke` / plugin-fs (plus the file's existing toast/debug/debounce mocks), and asserts `invoke('save_snapshot', { filePath: 'note.md', content: 'base plus external' })` and content 'base plus mine'. Red verified by me: with `git show main:src/lib/core/editor/editor.service.ts` swapped in, this test and 3 other new ones fail (4 failed / 106 passed); file restored afterwards.
- [met] A toast names the note and says the version changed outside the app was kept in File History. — editor.service.ts:543 `toast.warning('"<name>" changed outside the app. That version was kept in File History, and your edits stay.')`; the red test asserts it once and that it contains 'note.md', 'changed outside the app' and 'File History'.
- [met] A clean tab still reloads from disk as today, and no snapshot is taken when the disk content equals savedContent. — Clean branch unchanged (editor.service.ts:524); existing 'silently reloads a clean tab' still passes, and new tests 'takes no snapshot when it reloads a clean tab' and 'takes no snapshot of a dirty tab whose disk content equals savedContent' assert no `invoke` and no toast.
- [met] The existing 'skips dirty tabs, editor always wins' test keeps its assertion (the tab still wins) and gains the snapshot check. — Keeps content 'user edits' / savedContent 'original' and adds the `save_snapshot` assertion; the dropped "readTextFile not called" assert is explained in the 8dbba9e3e commit body, as the Issue's owner decision asks.
- [met] Gate, frontend only: pnpm check + pnpm vitest run. — `pnpm check` exit 0 (0 errors, 0 warnings). Targeted vitest passes (see Checks run). The full suite is deliver's to run.

## Findings

1. **blocker** src/lib/core/editor/editor.service.ts:496-524. Reading dirty tabs adds a new race on the most frequent watcher path: the batch for the app's own autosave of a tab that is still being typed into. `waitForTabSave` runs only before the read starts. If the next autosave starts and lands while `readTextFile` is pending, the apply loop compares that stale read with the new `savedContent`. Main never hit this, because it skipped dirty tabs before reading them. I reproduced both outcomes with a temporary probe in editor.service.test.ts (removed afterwards):
   - Tab clean after the save: tab saved 'v1' and typed 'v2', watcher batch for v1 in progress, autosave writes 'v2' during the read, read returns 'v1'. Result: content 'v1', savedContent 'v1'. The clean branch reloads stale disk bytes, so the user's latest typing disappears from the editor while the disk holds 'v2'. The next watcher batch restores it only if the user has not typed in the gap. If they have, the next autosave drops the v2 delta from disk.
   - User types again right after the save: snapshots ['v2', 'v1'] and 1 warning toast. The app's own earlier save is reported as "changed outside the app" and snapshotted again.
   - Same mechanism for a real external write: if the autosave lands during the read of 'base plus external', the editor flips to the external text (content = savedContent = 'base plus external') and nothing is snapshotted.

   Fix: record each tab's `savedContent` when its read is issued (after `waitForTabSave`). In the apply loop, if `tab.savedContent` changed since then, a save landed during the read, so never take the reload branch from that read. Hand `diskContent` to the keeper only when it differs from the recorded value, the new `savedContent` and `tab.content`; otherwise skip. Add tests for these orderings: the autosave lands mid-read with the tab clean after it, and with the tab dirty after it.
2. **minor** src/lib/core/editor/editor.service.ts:536-543. The warning toast has no `id`. Two watcher batches for the same unchanged external bytes, while the tab stays dirty (macOS delivers one write's events in batches spread over 10+ s, per editor.hooks.ts:21-23), give two identical toasts. `save_snapshot` dedupes the row, but `keepExternalVersion` cannot tell. Fix: pass `{ id: \`external-change:${filePath}\` }` to both toasts so a repeat replaces the earlier one.
3. **nit** src/lib/features/file-history/file-history.service.ts:110-112 with editor.service.ts:541-543. `saveSnapshotForFile` resolves without saving when `vaultStore.path` is null (vault closing mid-batch). The keeper then reports success, and the toast says the version was kept in File History when it was not. Fix: have the keeper reject (or return false) when there is no vault, or check `vaultStore.path` before toasting.
4. **nit** Side effect listed in the build report: CollectionView.svelte:351 calls `reloadExternallyChangedTabs` after a failed `.view` write, so a dirty `.view` tab whose disk differs now gets a snapshot and the toast too. That matches the new contract for an external change, so it is not scope creep, but no test covers that caller with a dirty tab. No change is required.

## Checks run

- `pnpm check`: exit 0, 237 files, 0 errors, 0 warnings.
- `pnpm vitest run` on editor.service.test.ts, editor.hooks.test.ts, file-history.service.test.ts, app-lifecycle.service.test.ts, layer-rules.test.ts: 5 files, 281 tests passed (exit 0).
- `pnpm vitest run` on consumers of the changed APIs: CollectionView.view-writes, watcher-handler.service, boot, vault.service.switch-save, vault-switch-failed-save, frontmatter-write.service, task-write.service, mod-vault.service, deep-link.service, EventDialog, rewrite-view-file.service: 11 files, 326 tests passed (exit 0).
- Red probe (main's editor.service.ts with the branch tests): 4 new tests fail as expected.
- Race probes (finding 1): temporary tests appended to editor.service.test.ts, run with `-t PROBE`, then removed with `git checkout`. `git status` was clean afterwards.
- Layer baseline: unchanged (no entry added, BASELINE_SIZE not raised, no composition root added). The keeper slot in `core/editor/editor.hooks.ts` avoids a core-to-features import.
- Scope: the diff stays on the watcher side as the owner scoped it. `writeTab` and the frontmatter path are untouched (Issue 153).
- Not run: the full suite (deliver's), codemap.test.ts (CI-only).

## Resolution

1. **Fixed** in 4cd51e22f. `reloadExternallyChangedTabs` records each tab's `savedContent` when its read is issued (after `waitForTabSave`). If it changed by apply time, a save overtook the read: the read is never loaded, and the disk text goes to the keeper only when it differs from the recorded value, the new `savedContent` and the typing. Tests in editor.service.test.ts (red before the fix, green after): 'never reloads from a read that an auto-save overtook (tab clean after it)', 'takes no snapshot of the app's own earlier save from a read an auto-save overtook (tab dirty after it)', 'keeps an external version read while an auto-save overtook the read, and does not load it'.
2. **Fixed** in 4cd51e22f. Both toasts pass `{ id: \`external-change:${filePath}\` }`. Test 'gives the warning toast one id per note, so a repeated batch replaces it', plus an id assertion in the snapshot-failure test.
3. **Fixed** in 4cd51e22f. The keeper registered in `registerFileHistoryHook` rejects with 'No vault open' when `vaultStore.path` is null, so the error toast shows instead of the "kept in File History" one. `saveSnapshotForFile` itself is unchanged (its after-save caller keeps the silent no-vault return). Tests: file-history.service.test.ts 'registers a keeper that rejects without saving when no vault is open', editor.service.test.ts 'shows the error toast, not the kept-in-File-History one, when no vault is open'.
4. No change, as the finding says.

Checks: `pnpm check` exit 0 (0 errors, 0 warnings); `pnpm vitest run` on editor.service, editor.hooks, file-history.service, app-lifecycle.service and layer-rules tests: 5 files, 287 passed, exit 0.
