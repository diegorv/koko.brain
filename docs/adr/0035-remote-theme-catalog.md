---
type: ADR
id: "0035"
title: "Themes beyond the built-ins come from a public catalog, installed as color-only source packages"
status: active
date: 2026-11-03
---

## Context

Every theme shipped in the code: four originals plus 20 presets, each a `buildTheme(name, palette, overrides)` call in `theme.logic.ts` / `theme-presets.ts`. Adding or fixing a theme meant an app release, and every vault's `settings.json` carried the ~150 expanded tokens of all of them.

A theme someone else publishes is untrusted input. `applyTheme` (`theme.service.ts`) writes each token with `style.setProperty` on the document root, and the CSP allows `img-src https:`, so a value such as `url(https://...)` would make the app fetch it. Before Issue 01, the manual JSON import checked only `name` and `colors`.

## Decision

**Besides the two built-ins that stay in the code (`KokoBrain Default` and `Lavender Haze`), themes come from the public repo `diegorv/koko.brain-themes`, read from its `index.json` through the Tauri HTTP plugin, and an installed theme is stored as its source package, not as expanded tokens.**

- **Package format, `schemaVersion: 1`:** `{ schemaVersion, id, name, version, author, palette, overrides? }`. `id` is a lowercase slug, stable forever; `version` is plain `MAJOR.MINOR.PATCH`; `palette` is a `CorePalette`; `overrides` is a partial `ThemeColors`. The index embeds every full package, so one request serves the list, the previews and Install. The app reads `schemaVersion` up to `THEME_PACKAGE_SCHEMA_VERSION` (`theme-package.logic.ts`); a higher one shows "Requires a newer KokoBrain" and cannot be installed.
- **Source, not tokens:** `appearance.installed` holds the packages. `loadAppearance` rebuilds each with `buildTheme` on every settings load and replaces whatever colors `themes` saved under that name. A token the app adds later is then derived from the palette instead of being filled from the dark default by `mergeThemeWithDefaults`, which would put a dark color into a light theme.
- **Trust boundary:** every palette and override value must match the color grammar of `isThemeColorValue` (`theme-validation.logic.ts`): hex, numeric `rgb/rgba/hsl/hsla/oklch`, `transparent`, and the `color-mix` that `alpha()` emits. Unknown palette or override keys are refused. An invalid entry is skipped and logged; the rest of the catalog still shows. The index is capped at 512 KiB. The HTTP permission (`src-tauri/capabilities/default.json`, `http:allow-fetch*`) is scoped to `https://raw.githubusercontent.com/diegorv/koko.brain-themes/**`, and the webview CSP `connect-src` does not change.
- **Identity:** `activeTheme` stays a name. Install is refused when the name is taken by another theme in the list. An installed theme cannot be edited in place; Duplicate makes an independent user theme. Uninstalling the active theme falls back to `KokoBrain Default`.

## Alternatives considered

- **Keep every theme in the code**: no network, no trust boundary. Rejected: every theme change needs a release, and the settings file keeps growing with themes the user never picked.
- **Store the expanded tokens of an installed theme**: what user themes and the old built-ins store. Rejected: tokens added to the app later would come from the dark default, and the update in place planned next would have to diff ~150 tokens instead of replacing one package.
- **Fetch from the webview with `fetch()`**: needs `raw.githubusercontent.com` in the CSP `connect-src`, opening it to any repo for every script in the webview. Rejected for the scoped plugin permission, as Todoist already does.
- **One request per theme file**: the per-theme files stay the source of truth in the repo, but listing 22 themes would cost 23 requests. Rejected for a generated index.

## Consequences

- The catalog needs the network when Settings > Appearance opens; installed and built-in themes never do. raw.githubusercontent.com caches for about 5 minutes, so a newly pushed version can take that long to show.
- The expanded colors of an installed theme are still written in `themes` (the store holds the built theme so activation works unchanged); they are discarded on load. The copy keeps the theme's place in the list and is the fallback when a saved package no longer validates: the theme then stays as a user theme instead of disappearing.
- The validator is the contract with the themes repo: its JSON Schema must accept no more than `isThemeColorValue`, or a valid catalog entry is skipped in the app.
- Revisit when the package format needs a field the app must understand: bump `schemaVersion`, keep reading version 1, and publish new entries under the new version.
