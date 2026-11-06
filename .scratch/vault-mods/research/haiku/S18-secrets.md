# S18: Secret storage for API keys and tokens

## Answer

There is no secure secret storage in the app today. The only credential the app stores is the Todoist personal API token. It is saved in plaintext inside the vault at `.kokobrain/settings.json`, which the app serializes whole with `JSON.stringify`. Nothing is encrypted, and no keychain, stronghold, or keyring crate is in use. The earlier macOS Keychain implementation (ADR-0013) was removed, and its ADR is marked superseded. ADR-0019 says keys must stay out of the vault because the vault is often synced. So the current Todoist design contradicts the project's own ADR guidance.

For a vault mod, an Anthropic API key or MCP auth token has no existing home. Putting it in `settings.json` would copy the Todoist pattern and its weakness. A proper choice needs a new backend (for example the `keyring` crate or `security-framework`) plus a decision on whether the key is per-machine or per-vault.

## Evidence

**Todoist token: where it is typed, held, and read**
- `src/lib/core/settings/settings.types.ts:243-245`: `TodoistSettings.apiToken: string` is a plain string field.
- `src/lib/core/settings/settings.store.svelte.ts:122-125`: default `apiToken: ''`. `updateTodoist` (lines 307-312) merges into the in-memory store.
- `src/lib/core/settings/sections/TodoistSection.svelte:25-31`: the input is `type="password"`, which masks the field on screen only. The value is bound to the store on every `oninput` (line 8).
- `src/lib/core/settings/settings.service.ts:13-14`: `SETTINGS_DIR = '.kokobrain'`, `SETTINGS_FILE = 'settings.json'`.
- `src/lib/core/settings/settings.service.ts:269-273`: `saveSettings` runs `JSON.stringify(normalizeSettings(settingsStore.settings), null, 2)` and writes the whole object. The token is included with no filter.
- `src/lib/core/settings/settings.service.ts:160-163`: on load, `todoist` is merged over defaults from `parsed.todoist`. The token is read back from the file as-is.
- `src/lib/features/tasks/todoist.service.ts:138-139`, `160`, `189`, `251`: each API call reads `settingsStore.todoist.apiToken` and throws if it is empty.
- `src/lib/features/tasks/todoist-client.ts:8-12`: `createTodoistClient(token)` passes the token into `new TodoistApi(token, ...)`. A new client is built per call.
- `src/lib/features/tasks/tauri-fetch-adapter.ts:1-25`: requests go through `@tauri-apps/plugin-http` `fetch`, so the HTTP call runs from the Rust side.
- `src/lib/features/tasks/todoist.service.ts:12`: sent-task records go to `.kokobrain/todoist-sent.json`. These hold task IDs and URLs, not the token.

**Storage layer and Tauri plugins**
- `src-tauri/Cargo.toml:21-70`: plugins present are opener, fs, dialog, deep-link, clipboard-manager, global-shortcut, http (line 68), updater (69), and process (70). There is no `tauri-plugin-stronghold`, `tauri-plugin-store`, `keyring`, or `security-framework`. `grep` for those names in `Cargo.toml` returns nothing.
- `src-tauri/src/lib.rs:313`: `.plugin(tauri_plugin_http::init())`. No store or stronghold plugin is registered in the file (checked by grep).
- `src-tauri/src/security/` does not exist. No Rust file under `src-tauri/src` uses keyring, keychain, stronghold, or encryption (grep for `keyring|encrypt|aes|gcm` in `src-tauri/src` returned no files).
- `src-tauri/capabilities/default.json:224-244`: `http:allow-fetch`, `http:allow-fetch-send`, `http:allow-fetch-read-body`, and `http:allow-fetch-cancel-body` allow only `https://api.todoist.com/**` and `https://raw.githubusercontent.com/diegorv/koko.brain-themes/**`. Only the main window has this capability (`default.json:4-6`).
- `src-tauri/capabilities/default.json` also grants `fs:allow-read-text-file` and `fs:allow-write-text-file` on `$DOCUMENT/kokobrain-vaults/**` and `$HOME/kokobrain-vaults/**`, including `.kokobrain/**`. That is how `settings.json` is read and written.

**Documentation on secrets**
- `docs/adr/0013-encrypted-notes-aes-gcm-keyring.md:4-8`: `status: superseded`, dated 2026-05-19. The reason given is that the macOS-only Keychain and Touch ID dependencies were dropped and the feature removed.
- `docs/adr/0013-encrypted-notes-aes-gcm-keyring.md:24-49`: the old design stored a 32-byte AES-256-GCM key in the macOS Keychain via `security-framework`, in `src-tauri/src/security/keychain.rs`. That file no longer exists.
- `docs/adr/0013-encrypted-notes-aes-gcm-keyring.md:58`: the rejected option "platform-agnostic `keyring` crate" is recorded with its reasons.
- `docs/adr/0019-kokobrain-in-vault-data-dir.md:61`: "keys must not be written to the vault because the vault is (often) synced." This is the only project rule against vault-stored secrets, and it is not enforced in code.
- `docs/adr/0001-tauri-svelte-sveltekit-stack.md:19,41`: OS Keychain is listed as a reason for choosing Tauri. This is a stated goal, not an implemented feature.

**Logging**
- `src/lib/core/settings/settings.service.ts:37` and `270`: the debug lines log only timestamps, not the settings body. Other logging was not searched exhaustively, so the claim that the token never reaches logs is not verified.

**Other sensitive values in the same file**
- `src/lib/core/settings/settings.types.ts:250-255`: the Sentry DSN is also stored in `settings.json`. The DSN is less sensitive than a token, but it sits in the same plaintext file.

**Mentions with no real match**
- A search for `anthropic|mcp|openai|llm` (whole word) in `src/lib` and `src-tauri/src` returned no matches. No LLM or MCP client code exists yet.

## Implications for vault mods

1. **A mod's key would sit next to the Todoist token.** If a mod stores its key via `settingsStore`, it lands in `.kokobrain/settings.json`, in plaintext, in a folder the ADR says may be synced. Using the existing pattern is the easy path but repeats a known gap.
2. **A mod's JavaScript runs in the same webview.** Mod code loaded from the vault would run with the main window's capability, which already includes `http:allow-fetch` for `api.todoist.com`. A mod could read `settingsStore.todoist.apiToken` and call Todoist. Mod code also has access to any store it can import. This is an isolation question for the PRD, not a finding that the code does this today.
3. **HTTP scope is static.** Calls to Anthropic or an MCP HTTP endpoint would be blocked by `http:allow-fetch` unless the capability list is extended. Each new host is a change to `src-tauri/capabilities/default.json`, so mod-declared endpoints need an allow-list design.
4. **Options for a secure store:**
   - Add the `keyring` crate (cross-platform: macOS Keychain, Windows Credential Manager, Linux Secret Service). ADR-0013 rejected it only for UX reasons, and it is the natural fit now that the app targets more than macOS. Verify the current crate docs before using it.
   - Add a Tauri command that stores and retrieves secrets, so the webview never gets the raw key for long. Mods would call the command, not read the key.
   - Keep keys out of the vault entirely (per ADR-0019), with a per-machine store.
5. **Migrating Todoist.** Moving `apiToken` out of `settings.json` would change `loadSettings` / `saveSettings` and migrate existing vaults. That is a separate change with its own tests.

## Open questions

- Does the owner want per-machine or per-vault secrets? A vault-synced vault would share a key across machines, which argues for per-machine storage.
- Should mods be able to read the Todoist token at all? That depends on whether the mod API exposes stores or only scoped calls.
- Is the Todoist token ever logged or sent to Sentry? Not fully checked. Sentry is opt-in (`settings.types.ts:252`), and the error payload was not inspected.
- Does `settings.json` get excluded from the user's sync tool? `.gitignore` in the repo has no `kokobrain` entry (grep exit 1). The vault's own ignore rules were not checked, and the app's default vault location is `$DOCUMENT/kokobrain-vaults` (`default.json`).
- Does `keyring` or another crate meet the owner's target platforms? Not checked against current crate docs. Not verified in this session.
- Verified by reading only. No build, test, or run was done.
