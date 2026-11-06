# 08: Note list header floor, so the sort arrow stays in its trigger

**What to build:** the note list header in `src/lib/features/rail-shell/RailNoteList.svelte` keeps the sort arrow off the search button at every window size. Issue 03 hid the count under a 12rem container query, which clears the overlap at 1440 px, the only width that Issue checked.

The trigger in `RailSortMenu.svelte` has `min-w-0` while its arrow is `size-3.5 shrink-0`, so once the header content is under about 160 px the trigger's box shrinks below the arrow and the arrow runs past it. The review of Issue 03 probed the app's default window, 1200x800 in `tauri.conf.json`, with the default list size:

| Form | Arrow right | Search left |
|---|---|---|
| collapsed | 206 | 200 |
| captioned | 206 | 200 |
| labeled | 290 | 287.1 |

By arithmetic from those figures, the overlap reaches any window under about 1404 px collapsed, 1240 px captioned and 1214 px labeled. These are the review's measurements (`.scratch/rail-styles/work/03/review.md`, in the commit history once Issue 03 is delivered); re-measure before fixing.

Options the review named, to choose between in the real app:

- Drop the properties picker under a smaller container query.
- Lower the title's `min-w-16` under a smaller container query.

A `min-w` on the trigger alone only moves the problem: the icons after it would run past the header's right edge.

**Blocked by:** 03

**Status:** needs-triage

**Gate:** decided at triage.

- [ ] In all three forms, at 1200 px and 1440 px with the default list size, the sort arrow's right edge is at or before the search button's left edge, and no header control runs past the header's right edge.

## Notes

- Do not launch this with `--all`. Relay-lite ignores triage labels, so its ledger row reads `todo`: run this feature with explicit numbers.

## Comments
