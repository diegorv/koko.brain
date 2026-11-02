# o08-atomicity: deep-dive raw report

Code read at worktree `.claude/worktrees/file-io-repro`, HEAD `0ba80e6a` (same as main).
Versions from `src-tauri/Cargo.lock` / `node_modules`: tauri-plugin-fs 2.7.1 (Rust and JS), tauri 2.12.5.

Upstream source fetched (curl from raw.githubusercontent.com):
- `tauri-apps/plugins-workspace` tag `fs-v2.7.1`, `plugins/fs/src/commands.rs`
- `tauri-apps/tauri` tag `tauri-v2.12.5`, `crates/tauri/src/ipc/mod.rs` and `crates/tauri-macros/src/command/wrapper.rs`

## Bug 1: every note write is truncate-in-place; a failed write (ENOSPC) leaves the note at 0 bytes

Ids: save-pipeline-9, calendar-3, rust-writes-3 (same root cause, three entry points).

Verdict: CONFIRMED_BY_TEST (TS layer, with a fake disk that models the upstream open/write semantics) plus CONFIRMED_BY_TRACE for the native side.

### Trace
- `src/lib/core/editor/editor.service.ts:168` `saveFileByPath` calls `writeTextFile(path, content)` (no options).
- `node_modules/@tauri-apps/plugin-fs/dist-js/index.js:777-788` sends `plugin:fs|write_text_file` with `options: JSON.stringify(undefined)`.
- Upstream `commands.rs` (fs-v2.7.1) `write_file_inner` (~l.1125-1210): with no options it opens with `OpenOptions { write: true, truncate: true, create: true }`; with options it uses `truncate: !opts.append` (`append` defaults to false). Then `file_handle.write_all(&data)`. No temp file, no rename, no `sync_all`. `resolve_file_in_fs` is a plain `std::fs::OpenOptions::open`.
- So the old bytes are gone at `open`; if `write_all` fails the file is left empty or partial.
- Same writer at `frontmatter-write.service.ts:149` (closed note, `{ create: false }`, still `truncate: true`), `link-updater.service.ts:39` (rename link rewrite, every backlinking note), and `event-calendar.service.ts:1037` / `frontmatter-write.service.ts:129` via `saveFileByPath`.
- The repo has `write_atomic` (`src-tauri/src/utils/fs.rs:16-32`, tmp + rename). It is used by `propagate_type_rename_inner` (vault.rs:370), `toggle_task_status_inner` (vault.rs:683) and `create_note` (vault.rs:899), not by any of the paths above. (calendar-3's "used only by create_note" is inaccurate; the conclusion stands.)

### What happens after the failure
- Open tab: `saveFileByPath` toasts "Failed to save file." and returns false; the tab stays dirty; `saveDirtyTabs` retries every 5 s (editor.service.ts:181-194). If space frees, the retry rewrites the full buffer, so nothing is lost.
- Loss happens when the user leaves before that: Cmd+Q -> `registerCloseHandler` (`src/lib/app/tauri-listeners.service.ts:53-62`) asks "Failed to save: X. Close anyway and lose unsaved changes?". The text implies only recent edits are lost, but the disk copy is already 0 bytes, so "yes" loses the whole note. `closeTab` ("Discard changes?") is the same.
- Closed note (calendar drag, Properties write on a closed note, link rewrite after rename): `base` and `next` exist only in local variables in `attempt()`. When `writeTextFile` throws, the note on disk is already empty and no copy exists in the app's memory. Loss is immediate.

### Recovery
- File History is always registered (`app-lifecycle.service.ts:268`) and snapshots every successful save (`save_snapshot`, history.rs). The last in-app-saved version is there if it was saved within retention (7 days all kept, then 1/day up to +30 days, then deleted: history.rs:137-155). Notes never saved in-app (imported vault, edited only externally) or idle for 37+ days have no snapshot. The link updater path does not snapshot at all (it uses `applyNoteChange`, not `notifyAfterSave`), but the earlier snapshot of the note, if any, remains.
- Time Machine / external backup otherwise.

### Reachability (honest)
- ENOSPC: needs a full disk. Truncation frees the old blocks, so a same-size rewrite often still fits; it fails when content grows past the free space (partial note) or when APFS local snapshots pin the freed blocks (Time Machine local snapshots), giving 0 bytes. I did not reproduce APFS behavior on a real full volume (not allowed to create disk images); this part is from reasoning, not measurement.
- Crash or kill between `open(O_TRUNC)` and `write_all`: microsecond window per save. After `write()` returns, the bytes are in the page cache and survive a process crash. Theoretical.
- Power loss / kernel panic without fsync: possible zero-length file depending on filesystem ordering; unverified for APFS. Note that `write_atomic` has no fsync either, so it is not a complete fix for this sub-case.

Priority: P1 (data-loss, recoverable with effort via File History or backup, on a less common but realistic path: a full disk). Not P0 because default-setting, common-action use with free disk space does not trigger it.

### Repro
`src/tests/repro/o08-atomicity/non-atomic-save.test.ts`. It mocks only `@tauri-apps/plugin-fs` (a fake disk that applies the upstream truncate-then-write order and throws ENOSPC from `write_all`), `@tauri-apps/api/core` and `@tauri-apps/plugin-dialog`. It uses real stores and real services. All 3 tests fail on the bug's assertion:

```
FAIL > open tab: ENOSPC during autosave leaves the old note on disk
AssertionError: expected '' to be '# Meeting notes\n\nA long body the us…'
 ❯ non-atomic-save.test.ts:67  expect(disk.get(NOTE)).toBe(SAVED);

FAIL > closed note: a failed frontmatter rewrite (calendar drag) leaves the note on disk
AssertionError: expected '' to be '---\nstart: 2026-11-02\n---\n# Event\…'
 ❯ non-atomic-save.test.ts:81  expect(disk.get(NOTE)).toBe(base);

FAIL > onContentChange path is the same writer
AssertionError: expected '' to be '# Meeting notes\n\nA long body the us…'
 ❯ non-atomic-save.test.ts:92
```

Limit: the fake disk encodes the upstream semantics I read; the test proves the TS layer has no protection against them (no temp file, no backup of `base`), not how APFS behaves.

Fix sketch: route note writes (editor save, frontmatter write, link updater) through a Rust command built on `write_atomic`, keeping the read-only check, and optionally add `sync_all` on the temp file before the rename. Change the quit dialog to say that the file on disk may be damaged.

## Bug 2: saves of one path are not serialized (overlapping truncate+write), and failing debounce runs stack retry chains

Ids: cross-cutting-10, save-pipeline-14.

Verdict: CONFIRMED_BY_TEST for the TS facts (two same-path writes in flight; retry chains multiply). The on-disk byte interleave is PLAUSIBLE by trace only and needs sub-millisecond timing.

### Trace
- `saveFileByPath` (editor.service.ts:161-177) has no per-path lock or in-flight check. Callers: `saveDirtyTabs` (183-194, debounced and retry), `saveAllDirtyTabs` (234-247), `updateNoteFrontmatter` tab branch (frontmatter-write.service.ts:128-129), calendar `deleteNow` (event-calendar.service.ts:1037). `link-updater.service.ts:39` writes the same path directly and also bypasses any coordination.
- tauri 2.12.5 `respond_async_serialized_inner` (ipc/mod.rs ~l.371) does `crate::async_runtime::spawn` per async command invoke, and `write_text_file` is `pub async fn` with blocking `std::fs` inside. Two in-flight invokes therefore run on separate tokio worker threads with no lock.
- Each opens with O_TRUNC and its own fd offset 0. If the order is openA, openB, writeA, writeB and A is longer, the file ends as B followed by A's tail: corrupt bytes. Separately, if the writes finish in the other order (B then A) while the responses resolve A then B, the disk holds the older content while `markSavedByPath` records the newer one, so the tab looks clean.
- Retry chains: each failing `saveDirtyTabs` run schedules its own `setTimeout(saveDirtyTabs, 5000)`; a new debounce run during a persistent failure starts another chain, and chains never merge. `resetEditor` does not cancel them, but after a reset they no-op on empty tabs, so that part is harmless.

### Reachability
- Two same-path saves in flight at once: the user changes a property (or a rename rewrites links, or a calendar action runs) inside the IPC round trip of a firing body autosave. That window is milliseconds on a local SSD, longer on slow or network volumes. Rare.
- Byte interleave or out-of-order completion on the Rust side: both writes must cross inside the microseconds between one task's `open` and `write_all`. Very rare. When it happens it is silent corruption of note bytes, and the next save of the dirty buffer usually overwrites it (not in the out-of-order-clean case).
- Retry stacking: happens every time saves keep failing (disk full, permissions, unmounted volume) while the user keeps editing. Effect: N toasts and N truncating writes every 5 s. Cosmetic.

Priority: P3. The overlap is real, but the corrupting interleave needs millisecond-to-microsecond timing; the retry stacking is a minor annoyance.

### Repro
`src/tests/repro/o08-atomicity/same-path-save-overlap.test.ts` (mocks only `@tauri-apps/plugin-fs`, `@tauri-apps/api/core`, `@tauri-apps/plugin-dialog`). Both tests fail on the bug's assertion:

```
FAIL > a Properties edit while the body save is in flight must not start a second write of the same path
AssertionError: expected 2 to be 1
 ❯ same-path-save-overlap.test.ts:70  expect(pending.filter((p) => p.path === NOTE).length).toBe(1);

FAIL > repeated failing debounce runs must not stack independent 5 s retry chains
AssertionError: expected 2 to be 1
 ❯ same-path-save-overlap.test.ts:91  expect(writeCalls - before).toBe(1);
```

Fix sketch: a per-path promise chain in `saveFileByPath` (await the in-flight write, then save the current `tab.content` if it is still dirty), shared by the link updater. A single module-level retry timer (`if (!retryTimer) retryTimer = setTimeout(...)`) cleared in `resetEditor`. An atomic Rust writer (Bug 1) also removes the byte-interleave outcome, because rename is all-or-nothing.

## Not verified
- APFS behavior on a truly full volume and on power loss (no disk image or hardware test allowed).
- Actual tokio scheduling interleave; inferred from upstream source, not observed.
