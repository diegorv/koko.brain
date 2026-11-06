# 11: Trash writers rebuild the manifest from a stale or empty store, orphaning trashed items

**Status:** wontfix

**Blocked by:** none
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o06-trash-settings-io (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

Reviewer note: the orphaned containers stay on disk under .kokobrain/trash until Empty Trash, so they can be recovered by hand from Finder until then. Empty Trash deleting items the UI never listed is the irreversible part.

## Trash writers rebuild the manifest from a stale or empty in-memory store, and Empty Trash deletes every container, including entries that are no longer listed

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: cross-cutting-8, recovery-2, vault-lifecycle-4

**How a user hits it.** Default settings. Most realistic: the vault is synced between two Macs (iCloud/Dropbox). Mac 2's store is loaded only at vault open or when the Trash panel mounts, so its next delete writes [Y, ...stale] and drops Mac 1's newly trashed entry; that container becomes an orphan. Less common: the manifest is empty or unreadable at open (crash or power loss during the non-atomic truncate-then-write, or a transient read error), and the next delete rewrites it with only the new item. P3 sub-path: a stale TrashSection onMount loadTrash resolves after a moveToTrash and drops the new entry from the store. In every case the loss happens only when the user later clicks Empty Trash, whose confirm counts only the listed items.

**Recoverable from.** Until Empty Trash, the bytes stay in <vault>/.kokobrain/trash/items/<uuid>/, reachable in Finder only with hidden files shown. After Empty Trash (a permanent std::fs remove_dir_all), only an external backup (Time Machine, or the sync provider's deleted-files history) can restore them.

**Root cause.** src/lib/core/trash/trash.service.ts:79 (also :137-139 and :191) serializes trashStore.items instead of the on-disk manifest; src/lib/core/trash/trash.service.ts:37-39 and trash.logic.ts:58-66 turn a failed or invalid load into []; src/lib/core/trash/trash.service.ts:207-210 removes the whole items/ dir regardless of the manifest

**Evidence.** loadTrash catch sets [] and does not rethrow (trash.service.ts:37-39), so the toast at app-lifecycle.service.ts:291-293 is never shown. parseTrashManifest returns [] for '' or invalid JSON (trash.logic.ts:58-66). The only loadTrash callers are app-lifecycle.service.ts:288 and TrashSection.svelte:19; the watcher drops .kokobrain. saveManifest writes in place with writeTextFile (:269-276); upstream plugins-workspace v2 plugins/fs/src/commands.rs write_file_inner opens with truncate:true and then calls write_all, with no temp file or rename. emptyTrash calls remove(itemsDir, recursive) (:209), while the confirm counts trashStore.count (TrashSection.svelte:49-51). No code adopts orphaned items/<uuid> dirs.

**Limits found while trying to refute.** Downgraded from P0. Nothing is lost until the user explicitly runs Empty Trash, and a corrupt local manifest needs a crash during a microsecond window. The multi-device sync trigger is what keeps this at P1.

**Repro test.** `.scratch/file-io-audit/repro/o06-trash-settings-io/trash-manifest-orphans.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
× a transient manifest read failure at load does not make the next delete drop earlier entries: AssertionError: expected [ Array(1) ] to deeply equal ArrayContaining ["a", "b", "c"]
× a manifest updated on disk after load (sync from another machine) survives the next delete: AssertionError: expected [ …(2) ] to include 'b'
× a stale loadTrash (TrashSection mount) that resolves after a delete does not drop the new entry from the store: AssertionError: expected [] to include 'notes/x.md'
× keeps a trashed note whose container is not listed in the manifest: AssertionError: expected undefined to be '# orphan, only copy'
```

**Fix sketch.** Re-read and merge the on-disk manifest by id before each write (or run all writes through one serialized queue that re-reads). Have loadTrash adopt items/<uuid> dirs that have no entry. Make emptyTrash remove only the listed containers, or count orphans in the confirm. Back up the manifest instead of overwriting it after a read or parse failure. Write the manifest atomically.

## A phantom trash entry (listed in the manifest, container gone) cannot be deleted or restored; only Empty Trash clears it

- Verdict: CONFIRMED_BY_TEST (deep dive priority P3, severity minor)
- Claims covered: recovery-9

**How a user hits it.** Needs one of: (1) a crash after the restore rename (:126) and container removal (:130) but before the manifest write (:139), a window of a few ms; (2) a failed manifest write after restore (swallowed at :140-142) with no further trash write in that session; (3) a deletePermanently whose saveManifest fails after the dir was removed. Once created, every Restore or Delete click fails with a toast.

**Recoverable from.** Nothing is lost. The phantom has no bytes, and clearing it by emptying the whole Trash is a choice the user makes knowingly.

**Root cause.** src/lib/core/trash/trash.service.ts:188 (remove(itemDir) of a missing path throws before the manifest is updated); src/lib/core/trash/trash.service.ts:126 (restore rename ENOENT, entry kept)

**Evidence.** Upstream plugins/fs/src/commands.rs remove calls std::fs::symlink_metadata first and returns 'failed to get metadata of path' for a missing path. deletePermanently awaits remove before saveManifest (:187-191), so the entry is never dropped. restoreItem rethrows the rename failure (:176-178). If the crash came before :130, the empty container still exists and delete works, so the stuck state needs the container to be gone.

**Limits found while trying to refute.** The claim that Empty Trash 'destroys every real item too' is Empty Trash's documented, confirmed behavior, so it is not an extra loss.

**Repro test.** `.scratch/file-io-audit/repro/o06-trash-settings-io/trash-manifest-orphans.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
× Delete permanently clears the phantom entry instead of failing forever: AssertionError: promise rejected "Error: failed to get metadata of path: /v…" instead of resolving ❯ Module.deletePermanently src/lib/core/trash/trash.service.ts:188:9
```

**Fix sketch.** In deletePermanently, treat a missing container as already deleted (check exists, or ignore NotFound). In restoreItem, drop the entry with a clear message when exists(trashPath) is false.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/114-unreadable-corrupt-trash-manifest-backed-up-never.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
