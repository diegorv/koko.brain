# 02: Publish the 22 themes to koko.brain-themes

**Status:** resolved

**What to build:** The public repo `diegorv/koko.brain-themes` (empty today) becomes the source of every theme except `KokoBrain Default` and `Lavender Haze`. It holds one JSON file per theme at version `1.0.0`, a JSON Schema for the package format, a script that generates `index.json` from the theme files, and CI that fails on an invalid theme or a stale index. The 22 themes are the 20 presets (Zettlr x10, Tolaria x2, Foolscap, Sepia, Cool Mist, Mint Linen, Lumen Contrast, Ink Night, Deep Ocean, Graphite Violet) plus `Sakura` and `Twilight Violet`.

**Blocked by:** none

**Runs in:** the main session, not relay-lite: the work and the push happen in another repository. The owner authorized the push to `main` (2026-11-03).

**Gate:** the themes repo CI is green on the pushed commit; no change to this repo.

- [x] Each theme is a package in the plan's schemaVersion 1 format: `schemaVersion`, `id` (lowercase slug, stable), `name` (same as today), `version: "1.0.0"`, `author`, `palette` (the theme's `CorePalette`), optional `overrides` (only tokens the theme sets apart from the derivation; `Sakura` and `Twilight Violet` have them).
- [x] Parity: the export builds every package with the app's theme builder and compares the resulting CSS variables with the theme in the current code; any difference aborts before anything is written. The export script is a one-off and is committed to neither repo.
- [x] The JSON Schema enforces the slug, the `MAJOR.MINOR.PATCH` version, the known palette and override keys, and the same color grammar as Issue 01.
- [x] `index.json` carries `schemaVersion` and the full package of every theme, sorted for a stable diff, so the app needs one request for the list, the previews and installs.
- [x] CI (GitHub Actions, current action versions) validates every theme against the schema, rejects duplicate `id` or `name`, and fails when regenerating `index.json` changes it.
- [x] README explains the format, how to add a theme, and that `version` must be bumped on every change for installed copies to see an update.
- [x] Pushed to `main`; the raw URL `https://raw.githubusercontent.com/diegorv/koko.brain-themes/main/index.json` serves the index.

## Notes

- Plan: `.scratch/remote-themes/plan-2026-11-03.md` § Package format, § Parity check.
- Delivered as `diegorv/koko.brain-themes@99f39a5` (2026-11-03); the "Validate themes" CI run passed on it. The raw `index.json` serves 22 themes, `schemaVersion: 1`, with `cache-control: max-age=300`, so a pushed version can take up to 5 minutes to reach the app.
- Parity: a one-off vitest run captured each theme's `buildTheme` arguments, round-tripped the package through JSON, rebuilt it with the real builder and compared `themeColorsToCssVars` with the theme in code; all 22 matched.
- Only `sakura` and `twilight-violet` carry `overrides` (groups `ui`, `syntax`, `preview`, `wikilink`). Exported values are hex (6 or 8 digits) and `rgba(...)`.
- The schema's color pattern (`$defs.color` in `schema/theme.schema.json`) accepts hex 3/4/6/8, `rgb[a]()` / `hsl[a]()` / `oklch()` with only digits, `.`, `%`, `,`, space, `/`, `+`, `-` (and `deg`) inside, `transparent`, and `color-mix(in srgb, <color> N%, transparent)`; max length 64. Issue 03 must accept at least this set, or a valid catalog entry is skipped in the app.
