# 61 discovery: no calendar write lands on disk without its index update across a vault switch

Anchors on main (2294a13d). No earlier work folder is a template; ticket 25 (closed in f984319f) added the
drain this Issue moves ahead of the switch.

## Chosen fix: drain before the vault path changes

The writer-side option (finish `notifyAfterSave` after the switch) was rejected: the after-save observers
read `vaultStore.path` at call time (`search.service.ts:315` skips the FTS/semantic update for a path
outside the NEW vault; `auto-move.service.ts:102` would judge the old note against the new vault), so the
old vault's index would only get the Rust leg. Draining before `vaultStore.open` lets the write finish
entirely inside the old vault, with every observer and consumer of that vault still registered.

## Files that change

1. `src/lib/core/vault/vault.service.ts`: new `switchVault(path)` = `await drainEventCalendarWrites()`
   then `vaultStore.open(path)`. `openVaultDialog:11` and `openRecentVault:33` call it instead of
   `vaultStore.open`. (core -> features import has precedent: `app-lifecycle.service.ts:64`,
   `tauri-listeners.service.ts:17`.)
2. `src/lib/features/deep-link/deep-link.service.ts:137`: `await switchVault(resolvedPath)`.
3. `src/lib/core/app-lifecycle/app-lifecycle.service.ts:176-180`: the drain stays as the backstop for a
   write started after the pre-switch drain; its comment is rewritten (it says the write already lost its
   index update, which is no longer the normal case).

## Tests (prior art)

- `src/tests/lib/features/event-calendar/event-calendar.service.test.ts` "write queue" (:1116, uses
  `holdNextWrite` / `flush` from :897-920): new case, a `moveEvent` on a closed note held at
  `writeTextFile`, `switchVault('/other')` started; the path stays `/vault` until the write lands, the move
  resolves (no `vault-changed`), `update_note_in_index` ran for the note, then the path is `/other`.
  Red first: with `switchVault` as a bare `vaultStore.open`, the move rejects `vault-changed`.
- `src/tests/lib/core/vault/vault.service.test.ts`: both openers wait for the drain before opening
  (event-calendar.service mocked there as a side-effect service).
- `src/tests/lib/features/deep-link/deep-link.service.test.ts:177`: the different-vault switch waits for
  the drain.
- Ticket 25 order tests (`app-lifecycle.service.test.ts:1282`, `tauri-listeners.service.test.ts:308`)
  unchanged and must stay green.

## Risks / defaults

- `drainEventCalendarWrites` loops until the queue is idle (`intakeDepth === 0`, `writeTails` empty,
  `historyTail` unchanged), so a write enqueued while `switchVault` drains is waited for too and indexes
  in the old vault (review finding 1; the first version waited only for the tails it saw at the start).
  `switchVault` calls `vaultStore.open` in the microtask after the drain resolves, so no user-triggered
  write can enqueue in between; a write started after the path changed hits `vault-changed` and the
  initializeVault drain lets it settle before teardown.
- A write that keeps re-enqueueing (continuous user edits on the calendar) delays the switch until the
  queue goes idle once. Default: accepted, writes are user-paced.
- Two different-vault deep links arriving while `switchVault` waits on an in-flight write: the second
  overwrites `deepLinkStore.pendingAction`, so the first action is lost (before this change the path
  changed synchronously). Needs two deep links during one calendar write; accepted, not queued.
- A hung write delays the switch; same exposure the initializeVault drain already has.
