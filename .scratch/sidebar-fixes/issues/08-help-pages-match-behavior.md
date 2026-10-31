# 08: Help pages describe the file tree, calendar dots and view sorting as they work

**What to build:** the in-app help pages stop promising behavior the app does not have.
- File explorer page: the header element count, palette "New File" (creates at the vault root, not the selected folder), the folder row click target (the whole row), and the bookmarks quick-access section (bookmarks are never listed), plus the natural sort from ticket 06.
- Periodic notes and calendar page: the sidebar dots mean files created on that day, not "days that have a daily note".
- Types page: view sorting as fixed by ticket 03.

**Blocked by:** 03, 06

**Status:** resolved

**Source:** left sidebar UX discovery on branch `docs/ux-sidebar-discovery` (`.scratch/ux-sidebar/discovery-2026-10-31.md`, detail in `work/0N-*.md`; read it with `git show docs/ux-sidebar-discovery:<path>`). Re-verify each claim against current `main` before changing code. Findings: `work/02-files-mode.md` F17, `work/04-calendar-mode.md` F2, `work/03-types-mode.md` F7.

- [x] Each statement listed above matches the current code; the commit names the line each claim was checked against
- [x] No new promises about planned redesign work
- [x] Any test that reads the help pages still passes

## Comments

- 2026-10-31, branch `issue/08-help-pages-match-behavior`: help pages corrected against current code (file explorer header, palette creation at vault root, natural sort, whole-row folder click, bookmarks not listed; calendar dots mean notes created that day; Types view sorting re-verified unchanged). Fix round after review: dropped "default" from the File Explorer sidebar mode bullet and made the folder note click conditional. Review round 1: APPROVED (two findings, both fixed). Tests: `pnpm check` exit 0; full suite 348 files, 8428 passed, 1 todo; `pnpm build` ok.
