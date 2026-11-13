# 02: Remove the dead ⌘⌫ hint from the Move to Trash menu items

**What to build:** the "Move to Trash" item in the file tree context menu and in the Types note list context menu shows `⌘⌫`, but no keybinding implements it. The owner decided no shortcut is needed, so the hint is removed from both menus and the item works by click only, as it does today.

**Blocked by:** none

**Status:** resolved

**Source:** left sidebar UX discovery on branch `docs/ux-sidebar-discovery` (`.scratch/ux-sidebar/discovery-2026-10-31.md`, detail in `work/0N-*.md`; read it with `git show docs/ux-sidebar-discovery:<path>`). Re-verify each claim against current `main` before changing code. Findings: `work/02-files-mode.md` F6.

- [x] Neither context menu shows a shortcut next to "Move to Trash"
- [x] No other menu item shows a shortcut that is not bound (check both menus while there)
- [x] Existing context-menu tests updated; Move to Trash still works from both menus

## Comments

- 2026-10-31, branch `issue/02-remove-dead-trash-shortcut-hint`: removed the unbound `⌘⌫` hint from Move to Trash in `FileExplorer.svelte` and `TypeNoteList.svelte`; tests assert no shortcut on that item, only the bound F2 hint in both menus, and that clicking it still trashes the item. Review round 1: APPROVED (2 nits; nit 1 fixed with `toBeDefined` guards, nit 2 rejected as optional). Full suite: 346 files, 8398 passed, 1 todo; `pnpm build` passed; `pnpm check` 0 errors.
