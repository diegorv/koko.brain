# 03: vault-index-updated refresh coalesced during bursts

**What to build:** Every `vault-index-updated` event goes through a 300 ms trailing debounce (`src/lib/core/layout/tauri-listeners.service.ts:140`). With burst files arriving ~5-10 s apart, each file triggers a full `refresh` (`:121-139`): `bumpVaultIndexVersion`, `buildPropertyIndex` (`get_all_property_records` over ~10k notes, ~123 ms in the 2026-10-27 log, 198 runs in one session), `getVaultEntries`, and every panel `$effect` keyed on `vaultIndexVersion`. Replace the debounce on this listener with a throttle: an isolated event (no refresh in the last 10 s) refreshes ~2 s after it arrives; while events keep coming, refreshes run at most once every 10 s; a trailing refresh always runs after the last event, so the latest `latestVersion` wins.

**Decision (2026-10-28):** the first spec (2 s debounce + 10 s `maxWait`) could not coalesce events 5 s apart; the 2 s trailing window fires before each next event. The user chose this throttle (option C in the first attempt's discovery notes). Do not add `maxWait` to `debounce.ts`.

**Constraint:** `applyNoteChange` and its per-source policy are untouched. Panels may lag up to 10 s after external changes during a burst; CLAUDE.md Indexing 12 already allows a stale snapshot until the next bump. Teardown (`cancelled` / unlisten) must cancel any pending refresh.

**Blocked by:** None (independent of 01/02, frontend only)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/layout/tauri-listeners.service.ts` (modify; line 140)
- a throttle helper: inline in the listener, or a new `src/lib/utils/throttle.ts` only if it is generic and tested (none exists today)
- `src/tests/lib/core/layout/tauri-listeners.service.test.ts` (update) and a test for any new util

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

- [ ] `debounce.ts` unchanged
- [ ] Listener test with `vi.useFakeTimers()`: N events 5 s apart produce fewer than N `get_all_property_records` invocations, and the final bumped version equals the last event's version
- [ ] A single isolated event refreshes ~2 s after it arrives
- [ ] During continuous events, refreshes are at least 10 s apart and a trailing refresh follows the last event
- [ ] Teardown cancels a pending refresh (no IPC after unlisten)
- [ ] Gate green; one commit in the full CLAUDE.md format

## Comments
- 2026-10-28 11:59 — discovery — inline throttle (2 s first delay, 10 s min interval, trailing) in the listener; no new util; plan in work/03/discovery.md — 09411068
- 2026-10-28 12:01 — implement — inline throttle in registerVaultIndexUpdatedListener + tests; pnpm check 0 errors, touched tests 150/150; CLAUDE.md Indexing 12 and ADR 0025:184 still say "300 ms-debounced" (left for the human) — 32ee0c80
- 2026-10-28 12:04 — review — CHANGES_REQUESTED: Tasks-view toggle feedback now lags 2-10 s (toggleTask must refetch); backward wall-clock jump stalls refresh (cap wait at 10 s); ADR 0025:184,202 still say 300 ms (CLAUDE.md:289 left for the human) — 2d721e05
