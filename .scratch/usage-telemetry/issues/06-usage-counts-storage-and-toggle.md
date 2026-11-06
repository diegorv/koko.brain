# 06: Opt-in local usage counters: storage, IPC and the Settings toggle

**What to build:** The storage half of local usage stats. Nothing is recorded yet (Issue 07 adds the call sites) and nothing is shown yet (Issue 08).

1. **ADR 0036** `docs/adr/0036-local-usage-counters.md`: opt-in, per-vault, local-only usage counters in the vault DB; nothing leaves the machine. Alternatives considered (from `.scratch/usage-telemetry/findings-2026-11-05.md` section B): Sentry Logs/Metrics (30-day retention), PostHog (autocapture of DOM text, remote-enabled capture, Tauri v2 delivery report, release cadence vs quarantine), Aptabase (process-wide key, breaks `PRIVACY.md`), self-hosted (static CSP). Reference `docs/adr/0015-dual-logging-frontend-rust.md` line 71, which deferred opt-in telemetry. Add the row to `docs/adr/README.md`.
2. **Table** in `src-tauri/src/db/schema.rs` `create_tables`, same `CREATE TABLE IF NOT EXISTS` pattern:
   `usage_counts(day TEXT NOT NULL, feature TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(day, feature))`. `day` is the user's local date `YYYY-MM-DD`, computed in the frontend.
3. **Commands** (new `src-tauri/src/commands/usage.rs`, registered in `lib.rs` and `src/lib/contracts/commands.ts` + the parity list):
   - `record_usage(day: String, counts: Vec<UsageIncrement>)`: one `with_db_transaction` UPSERT batch (`count = count + excluded.count`). Validate `day` shape and non-empty `feature`, reject `count < 1`.
   - `get_usage(from_day: Option<String>) -> Vec<UsageRow>`: rows with `day >= from_day` (all when `None`), ordered by day then feature.
   - `clear_usage()`: deletes all rows (for a "Reset" button).
   `UsageIncrement { feature, count }` and `UsageRow { day, feature, count }` are `#[ts(export)]` DTOs, so this is an IPC DTO change: run cargo from the checkout root and commit `src/lib/contracts/generated/`.
4. **Setting:** `usageStats: { enabled: boolean }` in `AppSettings` (`src/lib/core/settings/settings.types.ts` about line 362, next to `sentry`), default `false` in `settings.store.svelte.ts`, parsed with the same strict `=== true` consent check as Sentry (`settings.service.ts` about lines 164-167).
5. **Settings section** `usage-stats` ("Usage stats") under Advanced (`settings.logic.ts` about lines 256-262, after Sentry; add the id to the `SettingsSection` union at `settings.types.ts` about line 331). The component lives in `src/lib/features/usage-stats/UsageStatsSection.svelte` and is registered in `src/lib/app/SettingsPanel.svelte` (about lines 15, 55, 81), so `core/` gains no import of `features/`. It holds the switch, one line of copy ("Counts which commands and panels you use, per day, in this vault's `.kokobrain/kokobrain.db`. Nothing is sent anywhere."), and a "Reset usage data" button calling `clear_usage` with a confirm.
6. **PRIVACY.md**: one line under the privacy bullets saying usage stats are opt-in and local-only.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** Both + IPC DTO: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/settings.spec.ts` (add the E2E mock for the new commands in `e2e/mocks/tauri-core.ts`).

- [ ] Failing first, `src-tauri/tests/`: `record_usage` twice for the same day and feature sums the counts; different days stay separate; `get_usage(Some(day))` filters; `clear_usage` empties; bad `day` and `count < 1` are rejected without writing
- [ ] Failing first, `settings.service.test.ts`: `usageStats.enabled` is `false` by default and for any non-`true` stored value; `true` round-trips
- [ ] `settings.logic.test.ts`: Advanced is `['sentry', 'usage-stats', 'troubleshooting', 'update']` (updated on purpose)
- [ ] A render test for `UsageStatsSection`: the switch writes `settingsStore.usageStats.enabled`; Reset calls `clear_usage` only after confirm
- [ ] `ipc-parity.test.ts` and `layer-rules.test.ts` stay green; generated bindings committed
- [ ] ADR 0036 and README row added; `PRIVACY.md` line added

## Notes

- Owner decision 2026-11-05: local SQLite counters instead of a third-party service ("vamos com a sua sugestão de sqlite se for mto mais simples"). PostHog was chosen first and dropped in favour of this.
- Owner is the only user; feature ids may contain note paths (e.g. `rail:open-view:<path>`). Keep full ids, do not strip.
- The vault DB already holds note content (`snapshots`), so the table does not widen the privacy boundary (`raw/j24.md` s13 F5). Writes are tiny batched UPSERTs on the existing `with_db_transaction` path.
- Size: M.

## Comments
