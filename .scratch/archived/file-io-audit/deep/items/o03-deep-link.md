# Deep-dive group o03-deep-link

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## save-pipeline-3: Daily or new deep-link append/prepend rebuilds from disk and marks the open tab saved, dropping its unsaved keystrokes
- claimed severity: data-loss
- anchor: src/lib/app/deep-link-actions.ts:54
- scenario: While typing in today's daily note, the user fires a kokobrain://daily?content=... capture (Raycast or Shortcuts) within 2 s of the last keystroke, or while that note's save is failing. The tab becomes disk+capture and is marked clean, so the typed text is gone from the editor and never written.
- evidence given: READ: deep-link-actions.ts:36-64: openOrCreateDailyNote, then readTextFile(disk), newContent = existing+content, writeTextFile, then syncExternalContentToEditor(path,newContent,true,'none'). markSaved=true sets content and savedContent (editor.service.ts:78-79, editor.store.svelte.ts:130-136), so saveDirtyTabs finds nothing dirty (editor.service.ts:183-187). Same pattern in deep-link.service.ts:254-286 for new+prepend/append.

## cross-cutting-6: Daily and new append/prepend/overwrite deep links build from disk and mark the open tab clean, dropping unsaved typing
- claimed severity: data-loss
- anchor: src/lib/app/deep-link-actions.ts:63
- scenario: While typing in today's daily note, fire a clipboard-to-daily hotkey (kokobrain://daily?...&append=true&clipboard=true) within the debounce window. The disk copy plus the clip replaces the buffer, the tab shows clean, and the keystrokes are lost.
- evidence given: READ: deep-link-actions.ts:37 opens the note, :54 reads disk, :61 writes, :63 syncs with markSaved=true. The same pattern is at deep-link.service.ts:254-286 and :292-298. deep-link.service.race-audit.test.ts:130-157 pins the dirty-tab overwrite. Same as SP-3 and feature-writers F4.

## feature-writers-4: Append/prepend/overwrite/daily deep links discard unsaved typing in the open tab
- claimed severity: data-loss
- anchor: src/lib/features/deep-link/deep-link.service.ts:262
- scenario: The user types in today's daily note. Within the 2 s autosave window, kokobrain://daily?vault=Work&append=true&clipboard=true runs. The merge reads disk, writes, then marks the tab clean with the disk-based text. The typed text is gone from the editor and is never written.
- evidence given: Merge reads from disk: deep-link.service.ts:257,276 and deep-link-actions.ts:54. syncExternalContentToEditor(...,true,'none') at deep-link.service.ts:262,281,298 and deep-link-actions.ts:63 -> editor.service.ts:78-79 -> editor.store.svelte.ts:130-136 replaces content and savedContent. deep-link-actions.ts:37 opens the daily note first.

## cross-cutting-4: Deep-link new with silent=true and no mode flag overwrites an existing note, with empty content if none is given
- claimed severity: data-loss
- anchor: src/lib/features/deep-link/deep-link.service.ts:309
- scenario: kokobrain://new?vault=V&name=Inbox&silent=true (for example from an automation meaning 'create if missing'). Inbox.md is replaced with '' or the given content. Nothing goes to Trash, and history keeps only the last in-app save within retention. If Inbox is open and dirty, the next autosave writes the buffer back over the URL content.
- evidence given: READ: silent create branch at deep-link.service.ts:309-315 has no exists() check. resolveContent returns '' by default (:217-226). The non-silent branch uses openOrCreateNote, which checks exists (note-creator.service.ts:86), and a separate overwrite flag exists (:292-305). Test deep-link.service.test.ts:287-304 covers only a new file. Same as feature-writers F3.

## feature-writers-3: Silent deep-link `new` without overwrite replaces an existing note, including with empty content
- claimed severity: data-loss
- anchor: src/lib/features/deep-link/deep-link.service.ts:309
- scenario: Journal.md exists. kokobrain://new?vault=Work&name=Journal&silent=true&clipboard=true with a non-text clipboard (or no content param) truncates Journal.md to 0 bytes. The non-silent path would only have opened it.
- evidence given: deep-link.service.ts:309-315 (mkdir + writeTextFile with no exists check); :214-224 resolveContent returns ''; the non-silent branch uses openOrCreateNote, which never overwrites (note-creator.service.ts:86-89); deep-link.types.ts:29,35 (silent = do not open, overwrite = replace). plugin-fs write truncates (FETCHED commands.rs).

## feature-writers-9: Deep-link overwrite can replace any vault file (.kokobrain data, binaries) with no confirmation
- claimed severity: security
- anchor: src/lib/features/deep-link/deep-link.service.ts:292
- scenario: Any local process, or a browser page after kokobrain:// was allowed, opens kokobrain://new?vault=Work&name=.kokobrain/todoist-sent.json&overwrite=true&content=[] or names an existing note with empty content. The file is truncated or replaced with no prompt.
- evidence given: deep-link.service.ts:292-306 writes unconditionally; utils/path.ts:46-50 adds .md only when the last segment has no dot; there is no confirmation in handleDeepLinkUrl/resolveAndDispatch (:118-169). Overwrite is a documented feature (deep-link.types.ts:35), so this is the owner's call.

## feature-writers-10: A deep-link name that normalizes to the vault root writes <vault>.md outside the vault
- claimed severity: security
- anchor: src/lib/utils/path.ts:42
- scenario: kokobrain://new?vault=Work&name=.&silent=true (or name=..%2FWork) writes /Users/me/kokobrain-vaults/Work.md, a sibling of the vault, which the fs scope still allows.
- evidence given: utils/path.ts:41-43 accepts normalized===base, then :46-50 appends .md; deep-link.service.ts:245,309-315; the capability scope $HOME/kokobrain-vaults/** is in src-tauri/capabilities/default.json.

## recovery-7: A deep-link overwrite can rewrite .kokobrain/trash/trash-manifest.json or settings.json with no confirm, which leads into recovery-2 and recovery-1
- claimed severity: security
- anchor: src/lib/features/deep-link/deep-link.service.ts:292
- scenario: Any app or page that opens kokobrain://new?vault=<name>&file=.kokobrain/trash/trash-manifest.json&overwrite=true&content=[] empties the manifest, and the next trash op orphans every trashed item. The same with file=.kokobrain/settings.json and invalid JSON resets settings to defaults at the next launch, which purges history.
- evidence given: utils/path.ts:33-53 keeps the path in the vault but adds .md only when the last segment has no dot; deep-link.service.ts:292-299 writes unconditionally, with no confirm in :150-169 or :177-208; capabilities/default.json:72 and :78 allow writes to .kokobrain/**; the vault name is resolved from recentVaults at :139-145

## feature-writers-2: A cross-vault deep-link pending action is wiped by teardownVault before step 8, so it is silently dropped
- claimed severity: data-loss
- anchor: src/lib/app/lifecycle/app-lifecycle.service.ts:641
- scenario: With vault Personal open, a Shortcut or clipper fires kokobrain://new?vault=Work&name=Inbox&append=true&content=<clip>. The app switches to Work, but the content is never written and no toast appears.
- evidence given: deep-link.service.ts:165-166 (setPendingAction, then switchVault); vault.service.ts:21 vaultStore.open; +layout.svelte:65-78 runs initializeVault; app-lifecycle.service.ts:172-188 calls teardownVault() when the previous vault was initialized (unsubscribeFileChange set at :494); teardownVault -> resetDeepLink at :641 -> deep-link.store.svelte.ts:33-35 sets pendingAction=null; step 8 at :503 -> executePendingAction gets null (deep-link.service.ts:329-331). Tests call executePendingAction directly (deep-link.service.race-audit.test.ts:91-99), so they miss this.

## feature-writers-7: Composer text is cleared even when the main window drops the capture
- claimed severity: data-loss
- anchor: src/routes/composer/+page.svelte:40
- scenario: The user writes a note in the composer with no vault open, or the write fails. 'Saved' flashes, the popover dismisses, and the note never exists; the text was its only copy.
- evidence given: +page.svelte:27-50 dismisses after success or catch, and resetForShow clears text (:52-58); commands.rs:349-365 emits with no acknowledgment; quick-capture.service.ts:85-91 drops when no vault is open; deep-link.service.ts:203-206 only toasts on a write error.
