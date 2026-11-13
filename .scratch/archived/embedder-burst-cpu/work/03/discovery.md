# Discovery: 03 vault-index-updated refresh throttle

## Files that change
- `src/lib/core/layout/tauri-listeners.service.ts:140` (`debounce(refresh, 300)`), the
  listener at `:142-150`, teardown at `:151-155`, and the doc comment at `:88-111`
  (it describes the 300 ms debounce). Drop the `debounce` import (`:17`) once unused.
- `src/tests/lib/core/layout/tauri-listeners.service.test.ts:346-684`: the two
  `registerVaultIndexUpdatedListener` describes advance 300 ms; move them to the new
  windows and add the throttle cases.
- `src/lib/utils/debounce.ts`: untouched (acceptance criterion).

## Plan (smallest change)
Inline throttle in the listener, no new util (single use):
- constants `REFRESH_DELAY_MS = 2000`, `REFRESH_MIN_INTERVAL_MS = 10_000`;
  state `timer` and `lastRefreshAt` (starts at `-Infinity`).
- On event: store `latestVersion`; if a timer is pending, return (it reads
  `latestVersion` when it fires). Else arm a timer for
  `max(2000, lastRefreshAt + 10000 - Date.now())`.
- Timer fires: clear `timer`, set `lastRefreshAt = Date.now()`, run `refresh()`.
- Teardown: `clearTimeout(timer)` before unlisten.
Results: isolated event refreshes at +2 s; events 5 s apart refresh at 2, 12, 22 s
(10 s apart); any event with no timer pending arms one, so a trailing refresh always
follows the last event and bumps the last version.

## Prior-art tests
- Same file: `coalesces a burst into one snapshot fetch carrying the final version`,
  `cleanup cancels a pending debounced refresh`, `settleFanOut` helper, and
  `mockInvokeByCommand` to count `get_all_property_records`.

## Risks
- Save-driven bumps (typing pause, save) now land 2 s later instead of 300 ms: panels
  keyed on `vaultIndexVersion` lag 2 s after a local save. Accepted by the Issue.
- `Date.now()` under `vi.useFakeTimers()` advances with the fake clock (vitest fakes
  Date by default), so the interval math is testable.
- `fetchSeq` stays: with 10 s spacing out-of-order landings get rarer, not impossible.

## Defaults taken
- No `throttle.ts` util: one caller, the Issue allows inline.
- Docs that quote "300 ms-debounced" (CLAUDE.md Indexing 12, ADR 0025:184) are not in
  the Issue's Touches list; left as is and flagged for the human.
