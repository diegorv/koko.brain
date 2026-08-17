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
 * Monotonic counter mirroring the Rust `VaultIndex.version`. Bumped from the
 * `vault-index-updated` Tauri event so consumer panels (Backlinks, Outgoing,
 * etc.) can invalidate by reactivity instead of polling. `0` while no Rust
 * event has been received yet.
 */
let vaultIndexVersion = $state(0);
/**
 * Whether the Rust `VaultIndex` has been built for the CURRENT vault.
 * Unlike `vaultIndexVersion` (process-global, monotonic, never rewound —
 * `completion.ts` caches by it), this flag is cleared on vault teardown so
 * a second vault opened in the same session shows the indexing state again.
 */
let indexReady = $state(false);
/**
 * True between vault teardown and the next completed index build. The
 * `vault-index-updated` listener is debounced (300 ms) and never torn down,
 * so the OLD vault's tail events (dirty-tab saves, watcher bursts) can land
 * after teardown — while suppressed, those bumps must not flip readiness.
 * Cleared by `markIndexReady()` when `initializeVault` finishes the build.
 */
let indexReadySuppressed = false;
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
	 * Current monotonic version of the Rust `VaultIndex`. Increments on every
	 * `vault-index-updated` Tauri event. Consumers `$effect` on this getter
	 * to invalidate cached views (backlinks, outgoing, tags, etc.).
	 */
	get vaultIndexVersion() { return vaultIndexVersion; },
	/**
	 * Whether the current vault's index has emitted at least one
	 * `vault-index-updated` since it was opened. Guards the
	 * "Indexing vault..." placeholder state in panels.
	 */
	get indexReady() { return indexReady; },

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

	/**
	 * Sets the cached `vaultIndexVersion` to the latest value seen from the
	 * Rust `vault-index-updated` event. Always assigns (does not min/max)
	 * because the Rust side is the sole source of truth for the counter and
	 * always emits a strictly-greater value than the prior one. Also marks
	 * the index ready — unless suppressed post-teardown (the event may
	 * originate from the torn-down vault's tail writes).
	 */
	bumpVaultIndexVersion(version: number) {
		vaultIndexVersion = version;
		if (!indexReadySuppressed) indexReady = true;
	},

	/**
	 * Marks the current vault's index as built and lifts the post-teardown
	 * suppression window. Called by `initializeVault` after `buildIndex`
	 * completes — the only signal that is scoped to the NEW vault (event
	 * bumps can still originate from the old vault's tail writes).
	 */
	markIndexReady() {
		indexReadySuppressed = false;
		indexReady = true;
	},

	/**
	 * Clears index readiness on vault teardown so the next vault shows the
	 * "Indexing vault..." state until its own index is built. Suppresses
	 * bump-driven readiness until `markIndexReady()` (stale events from the
	 * torn-down vault must not clear the placeholder). Deliberately leaves
	 * `vaultIndexVersion` untouched (monotonicity contract).
	 */
	resetIndexReady() {
		indexReady = false;
		indexReadySuppressed = true;
	},

	/** @internal Resets all state to initial values (for testing only) */
	_reset() {
		vaultPath = null;
		vaultName = null;
		recentVaults = [];
		vaultIndexVersion = 0;
		indexReady = false;
		indexReadySuppressed = false;
	},
};
