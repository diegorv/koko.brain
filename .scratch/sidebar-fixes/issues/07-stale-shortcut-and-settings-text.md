# 07: Palette shortcut hint follows rebinding; Settings stops naming the removed Tags panel

**What to build:** two pieces of UI text that drifted from the code.
1. The command palette shows "Cycle Sidebar View" as ⌘⇧E even after the user rebinds it in Settings. The hint shows the current binding.
2. The Settings "Sidebar" section description, and the matching settings type comment, still list "Tags", a right-sidebar panel that was removed. The text lists only panels that exist.

**Blocked by:** none

**Status:** resolved

**Source:** left sidebar UX discovery on branch `docs/ux-sidebar-discovery` (`.scratch/ux-sidebar/discovery-2026-10-31.md`, detail in `work/0N-*.md`; read it with `git show docs/ux-sidebar-discovery:<path>`). Re-verify each claim against current `main` before changing code. Findings: `work/01-shell-navigation.md` F12 and the "Sidebar" settings note under it.

- [x] Rebinding Cycle Sidebar View changes the palette hint to the new binding; the default still shows ⌘⇧E
- [x] The Settings Sidebar description no longer mentions Tags
- [x] Test for the palette hint with a custom binding

## Comments

- 2026-10-31, branch `issue/07-stale-shortcut-and-settings-text`: the palette's Cycle Sidebar View hint is a getter over `settingsStore.keybindings.cycleSidebarView` (formatter gains ⌃), so it follows a rebind while the palette is mounted; the Settings Sidebar description and `settings.types.ts` JSDoc list only Properties, Backlinks, Outgoing links, Table of Contents. Fix round: ctrl JSDoc reworded, CommandPalette component test added for the live re-render; modifier-order unification left for a follow-up. Tests: `pnpm check` 0 errors; full suite 348 files, 8428 passed, 1 todo; `pnpm build` ok. Review round 1: APPROVED (3 nits; 2 fixed, 1 rejected as out of scope).
