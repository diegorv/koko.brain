# 25: Todoist token moves out of the vault

**What to build:** The Todoist API token is stored in plain text in the vault's `.kokobrain/settings.json` (`src/lib/core/settings/settings.types.ts:243-245`), and vaults are often synced. ADR-0019 says keys must not be written to the vault (`docs/adr/0019-kokobrain-in-vault-data-dir.md:61`; that line also points at a keychain service that no longer exists, so correct it in the same change).

With PRD decision L1's default (b1):

- A Rust command pair `get_app_secret { key }` / `set_app_secret { key, value }` that reads and writes one JSON file under the Tauri app config dir, registered in `src-tauri/src/lib.rs`'s `invoke_handler` and in `src/lib/contracts/commands.ts`. No capability entry: the app defines no app-command permissions (`src-tauri/build.rs` calls plain `tauri_build::build()`, no `src-tauri/permissions/`), and Tauri 2 then allows registered app commands (from memory; confirm against the Tauri 2 capabilities docs). No such mechanism exists today (no `app_config_dir`, `app_data_dir` or `plugin-store` use in `src-tauri/src` or `src/lib`).
- `settingsStore.todoist.apiToken` reads from it. On first load, a token found in `settings.json` is copied to the app file, then removed from `settings.json` only after the copy succeeded.
- `TodoistSection.svelte` says the token is stored on this machine only.

**Blocked by:** none

**Status:** needs-info

**Waits on:** PRD decision L1 (token location). With (b2) `localStorage` this becomes frontend only; with (a) it becomes a docs change; with (c) it needs a new ADR, since ADR-0013's keychain was dropped to stay cross-platform.

**Gate:** both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` (for option b1).

- [ ] Failing test first, with the real settings store, mocking only `invoke` and `@tauri-apps/plugin-fs`: a `settings.json` holding `todoist.apiToken` loads, the token is written through `set_app_secret`, and the next saved `settings.json` has no token. Fails today.
- [ ] If `set_app_secret` fails, the token stays in `settings.json` and a toast explains why.
- [ ] Rust test: the command writes only under the app config dir and refuses a key with a path separator.
- [ ] ADR-0019 gets an amendment for the new location.

## Notes

- **Size:** M.
