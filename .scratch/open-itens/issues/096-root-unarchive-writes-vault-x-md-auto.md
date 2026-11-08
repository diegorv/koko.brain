# 096: Root unarchive writes vault/x.md, auto-move refuses .. segments, and a case or NFC variant of a path reuses the open tab

**Origin:** `audit-2026-11-05` Issue 109, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/file-io-audit/issues/36-path-normalization.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). Its canvas double-prefix section is covered by Issue 17. The rest needs Auto Move (opt-in) or a folder-case mismatch.

**Audit check at `5f8003d67`:** still_present (content, medium). (1) Root unarchive: resolveDestination (src/lib/features/auto-move/auto-move.logic.ts:102-130) can return ''. auto-move.service.ts:175 builds `${vaultPath}/${resolvedDest}`, and moveItem (src/lib/core/filesystem/fs.service.ts:309) builds `${targetDirPath}/${fileName}`, giving '<vault>//x.md'. Opt-in through autoMove. (2) Canvas: CanvasFilePicker.svelte:20-23,61 passes flattenFileTree's node.path (absolute, src/lib/core/filesystem/file-entries.logic.ts:21). CanvasInner.svelte:481-495 (picker) and :561-576 (drop) store it unchanged through createFileNode and createImageNode. FileNode.svelte:40 and canvas-image.service.ts:34 then prefix vaultStore.path again, so readTextFile and readFile get '/vault//vault/…' and the preview fails. canvas.types.ts:48 and :73 document the path as vault-relative. This is normal canvas use, and the owner uses canvas daily. (3) No '..' rejection in resolveDestination (only slash collapsing, :129). ensure_safe_write_path (src-tauri/src/commands/vault.rs:958-970) does not cover the TS plugin-fs mkdir and rename. Opt-in, imported data only. (4) findTabIndex (src/lib/core/editor/editor.logic.ts:40-42) uses exact string equality, called from openFileInEditor at editor.service.ts:115 and :129. buildPeriodicNotePath (src/lib/plugins/periodic-notes/periodic-notes.logic.ts:10-22) joins the configured folder as typed. No case or NFC canonicalization exists anywhere.

**Stale in the text below:** Line refs drifted: moveItem's join is fs.service.ts:309 (Issue says :51), destPath is auto-move.service.ts:175 (Issue says :173), ensure_safe_write_path is vault.rs:958-970 (Issue says :862-874), findTabIndex is editor.logic.ts:40-42 and openFileInEditor's lookups are editor.service.ts:115 and :129 (Issue says :39-41, :114 and :128), and the canvas drop and picker are CanvasInner.svelte:481-495 and :561-576 (Issue says :465-480 and :559). The Issue bundles four unrelated root causes. The canvas double prefix is the only daily-use hit for this owner and could be split into its own Issue and fixed first. Sections 1 and 3 need opt-in autoMove. The case-variant section needs the configured folder's case to differ from the disk. The Issue itself notes that the original three sections still have no acceptance criteria.

**Status:** ready-for-agent

**Blocked by:** none
Priority: P2
Severity: stale-state
Source: file I/O audit, deep-dive group(s) h07-paths-canvas-automove (raw reports in .scratch/archived/file-io-audit/deep/raw/), verified at c4bfee07

## Unarchive to a vault-root note writes non-canonical 'vault//x.md' into the tab and Rust index

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity stale-state)
- Claims covered: feature-writers-8

**How a user hits it.** Opt-in only: autoMove.enabled defaults to false (settings.store.svelte.ts:102-105), and the type needs a _archive_to of the form {folder}/<segment> (type-definitions.logic.ts:114, type-lifecycle-rules.ts:36-55). Then a root-level member is archived and unarchived. Not on default settings.

**Recoverable from.** Note bytes stay on disk at the correct location (POSIX collapses '//'). The stale tab path and Rust index key persist until restart; ghost file or resurrected note can be removed by hand. No content lost by itself.

**Root cause.** src/lib/core/filesystem/fs.service.ts:51 (newPath = `${targetDirPath}/${fileName}`) fed by src/lib/features/auto-move/auto-move.service.ts:173 (destPath = `${vaultPath}/${resolvedDest}` with resolvedDest '' for {parent} at root, auto-move.logic.ts:115,129).

**Evidence.** Trace: resolveDestination returns '' for '<vault>/_archive/x.md' (logic:115,129); destPath '/vault/' (service:173); moveItem -> '/vault//x.md' (fs.service:51); updateTabAfterRenameOrMove exact match (link-updater.service.ts:76-79); closeTabsForDeletedPath exact match (editor.service.ts:360); saveFileByPath writes tab.path (editor.service.ts:161-170); findTabIndex exact (editor.service.ts:114); rename_note_inner exact-string keys (commands/vault.rs:1001-1019). Repro src/tests/repro/h07-paths-canvas-automove/unarchive-root-path.test.ts FAILED: expected '/vault//x.md' to be '/vault/x.md'; rename called with '/vault//x.md'. Duplicate Rust index entry via watcher: PLAUSIBLE, watcher path not traced.

**Repro test.** `.scratch/archived/file-io-audit/repro/src/tests/repro/h07-paths-canvas-automove/unarchive-root-path.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

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

**Repro test.** `.scratch/archived/file-io-audit/repro/src/tests/repro/h07-paths-canvas-automove/canvas-picked-file-path.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

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

**Repro test.** `.scratch/archived/file-io-audit/repro/src/tests/repro/h07-paths-canvas-automove/auto-move-dotdot-destination.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
1 failed: AssertionError: expected [ 'Tasks', '..', '..', 'Other' ] to not include '..'
```

## A case or NFC/NFD variant of a note path opens a second tab, and the stale tab overwrites the other

- Verdict: CONFIRMED_BY_TRACE (editor-data-safety audit finding G3, priority P1, likelihood rare, severity data-loss)
- Claims covered: none in the file I/O audit (raw/scout-rename-edges.md L12 and raw/review-external-change.md:149 list the NFC/NFD case as unverified)

**How a user hits it.** The vault has the folder 'Journal/' (made in Finder or by Obsidian) and the Periodic Notes base folder is set to 'journal'. The Daily button builds '<vault>/journal/2026-11-02.md'; exists() is true on the default case-insensitive APFS volume, so openOrCreateNote opens tab A under the lowercase path. Opening the same note from the file tree, a backlink or [[2026-11-02]] gives the on-disk path '<vault>/Journal/2026-11-02.md', and findTabIndex compares exact strings, so it opens tab B. The user types in B and B autosaves. Back in A (the Daily button always activates A), one keystroke makes A autosave its whole stale buffer over B's saved edits. If B is clean, the watcher then reloads B with A's bytes, so the text is gone from both tabs. A typed deep link (kokobrain://open?vault=v&file=inbox/todo for Inbox/Todo.md) opens the same kind of duplicate tab. An NFC-typed wikilink to an NFD-named file may too: the resolver finds nothing, and the create path's exists() returns true if the volume is normalization-insensitive (OS behavior, not verified here).

**Recoverable from.** Via git or sync-client history, or from File History if it took a snapshot of B's saved text (snapshot timing not checked here; issue 23 notes File History is keyed by path, so the two spellings may hold separate histories). The editor's undo does not help: A never held B's edits.

**Root cause.** src/lib/core/editor/editor.logic.ts:39-41 findTabIndex matches `t.path === path`, used by openFileInEditor at src/lib/core/editor/editor.service.ts:114 and :128. No caller canonicalizes the path first: buildPeriodicNotePath (src/lib/plugins/periodic-notes/periodic-notes.logic.ts:10-22) joins the configured folder as typed (saved raw on every keystroke, src/lib/core/settings/sections/PeriodicNotesSection.svelte:26-30); openOrCreateNote checks exists() and passes the same string to openFileInEditor (src/lib/core/note-creator/note-creator.service.ts:86-88, :128); the deep-link open action uses resolveFilePath (src/lib/utils/path.ts:33-53), which normalizes '..' and '.' but not case or Unicode form. The watcher reports the on-disk spelling, and reloadExternallyChangedTabs matches it exactly (editor.service.ts:379-385), so it never reloads A and does reload B.

**Fix sketch.** Canonicalize at open time, below the vault root only. Add a Rust command (e.g. `resolve_real_path(vault, path)`) that keeps the `vaultStore.path` prefix byte for byte and rebuilds each later component from a `read_dir` match of its parent (case-insensitive, NFC/NFD-insensitive), returning nothing when the path does not exist. Do NOT use std::fs::canonicalize: it also resolves symlinks and firmlinks, so a vault opened through a symlinked folder (e.g. ~/Dropbox -> ~/Library/CloudStorage/Dropbox) would get tab paths that no longer start with `vaultStore.path`, which breaks tree, backlink and watcher matching, makes `vaultRelativeKey` return null (FTS5 and semantic updates skipped) and can leave the fs and asset scopes. Call it in openFileInEditor before findTabIndex (openOrCreateNote opens through it), and keep the input path when it returns nothing. Optionally, normalize the Periodic Notes folder against the tree's case when the setting is saved. The same canonicalization collapses the 'vault//x.md' tab path of the first section, so it also closes that section's second-tab effect.

These criteria cover only the editor-data-safety amendment (2026-11-02). Triage must add criteria for the original sections above before this Issue runs; each section's repro test is its red test.

- [ ] Failing test comes first: opening '<vault>/journal/x.md' while the disk has 'Journal/x.md' and a tab for '<vault>/Journal/x.md' is open activates the existing tab and adds no second one
- [ ] The Daily button with the folder set to 'journal' and 'Journal/' on disk opens a tab whose path is the on-disk spelling '<vault>/Journal/<date>.md'
- [ ] A deep link open?file=inbox/todo for Inbox/Todo.md activates or opens the tab under '<vault>/Inbox/Todo.md'
- [ ] A Rust test, gated with `#[cfg(target_os = "macos")]` (default case-insensitive volume), shows the resolve command returns the stored case for a case-variant path, and nothing for a path that does not exist
- [ ] With the vault opened through a symlinked parent folder, an opened note's tab path still starts with `vaultStore.path` (the symlink is not resolved)

## Audit evidence (editor-data-safety, 2026-11-02)

- Finding G3 (P1, rare): "A case (or NFC/NFD) variant of a note's path opens a second editable tab on the same file. That tab never receives watcher reloads, and its next autosave overwrites the other tab's saved edits". It lands in the section "A case or NFC/NFD variant of a note path opens a second tab, and the stale tab overwrites the other" above.
- No repro test exists for it under .scratch/archived/editor-data-safety/repro/ (the case-insensitive repro there, fs-trash-deeplink/f43-duplicate-case-insensitive.test.ts, belongs to issue 19); the evidence is a code trace.
- src/lib/core/editor/editor.logic.ts:39-41: `return tabs.findIndex((t) => t.path === path);`.
- src/lib/core/editor/editor.service.ts:114 and :128: openFileInEditor looks up the tab with findTabIndex on the path as given, then reads and adds a tab under that path (:124, :140).
- src/lib/core/editor/editor.service.ts:161-168: saveFileByPath writes `tab.content` to `tab.path` with no check of the disk content.
- src/lib/core/editor/editor.service.ts:379-385: reloadExternallyChangedTabs matches watcher paths to tabs by exact string.
- src/lib/plugins/periodic-notes/periodic-notes.logic.ts:10-22 and src/lib/plugins/periodic-notes/periodic-notes.service.ts:36-43: the periodic path joins `settings.folder` as configured and passes it to openOrCreateNote.
- src/lib/core/note-creator/note-creator.service.ts:86-88 and :128: exists() on the given spelling, then openFileInEditor with the same string.
- src/lib/features/deep-link/deep-link.service.ts:178-184 and src/lib/utils/path.ts:33-53: the open action resolves the typed path without case or Unicode normalization.
- src/lib/core/filesystem/wikilink-resolution.logic.ts:11-35: wikilinks resolve case-insensitively (toLowerCase) to the on-disk path from the tree, so [[2026-11-02]] opens tab B; there is no Unicode normalization, so an NFC target does not match an NFD name.

## Comments

- 2026-11-06: migrated from `.scratch/archived/file-io-audit/issues/36-path-normalization.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
