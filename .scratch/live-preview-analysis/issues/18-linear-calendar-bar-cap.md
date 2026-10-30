# 18: Linear-calendar collection blocks in the editor cap their bars

**What to build:** A `collection` block with a `linear-calendar` view in live preview renders a bounded number of event bars per month row, with a "+N" marker for the rest, like the `calendar` view already does (at most 2 pills per day plus "+N"). Today `buildLinearCalendar` (`extensions/live-preview/widgets/collection-block-widget.ts`, the bar loop over `row.events`) creates one absolutely positioned bar for every record dated in the current year, and the lanes grow without limit, synchronously on every `toDOM()`. Over a large vault with dated notes this can build a very large DOM on the main thread, the same failure Issue 17 fixed for the table view.

**Context:** Found by the review of Issue 17 (`work/17/review.md`, finding 1). Issue 17 assumed calendar and linear-calendar already bound their output; that holds only for `calendar`. Not observed in the app yet: `help/examples/markdown-editor-vault/20-collection.md` has no calendar views.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget.ts` (modify; `buildLinearCalendar`)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] Test, written and seen failing first: a linear-calendar result with many records on the same days renders at most the lane cap of bars per month row plus a "+N" marker
- [ ] Test: a result under the cap renders every bar and no marker
- [ ] The cap is one named constant with a JSDoc saying why it exists

## Comments
- 2026-10-29 21:15 — discovery — lane cap 3 in buildLinearCalendar with +N in month label cell; see work/18/discovery.md — a3184de8
