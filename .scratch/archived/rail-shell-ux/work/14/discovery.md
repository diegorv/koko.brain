# Issue 14 discovery: note rows show the relative modified time

No `spec.md` for rail-shell-ux; the Issue Notes carry the decisions.

## Files that change
- `features/rail-shell/lens.logic.ts:178-183` `noteSubtitle`: middle part becomes `formatRelativeTime(entry.modifiedAt)` (import from `type-sidebar.logic.ts`, already imported by this file; returns `''` for 0, so `filter(Boolean)` drops it). Doc comment updated. `entryNoteDate` (`:185-193`) unchanged; it still drives Today / Day lens grouping and calendar dots.
- `features/rail-shell/rail-shell.types.ts:40` `LensNote.subtitle` doc: "Type, relative modified time and folder".
- `features/note-list/NoteRow.svelte:10,25,117-124`: drop the footer block, the `formatRelativeTime` / `formatNoteDate` import names, and the "replaces the modified / created dates" wording.
- `src/tests/fixtures/NoteRowMenuHarness.svelte`: optional `subtitle` prop passed to each row.

## Tests
- `lens.logic.test.ts`: `noteSubtitle` describe rewritten with the clock pinned (`vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime`): `Project · 2h ago · Work`, no date key; 30+ days gives `formatNoteDate` short date; `modifiedAt` 0 gives `Note`. New `entryNoteDate` describe takes the date / created / disk cases. Expected updates: Favorites (`:157`), Type row (`:333`), Today group rows, folder Plan row (`:1450`), each with the clock pinned and `modifiedAt` relative to the pinned now (order kept). New: `_order`-pinned type row stays first and shows relative time; folder markdown rows stay in tree order.
- `day-lens.logic.test.ts:88-91`: pinned clock, `Project · 2h ago · Work`.
- `RailNoteList.test.ts:209-219`: pinned clock, relative time in the rendered subtitle; "not Created" check stays.
- `NoteRowMenu.test.ts:155-166`: subtitle renders in `[data-note-row-subtitle]`; no subtitle means no date line even with `modifiedAt` / `createdAt` set.

## Prior art
- Clock pinning: `RailNoteList.test.ts:458-459` (`toFake: ['Date']`, `new Date(2026, 9, 31, 9, 15)`).

## Risks
- Fixtures with small non-zero `modifiedAt` (e.g. 10, 300) now render a 1970 date that depends on the time zone; every changed assertion uses a `modifiedAt` relative to the pinned now so no assertion depends on TZ.
- Label does not tick on its own (Issue Notes: accepted).

## Defaults taken
- Pinned now: local `2026-10-27 12:00` in the logic tests (matches the Today / Day test day).
