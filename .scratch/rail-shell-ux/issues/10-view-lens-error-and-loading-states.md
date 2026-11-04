# 10: A broken or loading `.view` says so in the note list and the navigator

**What to build:** When the picked view lens cannot be shown, the note list says why instead of "No notes here". Cases: the `.view` does not parse (show the parser message), has no `views`, no longer exists, or the index is still loading (show a Loading state, not an empty list). The error state offers "Open view", which opens the `.view` in the editor so the user can fix it. The view's row in the Types navigator shows an error mark (icon with a tooltip carrying the message) instead of silently dropping its count. While a count is pending, the badge slot keeps its width so rows do not shift. A non-number `_order` (`"1"`) or a non-boolean `_open_in_editor` (`"true"`) is reported in the same tooltip as "ignored key".

**Blocked by:** 06

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] `ResolvedLens` (or the view-lens resolution around it) carries an error with a message; `resolveViewLens` sets it for each case above (logic test, real parser)
- [ ] `RailNoteList` renders the message and an "Open view" button for an errored view lens, a Loading state while the index is not ready, and "No notes here" only for a view that ran and matched nothing (component test, real stores)
- [ ] "Open view" opens the `.view` in an editor tab (component test)
- [ ] The Types navigator row of an unparseable view shows the error mark with the message in its tooltip and `aria-label` (component test)
- [ ] The count slot has a fixed width with or without a count (component test on the class or a placeholder element)
- [ ] `_order: "1"` and `_open_in_editor: "true"` produce an "ignored key" note on the row tooltip (logic test on the row builder)

## Notes

- **Today (traced):** `features/rail-shell/RailNoteList.svelte:126,131-134,164-191,375,446,480-483` hides Sort, Filter and New here and shows "No notes here" in every failure case; `view-lens.service.ts:21-27` drops the count of a view that fails to parse; the parse error goes only to the log. `type-sidebar.logic.ts:327-335` ignores non-number `_order`.
- **Main-session decisions:** keep the Sort and Filter buttons hidden in the error state (the fix path is "Open view"); a missing `.view` shows "This view no longer exists" and the same Open button is hidden.
- **Related:** Issue 06 (a blocker) adds filter parse errors to the query result; show that error through this state.
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F32, F05.
- **Size:** S.

## Comments
