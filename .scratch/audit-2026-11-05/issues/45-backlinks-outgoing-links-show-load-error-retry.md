# 45: Backlinks and Outgoing links show a load error with Retry, not an empty message

**Migrated from:** `.scratch/ux-polish/issues/06-link-panels-show-load-error.md` (audit 2026-11-05). Priority: daily use and UI correctness (bucket 2-ux). Still present, ux/low. It edits the same fetch functions as N-index-01, so it runs after that Issue to avoid a conflict.

**Audit check at `5f8003d67`:** still_present (ux, low). Both services still log and swallow the IPC error and leave the store untouched: src/lib/features/backlinks/backlinks.service.ts:166-167, src/lib/features/outgoing-links/outgoing-links.service.ts:87-88. The panels render 'No backlinks found' (src/lib/features/backlinks/BacklinksPanel.svelte:68-69) and 'No outgoing links' (src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:64-65) for any empty list. rg finds no loadFailed flag or error copy in either feature.

**Stale in the text below:** Line refs match. It touches the same service fetch functions as the new 'Backlinks and Outgoing links always show the open note's own links' Issue; implement them in order or together to avoid conflicts.

**What to build:** When the Rust read behind the Backlinks or Outgoing links panel fails, the panel says so and offers Retry, instead of claiming there is nothing. Today `fetchBacklinksV2Inner` (`src/lib/features/backlinks/backlinks.service.ts`, about lines 166-168) and `fetchOutgoingLinksV2Inner` (`src/lib/features/outgoing-links/outgoing-links.service.ts`, about lines 87-89) log and swallow the error and leave the store as it was, so on a first fetch the panels render "No backlinks found" (`BacklinksPanel.svelte`, about line 68) or "No outgoing links" (`OutgoingLinksPanel.svelte`, about line 65), the same as a real empty result.
- Each store (`backlinks.store.svelte.ts`, `outgoing-links.store.svelte.ts`) gains a `loadFailed` boolean `$state` with a getter, a `setLoadFailed(value)` method and JSDoc; `reset()` clears it.
- Each service sets `loadFailed` false on a successful write and true in the catch, and only while the path is still the active tab (`isStillCurrentPath`, as the success branch does). The services keep logging and still do not rethrow (their JSDoc documents the swallow, and `dedupeInflight` shares the promise).
- Each panel shows, when `loadFailed` is true and its list is empty, the text "Could not load backlinks." (or "Could not load outgoing links.") in the existing empty-message style, plus a small Retry button that calls the panel's `fetchData()`. A failed refetch while entries are on screen keeps showing them (`backlinks.service.test.ts`, about line 393, pins that). The panels' `.catch(() => {})` calls stay.
- Retry refetches because a failed fetch never records `lastFetchedBacklinksVersion` / `lastFetchedOutgoingKey`; keep it that way.

**Blocked by:** 12

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: in `src/tests/lib/features/backlinks/BacklinksPanel.test.ts`, `get_backlinks_v2` rejects on the first expand; the panel shows "Could not load backlinks." and not "No backlinks found". After the mock resolves `[]`, clicking Retry shows "No backlinks found". It fails on the current code
- [ ] The same pair of tests in `src/tests/lib/features/outgoing-links/OutgoingLinksPanel.test.ts` for `get_outgoing_links_v2`
- [ ] Service tests (`backlinks.service.test.ts`, `outgoing-links.service.test.ts`): `loadFailed` is true after a rejected IPC for the active path, false after a later success, and unchanged when the tab switched while the failing call was in flight
- [ ] Store tests: `loadFailed` getter, `setLoadFailed`, and `reset()` clearing it, for both stores
- [ ] Only Tauri is mocked; stores and `.logic.ts` files are real

## Notes

- **Source:** `work/views.md` ("Failure indistinguishable from empty"); review section 3 row "No empty-state, error or badge primitive" and section 4 Issue 11.
- **Rule:** CLAUDE.md "Components: user-facing errors should be shown via toast notifications or inline error states".
- **Later:** when the `InlineAlert` primitive from review Issue 11 exists, these two error states move onto it; this ticket uses plain markup so it does not wait.
- **Out of scope:** relationship backlinks failures (that section renders only when non-empty), unlinked mentions, raw error copy elsewhere (Todoist, Search settings, EventCalendarView), Graph view and canvas nodes.
- **Size:** M.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/06-link-panels-show-load-error.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
