# 99: A note deleted or renamed outside the app is closed or marked orphaned, never recreated by the next autosave

**Migrated from:** `.scratch/file-io-audit/issues/22-external-delete-resurrected.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). No bytes are lost, and it needs an external rename or delete of an open note followed by typing in it.

**Audit check at `5f8003d67`:** still_present (content, low). src/lib/core/editor/editor.service.ts:439-441 a rejected reload read logs at debug and keeps the tab; :194 writeTextFile(path, content) with default create:true; the watcher batch (app-lifecycle.service.ts:491-492) never closes or orphans tabs; closeTabsForDeletedPath is called only from path-change.service.ts:159 (in-app ops).

**Stale in the text below:** Rejected-read branch now editor.service.ts:439-441 (was :390-393); write at :194 (was :168); closeTabsForDeletedPath caller path-change.service.ts:159 (was :125); app-lifecycle batch :491-492 (was :480-487).

**Status:** ready-for-agent

**First wave:** yes, added by the owner on 2026-11-06 after the order review (`raw/first-wave-order-review.json`): the critic found it critical for agent edits: a rename or delete outside the app is undone by the next keystroke.

**Blocked by:** 98
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

## Acceptance criteria

Written by audit 2026-11-05 from the text above and its audit header; the original Issue had none.

- [ ] Failing test first, in src/tests/lib/core/editor/editor.service.test.ts (reloadExternallyChangedTabs describe, real editorStore): a clean tab for '/vault/a.md', readTextFile rejecting with a not-found error, reloadExternallyChangedTabs(['/vault/a.md']) leaves no tab for that path in editorStore.tabs. It fails today (the tab is kept and the next keystroke or calendar write recreates the file). The repro .scratch/file-io-audit/repro/o07-external-change/external-delete.test.ts is moved under src/tests as the matching red cases.
- [ ] A dirty tab hit by the same not-found read stays open with its typed content, is marked orphaned, and autosave is suspended for it: after onContentChange and the autosave timer firing, writeTextFile is not called for that path and the path does not appear on disk. The user sees a prompt or toast saying the file was deleted or moved outside the app.
- [ ] saveFileByPath (writeTab) writes with { create: false } for tabs opened from existing files, so a save after an external delete or rename rejects and does not recreate the old path. Existing saveFileByPath cases that assert the writeTextFile arguments are updated for the options argument. The three repro scenarios (external delete plus keystroke, external rename plus keystroke, calendar write after an external delete) end with the old path absent from disk.
- [ ] The calendar tab branch in src/tests/lib/core/frontmatter/frontmatter-write.service.test.ts: a write to an open tab whose file was deleted outside the app does not recreate it.
- [ ] A read that rejects for another reason than not-found (for example a permission error) keeps today's behavior: the tab is kept and the failure is logged at debug level.
- [ ] Gate, frontend only: pnpm check + pnpm vitest run.

## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/22-external-delete-resurrected.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: Blocked by 98 added after the order review (`raw/first-wave-order-review.json`): the two edit the same code.
- 2026-11-06: added to the first wave after the order review.
