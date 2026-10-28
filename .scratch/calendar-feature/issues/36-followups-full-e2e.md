# 36: Calendar follow-ups filed and full E2E suite green

**What to build:** the plan's deferred work is in the tracker. Each Notes > Follow-ups item has its own ticket under `.scratch/calendar-feature/issues/`, numbered after this breakdown, with a Blocked by line and a Status line. If the SvelteKit 3 migration's test-migration ticket is still open, it lists the `vi.mock` strings this plan added. The full E2E suite and the frontend gate pass on the finished feature, so ticket 37 can close the plan.

**Plan reference:** Task 35 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 818-822). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done. Task 35 numbers the follow-ups from `01` (line 819), but tickets 01-37 already use `.scratch/calendar-feature/issues/`. Closed tickets are deleted, but their numbers stay in the commit history, so the follow-ups start at `38`.

**Blocked by:** 25, 34

**Status:** ready-for-agent

**Touches:**
- `.scratch/calendar-feature/issues/38-<slug>.md` and up (new, one per follow-up)
- `.scratch/sveltekit-3-migration/issues/11-migrate-tests-to-lib-subpath.md` (modify, only if still open)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`, plus one full `bash scripts/e2e.sh` (no spec arguments).

- [ ] Each item in Notes > Follow-ups (plan lines 1297-1318) is its own file `.scratch/calendar-feature/issues/NN-<slug>.md`, numbered upward from `38`, with no reuse of 01-37. That is 21 files, or 20 when ticket 34 regenerated the archify map. The items, as the plan lists them:
  - Dated tasks overlay from `get_all_tasks_v2`.
  - Multi-day `end_date` spans and cross-midnight events.
  - Holidays as `_type: Holiday` notes.
  - Theme-editor event colors (12 tokens in `ThemeColors`).
  - A tab-kind registry (ADR-0003).
  - Recurrence (not in the prototype either).
  - `createFile` and the note creator pass `vaultPath`, so created notes reach FTS5 at creation (D19).
  - Trash restore of a folder indexes its children (Task 15 covers files).
  - Case-insensitive dedupe in `resolveTypedNoteTarget` / `createFile`, so a case-only name collision gets a numbered file instead of `create-failed`.
  - Undo history that follows renames and moves made outside the calendar.
  - Sync conflict copies shown distinctly instead of as duplicate events (after p2p-sync lands).
  - Regenerate the archify runtime map for the `restore` source, if Task 33 could not.
  - Consolidate the date and grid helpers of `plugins/calendar`, `features/collection` and `features/event-calendar`.
  - A Rust range command, only if profiling shows a need.
  - Periodic-note links from day headers through a plugin-side bridge.
  - Route `frontmatter-icon.service.ts` and `toggleFavoriteForPath` through `updateNoteFrontmatter`.
  - Focus event plus pulse from search and backlinks.
  - A shortcuts help dialog.
  - The day-view WeekStrip.
  - Drag in the month view and the all-day lane.
  - The collection calendar's time-of-day defects (`features/collection/calendar.logic.ts:120-130`, `linear-calendar.logic.ts:147-148, 175-180`).
- [ ] Each follow-up file has a `**Blocked by:**` line and a `**Status:**` line (`needs-triage` or `ready-for-agent`), in the format of `.scratch/embedder-memory/issues/02-update-semantic-file-silent-skip.md`
- [ ] The "Regenerate the archify runtime map for the `restore` source" follow-up is filed only if ticket 34 left `docs/architecture/archify/kokobrain-runtime.architecture.json` and `kokobrain-runtime.html` untouched
- [ ] If `.scratch/sveltekit-3-migration/issues/11-migrate-tests-to-lib-subpath.md` is still open (the file still exists; closed tickets are deleted), it gains a `## Comments` entry at the bottom listing the `vi.mock` strings this plan added to `app-lifecycle.service.test.ts`, `tauri-listeners.service.test.ts` and `type-definitions.service.test.ts` (Notes > Dependencies, line 935). If that ticket is closed, nothing is appended
- [ ] One full `bash scripts/e2e.sh` run with no arguments passes. This is the end of the plan: it touched core editor, markdown-editor, layout, app-lifecycle, filesystem, trash, settings and keybindings (`docs/TESTING.md:163`), and the run covers the drain from ticket 25 and every other code ticket
- [ ] `pnpm check`, `pnpm vitest run` and `pnpm build` pass
- [ ] `git diff --cached --stat` lists only the new follow-up files and, when applicable, `.scratch/sveltekit-3-migration/issues/11-migrate-tests-to-lib-subpath.md` with its new `## Comments` entry
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)
