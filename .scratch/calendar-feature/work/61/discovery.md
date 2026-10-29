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

- A write enqueued in the microtask gap between the drain resolving and `vaultStore.open` still hits
  `vault-changed` before or after writing; the initializeVault drain lets it settle before teardown. Default:
  accepted, the Issue's normal case (write already in flight at switch time) is closed.
- A hung write delays the switch; same exposure the initializeVault drain already has.
