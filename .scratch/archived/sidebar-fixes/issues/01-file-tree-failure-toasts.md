# 01: File tree operations tell the user when they fail

**What to build:** when renaming, moving, deleting, duplicating or creating an item from the file tree fails (target name already exists, I/O error), the user sees a toast saying what failed and why, instead of the row silently reverting. Renaming to an invalid name (`:`, `/`, `?`, leading `.`) tells the user the name is not allowed instead of dropping the input. This is the project rule "user-facing errors show a toast, not console only".

**Blocked by:** none

**Status:** resolved

**Source:** left sidebar UX discovery on branch `docs/ux-sidebar-discovery` (`.scratch/ux-sidebar/discovery-2026-10-31.md`, detail in `work/0N-*.md`; read it with `git show docs/ux-sidebar-discovery:<path>`). Re-verify each claim against current `main` before changing code. Findings: `work/02-files-mode.md` F10 and its error table.

- [x] Rename onto an existing name shows an error toast; the row keeps the old name
- [x] Move into a folder that already holds the same name shows an error toast
- [x] Delete, duplicate and create failures show an error toast
- [x] An invalid rename name shows a message naming the rule; nothing is renamed
- [x] The service layer still propagates errors to the caller (no swallowing); the component owns the toast
- [x] Tests cover each failure path and assert the toast, not only the log call

## Comments

- 2026-10-31, branch `issue/01-file-tree-failure-toasts`: file operations in `fs.service` now propagate failures; FileTreeItem, FileExplorer and TypeNoteList toast failed rename, move, delete, duplicate and create with the reason; `getFileNameError` names the broken name rule; an inline rename commits once when blur follows Enter; the trash toast reads `Could not move "a.md" to the Trash: ...`. Tests: `pnpm vitest run` 346 files, 8393 passed, 1 todo; `pnpm build` ok; `pnpm check` 0 errors. Reviews: round 1 CHANGES_REQUESTED (fixed), round 2 APPROVED (pending-creation Enter + blur test added for its nit).
