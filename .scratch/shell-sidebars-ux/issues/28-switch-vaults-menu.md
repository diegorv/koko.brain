# 28: Switch vaults from inside a vault: palette commands, Cmd+Shift+O and a File menu

**Origin:** design review 2026-11-17, proposal P103 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/shell-tabs-navigation.html` (P103 section), research `.scratch/shell-sidebars-ux/research/verdict-sh-menus-settings.md` (its Ticket A) and `.scratch/shell-sidebars-ux/research/breakdown.md` (old ticket 36, now this one). No open-itens Issue is absorbed; open-itens 083, 090 and 105 are context (see Sequence with). The old edge from the panel-toggles ticket (01) is dropped: it was only a shared `commands.ts` count pin, so this ticket has no blocker.

**What to build:**

1. **Palette.** Inside a vault, "Open Vault..." (category Vault, shortcut Cmd+Shift+O; Cmd+O stays the quick switcher) opens the native folder picker, and one "Open Vault: <name>" command per recent vault except the current one opens it. The recent-vault builder works like `railGoToCommands` (`src/lib/app/commands.ts:58-73`): it reads `vaultStore.recentVaults` (`vault.store.svelte.ts:65`) and `vaultStore.path` while the list is built. Ids: `vault:open` and `vault:open-recent:<path>`.
2. **Native File menu.** A File submenu between KokoBrain and Edit with exactly one item, "Open Vault..." (`CmdOrCtrl+Shift+O`). No Close Window item (Cmd+W must stay Close Tab, open-itens 023 relies on it) and no Open Recent. `switchVault`, `openVaultDialog` and `openRecentVault` (`src/lib/core/vault/vault.service.ts:22-52`) are unchanged: the switch saves every dirty tab and asks only when a save fails, so there is no extra confirm.
3. **Code.**
   - `global-keybindings.ts`: `{ command: 'vault:open', key: 'o', meta: true, shift: true, handler }` with a logged catch like `:152` and a toast, declared in both `GLOBAL_KEYBINDINGS` and the File menu as Cmd+, is (`settings:open`, `global-keybindings.ts:162`), so `shortcutFor` gives the palette its label.
   - `src-tauri/src/events.rs`: `MENU_OPEN_VAULT_EVENT = "menu:open-vault"` (next to `MENU_SETTINGS_EVENT`, `:21`) and `src/lib/contracts/events.ts` `EVENT_NAMES.MENU_OPEN_VAULT`.
   - New `src-tauri/src/commands/app_menu.rs` (registered in `commands/mod.rs`) with a pure `menu_action(id) -> MenuAction` enum (`OpenSettings | OpenVault | Quit | None`) and the item id consts. `lib.rs`: `build_menu` (`:172-248`) gets the File submenu; `on_menu_event` (`:303-309`) becomes a `match` on `menu_action` whose arms each emit their own registry const (a local-variable emit fails `src/tests/lib/contracts/events-parity.test.ts:94-127`) and keeps `app.exit(0)` for Quit.
   - `registerMenuOpenVaultListener` in `src/lib/app/tauri-listeners.service.ts` (modelled on `registerMenuSettingsListener`, `:25-38`, with cleanup before `listen` resolves), mounted in `src/routes/(app)/+layout.svelte` next to `:47`; it calls `openVaultDialog()` and logs failures with `error('LISTENERS', ...)`.
4. **Help:** `01-getting-started.md:146-152` "Switching Vaults" (today it says to close the current vault, which no UI does: `vaultStore.close()` has no caller) and one sentence at `:42-48`; a Vault row in the `06-search-and-navigation.md` command table (the Navigation rows are at `:57-63`); Cmd+Shift+O in `20-keyboard-shortcuts.md` (Cmd+O is at `:9`, Cmd+, at `:55`).

Not in this ticket: a native File > Open Recent submenu (28.2), which needs a new IPC command and DTO for at most two other vaults the palette already lists; a confirm before closing the current vault; View, Go and Note menus (polish per the review).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** both layers: `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm check`, `pnpm vitest run`, plus `bash scripts/e2e.sh vault-picker.spec.ts`

- [ ] Failing test first, `src/tests/lib/app/commands.test.ts` (real `vaultStore`, `vault.service` mocked): after opening `/vaults/a` then `/vaults/b`, `vault:open` ("Open Vault...", category Vault, shortcut `{ key: 'o', meta: true, shift: true }`) and `vault:open-recent:/vaults/a` ("Open Vault: a") exist and nothing for `/vaults/b`; after `removeRecent('/vaults/a')` none; with no vault open every recent gets one. The count pin (`:151`) changes on purpose.
- [ ] Failing test first, `src/tests/lib/app/global-keybindings.test.ts`: `shortcutFor('vault:open')` equals `{ key: 'o', meta: true, shift: true }` (it throws today); the fixed count (`:142`) moves from 25 to 26 on purpose; Cmd+O still opens the quick switcher (`:160`, `:365`).
- [ ] Failing test first, `src/tests/lib/app/tauri-listeners.service.test.ts` (`vault.service` real; add `open` to the `@tauri-apps/plugin-dialog` mock, now `ask` only): `menu:open-vault` with `open` resolving `/vaults/b` sets `vaultStore.path`; `null` leaves it and shows no toast; a rejection is logged with `error('LISTENERS', ...)` and does not throw; cleanup unlistens, also before `listen` resolves.
- [ ] Failing test first, new `src-tauri/tests/commands/app_menu_test.rs` (add `mod app_menu_test;` to `src-tauri/tests/commands/mod.rs`): `"settings"` is `OpenSettings`, the File item id is `OpenVault`, `"quit"` is `Quit`, other ids are `None`.
- [ ] `events-parity.test.ts` passes unchanged.
- [ ] E2E `vault-picker.spec.ts`: with the test vault open and a second vault in the fake fs, `setOpenResponse(secondPath)` then "Open Vault..." shows the second vault's file in the rail and none of the first (if the fake fs cannot serve two roots, assert the vault root row).
- [ ] Manual check on the built app, recorded in the Issue: File sits between KokoBrain and Edit with one item; Cmd+Shift+O and File > Open Vault... each open the picker once inside a vault and on the welcome screen; Cmd+O still opens the switcher; Cmd+W still closes a tab; Quit still runs the exit flush.
- [ ] Frontend and Rust gate: `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P103.** The macOS menu bar holds almost nothing, and there is no way to switch vaults from inside an open vault. Add "Open vault..." and "Switch vault" palette commands and a native File menu with Open Vault and Open Recent; full View, Go and Note menus are polish. Validation: revise.

## Problem

The native menu has KokoBrain, Edit and Window only. The vault picker renders only while no vault is open, and the help tells users to "close the current vault", which nothing in the UI does, so changing vault means a restart. The switch path itself already works (deep links use it).

## Evidence

Checked at `ab143a411`.

- `src-tauri/src/lib.rs:172-248` `build_menu` builds KokoBrain, Edit and Window; the only accelerators are `CmdOrCtrl+,` (`:175`) and `CmdOrCtrl+Q` (`:184`); `:303-309` `on_menu_event` is an `if` chain on `"settings"` and `QUIT_MENU_ID`.
- `src-tauri/src/events.rs:21` and `src/lib/contracts/events.ts:21` only `MENU_SETTINGS`; `src-tauri/src/commands/mod.rs` registers `app_exit` only (`src-tauri/src/commands/app_exit.rs` is the precedent for a pure decision function with an integration test in `src-tauri/tests/commands/app_exit_test.rs`).
- `src/lib/app/commands.ts` has no vault command; `global-keybindings.ts:69` Cmd+O is the quick switcher and no `o` binding uses Shift.
- `src/lib/core/vault/vault.service.ts:22-27` `switchVault`, `:30-34` `openVaultDialog`, `:40-52` `openRecentVault`; `src/routes/(app)/+layout.svelte:76-90` already reacts to a vault change while one is open.
- `src/lib/app/AppShell.svelte:184-186` renders the picker only while `!vaultStore.isOpen`.
- `help/documentation/01-getting-started.md:146-152` is wrong today.

## Sequence with

- `commands.ts` and the count pin `commands.test.ts:151`: 01, 08, 13, 15, 20, 24, 29, 32. Each ticket that adds a fixed command changes the number on purpose and says so. The `06-search-and-navigation.md` category table: 01 and others.
- `global-keybindings.ts` and its "registers all 25" pin (`:142`): 26 (adds a `command` id, count unchanged), 30, 32.
- `src/routes/(app)/+layout.svelte`: 06 (comment at `:91-104`), 27 (`restoreZoom` call).
- `src-tauri/src/lib.rs`: open-itens 090 (Dock Quit exit flush) edits other functions in the same file; no dependency.
- Open-itens 083 (refuse a folder outside the allowed roots) changes `openVaultDialog`, and every entry point here inherits it. A first-class switch makes the overlapping-switch race in open-itens 105 slightly more reachable; note it, no scope change.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: the 34-ticket consolidation (this ticket keeps its old scope and is no longer blocked by the panel-toggles ticket). Defaults (not individually answered): 28.1 Cmd+Shift+O for Open Vault, declared in both `GLOBAL_KEYBINDINGS` and the File menu like Cmd+, (breakdown.md question 36.1); 28.2 no native File > Open Recent for now, ask again after this ships (breakdown.md question 36.2).
