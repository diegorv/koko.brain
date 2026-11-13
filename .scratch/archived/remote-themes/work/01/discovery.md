# Issue 01 discovery

## Files that change

- `src/lib/core/settings/theme-validation.logic.ts` (new): pure validator. `isThemeColorValue(value: unknown)` for a single value, `findInvalidThemeToken(colors: unknown)` for a partial `ThemeColors`-shaped token map (returns the first bad path such as `preview.embedBg`, or null). Known groups/keys come from `KOKOBRAIN_DEFAULT_THEME.colors` (`theme.logic.ts:87`). Own file because Issue 03 reuses it for catalog packages.
- `src/lib/core/settings/theme-editor.logic.ts:276` `parseThemeFromImport`: returns `{ ok: true, theme } | { ok: false, error }` instead of `Theme | null`; adds a size cap on the raw JSON and runs `findInvalidThemeToken` on `colors`.
- `src/lib/core/settings/sections/ThemeEditor.svelte:106-110`: shows `result.error` instead of the generic message. Merge with defaults (`mergeThemeWithDefaults`) is unchanged, so partial files still fill.

## Plan

1. Failing tests first: every built-in theme (`BUILTIN_THEMES`, includes presets) passes the validator per token; export -> import round-trips each built-in unchanged.
2. Validator grammar: hex 3/4/6/8; `rgb|rgba|hsl|hsla|oklch(` 3-4 numeric/percent args separated by comma, space or `/` `)`; `transparent`; `color-mix(in srgb, <base color> N%, transparent)` (the form `alpha()` in `theme-builder.logic.ts:84` emits). Length cap 128 chars. Everything else (url, var, expression, `;{}"'\`, empty, non-string) fails by not matching.
3. Import: refuse JSON over 64 KiB, unknown group, unknown key, group not an object, bad value. Messages name the path.
4. ThemeEditor component test (jsdom, file input change event) asserting the rendered message.

## Prior art

- `src/tests/lib/core/settings/theme-editor.logic.test.ts:158` (parseThemeFromImport tests, updated to the new result shape).
- `src/tests/lib/core/settings/EditorSection.test.ts` (mount + flushSync component test pattern).

## Risks

- `utils/color.ts` parses only hex and rgb() for contrast; it does not cover hsl/oklch/color-mix and is lenient (no end anchor on rgb), so it is not reused as the validator. The accept list is the contract.
- Changing the return type of `parseThemeFromImport` touches its only caller (`ThemeEditor.svelte`).

## Defaults taken

- Values must match exactly (no trimming); function names and hex digits are case-insensitive.
- Theme `name` is not validated beyond today's non-empty check (it never reaches CSS).
- Size caps: 64 KiB per file, 128 chars per value.
