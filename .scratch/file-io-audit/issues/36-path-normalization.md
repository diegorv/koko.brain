# 36 Root unarchive writes vault//x.md, canvas double-prefixes picked paths, auto-move accepts ..

Status: needs-triage
Priority: P2
Severity: stale-state
Source: file I/O audit, deep-dive group(s) h07-paths-canvas-automove (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Unarchive to a vault-root note writes non-canonical 'vault//x.md' into the tab and Rust index

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity stale-state)
- Claims covered: feature-writers-8

**How a user hits it.** Opt-in only: autoMove.enabled defaults to false (settings.store.svelte.ts:102-105), and the type needs a _archive_to of the form {folder}/<segment> (type-definitions.logic.ts:114, type-lifecycle-rules.ts:36-55). Then a root-level member is archived and unarchived. Not on default settings.

**Recoverable from.** Note bytes stay on disk at the correct location (POSIX collapses '//'). The stale tab path and Rust index key persist until restart; ghost file or resurrected note can be removed by hand. No content lost by itself.

**Root cause.** src/lib/core/filesystem/fs.service.ts:51 (newPath = `${targetDirPath}/${fileName}`) fed by src/lib/features/auto-move/auto-move.service.ts:173 (destPath = `${vaultPath}/${resolvedDest}` with resolvedDest '' for {parent} at root, auto-move.logic.ts:115,129).

**Evidence.** Trace: resolveDestination returns '' for '<vault>/_archive/x.md' (logic:115,129); destPath '/vault/' (service:173); moveItem -> '/vault//x.md' (fs.service:51); updateTabAfterRenameOrMove exact match (link-updater.service.ts:76-79); closeTabsForDeletedPath exact match (editor.service.ts:360); saveFileByPath writes tab.path (editor.service.ts:161-170); findTabIndex exact (editor.service.ts:114); rename_note_inner exact-string keys (commands/vault.rs:1001-1019). Repro src/tests/repro/h07-paths-canvas-automove/unarchive-root-path.test.ts FAILED: expected '/vault//x.md' to be '/vault/x.md'; rename called with '/vault//x.md'. Duplicate Rust index entry via watcher: PLAUSIBLE, watcher path not traced.

**Repro test.** `.scratch/file-io-audit/repro/src/tests/repro/h07-paths-canvas-automove/unarchive-root-path.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
2 failed: AssertionError: expected '/vault//x.md' to be '/vault/x.md' // rename called with ['/vault/_archive/x.md', '/vault//x.md']
```

## Canvas file and image nodes from picker or drop double-prefix the vault path

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity minor)
- Claims covered: feature-writers-11

**How a user hits it.** Normal use: any file or image node added through CanvasFilePicker or drag-and-drop (canvas is always loaded). Preview shows 'Could not load file' or a broken image. Clicking the header still opens the note (FileNode.svelte:56).

**Recoverable from.** No note content lost. Absolute paths stored in the .canvas JSON (canvas.logic.ts:353-355) break portability if the vault folder moves; fixable by editing the JSON.

**Root cause.** src/lib/features/canvas/FileNode.svelte:40-41 and src/lib/features/canvas/canvas-image.service.ts:34 prefix vaultStore.path to a path that the picker/drop already supplies absolute (CanvasFilePicker.svelte:61 via file-entries.logic.ts:21; CanvasInner.svelte:465-480 and :559). Contract in canvas.types.ts:48,75 says vault-relative.

**Evidence.** Rust FileNode.path is 'Absolute path on disk' (src-tauri/src/commands/vault.rs:56-60). resolveImageSrc builds `${vaultPath}/${filePath}` (canvas-image.service.ts:34). Repro chains real flattenFileTree and resolveImageSrc: readFile called with '/vault//vault/assets/pic.png', expected '/vault/assets/pic.png'.

**Repro test.** `.scratch/file-io-audit/repro/src/tests/repro/h07-paths-canvas-automove/canvas-picked-file-path.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
1 failed: expected readFile to be called with ['/vault/assets/pic.png'], received ['/vault//vault/assets/pic.png']
```

## Auto-move destination from frontmatter is not checked for '..' segments

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity security)
- Claims covered: rename-move-delete-9

**How a user hits it.** Opt-in: autoMove.enabled defaults to false. Needs a frontmatter value containing '../' that a rule destination uses ({status}/{type}). Realistic mainly for imported or shared vaults or deliberate input; not default-settings.

**Recoverable from.** Note bytes preserved by rename; the note leaves the app tree and sits at the escaped location on disk; move it back by hand. mkdir(recursive) can also create directories outside the scope.

**Root cause.** src/lib/features/auto-move/auto-move.logic.ts:102-130 (resolveDestination: only slash cleanup at :129, no '..' rejection) used by src/lib/features/auto-move/auto-move.service.ts:172-188 (exists/mkdir/moveItem). The Rust side rejects '..' (src-tauri/src/commands/vault.rs:862-874 ensure_safe_write_path) but the TS plugin-fs path has no equivalent.

**Evidence.** Repro: resolveDestination('Tasks/{status}') with status '../../Other' returns 'Tasks/../../Other'. Scope leg (fetched tauri crates/tauri/src/scope/fs.rs): non-existent paths are not lexically normalized and are matched raw against globs, so '$DOCUMENT/kokobrain-vaults/**' prefix-matches '..' paths; escape is bounded only by OS permissions (beyond kokobrain-vaults is PLAUSIBLE; within it CONFIRMED_BY_TRACE).

**Repro test.** `.scratch/file-io-audit/repro/src/tests/repro/h07-paths-canvas-automove/auto-move-dotdot-destination.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
1 failed: AssertionError: expected [ 'Tasks', '..', '..', 'Other' ] to not include '..'
```
