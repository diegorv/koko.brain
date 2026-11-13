# 50: Second-row toolbars share one height and divider, and only the first pane keeps the traffic-light inset

**What to build:** The second-row headers step by 4px and use two divider colors: the note action bar is `h-9 border-border`, PropertiesView `h-10`, the calendar header about 56px, Tasks and Kanban size to content. Add one `pane-toolbar` utility in `src/app.css` (`h-10 px-3 gap-1` plus a `--divider` bottom edge) and use it on the note action bar, collection toolbar, tags, tasks, kanban, event calendar header and properties header. Add the missing divider on the empty-editor strip (`EditorView.svelte`, about line 147). Separately, `RailNoteList.svelte` (about line 416) and `SearchPanel.svelte` (about line 68) always add the `pl-6` traffic-light inset; apply it only to the first pane after the rail (a prop or `data-first-pane`).

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Every listed second-row header renders at the same height with the same divider token (component tests on the class or a computed-style E2E check)
- [x] The note list and search headers have no `pl-6` when they are not the first pane after the rail; a test covers both cases
- [x] No pane changes width or scroll behavior

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 2 "Spacing and density" and section 3 Shell layout rows 3 and 5; `work/layout.md`, `work/typespacing.md`.
- Overlaps Issue 49 on the note action bar height; whichever lands second only reuses the utility.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.
- **Trade-off (event calendar header):** the header lost `flex-wrap` to hold the fixed `h-10` row. In an editor pane narrower than its controls (about 290px), the title shrinks to 0 and the D/W/M group overflows to the right and is clipped. Accepted: hiding controls by container width is a separate change if it shows up in use.

## Comments

- 2026-11-05, branch `issue/50-pane-toolbar-band`: added the shared `pane-toolbar` utility (h-10, px-3, gap-1, `--divider` bottom edge) on the note action bar, collection toolbar, tags, tasks, kanban, event calendar and properties headers; divider under the empty-editor strip; `pl-6` traffic-light inset only on the first pane after the rail (note list, search). Review round 1 fix: Tags title keeps its 8px gap to the count. Tests: pnpm check 0 errors; full suite run 1 exit=1 (5 timing flakes in event-calendar.model.test.ts, untouched; alone 38/38), run 2 exit=0, 500/500 files, 11870 passed, build ok. Reviews: round 1 APPROVED, round 2 APPROVED.
