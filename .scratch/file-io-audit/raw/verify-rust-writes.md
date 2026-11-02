# Adversarial verification: rust-writes

Read-only. Nothing built or run. [READ] = seen in code or fetched upstream source. [INFER] = reasoned from read code, not executed.

Upstream fetched (WebFetch, branch heads; lockfile pins tauri 2.12.5, tauri-plugin-fs 2.7.1, tauri-plugin-dialog 2.8.4, `src-tauri/Cargo.lock:5371-5559`):
- `tauri-apps/plugins-workspace` v2 `plugins/fs/src/commands.rs`: `write_text_file` delegates to `write_file_inner`; with no options it opens `truncate: true, create: true`, then one `write_all`. No temp file, no rename, no sync. `resolve_path` allows when `fs_scope.is_allowed(real_path) || scope.is_allowed(real_path)`.
- `tauri-apps/plugins-workspace` v2 `plugins/dialog/src/commands.rs`: folder branch calls `s.allow_directory(&path, options.recursive)` on the fs-plugin scope; `recursive` is `#[serde(default)] bool` (false when omitted). The core Tauri scope gets `options.directory` (true), but plugin-fs commands check the fs-plugin scope plus the capability ACL, not the core scope.
- `tauri-apps/tauri` dev `crates/tauri/src/scope/fs.rs`: `allow_directory` adds `dir` and `dir/*` (non-recursive) or `dir/**`; matching uses `require_literal_separator: true`, so `dir/*` covers only direct children; leading dots need a literal match on Unix.

Known-issue check: `.scratch/architecture-stability/issues/01..69` have no issue on task toggle, write truncation, dialog scope or type-rename partial failure. `.scratch/kimi-3-tauri-audit/audit-2026-08-19.md` covers containment (C1/C2), symlinks (M16), asset scope (L2), not these. `.scratch/ios-app/research/review-data-safety.md:72-79` describes F1 and F2 as research notes only.

---

## rust-writes-1: task toggle wipes unsaved typing. CONFIRMED, data-loss

Tried to refute: looked for a save on tab switch, a flush on editor unmount, or a dirty check in `toggleTask`. None exists.
- [READ] Keystroke: `editor-extensions.ts:188` -> `onContentChange` (`editor.service.ts:224-227`) -> `editorStore.updateContent` sets `tab.content` (`editor.store.svelte.ts:84-88`); arms the 2000 ms debounce (`editor.service.ts:197`).
- [READ] `switchTab` only `setActiveIndex` (`editor.service.ts:250-255`); `toggleTasksTab`/`openTasksTab` likewise (`tasks.service.ts:123-156`). `MarkdownEditor` `onDestroy` saves only view state, no content save (`MarkdownEditor.svelte:147-165`). Callers of `saveFileByPath`/`saveAllDirtyTabs` are explicit save, vault switch, quit, calendar, frontmatter write, file history (grep) - none on tab switch.
- [READ] `EditorView.svelte:70-71` swaps in `TasksView` (the only mount of TasksView). Click -> `toggleTask` (`TasksView.svelte:66-68`).
- [READ] Rust reads disk (`commands/vault.rs:669`), toggles, `write_atomic` (`:683`). No access to the buffer.
- [READ] `toggleTask` calls `syncExternalContentToEditor(path, updated, true, 'none')` unconditionally (`tasks.service.ts:114`) -> `updateTabContentByPath` sets content AND savedContent (`editor.store.svelte.ts:130-136`). No `isTabDirty` check.
- [READ] Debounce fires `saveDirtyTabs`, which filters `isTabDirty` (`editor.service.ts:183-187`) -> tab is clean -> no write. `MarkdownEditor.onMount` builds a new `EditorState` from `tab.content` (`MarkdownEditor.svelte:99-108`), so undo history is gone.
- [READ] File history snapshots only run on a successful save (`file-history.service.ts:190-196` via after-save observer); the typing was never saved.
- [READ] Only test uses a clean tab (`src/tests/lib/features/tasks/tasks.service.test.ts:187-202`).

Contrast [READ]: `link-updater.service.ts:33-35` and `type-definitions.service.ts:215-225` start from `tab.content`.

Repro: open note A with a task, type "hello" on a new line, within 2 s switch to Tasks (shortcut), tick A's task, switch back: "hello" is gone, tab clean, disk lacks it. Failing test: add tab with `content !== savedContent`, mock toggle result built from savedContent, call `toggleTask`, assert `tab.content` still contains the typed text.
Fix hint: when the tab is dirty, apply `toggle` to `tab.content` (or save the dirty tab first, then toggle), never `markSaved=true` over a dirty buffer.
Known: research note only (`review-data-safety.md:74`), not filed.

## rust-writes-2: stale Tasks list toggles the wrong line. CONFIRMED (timing window bounded), corruption (low impact, visible after refetch)

Tried to refute: looked for any content check in the toggle path or a refetch on index change that is not throttled.
- [READ] Args are only `path, lineNumber` (`contracts/commands.ts:84`, `commands/vault.rs:708-713`). `toggle_task_in_content` flips the task marker on whatever line is at that index, no expected-text check (`vault/parsing.rs:1873-1906`).
- [READ] TasksView refetches on `vaultIndexVersion` (`TasksView.svelte:78-83`) and after its own toggle (`tasks.service.ts:115`). The version bump is throttled: 2000 ms after an event, at least 10 000 ms between refreshes (`tauri-listeners.service.ts:84-88`, doc `:107-127`).
- [READ] The save that lands while Tasks is open goes through `notifyAfterSave` -> `applyNoteChange` source `save` (`editor.hooks.ts:81`), so Rust re-indexes line numbers but the list keeps the old ones until the throttled bump.
- [INFER] Window: from the save (2 s after the last keystroke) to the bump (>= 2 s later, up to 10 s in a burst). That is a deterministic multi-second window, so not merely a race. If the stale line holds a non-task, the click silently no-ops (`tasks.service.ts:106-108`).

Severity: the wrong checkbox flips; the immediate refetch shows it, and it is one click to undo. Real unrequested content change, low impact.
Repro: note with `- [ ] buy milk` on line 10; insert `- [ ] new` above it; switch to Tasks in < 2 s; wait ~2.5 s (save lands, bump not yet); click "buy milk": "new" gets checked. Rust test idea: call `toggle_task_status_inner` with a line number taken before an insert and assert it refuses.
Fix hint: send the expected line text (or task text) with the toggle and have Rust return a conflict when the line differs.
Known: research only (`review-data-safety.md:72,76`).

## rust-writes-3: full disk truncates the note on save. PLAUSIBLE, data-loss (narrower than claimed)

Confirmed parts:
- [READ] Editor save is `writeTextFile(path, content)` with no options (`editor.service.ts:168`). Upstream opens with truncate then `write_all`, no temp file (fetched). A failure after the open leaves an empty or partial file.
- [READ] On failure `savedContent` is unchanged, the toast shows, retry in 5 s (`editor.service.ts:173-177,191-193`). The quit dialog says "lose unsaved changes" (`tauri-listeners.service.ts:56-61`). The watcher skips dirty tabs (`editor.service.ts:380`).
- [READ] `write_atomic` (`utils/fs.rs:16-32`) is not used for editor saves.

Partial refutation:
- [READ] File history keeps a snapshot of every successful save, and the hook is always registered (`app-lifecycle.service.ts:268`, `file-history.service.ts:190-196`, `commands/history.rs:57-78`). For any note saved before in this app, the last saved version can be restored from File History, so "loses the whole note with no way back" is overstated. The real unrecoverable loss is (a) a note never saved by this app (imported or created outside it), whose first save fails after the truncate, or (b) history pruned or the history DB unwritable.
- [UNVERIFIED] Whether APFS returns ENOSPC at `write_all` after a truncate on a full volume (the truncate frees blocks unless snapshots pin them). This depends on conditions I could not pin down, so the verdict is PLAUSIBLE.

Repro: on a small full disk image (hdiutil), open a vault there with a large note never saved by the app, fill the volume, edit and save: check the file size on disk after the "Failed to save" toast.
Fix hint: route editor saves through a Rust atomic write command (temp + fsync + rename) instead of plugin-fs `writeTextFile`.
Known: not filed.

## rust-writes-4: vault outside the allowed roots half-works. CONFIRMED, stale-state

Tried to refute: looked for a front-end guard that rejects other folders, a Rust `allow_directory`, or a persisted-scope plugin. None exists.
- [READ] `open({ directory: true, multiple: false })` with no `recursive` (`vault.service.ts:26`), and `switchVault` accepts any path (`:18-22`). The only mention of the limit is UI text (`routes/(app)/+page.svelte:44`). grep for `kokobrain-vaults` in `src/lib`, `src/routes` and `src-tauri/src` finds only that line.
- [READ] No `allow_directory`, `fs_scope`, `FsExt` or persisted-scope in `src-tauri/src`, `Cargo.toml` or `tauri.conf.json`. Capabilities cover only `$DOCUMENT/kokobrain-vaults`, `$HOME/kokobrain-vaults` and `$APPLOG` (`capabilities/default.json`).
- [READ upstream] The dialog grants `dir/*` only, with no dotfiles and no subfolders. plugin-fs checks the fs scope or the ACL on the real path.
- [READ] Rust commands use `std::fs` without the ACL (`commands/vault.rs:664-690,342-386`).
- [READ] Link rewrite failures are only `error()`-logged (`link-updater.service.ts:56-60`). That goes to the log and Sentry, with no toast.
- [INFER] The subfolder `readTextFile` is denied and shows a "Failed to open file." toast (`editor.service.ts:144-147`), so that part is visible. Silent effects: broken links after a rename. After a restart, `openRecentVault` has no runtime grant, so every plugin-fs call fails, including `exists` at `vault.service.ts:40`, which is caught and logged before the switch goes ahead anyway. Denied writes fail before the open, so no truncation.

Repro: pick `~/Desktop/notes` (with a subfolder note linking to a root note) from the folder dialog. Open the subfolder note (fails). Rename the root note: the subfolder link is not rewritten and no message appears.
Fix hint: reject vault paths outside the allowed roots in `switchVault` (or grant a recursive scope from Rust and persist it), and toast link-rewrite failures.
Known: kimi L2 covers only the asset scope. Not filed.

## rust-writes-5: propagate_type_rename partial failure is silent. CONFIRMED, minor

- [READ] A per-member read or write error is a `debug_log` + `continue` (`commands/vault.rs:356-376`). The command returns `Ok(updated)` (`:420`). The doc comment says this is intended (`:336-338`).
- [READ] `write_atomic` refuses read-only targets (`utils/fs.rs:20-23`).
- [READ] `renameType` ignores the count and shows a toast only if the call throws (`type-definitions.service.ts:226-231`).
- Refutation attempt: notes that were moved or deleted are re-keyed or removed in the index by `applyPathChange`/`forgetNote` and the watcher, so that case is a small window. The read-only member is the reachable case, and a rare one.

Repro: `chmod a-w` one member of type Project, rename the type to Initiative: there is no error, and that file still says `_type: Project`. Rust test: make one member read-only, call `propagate_type_rename_inner`, and assert the result reports it as failed.
Fix hint: return the failed paths alongside the count, and toast "N notes could not be updated" in `renameType`.
Known: not filed.
