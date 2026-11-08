# 61: An outside rename of a duplicate whose title is written in its frontmatter turns its overlay title into the new filename

**What to build:** A calendar duplicate writes its title into the frontmatter, and that title equals the copy's filename base. When the copy is renamed outside the calendar, `followRename` (`src/lib/features/event-calendar/event-calendar-history.logic.ts:93`) treats a title equal to `fromBase` as untitled and swaps it for the new filename base, so the overlay shows the new filename while the index keeps the written title. The overlay never matches the index and stays until two bumps pass. `followRename`'s doc comment names this misread ("A note whose `event_title` equals its old filename base is misread as untitled").

Fix: tell a written title from a filename-derived one (for example from the event's own title field) instead of comparing strings.

**Blocked by:** 49

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Files:** src/lib/features/event-calendar/,src/tests/lib/features/event-calendar/

**Source:** Issue 49 build, 2026-11-01 (`work/49/discovery.md` on branch `issue/49-calendar-outside-delete-races-restore`, "Conflict: criterion 3"). Found by the model test (`src/tests/lib/features/event-calendar/event-calendar.model.test.ts`) with Issue 49's generator and `finish` bumping once for every run: `MODEL_SEED=166` fails. Not reproduced on main and not checked in the running app; the seed number is only meaningful with Issue 49's generator, which is why this waits on 49.

- [x] A failing test first: a duplicate with a written title equal to its filename base, renamed outside, keeps its written title in the overlay and the history
- [x] An untitled note renamed outside still shows its new filename as its title
- [x] Seed 166 passes with one end bump

## Notes

- **Size:** S to M. Serialize with the other calendar Issues (49, 56, 58-61): they share `event-calendar.service.ts` and the model test.

## Comments

- 2026-11-01, branch `issue/61-calendar-outside-rename-of-titled-duplicate`: `followRename` now keeps a written title on an outside rename (titled flag instead of string compare); round-1 fix drops a stale titled flag when a calendar title edit renames the note, plus doc notes. Targeted checks pass; full suite exit=0 (408 files, 9670 passed, 1 skipped, 1 todo; build ok). Reviews: round 1 CHANGES_REQUESTED, round 2 APPROVED, round 3 APPROVED.
