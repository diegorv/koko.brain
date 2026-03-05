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
	},
};
