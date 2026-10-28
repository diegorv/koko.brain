VERDICT: CHANGES_REQUESTED

# 57 review: Calendar keyboard shortcuts help

Reviewed `git diff main...HEAD` at `aaf833d1` (commits d58b8279, 13906d64, 2a5145b3, aaf833d1).

## Checks I ran

- `pnpm check`: 0 errors, 0 warnings (206 files).
- `vitest run src/tests/lib/features/event-calendar`: 18 files, 703/703 passed. The test verdict rests on:
  - `src/tests/lib/features/event-calendar/event-calendar-keys.logic.test.ts` (resolver `?` case, `CALENDAR_SHORTCUTS` drift tests, help-page tests)
  - `src/tests/lib/features/event-calendar/event-calendar-view.store.test.ts` (`helpOpen`, `isDialogOpen`, `closeTransient`, `reset`)
  - `src/tests/lib/features/event-calendar/EventCalendarView.test.ts` ("shortcuts help" block :661-740, lifecycle unmount test)
- Probe (temporary test file, deleted): popover open, then `?` opens the help over it; Escape closes only the help, the popover stays, focus returns to the event block and `m` works again. Focus on `<body>`, then `?` opens the help through the document fallback. The dialog's X button closes it, clears `helpOpen` and returns focus to the root.
- Mutation probes (source restored with `git checkout`, tree clean afterwards), running the two test files above:
  - M1: dropped `'Backspace'` from the `delete` row of `CALENDAR_SHORTCUTS`. **66/66 tests still pass**, and the dialog no longer lists Backspace.
  - M2: added `if (key === 'j') return { kind: 'step', dir: 1 };` to `resolveCalendarKey`. **66/66 tests still pass**, and the new key is in neither the dialog nor the help pages.

## Acceptance criteria

- [x] **Dialog opens from a key and from a header button, closes on Escape, restores focus.** Met. `?` resolves to `help` (`event-calendar-keys.logic.ts:105`), and `EventCalendarView.svelte` calls `openHelp()`. The header button is in `EventCalendarHeader.svelte:78-95`. Escape closes the bits-ui Dialog, `onOpenChange` calls `closeHelp()` and focus returns to the element that had it before. Tests: `EventCalendarView.test.ts:679` (opens with `?`, focus inside), `:696` (Escape returns focus to the root), `:711` (button opens it, Escape returns focus to the button). My probes confirm the popover and `<body>` cases.
- [ ] **Content generated from the key table; a test fails if a shortcut is missing from the dialog or from either help table.** Partly met. The dialog renders `CALENDAR_SHORTCUTS` (`EventShortcutsDialog.svelte:19`), and `:679` checks that the rendered rows equal the table. Every table chord is checked against both help sections (`event-calendar-keys.logic.test.ts` `it.each`). The gap is the link from the resolver to the table: it is checked only one way, plus a check by action kind. A shortcut the resolver handles but the table leaves out fails no test (M1, M2 above). Because the table is a separate hand-written list next to the resolver's branches, that is exactly the drift the Issue asks a test to catch. See finding 1.

## Findings

1. **Major** (`src/tests/lib/features/event-calendar/event-calendar-keys.logic.test.ts:165`). The drift tests only check table → resolver (`:156`) and "every action kind has a row" (`:165`). A key the resolver handles that has no chord in its kind's row passes everything, so it would be missing from the dialog and from both help pages. Proven by M1 (drop `Backspace` from the table) and M2 (add `J` to the resolver): both stay green. **Fix:** add the reverse test. Enumerate candidate presses: printable ASCII `0x20`-`0x7e` plus `ArrowLeft/Right/Up/Down`, `Delete`, `Backspace`, `Escape`, `Enter`, `Tab`, `Home`, `End`, `PageUp`, `PageDown`. Try each under the modifier sets {none, Shift, Cmd, Cmd+Shift, Ctrl, Ctrl+Shift, Alt}, with `state({ popoverPath: '/v/a.md' })`. For every press that resolves to an action, assert that the row for `action.kind` has a chord which `chordToKey` turns into the same press: lowercased key, plus `metaKey` / `ctrlKey` / `altKey`, plus `shiftKey` only when Cmd or Ctrl is held, because the resolver ignores Shift on bare keys. Then M1 and M2 must both go red. Another way would be to build the resolver from the table, but that touches the ticket-31 resolver more than needed. The reverse test is enough.
2. **Low** (`src/lib/features/event-calendar/EventShortcutsDialog.svelte:19`). `{#each CALENDAR_SHORTCUTS as row (row.action)}` keys the rows by action kind, but nothing makes kinds unique. The kind test compares a `Set`, so duplicates pass. A future second row with the same kind would throw Svelte's `each_key_duplicate` at runtime when the help opens. Today's 9 rows are unique, so this is latent. **Fix:** key by `row.keys.join(' ')`, or add `expect(new Set(kinds).size).toBe(CALENDAR_SHORTCUTS.length)` to the table tests.
3. **Nit, optional** (`help/documentation/20-keyboard-shortcuts.md:62`, `help/documentation/27-calendar.md:173`). The intro still says the shortcuts are off "while the event dialog is open". They are now also off while the shortcuts help is open. It is harmless because the help is modal, but "while a dialog is open" would be exact. No change required.

## Other checks (no finding)

- Layer rules: the logic file has no framework import. The test reads the help docs with `node:fs`, which only happens in the test. The store has getters only, with no `$derived`. The new getter `helpOpen` and the changed `isDialogOpen` are both tested.
- `closeTransient` and `reset` clear `helpOpen`. Both are tested in the store and in the view lifecycle test.
- No global `?` binding in `src/lib` conflicts with the new key.
- Scope: `e2e/event-calendar.spec.ts`, the projection logic, `EventMonthGrid.svelte` and `EventAllDayLane.svelte` are untouched. Nothing outside the Issue.
- No third hand-written copy of the shortcuts: the docs got only the new `?` row and a mention of the button.
