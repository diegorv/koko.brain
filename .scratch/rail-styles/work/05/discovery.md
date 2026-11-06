# Issue 05 discovery: mod color from the manifest, and the docs

Builds on `.scratch/rail-styles/work/03`. No rebase needed: vault-mods 07 is not in flight on this branch (read on f97fdff67).

## Files that change

Code:
- `src/lib/plugins/mods/mods.logic.ts:78-91` `ModManifest.color`; `:119-137` validation in `parseModManifest`.
- `src/lib/features/rail-shell/rail-shell.types.ts:202-213` `RailAction.color`.
- `src/lib/features/rail-shell/rail-items.logic.ts:140-141` `railActionColor` next to `RAIL_ACTION_COLOR`.
- `src/lib/plugins/mods/mods-host.service.ts:338` `color: manifest.color`.
- `src/lib/features/rail-shell/Rail.svelte:180` the action row's color.
- Tests: `mods.logic.test.ts:146`, `rail-items.logic.test.ts:179`, `mods-host.service.test.ts:516,805`, `Rail.test.ts:863`, `e2e/specs/rail-styles.spec.ts`.

Docs (separate commit): `help/documentation/{01-getting-started,02-file-explorer,07-sidebar-panels,19-settings,25-types-and-relationships,26-theming,28-mods}.md`, `docs/FEATURES.md:24`, `docs/adr/0033-icon-rail-and-note-list-replace-sidebar-modes.md`.

## Store chain

`registerAction` writes `railRegistryStore.actions`; read by `Rail.svelte` `actionRows` (a `$derived` over `actionRow`). `appliedThemeStore.isDark` is written by `theme.service.ts`; reading it in `actionRow` puts it in that derived's dependencies, so a theme change repaints. No computed getter involved.

## Plan

1. `parseModManifest`, `railActionColor`, host, `Rail.svelte`, each red first. One commit per step.
2. E2E `Mod color` block in `rail-styles.spec.ts`: dark value on the default theme, Lavender Haze picked through Settings > Appearance gives the light value with no reload, a saved manifest changes it, a broken `color` shows Error in Labs.
3. Docs commit, every value read from the code; the 1440 px editor width measured, not copied.

## Prior art

- Manifest save on the mock FS: `e2e/specs/vault-mods.spec.ts:246`, with `manifest.json` in place of `main.js`.
- Host reload: `mods-host.service.test.ts:559`. Rail action in each form: `Rail.test.ts:965`.

## Risks

- `--rail-c` sits on the button and the icon wrapper reads it. jsdom has no cascade, so the unit test asserts both the property and the wrapper's `var(--rail-c)`; only the E2E reads the computed color.
- Issue line numbers for `26-theming.md` have moved (126,135 are now 129,138). `fileExplorerBorder` row and the section intro are what change.

## Defaults taken

- `RAIL_ACTION_COLOR` stays exported: `rail-items.logic.test.ts:182` asserts it, and `railActionColor` falls back to it.
- `docs/adr/0026` and `docs/adr/README.md` keep the title "An icon rail ...": it is ADR-0033's recorded name and file name, so the title is not changed. ADR-0033's Decision text stays too; the amendment records what changed.
- `docs/FEATURES.md:24` "Icon rail and note list" is reworded, since the search covers `docs/` and it describes the current rail.
- "The rail never hides" stays true (collapsing narrows it), so it stays, next to the toggle's explanation.
