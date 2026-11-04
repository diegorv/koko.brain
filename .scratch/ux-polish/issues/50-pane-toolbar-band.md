# 50: Second-row toolbars share one height and divider, and only the first pane keeps the traffic-light inset

**What to build:** The second-row headers step by 4px and use two divider colors: the note action bar is `h-9 border-border`, PropertiesView `h-10`, the calendar header about 56px, Tasks and Kanban size to content. Add one `pane-toolbar` utility in `src/app.css` (`h-10 px-3 gap-1` plus a `--divider` bottom edge) and use it on the note action bar, collection toolbar, tags, tasks, kanban, event calendar header and properties header. Add the missing divider on the empty-editor strip (`EditorView.svelte`, about line 147). Separately, `RailNoteList.svelte` (about line 416) and `SearchPanel.svelte` (about line 68) always add the `pl-6` traffic-light inset; apply it only to the first pane after the rail (a prop or `data-first-pane`).

**Blocked by:** None (can start immediately)

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Every listed second-row header renders at the same height with the same divider token (component tests on the class or a computed-style E2E check)
- [ ] The note list and search headers have no `pl-6` when they are not the first pane after the rail; a test covers both cases
- [ ] No pane changes width or scroll behavior

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 2 "Spacing and density" and section 3 Shell layout rows 3 and 5; `work/layout.md`, `work/typespacing.md`.
- Overlaps Issue 49 on the note action bar height; whichever lands second only reuses the utility.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.
