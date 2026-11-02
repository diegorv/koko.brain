# Deep dive h04-calendar-a (calendar-4, calendar-5, rename-move-delete-6)

Worktree: /Users/diegorv/Dev/pet-projects/koko/brain/.claude/worktrees/file-io-repro (HEAD 0ba80e6a).
Repro tests (new, untracked): src/tests/repro/h04-calendar-a/calendar-4-create-vs-restore.test.ts,
src/tests/repro/h04-calendar-a/calendar-5-post-disk-failure.test.ts.
Only `./node_modules/.bin/vitest run <file>` was run. No cargo, no build, no app code edited.

## Bug 1: a create at a name whose Trash restore is in flight can be overwritten (calendar-4)

Verdict: CONFIRMED_BY_TEST for the mechanism. Priority P3 (reachability), severity data-loss if it hits.

Trace:
- Undo of a delete: `undoDeleteEvent` (event-calendar.service.ts:1245) enqueues on the deleted note's path, then `restoreNow` (:1154) calls `restoreItem`.
- `restoreItem` (trash.service.ts:116) runs `exists(restorePath)`, then mkdir of the parent when missing, then `rename(trashPath, restorePath)` (:126). Two IPCs with a JS gap between them. plugin-fs `rename` overwrites (see fetched sources below), so nothing protects the target between the check and the rename.
- `createEvent` (:914) enqueues on `CREATE_QUEUE_KEY`, not on the note's path. `createNow` (:926) takes its planned name from `createTypedNote`'s readDir (type-definitions.service.ts:133), calls `holdPath` (event-calendar.service.ts:939), and `holdPath` (:438-445) chains after the previous tail without awaiting it. `createFile` then does its own readDir and `create_note` (fs.service.ts:119-129) without waiting on the restore's queue.
- Confirmed the claim's "reverse order" (create's write lands between restore's exists and rename): the restore's rename replaces the created note. The created note's bytes are then gone (no Trash entry, no copy). The restored note stays.
- Confirmed the no-serialization point: nothing makes `createNow` wait for a restore that is between its checks. `duplicateEvent` does join (:1003-1004), so the inconsistency is real.

Refuted sub-case (claim's "Order A", restore's rename lands between create_note's exists check and write_atomic's rename, vault.rs:896-899, utils/fs.rs:16-31):
- `create_note` is `pub fn` (sync). Tauri docs: "Commands without the async keyword are executed on the main thread unless defined with #[tauri::command(async)]" (https://v2.tauri.app/develop/calling-rust/). plugin-fs `exists` and `rename` are also sync `pub fn` (see below), so these disk steps run serially on the main thread and cannot interleave with each other. Only the TS-level restore pair (exists IPC, rename IPC) is open to interleaving.

Sources fetched:
- tauri-apps/plugins-workspace tag fs-v2.7.1, plugins/fs/src/commands.rs (pinned plugin-fs is 2.7.1 per src-tauri/Cargo.lock): `pub fn rename` is sync, no destination check, calls `std::fs::rename(&resolved_old_path, &resolved_new_path)`. `exists` is sync `pub fn`.
- doc.rust-lang.org std::fs::rename: "replacing the original file if `to` already exists."
- Tauri docs on sync command thread (above).

Reachability: the create must reach its `create_note` (after its readDir) inside the restore's exists-to-rename gap, or the restore must be stalled so the create lands in that gap. Both are IPC-scale windows (sub-ms to a few ms). Creating a new event requires dialog submission, so a human cannot issue undo and create inside that window; the create's chain (readDir, create_folder, template load, readDir, create_note) is longer than the restore's (exists, rename), so the restore usually lands first and the create picks "Standup 1.md". A main-thread stall (a long sync `scan_vault` or sync command) widens the gap, but a create still has to be issued inside it. Hence P3.

Rename-with-title variant (same class, not separately tested): `renameItem` (fs.service.ts:205-211) does `exists(newPath)` then `applyPathChange` then `rename`. A create that already holds the target (its buildContent hold) is joined by `joinPath` at event-calendar.service.ts:701. A create still before buildContent is not, so a create_note landing between renameItem's exists and rename is overwritten. Same window, same priority.

Repro: calendar-4-create-vs-restore.test.ts. Test 1 holds the restore's rename, runs createEvent to completion, releases the rename, and asserts the created bytes are still on the fake disk. FAILS:
  AssertionError: expected [ '[]', …(2) ] to include '---\n_type: Event\ndate: 2026-11-10\n…'
  Control (test 2): undo then create, sequentially: PASSES (create picks "Standup 1.md", both notes kept). So the failure comes from the interleaving.

## Bug 2: a failure after the disk op makes a completed rename or delete look failed and skips the post-op index and calendar steps (calendar-5, rename-move-delete-6)

Verdict: CONFIRMED_BY_TEST. Priority P2 (stale-state). No note bytes are lost.

Root cause: src/lib/core/filesystem/path-change.service.ts:127-170. After `await diskOp()` (:127) there is no try/finally. `updateLinksAfterRename` (:149) and `refreshTree` (:153) are unguarded. A throw there skips `rename_note` (:158-162) and the `forgetNote` sweep (:168-170). `refreshTree` rethrows (fs.service.ts:96-98), and `renameItem` / `deleteItem` rethrow (fs.service.ts:216-219, :186-188). `updateLinksAfterRename` calls `get_backlinks_v2` outside `allSettled` (link-updater.service.ts:27).

Calendar-specific consequences (event-calendar.service.ts):
- Rename: `renameAndWrite` catches any throw from `renameItem` and rethrows "Could not rename the note to ... may already exist" (:727-731). The store remap (:733-735), the field write (:753) and the op record are all skipped. The note is on disk under the new name, the calendar still shows the old path, and the other dialog edits are never saved (retry targets the old path and gets `missing`).
- Delete: `deleteNow` catches the throw from `deleteItem` (:1043-1049), rolls back the overlay, and throws "Could not move the note to the Trash" although `moveToTrash` already moved the note (trash.service.ts:71-83). No op is recorded (deleteEvent :1065-1070 records only after success), and `forgetNote` is skipped, so the index still lists the note.

Trigger: a refresh or link-lookup failure right after the disk op. Realistic trigger: `scan_vault` fails whenever any non-hidden subfolder cannot be read, because `scan_dir` propagates with `?` (src-tauri/src/commands/vault.rs:91-160, the recursive call at :147). Also a subfolder that vanishes mid-scan. Lock poisoning in `get_backlinks_v2` (vault.rs:431-438) needs a prior panic under the write lock. Uncommon, so P2 not P1.

Note: the two claimed ids describe one defect at two levels (the generic rename path, and the calendar's messages and rollback), so they are one bug.

Repro: calendar-5-post-disk-failure.test.ts (real renameItem / deleteItem; plugin-fs mocked as a disk; `scan_vault` rejects, `get_backlinks_v2` returns []). Both tests FAIL:
  rename: expected "vi.fn()" to be called with arguments: [ 'rename_note', { from: '/vault/Standup.md', to: '/vault/Daily.md' } ]
          (calls were get_backlinks_v2 and scan_vault only). Disk did move to Daily.md.
  delete: expected "vi.fn()" to be called with arguments: [ 'remove_note_from_index', { path: '/vault/Standup.md' } ]
          (only scan_vault was called). The note is in the Trash (trashStore has 1 item).

Not verified: the watcher's self-repair for a single-file rename or delete (plausible, not tested). The claim that a folder rename is not repaired by the watcher is not tested either.

## Not checked / limits
- No full calendar suite run; only the two new repro files.
- Lock-poisoning reachability (which panics can happen under the VaultIndex write lock) not enumerated.
- Windows rename semantics not checked (the fetched docs say they differ).
- The fixture's `create_note` mock overwrites without the Rust exists check. Correct here because the create runs when the target is free, which matches the Rust path.
