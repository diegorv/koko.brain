# 11: The rail shell remembers the active rail item

**What to build:** The active rail item (Inbox, Favorites or Archive at this point) is saved in layout settings and restored after a restart. A saved item that is unknown falls back to the default item (Inbox until the Today lens ships). The lens tickets that follow extend this with their own target (type, view, folder, day), each with its own fallback.

**Blocked by:** 07

**Status:** resolved

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Persistence, decision Q20.

- [x] Settings round-trip test: the saved rail item survives a reload
- [x] Logic test first: an unknown saved item falls back to the default item
- [x] Old settings without the new key load without errors
- [x] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [x] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme

## Comments

- 2026-11-01, branch `issue/11-rail-shell-remembers-rail-item`: the active rail item is saved as `layout.railItem` and restored through `restoreRailItem` in `lens.logic.ts` (unknown, empty or non-string values fall back to Inbox); AppShell derives the item and lens from settings instead of local state. Review fixes: `Rail.svelte` no longer carries a second key-to-lens map (`onSelect` takes only the key, a Rail test checks every rendered key restores to itself), and the `railItem` JSDoc says the value is unvalidated. Tests: `pnpm check` 0 errors; full suite 364 files, 8751 passed, 1 todo, `pnpm build` ok. Review round 1: APPROVED (1 minor, 1 nit, both fixed).
