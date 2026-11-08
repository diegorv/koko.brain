# Cluster palette-hotkeys: mod actions in the palette, mod hotkeys, `when`

Read-only. Every cite below was read in this session (brain repo at HEAD, mods repo, obsidian.d.ts). Paths are relative to the brain repo unless they start with `/`.

## Verdict on the focus question

Yes, one declaration on `ctx.addAction` can feed both the palette and the hotkey. An action already lives on its own: `addAction` writes only the `actions` map (`src/lib/plugins/mods/mods-host.service.ts:295-322`), and a rail button with no `actions` list shows every action (`:261`). So a separate `ctx.addCommand` type would duplicate `ModActionV1` (`contract/mod-api.v1.ts:66-81`) and the run view for nothing. Plan: one registry entry per action `{ key, modId, title, hotkey?, run }`. The palette reads it for rows, one dispatcher reads it for chords. `when` is not needed now (E3).

## Facts the plan rests on

- Palette list is the fixed function `getBuiltInCommands()` (`src/lib/app/commands.ts:93-372`), passed at `src/lib/app/AppOverlays.svelte:18`. `AppCommand = {id,label,category,shortcut?,action}` (`command-palette.types.ts:1-7`). No mod rows exist.
- Palette ranking fuzzy-matches the label only (`command-palette.logic.ts`, `fuzzyMatch(query, cmd.label)`), so a mod row must carry the mod name in its label to be found by it.
- Shortcuts: `GLOBAL_KEYBINDINGS`, a private const of 26 bindings (`src/lib/app/global-keybindings.ts:62-203`), each a separate bubble-phase `document` keydown listener (`src/lib/utils/keybindings.ts:57-81`). It has no `e.repeat` guard, no `defaultPrevented` check, no dialog guard. Only the `/` listener skips typing targets and dialogs (`global-keybindings.ts:40-50`).
- `shortcutFor` throws on an unknown command (`global-keybindings.ts:211-216`), so mod chords need their own label path.
- There is no user rebinding at HEAD: help says so (`help/documentation/20-keyboard-shortcuts.md:116`). A rebinding UI was added in `cb0a0b50e` (2026-06-11, adds `KeybindingsSection.svelte` and `keybindings.logic.ts`) and removed with the classic shell (ADR 0033 amendment, `docs/adr/0033-icon-rail-and-note-list-replace-sidebar-modes.md:104-108`).
- The only mod that touches keys is `hotkeys`: a `window` capture keydown with `stopPropagation` (`/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/mods/hotkeys/src/index.ts:16-19`, `hotkeys.service.ts:35-46`). It clicks another mod's rail button by DOM selector (`hotkeys.service.ts:22-27`), types each label twice (`:34-38`), and has its own `e.repeat` guard (`:47-48`).
- `MOD_APP` has no palette or keybinding member (`src/lib/plugins/mods/mod-app.service.ts:23-53`).
- Layer rules: `plugins/mods` already imports `features/rail-shell` (`mods-host.service.ts:9`). The test forbids any file outside `app/` importing `app/` (`src/tests/lib/architecture/layer-rules.test.ts:167-181`). `layer-baseline.json` has 3 entries, all in `utils/`. So the registry must live in `features/command-palette/`, the merge and the dispatcher in `app/`. Core is untouched.
- Run state is keyed by rail-button key: `modsRunsStore.start/isBusy/runFor(buttonKey)` (`mods-runs.store.svelte.ts:63-83, 106-110`), and `runAction(action, input, buttonKey)` (`mods-host.service.ts:204`) calls `modPickerStore.showRun(manifest.id, buttonKey)`. A palette or chord run has no button, so it needs a synthetic key.
- Mod dialogs queue (`mod-dialogs.store.svelte.ts:32-66`); the picker replaces (`mod-picker.store.svelte.ts` `open`).

## E1. Mod actions in the command palette

Tier A. Cost S. Prototype as a mod: no.

```ts
// contract/mod-api.v1.ts, optional field on ModActionV1 (additive)
palette?: boolean; // default true; false keeps the action picker-only
// features/command-palette/command-palette-registry.store.svelte.ts (new, copies rail-registry.store.svelte.ts:47-84)
export interface RegisteredCommand { key: string; modId: string; label: string; category: string; run: () => void | Promise<void> }
registerCommand(entry: RegisteredCommand): () => void; // identity-based unregister, replaces same key
```

Files:
- `contract/mod-api.v1.ts:66-81` plus the freeze table `src/tests/lib/plugins/mods/mod-api-contract.test.ts:150-157` (`satisfies Record<keyof ModActionV1, true>`, so a new field forces the edit).
- `mods-host.service.ts:295-322`: register next to `actions.set`, in the same `disposable`. Extract the "open picker on one action" step from `openPicker` (`:269-274`) for actions with `input`.
- `src/lib/app/commands.ts:93-372`: append rows read from the store, like `railGoToCommands` (`:56-66`).
- New store plus tests like `src/tests/lib/app/commands.test.ts:505-546`.

Behavior: row `id: mod:<modId>:<actionId>`, `label: "<Mod name>: <title>"`, `category: "Mod"`. Selecting runs through `runAction` with key `mod:<modId>:action:<actionId>`. If that key is already busy, show the run instead of starting a second run (same guard as `openPicker:257-260`).

Layer rules hold: plugins to features, app to features. No core change.

Risks:
- Hot path: none. The list builds when the store changes; cost is O(actions), 25 `addAction` call sites across the 12 mods.
- Unload/reload: disposers run in reverse at unload (`mods-host.service.ts:385-405`). Copy the `a !== entry` identity check from `rail-registry.store.svelte.ts:79-84` so a reload that registers the new entry before the old disposer runs cannot delete the new one. Test: reload leaves exactly one row.
- Data: recents are stored by id in localStorage (`command-palette.store.svelte.ts:1-4`), global to all vaults. A stale mod id is harmless: `filterAndRankCommands` drops unknown ids (`command-palette.logic.ts:11-14`).
- Errors: `CommandPalette.executeCommand` closes first, then awaits, and only catches a rejection (`CommandPalette.svelte:27-37`). `runAction` never rejects, so mod errors still go to the run view, toast and `debug()`, not Sentry.
- Reactivity: relies on the prop expression `getBuiltInCommands()` re-running when a `$state.raw` registry changes. That precedent is documented at `commands.ts:50-55` but not proven by a mounted-component test (see unverified).
- Focus: two `Command.Dialog`s in one tick (palette closing, picker opening for an `input` action or the run view). Needs an E2E check.

Removes: the picker as the only way to reach any action (all 12 mods). Nothing in core is deleted.
Unlocks: palette-first Portent, running any of the 25 actions with Cmd+P and recents, no rail button needed to test a new action.

## E2. `hotkey` declared on the action, one dispatcher

Tier B. Cost M. Prototype as a mod: yes, and it already exists (the `hotkeys` mod). It cannot be declarative without core.

```ts
// ModActionV1 (additive)
hotkey?: string; // 'Mod-Shift-j'; must include Mod or Ctrl; no Alt; host rejects the rest
// utils/keybindings.ts (inverse of toCodeMirrorKey at :19-27)
export function parseHotkey(text: string): KeyCombo | null;
export function matchesCombo(combo: KeyCombo, e: KeyboardEvent): boolean; // extracted from :58-70
```

Files:
- `mods-host.service.ts:295-322`: parse and throw `invalid(...)` on a bad string (same style as `:297-308`). Registry entry carries the combo.
- `src/lib/utils/keybindings.ts:57-70`: extract `matchesCombo` (keep `registerKeybinding` behavior; its tests must stay green).
- `src/lib/app/global-keybindings.ts:222-229`: add one dispatcher listener AFTER the built-ins in the `cleanups` array.
- Palette row: `shortcut` = parsed combo, rendered by `formatShortcut` (`keybindings.ts:40-54`), so the label cannot drift from the chord.
- Contract table (`mod-api-contract.test.ts:150-157`), docs `help/documentation/28-mods.md`.

Dispatcher rules (each one is a concrete failure, not a theory):
- Skip when `e.defaultPrevented`. `registerKeybinding` calls `preventDefault` before its handler (`keybindings.ts:72`), and listeners on one target run in registration order, so a mod chord equal to a built-in loses with no hand-kept table. CodeMirror keymap entries that run also preventDefault (`node_modules/@codemirror/view/dist/index.js:9262-9277`), so editor chords win too. The editor already had to drop `Mod-d` for the app (`editor-extensions.ts:160-162`), which shows double-fire is real. Test the order.
- Skip when `e.repeat` (the app has no guard; the hotkeys mod needed one at `hotkeys.service.ts:47-48`).
- Skip when the target is inside `[role="dialog"]` (pattern at `global-keybindings.ts:44`). Built-ins do not do this, but a chord running behind a mod prompt is worse for mods, and the picker replaces itself on `open`.
- Route through `runAction`, same busy guard as E1.
- Two mods claiming one chord: load is concurrent (`startModsHost` uses `Promise.allSettled`, `mods-host.service.ts:~648`), so a throw or "first wins" depends on timing. Keep it simple: first registered wins, `debug('MOD-HOTKEY', ...)` on the loser. Rare corner case; no UI.

Concrete conflict found: on macOS the editor binds `Mod-Shift-u` to `redoSelection` with `preventDefault: true` (`node_modules/@codemirror/commands/dist/index.js:567,573`; `historyKeymap` is installed at `editor-extensions.ts:163`). The `hotkeys` mod's Cmd+Shift+U (`hotkeys.service.ts:37`) works today only because its capture listener shadows the editor. With the bubble-phase dispatcher it would stop working while the editor is focused, so migrating that mod means picking another chord. This is the main trade-off: capture phase (mod wins, silently breaks editor keys) versus bubble plus `defaultPrevented` (editor and app win, mod author must pick free chords). Recommend bubble, with the debug log when a matching chord arrives already prevented.

Risks:
- Hot path: +1 listener on every keydown, a Map lookup, mod code runs only on a match.
- Unload: disposer removes the entry; the listener itself lives for the app. Test: reload leaves one entry, unload leaves none.
- Layout: built-ins match `e.key` lowercased or `code` (`keybindings.ts:68-69`); Shift+digit and Option change `e.key`, hence "no Alt" and letters only at first.
- `Mod` maps to `meta` like the built-ins (`:59,63`); non-mac behavior not checked.

Removes: the window capture listener (`hotkeys/src/index.ts:16-19`), the typed-twice labels (`hotkeys.service.ts:34-38`), the DOM click (`:22-27`, only if the Tasks chord becomes a Tasks action with `hotkey`, which also needs E1 run keys), and the chord path that bypasses the run view and Stop (`:50-58`).
Unlocks: Cmd+Shift chords on daily-log and tasks actions, chord conflict testing in one place, a chord that runs an action with `input`.

## E3. `when` condition

Tier C. Cost S-M. Not needed now. Prototype as a mod: yes, the check goes inside `run`.

```ts
when?: () => boolean; // sync, would read ctx.app.editorStore.activeTab today
```

Why later:
- Of 25 `addAction` call sites, the note-dependent ones already fail soft: portent throws `Open a note first` (`/Users/diegorv/kokobrain-vaults/kokobrain-mods-src/mods/portent/src/portent.service.ts:19-20`, shown as a failed run plus toast, `mods-host.service.ts:238-242`), playground toasts `No note open` (`playground/src/index.ts:35-36`), one-on-one reads the active tab (`one-on-one.service.ts:16,43`).
- The contract has no active-note read, so a mod `when` needs raw `ctx.app`.
- It puts mod code inside the palette's list build. Built-ins already do this for stores (`commands.ts:56-66`); a throw would break the whole palette, and a synchronous loop freezes the app and Stop cannot end it (`help/documentation/28-mods.md:517`, PRD P4 at `.scratch/vault-mods/PRD.md:48`).
- Reading `$state` inside the evaluation makes the list depend on it. If ever built: evaluate once when the palette opens, in `untrack`, inside try/catch, never per keystroke.

Bugs removed: dead rows in the palette (cosmetic). Experiments unlocked: none that E1 does not already give.

## E4. User rebinding of mod hotkeys

Tier C now. Cost L. Prototype as a mod: partly.

Sketch: settings map `modHotkeys['<modId>:<actionId>'] = string`, dispatcher reads the override, a recorder UI. Files: settings types/store/panel plus the E2 dispatcher. The first version of this (shortcut recorder, conflict warnings, reset) was built and removed within five months (`cb0a0b50e`, ADR 0033 amendment). Only one mod asks for chords. The owner writes the mods, and a saved `main.js` reloads the mod (`help/documentation/28-mods.md` "Reload on save"), so changing the string is the configuration step. Revisit only after several mods carry hotkeys. Interim: a mod can store its own preferred chords with `ctx.saveData` (`mod-api.v1.ts:320-328`) and re-declare them on load once E2 exists.

## E5. Mod keymap entries in CodeMirror, and OS-global mod hotkeys

Tier C, reject for now. Cost L and XL.
- Editor keymap is a static `keymap.of([...])` (`editor-extensions.ts:150-165`) on the typing hot path, under the Live Preview rules. `ctx.app.editorStore.editorView` already gives raw access (`mod-app.service.ts:25`); whether a mod can append a keymap through the host's CodeMirror instance was not tested.
- OS-global accelerators live in Rust (`src-tauri/src/quick_capture/shortcuts.rs:25-37`, two static entries). A mod-facing registry is a new cross-process surface for a rare need.

## Suggested order inside this cluster

1. E1 (registry store, merge, run key). Ship alone; it creates the registry E2 reuses.
2. E2 on the same registry entry, with the three dispatcher guards and the Cmd+Shift+U migration decision.
3. Convert the `hotkeys` mod to declarations (proves E1 plus E2 and deletes its hacks).
4. E3, E4, E5 only on demand.

## Refuted or corrected scout claims

- "GLOBAL_KEYBINDINGS ~30 shortcuts": 26 `handler:` entries (grep count), plus the separate `/` listener.
- "railRegistryStore `reset()` on teardown" (ext:vscode): `railRegistryStore.reset` has no caller under `src/lib`; only tests call it. Cleanup of mod registrations depends entirely on the unload disposers (`mods-host.service.ts:399-405`), so a new registry must do the same.
- "CLAUDE.md lists known core-to-features violations": `layer-baseline.json` holds 3 entries, all `utils/` to `core/`. The CLAUDE.md sentence is stale (ext:popular was right).
- "core/keybindings exists": no; `ls src/lib/core` has no `keybindings`. CLAUDE.md and ADR 0003:65 still list it (doc drift, not a code problem).
- Line cites off: hotkeys mod capture listener is `index.ts:16-19`, not `24-26`; DOM click is `hotkeys.service.ts:22-27`, not `:29`.
- "Plain mod hotkeys only need to avoid GLOBAL_KEYBINDINGS" (keybindings scout): incomplete. CodeMirror binds chords outside that table (`Mod-Shift-u`), found above.
- "Add a `ctx.addCommand` type" (keybindings scout sketch): not needed, see verdict; its `hotkey` rejection rule ("no Mod/Ctrl") is kept.
- Confirmed, not refuted: no repeat/defaultPrevented guard (`keybindings.ts:57-81`), `shortcutFor` throws (`:211-216`), palette recents tolerate stale ids, mods-host imports a feature registry (`:9`), Obsidian warns against default hotkeys (`obsidian.d.ts:2957-2958`, `hotkeys?` at `:2974`).

## Could not verify

- That `AppOverlays`' prop expression re-runs in a mounted component when a `$state.raw` registry changes (comment at `commands.ts:50-55` and unit tests only; `AppOverlays.test.ts` does not cover it). Also whether the palette computes its list while closed, which decides how often a future `when` would run.
- Focus handoff from palette to the mod picker for `input` actions and run views (no run, no E2E).
- `Mod` on non-macOS: all built-ins use `meta` only; Linux behavior not checked.
- Whether editor-focused chords like Cmd+Shift+J and Cmd+Shift+Y are free in CodeMirror's keymaps (only `Mod-Shift-u` was checked; the other keymaps were not scanned).
- Nothing was run: no tests, no app, no build.
