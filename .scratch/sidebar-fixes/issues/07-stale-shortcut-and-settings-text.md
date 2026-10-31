# 07: Palette shortcut hint follows rebinding; Settings stops naming the removed Tags panel

**What to build:** two pieces of UI text that drifted from the code.
1. The command palette shows "Cycle Sidebar View" as ⌘⇧E even after the user rebinds it in Settings. The hint shows the current binding.
2. The Settings "Sidebar" section description, and the matching settings type comment, still list "Tags", a right-sidebar panel that was removed. The text lists only panels that exist.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Source:** left sidebar UX discovery on branch `docs/ux-sidebar-discovery` (`.scratch/ux-sidebar/discovery-2026-10-31.md`, detail in `work/0N-*.md`; read it with `git show docs/ux-sidebar-discovery:<path>`). Re-verify each claim against current `main` before changing code. Findings: `work/01-shell-navigation.md` F12 and the "Sidebar" settings note under it.

- [ ] Rebinding Cycle Sidebar View changes the palette hint to the new binding; the default still shows ⌘⇧E
- [ ] The Settings Sidebar description no longer mentions Tags
- [ ] Test for the palette hint with a custom binding
