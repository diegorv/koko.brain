# 12: Type definitions and `.view` files stay out of note lenses, except Favorites

**What to build:** A type definition (a note with `_type: Type`) and a `.view` file are never listed as notes by the rail. They leave Inbox, Today (both groups, the Pinned group included), Archive, the Day lens, the calendar navigator's dots, a type's row and the Untyped row (lists and counts), the neighbourhood lens's linked groups and the results of a view (type definitions; Issue 01 already drops `.view` files there). Favorites is the one exception: a favorited type definition or `.view` still shows there, so a user can keep one at hand. Inbox, Untyped and a type's row already leave type definitions out, but not `.view` files; the other lenses keep both. This makes every lens follow one rule. The Files navigator, the folder lens and the Types navigator's Views section keep listing every file.

**Blocked by:** 01, 10

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first: a lens test with a type definition and a `.view` entry, both with today's note date, shows both in Today and the Day lens, both in Archive when archived, and the `.view` in Untyped, before the change
- [ ] `isListableNote(entry)` in `features/type-definitions/type-sidebar.logic.ts` (created by Issue 01 for `.view` files) is also false for an entry with `isA === 'Type'`, and true for a plain or typed note (logic test in `type-sidebar.logic.test.ts`)
- [ ] Inbox, Today (Pinned and dated groups), Archive and the Day lens never list a type definition or a `.view` entry, including one created today with no `date` and a favorited one in Today's Pinned group (lens tests in `lens.logic.test.ts` and `src/tests/lib/plugins/calendar/day-lens.logic.test.ts`)
- [ ] The Inbox count (`getInboxCount`, also the dock badge) leaves out a `.view` with `_organized: false` (logic test in `inbox-workflow.logic.test.ts`)
- [ ] Untyped and a type's row leave out a `.view` entry in both the list (`resolveLens` on the Untyped and type lenses) and the count (`typeNavigatorRows`) (lens tests)
- [ ] The neighbourhood lens's linked groups (outgoing, backlinks, belongs to, related to, has many, other) never list a type definition or a `.view`, for example a `.view` whose YAML links to the note (a backlink) and a type definition in `_belongs_to`; the "This note" group still lists the note itself when it is a type definition (lens test)
- [ ] A view whose filter matches a type definition does not list it, and its navigator count drops with it (lens test on `resolveViewLens`)
- [ ] `noteDateCounts` (`plugins/calendar/day-lens.logic.ts:45`) gives no entry for a day that only has a type definition or a `.view` (extend its test in `day-lens.logic.test.ts`)
- [ ] Favorites still lists a favorited type definition and a favorited `.view` (lens test)
- [ ] The Files navigator, the folder lens and the Types navigator's Views section still list both (existing tests stay green)

## Notes

- **Owner decision (2026-11-04):** exclude type definitions and `.view` files from every lens except Favorites.
- **Today (traced):** `.view` files are indexed as notes (`src-tauri/src/utils/fs.rs:114-117`, `src-tauri/src/vault/entry.rs:237-241`), so a view created today lands in Today, the Day lens and the dots (`features/rail-shell/lens.logic.ts:240-262`; `plugins/calendar/day-lens.logic.ts:34-52`) and inflates Untyped (`features/type-definitions/type-sidebar.logic.ts:76-77`, count via `buildTypeSections` at :152-168, read by `typeNavigatorRows` at `lens.logic.ts:361-380`). Type definitions are already left out of Inbox (`inbox-workflow.logic.ts:9`), Untyped and a type's row (`type-sidebar.logic.ts:77,158`), but not out of Favorites (`lens.logic.ts:229`), Archive (:231), Today (:257-258), the Day lens and dots (`day-lens.logic.ts:40,47-49`), the neighbourhood lens (`lens.logic.ts:303-340`) or view results (:570-582). New type writes no `date` (`type-definitions.service.ts:175`), so its note date is its disk creation day.
- **Where the predicate goes:** in `type-sidebar.logic.ts`, because `buildTypeSections` there needs it (replace its `entry.isA === 'Type'` skip at :158) and `lens.logic.ts` and `day-lens.logic.ts` already import that file; defining it in `lens.logic.ts` would make `type-sidebar.logic.ts` import `lens.logic.ts` back. `inbox-workflow.logic.ts` (`isInboxEntry`) imports it so the Inbox lens and the dock badge stay one rule. Favorites, Archive, Today and the Day lens all go through `listEntries` (`lens.logic.ts:240`), so do not apply the predicate unconditionally inside `listEntries`: Favorites must keep both.
- **Neighbourhood:** `resolveNeighbourhoodLens` does not use `listEntries`; it builds rows in `linked()` (:308-317), the backlinks filter (:319-322) and the "This note" group (:324). Update its doc comment ("Nothing is excluded by folder or lifecycle").
- **Main-session decision:** the "This note" group keeps the note itself even when it is a type definition: it is the lens's subject, not a listed note, and the note action bar offers the neighbourhood on any markdown note (`app/EditorView.svelte:66-68`). A `.view` cannot be the subject (no note action bar on a `.view` tab).
- **Main-session decision:** the Inbox follows the rule through `isInboxEntry`, so the dock badge (`dock-badge.logic.ts`) and the rail's Inbox badge (`Rail.svelte:29`) drop a `.view` too.
- **Why after 10:** Issue 10 changes `resolveViewLens` to take a view-load state (`loading` / `missing` / `error` / `ran`) instead of `ViewQueryResult | null`. The view-result criterion above edits and tests the same function, so write it against Issue 10's input (a `ran` load) and keep its status handling.
- **Out of scope:** the collection editor's table and inline collection blocks (Issue 13 makes them share the rail's row set); Today's My people section (`plugins/one-on-one/one-on-one.logic.ts:150-170`), which is not a lens; help wording for which lenses list these files (Issue 26).
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F72, F11.
- **Size:** S.

## Comments
