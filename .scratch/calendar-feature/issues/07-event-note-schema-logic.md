# 07: Event note schema logic: projection, issues, field writes and pending overlay

**What to build:** a pure, tested schema layer for event notes in `src/lib/features/event-calendar/event-calendar-event.logic.ts`. It projects Rust `VaultIndex` entries of the configured event type into calendar events plus Needs-attention issues, and never defaults a value it cannot read. Notes under the templates/system folder are left out, and archived ones are hidden but counted. It also plans what a calendar write puts in a note: the sanitized filename base, `event_title` only when the title differs from that base, no aliased keys, and the merge of a draft onto the Event template. Pending writes are overlaid on the snapshot until the index catches up. A Rust-shaped event-notes fixture with the prototype seed events backs these tests. `applyEventDraft` stays a pure merge on purpose and assumes a safe base. It does not call `detectLossyFrontmatter`; the refusal of a lossy template goes in `createEvent`'s `buildContent` (ticket 28, Task 27; plan line 924).

**Plan reference:** Task 6 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 136-196). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 03, 05

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/event-calendar-event.logic.ts` (new)
- `src/tests/fixtures/event-notes.fixture.ts` (new)
- `src/tests/lib/features/event-calendar/event-calendar-event.logic.test.ts` (new)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] `event-calendar-event.logic.ts` imports only `.logic.ts` files and utils: `event-calendar-dates.logic.ts` (ticket 05), `src/lib/core/settings/settings.logic.ts` (the color list), `src/lib/features/properties/properties.logic.ts`, `src/lib/features/type-definitions/type-sidebar.logic.ts` (`excludeSystemFolder`) and `$lib/utils/frontmatter-aliases`. It has no framework import and JSDoc on every export. Import specifiers follow Notes > Dependencies: `$lib/...` until `.scratch/sveltekit-3-migration/issues/05-expand-lib-subpath-import.md` is closed, then `#lib/...`.
- [ ] Read scope (D26):
  - `isEventEntry(entry, typeName)` compares `entry.isA` ignoring case and never matches a type-definition note (`isA === 'Type'`).
  - `eventsFromEntries(entries, { defaults, typeName, vaultPath, systemFolder })` returns an `EventProjection` and applies `excludeSystemFolder(entries, vaultPath, systemFolder)` first. A blank `systemFolder` disables that filter.
  - Archived entries are hidden and counted in `archivedCount`.
  - The title is `frontmatter.event_title` when it is a non-empty string, else `entry.title` (D6).
- [ ] `parseEventTime(value)` returns:
  - `{ kind: 'absent' }` for a missing, null or `''` value;
  - `{ kind: 'ok'; minutes }` for an `HH:mm` string through `parseTimeStrict`, or for an integer 0..1440;
  - `{ kind: 'invalid' }` for anything else.

  Defaults apply only to absent keys:
  - a missing `end` is start + `defaultDurationMinutes`, capped at 1440;
  - a missing `start`, or `all_day: true`, means all-day (0..1440);
  - an unknown `event_color` renders with the default color and is left untouched on disk.
- [ ] `entryToEvent(entry, defaults)` returns `{ event } | { issue }`. The issue reasons are:
  - `unscheduled`: `detail: 'no-date'` for a missing or empty `date`, `detail: 'not-a-day'` for a value such as `2024-03-02T14:00`.
  - `invalid-time`: `start` or `end` is present but invalid, or `all_day` is present but not a boolean. The note is never defaulted and never rendered.
  - `crosses-midnight`: end <= start ("events cannot cross midnight yet").
  - `trailing-comment`: ` #` in a value of `date`, `start`, `end`, `all_day` or `event_color`. Never applied to `location`, `event_title` or the filename.
  - `multi-day`: `end_date` is present ("multi-day spans are not supported yet"). The issue has `rendered: true`, and the event still renders on its start day with `readOnly: true`.

  `isActionableIssue(reason)` is false only for `unscheduled`.
- [ ] `eventFileBase(title)` replaces every `[<>:"/\\|?*\x00-\x1F]` with `-`, trims, strips leading dots, and falls back to `Untitled Event` when nothing is left.
  - Tests cover `1:1 with manager` (gives `1-1 with manager`), `Lunch w/ Bob`, `.hidden`, `...` and `  `.
  - Every output, once `.md` is added, passes the real `isValidFileName`.
- [ ] `applyEventFields(properties, patch)`:
  - writes `date` typed `date`;
  - writes `start` / `end` as `HH:mm` text, and removes them for all-day events;
  - writes `all_day: true` only for all-day events, and removes it otherwise;
  - writes `event_color` when it is patched, and removes an empty `location`;
  - writes `event_title` for a string `eventTitle`, and removes it for `null`.

  Every written key satisfies `canonicalizeKey(k) === k`, so `color` is never written (D7).
- [ ] `applyEventDraft(baseContent, draft, fileBase)` merges a draft onto the Event type template or the inline `_type` template:
  - keeps `_type`, or adds the resolved type name when it is absent;
  - passes `eventTitle: draft.title` only when `draft.title !== fileBase`;
  - puts the draft's notes before the template body;
  - is built on `parseFrontmatterProperties` / `extractBody` / `rebuildContent`.

  Round-trip tests through the real `parseFrontmatterProperties` (no mocks):
  - `start` reads back `'09:30'` and `date` reads back `'2026-11-10'`;
  - `event_title` is written for `1:1 with manager` and absent for `Standup` with file base `Standup`;
  - template keys and body are kept, `_type` is added when absent, and `color` is never written.
- [ ] Overlay rules, under test:
  - `mergePending(snapshot, pending)` overlays the state of an `update`, adds a `create`, and hides a `delete` (rename tombstones included). Merged events carry a `pending` flag (for `data-pending`).
  - `prunePending(pending, snapshot, version)` never prunes an unsettled entry. It prunes a settled `update` when the snapshot entry at its path matches the pending state, a settled `create` when the path is present, and a settled `delete` when the path is absent. Any other settled entry prunes only once `version >= settledAtVersion + 2`.
  - One test pins "a settled update plus a newer snapshot with old values does not prune at +1, prunes at +2".
- [ ] The module also exports:
  - `formatEventTime(minutes)`, which gives `24:00` for 1440;
  - `eventState(event)` and `sameEventState(a, b)`, the undo preconditions;
  - `resolveEventTypeName(typeNames, configured)`, which returns the first name equal to `configured` ignoring case, else `configured` (under test);
  - `eventColorStyle(color)`, which returns `background: var(--event-<c>-bg); color: var(--event-<c>-fg)` (the tokens come in ticket 22, Task 21).
- [ ] `src/tests/fixtures/event-notes.fixture.ts` exports:
  - `eventEntry(path, frontmatter, overrides)`, built on `entryV2` with `isA` set. It models the Rust parse pinned in ticket 03: quotes stripped, `''` for empty keys.
  - `eventNote(fields, body)`, a content builder.
  - The prototype seed events, without `requestId` and without ev-14. "1:1 with manager" stays.

  Location `'Room #4'` through `applyEventDraft`, then `eventEntry`, then `entryToEvent` gives an event, not an issue.
- [ ] `event-calendar-event.logic.test.ts` also covers:
  - each issue reason, including `9:30 AM`, a date-valued `end`, an ISO datetime `start`, an ISO datetime `date` (`unscheduled`, `not-a-day`) and `all_day: "yes"`, plus `isActionableIssue`;
  - absent versus empty versus invalid keys, and the integer fallback;
  - the case-insensitive type check and a configured `Meeting` type;
  - `readOnly` for `end_date`, and `event_title` winning over the filename;
  - read scope: an Event note under `<vault>/_system/templates` is excluded, an archived event is hidden and counted in `archivedCount`, and a blank `systemFolder` includes the template.
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 12:37 — discovery — plan, risks and defaults in work/07/discovery.md — 84c91f63
- 2026-10-28 12:41 — implement — schema logic, Rust-shaped fixture and 65 tests; pnpm check 0 errors, event-calendar/properties/type-definitions vitest 819/819 — 3320c134
- 2026-10-28 12:46 — review — CHANGES_REQUESTED: all_day kept on a timed patch, mergePending drops an update at a renamed path, +2 fallback untested for create/delete (work/07/review.md) — ba14cc2c
- 2026-10-28 12:48 — fix — all six review findings fixed (all_day on timed patch, rename-path update overlay, tab comment, +2 create/delete tests, body join, sha); targeted vitest 71/71, pnpm check 0 errors — c3355541
