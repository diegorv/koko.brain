# 69: E2E is red on main: five event-calendar specs emit `vault-index-updated` in the pre-Issue-65 shape

**What to build:** Issue 65 (squash 98ec341b) made the `vault-index-updated` listener in `src/lib/app/tauri-listeners.service.ts` (~:272-274) read `payload.fullRescan`, `payload.removed` and `payload.upserted`, the full `UpdateResult` shape (`src/lib/contracts/generated/UpdateResult.ts`). Every Rust emit site in `src-tauri/src/commands/vault.rs` sends that full shape, so the app is fine. But five E2E specs fake the event by hand with the old `{ changed, affected, version }` object (some with `as any`), and the listener throws `payload.removed is not iterable`:
- `e2e/specs/event-calendar.spec.ts:84, :237, :285, :353`
- `e2e/specs/event-calendar-day-drag.spec.ts:24`
- `e2e/specs/event-calendar-path-identity.spec.ts:20`
- `e2e/specs/event-calendar-tasks.spec.ts:20`
- `e2e/specs/event-calendar-focus.spec.ts:27`

The Nightly `E2E / Frontend (Playwright E2E)` job fails on main (run for 4692b8dc). `tasks-view.spec.ts:93` already emits `e2e.vaultIndex.update(p, c)`, the mock's real `UpdateResult`, and passes.

Fix: make every hand-made emit send a full `UpdateResult`, preferably by reusing `e2e.vaultIndex` (`e2e/mocks/vault-index.ts`) the way `tasks-view.spec.ts` does, and type the payload (drop the `as any`) so a later shape change fails `pnpm check` instead of at runtime. Change no app code.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `bash scripts/e2e.sh`

**Files:** e2e/specs/,e2e/mocks/vault-index.ts

**Source:** review of Issue 67 (`work/67/review.md`, finding 1, major), 2026-11-01; confirmed by the failing Nightly E2E job on 4692b8dc.

- [x] Every `vault-index-updated` emit under `e2e/specs/` sends a full `UpdateResult`, typed, with no `as any`
- [x] A spec that emits the old shape fails `pnpm check` (check with a scratch edit, not committed)
- [x] The full E2E suite passes (`bash scripts/e2e.sh`)

## Notes

- **Size:** S.

## Comments

- 2026-11-01, branch `issue/69-e2e-specs-old-vault-index-updated-shape`: the five event-calendar specs now emit `e2e.vaultIndex.rescanResult()` (a full `UpdateResult`) through a typed `E2eEventBus`; `tsconfig.json` includes `e2e` so `pnpm check` type-checks spec payloads (`arrow-reveal.spec.ts` fixed for the one error that surfaced). Review fix: `seedEvents` JSDoc reworded to "as a full rescan, the way Rust does after `scan_vault_v2*`". Tests: `pnpm check` exit 0 (212 files, 0 errors); full suite at bb4e0e80 exit=0, 417/417 files, 9829 passed, build OK (log test-logs/architecture-stability/69-deliver.log); targeted E2E 58 passed. Reviews: round 1 APPROVED (3 nits; 1 fixed, 2 rejected), round 2 APPROVED (no findings).
