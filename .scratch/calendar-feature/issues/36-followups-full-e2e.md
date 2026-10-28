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

## Comments

- **2026-10-28, post-merge adversarial review of ticket 22 fix b3ffc1ef (verdict OK), follow-up candidates:** (1) low: `compositedTextColors` in `e2e/specs/event-calendar.spec.ts` (~41-59) folds the block opacity into the text color but not the background, and reads the background without its alpha, so contrast is mis-measured on a translucent block; no contrast assertion covers a pending block. (2) nit: the pending dashed border in `EventBlock.svelte:60` takes 2px, so the `@max-[84px]` title-only switch triggers about 2px earlier for a pending block. (3) nit: the z-index clamp `10 + min(column, 9)` has only a style-string unit test, no E2E check of the layering against the now-line.

- **2026-10-28, post-merge adversarial review of ticket 28 fix 606978d4 (verdict OK), follow-up candidates, all low:** (1) `opsUpTo` (`event-calendar.service.ts:705`) moves every op on the old path recorded before the anchor, including ops left by an earlier, different note at that path (note A deleted outside the calendar, B created there and deleted, suffixed restore of B carries A's ops). (2) A suffixed restore with no recorded state (`:755`) never calls `dropPending(path)`, so a stale delete placeholder can hide the new note at the old path until the next index refresh. (3) Pre-existing: `duplicateEvent` (`:612`) queues on the source path only, so a write to the copy's new path is not serialized behind its creation.

- **2026-10-28, post-merge adversarial review of ticket 26 fix ed15a49c (verdict OK), follow-up candidates, all low:** (1) the stale-target `$effect` in `EventPopover.svelte:42-44` matches the event by `path` only, so a pending rename overlay (tickets 24/39) that moves the event to a new path closes the popover on the same event; unverified whether the overlays rewrite the path while the popover is open. Check it once ticket 27 (edit dialog, title change renames) lands. (2) `FOCUSABLE` (`:24`) matches `[tabindex]`, so a `tabindex="-1"` wrapper takes focus after an outside click; exclude `-1` or skip when `document.activeElement` is already outside the popover. (3) No view-level test covers retargeting; only the `EventPopover` mount tests and the E2E do.

- **2026-10-28, post-merge adversarial review of ticket 27 fix eb7ab2b1 (verdict OK), follow-up candidate, low:** `EventDialog.svelte:43` closes the dialog when `path` has no matching event. If a title change renames the note and the merged events drop the old path before `editEvent` resolves, the dialog closes mid-save: a success skips the `lastPath = newPath` step (early return near `:86`), so focus falls back to the view root instead of the renamed block, and a failure in that window toasts instead of showing the inline error. Same class as the ticket 26 popover note above (lookup by `path` across a rename). Probably pre-existing; no test covers a rename during save. Cover both with one E2E: edit the title in the dialog and save, then assert the dialog and popover behaviour and focus.

- **2026-10-28, post-merge adversarial review of ticket 29 fix 5c14e82d (verdict OK), follow-up candidates, low:** (1) the delete toast Undo (`event-calendar.service.ts:1019`) focuses `document.querySelector('[data-event-calendar]')`, the first Calendar root in the DOM, so with two mounted views it can focus the wrong one (focus only). (2) Pre-existing: Undo clicked after a vault switch still calls `undoDeleteEvent(oldPath)` (`:1016`); confirm the restore is refused for a path outside the current vault, and that the toast is dismissed on vault switch.

- **2026-10-28, post-merge adversarial review of ticket 32 fix 0542bac2 (verdict OK), follow-up candidate, low, pre-existing:** "Open Event type" (`EventCalendarSection.svelte:79-90`) with an ordinary note `Event.md` already in the vault root: `createFile` (`fs.service.ts:121`) dedupes to `Event 1.md`, whose type name never matches the configured "Event" (resolved by name at `:46-49`), so every later click creates another `Event N.md` and closes Settings on a definition that is not the configured type. Fix: check the returned path's basename against the configured name, or detect the collision first and toast. Nit: `TypeSidebar.svelte:396` discards the new return value (harmless).

- **2026-10-28, post-merge adversarial review of ticket 31 fix d6478fa9 (verdict PROBLEMS, both low), follow-up candidates:** (1) `EventTimeGrid.svelte:124-125` calls `e.stopPropagation()` on every non-modifier key from a `window` capture listener (`:158`) while a gesture is live, which runs before `global-keybindings.ts:40` and `utils/keybindings.ts:32`. From pointerdown to pointerup on the grid (a plain click included) every app shortcut is dead: Cmd+S, Cmd+P, Cmd+W and the Cmd+Shift+C toggle. Stop the key only in the view's own shortcut handler (a "gesture live" flag) and add a test that a document-level listener still sees Cmd+S mid-gesture. (2) `event-calendar.service.ts:773` maps any `null` from `restoreItem` (`trash.service.ts:107ff`: rename or mkdir error, permissions) to `not-in-trash`, so the toast from `:863` / `:1124` says "The note is no longer in the Trash" while the entry is still there. Pre-existing mapping, now user-visible.

- 2026-10-28 16:39 — discovery — 25 follow-ups to file as 40-64 (highest used number is 39), kit-3 ticket 11 still open; see work/36/discovery.md — c0103ff5
- 2026-10-28 16:43 — implement — filed tickets 40-64 (21 plan items incl. archify, owner items A-D as 61-64) and the kit-3 ticket 11 vi.mock comment; pnpm check 0 errors; full E2E and frontend gate left to deliver — 4c26b825
