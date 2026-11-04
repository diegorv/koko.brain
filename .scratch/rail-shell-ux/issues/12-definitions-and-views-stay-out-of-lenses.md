# 12: Type definitions and `.view` files stay out of note lenses, except Favorites

**What to build:** A type definition (a note with `_type: Type`) and a `.view` file are never listed as notes by the rail. They leave Today (both groups), Archive, the Day lens, the calendar navigator's dots, the Untyped row and its count, the neighbourhood lens and the results of a view (type definitions; `.view` files in view results are already handled by Issue 01). Favorites is the one exception: a favorited type definition or `.view` still shows there, so a user can keep one at hand. The Inbox and the Types navigator already exclude them; this makes every lens follow one rule. The Files navigator and the folder lens keep listing every file.

**Blocked by:** 01

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] One predicate (for example `isListableNote(entry)`) in `lens.logic.ts` or `type-sidebar.logic.ts` says "a type definition or a `.view` is not a listable note"; every lens below uses it (logic test of the predicate)
- [ ] Today, Archive, Untyped (rows and count), the Day lens and the neighbourhood lens never list a type definition or a `.view` entry, including one created today with no `date` (lens tests with real entries)
- [ ] A view whose filter matches a type definition does not list it (lens test)
- [ ] The calendar navigator puts no dot on a day that only has a type definition or a `.view` (logic test on `day-lens.logic.ts` or the dot builder)
- [ ] Favorites still lists a favorited type definition and a favorited `.view` (lens test)
- [ ] The Files navigator and folder lens still list both (existing tests stay green)
- [ ] The Inbox rule line, if it names exclusions, stays true

## Notes

- **Owner decision (2026-11-04):** exclude type definitions and `.view` files from every lens except Favorites.
- **Today (traced):** `.view` files are indexed as notes (`src-tauri/src/utils/fs.rs:114-117`, `src-tauri/src/vault/entry.rs:237-245`), so a view created today lands in Today, the Day lens and the dots (`features/rail-shell/lens.logic.ts:201-213,240-262`; `plugins/calendar/day-lens.logic.ts:34-52`) and inflates Untyped (`features/type-definitions/type-sidebar.logic.ts:76-77`). Type definitions are excluded only from Inbox and Types (`lens.logic.ts:229,231,257-258,570-582`); New type writes no `date` (`type-definitions.service.ts:175`).
- **Overlap:** Issue 01 (a blocker) drops `.view` files from view results; reuse its predicate here rather than writing a second one.
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F72, F11.
- **Size:** S.

## Comments
