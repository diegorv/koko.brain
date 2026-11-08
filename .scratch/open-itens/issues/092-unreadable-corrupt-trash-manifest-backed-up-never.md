# 092: An unreadable or corrupt trash manifest is backed up, never replaced by a partial list, and trash writers never orphan trashed items

**Origin:** `audit-2026-11-05` Issue 114, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/audit-2026-11-04/issues/02-trash-manifest-unreadable.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). Issue 11's corrupt-load and Empty Trash parts are this Issue, and its phantom entry is the same manifest-rebuild fix. It needs a corrupt manifest. Owner decision D2 (a) is recorded.

**Audit check at `5f8003d67`:** still_present (content, low). src/lib/core/trash/trash.logic.ts:59-66: parseTrashManifest returns [] when JSON.parse throws or the root is not an array. src/lib/core/trash/trash.service.ts:33-35 sets items from that result, and the catch at :37-39 calls setItems([]) on a read error with no rethrow, no toast and no broken flag. The next write rebuilds from the store: moveToTrash :79 saveManifest([item, ...trashStore.items]), restoreItem :137-139, deletePermanently :193, emptyTrash :215. emptyTrash :209-212 runs remove(itemsDir, recursive) first, so unlisted items/<uuid>/ folders are deleted, while the confirm counts only trashStore.count (TrashSection.svelte:50). saveManifest :272-279 overwrites with plain writeTextFile (truncate then write), which is how a truncated manifest appears in the first place. rg finds no manifestBroken, backup or toast in src/lib/core/trash. git log -- src/lib/core/trash shows only restore/indexing fixes (f14c1754d, baf12cca2, ff2b09d07), none for a corrupt load. Tests pin the silent-empty contract: trash.service.test.ts:104-112, trash.logic.test.ts:117-129.

**Stale in the text below:** Line refs drifted slightly: deletePermanently writes at :193 (Issue says :192), emptyTrash remove/save at :209-215 (Issue says :208-214), saveManifest writeTextFile at :278 (Issue says :276). The read-error test is at trash.service.test.ts:104-112 and the invalid-entries test at :115. Otherwise accurate.

**What to build:** If .kokobrain/trash/trash-manifest.json exists but cannot be read, or does not parse to an array, the Trash must not act as if it were empty and must not overwrite that file. Today the next Move to Trash writes [newItem] over it, and Empty Trash deletes every items/<uuid>/ folder, including the ones the user can no longer see. parseTrashManifest (src/lib/core/trash/trash.logic.ts:58-66) must tell 'invalid' apart from 'empty', for example by returning null or { ok: false }. loadTrash (src/lib/core/trash/trash.service.ts:24-43) records a manifestBroken state in trashStore, logs it and shows a toast. The write paths that rebuild the manifest from the store (moveToTrash :79, restoreItem :139, deletePermanently :192, emptyTrash :208-214) first back up the unreadable manifest to trash-manifest.broken-<stamp>.json and only then write a new manifest. The Trash settings section shows the error state.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first, in src/tests/lib/core/trash/trash.service.test.ts. With exists resolving true and readTextFile resolving to '[{"id":"a",' (truncated), run await loadTrash(VAULT), then await moveToTrash(VAULT, `${VAULT}/note.md`, false). writeTextFile must not be called on the manifest path with content that lacks the original bytes, unless a backup copy of the manifest succeeded first. It fails today.
- [ ] The same holds when readTextFile rejects.
- [ ] emptyTrash after a corrupt load does not remove items/ folders that the user never saw listed.
- [ ] parseTrashManifest returns a failure result for invalid JSON and for a non-array root, and [] only for a valid empty array. Update the trash.logic.test.ts cases at :117-129 to the new contract and record that change in the commit message.
- [ ] A missing manifest still loads as empty and the first trash op creates it (existing test).
- [ ] The user sees a toast naming the manifest problem.
- [ ] Frontend gate: pnpm check, pnpm vitest run and pnpm build all pass.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/archived/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 1 of the parallel plan.
- **Finding `trash-manifest`:** real, high. Root cause: loadTrash and parseTrashManifest treat a read error, unparseable JSON and a non-array root the same as a missing manifest (empty list). Nothing records that the file on disk was not loaded, so every later manifest write starts from that empty list and replaces the original.
  Evidence: src/lib/core/trash/trash.logic.ts:58-66: parseTrashManifest returns [] when JSON.parse throws or the root is not an array, with no signal. src/lib/core/trash/trash.service.ts:33-39: readTextFile then setItems(parse), and the catch at :37-39 also calls setItems([]). The next write uses that empty base: moveToTrash :79 saveManifest([item, ...trashStore.items]), restoreItem :139, deletePermanently :192, and emptyTrash :214. emptyTrash :208-210 first runs remove(itemsDir, {recursive:true}), which deletes the orphaned items/<uuid>/ folders the user can no longer see. Callers: app-lifecycle.service.ts:291 and TrashSection.svelte:19. Tests: trash.service.test.ts:105-113 and trash.logic.test.ts:117-129 assert the silent-empty result. Nothing tests a later write. writeTextFile in saveManifest (:276) is not atomic, so a crash during a write can produce a truncated manifest, which is a realistic trigger.
- **Owner decision (2026-11-04):** D2 (a): back up the unreadable manifest to `trash-manifest.broken-<stamp>.json`, then start a new manifest. Old trashed files stay on disk but are not listed; Empty Trash leaves unlisted `items/` folders alone. Dropping invalid entries inside a valid array is out of scope unless trivial; if left, say so in the commit.
- parseTrashManifest also silently drops entries that are not valid TrashItems inside a valid array (trash.service.test.ts:115). That drop is then persisted on the next write. Decide whether that is in scope: it is a smaller form of the same loss. Do not mock trash.store or trash.logic.
- **Size:** M.

## Audit 2026-11-05 additions

### Merged from `.scratch/archived/file-io-audit/issues/11-trash-manifest-stale-rebuild.md`

That Issue was folded into this one by the audit; its text follows.

### 11: Trash writers rebuild the manifest from a stale or empty store, orphaning trashed items

**Status:** needs-triage

**Blocked by:** none
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o06-trash-settings-io (raw reports in .scratch/archived/file-io-audit/deep/raw/), verified at c4bfee07

Reviewer note: the orphaned containers stay on disk under .kokobrain/trash until Empty Trash, so they can be recovered by hand from Finder until then. Empty Trash deleting items the UI never listed is the irreversible part.

### Trash writers rebuild the manifest from a stale or empty in-memory store, and Empty Trash deletes every container, including entries that are no longer listed

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: cross-cutting-8, recovery-2, vault-lifecycle-4

**How a user hits it.** Default settings. Most realistic: the vault is synced between two Macs (iCloud/Dropbox). Mac 2's store is loaded only at vault open or when the Trash panel mounts, so its next delete writes [Y, ...stale] and drops Mac 1's newly trashed entry; that container becomes an orphan. Less common: the manifest is empty or unreadable at open (crash or power loss during the non-atomic truncate-then-write, or a transient read error), and the next delete rewrites it with only the new item. P3 sub-path: a stale TrashSection onMount loadTrash resolves after a moveToTrash and drops the new entry from the store. In every case the loss happens only when the user later clicks Empty Trash, whose confirm counts only the listed items.

**Recoverable from.** Until Empty Trash, the bytes stay in <vault>/.kokobrain/trash/items/<uuid>/, reachable in Finder only with hidden files shown. After Empty Trash (a permanent std::fs remove_dir_all), only an external backup (Time Machine, or the sync provider's deleted-files history) can restore them.

**Root cause.** src/lib/core/trash/trash.service.ts:79 (also :137-139 and :191) serializes trashStore.items instead of the on-disk manifest; src/lib/core/trash/trash.service.ts:37-39 and trash.logic.ts:58-66 turn a failed or invalid load into []; src/lib/core/trash/trash.service.ts:207-210 removes the whole items/ dir regardless of the manifest

**Evidence.** loadTrash catch sets [] and does not rethrow (trash.service.ts:37-39), so the toast at app-lifecycle.service.ts:291-293 is never shown. parseTrashManifest returns [] for '' or invalid JSON (trash.logic.ts:58-66). The only loadTrash callers are app-lifecycle.service.ts:288 and TrashSection.svelte:19; the watcher drops .kokobrain. saveManifest writes in place with writeTextFile (:269-276); upstream plugins-workspace v2 plugins/fs/src/commands.rs write_file_inner opens with truncate:true and then calls write_all, with no temp file or rename. emptyTrash calls remove(itemsDir, recursive) (:209), while the confirm counts trashStore.count (TrashSection.svelte:49-51). No code adopts orphaned items/<uuid> dirs.

**Limits found while trying to refute.** Downgraded from P0. Nothing is lost until the user explicitly runs Empty Trash, and a corrupt local manifest needs a crash during a microsecond window. The multi-device sync trigger is what keeps this at P1.

**Repro test.** `.scratch/archived/file-io-audit/repro/o06-trash-settings-io/trash-manifest-orphans.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
× a transient manifest read failure at load does not make the next delete drop earlier entries: AssertionError: expected [ Array(1) ] to deeply equal ArrayContaining ["a", "b", "c"]
× a manifest updated on disk after load (sync from another machine) survives the next delete: AssertionError: expected [ …(2) ] to include 'b'
× a stale loadTrash (TrashSection mount) that resolves after a delete does not drop the new entry from the store: AssertionError: expected [] to include 'notes/x.md'
× keeps a trashed note whose container is not listed in the manifest: AssertionError: expected undefined to be '# orphan, only copy'
```

**Fix sketch.** Re-read and merge the on-disk manifest by id before each write (or run all writes through one serialized queue that re-reads). Have loadTrash adopt items/<uuid> dirs that have no entry. Make emptyTrash remove only the listed containers, or count orphans in the confirm. Back up the manifest instead of overwriting it after a read or parse failure. Write the manifest atomically.

### A phantom trash entry (listed in the manifest, container gone) cannot be deleted or restored; only Empty Trash clears it

- Verdict: CONFIRMED_BY_TEST (deep dive priority P3, severity minor)
- Claims covered: recovery-9

**How a user hits it.** Needs one of: (1) a crash after the restore rename (:126) and container removal (:130) but before the manifest write (:139), a window of a few ms; (2) a failed manifest write after restore (swallowed at :140-142) with no further trash write in that session; (3) a deletePermanently whose saveManifest fails after the dir was removed. Once created, every Restore or Delete click fails with a toast.

**Recoverable from.** Nothing is lost. The phantom has no bytes, and clearing it by emptying the whole Trash is a choice the user makes knowingly.

**Root cause.** src/lib/core/trash/trash.service.ts:188 (remove(itemDir) of a missing path throws before the manifest is updated); src/lib/core/trash/trash.service.ts:126 (restore rename ENOENT, entry kept)

**Evidence.** Upstream plugins/fs/src/commands.rs remove calls std::fs::symlink_metadata first and returns 'failed to get metadata of path' for a missing path. deletePermanently awaits remove before saveManifest (:187-191), so the entry is never dropped. restoreItem rethrows the rename failure (:176-178). If the crash came before :130, the empty container still exists and delete works, so the stuck state needs the container to be gone.

**Limits found while trying to refute.** The claim that Empty Trash 'destroys every real item too' is Empty Trash's documented, confirmed behavior, so it is not an extra loss.

**Repro test.** `.scratch/archived/file-io-audit/repro/o06-trash-settings-io/trash-manifest-orphans.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
× Delete permanently clears the phantom entry instead of failing forever: AssertionError: promise rejected "Error: failed to get metadata of path: /v…" instead of resolving ❯ Module.deletePermanently src/lib/core/trash/trash.service.ts:188:9
```

**Fix sketch.** In deletePermanently, treat a missing container as already deleted (check exists, or ignore NotFound). In restoreItem, drop the entry with a clear message when exists(trashPath) is false.


## Comments

- 2026-11-06: migrated from `.scratch/archived/audit-2026-11-04/issues/02-trash-manifest-unreadable.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
