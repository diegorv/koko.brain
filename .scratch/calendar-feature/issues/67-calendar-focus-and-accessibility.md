# 67: Calendar focus and accessibility polish

**What to build:** focus handling and accessible names in the Calendar. Split out of the former ticket 64 (Calendar polish from the post-merge adversarial reviews). Items are low severity as recorded; line anchors are as recorded at review time and may have drifted, so re-locate them on main first.

**Blocked by:** None

**Status:** ready-for-agent

Ticket 26 review (fix ed15a49c):
- [ ] `FOCUSABLE` (`:24`, now `:32`) matches `[tabindex]`, so a `tabindex="-1"` wrapper takes focus after an outside click; exclude `-1` or skip when `document.activeElement` is already outside the popover.

Ticket 29 review (fix 5c14e82d):
- [ ] The delete toast Undo (`event-calendar.service.ts:1019`, now `:1023`) focuses `document.querySelector('[data-event-calendar]')`, the first Calendar root in the DOM, so with two mounted views it can focus the wrong one (focus only).

Ticket 41 review (fix 03026a54):
- [ ] A span segment block's aria-label reads its clipped day range (e.g. `00:00 – 24:00`) instead of the full event range; the block only receives the clipped segment, so the label needs the full range passed down.

Ticket 59 review (fix f1504724):
- [ ] The post-drop click swallow (`event-calendar-day-drag.svelte.ts:69`) filters on `detail === 0`; an assistive-tech click with `detail >= 1` and no prior `pointerdown` in the area is eaten once if a drop outside the area or an Escape/pointercancel left the flag armed. Unconfirmed for VoiceOver.
- [ ] The comment at `:60-67` says "the next press in the area resets the flag"; a press outside the area does not. Reword.

## Comments

- 2026-10-28 21:28 — discovery — four items located on main, plan in work/67/discovery.md — 47b8e4f2
- 2026-10-28 21:33 — implement — all four items fixed test-first (popover FOCUSABLE, toast focus liveRoot, span segment label, day-drag swallow); pnpm check 0 errors, event-calendar vitest 957/957 — 2e0d1b75
- 2026-10-28 21:37 — review — CHANGES_REQUESTED: FOCUSABLE now skips tabindex="-1" surfaces outside the Calendar (focus stolen back from another pane, Medium); pointercancel leaves a pointerup listener that can still arm the swallow (Low) — ad0ef6c3
- 2026-10-28 21:41 — fix — review findings 1 and 2 fixed test-first (own-root tabindex="-1" fall-through; pointercancel arms nothing); finding 3 filed as issue 74; event-calendar vitest 959/959, pnpm check 0 errors — 5632bb89
