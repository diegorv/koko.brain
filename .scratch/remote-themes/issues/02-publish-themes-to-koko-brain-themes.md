# 02: Publish the 22 themes to koko.brain-themes

**Status:** ready-for-agent

**What to build:** The public repo `diegorv/koko.brain-themes` (empty today) becomes the source of every theme except `KokoBrain Default` and `Lavender Haze`. It holds one JSON file per theme at version `1.0.0`, a JSON Schema for the package format, a script that generates `index.json` from the theme files, and CI that fails on an invalid theme or a stale index. The 22 themes are the 20 presets (Zettlr x10, Tolaria x2, Foolscap, Sepia, Cool Mist, Mint Linen, Lumen Contrast, Ink Night, Deep Ocean, Graphite Violet) plus `Sakura` and `Twilight Violet`.

**Blocked by:** none

**Runs in:** the main session, not relay-lite: the work and the push happen in another repository. The owner authorized the push to `main` (2026-11-03).

**Gate:** the themes repo CI is green on the pushed commit; no change to this repo.

- [ ] Each theme is a package in the plan's schemaVersion 1 format: `schemaVersion`, `id` (lowercase slug, stable), `name` (same as today), `version: "1.0.0"`, `author`, `palette` (the theme's `CorePalette`), optional `overrides` (only tokens the theme sets apart from the derivation; `Sakura` and `Twilight Violet` have them).
- [ ] Parity: the export builds every package with the app's theme builder and compares the resulting CSS variables with the theme in the current code; any difference aborts before anything is written. The export script is a one-off and is committed to neither repo.
- [ ] The JSON Schema enforces the slug, the `MAJOR.MINOR.PATCH` version, the known palette and override keys, and the same color grammar as Issue 01.
- [ ] `index.json` carries `schemaVersion` and the full package of every theme, sorted for a stable diff, so the app needs one request for the list, the previews and installs.
- [ ] CI (GitHub Actions, current action versions) validates every theme against the schema, rejects duplicate `id` or `name`, and fails when regenerating `index.json` changes it.
- [ ] README explains the format, how to add a theme, and that `version` must be bumped on every change for installed copies to see an update.
- [ ] Pushed to `main`; the raw URL `https://raw.githubusercontent.com/diegorv/koko.brain-themes/main/index.json` serves the index.

## Notes

- Plan: `.scratch/remote-themes/plan-2026-11-03.md` § Package format, § Parity check.
