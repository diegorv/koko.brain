# 05: Mod color from the manifest, and the docs for the rail forms

**What to build:** two parts, in this order. First, a mod declares its own icon color in `manifest.json`, one value for light themes and one for dark, for all of that mod's rail buttons. Then the docs describe the rail as it was delivered.

```json
{ "id": "tasks", "name": "Tasks", "version": "1.0.0", "color": { "light": "#7c3aed", "dark": "#c4b5fd" } }
```

### Mod color

- **`parseModManifest`** (`src/lib/plugins/mods/mods.logic.ts`): optional `color`, an object with both `light` and `dark`, each `#rgb` or `#rrggbb`. Hex only, since it reaches inline styles. Errors follow the file's form and name the field: `color must be an object with light and dark`, `color.light must be a hex color like #d946ef`, `color.dark must be ...`. `ModManifest` gets `color?: { light: string; dark: string }`.
- **`RailAction`** (`rail-shell.types.ts`) gets `color?: { light: string; dark: string }`, with a doc comment. `mods-host.service.ts` passes `manifest.color` in `addRailButton`'s `registerAction` call.
- **Pure logic:** `railActionColor(color, isDark)` in `rail-items.logic.ts`: the declared value for the theme, else `#d946ef`.
- **`Rail.svelte`:** the action row's color comes from `railActionColor(action.color, appliedThemeStore.isDark)`, read at render so a theme change follows at once. Only the icon uses it: an action is never active, so there is no tint.
- **Contract:** `ModRailButtonV1` and `ModInfoV1` do not change and `contract/mod-api.v1.ts` is not edited. No `apiVersion` bump: the rule in its header is about `ModContextV1` members, and a v1 mod with a `color` key already loaded, since unknown keys were ignored. `mod-api-contract.test.ts` passes unedited.

### Docs

Read the shipped code first. Every value in the docs comes from the code as delivered, not from the PRD: earlier Issues may have adjusted pane sizes.

- **`help/documentation/28-mods.md`** § The manifest: a row in the table and the key in the example, saying it applies to all of the mod's buttons, that both values are required, and that without it a button uses the default color. If vault-mods Issue 07 is still editing this file, rebase onto main first.
- **`docs/adr/0033-icon-rail-and-note-list-replace-sidebar-modes.md`:** a dated amendment in the file's style. Whole-rail scroll replaces "the group scrolls and the rest of the rail stays fixed" from the 2026-11-04 pinned items amendment. The three forms, the `layout.railStyle`, `layout.railCollapsed` and `layout.railWidth` keys with their defaults and `parse*` functions, width saved when the drag ends, the fixed palette and the theme-independent reason for the full-text-color active title, divider token and why, the new default pane sizes with the editor width they give at 1440 px, replacing "navigator 14 %, note list 20 %, right sidebar 20 %" and "about 640 px", `--rail-header-pad` and why a CSS variable, and the mod `color` manifest key. Name the code.
- **`help/documentation/01-getting-started.md`:** § The Rail (it says "column of icons", "Hover an icon for its name" and "With many pins, this group scrolls"), and lines 54, 73 and 82, which say "icon rail" and "the rail never hides". Explain the toggle and that it differs from Cmd+Shift+B.
- **`help/documentation/19-settings.md`:** § Layout > Rail, rows for Rail style and Collapse rail with their keys and defaults, and a sentence on `layout.railWidth`, which has no control other than dragging.
- **`help/documentation/02-file-explorer.md:3`, `07-sidebar-panels.md:5`:** "icon rail".
- **`help/documentation/26-theming.md:126,135`:** the rail's dividers no longer use `fileExplorerBorder`, and its item colors do not come from the theme. Say which tokens still apply (the edge uses the border token, titles use `fileExplorerFg`).
- **`help/documentation/25-types-and-relationships.md` § Pinned Rail Items** and anything else a search for `icon rail`, `column of icons` or `48 px` finds under `help/` and `docs/`. Do not rewrite amendments that record past states in other ADRs.
- Screenshots are not regenerated.

**Blocked by:** 03

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts e2e/specs/rail-styles.spec.ts`.

- [x] Failing tests were written first and seen failing, for each mod color item below.
- [x] `parseModManifest`: valid 3 and 6 digit values kept; uppercase hex accepted; no `color` gives no key; `color` as a string, an array and `null`; `light` missing; `dark` missing; `red`, `rgb(0,0,0)`, `#12`, `#12345g` and `url(x)` rejected. Each error names the field and starts with `_system/mods/<folder>: manifest.json`.
- [x] `railActionColor`: declared light, declared dark, none.
- [x] `mods-host.service.test.ts` with real stores: every button a mod registers has the manifest's color in `railRegistryStore.actions`; a mod with none has no color; saving a changed manifest reloads the mod and the store shows the new color.
- [x] `Rail.test.ts`, in all three forms: the icon wrapper uses the declared color for `appliedThemeStore.isDark`; flipping `setDark` in the real store changes it; a button with no color uses `#d946ef`; no `aria-current` and no tint; `[data-rail-actions] [aria-label="..."]` still finds it.
- [x] `mod-api-contract.test.ts` passes with no edit to it or to `contract/mod-api.v1.ts`.
- [x] E2E: a mod with `color` shows the dark value's computed color on the default dark theme; switching to Lavender Haze shows the light value without a reload; saving a new `manifest.json` changes the color; a broken `color` shows the mod as Error in Labs with the field named.
- [x] `help/documentation/28-mods.md` documents the key.
- [x] ADR-0033 has the amendment, with every item above, and states the final pane sizes as they are in `settings.store.svelte.ts`.
- [x] `git grep -n -E "icon rail|column of icons|Hover an icon" help/` finds nothing that describes the current rail.
- [x] `help/documentation/19-settings.md` lists the three keys with the defaults the code has.
- [x] `help/documentation/26-theming.md` no longer says the border token paints the rail's dividers.

## Notes

- The reload-on-save E2E already in `e2e/specs/vault-mods.spec.ts` shows how to save a manifest on the mock FS.
- Commit the docs apart from the code on the branch, so a review reads them on their own and checks each stated value against the code.
- Do not write that the note list count always shows. It hides under a 12rem container query (`RailNoteList.svelte`), which in the default labeled form means any window under about 1392 px, including the 1200 px default. `help/documentation/01-getting-started.md` line 99 calls Sort "the dropdown next to the count": reword it.

## Comments

2026-11-06, branch `issue/05-mod-color-and-docs`. A mod's rail buttons take the color of its `manifest.json` (parsed and validated in `parseModManifest`, picked by theme in `railActionColor`). The help pages and ADR-0033 describe the rail as delivered, with the mod color key.

Tests: full suite passed at febe49ac4 (exit=0): vitest 568 files passed, 13689 tests passed, 54 skipped, 1 todo; `pnpm build` ok. Log: `/Users/diegorv/Dev/pet-projects/koko/brain.worktrees/test-logs/rail-styles/05-deliver.log`. Targeted before it: `pnpm check` exit 0; `src/tests/lib/core/settings/settings.store.test.ts` exit 0. E2E in review round 1: `vault-mods.spec.ts` and `rail-styles.spec.ts`, 58 passed.

Reviews: round 1 APPROVED with one minor note and two nits; round 2 APPROVED, no findings. Fixed from round 1: "Each built-in item" and the mod button's picker in `01-getting-started.md`; about 610 px in the settings store comment and its test comment. Deviation kept: the mod color E2E was committed after the code, so it was seen red but not written first.
