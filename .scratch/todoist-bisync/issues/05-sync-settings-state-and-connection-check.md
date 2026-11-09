# 05: Sync settings, sync state store and a connection check

**What to build:** Settings > Todoist gets the sync toggle and folder, the sync state tables exist in `kokobrain.db` behind IPC, the Todoist client moves into the sync feature, and a palette command "Todoist: Check sync connection" runs a full `/sync` and reports how many projects and open tasks the chosen root's tree holds (plus the Inbox when included). Demoable on its own; nothing is written to notes. Design: `.scratch/todoist-bisync/research/design.md` Architecture (Code, State), rules 9 and 13.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] Failing tests first against a fake Todoist `/sync` behind the `@tauri-apps/plugin-http` `fetch` mock, with the real SDK and real stores. The fake is a shared test helper later tickets extend: full and incremental `sync_token`, items, projects, sections, commands answered with `sync_status` and `temp_id_mapping`, configurable failures (429 with `error_extra.retry_after`, 401, dropped response).
- [ ] `TodoistSettings` gains flat keys `syncEnabled` (false), `syncFolder` (`Todoist`), `syncIntervalMinutes` (5, min 1), `syncContext` (`'work' | 'personal'`, default `'work'`, design rule 8b), `syncRootProjectId` (empty = sync off) chosen from a project list fetched from Todoist, and `syncIncludeInbox` (false) (design rule 8c), shown in the Todoist settings section; the context control explains that a work vault lets the webhook add `Work` and a personal vault sends `personal`.
- [ ] The SDK client factory, the plugin-http fetch adapter and the priority map move from `features/tasks` to `features/todoist-sync`; the existing send popover and its tests import them from there and keep working.
- [ ] Schema module creates `todoist_kv`, `todoist_task_link` (anchor PK, todoist_id, note_rel_path, local_base, remote_base, pending_uuid, pending_cmd, miss_count, frozen), `todoist_sync_log` (newest 1000 rows kept). IPC commands read and write them; a multi-row update plus the `sync_token` commit in one transaction. Every command takes the vault root the caller believes is open and refuses a mismatch.
- [ ] A sync store exposes status (idle / syncing / error) and last result for the UI.
- [ ] The check command refuses before the vault index is ready, reports counts in a toast, maps errors to fixed messages (invalid token, rate limit, unreachable), and logs raw errors with `error('TODOIST', …)`.
- [ ] Gate: Both; commit regenerated bindings.

## Notes

- Size: M.
