# 05 discovery

No `spec.md`; design is `research/design.md` (Architecture, rules 8b, 8c, 9, 13). Pattern of 02 (`work/02/`) applies only to the pure-logic files.

## Files that change

- `src-tauri/src/db/schema.rs:17-63` `create_tables`: add `todoist_kv`, `todoist_task_link`, `todoist_sync_log` (+ index on `todoist_task_link(todoist_id)`).
- New `src-tauri/src/db/todoist_repo.rs` (SQL on `&Connection`), `db/mod.rs:1-4` module list, plus `with_vault_db` / `with_vault_db_transaction` next to `with_db` (`db/mod.rs:110-145`): lock `DB`, compare the canonical `<vaultPath>/.kokobrain/kokobrain.db` with the canonical `conn.path()` (rusqlite 0.41 `Connection::path`), refuse a mismatch. No new global state.
- New `src-tauri/src/commands/todoist.rs` (ts-rs DTOs + 5 async commands, `spawn_blocking` like `history::save_snapshot`): `todoist_read_kv`, `todoist_read_links`, `todoist_commit_state` (kv rows + link upserts + link deletes in one `with_db_transaction`), `todoist_append_log` (trims to newest 1000), `todoist_read_log`. Registered in `lib.rs:328` block, `commands/mod.rs`.
- `src/lib/contracts/commands.ts` (CommandMap + COMMAND_ARGS), `contracts/index.ts` barrel, regenerated `contracts/generated/Todoist*.ts`.
- Move `features/tasks/todoist-client.ts`, `tauri-fetch-adapter.ts` to `features/todoist-sync/`; `mapPriorityToTodoist` (`todoist-bridge.logic.ts:17-31`) to `features/todoist-sync/priority.logic.ts`. Importers: `todoist.service.ts:7`, `todoist-bridge.logic.ts` (buildTodoistArgs), `TodoistPopover.svelte:9`; tests move with them, `todoist.service.test.ts:14` mock path changes.
- `core/settings/settings.types.ts:249-254` `TodoistSettings` + `settings.store.svelte.ts:125-128` defaults + `settings.logic.ts:180` `normalizeSettings` gets `normalizeTodoist` (interval integer >= 1, context enum, empty folder -> `Todoist`), identity kept when valid like `normalizeEventCalendar`.
- `core/settings/sections/TodoistSection.svelte` moves to `features/todoist-sync/TodoistSection.svelte` (core cannot import the feature's project fetch; precedent: `features/search/SearchSection.svelte`, `features/auto-move/AutoMoveSection.svelte`). `app/SettingsPanel.svelte:14` import, and path lists in `settings-controls.test.ts:19`, `settings-text.test.ts:76` follow.
- New in `features/todoist-sync/`: `sync-scope.logic.ts` (tree project ids, open-task count, error -> fixed message), `todoist-sync.store.svelte.ts` (status idle/syncing/error, last result, last error), `todoist-sync.service.ts` (`fetchSyncProjects`, `checkSyncConnection`, `checkSyncConnectionFromUi` with toasts).
- `app/commands.ts`: palette entry `todoist:check-sync-connection`, "Todoist: Check sync connection".

## Tests (prior art)

- Rust: `src-tauri/tests/history_test.rs` (TEST_LOCK + setup over the global DB) -> new `todoist_state_test.rs`.
- Fake `/sync`: new `src/tests/fixtures/todoist-sync.fake.ts`, plugged as the `@tauri-apps/plugin-http` `fetch` mock (as in `tauri-fetch-adapter.test.ts`), real SDK, real stores. Full and incremental tokens, items/projects/sections, commands with `sync_status` + `temp_id_mapping` and uuid replay, failures 429 (`error_extra.retry_after`), 401, dropped response.
- Section test: `TodoistSection.test.ts` (mount + real settings store), `EventCalendarSection.test.ts`.
- Palette: existing commands test for `app/commands.ts`.

## Defaults taken

- The check needs token and root; without either it refuses with a toast. It writes nothing to `kokobrain.db` or notes.
- Counts exclude deleted/archived projects and checked/deleted items. Inbox (`inbox_project`) is added only with `syncIncludeInbox`.
- Rate-limit message includes `retry_after` seconds when present; every other non-auth failure (5xx, network, unparsable) is "unreachable". 401 and 403 are "invalid token".
- Root picker: projects load on a "Load projects" button (full `/sync` of `projects` only), not on mount; a saved root without a loaded list shows its id.
- TS wrappers for the state IPC are left to the engine tickets (nothing calls them yet); the contract is typed and parity-tested.

## Risks

- `conn.path()` is the path SQLite resolved; both sides are canonicalized before comparing, so `/var` vs `/private/var` on macOS does not false-refuse.
- Moving `TodoistSection` changes the Settings source-scan lists; those tests must keep passing with the new path.
