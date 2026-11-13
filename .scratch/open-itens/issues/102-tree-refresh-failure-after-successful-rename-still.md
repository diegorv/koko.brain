# 102: A tree refresh failure after a successful rename still reports it as done

**Origin:** `audit-2026-11-05` Issue 162, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Split from Issue 126 on 2026-11-06: the owner kept only its cheap part in the first wave. Read Issue 126 first; its Details and evidence apply here. applyPathChange resolves after a successful disk op even when refreshTree fails, and renameAndWrite keeps its catch for the cases that still reject.

**Blocked by:** 080

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, same file: the moved node is not in the tree (movedNode null) and loadDirectoryTree rejects at the refreshTree call (path-change.service.ts:201). Assert rename_note is still invoked and the change is not reported as failed after the disk rename succeeded.
- [ ] renameAndWrite (event-calendar.service.ts:715-735) keeps its catch. Once applyPathChange no longer rejects after a successful diskOp, renameItem rejects only for a taken name or a failed disk rename, which is what the 'may already exist' message covers. One case in src/tests/lib/features/event-calendar/event-calendar.service.test.ts runs the real renameItem (vi.importActual) with get_backlinks_v2 rejecting and checks that writeEvent resolves to the new path with the stores remapped and the fields written.
- [ ] Gate, frontend only: pnpm check + pnpm vitest run.

## Notes


## Comments

- 2026-11-06: split off by the owner after the first-wave challenge review (`raw/first-wave-challenge.json`).
