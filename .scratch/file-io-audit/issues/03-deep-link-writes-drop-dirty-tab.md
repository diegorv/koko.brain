# 03 Append, prepend, overwrite and daily deep links drop unsaved typing in the open tab

Status: needs-triage
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o03-deep-link (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: save-pipeline-3, cross-cutting-6, feature-writers-4

**How a user hits it.** Needs an external automation (Raycast, Shortcuts, clipper) that fires kokobrain://daily or new with append, prepend or overwrite. It hits when the user typed in that note in the last 2 s (the debounced autosave), or while the note's save keeps failing. Default settings. There is no save-on-blur, and nothing flushes before the merge.

**Recoverable from.** none. CodeMirror doc replace uses addToHistory(false), so undo does not restore it. The typing was never saved, so File History has no snapshot.

**Root cause.** src/lib/app/deep-link-actions.ts:54-63 and src/lib/features/deep-link/deep-link.service.ts:257-262, 276-281, 296-298 (disk read + syncExternalContentToEditor(...,true,'none'))

**Evidence.** onContentChange -> updateContent (editor.service.ts:224-227, editor.store.svelte.ts:84-88). The deep link reads the disk copy (deep-link-actions.ts:54), writes disk+clip (:61), then syncs with markSaved=true (:63). That calls updateTabContentByPath (editor.service.ts:78-79), which sets content and savedContent (editor.store.svelte.ts:130-136). saveDirtyTabs then sees a clean tab (editor.service.ts:183-186). MarkdownEditor.svelte:311-336 replaces the doc with addToHistory false. The race-audit test (deep-link.service.race-audit.test.ts:130-160) mocks syncExternalContentToEditor and only pins the call.

**Repro test.** `.scratch/file-io-audit/repro/o03-deep-link/deep-link-dirty-buffer.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
3 failed: AssertionError: expected '# Today\n\nCLIP' to contain 'A sentence the user typed a second ago.' (daily); expected '# Inbox\n\nCLIP' to contain ... (new+append); expected 'CLIP\n# Inbox\n' to contain ... (new+prepend)
```

**Fix sketch.** When the target tab is open and dirty, merge into tab.content instead of the disk copy. Or call saveFileByPath(path) first and abort if it fails. Then write and sync.
