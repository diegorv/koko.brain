# 07 discovery: Mac changes show up in the browser

No `spec.md`; the plan is `architecture-proposal-2026-11-02.md` 4.4 "Events", M1 1.7 and 2.2, simplified (no `seq`, no resume ring). Builds on `work/02` (session, stand-in, transport) and `work/05` (stand-in keeps a local copy of `listen` registrations, `emitBridgeEvent`, fake host). Gate: Both.

## What already works once events arrive
`vault-files-changed` -> `fs.watcher.ts:198` (tree patch over `scan_vault`, Read) -> `app-lifecycle.service.ts:494-512` -> `reloadExternallyChangedTabs` (`editor.service.ts:385`, skips dirty tabs) + `rebuildAllIndexes` (reads are Read, index writes Virtual). The Mac's own watcher run updates its `VaultIndex`, which emits `vault-index-updated`: forwarded, it drives the panels through `registerVaultIndexUpdatedListener`. The stand-in already delivers to local `listen` registrations and the event-plugin `unregisterListener` global.

## Plan (files)
- `src-tauri/src/remote/events.rs` (new, Tauri-free): `forwarding(name) -> Option<Forwarding>` over `FORWARDED_EVENTS` (the three) and the never-forwarded rows (`qc:*`, `menu:*`, `tauri-debug-log`, `app:exit-requested`); `EventHub` (subscribe / unsubscribe / publish, publish drops any name not Forwarded). Process-wide `desktop_event_hub()`.
- `rpc.rs:35,58-110`: `RpcHost.events`; a session subscribes before the welcome and sends `{"method":"event","params":{"event","payload"}}` from its own writer thread over a bounded channel (an emitter never blocks on a slow socket; a full queue ends the session, and the browser's reconnect refresh covers what it missed).
- `commands/remote.rs:27-44`: hub on the `RpcHost`; first start registers `app.listen_any` for each forwarded name (Tauri 2.12.5 `lib.rs:938`; `app.emit` reaches Rust listeners, `manager/mod.rs:538-539`).
- Frontend `remote-transport.ts`: `onEvent` for `method: "event"`. `remote-session.ts`: forwards events through `emitBridgeEvent`, keeps the latest `vault-index-updated` version for its synthetic rescan event, and reconnects (backoff 1 s doubling to 30 s) after a lost connection. On a later welcome for the same vault it runs one full refresh (new `remote-refresh.ts`: `invalidateVaultEntries`, `refreshTree`, `reloadExternallyChangedTabs(open tab paths)`, a full-rescan `vault-index-updated` with the welcome version); another vault root reloads the page.
- `NotConnectedBanner.svelte`: copy says it is reconnecting.

## Tests
- Rust `remote_events_test.rs`: parity (every key of `EventMap` in `src/lib/contracts/events.ts` is classified); over the real WS a published `qc:capture-detected` never reaches the client while a later `vault-files-changed` does; unsubscribed on close.
- vitest: `remote-transport.test.ts` (event frames), `remote-session.test.ts` (events delivered, reconnect = one refresh, other vault reloads), new `browser-mac-changes.test.ts` with `fake-host.ts` gaining `emit` (clean note re-rendered, dirty buffer kept, tree add/remove, reconnect refresh). Prior art: `browser-open-note.test.ts`.

## Risks
- Events between a drop and the next welcome are lost by design; the refresh covers tree and clean tabs, panels via the rescan event.
- Reconnect has no visibility probe or ping (2.2 deferred); it relies on socket close or call timeout.

## Defaults taken
- `app:exit-requested` is never forwarded (the browser must not run the desktop's exit flush). Unknown names are not forwarded.
- Reconnect never replays calls; calls made while disconnected reject as before.
