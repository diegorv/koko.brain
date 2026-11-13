# Issue 254 discovery

## Part 1: tab-strip scroll e2e (`e2e/specs/tabs.spec.ts:42-71`)

Reproduced on main (1 of 1 run, `--retries=0`): active tab right edge 550.1875 vs strip right 550.

Evidence from a temporary probe in the test (not committed), at DPR 1:

- strip: left 331.953125, width 218.046875 (clientWidth 218), scrollWidth 1108, scrollLeft 886
- active tab (Welcome, last): right 550.1875, so its right edge in scroll coordinates is
  550.1875 - 331.953125 + 886 = 1104.234375, and full containment needs scrollLeft 886.1875
  (max scrollLeft is 890, so no clamp)
- setting `el.scrollLeft = 886 + 0.1875` reads back `886`: Chromium snaps the scroll offset to
  whole device pixels

The app does no rounding: `EditorTabs.svelte:37-41` calls
`scrollIntoView({ block: 'nearest', inline: 'nearest' })` and the browser picks the offset.
The fractional tab widths (e.g. 154.125) come from text layout. So the cause is layout
rounding: the overhang is under one device pixel (at most 1 px at DPR 1) and not visible.

Plan: compare both edges with a 1 px tolerance and say why in a comment next to the
assertions. A broken scroll leaves the tab hundreds of px off-strip, so the test still fails
on it. No app change, so the "test that fails before the scroll fix" criterion does not apply.

## Part 2: `AutoOrganizeRuleRow.test.ts:999-1007`

The count is a synchronous `$derived` (`AutoOrganizeRuleRow.svelte:97`); the only async step is
the `setTimeout(..., COUNT_DELAY_MS)` debounce at `AutoOrganizeRuleRow.svelte:92-96`. There is no
promise to resolve. The test waits for the real 300 ms timer with `vi.waitFor`, which times out
under load.

Plan: fake `setTimeout`/`clearTimeout` only (prior art: `CalendarNavigator.test.ts:184`,
`toFake` list, restored in `afterEach`), installed before `render` so the mount's timer is fake
too. Assert the count is hidden after typing, then `vi.runOnlyPendingTimers()` + `flushSync()`
and assert `Matches 1 note now`. Same assertions, no real-time wait. Restore real timers in an
`afterEach` of the `match count` describe.

## Risks

- Faking only the two timer functions leaves promises and Svelte's `tick` real, so `settle()` is
  unchanged.
