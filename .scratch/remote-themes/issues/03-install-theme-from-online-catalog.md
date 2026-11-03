# 03: Install a theme from the online catalog

**Status:** ready-for-agent

**What to build:** Settings > Appearance shows the themes published in `diegorv/koko.brain-themes`, read from its `index.json` when the section opens. Each catalog theme shows its mini preview, name, author and version, with an Install button. Installing stores the theme's package in the appearance settings, so it stays after a restart and works offline; the theme then appears in the theme list and can be activated like any other. An installed theme cannot be edited in place: it offers Duplicate (which makes a normal, editable user theme) and Uninstall. If the request fails or the index is invalid, the catalog shows an error state and a toast, and the installed and built-in themes keep working.

**Blocked by:** 01 (color validator), 02 (the index exists)

**Gate:** all four (`cargo test` + `pnpm check` + `pnpm vitest run` + `pnpm build`): the HTTP permission lives in the Tauri capabilities.

- [ ] The fetch goes through the Tauri HTTP plugin, already used by Todoist, with a capability scoped to `https://raw.githubusercontent.com/diegorv/koko.brain-themes/**` only; the webview CSP does not change.
- [ ] Every package from the index is validated (schemaVersion known, slug id, semver version, palette and overrides through Issue 01's validator); an invalid entry is skipped and logged, the rest of the catalog still shows. A `schemaVersion` above the app's shows the entry as "Requires a newer KokoBrain" with no Install button.
- [ ] Installed themes are stored as packages (source, not expanded colors) and built with the theme builder when the appearance settings load, so a token added to the app later is derived for them.
- [ ] Install is refused, with a message, when the name is already used by another theme in the list. While the 22 presets are still built in (until Issue 05), their catalog entries show "Built-in" instead of Install.
- [ ] Uninstalling the active theme falls back to `KokoBrain Default`, as deleting a user theme does today. A duplicate of an installed theme is independent of it.
- [ ] Tests: catalog service with only the HTTP plugin mocked (happy path, network error, invalid JSON, invalid entry skipped, too-new schemaVersion), the appearance store state after install / uninstall / reload, and a component test that asserts the rendered catalog states (Install, Installed, Built-in, error).
- [ ] The in-app theming help page (`help/documentation`) explains the catalog: install, duplicate to customize, uninstall.
- [ ] An ADR records the decision: themes besides the two built-ins come from the public repo, the package format and its `schemaVersion`, why the source palette is stored instead of expanded tokens, and the trust boundary (color-only values, scoped HTTP permission).

## Notes

- Plan: `.scratch/remote-themes/plan-2026-11-03.md` § Fetching, § Identity and names.
- `activeTheme` stays a name; installed packages add a stable `id` next to it.
