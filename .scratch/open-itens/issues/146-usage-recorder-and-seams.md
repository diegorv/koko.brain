# 146: Record usage from the command palette, shortcuts, rail and Settings

**Origin:** `usage-telemetry` Issue 07, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/usage-telemetry/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** A small recorder and four call sites. Each user action gives exactly one count.

## 1. Recorder, in `src/lib/features/usage-stats/`

### `usage-stats.logic.ts`

Pure helpers:
- `localDay(date)`: returns `YYYY-MM-DD` in local time.
- A buffer merge: `Map<day|feature, count>`.

### `usage-stats.service.ts`

**`recordUsage(feature: string)`**
- Adds to an in-memory buffer only when `settingsStore.usageStats.enabled` is true and a vault is open.
- The buffer is keyed by day and feature, so a flush across midnight sends each day separately.
- Tag the buffer with `vaultStore.path`.

**`flushUsage()`**
- Takes the buffer out synchronously, by swapping in an empty Map, before it calls `record_usage` once per day.
- Timer flush, about every 30 s: on failure, log with `error()` and merge the counts back, but only if the same vault path is still open. If the path changed, drop them.
- Teardown and quit flushes never restore: on failure the counts are dropped. A failed flush after a vault switch must never write the previous vault's counts into the next vault.

**Toggle and reset**
- Turning the setting off drops the buffer.
- Reset (`clear_usage`, Issue 06) also clears the in-memory buffer.

**Vault lifecycle**
- `teardownVault` (`src/lib/app/lifecycle/app-lifecycle.service.ts` about line 538) is synchronous and fires `call('close_vault_db')` without awaiting (about line 606). Call `flushUsage()` and stop the timer before that line. `record_usage` is a sync command (Issue 06), so its invoke runs before the close.
- In `initializeVault`, `await flushUsage()` before the `teardownVault()` call for the previous vault (about line 189).
- Start the timer once the vault DB is open (after `open_vault_db`, about line 234).

**Quit**
- Both quit handlers live in `src/lib/app/tauri-listeners.service.ts`: `registerExitRequestListener` (Cmd+Q) and `registerCloseHandler` (window close).
- In each, `await flushUsage()` after `prepareForExit()` returns true and before `confirm_exit` / `destroy()`.
- A failed usage flush is logged and never blocks quit. `core/vault/exit.service.ts` must not import `features/`.

## 2. Seams

The feature key is the `AppCommand.id` wherever a command exists.

**Palette**
- In `executeCommand` (`src/lib/features/command-palette/CommandPalette.svelte` about lines 27-37), call `recordUsage(command.id)`.

**Shortcuts**
- `registerGlobalKeybindings` (`src/lib/app/global-keybindings.ts` about lines 222-229) drops `binding.command` (`({ command: _command, ...binding })`). Wrap each handler:
  - A binding with a `command` records that id.
  - A binding without one records `key:<modifiers+key>`, e.g. `key:meta+k`, built from the binding's own fields, not from `formatShortcut` (which returns glyphs).
- The "/" search shortcut (`registerSlashSearchKeybinding`, about line 40) records `key:/`.
- Keybinding handlers call services directly, never palette commands, so a shortcut and the palette cannot count one action twice.

**Rail**
- The click path is `AppShell.svelte` about line 203 (`onSelect={(key, pin) => selectRailItem({ key, pin })}`).
- Record `rail:go-to:<key>` in that handler. This is the same id as the palette's Go to command (`src/lib/app/commands.ts` about lines 56-64), so a click and a palette Go to each count once, under one feature.
- `selectRailItem` (`src/lib/app/rail-navigation.ts`) records nothing, because the palette's Go to commands also call it.

**Settings**
- Record `settings:<section>` in the sidebar `onclick` of `src/lib/app/SettingsPanel.svelte` (about line 135) only.
- Do not use an `$effect` on the active section. `activeSection` keeps its last value and defaults to `appearance`, so every panel open would count that page again.

**Blocked by:** 145

**Status:** ready-for-agent

**Gate:** Frontend: `pnpm check` + `pnpm vitest run`.

**Logic** (failing first, `src/tests/lib/features/usage-stats/usage-stats.logic.test.ts`):
- [ ] `localDay` uses local time around midnight.
- [ ] The buffer merge sums counts.

**Service** (failing first, `usage-stats.service.test.ts`; mock only the IPC `call`):
- [ ] A disabled setting records nothing.
- [ ] With the setting enabled, records are flushed as summed counts with the right day.
- [ ] A failed timer flush keeps the counts for the same vault and drops them after a path change.
- [ ] A failed flush after a vault switch never sends the previous vault's counts to the next vault.
- [ ] Toggling off drops the buffer.
- [ ] No open vault records nothing.

**Seams**
- [ ] Palette: executing a command records its id once.
- [ ] Shortcuts: a binding with `command` records that id; the palette toggle records `key:...`; "/" records `key:/`; the `global-keybindings` tests are updated.
- [ ] Rail: in `AppShell.test.ts`, a rail click records `rail:go-to:<key>` once; `rail-navigation.test.ts` asserts that `selectRailItem` records nothing.
- [ ] Settings: in `SettingsPanel.test.ts`, a sidebar click records `settings:<id>`, and opening the panel records nothing.

**Lifecycle**
- [ ] `app-lifecycle.service.test.ts`: teardown calls `record_usage` before `close_vault_db`, and `initializeVault` awaits the flush before tearing down.
- [ ] `tauri-listeners.service.test.ts`: both quit paths flush after `prepareForExit`, and a failing flush still quits.
- [ ] `layer-rules.test.ts` is green.

## Notes

- Source: `raw/j20.md` (s12 seams), `raw/j24.md` (M4: one vocabulary keyed by command id), review 2026-11-06 (cross-vault flush, rail id, Settings seam, quit path).
- Editor-level usage (opening kanban, canvas, table or meta-bind notes) goes through none of these seams: see Issue 10.
- Size: M.

## Comments
