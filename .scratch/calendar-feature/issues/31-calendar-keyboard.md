# 31: View-scoped keyboard shortcuts, global toggle and undo feedback

**What to build:** the Calendar tab gets the prototype's keyboard shortcuts (`keyboard-shortcuts.tsx`). With the view focused (or focus lost to `<body>`), T jumps to today, D/W/M switch views, the arrows step the range, N starts a new event, Delete removes the focused or popover event, Escape closes the popover or cancels a drag, and Cmd+Z / Shift+Cmd+Z / Ctrl+Y undo and redo calendar changes. Every undo or redo reports its result in a toast. Letter keys never fire while the user types in an input, while Meta, Ctrl or Alt is held, or while the dialog is open. A global Cmd+Shift+C (or Cmd+Shift+Y, per the Task 1 (e) answers in tickets 01 and 02) toggles the Calendar tab from anywhere in the app, and yields to a user's own `cycleSidebarView` binding on the same combo.

**Plan reference:** Task 30 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 704-745). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 02, 30

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/event-calendar-keys.logic.ts` (new)
- `src/lib/features/event-calendar/EventCalendarView.svelte` (modify)
- `src/lib/core/keybindings/global-keybindings.ts` (modify)
- `src/lib/core/keybindings/keybindings.logic.ts` (modify)
- `src/lib/features/command-palette/command-palette.service.ts` (modify)
- `src/tests/lib/features/event-calendar/event-calendar-keys.logic.test.ts` (new)
- `src/tests/lib/features/event-calendar/EventCalendarView.test.ts` (modify)
- `src/tests/lib/core/keybindings/global-keybindings.test.ts` (modify)
- `src/tests/lib/core/keybindings/keybindings.logic.test.ts` (modify)
- `src/tests/lib/features/command-palette/command-palette.service.test.ts` (modify)
- `e2e/specs/event-calendar.spec.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts e2e/specs/keyboard-shortcuts.spec.ts e2e/specs/command-palette.spec.ts`

- [ ] `event-calendar-keys.logic.ts` exports `isTypingTarget(el)` (INPUT, TEXTAREA, SELECT or `isContentEditable`) and `resolveCalendarKey(e, state)` covering T, D/W/M, ArrowLeft/ArrowRight (ignored when `state.targetInTablist`), N, Delete/Backspace, Escape, Cmd+Z, Shift+Cmd+Z and Ctrl+Y; single letters are ignored while Meta, Ctrl or Alt is held and while the dialog is open, checked against store state, not DOM probes. `event-calendar-keys.logic.test.ts` covers it, including arrows ignored inside the tablist
- [ ] The `EventCalendarView` root handles `onkeydown` and focuses itself on mount; no bare key goes through `registerKeybinding`. While the view is mounted a `document` keydown listener forwards to the same handler only when `event.target === document.body`, and the effect cleanup removes it, so no key is handled twice
- [ ] Undo feedback toasts: "Undone: <label>" with a Redo action, "Redone: <label>" with an Undo action (actions gated on the Task 1 (b) answer from ticket 01, and they focus the root when they finish), "Nothing to undo" / "Nothing to redo", a refusal shows "Event changed since; not undone" with "Open note", and `vanished` shows "Event was moved or renamed outside the calendar; cannot undo"
- [ ] The global toggle uses the combo the Task 1 (e) answers settled (tickets 01 and 02: Cmd+Shift+C, else Cmd+Shift+Y), is registered in `global-keybindings.ts` next to Cmd+Shift+T, calls `toggleEventCalendarTab`, and returns early when `matchesKeybinding(e, settingsStore.keybindings.cycleSidebarView)`; the existing `cycleSidebarView` listener is untouched
- [ ] `RESERVED_KEYBINDINGS` has a "Toggle Calendar" entry and the palette command `event-calendar:toggle` carries the `shortcut`; `keybindings.logic.test.ts` covers the conflict lookup and `command-palette.service.test.ts` covers the shortcut label
- [ ] If ticket 02 recorded that the native Edit menu swallows Cmd+Z, the palette commands "Calendar: Undo" / "Calendar: Redo" exist instead and the `command-palette.service.test.ts` count rises by 2
- [ ] `global-keybindings.test.ts`: the count at `:130-136` goes from 20 to 21 and the cleanup array at `:260` from 19 to 21 (fixing the existing off-by-one); with the event-calendar service not mocked, the captured handler opens the tab (`editorStore.activeTab?.path === EVENT_CALENDAR_VIRTUAL_PATH`, `fileType === 'event-calendar'`) and a second call removes it; with `cycleSidebarView` set to Cmd+Shift+C the handler leaves the tabs unchanged. These tests are written first and fail (C10)
- [ ] `EventCalendarView.test.ts`: Cmd+Z with an empty stack shows "Nothing to undo" through the mocked `svelte-sonner`; after Escape on an open popover `document.activeElement` is the block and `w` switches to week; with focus on `document.body` `m` switches to month, and with focus in an `<input>` it does not
- [ ] E2E in `event-calendar.spec.ts`: after opening via the palette, `m` without a click shows the month grid and `w` / `d` switch the grid; after dragging a block, Meta+Z restores the original `start:` in `window.__e2e.fs.readFile` and Meta+Shift+Z re-applies the moved value; Delete on a focused block removes it and the toast Undo (or Meta+Z when Task 1 (b) is a "no") brings it back; Escape closes an open popover
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)
