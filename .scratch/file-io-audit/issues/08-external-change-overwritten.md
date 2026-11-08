# 08: An external change to an open note is overwritten by the next autosave or calendar write

**Status:** wontfix

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

**Fix sketch.** Track a disk baseline (hash of savedContent or mtime). Before any tab write, stat or read the file. If it differs from savedContent, keep the external bytes (conflict copy or File History snapshot) before writing, and toast. Changing the pinned 'editor always wins' test needs owner approval.

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/017-external-change-open-note-never-overwritten-next.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
