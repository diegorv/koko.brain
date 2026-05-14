# MCP Enable/Disable Setting

Add a setting that controls whether the local MCP server (`127.0.0.1:3737`)
boots on app launch. The setting persists to a global app-config file so the
Rust side can read it inside `tauri::Builder::setup()` before the vault loads
and before `crate::mcp::start` is spawned. Toggling requires an app restart;
the UI shows a "restart required" hint.

## Architecture

- `AppSettings.mcp.enabled: boolean` (default `true`) — per-vault preference,
  lives in `.kokobrain/settings.json` like every other setting.
- Rust-readable mirror at `app_config_dir()/mcp.json` (`{ "enabled": bool }`).
  Mirror is updated whenever the in-app toggle flips. Rust reads the mirror at
  boot; missing/corrupt file = `enabled: true` (preserve current behavior).
- A new `set_mcp_enabled(enabled: bool)` Tauri command writes the mirror file.
- The vault settings.json is the source of truth for the UI; the mirror file
  is only what Rust consults at boot.

## Tasks

- [x] Task 1: Rust — read mirror file in `lib.rs::run()` before spawning MCP;
      skip spawn when disabled. Add helper module + unit test.
- [x] Task 2: Rust — add `set_mcp_enabled` command and register it in
      `invoke_handler`. Unit test the file write.
- [ ] Task 3: Frontend — extend `AppSettings` with `mcp: McpSettings`, update
      `DEFAULT_SETTINGS`, `loadSettings` merge, store getter, store
      `updateMcp` setter, and tests.
- [ ] Task 4: Frontend — add an `mcp` settings section component (toggle +
      "restart required" hint). Register the section id in `SettingsSection`
      type, `SETTINGS_SECTION_GROUPS`, and the dialog router.
- [ ] Task 5: Wire the toggle: on change, call `set_mcp_enabled` so the Rust
      mirror file is updated in lock-step with the vault settings.json.

## Notes

- Per-vault flag would conflict with the global-at-boot constraint (MCP starts
  before any vault is selected). Global mirror keeps the boot decision simple.
- `mcp::start` still has no `CancellationToken` — out of scope per mod.rs:51-55.
  Live toggle would need that wired; deferred.
- Bind address (`127.0.0.1:3737`) stays a `const` per mod.rs:37-40.
