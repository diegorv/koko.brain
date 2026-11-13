# Scout 17: Events, tests, CI for an iOS track

Read-only scout. No tests, builds or cargo runs were executed. Paths are repo-relative to `/Users/diegorv/Dev/pet-projects/koko/brain`.

## Part 1: Events

### 1.1 Contract layer

- `EVENT_NAMES` (7 names): `src/lib/contracts/events.ts:10-18`. `EventMap` payloads: `events.ts:24-42`.
- Rust consts: `src-tauri/src/events.rs:7-29`. Parity enforced by `src/tests/lib/contracts/events-parity.test.ts` (`MIN_EVENTS = 7`).
- Typed wrappers: `call` at `src/lib/contracts/ipc.ts:21-26`, `on` at `ipc.ts:33-38` (`listen` over `event.payload`).
- Raw invoke survives in one place only: `src/lib/core/settings/sections/UpdateSection.svelte:171` (`plugin:updater|download_and_install`, which passes a Channel).

### 1.2 Event inventory

| Event | Rust producer (file:line) | Trigger and frequency | Payload | TS consumer (file:line) | Loss-tolerant? |
|---|---|---|---|---|---|
| `vault-index-updated` | `commands/vault.rs:318` (fn `update_note_in_index`, 303), `:410` (`propagate_type_rename`, 396), `:722` (`toggle_task_status`, 708), `:907` (`create_note`, 888), `:951` (`remove_note_from_index`, 938), `:1059` (`rename_note`, 1045), `:1400` (`emit_index_updated`, 1393, called from `scan_vault_v2` at 1102 and `scan_vault_v2_cached` at 1187) | Every VaultIndex mutation command. Burst-prone: one per saved note, per watcher-driven update, per rename | `UpdateResult` (`src-tauri/src/vault/index.rs:31-52`): `changed`, `affected`, `version` (monotonic), `upserted`, `removed` (last op per path wins), `full_rescan` | `src/lib/app/tauri-listeners.service.ts:270` only | Not by itself. Consumers recover by re-reading (`get_index_delta`, `:202`), but a missed `version` is undetected (see 1.4) |
| `vault-files-changed` | `src-tauri/src/commands/watcher.rs:19` (fn `start_vault_watcher`), via `src-tauri/src/vault/watcher.rs` debounce loop, `DEBOUNCE_MS = 500` at `vault/watcher.rs:34` | One emit per debounced burst (500 ms quiet window). Hidden-dir filter and ancestor filter run in Rust | `VaultFilesChangedPayload { paths }` | `src/lib/core/filesystem/fs.watcher.ts:198` (`void handleChangedPaths(payload.paths)` at 199). Also `app-lifecycle.service.ts:494` via `onFileChange` | Yes for the tree, but the TS side does full or incremental rescans and must converge |
| `semantic-index-progress` | `commands/semantic.rs:397-400` (`emit_progress`, `let _ = app.emit`), fed by `on_progress` calls at `:423, 453, 596, 738` (the `Embedding chunks... n/N` line at ~738 fires per batch) | Download and build phases. Per batch while embedding | `SemanticProgress` (`src-tauri/src/semantic/types.rs:56`) | `src/lib/features/search/search.service.ts:86`. Throttle `PROGRESS_THROTTLE_MS = 500` at `search.service.ts:59`, 102. Phase changes flush immediately (`:94-99`) | Yes. Fire-and-forget, no replay of the last status |
| `tauri-debug-log` | `src-tauri/src/lib.rs:260` (sink installed in `setup`), sourced from `utils/logger.rs:48` (no-op unless `DEBUG_ENABLED`) and `:56` | Only when debug mode is on | `DebugLogPayload { tag, message }` | `src/lib/utils/debug.ts:123` | Yes, debug only |
| `menu:settings` | `src-tauri/src/lib.rs:276` (`on_menu_event`, id `settings`) | User click on app-menu Settings | `()` (null) | `src/lib/app/tauri-listeners.service.ts:30` | Yes. Desktop menu only |
| `qc:capture-detected` | `src-tauri/src/lib.rs:78` (global shortcut, clipboard capture), `quick_capture/commands.rs:247` (`capture_clipboard_now`, fn at 236), `:363` (`submit_composer_capture`, fn at 349). Multi-file clipboard captures emit one event per file in a Rust loop | User shortcut or capture | `json!` payload, untyped (`events.ts:36-39`) | `src/lib/plugins/quick-capture/quick-capture.service.ts:55` | **No**. Each event is a write. Handlers are chained in a promise queue (`quick-capture.service.ts:46-57`) so they never run concurrently |
| `qc:open-composer` | `quick_capture/commands.rs:294` (`show_composer`, fn at 281) | Shortcut shows the composer webview | `""` | `src/routes/composer/+page.svelte:76` | Yes. Second webview only |

Window events (not in `EventMap`, by design per `ipc.ts:31`):
- `onCloseRequested`, `tauri-listeners.service.ts:50-82`. Saves dirty tabs, then `drainEventCalendarWrites`, `flushSettingsPersistence`, then `destroy()`.
- `onFocusChanged`, `tauri-listeners.service.ts:306-325`. Refreshes the daily note on focus.

Registration point: `src/routes/(app)/+layout.svelte:41-61` (menu, close, quick-capture, focus, vault-index).

### 1.3 Frequency and throttling, vault-index path

- `tauri-listeners.service.ts:85-95`: `REFRESH_DELAY_MS = 2000`, `REFRESH_MIN_INTERVAL_MS = 10_000`, `INCREMENTAL_REFRESH_MAX_PATHS = 200`.
- The handler folds `upserted`/`removed` into `pendingPaths` (`:273-274`) and arms one timer (`:255-268`). A refresh runs at most once per 10 s during a burst. `takePromptIndexRefresh()` (`:277`) bypasses the throttle for user clicks.
- Incremental refresh calls `get_index_delta` (`commands/vault.rs:842-851`, which reads the index under its read lock). Whole-vault fallback calls `get_all_vault_entries_v2` (`vault.rs:508`) and `get_all_property_records` (`vault.rs:799`).
- Stale-result guard: `fetchSeq` (`:168`, `:218-225`). Patches chain on the memo, so they land in order (`:147-150`).

### 1.4 Ordering and reconnect implications for a WS push channel

Must preserve:
1. **Monotonic `version` per event, with no gaps.** The consumer sets `latestVersion = payload.version` (`tauri-listeners.service.ts:271`) and never checks for gaps. A dropped WS frame therefore leaves the panels on a stale index until the next full rescan. Add a gap check: if `version !== last + 1`, call `invalidateVaultEntries()` and `fullRefresh()` (both exist, `:186-196`, `vault-entries.service.ts`).
2. **Per-path fold semantics.** `upserted` and `removed` must arrive in the same frame or in order. The consumer's `removedIn()` (`:204-207`) treats a path missing from the delta as removed, so an out-of-order upsert can be cleared by a later read. This is already self-healing for the delta, but ordering across events still matters.
3. **`fullRescan` flag must not be dropped.** It forces the whole-vault read (`:251-252`). A WS adapter that strips it leaves the consumer on the delta path with an empty path list.
4. **Qc events must be FIFO and not coalesced.** One event per capture. The Rust loop emits N events in a row, and the TS queue preserves that order.
5. **`vault-files-changed` handlers are not serialized.** `handleChangedPaths` is async and runs without a queue (`fs.watcher.ts:121-172`). Only `watchVersion` guards stop/restart. Overlapping bursts can interleave. UNVERIFIED whether this races in practice. The code path exists, so a WS channel that delivers faster would make it more likely.
6. **Tauri's own guarantee.** Tauri documents listeners as called in registration order, but async listeners "may process events out of order", and recommends Channels for ordered high-throughput data (https://v2.tauri.app/develop/calling-rust/, fetched 2026-11-02). That supports moving high-rate streams (vault index, watcher bursts) to an ordered channel with sequence numbers.

Reconnect rule:
- On reconnect, the client should run a whole refresh (`fullRefresh` path: `buildPropertyIndex()` plus `getVaultEntries()`) and then resume from the server's current `version`. The WS server needs a "version since N" query, or it must answer with `fullRescan`.
- `semantic-index-progress` and `tauri-debug-log` are fire-and-forget (`let _ = app.emit`). A reconnecting client needs a pull for progress state. UNVERIFIED whether a status command exists for this; `SemanticIndexStatus.svelte` imports `call`, but I did not confirm the command.

Desktop-only events in the current code (no iOS equivalent needed unless the feature is ported): `menu:settings`, `qc:*` (`lib.rs:78` registers `global_shortcut` unconditionally, but `quick_capture/source.rs` has `#[cfg(target_os = "macos")]` clipboard sources with non-macOS stubs at `:87`, `:115`, and so on), `tauri-debug-log`.

Window lifecycle has no mobile analogue in code. `onCloseRequested` (save before quit) would map to app backgrounding. Whether Tauri's window events fire on iOS is UNVERIFIED (not in the docs I fetched).

## Part 2: Testing and CI

### 2.1 Current gates

| Layer | Where | What it runs | Platform |
|---|---|---|---|
| Vitest unit | `vitest.config.ts` (include `src/tests/**/*.test.ts`), `docs/TESTING.md:5-9` | Logic, services with real stores (`TESTING.md:23-27`) | Node + jsdom |
| Typecheck and build | `ci.yml:56-77` | `pnpm check`, `pnpm vitest run`, `pnpm build` | ubuntu-latest |
| Rust | `ci.yml:79-125` | `cargo clippy -D warnings`, `cargo test`, then `git status` on `src/lib/contracts/generated` (fails if bindings are stale) | ubuntu-latest |
| Rust macOS | `ci.yml:127-183` | Targeted tests (`commands::fonts`, `semantic_qos_test`, `utils_fs_test`, `semantic_embedder_qos_session_test`) with exact counts | macos-latest |
| Secrets | `ci.yml:185-194` | gitleaks | ubuntu |
| E2E | `e2e.yml:14-57`, `scripts/e2e.sh` | Playwright chromium only | ubuntu-latest |
| Nightly macOS build | `nightly.yml:81-86` (`build-macos`, 45 min timeout) | Tauri macOS bundle | macos-latest |

No iOS job exists anywhere. `src-tauri/src/lib.rs:222` has `#[cfg_attr(mobile, tauri::mobile_entry_point)]`, `src-tauri/Cargo.toml:16` sets `crate-type = ["staticlib", "cdylib", "rlib"]`, and `src-tauri/gen/apple/kokobrain.xcodeproj` exists on disk (generated, not tracked: `git ls-files src-tauri/gen` returns 0). So an iOS scaffold was generated locally, but nothing builds or tests it in CI.

### 2.2 E2E mechanics

- `e2e/playwright.config.ts`: `testDir ./specs` (line 6), `fullyParallel` (9), `retries` 1, or 2 on CI (10), `baseURL :1421` (15), `projects: [{ name: 'chromium', use: { channel: 'chromium' } }]` (19). Only chromium.
- `scripts/e2e.sh:41` starts `PLAYWRIGHT=true pnpm dev` on port 1421, waits for it, then runs `pnpm exec playwright test --config e2e/playwright.config.ts -x` (`:68`).
- `vite.config.js:33` sets `isPlaywright`. `:48-58` aliases `@tauri-apps/api/core`, `api/event`, `plugin-fs`, `plugin-dialog`, `plugin-opener`, `plugin-http`, `plugin-deep-link`, `api/window`, `api/webviewWindow` to mocks in `e2e/mocks/`. **Not aliased:** `plugin-updater`, `plugin-process`, `plugin-clipboard-manager`, `plugin-global-shortcut`. Whether the app imports them at boot in the browser build is UNVERIFIED. `:106-119` excludes Tauri packages from the dep optimizer, including `plugin-updater`.
- `e2e/mocks/tauri-event.ts:7-22`: `listen` keeps an in-memory handler map, `emit` is a no-op. `:29-36` exposes `window.__e2e.events.emit(event, payload)`, typed on `EventMap`. Specs push watcher bursts this way: `collection-block.spec.ts:46`, `canvas-view.spec.ts:21`, `kanban-view.spec.ts:20`, and others.
- `e2e/mocks/tauri-core.ts:1-60` routes every `CommandMap` command to `virtualFS`, `vaultIndex`, or a no-op. `emitIndexUpdated` mirrors Rust `emit_index_updated`. The mock is exhaustive over `CommandMap`, so `pnpm check` catches a missing handler.
- `docs/TESTING.md:139-177` documents the per-area E2E table.

### 2.3 Device descriptors (verified from the Playwright repo)

Source: `packages/isomorphic/deviceDescriptorsSource.json` in `microsoft/playwright`, read via `gh api` on 2026-11-02. The Playwright emulation page (https://playwright.dev/docs/emulation) does not list the iPhone entries or `defaultBrowserType`, so the registry is the primary source here.

| Device | defaultBrowserType | isMobile | hasTouch | viewport | DPR |
|---|---|---|---|---|---|
| iPhone 15 | webkit | true | true | 393x659 | 3 |
| iPhone 15 Pro Max | webkit | true | true | 430x739 | 3 |
| iPhone 13 | webkit | true | true | 390x664 | 3 |
| iPad Pro 11 | webkit | true | true | 834x1194 | 2 |

Note: `devices['iPhone 15']` defaults to the WebKit engine. That matches Safari and WKWebView more closely than chromium does, but it is still Playwright's WebKit build, not WKWebView in a Tauri shell.

### 2.4 Tauri test tooling on Apple platforms

- Tauri WebDriver docs (https://v2.tauri.app/develop/tests/webdriver/, fetched 2026-11-02): the recommended WebdriverIO plus `@wdio/tauri-service` setup "works on Windows, Linux, and macOS" via an embedded WebDriver server (`tauri-plugin-wdio-webdriver`). The standalone `tauri-driver` route does not support macOS. The page does not mention iOS. **An iOS WebDriver route is UNVERIFIED.**

### 2.5 Rust tests

- `src-tauri/tests/` has 33 entries, including `commands/vault_test.rs` and `core_tauri_free_test.rs`.
- `src-tauri/tests/core_tauri_free_test.rs:23-24` is a ratchet. It fails if `vault`, `db`, `search`, `semantic`, or `utils` import Tauri (`tauri::`, `AppHandle`, `Emitter`). This already enforces the seam an iOS core crate would need. It runs in the existing `rust` CI job (ubuntu).
- `src/tests/lib/contracts/events-parity.test.ts` guards the Rust-to-TS event-name contract. A WS transport needs an equivalent parity test for its message envelope.

## Part 3: Proposed iOS test strategy

Each item is a proposal. None has been run.

1. **WebKit device E2E (browser build).** Add `{ name: 'webkit-iphone', use: { ...devices['iPhone 15'] } }` to `e2e/playwright.config.ts` (after the existing `chromium` entry, `:19`). Requires `pnpm exec playwright install webkit` in `e2e.yml:37-43`. Catches layout, touch, and viewport bugs under WebKit. Does not exercise Rust or real Tauri IPC, because the `vite.config.js:48-58` mocks stay in place. Expect the runtime cost to roughly double for E2E. The `retries`/`-x` behavior stays.
2. **WS transport contract tests (vitest).** Run an in-process WS server in Node with recorded `vault-index-updated` and `vault-files-changed` fixtures. Assert: version-gap triggers `fullRefresh` (`tauri-listeners.service.ts:186`), reconnect triggers a whole refresh, `fullRescan` is preserved, and `removed` folds correctly. Use real stores (`TESTING.md:23-27`), not mocks. Add a parity test like `events-parity.test.ts` for the envelope.
3. **Rust core tests.** Keep `core_tauri_free_test.rs` as the ratchet. Put the `UpdateResult` fold and version logic in the core (`vault/index.rs:31-52`). Test in `src-tauri/tests/vault_test.rs`. Covered by the existing ubuntu `rust` job, so no new CI cost.
4. **iOS simulator smoke (manual or gated).** The app has an on-disk Xcode project (`src-tauri/gen/apple`). A smoke test would build for the simulator, launch, open a vault from the fixture, and check the file tree and the index. Drive the simulator only through the T3 device tools (`device_list`, `device_open`, `device_screenshot`), not `simctl` or `idb`, per the environment rules. Gate it behind a manual workflow, not a PR job, because `nightly.yml` already costs ~45 min on macOS.
5. **CI addition.** A `macos-latest` job running `pnpm tauri ios build` (or `cargo check --target aarch64-apple-ios`) would catch iOS compile breaks early. Cost: one more macOS runner. Recommend nightly first, not PR. This is UNVERIFIED for the exact `tauri ios` flags and the Rust target installed on the runner.

## Unverified and not checked

- No tests, builds or cargo runs were executed (per the scout rules).
- Not read: `release.yml`, `security.yml`, `privacy.yml`, `.github/actions/setup`, `vitest` fixtures beyond the config, `docs/TESTING.md` sections beyond the ones quoted.
- Whether `plugin-updater`, `plugin-process`, `plugin-clipboard-manager`, and `plugin-global-shortcut` are reachable at E2E boot is UNVERIFIED (`vite.config.js:48-58`).
- Whether `handleChangedPaths` races in practice is UNVERIFIED (code path only).
- Whether Tauri window events (`onFocusChanged`, `onCloseRequested`) fire on iOS is UNVERIFIED.
- Whether a status command exists for `semantic-index-progress` reconnect is UNVERIFIED.
- The t3code WebSocket protocol was not inspected (outside this scout's assignment).

## Sources

- https://v2.tauri.app/develop/calling-rust/ (event system: order, JSON-only payloads, Channels)
- https://v2.tauri.app/develop/tests/webdriver/ (platform support: Windows, Linux, macOS; no iOS mention)
- https://playwright.dev/docs/emulation (device descriptor model; detail pages not listed)
- https://github.com/microsoft/playwright/blob/main/packages/isomorphic/deviceDescriptorsSource.json (iPhone and iPad descriptors, `defaultBrowserType`)
