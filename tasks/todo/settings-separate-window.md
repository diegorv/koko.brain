# Settings as Separate Tauri Window

Convert the settings modal dialog into a standalone Tauri window so it can stay open
while the user works in the main editor (especially useful for theme customization).

## Tasks

- [x] Task 1: Restructure SvelteKit routes with layout groups — move main app content into `(app)/` group so root layout becomes minimal (just CSS). This lets `/settings` route avoid loading vault init, keybindings, etc.
- [x] Task 2: Create settings route — `src/routes/settings/+layout.svelte` (load settings from vault path, apply theme) + `src/routes/settings/+page.svelte` (reuse existing section components)
- [x] Task 3: Create settings window service + add Tauri capabilities — `settings-window.service.ts` with `openSettingsWindow()` / `closeSettingsWindow()`. Add `core:webview:allow-create-webview-window` to capabilities.
- [x] Task 4: Cross-window settings sync — settings window emits `settings-changed` Tauri event on save, main window listens and reloads settings + applies theme
- [x] Task 5: Update callers + clean up modal — keybindings, menu listener, command palette use `openSettingsWindow()`. Remove SettingsDialog from AppOverlays. Update all tests.

## Notes

- Each Tauri WebviewWindow has isolated JS context — stores not shared between windows
- Vault path passed to settings window via URL query param (`/settings?vault=...`)
- Settings window needs same fs permissions as main window (reads/writes `.kokobrain/settings.json`)
- SPA mode (`adapter-static` with `fallback: index.html`) — SvelteKit client router handles `/settings` route
- Theme must apply in BOTH windows — settings window applies on load + on change, main window syncs via event
