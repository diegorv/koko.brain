# 24: Settings > Rail: hide and reorder built-in items, Inbox badge switch

**What to build:** A new Settings page, "Rail", lets the user hide built-in rail items and reorder them within their group (top group: Inbox, Today, Favorites; navigator group: Types, registered navigators such as Calendar, Files; bottom: Archive). Search and Today cannot be hidden (Search is the way into search, Today is the fallback lens). A hidden item is not rendered and has no Go to command; if the saved `layout.railItem` is hidden, the app falls back to Today. A switch "Show Inbox count on the rail" turns the rail's Inbox badge on and off, separate from the existing dock badge switch under Quick Capture, whose text says it covers the dock only. Pinned items (Issue 21) are not listed here; they order by their own `_order`.

**Blocked by:** 21

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] New layout keys `railHidden: string[]`, `railOrder: string[]` and `railInboxBadge: boolean` exist in the settings types and `DEFAULT_SETTINGS` (so `mergeLayout` keeps them) and round-trip through load and save (logic and service tests)
- [ ] A pure function applies hidden and order to the item list, ignores unknown keys, keeps items missing from `railOrder` at their default position, and never hides Search or Today (logic test)
- [ ] `Rail.svelte` renders the result; the Inbox badge follows `railInboxBadge` (component test, real settings store)
- [ ] A hidden saved `railItem` restores to Today (logic test on `restoreRailItem`)
- [ ] The Rail settings page lists the items with a visibility switch and up/down buttons (keyboard-operable, no drag-only reorder), and the badge switch (component test)
- [ ] Hiding Calendar hides its rail item only; its Day lens provider stays registered (test)
- [ ] ADR 0033 is amended (Settings > Rail); help 19 documents the page

## Notes

- **Owner decisions (2026-11-04):** v1 has hide/reorder of built-in items and the Inbox badge switch; turning off plugin parts (Calendar navigator, My people, New Kanban Board), the start item and width reset are not in this Issue.
- **Main-session decision:** reorder within each group only, so the divider structure stays.
- **Today (traced):** items are constants (`features/rail-shell/Rail.svelte:40-53`); no Rail section exists (`core/settings/settings.types.ts:48-92`, `settings.logic.ts:184-226`); the dock badge switch is `core/settings/sections/QuickCaptureSection.svelte:80-95` and the rail badge has no switch (`Rail.svelte:90-94`).
- **Source:** `.scratch/rail-shell-ux/review-2026-11-03.md` F55, F49.
- **Size:** M.

## Comments
