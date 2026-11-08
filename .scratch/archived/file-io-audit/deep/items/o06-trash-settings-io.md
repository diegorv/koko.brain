# Deep-dive group o06-trash-settings-io

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## cross-cutting-8: A failed or invalid trash manifest load makes the next delete overwrite the manifest, orphaning earlier trashed items
- claimed severity: data-loss
- anchor: src/lib/core/trash/trash.service.ts:79
- scenario: The manifest is truncated or unreadable at vault open, then the user deletes any note. Earlier trashed items are no longer listed and cannot be restored from the UI. Empty Trash later deletes them along with the rest.
- evidence given: READ: loadTrash catches and sets [] with no toast (trash.service.ts:37-40), so the outer catch at app-lifecycle.service.ts:292-295 is never reached. parseTrashManifest returns [] or drops invalid entries (trash.logic.ts:58-66,95-105). moveToTrash writes [item, ...[]] (trash.service.ts:79), in place (:275). emptyTrash removes the whole items dir (:205-215). No test covers this. Same as recovery F2.

## recovery-2: A failed or invalid trash manifest load becomes []; the next trash write orphans every earlier item, and Empty Trash then destroys them under an undercounted confirm
- claimed severity: data-loss
- anchor: src/lib/core/trash/trash.service.ts:37
- scenario: The trash holds 5 notes and the manifest is truncated (non-atomic write interrupted, or a sync conflict). On the next launch the Trash looks empty. The user trashes X and the manifest is rewritten as [X]; the 5 item dirs lose their entries and drop out of the UI. Later Empty Trash says 'all 1 item' but removes the whole items/ dir, all 6 notes included. A stale second loadTrash from TrashSection.onMount can drop a just-trashed item from the store the same way.
- evidence given: trash.service.ts:33-39 (a failed read sets []), trash.logic.ts:58-66 (invalid JSON parses to []); writers rebuild from the store at trash.service.ts:79, 137-139, 191; saveManifest uses writeTextFile at :269-276; moveToTrash swallows a manifest write error at :78-82; TrashSection.svelte:50 count and :73-77 button; emptyTrash removes all of items/ at trash.service.ts:207-210; TrashSection.svelte:17-21 calls loadTrash with no version guard

## vault-lifecycle-4: A failed or corrupt trash-manifest load becomes []; the next trash action rewrites the manifest, and Empty Trash ('all 1 item') deletes earlier trashed items that are no longer listed
- claimed severity: data-loss
- anchor: src/lib/core/trash/trash.service.ts:79
- scenario: A crash during a manifest write truncates trash-manifest.json. On the next open the Trash panel shows empty. The user deletes one note, and the manifest now lists only that note. The user clicks Empty Trash and confirms 'Permanently delete all 1 item'. emptyTrash removes the whole items dir, including every earlier trashed note and folder, which could still have been restored through Finder.
- evidence given: READ: loadTrash catch sets [] (trash.service.ts:37-39). parseTrashManifest returns [] or drops invalid entries (trash.logic.ts:58-66, 95-105). moveToTrash writes [item, ...trashStore.items] (:79) and swallows a save failure (:80-82). The dialog counts trashStore.count (TrashSection.svelte:47-51). emptyTrash runs remove(items dir, recursive) (:207-210). FETCHED: non-atomic writeTextFile.

## recovery-9: Phantom trash entries cannot be deleted or restored; only Empty Trash clears them, and it destroys every real item too
- claimed severity: minor
- anchor: src/lib/core/trash/trash.service.ts:188
- scenario: The app crashes between the restore rename and its manifest write. The next launch lists the item, and both Restore and Delete permanently fail with ENOENT on every click. The only exit is Empty Trash, which deletes everything else.
- evidence given: deletePermanently removes the dir first (trash.service.ts:187-188) and writes the manifest only after (:191); the restore rename at :126 and its manifest write at :139; swallowed write at :140-142; emptyTrash partial-failure window between :209 and :213

## vault-lifecycle-3: Every vault open rewrites settings.json in place; a failed write-back swaps the session to defaults, and on a full disk it leaves the file empty
- claimed severity: data-loss
- anchor: src/lib/core/settings/settings.service.ts:163
- scenario: The disk is full when the vault opens. The write-back at :163 truncates settings.json and then fails, the retry at :172 fails too, and the session runs on defaults. cleanup_history at app-lifecycle:275 uses retention 7. After space is freed, the next open sees an empty file and makes the defaults permanent. On a read-only volume the file stays intact, but the session silently runs on defaults, and the first change persists them once writes work again.
- evidence given: READ: settings.service.ts:162-163 (setSettings then await saveSettings on every load). The catch :166-170 replaces valid settings with defaults. Empty-file branch :45-52. settings-persistence.svelte.ts:50 takes its baseline from the store, :79-83 flushes. INFER from fetched truncate:true plus POSIX O_TRUNC that ENOSPC leaves 0 or partial bytes.

## vault-lifecycle-5: Missing initVersion check before startSettingsPersistence lets a superseded init's session write the next vault's settings into the old vault's settings.json
- claimed severity: corruption
- anchor: src/lib/app/lifecycle/app-lifecycle.service.ts:210
- scenario: Two deep links arrive in quick succession: init(A) is awaiting configureSentry when init(B) starts. A resumes and starts persistence for path A with A's baseline. B's loadSettings puts B's settings in the store. B's startSettingsPersistence stops A's session, and the flush writes B's settings into A/.kokobrain/settings.json. A's periodic-note folders, templates, Todoist token and other settings are silently replaced.
- evidence given: READ: version check at :200, await configureSentry :202, startSettingsPersistence(vaultPath) :210 with no check, next check :240. B's unconditional stop :150 runs before A's session exists. settings-persistence.svelte.ts:46-66 (baseline and effect), :79-83 (flush writes session.path). The window grows to Sentry.close(2000) through the queue (sentry.service.ts:15,45-47). Switching with a vault open is deep-link only (AppShell.svelte:160, deep-link.service.ts:166).
