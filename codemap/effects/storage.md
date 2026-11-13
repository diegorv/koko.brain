# effects storage: one fx line per site, by sink, file, line
cols: fx <loc> <sink> [<arg>] in <enclosing> · grep: grep -F -- ' <sink> ' codemap/effects/storage.md
fx src/lib/core/settings/theme.service.ts:57 storage.getItem in applyStoredTheme
fx src/lib/core/vault/vault.store.svelte.ts:47 storage.getItem in loadRecentVaults
fx src/lib/features/command-palette/command-palette.store.svelte.ts:9 storage.getItem in loadRecentCommandIds
fx src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:9 storage.getItem in loadRecentPaths
fx src/lib/plugins/mods/mods-enabled.store.svelte.ts:30 storage.getItem in loadEnabledVaults
fx src/lib/plugins/mods/mods-enabled.store.svelte.ts:39 storage.getItem in loadDisabledMods
fx src/routes/composer/+page.svelte:40 storage.getItem in readDraft
fx src/lib/features/command-palette/command-palette.store.svelte.ts:52 storage.removeItem in commandPaletteStore.reset
fx src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:51 storage.removeItem in quickSwitcherStore.reset
fx src/routes/composer/+page.svelte:49 storage.removeItem in writeDraft
fx src/lib/core/settings/theme.service.ts:82 storage.setItem in applyActiveTheme
fx src/lib/core/vault/vault.store.svelte.ts:56 storage.setItem in persistRecentVaults
fx src/lib/features/command-palette/command-palette.store.svelte.ts:18 storage.setItem in persistRecentCommandIds
fx src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:18 storage.setItem in persistRecentPaths
fx src/lib/plugins/mods/mods-enabled.store.svelte.ts:61 storage.setItem in modsEnabledStore.setEnabled
fx src/lib/plugins/mods/mods-enabled.store.svelte.ts:79 storage.setItem in modsEnabledStore.setModEnabled
fx src/routes/composer/+page.svelte:48 storage.setItem in writeDraft
