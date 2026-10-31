# 01: File tree operations tell the user when they fail

**What to build:** when renaming, moving, deleting, duplicating or creating an item from the file tree fails (target name already exists, I/O error), the user sees a toast saying what failed and why, instead of the row silently reverting. Renaming to an invalid name (`:`, `/`, `?`, leading `.`) tells the user the name is not allowed instead of dropping the input. This is the project rule "user-facing errors show a toast, not console only".

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Source:** left sidebar UX discovery on branch `docs/ux-sidebar-discovery` (`.scratch/ux-sidebar/discovery-2026-10-31.md`, detail in `work/0N-*.md`; read it with `git show docs/ux-sidebar-discovery:<path>`). Re-verify each claim against current `main` before changing code. Findings: `work/02-files-mode.md` F10 and its error table.

- [ ] Rename onto an existing name shows an error toast; the row keeps the old name
- [ ] Move into a folder that already holds the same name shows an error toast
- [ ] Delete, duplicate and create failures show an error toast
- [ ] An invalid rename name shows a message naming the rule; nothing is renamed
- [ ] The service layer still propagates errors to the caller (no swallowing); the component owns the toast
- [ ] Tests cover each failure path and assert the toast, not only the log call
