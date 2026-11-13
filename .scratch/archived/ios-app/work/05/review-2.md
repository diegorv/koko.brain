VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `src/tests/lib/app/remote/fake-host.ts` `default:` now pushes to `refused` and throws `deniedMessage(cmd)`, which matches `dispatch.rs:47` word for word. Every command it still acknowledges with `null` (`plugin:fs|write_text_file`, `open_vault_db`, `close_vault_db`, `save_vault_cache`, `start_vault_watcher`, `stop_vault_watcher`, `configure_sentry`, `shutdown_semantic`, `build_search_index`, `plugin:event|unlisten` via `plugin:event|*`) is Virtual in `policy.rs:27-28,39,59-60,64,81,85,104,114`. `tree()` skips dot-prefixed names. `browser-open-note.test.ts` adds `.kokobrain/settings.json` and `folder-order.json` and asserts `host.refused` is `[]`. |
| 2 | minor | resolved | `remote_ws_test.rs::link_panel_reads_return_the_desktop_data` checks the data for `get_backlinks_v2` (body and frontmatter sources), `get_relationship_backlinks_v2` (`related_to`), `get_outgoing_links_v2` (target and resolved path) and `get_outgoing_unlinked_mentions_v2`, all through `dispatch`. Passes. |
| 3 | nit | resolved | `tauri-bridge-stand-in.ts:79-104,142-144`: the registration goes into `pending` when `listen` is called, `emit` buffers payloads for it, and the `then` branch delivers them with the id. The `reject` branch drops them. Two new tests: one for delivery after the reply, one where nothing is delivered after a refused listen. The first would fail on the old code, which recorded the registration only on reply. |
| 4 | nit | resolved | `device-local.ts:12,42-44`: `OPENABLE_URL` lets through only `http(s):`, `mailto:` and `tel:`. The new test rejects `/settings`, `notes/a.md`, `javascript:` and `file:` and opens `mailto:`. Nothing reaches the socket. |
| 5 | nit | resolved | `remote_containment_test.rs:253` adds `get_unlinked_mentions_v2` to `every_path_command_is_refused_with_no_vault_open`. Passes. |
| 6 | nit | rejection stands | The round 1 review accepted this as a recorded deviation. `components/ui/` still has no alert-dialog. |

## Acceptance criteria re-checked

- [met] The Read commands the editor, the rail shell and the link panels use are classified Read and work over the WebSocket — the four link-panel reads now have a data test over `dispatch` (`link_panel_reads_return_the_desktop_data`), `get_unlinked_mentions_v2` has its no-vault refusal test, and the browser boot sends no command the host refuses (`host.refused` is `[]` in `browser-open-note.test.ts`). `cargo test --test remote_ws_test --test remote_containment_test`: 27 + 14 passed.
- [met] Device-local answers in the stand-in for plugins that make no sense remotely: dialogs become in-app dialogs, the opener opens URLs with `window.open`, window plugin calls are no-ops, clipboard uses `navigator.clipboard` — `open_url` still uses `window.open` for web, mail and phone URLs and now rejects other schemes. The "device-local answers" tests pass, including the new openUrl scheme test.
- [met] Test: opening a note, then a wikilink target, then a rail lens, through the fake host, renders the expected text (assert on rendered content, not only on calls) — the rendered-text assertions in `browser-open-note.test.ts` are the same as before, and the test now also asserts no refused commands, against a stricter fake host. Passes.

## Checks run (issue worktree root, each read from its own exit status)

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/app/remote`: exit 0, 12 files, 82 tests.
- `cargo test --manifest-path src-tauri/Cargo.toml --test remote_ws_test --test remote_containment_test`: exit 0.
- Not run: the full vitest suite, `pnpm build` and the full cargo suite. Those belong to deliver.
- The fix commits weaken or delete no test, add no layer-baseline entry, do not raise `BASELINE_SIZE`, add no composition root and change no ts-rs bindings. `.scratch/ios-app/ledger.md` is not edited.

## Findings

1. nit — `src/lib/app/remote/device-local.ts:14`: the fix commit dropped the space after `=` (`const unavailable =(cmd: string) =>`). Fix: restore `const unavailable = (cmd: string) =>`.
