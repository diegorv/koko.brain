# 01: Settings > Labs with a per-vault mods toggle

**What to build:** a new Settings section, **Labs**, the home for experimental features. Its first and only control is **Vault mods**, off by default. This Issue stores and shows the flag. Nothing is loaded yet (Issue 02).

- **Section.** Add `'labs'` to `SettingsSection` (`src/lib/core/settings/settings.types.ts:331`) and a new `Labs` group with one `labs` section, last in `SETTINGS_SECTION_GROUPS` (`src/lib/core/settings/settings.logic.ts:217`), after Advanced. `settings.logic.test.ts` pins the exact group and section lists (around `:357` and `:362`): add `Labs` and `labs` to those expected lists. That is the intended change, not a weakened test. The component is `src/lib/app/LabsSection.svelte`, mapped in `src/lib/app/SettingsPanel.svelte` the way `QueryjsSection` is (`SettingsPanel.svelte:18`, `:84`), with an icon in `sectionIcons` (`SettingsPanel.svelte:41-60`). It lives in `app/` because later Labs entries may come from several layers.
- **Storage (PRD P1).** Per machine, keyed by the vault's absolute path, in `localStorage`, following recent vaults (`src/lib/core/vault/vault.store.svelte.ts:4`, `:44-56`, including the try/catch on read). Not in `<vault>/.kokobrain/settings.json`. A vault opened at a new path starts off. Suggested key: `kokobrain:mods-enabled-vaults`, a JSON array of paths.
- **Code.** A pure `src/lib/plugins/mods/mods-enabled.logic.ts` (parse the stored value, add or remove a path, tolerate garbage) and a `src/lib/plugins/mods/mods-enabled.store.svelte.ts` exposing a getter for the current vault and a setter. Store getters per ADR-0034; every computed getter gets a test.
- **Copy.** Toggle label "Vault mods". Help line: "Run JavaScript mods from `_system/mods/` in this vault. Mods run with full access to the app and your files. Only enable mods you wrote." While Issue 02 is not merged, add nothing about reloading.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [x] Failing tests first:
  - `mods-enabled.logic.ts`: empty storage, garbage JSON, add, remove, two vaults kept apart, the same path added twice stays once.
  - Store with real `localStorage` (jsdom): off by default; turning it on for vault A leaves vault B off; the value survives a store re-read.
  - `settings.logic.test.ts`: the expected group and section lists include Labs, last.
  - `LabsSection` component test: the toggle reflects and changes the store.
- [x] `layer-rules.test.ts` reports no new violation.

## Notes

- PRD P1 (per-machine storage keyed by vault path) was confirmed by the owner on 2026-11-06.
- **Size:** S.

## Comments

- 2026-11-06, branch `issue/01-labs-mods-toggle`: added the per-vault mods flag (`mods-enabled.logic.ts` + store over `localStorage`) and Settings > Labs with a Vault mods toggle. Review round 1 APPROVED with nits; the fix round made `setEnabled` update state only after the write succeeds, with a toast on failure in `LabsSection`. Review round 2 APPROVED with no findings. Full suite at 9c301e686: vitest 550 files, 13029 passed, 1 skipped, 1 todo; `pnpm build` ok; `pnpm check` 0 errors.
