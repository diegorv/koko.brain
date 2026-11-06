import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';

import { parseEnabledVaults, setVaultEnabled } from './mods-enabled.logic';

/**
 * localStorage key for the vault paths with mods turned on. Per machine, not in
 * `<vault>/.kokobrain/settings.json`, so a vault copied from elsewhere never
 * arrives with its mods on (PRD P1).
 */
const MODS_ENABLED_VAULTS_KEY = 'kokobrain:mods-enabled-vaults';

/** Absolute paths of the vaults that have mods turned on, loaded on startup */
let enabledVaults = $state<string[]>(loadEnabledVaults());

/** Reads the enabled vault list from localStorage (returns [] on failure) */
function loadEnabledVaults(): string[] {
	try {
		return parseEnabledVaults(localStorage.getItem(MODS_ENABLED_VAULTS_KEY));
	} catch {
		return [];
	}
}

/** Reactive store for the per-vault "Vault mods" flag */
export const modsEnabledStore = {
	/** Whether mods are on for the open vault (false when no vault is open) */
	get enabled() {
		const path = vaultStore.path;
		return path !== null && enabledVaults.includes(path);
	},

	/**
	 * Turns mods on or off for the open vault and persists it. No-op when no vault is open.
	 * Throws when the localStorage write fails, leaving the in-memory flag unchanged.
	 */
	setEnabled(enabled: boolean) {
		const path = vaultStore.path;
		if (path === null) return;
		const next = setVaultEnabled(enabledVaults, path, enabled);
		localStorage.setItem(MODS_ENABLED_VAULTS_KEY, JSON.stringify(next));
		enabledVaults = next;
	},

	/** @internal Resets in-memory state (for testing only); leaves localStorage alone */
	_reset() {
		enabledVaults = [];
	},
};
