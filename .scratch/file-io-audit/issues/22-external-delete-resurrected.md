# 22: A note deleted or renamed outside the app is recreated by the next autosave

**Status:** wontfix

**Blocked by:** none
Priority: P2
Severity: corruption
Source: file I/O audit, deep-dive group(s) o07-external-change (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity corruption)
- Claims covered: external-change-5, save-pipeline-7, calendar-2

**How a user hits it.** Default settings. git checkout, Finder, Obsidian or a sync client deletes or renames a note that is open in a tab. A dirty tab resurrects it within 2 s. A clean tab does so on the next keystroke or calendar drag. Common for git and sync users. An external folder rename instead fails with a toast and retries every 5 s, which is not silent.

**Recoverable from.** No content is lost. Post-rename edits land in the resurrected old-path file, which the user must find and merge by hand. An intended delete is undone, and a sync tool may spread the resurrected file.

**Root cause.** src/lib/core/editor/editor.service.ts:390-393 (a rejected reload read only logs at debug level and keeps the tab), plus editor.service.ts:168 (writeTextFile defaults to create:true)

**Evidence.** app-lifecycle.service.ts:480-487: the watcher batch calls only reloadExternallyChangedTabs and rebuildAllIndexes. closeTabsForDeletedPath's only caller is path-change.service.ts:125 (in-app operations). The watcher delete branch (watcher-handler.service.ts:105-108 into applyNoteChange) never touches editor tabs. The other removeTab callers handle only virtual tabs. frontmatter-write.service.ts:112-129: the tab branch uses saveFileByPath, while create:false exists only in the closed branch at :146-149. Fetched plugin-fs v2 commands.rs: default create:true.

**Limits found while trying to refute.** Downgraded from data-loss framing to P2: nothing is lost, the file is duplicated or resurrected.

**Repro test.** `.scratch/file-io-audit/repro/o07-external-change/external-delete.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
3 failed: AssertionError: expected true to be false at external-delete.test.ts:68, :79 and :90, each expect(disk.has(A)).toBe(false), for the external delete plus keystroke, the external rename plus keystroke, and the calendar write after an external delete
```

**Fix sketch.** In the watcher batch, when an open tab's read rejects as not-found: close the tab if it is clean, or mark it orphaned and suspend autosave if it is dirty, and prompt. Use writeTextFile(..., { create: false }) in saveFileByPath for tabs opened from existing files.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/99-note-deleted-renamed-outside-app-closed-marked.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
