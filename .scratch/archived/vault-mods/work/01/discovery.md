# Issue 01 discovery: Settings > Labs with a per-vault mods toggle

## Files that change

- `src/lib/core/settings/settings.types.ts:331` add `'labs'` to `SettingsSection`.
- `src/lib/core/settings/settings.logic.ts:217-266` add `{ group: 'Labs', sections: [{ id: 'labs', label: 'Labs' }] }` after Advanced.
- `src/lib/app/SettingsPanel.svelte:18,42-61,68-87` import `LabsSection`, add a `labs` icon (lucide `flask-conical`) and component entry. The `Record<SettingsSection, ...>` types force both.
- New `src/lib/app/LabsSection.svelte`: heading, one `SettingItem` "Vault mods" with the help line from the Issue, a `Switch` bound to the store.
- New `src/lib/plugins/mods/mods-enabled.logic.ts`: `parseEnabledVaults(raw)` (null, bad JSON, non-array, non-string entries all tolerated, deduped) and `setVaultEnabled(paths, path, enabled)` (no duplicates, removal of absent path is a no-op).
- New `src/lib/plugins/mods/mods-enabled.store.svelte.ts`: `$state` list loaded from `localStorage['kokobrain:mods-enabled-vaults']` with try/catch on read (as `vault.store.svelte.ts:44-51`), getter `enabled` (current `vaultStore.path` in the list, false with no vault), `setEnabled(value)` (no-op with no vault open), `_reset()`.

## Tests

- New `src/tests/lib/plugins/mods/mods-enabled.logic.test.ts`: empty, garbage JSON, non-array, add, remove, two vaults apart, add twice stays once.
- New `src/tests/lib/plugins/mods/mods-enabled.store.test.ts` (jsdom, real `localStorage`): off by default, A on leaves B off, survives a re-read (`vi.resetModules()` + re-import), no vault open is off and set is a no-op.
- `src/tests/lib/core/settings/settings.logic.test.ts:357,362` add `Labs` / `labs` last.
- New `src/tests/lib/app/LabsSection.test.ts`: switch reflects the store and a click changes it. Prior art: `src/tests/lib/core/settings/TroubleshootingSection.test.ts` (mount, `[role="switch"]` click, flushSync).
- `src/tests/lib/app/SettingsPanel.test.ts` already checks every nav section maps to a distinct component; it covers the new entry unchanged.

## Risks / defaults

- Layering: `plugins/mods` imports `core/vault` (allowed); `app/LabsSection` imports `plugins/mods` (app may import any layer). No baseline change expected.
- `localStorage.setItem` is not wrapped, matching `persistRecentVaults` (`vault.store.svelte.ts:54-56`).
- Switch gets `aria-label="Vault mods"` for tests and assistive tech.
- No copy about reloading (Issue 02 not merged).
