# 98: An external change to an open note is never overwritten by the next autosave or calendar write

**Migrated from:** `.scratch/file-io-audit/issues/08-external-change-overwritten.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). Data loss that cannot be recovered, but it needs another editor to write while the tab is dirty, a 2 s window. The fix changes the pinned 'editor always wins' test.

**Audit check at `5f8003d67`:** still_present (content, low). src/lib/core/editor/editor.service.ts:187-198 writeTab writes tab.content with writeTextFile(path, content) and no disk/mtime precondition; :428 reloadExternallyChangedTabs skips dirty tabs before any read; src/lib/core/frontmatter/frontmatter-write.service.ts:116-132 tab branch rebuilds from tab.content then saveFileByPath. No conflict handling added since c4bfee07. Owner has no sync tool, so only an occasional external editor while the tab is dirty triggers it.

**Stale in the text below:** Line refs moved: saveFileByPath write is now writeTab editor.service.ts:194 (saveFileByPath :171-179 is now a per-path queue); dirty skip :428 (was :380); reload equality check :446 (was :398); frontmatter tab branch :116-141 (was :112-129).

**Owner decision (2026-11-06):** (a): before writing, keep the external version as a File History snapshot or conflict copy, then save the typing and show a toast. The test 'skips dirty tabs, editor always wins' changes with it.

**Status:** ready-for-agent

**Blocked by:** none
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o07-external-change (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: external-change-1, save-pipeline-8, calendar-1

**How a user hits it.** Default settings. The user is typing in note N (dirty for 2 s after each keystroke, or longer while a save is failing) when a sync client, git pull or second editor rewrites N. Realistic for synced or multi-tool vaults, not daily. calendar-1 variant: a drag within about 1 s of the external write to an open clean tab, which is rare.

**Recoverable from.** Nothing in the app: undo never held the external text, File History snapshots only app-written content, and the watcher path never snapshots. Only external sources help: git history, or a sync service's version history if it keeps one.

**Root cause.** src/lib/core/editor/editor.service.ts:168 (saveFileByPath writes with no disk/mtime precondition), combined with editor.service.ts:380 (a dirty tab skips the reload) and frontmatter-write.service.ts:112-129 (the tab branch writes from the stale tab.content)

**Evidence.** editor.service.ts:375-382: a dirty tab is skipped before any read. :161-178: writeTextFile(path, content) with no options. Fetched plugins-workspace v2 plugins/fs/src/commands.rs write_file_inner: options None means create:true, truncate:true. file-history.service.ts:190-196: snapshots only from the after-save observer. No conflict/mtime handling in core/editor, core/filesystem or app/. Latency: watcher.rs:186-229 (500 ms), the fs.watcher.ts:122-186 tree rescan, the 300 ms debounce at app-lifecycle.service.ts:480-498. The calendar tab branch, frontmatter-write.service.ts:110-129, writes via saveFileByPath. The later reload is skipped because disk===savedContent (editor.service.ts:398).

**Limits found while trying to refute.** Not refuted. The skip is a documented design choice pinned by editor.service.test.ts ('skips dirty tabs, editor always wins'), but no guard, setting or snapshot keeps the external version.

**Repro test.** `.scratch/file-io-audit/repro/o07-external-change/external-change-overwrite.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
× external-change-1 / save-pipeline-8 ... AssertionError: expected false to be true at external-change-overwrite.test.ts:75 expect(externalVersionSurvives()).toBe(true); × calendar-1 ... AssertionError: expected false to be true at :91
```

**Fix sketch.** Track a disk baseline (hash of savedContent or mtime). Before any tab write, stat or read the file. If it differs from savedContent, keep the external bytes (conflict copy or File History snapshot) before writing, and toast. The pinned 'editor always wins' test changes to the new contract (owner decision 2026-11-06).

## Acceptance criteria

Written by audit 2026-11-05 from the text above and its audit header; the original Issue had none.

- [ ] Failing test first, in src/tests/lib/core/editor/editor.service.test.ts (saveFileByPath describe, real editorStore): a dirty tab with savedContent 'base' and content 'base plus mine', while readTextFile for the path resolves 'base plus external'. After saveFileByPath(path), the external text is kept (a File History snapshot or a conflict copy holding 'base plus external' was created before the write) and writeTextFile then writes the tab content. It fails today (the external bytes are overwritten with no read and no copy).
- [ ] When the disk content equals the tab's savedContent, saveFileByPath saves as before: no conflict copy, no snapshot of external bytes, no toast.
- [ ] When a conflict is detected the user sees a toast that names the note and says the external version was kept.
- [ ] The calendar path (frontmatter-write.service.ts tab branch, which saves through saveFileByPath) gets the same protection, tested in src/tests/lib/core/frontmatter/frontmatter-write.service.test.ts: a calendar write to an open tab whose file changed on disk keeps the external version before writing.
- [ ] The disk baseline is refreshed after each successful write and after each reload, so a normal second autosave of the same tab does not report a conflict.
- [ ] The existing test 'skips dirty tabs, editor always wins' (editor.service.test.ts, reloadExternallyChangedTabs describe) changes to the new contract, approved by the owner on 2026-11-06, and the commit message says so.
- [ ] Gate, frontend only: pnpm check + pnpm vitest run.

## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/08-external-change-overwritten.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: owner decision recorded from the 2026-11-06 survey; status ready-for-agent.
