# 02: Remove the dead ⌘⌫ hint from the Move to Trash menu items

**What to build:** the "Move to Trash" item in the file tree context menu and in the Types note list context menu shows `⌘⌫`, but no keybinding implements it. The owner decided no shortcut is needed, so the hint is removed from both menus and the item works by click only, as it does today.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Source:** left sidebar UX discovery on branch `docs/ux-sidebar-discovery` (`.scratch/ux-sidebar/discovery-2026-10-31.md`, detail in `work/0N-*.md`; read it with `git show docs/ux-sidebar-discovery:<path>`). Re-verify each claim against current `main` before changing code. Findings: `work/02-files-mode.md` F6.

- [ ] Neither context menu shows a shortcut next to "Move to Trash"
- [ ] No other menu item shows a shortcut that is not bound (check both menus while there)
- [ ] Existing context-menu tests updated; Move to Trash still works from both menus
