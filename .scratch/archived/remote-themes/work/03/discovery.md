# Issue 03 discovery

## Files that change

- `src/lib/core/settings/theme-package.logic.ts` (new): `ThemePackage` type, `THEME_PACKAGE_SCHEMA_VERSION = 1`, `parseThemePackage(raw)` (slug id, semver, palette keys + colors, overrides via `findInvalidThemeToken` from `theme-validation.logic.ts`), `parseThemeCatalog(text)` (size cap, JSON, `themes` array, per-entry parse; bad entries skipped with a reason), `buildThemeFromPackage`, `installThemePackage` / `uninstallTheme` / `isInstalledTheme` (pure `AppearanceSettings` -> `AppearanceSettings`).
- `src/lib/core/settings/theme-catalog.service.ts` (new): `fetchThemeCatalog()` through `@tauri-apps/plugin-http`, throws on network / HTTP / invalid index, logs skipped entries with `debug`.
- `src/lib/core/settings/theme.types.ts:225` `AppearanceSettings`: add `installed?: ThemePackage[]`.
- `src/lib/core/settings/theme.logic.ts:507` `normalizeAppearance`: rebuilds every installed package with `buildTheme`, replaces a saved `themes` entry of that name with it (keeps its position), appends missing ones, drops invalid saved packages.
- `src/lib/core/settings/sections/AppearanceSection.svelte`: installed rows show Duplicate + Uninstall (no Edit); new Catalog block below the list, loaded on mount: loading, error (+ toast), entries with mini preview, name, author, version and Install / Installed / Built-in / "Requires a newer KokoBrain". Mini preview extracted to `ThemePreview.svelte` to reuse it.
- `src-tauri/capabilities/default.json`: add `https://raw.githubusercontent.com/diegorv/koko.brain-themes/**` to the four `http:allow-fetch*` entries. CSP untouched.
- `help/documentation/26-theming.md`: catalog section. `docs/adr/0035-remote-theme-catalog.md` (new) + ADR README index.

## Plan (test-first)

1. `theme-package.logic.test.ts`: package validation cases, catalog parse (skip invalid, too-new), install / uninstall / name refusal / built-in, buildThemeFromPackage equals `buildTheme`.
2. `normalizeAppearance` reload tests in `theme.logic.test.ts` + a `loadSettings` round trip in `settings.service.test.ts` (store state after reload).
3. `theme-catalog.service.test.ts`: only `@tauri-apps/plugin-http` mocked: happy, network error, HTTP 500, invalid JSON, invalid entry skipped, too-new.
4. `AppearanceSection.test.ts` (jsdom, mount + flushSync like `ThemeEditor.test.ts`), HTTP plugin and `svelte-sonner` mocked: Install, Installed, Built-in, too-new, error states; install puts the theme in the list; uninstall of active falls back.

## Risks

- The expanded colors of an installed theme are still written in `themes` (the store holds the built theme so `findThemeByName` / `applyActiveTheme` keep working); `normalizeAppearance` ignores them and rebuilds from `installed`, same as built-ins today. The package is the source.
- All 22 catalog entries are built-in until Issue 05, so Install is only reachable in tests for now.

## Defaults taken

- Catalog states keyed by package `id` for Installed; Built-in by name match with `BUILTIN_THEMES`.
- Name conflict: Install button stays, click refuses with a toast naming the conflict.
- Index: must be an object with a `themes` array; response capped at 512 KiB; top-level `schemaVersion` not checked (each entry carries its own).
- Too-new entry: only `id`, `name`, `version` checked; no preview drawn.
- Skipped entries logged with `debug('THEME-CATALOG', ...)` (not `error`: third-party data, keep it out of Sentry).
