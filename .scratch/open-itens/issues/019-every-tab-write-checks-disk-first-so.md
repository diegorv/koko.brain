# 019: Every tab write checks the disk first, so an external change is never overwritten without a copy

**Origin:** `audit-2026-11-05` Issue 153, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Split from Issue 98 on 2026-11-06: the owner kept only its cheap part in the first wave. Read Issue 98 first; its Details and evidence apply here. The read-before-write part: before writeTab writes, compare the disk with the tab baseline; on a difference keep the external bytes (File History snapshot or conflict copy), then save and toast. This is the hot save path, so it lands after the first wave and after Issue 13.

**Blocked by:** 017

**Status:** ready-for-agent

**First wave:** yes, added by the owner on 2026-11-06 after the order review (`raw/first-wave-order-review.json`): the go/no-go reviewer: with agents writing the vault, an autosave that fires before the watcher event still overwrites their write.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/core/editor/editor.service.test.ts (saveFileByPath describe, real editorStore): a dirty tab with savedContent 'base' and content 'base plus mine', while readTextFile for the path resolves 'base plus external'. After saveFileByPath(path), the external text is kept (a File History snapshot or a conflict copy holding 'base plus external' was created before the write) and writeTextFile then writes the tab content. It fails today (the external bytes are overwritten with no read and no copy).
- [ ] When the disk content equals the tab's savedContent, saveFileByPath saves as before: no conflict copy, no snapshot of external bytes, no toast.
- [ ] When a conflict is detected the user sees a toast that names the note and says the external version was kept.
- [ ] The calendar path (frontmatter-write.service.ts tab branch, which saves through saveFileByPath) gets the same protection, tested in src/tests/lib/core/frontmatter/frontmatter-write.service.test.ts: a calendar write to an open tab whose file changed on disk keeps the external version before writing.
- [ ] The disk baseline is refreshed after each successful write and after each reload, so a normal second autosave of the same tab does not report a conflict.
- [ ] The existing test 'skips dirty tabs, editor always wins' (editor.service.test.ts, reloadExternallyChangedTabs describe) changes to the new contract, approved by the owner on 2026-11-06, and the commit message says so.
- [ ] Gate, frontend only: pnpm check + pnpm vitest run.

## Notes

- Owner decision on 98 (a) applies: keep both, save the typing, toast.

## Comments

- 2026-11-06: split off by the owner after the first-wave challenge review (`raw/first-wave-challenge.json`).
- 2026-11-06: added to the first wave after the order review.
