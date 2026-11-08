# h03-search-links: deep-dive raw report

Worktree read: /Users/diegorv/Dev/pet-projects/koko/brain/.claude/worktrees/file-io-repro
Repro tests: src/tests/repro/h03-search-links/ (run: ./node_modules/.bin/vitest run src/tests/repro/h03-search-links/)

Result of the run: 3 of 3 repro assertions fail, as the claimed bugs predict. Each test asserts the correct behavior.

## Bug 1: folder rename or move drops the notes from FTS5 and semantic search until restart, vault open, or per-note save
- ids: rename-move-delete-3
- verdict: CONFIRMED_BY_TEST (folder-rename-search-index.test.ts)
- root cause: src/lib/core/filesystem/path-change.service.ts:168-170 forgets the old child paths (remove_from_search_index and remove_semantic_file via note-change.service.ts:205-220). Nothing re-adds the children under the new paths. rename_note (vault.rs:1001-1035) re-keys only the VaultIndex.
- test result: the remove_from_search_index assertion for Projects/a.md passes. The update_search_index_file assertion for Archive/Projects/a.md and b.md fails. Received: [] (no re-add).
- watcher cannot recover it (traced):
  - notify 8.2.1 fsevent.rs (fetched from github.com/notify-rs/notify main/notify/src/fsevent.rs): a directory move yields RenameMode::Any for the directory path only. The backend never enumerates descendants. Its test rename_dir expects events for only the directory paths.
  - watcher-handler.service.ts:33-36 keeps only paths whose basename contains a dot. A dotless folder yields filePaths empty, so rebuildAllIndexes returns early (lines 41-44, "directory-only changes").
  - Even if children were reported and there are more than 10 .md files, the full-rebuild branch (lines 66-75) calls rebuildIndex, buildPropertyIndex and buildFrontmatterIconIndex. None of them touch FTS or semantic. Only the incremental branch (<=10 md) calls applyNoteChange upsert with vaultPath.
  - buildSearchIndex is called only at app-lifecycle.service.ts:421 (vault open). grep finds no other caller.
- claim check: the claim's citations are accurate. Two details refine it. The anchor is the missing re-add after path-change.service.ts:153-170, not 168 alone. The semantic leg is lost in the same way.
- reachability: any folder drag, rename or move in the explorer, with default settings. Common.
- recoverable: yes, without content loss. Restart the app, save each note, or reopen the vault restores the rows.
- not verified: whether FSEvents itself ever emits child events for a moved directory. notify's source and tests imply it does not. Even if it did, the >10-note branch would still leave FTS stale.

## Bug 2: link rewrite on rename skips path-qualified, extension-qualified, self-links and unsaved new links, so they dangle
- ids: rename-move-delete-4
- verdict: CONFIRMED_BY_TEST for the path-qualified case ([[Work/Plan]]). The extension-qualified, self-link and unsaved-link cases are CONFIRMED_BY_TRACE.
- root cause: src/lib/core/filesystem/link-updater.logic.ts:27 compares the whole target `Work/Plan` (trimmed, lowercased) with the bare name `plan`, so the link is never rewritten. link-updater.service.ts:28 filters out oldPath, so the renamed note's own self-links are never rewritten. The source set comes only from the saved Rust index (service:27), so a link typed but not yet saved is never found.
- test result: replaceWikilinks('See [[Work/Plan]]', 'Plan', 'Roadmap') returns the input unchanged. resolveWikilink of the result against ['/vault/Work/Roadmap.md'] returns null. Expected: the Work/Roadmap.md path.
- resolution check: the link did point at the note. wikilink-resolution.logic.ts:24-31 falls back to the basename. The Rust by_path cache (index.rs:305-307) is keyed by the stem.
- [[Plan.md]]: the TS resolver strips the extension (getNoteName, lines 4-8), so it resolves, and replaceWikilinks does not rewrite it. The Rust side (note_name_from_target) was not read; treat it as PLAUSIBLE there.
- write failures: link-updater.service.ts:56-60 logs per-file failures and continues. There is no user-visible warning, so the dangling link is silent.
- reachability: any rename of a note that another note links to with a folder prefix, extension or self-reference. Realistic in a vault with folders. No data loss, since the rewrite never touches bytes it does not match.
- recoverable: yes. The user can edit the links by hand. Nothing is destroyed.
- priority rationale: P2 stale-state. Links silently dangle, but no note bytes are lost or changed.

## Bug 3: rename rewrites [[Old]] inside fenced code blocks, silently changing note bytes
- ids: fidelity-13 (the code-block half)
- verdict: CONFIRMED_BY_TEST (link-rewrite.test.ts, code-fence case)
- root cause: src/lib/core/filesystem/link-updater.logic.ts:23-39. replaceWikilinks runs a global regex over the whole content, with no fence or inline-code awareness. updateLinksAfterRename (link-updater.service.ts:36-47) writes the result to disk.
- test result: replaceWikilinks('```md\n[[Old Note]]\n```\n', 'Old Note', 'New Note') returns the fence with [[New Note]]. Expected: unchanged.
- the frontmatter half of fidelity-13 is REFUTED for the rename path. The claim cites properties.logic.ts:290. That line is inside parseFrontmatterProperties (computeAndCache), a read-only parse that builds a Property list. The rename path never parses or re-serializes frontmatter: link-updater.logic.ts imports only stem, and replaceWikilinks is a text regex. Key reordering would only occur in a separate frontmatter write path (frontmatter-write.service.ts), which the rename does not reach.
- reachability: a note that documents wikilink syntax inside a code fence or inline code, where the quoted name matches a note being renamed. Rare-to-uncommon, but realistic for dev and wiki notes. Happens silently on every rename.
- recoverable: partly. The pre-rename bytes are in file history if file history is enabled. The rewrite uses writeTextFile directly and calls applyNoteChange, not the after-save observers, so no new snapshot is taken for the rewritten bytes. Default enablement of file history was not verified.
- priority rationale: P1 by the scale's "silent corruption of note bytes" in a less common but realistic path. The claim's "minor" severity is too low.

## Bug 4 (new, not in the claim file): keystrokes typed during the link-rewrite write can be lost in an open backlink-source tab
- ids: none (new finding from tracing the claimed code path)
- verdict: PLAUSIBLE
- root cause: link-updater.service.ts:33-35 captures content (the tab's content for a dirty tab, or a disk read for a clean one) before any await. Then there is an await on writeTextFile (line 39). Then syncExternalContentToEditor(filePath, updatedContent, ...) at line 47 sets tab.content to updatedContent and replaces the CodeMirror doc (editor.service.ts:70-92). Keystrokes that arrived during the await went into tab.content through onContentChange (editor.service.ts:224-227), and the sync overwrites them both in the editor and on disk.
- reachability: needs typing in the affected tab within the write IPC window, a few milliseconds per file. Only the active editor tab can receive keystrokes, so the affected note must be the one being typed in right after a rename. Low.
- recoverable: CodeMirror undo may restore it, since the doc replace is a normal transaction. Not verified (MarkdownEditor external-replace annotations not read).
- priority: P3 (millisecond race, data loss only in a narrow window). Owner's top concern is data loss, so the owner may want a test before deciding.

## Items checked and not confirmed as claimed
- rename-move-delete-4, the "not saved yet" case: CONFIRMED_BY_TRACE as part of bug 2. The source set comes from the saved index only.
- fidelity-13, frontmatter key reorder: REFUTED for the rename path (see bug 3).

## Not checked
- Rust resolution of [[Plan.md]] (note_name_from_target in index.rs) was not read.
- Whether file history is enabled by default.
- Whether CodeMirror undo recovers the bug 4 keystrokes.
- No cargo or build was run. The worktree source was not edited.
