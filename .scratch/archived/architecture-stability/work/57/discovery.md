# Issue 57 discovery

No `spec.md` exists for architecture-stability.

## Files that change

- `src/lib/app/global-keybindings.ts:54-184`: the 25 `registerKeybinding({...})` calls become a module-level
  `GLOBAL_KEYBINDINGS` list; entries the palette lists carry a `command` id. `registerGlobalKeybindings`
  maps `registerKeybinding` over the list (the `command` field stripped, same objects, same order).
  New `shortcutFor(commandId)` returns the binding's key/code/modifiers; throws when no binding has the id.
- `src/lib/app/commands.ts:46-307`: the 18 literal `shortcut: {...}` become `shortcutFor('<id>')`, except
  Copy Link to Block, which takes `COPY_BLOCK_LINK_SHORTCUT` (below).
- `src/lib/core/markdown-editor/setup/editor-extensions.ts:118-124`: Cmd+Shift+L is an editor-scoped
  CodeMirror keymap entry (`'Mod-Shift-l'`), not a global binding. Export `COPY_BLOCK_LINK_SHORTCUT` and
  build the keymap key from it with `toCodeMirrorKey()`, so the editor registration is the one declaration.
- `src/lib/utils/keybindings.ts`: `KeyCombo` type (a `KeyBinding` without the handler) and the pure
  `toCodeMirrorKey(combo)` (`meta` -> `Mod`, as today).

## Tests

- `src/tests/lib/app/commands.test.ts`: new test, every palette shortcut equals a combo some registration
  binds (the `registerKeybinding` calls of `registerGlobalKeybindings`, recorded through a pass-through mock,
  plus the editor's `COPY_BLOCK_LINK_SHORTCUT`). Existing literal-shortcut assertions stay as the label check.
- `src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts`: Cmd+Shift+L in a mounted view runs
  `copyBlockLinkToClipboard` (copy of the Mod-d test at :89, jsdom `Mod` = Ctrl).
- `src/tests/utils/keybindings*` (find it): `toCodeMirrorKey`.
- `src/tests/lib/app/global-keybindings.test.ts`: unchanged, must still pass (25 calls, same objects);
  add `shortcutFor` throw on an unknown id.

## Defaults taken

- `RESERVED_KEYBINDINGS` no longer exists: it lived in `core/keybindings/keybindings.logic.ts:112`, deleted
  with the keybindings setting in 43498215 (sidebar-redesign Issue 25). Nothing reserves keys today, so the
  criterion holds with nothing to derive; it is not recreated (no consumer).
- `shortcutFor` throws on an unknown id instead of returning undefined, so a typo fails loudly in
  `commands.test.ts` rather than silently dropping a label.

## Risks

- `commands.ts` now imports `global-keybindings.ts` and `editor-extensions.ts`; both are app-bundle
  modules already, app -> core is allowed. Their imports load in `commands*.test.ts`.
