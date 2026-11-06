# 05: Mod color from the manifest

**What to build:** a mod declares its own icon color in `manifest.json`, one value for light themes and one for dark, for all of that mod's rail buttons.

```json
{ "id": "tasks", "name": "Tasks", "version": "1.0.0", "color": { "light": "#7c3aed", "dark": "#c4b5fd" } }
```

- **`parseModManifest`** (`src/lib/plugins/mods/mods.logic.ts`): optional `color`, an object with both `light` and `dark`, each `#rgb` or `#rrggbb`. Hex only, since it reaches inline styles. Errors follow the file's form and name the field: `color must be an object with light and dark`, `color.light must be a hex color like #d946ef`, `color.dark must be ...`. `ModManifest` gets `color?: { light: string; dark: string }`.
- **`RailAction`** (`rail-shell.types.ts`) gets `color?: { light: string; dark: string }`, with a doc comment. `mods-host.service.ts` passes `manifest.color` in `addRailButton`'s `registerAction` call.
- **Pure logic:** `railActionColor(color, isDark)` in `rail-items.logic.ts`: the declared value for the theme, else `#d946ef`.
- **`Rail.svelte`:** the action row's color comes from `railActionColor(action.color, appliedThemeStore.isDark)`, read at render so a theme change follows at once. Only the icon uses it: an action is never active, so there is no tint.
- **Contract:** `ModRailButtonV1` and `ModInfoV1` do not change and `contract/mod-api.v1.ts` is not edited. No `apiVersion` bump: the rule in its header is about `ModContextV1` members, and a v1 mod with a `color` key already loaded, since unknown keys were ignored. `mod-api-contract.test.ts` passes unedited.
- **Docs:** `help/documentation/28-mods.md` § The manifest, a row in the table and the key in the example, saying it applies to all of the mod's buttons, that both values are required, and that without it a button uses the default color. If vault-mods Issue 07 is still editing this file, rebase onto main first.

**Blocked by:** 04

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts e2e/specs/rail-styles.spec.ts`.

- [ ] Failing tests were written first and seen failing, for each item below.
- [ ] `parseModManifest`: valid 3 and 6 digit values kept; uppercase hex accepted; no `color` gives no key; `color` as a string, an array and `null`; `light` missing; `dark` missing; `red`, `rgb(0,0,0)`, `#12`, `#12345g` and `url(x)` rejected. Each error names the field and starts with `_system/mods/<folder>: manifest.json`.
- [ ] `railActionColor`: declared light, declared dark, none.
- [ ] `mods-host.service.test.ts` with real stores: every button a mod registers has the manifest's color in `railRegistryStore.actions`; a mod with none has no color; saving a changed manifest reloads the mod and the store shows the new color.
- [ ] `Rail.test.ts`, in all three forms: the icon wrapper uses the declared color for `appliedThemeStore.isDark`; flipping `setDark` in the real store changes it; a button with no color uses `#d946ef`; no `aria-current` and no tint; `[data-rail-actions] [aria-label="..."]` still finds it.
- [ ] `mod-api-contract.test.ts` passes with no edit to it or to `contract/mod-api.v1.ts`.
- [ ] E2E: a mod with `color` shows the dark value's computed color on the default dark theme; switching to Lavender Haze shows the light value without a reload; saving a new `manifest.json` changes the color; a broken `color` shows the mod as Error in Labs with the field named.
- [ ] `help/documentation/28-mods.md` documents the key.

## Notes

- The reload-on-save E2E already in `e2e/specs/vault-mods.spec.ts` shows how to save a manifest on the mock FS.

## Comments
