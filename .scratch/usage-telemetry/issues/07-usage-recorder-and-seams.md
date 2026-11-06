# 07: Record usage from the command palette, shortcuts, rail and Settings

**What to build:** A small recorder plus four call sites, so that one user action gives exactly one count.

1. **Recorder** in `src/lib/features/usage-stats/`:
   - `usage-stats.logic.ts`: pure helpers, e.g. `localDay(date)` → `YYYY-MM-DD` in local time, and a buffer merge (`Map<feature, count>`).
   - `usage-stats.service.ts`: `recordUsage(feature: string)` adds to an in-memory buffer only when `settingsStore.usageStats.enabled` is true and a vault is open; a timer (about 30 s) and `flushUsage()` send the buffer with `record_usage` and clear it only on success. On failure, log with `error()` and keep the buffer. If the day changes between record and flush, flush per day (buffer keyed by day + feature).
   - Flush on vault teardown before the vault DB closes (`teardownVault` in `src/lib/app/lifecycle/app-lifecycle.service.ts` about lines 578-590; verify the DB is still open at that point) and on app quit (find the quit path in `src-tauri/src/commands/app_exit.rs` and its frontend caller). Start/stop the timer with the vault lifecycle.
2. **Seams.** The feature key is the `AppCommand.id` wherever a command exists:
   - **Palette:** `executeCommand` in `src/lib/features/command-palette/CommandPalette.svelte` (about lines 27-37): `recordUsage(command.id)`.
   - **Shortcuts:** `registerGlobalKeybindings` in `src/lib/app/global-keybindings.ts` (about lines 222-229) drops `binding.command` (`({ command: _command, ...binding })`). Wrap the handler so a binding with a `command` records that id; a binding without one records `key:<combo>` (for example the palette toggle at about line 66 has no command).
   - **Rail:** `selectRailItem` in `src/lib/app/rail-navigation.ts` (about lines 14-24) is called by both rail clicks and the palette's Go to commands. Record in the rail's own click path only (or pass a `source` and record only for `'rail'`), as `rail:<item.key>`, so a palette Go to is not counted twice.
   - **Settings:** record `settings:<section>` when a section is shown, from `src/lib/app/SettingsPanel.svelte` (the app layer), not from `core/settings/settings-panel.store.svelte.ts`, which must not import `features/`.

**Blocked by:** 06

**Status:** ready-for-agent

**Gate:** Frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing first, `src/tests/lib/features/usage-stats/usage-stats.logic.test.ts`: `localDay` uses local time around midnight; buffer merge sums
- [ ] Failing first, `usage-stats.service.test.ts` (mock only the IPC `call`): disabled setting records nothing; enabled records and flushes the summed counts with the right day; a failed flush keeps the buffer and the next flush sends it; no vault open records nothing
- [ ] Palette: executing a command records its id once (component or service-level test)
- [ ] Shortcuts: a keybinding with `command` records that id; the palette toggle records `key:<combo>`; `global-keybindings` tests updated
- [ ] Rail: a rail click records `rail:<key>` once; a palette Go to command records only the command id (`rail-navigation.test.ts`)
- [ ] Settings: opening a section records `settings:<id>`
- [ ] Teardown flushes before the DB closes (`app-lifecycle.service.test.ts`, assert the IPC order)
- [ ] `layer-rules.test.ts` green (no new `core/` → `features/` edge)

## Notes

- Source: `raw/j20.md` (s12 seams), `raw/j24.md` (M4: one vocabulary keyed by command id to avoid double counts).
- Editor-level features without a command (kanban drag, canvas edits, live preview widgets) are out of scope. If the owner wants them later, add events at those features' service entry points with the same `recordUsage`.
- Size: M.

## Comments
