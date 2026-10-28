# 69: Calendar test gaps and consistency nits

**What to build:** close test-coverage gaps and small consistency nits found by the reviews; mostly tests, little product code. Split out of the former ticket 64 (Calendar polish from the post-merge adversarial reviews). Items are low severity as recorded; line anchors are as recorded at review time and may have drifted, so re-locate them on main first.

**Blocked by:** None

**Status:** ready-for-agent

Ticket 22 review (fix b3ffc1ef):
- [ ] `compositedTextColors` in `e2e/specs/event-calendar.spec.ts` (~41-59) folds the block opacity into the text color but not the background, and reads the background without its alpha, so contrast is mis-measured on a translucent block; no contrast assertion covers a pending block.
- [ ] The pending dashed border in `EventBlock.svelte:60` (now `:66`) takes 2px, so the `@max-[84px]` title-only switch triggers about 2px earlier for a pending block.
- [ ] The z-index clamp `10 + min(column, 9)` has only a style-string unit test, no E2E check of the layering against the now-line.

Ticket 26 review (fix ed15a49c):
- [ ] No view-level test covers retargeting; only the `EventPopover` mount tests and the E2E do.

Ticket 58 review (fix 269cfc1e):
- [ ] No view-level test asserts `document.activeElement` after an arrow key on a focused WeekStrip day; the focus-follow is only tested in `EventWeekStrip.test.ts` via a direct `setDate`. Add one to `EventCalendarView.test.ts`.

Ticket 59 review (fix f1504724):
- [ ] A chip dragged into a full month cell can hide behind "+N more" until dropped (see `work/59/review.md` Resolution).

Ticket 56 review (fix 0e187396):
- [ ] The focus effect's loaded check (`EventCalendarView.svelte:166-167`) ignores `storeProjectionKey` (theoretical: a settings change re-triggers the load).

E2E harness (found while fixing the issue 56 backlink spec, 81053434):
- [ ] `e2e/specs/sidebars.spec.ts` "backlinks panel populates for a note with incoming links" only checks that `/backlinks|linked mentions/i` is visible; the panel header satisfies it, so it passed while backlinks failed to render. Assert on an actual backlink entry.

Ticket 40 review (fix c987395b):
- [ ] `EventTimeGrid.svelte:278` still reads `settingsStore.eventCalendar.showTasks` in the template, unlike the `$derived` used in `EventCalendarView.svelte:199` and `EventMonthGrid.svelte:26`; no visible effect, align for consistency.
