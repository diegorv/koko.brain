VERDICT: CHANGES_REQUESTED

# Review: calendar-feature issue 07 (event note schema logic)

Scope reviewed: `git diff main...HEAD` (84c91f63, 3320c134, ba14cc2c). The diff adds `src/lib/features/event-calendar/event-calendar-event.logic.ts` (422 lines), `src/tests/fixtures/event-notes.fixture.ts` (142 lines), `src/tests/lib/features/event-calendar/event-calendar-event.logic.test.ts` (582 lines), `work/07/discovery.md` and two Issue comments. No existing source file changes.

Test verdict rests on these runs, which I made myself in the worktree:
- `pnpm check`: 192 files, 0 errors, 0 warnings, exit 0.
- `vitest run src/tests/lib/features/event-calendar src/tests/lib/features/properties src/tests/lib/features/type-definitions`: 21 files, 819 tests passed, exit 0. This includes the new `event-calendar-event.logic.test.ts`, plus the suites of the modules the logic imports (`properties.logic`, `type-sidebar.logic`, `event-calendar-dates.logic`).
- A throwaway probe test (deleted afterwards, never committed) that ran `applyEventDraft` on hostile titles and locations (`Retro #4`, `"Quoted"`, `Sync: weekly`, `Say "hi" #1`, `'x'`, `null`, `09:30`, `[x]`). It read each result back through both `parseFrontmatterProperties` and the Rust-shaped `rustFrontmatter`, and fed several edge inputs to `entryToEvent`, `eventsFromEntries` and `mergePending`. Findings 1 to 3 and 5 come from that probe.

I checked the fixture against the real Rust code (`parse_scalar` at `src-tauri/src/vault/parsing.rs:681-712`, `normalize_type_casing` at `:85-91`, and the pinned contract at `src-tauri/tests/vault_event_frontmatter_test.rs:49-57`). I also compared `SEED_EVENTS` with `calender-app-design/src/lib/seed.ts:22-67`. All match.

## Acceptance criteria

- [x] **Imports and JSDoc.** Met. Runtime imports are `settings.logic` (`EVENT_CALENDAR_COLORS`), `properties.logic`, `type-sidebar.logic` and `./event-calendar-dates.logic` (logic:15-18). Everything else is `import type` from `.types.ts` files (logic:12-14, 19-29). There is no framework import. `$lib/utils/frontmatter-aliases` is not imported because nothing uses it. The criterion is an allow-list, so leaving it out is fine. The specifiers are `$lib/...`, which is right while sveltekit-3-migration ticket 05 is still open. Every export, type included, has JSDoc.
- [x] **Read scope (D26).** Met.
  - `isEventEntry` compares case-insensitively and rejects `type` (logic:81-85; test:87-104).
  - `eventsFromEntries` applies `excludeSystemFolder` first (logic:201), then hides and counts archived entries (logic:203-206).
  - The title is `event_title` when it is a non-empty string, else `entry.title` (logic:110-113; test:173-177).
  - Tests cover the template under `<vault>/_system/templates`, a blank `systemFolder`, archived entries and the `Meeting` type (test:273-298).
- [x] **`parseEventTime` and defaults.** Met.
  - absent / ok / invalid (logic:93-103; test:106-126).
  - A missing `end` is start + duration, capped at 1440 (logic:154-155; test:145-149).
  - A missing or empty `start`, or `all_day: true`, gives all-day (logic:149; test:151-157).
  - An unknown color renders with the default and is never written back (logic:159-163; test:168-171).
- [x] **`entryToEvent` issue reasons.** Met, with the documented `{ event; issue? } | { issue }` shape. Only `multi-day` needs both, so I accept the deviation.
  - unscheduled no-date / not-a-day (test:179-192).
  - invalid-time for `9:30 AM`, a date-valued `end`, an ISO `start`, `25:00`, `all_day: "yes"` and `all_day: 1` (test:194-212).
  - crosses-midnight, including `24:00` with the default duration (test:214-218).
  - trailing-comment on all five keys, never on `location`, `event_title` or the filename (test:220-232).
  - multi-day renders read-only (test:234-238).
  - `isActionableIssue` (test:240-245).
  - Checking `trailing-comment` first is a sound default. See finding 3 for the cases the check misses.
- [x] **`eventFileBase`.** Met (logic:221-224). The named cases are tested, and every output passes the real `isValidFileName` (test:317-337).
- [~] **`applyEventFields`.** Met as tested, with one gap. `date` is typed `date`, `start` / `end` are written as `HH:mm`, `event_color`, `location` and `event_title` behave as specified, and no aliased key is ever written (test:339-401). The gap: `all_day` is removed only for an explicit `allDay: false`. A patch that carries `start` / `end` but no `allDay` leaves `all_day: true` behind (finding 1).
- [x] **`applyEventDraft`.** Met. It has the documented fourth `typeName` parameter, which the ticket's signature has no other source for, so I accept it. It is built on `parseFrontmatterProperties` / `extractBody` / `rebuildContent`.
  - The round trip covers `start` `'09:30'`, `date` `'2026-11-10'`, `event_title` written for `1:1 with manager` and absent for `Standup`, template keys and body kept, `_type` kept or added, and `color` never written (test:403-470).
  - The probe confirms that a template `type: Event` is canonicalized into one `_type` (no duplicate key), and that every hostile title and location reads back identically through both parsers.
- [~] **Overlay rules.** The tested rules are met (test:507-582), including "+1 does not prune, +2 prunes" (test:571-576). Two problems remain:
  - An `update` whose path is not in the snapshot is dropped instead of overlaid. With the rename flow that tickets 17 and 24 build on top of this function, a renamed event disappears (finding 2).
  - The `+2` fallback is tested only for `update` (finding 4).
- [x] **Other exports.** Met: `formatEventTime` (1440 gives `24:00`), `eventState` / `sameEventState`, `resolveEventTypeName` and `eventColorStyle` (test:480-505).
- [x] **Fixture.** Met.
  - `eventEntry` is built on `entryV2` and sets `isA` with Rust's casing.
  - The fixture follows the Rust contract pinned in ticket 03: a bare key is `null` and `""` is `''`. The ticket text's "`''` for empty keys" is wrong (see ticket 03 review, finding 1). The fixture follows the pinned truth, and `parseEventTime` treats both as absent.
  - `eventNote` and `SEED_EVENTS` (no `requestId`, no ev-14, `1:1 with manager` kept) are present.
  - `Room #4` goes through `applyEventDraft`, then `eventEntryFromContent`, then `entryToEvent`, and gives an event (test:457-463). That path is stronger than the ticket asks for, because it parses the written content.
- [x] **Extra test coverage list.** Met. Every listed case is present (see the line references above).
- [ ] **Gate green; one commit in the full format.** The commit part is met: 3320c134 has Context, Problem, Solution, Behavior, Files with line ranges, and the trailer. The full gate is left to the deliver step.

Layer rules: the module is pure, in `features/`, and imports only `core/settings` logic and other features' logic, as the plan sanctions. Error handling and the performance guidelines do not apply. There is no scope creep: only the three Touches files plus scratch docs changed.

## Findings

1. **Minor (correctness): `applyEventFields` can leave a timed patch on an all-day note.** At `src/lib/features/event-calendar/event-calendar-event.logic.ts:262-269`, `all_day` is removed only when `patch.allDay === false`. A patch with `start` / `end` and no `allDay`, applied to a note that has `all_day: true`, writes `start`/`end` and keeps `all_day: true`. The read side then still shows the event as all-day (logic:149), so the move has no visible effect. `prunePending` also never matches by state (the pending `allDay: false` differs from the snapshot), so the change reverts after `+2`. The ticket says `all_day: true` is written "only for all-day events, and removed otherwise".
   - **Fix:** treat a patch that sets `start` or `end` with `allDay !== true` as timed, and delete `all_day` in that branch too. Deleting an absent key is a no-op, so `resizeEvent(path, end)` (ticket 24) is unaffected. Add a test: base `[{ all_day: true }]` with patch `{ start: 540, end: 600 }` gives `start`/`end` and no `all_day`.

2. **Major (correctness, cross-ticket): `mergePending` drops an `update` whose path is not in the snapshot, so a renamed event vanishes.** At `src/lib/features/event-calendar/event-calendar-event.logic.ts:388-392`, updates are applied only to snapshot events, and the JSDoc (logic:370-371) makes the drop deliberate.
   - Ticket 17 keys `pending` by path and has `remapPath(from, to)` leave a `delete` tombstone at `from`. Ticket 24's `editEvent` renames, calls `remapPath`, then `putPending(update at to)`. Until the index catches up, the input is: snapshot `[from]`, pending `{ from: delete, to: update }`.
   - The probe confirms that this returns `[]`. The event disappears for up to one throttled version bump (about 2 s, and up to 10 s during a burst). Ticket 17 cannot meet its own criterion ("after `remapPath` and before the snapshot updates, `events` holds exactly one entry for that event") through this function without rewriting the pending kind.
   - **Fix:** in `mergePending`, render an update whose path is absent from the snapshot as `{ path, ...state, snippet: '', readOnly: false, pending: true }`, the same as a create. A stale ghost of an externally removed note is then bounded by the existing `+2` prune fallback.
   - Update the JSDoc, and replace the test "ignores an update for a path the snapshot does not have" (test:522-524) with one that expects the synthesized event. Add a rename-shaped case: delete at `a`, update at `a2`, snapshot `[a]` gives exactly one event at `a2`.
   - If you prefer to keep the drop, record in `.scratch/calendar-feature/issues/17-event-calendar-data-store.md` that `remapPath` / `putPending` must keep a `create` carrying the full event at `to`. Do not leave the gap implicit.

3. **Minor (classification): the trailing-comment check misses `\t#`.** At `src/lib/features/event-calendar/event-calendar-event.logic.ts:135`, the check is `value.includes(' #')`. YAML treats any whitespace before `#` as a comment, and Rust keeps it in the value. The probe shows that `date: 2026-11-10\t# x` is reported as `unscheduled` / `not-a-day`, the informational, non-actionable bucket, instead of the actionable `trailing-comment`.
   - **Fix:** use `/\s#/.test(value)`. Add one tab case to the test at test:220-225.

4. **Minor (test gap): the `+2` fallback is tested only for `update`.** At `src/tests/lib/features/event-calendar/event-calendar-event.logic.test.ts:571-581`, the ticket says "any other settled entry prunes only once `version >= settledAtVersion + 2`". That fallback is the path that covers auto-move and vanished paths (plan Task 6), but no test covers it for `create` or `delete`.
   - **Fix:** add two cases. A settled `create` whose path never appears stays at `+1` and prunes at `+2`. A settled `delete` whose path stays present stays at `+1` and prunes at `+2`.

5. **Nit (output shape): extra blank lines between the notes and the template body.** At `src/lib/features/event-calendar/event-calendar-event.logic.ts:307`, `extractBody` keeps the template's leading newline. Notes `Hi\n` on the template body `\n## Agenda\n` give `Hi\n\n\n\n## Agenda\n`.
   - **Fix (optional):** join `draft.notes.replace(/\n+$/, '')` and `templateBody.replace(/^\n+/, '')` with `\n\n`.

6. **Nit (process): the discovery comment's sha is not the discovery commit.** At `.scratch/calendar-feature/issues/07-event-note-schema-logic.md:87`, the discovery comment cites `0ace4d20`, the branch base, while the discovery commit is `84c91f63`.
   - **Fix (optional):** cite `84c91f63`.

Findings 1, 2 and 4 should be fixed before delivery. 3, 5 and 6 are cheap and optional.
