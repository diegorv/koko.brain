# 14: Note rows show the relative modified time, matching the list order

**What to build:** Rail note lists sort by modified time, newest first, so the row's second line shows that time in relative form ("2 h ago", "yesterday", then a short date) instead of the note date as a raw `YYYY-MM-DD` key. The subtitle becomes `type · <relative modified> · folder`. The Day lens and the calendar keep using the note date (`date`, `created`, disk creation time) to decide which day a note belongs to. The dead modified-time footer branch in `NoteRow` (unreachable because every caller passes a subtitle) is removed.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first: a lens note modified two hours before a fixed `now` has the subtitle part "2 h ago" (or the app's existing relative format), not its `date` key (logic test with an injected clock)
- [ ] Older than a week shows a short date in the app's date format (logic test)
- [ ] The Day lens still groups by note date (existing tests stay green)
- [ ] `NoteRow` has no unreachable footer branch; its tests cover the subtitle path (component test)
- [ ] Lenses whose order is not modified time (folder lens: tree order; `_order` pins) still show the relative modified time, and nothing claims it is the sort key

## Notes

- **Owner decision (2026-11-04):** show relative modified time.
- **Today (traced):** `features/rail-shell/lens.logic.ts:178-180,240-245` builds the subtitle from the note date key; `features/note-list/NoteRow.svelte:25,117-124` has the relative-modified footer that cannot render; `RailNoteList.svelte:504` always passes a subtitle.
- **Reuse:** look for an existing relative-time helper (file history, search results) before writing one.
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F12.
- **Size:** S.

## Comments
