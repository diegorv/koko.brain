import { extractVaultName, updateRecentVaults, type RecentVault } from './vault.logic';

/** localStorage key for persisting the recent vaults list */
const RECENT_VAULTS_KEY = 'kokobrain:recent-vaults';

// --- Reactive state ---

/** Absolute path of the currently open vault (null = no vault open) */
let vaultPath = $state<string | null>(null);
/** Display name of the current vault */
let vaultName = $state<string | null>(null);
/** List of recently opened vaults, loaded from localStorage on startup */
let recentVaults = $state<RecentVault[]>(loadRecentVaults());
/**
 * Monotonic counter bumped on every `vault-index-updated` Tauri event.
 *
 * Consumer panels that render Rust-side VaultIndex data should track this
 * counter in their `$effect` dependency list alongside `tabsStore.activePath`.
 * When the Rust side mutates the index (editor save, external file change,
 * watcher update), the event handler calls `vaultStore.bumpVaultIndexVersion()`
 * and every consumer panel re-fetches from its read command (get_backlinks_v2,
 * get_outgoing_links_v2, etc.). See the consumer panel pattern in ADR 0025.
 */
let vaultIndexVersion = $state<number>(0);
/** Reads the recent vaults list from localStorage (returns [] on failure) */
function loadRecentVaults(): RecentVault[] {
	try {
		const stored = localStorage.getItem(RECENT_VAULTS_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

/** Writes the recent vaults list to localStorage */
function persistRecentVaults(vaults: RecentVault[]) {
	localStorage.setItem(RECENT_VAULTS_KEY, JSON.stringify(vaults));
}

/** Reactive store for the current vault and the recent vaults list */
export const vaultStore = {
	get path() { return vaultPath; },
	get name() { return vaultName; },
	/** Whether a vault is currently open (computed from path) */
	get isOpen() { return vaultPath !== null; },
	get recentVaults() { return recentVaults; },
	/**
	 * Counter that consumer panels track as a reactive dependency to re-
	 * fetch from Rust read commands whenever the Rust-side VaultIndex has
	 * changed. Bumped by the global `vault-index-updated` listener
	 * registered in `app-lifecycle.service.ts`.
	 */
	get vaultIndexVersion() { return vaultIndexVersion; },

	/** Increments the vault index version to invalidate consumer caches. */
	bumpVaultIndexVersion() {
		vaultIndexVersion += 1;
	},

	/** Opens a vault by path — updates state and persists to recent vaults */
	open(path: string) {
		const name = extractVaultName(path);
		vaultPath = path;
		vaultName = name;

		recentVaults = updateRecentVaults(recentVaults, path, name);
		persistRecentVaults(recentVaults);
	},

	/** Closes the current vault (does not clear the recent list) */
	close() {
		vaultPath = null;
		vaultName = null;
	},

	/** Removes a vault from the recent list by path (e.g. when the directory no longer exists) */
	removeRecent(path: string) {
		recentVaults = recentVaults.filter((v) => v.path !== path);
		persistRecentVaults(recentVaults);
	},

	/** @internal Resets all state to initial values (for testing only) */
	_reset() {
		vaultPath = null;
		vaultName = null;
		recentVaults = [];
		vaultIndexVersion = 0;
	},
};
