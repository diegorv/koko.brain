VERDICT: CHANGES_REQUESTED

# 21 review: Calendar tab with header, Needs attention and palette toggle

Reviewed `git diff main...HEAD` (058dc97a, 45cd1679, fc00e26b) against the Issue, plan Task 20 (`plan-2026-10-28.md:902-939`), D26 and CLAUDE.md.

## What I ran myself
- `pnpm check`: 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/event-calendar src/tests/lib/features/command-palette src/tests/lib/core/editor src/tests/lib/core/markdown-editor`: 118 files, 1936/1936 passed.
- `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts`: 3/3 passed.
- Temporary probe tests (deleted, not committed) built on the `EventCalendarView.test.ts` setup:
  - mount, unmount, mount while one `get_all_vault_entries_v2` is in flight, then reject it: `toast.error` called **2** times for 1 IPC failure.
  - mount, `resetEventCalendar()` (same vault path), then reject the in-flight load: `toast.error` called **1** time while `eventCalendarStore.loadError` is `null` (the service treated the load as superseded).
  - mount, unmount, `setNow(0)`, advance fake timers 61 s and dispatch `focus`: `nowMs` stays 0, so the release does run on unmount.

The test verdict rests on `src/tests/lib/features/event-calendar/EventCalendarView.test.ts`, `src/tests/lib/features/command-palette/command-palette.service.test.ts`, the existing `src/tests/lib/features/event-calendar/*` suites and `e2e/specs/event-calendar.spec.ts`.

## Acceptance criteria
- [x] **View root, load effect, clock effect.** Met. `EventCalendarView.svelte:53` is `<section tabindex="-1">` and `:54` is `Tooltip.Provider delayDuration={400}`. The effect at `:23-43` reads all six values, then `untrack(() => loadEvents().catch(...))`. The clock effect at `:46` returns the release (my probe confirms it releases on unmount). The superseded-load guard inside the `.catch` is incomplete; see finding 1.
- [x] **closeTransient cleanup, three states.** Met. `:50` runs the cleanup. `:57-65` show "Indexing vault...", the inline `loadError` (`role="alert"`) and the placeholder. Tests cover all three.
- [x] **Header.** Met. `EventCalendarHeader.svelte` shows the title and subtitle on two lines and has a Today button. Prev/next are ghost `icon-sm` `Button`s with lucide chevrons and tooltips through the `child` snippet, the same as `SidebarModeToggle.svelte:19-31`. The tablist has `aria-label="Calendar view"`, and each tab has `role="tab"`, `aria-selected`, `aria-keyshortcuts` D/W/M and a roving tabindex. ArrowLeft/ArrowRight wrap and move focus (tested).
- [x] **Needs attention.** Met. The badge counts `attentionCount`. Each row shows its reason, and the reason map covers every actionable `EventIssueReason`. "Unscheduled (N)" is a closed `<details>`, with the hint chosen by `detail` (`no-date` / `not-a-day`, matching `event-calendar-event.logic.ts:139-140`). With 0 actionable issues only a quiet "N unscheduled" button shows. The archived footer appears when `archivedCount > 0`, and rows call `openFileInEditor`. The `(issue.path)` keys are unique because `entryToEvent` emits at most one issue per entry.
- [x] **EditorView / EditorTabs wiring.** Met. Import at `:19`, flag at `:35`, branch at `:57-58`. `calendar-range` icon at `EditorTabs.svelte:9,55-56`, a lucide import only.
- [x] **Palette entry and test.** Met. `event-calendar:toggle` "Toggle Calendar View" sits right after `tasks:toggle`. The count goes 26 -> 27, and the toggle test runs the real service with only `invoke` mocked: open gives the virtual path and `fileType`, a second run removes the tab. The service's chain imports neither `editor.service` nor `fs.service`, so those factories need nothing new. The "fail first" order cannot be verified from the history because it is one commit; I accept the build report on that.
- [x] **Pre-Change Checklist C7.** Holds. The palette entry writes only `editorStore` tabs through `toggleEventCalendarTab`. `EditorView` only reads `activeTab`. The view's cleanup writes only the view store.
- [x] **clockTime fixture.** Met. `test-vault.ts:154-168`: `[undefined, { option: true }]`, and `page.clock.install` runs before `populateAndOpenVault`. Other specs do not change.
- [x] **View test contents.** Met: jsdom docblock, `mount` / `flushSync` / `unmount`, the ResizeObserver stub, title/subtitle, tablist roles and `aria-selected`, an issue row with its reason, and 50 unscheduled + 1 invalid giving badge 1 with "Unscheduled (50)" closed.
- [x] **Re-projection and transient reset tests.** Met. When `defaultDurationMinutes` goes 60 -> 30, `end` goes 600 -> 570 with one IPC. openPopover/openDialog, then mount/unmount/mount, leaves both null.
- [x] **E2E spec.** Met. `test.use` sets the clock and timezone, seeding uses `fs.populate` plus `vault-index-updated` with `__e2e.vaultIndex.version`, the header shows "November, 2026" / "Week 46", the invalid `start` note is under Needs attention with its reason, the dateless note appears only under Unscheduled, and the row click checks the tab title and the editor text. 3/3 passed locally.
- [ ] **Gate green; one commit in the full format.** Not met yet: the gate belongs to deliver. The feat commit has Context, Solution, Behavior and Files with line ranges, and the line ranges are correct.

## Findings

1. **Medium: `src/lib/features/event-calendar/EventCalendarView.svelte:14,33,37`. The superseded-load toast guard only knows about this component instance.** `loadSeq` is instance state, and the guard compares it plus `vaultStore.path`. It cannot see what the service treats as superseded (`event-calendar.service.ts:42`, `loadToken`), which ticket 19's comment asks the view to respect ("toast only when the failing load is still the current one"). Both probes confirmed:
   - (a) Tab switch away and back while a load is in flight: the IPC fails once and the user gets **two** toasts. The unmounted instance's closure still sees itself as "latest", and the memo shares the rejected promise with the new load.
   - (b) A `resetEventCalendar()` on the same vault path, such as an `initializeVault` re-entry: the toast fires while the inline state shows no error (`loadError === null`).

   The commit message's claim that "a load superseded by a newer one ... stays silent" is therefore only true within one mount.

   Fix: decide currency from shared state. One option is to move the counter into `<script module>`, so every mount shares it, and also require `eventCalendarStore.loadError !== null`, which the service sets only for a current failure. The other is to have the service expose whether a given load is still current. Add tests for (a) and (b) to `EventCalendarView.test.ts` next to the existing "does not toast for a load that a newer load replaced" (`:219`).

2. **Low: `src/tests/lib/features/event-calendar/EventCalendarView.test.ts:314`. No test pins that the view releases the clock on unmount.** "holds the clock while mounted" only checks the acquire. If the view's effect at `EventCalendarView.svelte:46` dropped its return value (`$effect(() => { untrack(() => acquireCalendarClock()); })`), it would leak the interval and the `focus` / `visibilitychange` listeners, and every test would still pass. The criterion requires "uses the release as its cleanup".

   Fix: add a fake-timer test: mount, unmount, `setNow(0)`, advance past `CLOCK_INTERVAL_MS`, dispatch `focus`, and expect `nowMs` to still be 0. My probe shows the current code passes this.

## Notes (no change requested)
- The build report says this already: the explicit `defaultDurationMinutes` / `defaultColor` / `eventTypeName` reads are subsumed by reading `settingsStore.eventCalendar`, so no test fails if one of them is removed. They stay because the criterion names them.
- `aria-keyshortcuts` advertises D/W/M before ticket 31 binds those keys. The criterion asks for it now.
- `eventCalendarViewStore.focusedDate` is "today at module load" (from ticket 18). A Calendar opened days after launch, with no vault re-open, starts on the old week until Today is pressed. That belongs to the view store's design, not this diff.
