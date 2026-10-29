VERDICT: APPROVED

# 74 review: time grid click swallow eats only its own release's click

Reviewed `git diff main...HEAD` (9a629a2f, a323dfff, be003422) against Issue 74, the DayDrag template (`event-calendar-day-drag.svelte.ts:33-149`) and CLAUDE.md.

## What I ran

- `pnpm vitest run src/tests/lib/features/event-calendar/`: 24 files, 983/983 passed.
- `pnpm check`: 0 errors, 0 warnings.
- Red probe: main's `EventTimeGrid.svelte` with the branch's tests. 8 of the 10 new tests fail, all as expected: the four `pointercancel` / `lostpointercapture` x detail 0/1 cases, the stray pointerup, the keyboard click while armed, the click outside the body and the press anywhere. The two guards (a moved block's release click, the release click after an Escape discard) pass on main, which is correct.
- Mutation probes on the fix, each reverted with `git checkout HEAD --`:
  - The release after a discard arms nothing: 4 tests fail (the Escape guard and three focus-leaving tests).
  - `handlePointerUp` arms nothing: 1 fails (moved block).
  - `handleClickOutside` does nothing: 1 fails.
  - No window `pointerdown` disarm: 1 fails.
  - The days-change effect passes `false`: none fail (finding 1).
  - Unmount skips `disarmSwallow`: none fail (finding 2).
  - Arm only on a moved release (`if (drag.moved) armSwallow()`): none fail, across all 983 tests (finding 3).

My test verdict rests on `src/tests/lib/features/event-calendar/EventTimeGrid.test.ts` (new describe "click swallow after a gesture", plus the "keys during a gesture" and "focus leaving the calendar mid-gesture" describes) and on the full `src/tests/lib/features/event-calendar/` run, which includes `EventPopover.test.ts` and `EventDialog.test.ts`, the two other suites that mount the time grid.

## Acceptance criteria

- [x] **Met.** A test that fails today: `pointercancel` mid-gesture, then a `detail: 0` click on a block, does not open its popover. Covered by `EventTimeGrid.test.ts:687-701` (`['pointercancel', 0]`), which fails on main (red probe) and passes on the branch.
- [x] **Met.** A test that fails today: `pointercancel` mid-gesture, then a `detail: 1` click with no press on a block, does not open its popover. Covered by `EventTimeGrid.test.ts:687-701` (`['pointercancel', 1]`), same evidence. The lost-capture variants are covered by the same `it.each`.
- [x] **Met.** After the fix both open the popover, and the click after a moved block or after an Escape-discarded gesture is still swallowed. Evidence: `:714-724` (moved block, `popover` null, `moveEvent` called once) and `:726-738` (Escape, then release, then a `detail: 1` click; `popover` null). Mutating out either arm makes these tests fail.
- [x] **Met.** Issue body: "A `pointercancel` (or lost capture) arms nothing". `EventTimeGrid.svelte:292` passes `false`, and `:703-712` shows that a later stray `pointerup` arms nothing either.
- [x] **Met.** Issue body: "a keyboard (`detail === 0`) click still acts". `EventTimeGrid.svelte:301`, test `:740-749`, which passes even while the swallow is armed.

## CLAUDE.md checks

- Layer rules: one component, inside its feature. No new imports.
- Tests: the changed source file has a matching test change. The stores are real, and only `moveEvent` / `resizeEvent` are mocked (pre-existing).
- Tabs: every added line is tab-indented.
- Scope: the diff matches the Issue and the discovery plan. No scope creep.
- Design: the code mirrors `DayDrag` (`#arm` / `#disarm` / `#clickOutside` / `#releaseAfterDiscard`). There is one deliberate difference, commented at `EventTimeGrid.svelte:243-245`: the time grid arms on every release, not only a moved one. This matches main, which set `swallowClick = true` on every release.
- Window listeners: two adds per release and removal on disarm or unmount. The cost is negligible.

## Findings

1. **Low: the days-change discard arming on release is untested.** `src/lib/features/event-calendar/EventTimeGrid.svelte:286`. The diff changes this path: before, the swallow armed immediately; now it arms on the release still to come. Flipping it to `discardGesture(false)` passes every test. **Fix:** add a test that changes `days` mid-gesture, then releases and clicks a block with `detail: 1`, and asserts no popover opens. Changing the prop needs a reactive props object, for example a `$state` props object created in a small `.svelte.ts` helper, or a wrapper component.
2. **Low: the unmount cleanup is untested.** `src/lib/features/event-calendar/EventTimeGrid.svelte:91-94`. Replacing it with `return endGesture` passes every test. The build report saw this too: a type-only assertion is also satisfied by `DayDrag.reset`. **Fix:** spy on `window.addEventListener`, arm the swallow with a moved drop, and record the function the grid adds for `'click'` with capture `true`. Unmount, then assert that `window.removeEventListener` was called with that same function reference.
3. **Low: nothing covers arming on every release (not only a moved one).** `src/lib/features/event-calendar/EventTimeGrid.svelte:243-245`. Changing it to `if (drag.moved) armSwallow()` passes all 983 tests. The behavior is unchanged from main, but the comment's claim ("its click must not act a second time") is unguarded. **Fix:** add a test for a plain press and release on a block. Attach a bubble-phase `click` listener to the block, dispatch the release's `detail: 1` click, and assert that the popover is open and the listener never fired.
4. **Info: residual risk, no action in this Issue.** `src/lib/features/event-calendar/EventTimeGrid.svelte:146-150`. If a release produces no click at all, the swallow stays armed until a press anywhere or a click outside the body, and a later assistive-tech click (`detail >= 1`, no press) on a block in the body is still eaten. One way this could happen: the move preview destroys the pressed block's element, and the engine then does not dispatch a click. I did not verify this engine behavior. `DayDrag` has the same window, and issue 67 accepted it. The Issue's criteria do not require closing it. If it ever matters, fix both surfaces together in a follow-up, for example by also disarming on a `setTimeout(0)` after the release.
5. **Info: discovery commit message.** 9a629a2f gives `discovery.md` lines 1-38, but the file has 27 lines. The commit is already in history. No action; do not rewrite it.

## Resolution

1. Fixed. `EventTimeGrid.test.ts` "swallows the click of the release after the days change mid-gesture" mounts the grid with `$state` props (`src/tests/fixtures/reactive-props.svelte.ts`), hides the weekend mid-drag, releases and clicks Standup with `detail: 1`: no popover. The `discardGesture(false)` mutant fails it.
2. Fixed. "removes the swallow's window listeners when the grid unmounts while it is armed" records the capture `click` and `pointerdown` handlers added on a moved release, clears the `removeEventListener` spy (every disarm removes the same references, so earlier calls would satisfy the assertion), unmounts, and asserts both were removed. The `return endGesture` mutant fails it.
3. Fixed. "swallows the click of a plain press and release on a block, which opened the popover itself": the popover is open and a bubble-phase `click` listener on the block never fires. The `if (drag.moved) armSwallow()` mutant fails it.
4. Accepted as residual risk, no change (same window as DayDrag, issue 67).
5. No change; history is not rewritten.
