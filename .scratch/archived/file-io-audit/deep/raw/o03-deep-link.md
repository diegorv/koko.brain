# o03-deep-link: independent deep dive (raw)

Worktree: `.claude/worktrees/file-io-repro` (identical to main). Repro tests: `src/tests/repro/o03-deep-link/`.
Run with `./node_modules/.bin/vitest run src/tests/repro/o03-deep-link/<file>`. Every test below FAILS on its bug assertion today.

Ten ids, six distinct bugs. None refuted.

## B1. Append/prepend/overwrite/daily deep links throw away unsaved typing in the open tab (CONFIRMED_BY_TEST)
ids: save-pipeline-3, cross-cutting-6, feature-writers-4

Trace:
- Keystrokes reach the store at once: `onContentChange` -> `editorStore.updateContent` (editor.service.ts:224-227, editor.store.svelte.ts:84-88). The 2 s disk write is debounced (editor.service.ts:194).
- `executeDailyAction` (app/deep-link-actions.ts:37-64) opens the daily note, then `readTextFile` reads the DISK copy at :54, builds disk+clip, writes it at :61, and calls `syncExternalContentToEditor(path, newContent, true, 'none')` at :63.
- The same disk-based merge runs in `executeNewAction` for prepend (deep-link.service.ts:257-262), append (:276-281) and overwrite (:296-298).
- `markSaved=true` goes to `updateTabContentByPath` (editor.service.ts:78-79), which sets BOTH `content` and `savedContent` (editor.store.svelte.ts:130-136). The tab is now clean, so `saveDirtyTabs` (editor.service.ts:183-186) finds nothing to write.
- For the active tab, `bumpExternalContentSignal` makes MarkdownEditor.svelte:311-336 replace the whole CodeMirror doc with `Transaction.addToHistory.of(false)`, so Cmd+Z cannot bring the typing back. The typing was never saved, so File History has no copy either.
- Nothing flushes before the merge. There is no save-on-blur: `registerFocusListener` (tauri-listeners.service.ts:306-325) only handles focus gain. `openOrCreateDailyNote` -> `openOrCreateNote` -> `openFileInEditor` only switches tabs.
- The existing test `deep-link.service.race-audit.test.ts:130-160` mocks `syncExternalContentToEditor`, so it pins this exact call and never checks the tab content.

Test: `deep-link-dirty-buffer.test.ts` (real editor store and editor.service; only @tauri-apps mocked)
```
AssertionError: expected '# Today\n\nCLIP' to contain 'A sentence the user typed a second ago.'
AssertionError: expected '# Inbox\n\nCLIP' to contain 'A sentence the user typed a second ago.'
AssertionError: expected 'CLIP\n# Inbox\n' to contain 'A sentence the user typed a second ago.'
```
Reachability: needs an external automation (Raycast, Shortcuts, a clipper) that fires daily/new with append, prepend or overwrite. The window is the 2 s after the last keystroke, and it stays open for as long as that note's save keeps failing. No in-app feature emits these URLs. Recovery: none.
Priority: P1. It is close to P0 because the loss is permanent, but every trigger is an external automation.

## B2. Silent `new` with no mode flag overwrites an existing note, even with '' (CONFIRMED_BY_TEST)
ids: cross-cutting-4, feature-writers-3

Trace:
- With silent set and no append, prepend or overwrite, deep-link.service.ts:309-315 runs mkdir, then `writeTextFile(fullPath, content)` with no `exists()` check.
- `resolveContent` returns '' when there is no content param, or when the clipboard is empty or non-text (deep-link.service.ts:214-224).
- The non-silent branch goes through `openOrCreateNote`, which only opens an existing note (note-creator.service.ts:86-89). The type docs (deep-link.types.ts:35) say `overwrite` is the way to replace an existing file. Silent is documented only as "do not open" (:29).
- The existing test `deep-link.service.test.ts:287-304` covers only a file that does not exist yet.
- If the note is open, its tab is not synced, so it stays on the old bytes. A later edit in that tab writes the old content back over the URL content.

Test: `deep-link-silent-new-overwrites.test.ts`
```
AssertionError: expected '' to be '# Journal\nYears of entries.\n'
AssertionError: expected 'hello' to contain 'Years of entries.'
```
Recovery: File History is on by default (settings.store.svelte.ts:94-98: enabled, 7 days) and takes a snapshot on each in-app save (history.rs:59-74 dedupes by hash). So the old version comes back only if the note was saved in the app within the last 7 days. A note written only by external tools, or last saved earlier than that, is lost. Nothing goes to Trash.
Priority: P1.

## B3. A deep-link overwrite can replace any vault file, including `.kokobrain` app data, with no confirmation (CONFIRMED_BY_TEST)
ids: feature-writers-9, recovery-7

Trace:
- `resolveFilePath` (utils/path.ts:33-53) keeps a path inside the vault, but it adds `.md` only when the last segment has no dot. So `file=.kokobrain/trash/trash-manifest.json` and `.kokobrain/settings.json` resolve as they are.
- The overwrite branch (deep-link.service.ts:292-306) writes without a check. Neither `handleDeepLinkUrl` nor `resolveAndDispatch` (:118-169) asks for confirmation.
- capabilities/default.json allows write-text-file on `$HOME/kokobrain-vaults/**` and `**/.kokobrain/**`.
- Any local process can run `open kokobrain://...` without a prompt. A browser page can too, once the user has allowed the scheme.

Test: `deep-link-path-safety.test.ts` "overwrite refuses to rewrite app-owned files under .kokobrain"
```
AssertionError: expected '[]' to be '[{"id":"1"}]'
```
Not verified here: the downstream effects recovery-7 claims (orphaned trash, settings reset purging history). Those are other groups' items.
Priority: P2 (hardening). Overwriting a note is a documented feature, so whether it needs a confirmation is the owner's call. Writes into app-owned `.kokobrain` files should be refused.

## B4. A name that normalizes to the vault root writes `<vault>.md` next to the vault (CONFIRMED_BY_TEST)
ids: feature-writers-10

Trace:
- With `name=.`, `normalizePath('/…/Work/.')` returns `/…/Work`, which equals `base`, and path.ts:41 accepts that.
- The last segment `Work` has no dot, so :47-49 returns `/…/kokobrain-vaults/Work.md`, outside the vault.
- The silent branch (deep-link.service.ts:309-315) writes it. `$HOME/kokobrain-vaults/**` matches it, and no runtime fs scope is granted (no `allow_directory`/`allow_file` in src-tauri/src).
- Vaults can only live under that tree, so the escape stays inside kokobrain-vaults. If a sibling `<vault>.md` exists, it gets overwritten.

Test: `deep-link-path-safety.test.ts`
```
AssertionError: expected [ '/Users/me/kokobrain-vaults/Work.md' ] to deeply equal []
AssertionError: expected false to be true   (resolveFilePath(VAULT, '.') not under VAULT/)
```
Priority: P3. It needs a crafted URL, and the damage is limited to a sibling `.md`.

## B5. A cross-vault deep link is dropped: teardownVault clears the pending action before step 8 runs it (CONFIRMED_BY_TEST)
ids: feature-writers-2

Trace:
1. `resolveAndDispatch` calls `setPendingAction`, then `switchVault` (deep-link.service.ts:165-166).
2. `switchVault` calls `vaultStore.open` (vault.service.ts:21).
3. The (app)/+layout.svelte:64-78 `$effect` runs `initializeVault(path)`.
4. The previous vault reached step 7, so `unsubscribeFileChange` is set (app-lifecycle.service.ts:494), and `initializeVault` calls `teardownVault()` at :172-188.
5. `teardownVault` calls `resetDeepLink()` at :641, and `deepLinkStore.reset` sets `pendingAction = null` (deep-link.store.svelte.ts:33-35).
6. Step 8, `executePendingAction()` at :503, consumes null and returns at deep-link.service.ts:330-331. No toast, no log.

Test: `deep-link-cross-vault-pending.test.ts`, jsdom, only @tauri-apps mocked, with real `initializeVault` called twice:
```
AssertionError: expected '# Inbox\n' to be '# Inbox\n\nCLIP'   (teardown sequence)
AssertionError: expected '# Inbox\n' to be '# Inbox\n\nCLIP'   (end-to-end initializeVault(Personal) then initializeVault(Work))
```
The control test (no previously initialized vault, same pending append) passes. That shows the teardown branch is the cause.
Recovery: the payload often still exists at its source (clipboard, the Shortcut input), but the user is never told it was dropped.
Priority: P1. Every action type is dropped (open, new, daily, capture) whenever the target vault differs from the open one.

## B6. The composer flashes "Saved" and clears the text when the main window drops the capture (CONFIRMED_BY_TEST for the IPC-error path, CONFIRMED_BY_TRACE for the no-vault and write-error paths)
ids: feature-writers-7

Trace:
- `handleSave` (src/routes/composer/+page.svelte:27-50) sets `saved` and then dismisses after a resolved `submit_composer_capture`. It also dismisses after a rejected one (catch at :44, then `dismiss()` at :49).
- `resetForShow` (:52-58) sets `text = ''` on the next `qc:open-composer`.
- Rust `submit_composer_capture` (quick_capture/commands.rs:349-365) only calls `app.emit` and returns its Result. There is no acknowledgment.
- Upstream tauri `AppManager::emit` (fetched from https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri/src/manager/mod.rs) returns `Ok(())` when there are no listeners. Errors come only from serialization or dispatch.
- On the main side, `handleDetectedCapture` returns early with "Open a vault before capturing" when no vault is open (quick-capture.service.ts:85-91). A write error is caught and toasted in `executeAction` (deep-link.service.ts:203-206).
- Both toasts appear only in the main window. The composer has already said "Saved".
- The app does not reopen a vault at launch: the welcome page needs a click (src/routes/(app)/+page.svelte:17). The global shortcuts are registered at app setup regardless of the vault (src-tauri/src/lib.rs:229-271). So "app running, no vault open" is the normal state right after every launch.

Test: `composer-clears-unsaved-capture.test.ts` (jsdom, mounts the real page, mocks only @tauri-apps/api core and event; submit rejects)
```
AssertionError: expected '' to be 'An idea I will not remember tomorrow'
```
The test uses the rare IPC-reject path. The realistic path, Rust returning Ok and the main window dropping the capture, cannot be tested from the composer alone because no ack exists. That path is proven by the trace above.
Recovery: none. The text was its only copy.
Priority: P1.

## Not checked
- Downstream recovery-1/recovery-2 effects named in recovery-7.
- How browsers prompt for custom schemes.
- Whether the Obsidian Web Clipper sends `silent=true` without `overwrite` (it would hit B2 on a repeat clip with the same title).
