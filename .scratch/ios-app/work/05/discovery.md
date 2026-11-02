# 05 discovery: Open and read a note

No `spec.md`; the plan is `architecture-proposal-2026-11-02.md` M1 1.9/1.10. Builds on `work/02` (policy, dispatcher, stand-in, transport) and `work/03` (path gate). Gate: Both.

## What already works
Opening a note is `readTextFile` (`plugin:fs|read_text_file`, Read); following a wikilink resolves over `fsStore.fileTree` (`scan_vault`, Read) and opens through the same read. Backlinks / outgoing panels use `get_backlinks_v2`, `get_outgoing_links_v2`, `get_outgoing_unlinked_mentions_v2` (Read). Lenses are pure over `typeDefinitionsStore.entries` (`lens.logic.ts:294-330`).

## Gaps found
1. `get_unlinked_mentions_v2` (backlinks panel, `backlinks.service.ts:212`) is Denied (`policy.rs:45`).
2. The rail note list, types navigator and lenses read `typeDefinitionsStore.entries` / type metadata, filled only by the `vault-index-updated` listener (`tauri-listeners.service.ts:207-216`). On desktop `scan_vault_v2_cached` emits a full-rescan event (`commands/vault.rs:1196,1402`); in the browser that scan is Virtual and no event reaches the page, so every lens stays empty.
3. Dialog / opener / clipboard go to the host and are Denied; window calls round-trip to the host.

## Plan (files)
- `src-tauri/src/remote/policy.rs:45,235`: `get_unlinked_mentions_v2` Read, `PATH_ARGS` row (`path`, Inside). `dispatch.rs:250`: arm over `unlinked_mentions_candidates` + `match_unlinked_mentions` + `lookup_entries` (same sort as the command).
- `rpc.rs:72` + `commands/remote.rs:27`: welcome carries `indexVersion` (proposal 1.5 lists it); `RpcHost` gets an `index_version` fn.
- `tauri-bridge-stand-in.ts`: device-local answers (new `device-local.ts`): `plugin:dialog|message` -> in-app dialog (`remote-dialog.store.svelte.ts` + `RemoteDialog.svelte` on `components/ui/dialog`, mounted in `src/routes/+layout.svelte`), `open`/`save` -> `null` (cancel); `opener|open_url` -> `window.open`, path openers reject; `plugin:window|*` -> `null`; clipboard `read_text`/`write_text` -> `navigator.clipboard`, other clipboard commands reject. Local record of `plugin:event|listen` registrations (still forwarded, so not-connected rejection and the cold-start fixture stay) and `emitBridgeEvent`.
- `remote-session.ts`: after a forwarded `scan_vault_v2_cached` resolves, emits `vault-index-updated` `{fullRescan: true, version: welcome.indexVersion}` locally, as the desktop does.
- Tests: Rust `remote_ws_test.rs` (welcome version, unlinked mentions on a temp vault), `remote_containment_test.rs` (outside path refused); vitest `tauri-bridge-stand-in.test.ts`, `RemoteDialog.test.ts`, `remote-session.test.ts`, new `fake-host.ts`, `remote-read-note.test.ts` (round trip, missing note errors, no empty tab), `browser-open-note.test.ts` (initializeVault -> open note -> follow wikilink -> neighbourhood lens, rendered text).

## Prior art
`browser-cold-start.test.ts` (real session + stand-in in jsdom), `MarkdownEditor.test.ts` (mounting the editor), `RailNoteList.test.ts` (ResizeObserver shim, neighbourhood lens).

## Risks
- `match_unlinked_mentions` reads index candidate files directly (no canonical containment); candidates come from the vault scan, which skips dot-dirs, and only paths are returned.
- `indexVersion` is the version at connect time; later drift is Issue 07's (no events yet).

## Defaults taken
- Dialog dismiss answers the last button (No / Cancel). File pickers resolve `null`.
- Window calls answer `null` locally; `plugin:webview|*` stays on the host (Virtual).
- File history and settings commands that stay Denied are out of scope (not editor, rail or link panels).
