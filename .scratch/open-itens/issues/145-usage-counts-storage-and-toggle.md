# 145: Opt-in local usage counters: storage, IPC and the Settings toggle

**Origin:** `usage-telemetry` Issue 06, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/usage-telemetry/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** The storage half of local usage stats. Nothing is recorded yet (Issue 07 adds the call sites) and nothing is shown yet (Issue 08).

1. **ADR** at the next free number at implementation time (`ls docs/adr`; 0036 is reserved by `.scratch/vault-mods/issues/07-docs-example-adr.md`, and `.scratch/ios-app` also plans one): opt-in, per-vault, local-only usage counters in the vault DB; nothing leaves the machine. Alternatives considered (from `.scratch/usage-telemetry/findings-2026-11-05.md` section B): Sentry Logs/Metrics (30-day retention), PostHog (autocapture of DOM text, remote-enabled capture, Tauri v2 delivery report, release cadence vs quarantine), Aptabase (process-wide key, breaks `PRIVACY.md`), self-hosted (static CSP). Reference `docs/adr/0015-dual-logging-frontend-rust.md` line 71, which deferred opt-in telemetry. Add the row to `docs/adr/README.md`.
2. **Rust storage**, following the `db/history_repo.rs` pattern (SQL in a repo module that takes `&Connection`, tested on an in-memory DB, thin command wrapper):
   - Table in `src-tauri/src/db/schema.rs` `create_tables`, same `CREATE TABLE IF NOT EXISTS` pattern (no schema version to bump; `app_meta` only holds `fts_schema_version`): `usage_counts(day TEXT NOT NULL, feature TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(day, feature))`. `day` is the user's local date `YYYY-MM-DD`, computed in the frontend. Add a `usage_counts_table_exists` test next to the existing schema tests.
   - `src-tauri/src/db/usage_repo.rs` (`pub mod` in `db/mod.rs`): upsert batch (`count = count + excluded.count`), select with optional `from_day`, delete all.
3. **Commands** in a new `src-tauri/src/commands/usage.rs`, registered in `lib.rs`. All three are sync `#[tauri::command] pub fn` (like `close_vault_db`), never `async`, so they keep their order relative to `close_vault_db` (Issue 07 relies on this):
   - `record_usage(day: String, counts: Vec<UsageIncrement>)`: one `with_db_transaction` call. Validate the `day` shape and a non-empty `feature`, and reject `count < 1`, without writing anything.
   - `get_usage(from_day: Option<String>) -> Vec<UsageRow>`: rows with `day >= from_day` (all when `None`), ordered by day then feature.
   - `clear_usage()`: deletes all rows.
   `UsageIncrement { feature, count }` and `UsageRow { day, feature, count }` are `#[ts(export)]` DTOs, so this is an IPC DTO change: run cargo from the checkout root, commit `src/lib/contracts/generated/`, add the re-exports to `src/lib/contracts/index.ts`, and add entries to `src/lib/contracts/commands.ts` plus its `COMMAND_ARGS` list: `record_usage: ['day', 'counts']`, `get_usage: ['fromDay?']`, `clear_usage: []` (the JS arg key is `fromDay`). If an integration test in `src-tauri/tests/` touches the global DB, it takes its own file-local `TEST_LOCK` (see `tests/history_test.rs` lines 11-12).
4. **Setting:**
   - a `UsageStatsSettings { enabled: boolean }` interface with JSDoc, and `usageStats: UsageStatsSettings` in `AppSettings` (`src/lib/core/settings/settings.types.ts` about line 362, next to `sentry`);
   - default `false` in `DEFAULT_SETTINGS`;
   - a `get usageStats()` getter and an `updateUsageStats(value: Partial<UsageStatsSettings>)` method in `settings.store.svelte.ts`, next to the `sentry` ones (about lines 172 and 316);
   - parsed in `parseSettings` with the same strict `=== true` consent check as Sentry (`settings.service.ts` about lines 164-167).
5. **Settings section** `usage-stats` ("Usage stats") under Advanced, after Sentry:
   - Add it in `settings.logic.ts` (about lines 256-262) and to the `SettingsSection` union in `settings.types.ts` (about line 331).
   - The component lives in **`src/lib/app/UsageStatsSection.svelte`**, not in `features/`. Issue 08 needs `getBuiltInCommands()` from `src/lib/app/commands.ts`, and `layer-rules.test.ts` forbids any file outside `app/` from importing `app/` (rule `app-inbound`). Register it in `src/lib/app/SettingsPanel.svelte` (about lines 15, 55, 81) with the `@lucide/svelte/icons/chart-bar` icon.
   - It holds the switch and one line of copy: "Counts which commands, panels and settings pages you use, per day, in this vault's `.kokobrain/kokobrain.db`. Nothing is sent anywhere."
   - It also holds a "Reset usage data" button that confirms with `ask` from `@tauri-apps/plugin-dialog` (as `TrashSection.svelte` about line 14 does) and then calls `clear_usage`.
6. **Docs:**
   - Amend `PRIVACY.md` line 8 ("No analytics, no tracking...") to say that opt-in, local-only usage counters exist, stored only in the vault DB and never sent.
   - Add a `## Usage stats` section after `## Sentry` in `help/documentation/19-settings.md` (about line 260).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** Both + IPC DTO: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/settings.spec.ts`. Add handlers for the three commands in `e2e/mocks/tauri-core.ts`: an unknown command only logs a warning (about line 532), and `get_usage` must be seedable for Issue 08.

- [ ] Failing first, repo tests on an in-memory DB:
  - `record_usage` twice for the same day and feature sums the counts;
  - different days stay separate;
  - `get_usage(Some(day))` filters;
  - `clear_usage` empties the table;
  - a bad `day` or `count < 1` is rejected without writing.
- [ ] Failing first, `settings.service.test.ts`: `usageStats.enabled` is `false` by default and for any stored value other than `true`; `true` round-trips.
- [ ] `settings.store.test.ts`: the `usageStats` getter and `updateUsageStats`.
- [ ] `settings.logic.test.ts`, updated on purpose: the flattened id list (about line 362) and the Advanced group `['sentry', 'usage-stats', 'troubleshooting', 'update']` (about line 384).
- [ ] Render test `src/tests/lib/app/UsageStatsSection.test.ts`:
  - the switch writes `settingsStore.usageStats.enabled`;
  - Reset calls `clear_usage` only after `ask` resolves true (mock `ask`).
- [ ] `ipc-parity.test.ts` and `layer-rules.test.ts` stay green, with no `app-inbound` edge. Generated bindings committed.
- [ ] ADR and README row added, `PRIVACY.md` line 8 amended, `19-settings.md` section added.

## Notes

- Owner decision 2026-11-05: local SQLite counters instead of a third-party service ("vamos com a sua sugestão de sqlite se for mto mais simples"). PostHog was chosen first and dropped in favour of this.
- Owner is the only user; feature ids may contain note paths (e.g. `rail:open-view:<path>`). Keep full ids, do not strip.
- The vault DB already holds note content (`snapshots`), so the table does not widen the privacy boundary (`raw/j24.md` s13 F5).
- Size: M.

## Comments
