# 101: File History restores into a board view or a closed tab by path

**Origin:** `audit-2026-11-05` Issue 160, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Split from Issue 102 on 2026-11-06: the owner kept only its cheap part in the first wave. Read Issue 102 first; its Details and evidence apply here. Restore by path when the dialog file is not the active markdown tab: update a kanban, canvas or collection tab by path and save, or write the file directly when its tab is closed.

**Blocked by:** 023

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] When the dialog's tab was closed while the dialog was open (Cmd+W) but the file still exists, Restore writes the snapshot to that file directly and no other note changes. When neither the tab nor the file exists, restoreSnapshot aborts, writes nothing, and shows an error toast.
- [ ] Board views: with no editorView (a .kanban, .canvas or .collection tab in its board view, where EditorView mounts KanbanView, CanvasView or CollectionView), restoreSnapshot updates the tab content by path and saves, so the tab content equals the snapshot and the file on disk is written. It never closes the dialog as a success when nothing was applied: it throws or toasts in that case.
- [ ] Gate, frontend only: pnpm check + pnpm vitest run.

## Notes


## Comments

- 2026-11-06: split off by the owner after the first-wave challenge review (`raw/first-wave-challenge.json`).
